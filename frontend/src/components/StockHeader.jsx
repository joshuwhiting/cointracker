import React from "react";

const StockHeader = ({ selectedStock }) => {
  console.log("Current Selected Stock:", selectedStock); // Open Browser Console (F12) to see this
  const marketState = selectedStock?.marketState;

  return (
    <div className="p-6 bg-white border-b border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-light text-gray-800">
              {selectedStock?.symbol || "---"}
            </h1>
            <span className="text-gray-400 text-sm">
              {selectedStock?.["longName"]}
            </span>
          </div>
          {(marketState === "PRE" || marketState === "PREPRE") && (
            <div className="flex items-center gap-2 px-2 py-0.5 bg-blue-50 rounded-full border border-blue-100 w-fit mb-2">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                Pre-market
              </span>
              {selectedStock?.preMarketPrice && (
                <span className="text-xs font-mono font-semibold text-blue-700">
                  ${selectedStock.preMarketPrice.toFixed(2)}
                </span>
              )}
            </div>
          )}
          {(marketState === "POST" ||
            marketState === "POSTPOST" ||
            marketState === "CLOSED") &&
            selectedStock?.postMarketPrice && (
              <div className="flex items-center gap-2 px-2 py-0.5 bg-purple-50 rounded-full border border-purple-100 w-fit mb-2">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">
                  After-hours
                </span>
                {selectedStock?.postMarketPrice && (
                  <span className="text-xs font-mono font-semibold text-purple-700">
                    ${selectedStock.postMarketPrice.toFixed(2)}
                  </span>
                )}
              </div>
            )}
          <div className="flex items-baseline gap-4 mt-1">
            <span className="text-4xl font-mono font-medium tracking-tighter text-stock-up animate-pulse-short">
              {selectedStock?.price?.toFixed(2) || "0.00"}
            </span>
            <span
              className={`text-lg font-semibold ${
                selectedStock?.change >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {selectedStock?.change > 0 ? "+" : ""}
              {selectedStock?.change?.toFixed(2)} ({selectedStock?.percent}
              %)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-500 font-mono">
          <p>
            OPEN{" "}
            <span className="text-gray-900 ml-2">{selectedStock?.open}</span>
          </p>
          <p>
            HIGH{" "}
            <span className="text-gray-900 ml-2">{selectedStock?.dayHigh}</span>
          </p>
          <p>
            LOW{" "}
            <span className="text-gray-900 ml-2">{selectedStock?.dayLow}</span>
          </p>
          <p>
            MKT CAP{" "}
            <span className="text-gray-900 ml-2">
              {selectedStock?.market_cap || "---"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StockHeader;
