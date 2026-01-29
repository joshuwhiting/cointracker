from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from flask_cors import CORS
import yfinance as yf
from flask_socketio import SocketIO, emit
import threading
import time
import warnings
import pandas_ta as ta
import pandas as pd

app = Flask(__name__) #create the flask app
CORS(app) 
socketio = SocketIO(app, cors_allowed_origins="*")

tracked_symbols = []
# SQLite config

warnings.filterwarnings("ignore",message="Timestamp.utcnow is deprecated")

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# ---------- Models ----------

class TrackedStock(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(10), nullable=False, unique=True)
    long_name = db.Column(db.String(100)) 
    current_price = db.Column(db.Float)
    price_change = db.Column(db.Float)
    market_cap = db.Column(db.BigInteger)
    currency = db.Column(db.String(10))
    open_price = db.Column(db.Float) 
    day_high = db.Column(db.Float)   
    day_low = db.Column(db.Float)    

# ---------- Helper ----------
def format_market_cap(value):
    if value is None:
        return None

    if value >= 1_000_000_000_000:
        return f"{value / 1_000_000_000_000:.2f}T"
    elif value >= 1_000_000_000:
        return f"{value / 1_000_000_000:.2f}B"
    elif value >= 1_000_000:
        return f"{value / 1_000_000:.2f}M"
    else:
        return str(value)
    
def fetch_stock_data(symbol):
    """Fetch current price, market cap, and currency from YFinance."""
    ticker = yf.Ticker(symbol)
    info = ticker.info

    prev_close = info.get("previousClose")
    current_price = info.get("currentPrice")
    
    # Calculate percent change safely
    change_pct = 0
    if current_price and prev_close:
        change_pct = ((current_price - prev_close) / prev_close) * 100

    return {
        "price": info.get("currentPrice"),
        "market_cap": info.get("marketCap"),
        "currency": info.get("currency"),
        "longName": info.get("longName"),      
        "open": info.get("open"),         
        "dayHigh": info.get("dayHigh"),
        "dayLow": info.get("dayLow"),
        "percent_change": round(change_pct, 2),
        "marketState": info.get("marketState"),
        "preMarketPrice": info.get("preMarketPrice"),
        "postMarketPrice": info.get("postMarketPrice")
    }

# ---------- Routes ----------


@app.route("/ping")
def ping():
    health_status = {
        "server": "online",
        "database": "disconnected",
       # "yfinance": "unreachable"
    }
    try:
        db.session.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"

    overall_status = 200 if all(v in ["online", "connected"] for v in health_status.values()) else 503

    return jsonify(health_status),overall_status

@app.route("/refresh", methods=["POST"])
def refresh_all():
    stocks = TrackedStock.query.all()

    for s in stocks:
        try:
            new_data = fetch_stock_data(s.symbol)
            print(f"DEBUG: {s.symbol} fetched data: {new_data}")

            # Update all fields, using .get() with a fallback to the existing value
            s.current_price = new_data.get("price", s.current_price)
            s.market_cap = new_data.get("market_cap", s.market_cap)
            s.currency = new_data.get("currency", s.currency)
            s.day_high = new_data.get("dayHigh", s.day_high)
            s.day_low = new_data.get("dayLow", s.day_low)
            s.long_name = new_data.get("longName", s.long_name)
            s.open_price = new_data.get("open", s.open_price)
            s.price_change = new_data.get("percent_change", s.price_change)
        except Exception as e:
            print(f"Failed to update {s.symbol}: {e}")
            continue
    db.session.commit()
    return jsonify({"message": f"Updated {len(stocks)} stocks successfully"}), 200

@app.route("/stock")
def stock():
    symbol = request.args.get("symbol", "AAPL").upper()
    stock_data = fetch_stock_data(symbol)
    return jsonify({"symbol": symbol, **stock_data})

@app.route("/tracked/<int:id>", methods=["DELETE"])
def delete_stock(id):
    stock_to_delete = TrackedStock.query.get_or_404(id)

    try:
        db.session.delete(stock_to_delete)
        db.session.commit()
        return jsonify({"message": "Stock was deleted successfully"})
    except Exception as e:
        return jsonify({"error": "There was an error deleting that stock"}), 500
    
@app.route("/track", methods=["POST"])
def track():
    data = request.get_json(force=True)
    symbol = data.get("symbol")
    if not symbol:
        return {"error": "No symbol provided"}, 400
    
    symbol = symbol.upper()

    # --- Fetch live stock data from YFinance ---
    stock_data = fetch_stock_data(symbol)
  
   # shows what fields are missing
    
    missing_fields = [
        key for key, value in stock_data.items()
        if value is None
    ]

    if missing_fields:
        return {
            "error": "Incomplete data from Yahoo Finance",
            "symbol": symbol,
            "missing": missing_fields
        }, 400

    # --- Add or update DB ---
    tracked = TrackedStock.query.filter_by(symbol=symbol).first()
    if not tracked:
            tracked = TrackedStock(symbol=symbol)

    tracked.current_price = stock_data["price"]
    tracked.market_cap = stock_data["market_cap"]
    tracked.currency = stock_data["currency"]
    tracked.day_high = stock_data["dayHigh"]
    tracked.day_low = stock_data["dayLow"]
    tracked.long_name = stock_data["longName"]
    tracked.open_price = stock_data["open"]
    tracked.price_change = stock_data["percent_change"]

    db.session.add(tracked)
    db.session.commit()
    return {"message": f"{symbol} tracked", "id": tracked.id, **stock_data}, 201



