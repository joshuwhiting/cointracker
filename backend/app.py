from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
import yfinance as yf

app = Flask(__name__)

tracked_symbols = []
# SQLite config
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# ---------- Models ----------

class TrackedStock(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(10), nullable=False, unique=True)
    current_price = db.Column(db.Float)
    market_cap = db.Column(db.BigInteger)
    currency = db.Column(db.String(10))

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
    return {
        "price": info.get("currentPrice"),
        "market_cap": info.get("marketCap"),
        "currency": info.get("currency")
    }

# ---------- Routes ----------


@app.route("/ping")
def ping():
    return jsonify({"status": "ok"})

@app.route("/stock")
def stock():
    symbol = request.args.get("symbol", "AAPL").upper()
    stock_data = fetch_stock_data(symbol)
    return jsonify({"symbol": symbol, **stock_data})


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
    tracked.market_cap = format_market_cap(stock_data["market_cap"])
    tracked.currency = stock_data["currency"]

    db.session.add(tracked)
    db.session.commit()
    return {"message": f"{symbol} tracked", **stock_data}, 201



@app.route("/tracked")
def tracked():
    stocks = TrackedStock.query.all()
    return jsonify([
        {
            "symbol": s.symbol,
            "price": s.price,
            "market_cap": format_market_cap(s.market_cap),
            "currency": s.currency
        }
        for s in stocks
    ])


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