@app.route("/tracked")
def tracked():
    stocks = TrackedStock.query.all()
    results = []
    for s in stocks:
        # Calculate absolute change from stored percentage if available
        change_absolute = 0
        if s.current_price and s.price_change:
            prev_close = s.current_price / (1 + (s.price_change / 100))
            change_absolute = s.current_price - prev_close

        results.append({
            "id": s.id,
            "symbol": s.symbol,
            "price": s.current_price,
            "market_cap": format_market_cap(s.market_cap),
            "currency": s.currency,
            "longName": s.long_name,      
            "open": s.open_price,         
            "dayHigh": s.day_high,        
            "dayLow": s.day_low,
            "percent": s.price_change,
            "change": round(change_absolute, 2)
        })
    return jsonify(results)

@app.route("/history/<symbol>")
def history(symbol):
    symbol = symbol.upper()
    period = request.args.get("period", "1y")
    interval = request.args.get("interval", "1d")

    is_intraday = interval in ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"]
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval, prepost=is_intraday)
        
        data = []
        for date, row in hist.iterrows():
            if interval in ["1d", "5d", "1wk", "1mo", "3mo"]:
                date_str = date.strftime('%Y-%m-%d')
            else:
                date_str = date.strftime('%Y-%m-%d %H:%M')
            data.append({
                "x": date_str,
                "y": [
                    round(row["Open"], 2),
                    round(row["High"], 2),
                    round(row["Low"], 2),
                    round(row["Close"], 2)
                ]
            })
        return jsonify(data)
    except Exception as e:
        print(f"Error fetching history for {symbol}: {e}")
        return jsonify([])

def background_price_update():
    """Background thread that polls YFinance and emits to React."""
    print("Background Price Poller Started...")
    while True:
        with app.app_context():
            stocks = TrackedStock.query.all()
            for s in stocks:
                try:
                    # Get the absolute latest data
                    ticker = yf.Ticker(s.symbol)
                    # Use .info for consistency with other endpoints
                    info = ticker.info
                    
                    price = info.get("currentPrice")
                    prev_close = info.get("previousClose")

                    if not price or not prev_close:
                        print(f"Polling: Incomplete data for {s.symbol}, skipping update.")
                        continue

                    change_pct = ((price - prev_close) / prev_close) * 100
                    
                    # Broadcast to ALL connected React clients
                    socketio.emit('price_update', {
                        "symbol": s.symbol,
                        "price": round(price, 2),
                        "change": round(price - prev_close, 2),
                        "percent": round(change_pct, 2),
                        "open": info.get("open"),
                        "dayHigh": info.get("dayHigh"),
                        "dayLow": info.get("dayLow"),
                        "longName": info.get("longName"),
                        "marketState": info.get("marketState"),
                        "preMarketPrice": info.get("preMarketPrice"),
                        "postMarketPrice": info.get("postMarketPrice")
                    })
                except Exception as e:
                    print(f"Polling error for {s.symbol}: {e}")
        
        time.sleep(10) # Wait 10 seconds before next update to avoid Yahoo rate limits
        
@app.route('/rsi/<symbol>')
def handle_rsi(symbol):
    symbol = symbol.upper()
    period = request.args.get("period", "1y")
    interval = request.args.get("interval", "1d")

    is_intraday = interval in ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"]
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval, prepost=is_intraday)
        
        if df.empty:
            return jsonify([])

        df["RSI_14"] = ta.rsi(df["Close"], length=14)
        df = df.dropna()

        data = []
        for idx, row in df.iterrows():
            if interval in ["1d", "5d", "1wk", "1mo", "3mo"]:
                date_str = idx.strftime('%Y-%m-%d')
            else:
                date_str = idx.strftime('%Y-%m-%d %H:%M')
            
            data.append({
                "x": date_str,
                "y": round(row["RSI_14"], 2),
            })

        return jsonify(data)
    except Exception as e:
        print(f"Error calculating RSI for {symbol}: {e}")
        return jsonify([])



@socketio.on('connect')
def handle_connect():
    print("Client connected")

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    
    # Start the background poller
    threading.Thread(target=background_price_update, daemon=True).start()
    
    # IMPORTANT: Use socketio.run instead of app.run
    socketio.run(app, debug=True, port=8000)
