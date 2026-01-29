import React, { useState } from "react";
import { RefreshCw, Settings, Search, LayoutGrid } from "lucide-react";
import SidebarItem from "./components/SideBarItem";
import "./index.css";
import { useStockData } from "./hooks/useStockData";
import MarketTicker from "./components/MarketTicker";
import StockChart from "./components/StockChart";
import StockHeader from "./components/StockHeader";

export default function App() {
  const [newSymbol, setNewSymbol] = useState("");

  const {
    stocks,
    selectedStock,
    setSelectedStock,
    loading,
    chartSeries,
    rsiSeries,
    handleRefresh,
    handleTrackStock,
    handleDelete,
  } = useStockData();

  const onAddStock = async () => {
    const success = await handleTrackStock(newSymbol);
    if (success) setNewSymbol("");
  };

  return (
    <div className="flex h-screen w-full bg-[#f8f9fa] overflow-hidden text-gray-900 font-sans">
      {/* LEFT SIDEBAR */}
      <aside className="w-72 flex flex-col border-r border-gray-200 bg-white shadow-sm">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <LayoutGrid size={18} />{" "}
            <span className="text-xs uppercase tracking-wider">
              My Watchlist
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-all"
          >
            <RefreshCw
              size={16}
              className={`${loading ? "animate-spin" : ""} text-gray-500`}
            />
          </button>
        </div>

        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={14}
            />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
              placeholder="Track Symbol (e.g. AAPL)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && onAddStock()}
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {stocks.map((s) => (
            <SidebarItem
              key={s.symbol}
              s={s}
              isSelected={selectedStock?.symbol === s.symbol}
              onClick={setSelectedStock}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Market Bar */}
        <MarketTicker />

        {/* Dynamic Header */}
        <StockHeader selectedStock={selectedStock} />

        {/* Charts Section */}
        <div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
          <StockChart series={chartSeries} height={350} type="price" />

          {/* Secondary Indicators */}
          <div className="mt-6 grid grid-cols-1 gap-6">
            <StockChart series={rsiSeries} height={150} type="rsi" />
          </div>
        </div>
      </main>
    </div>
  );
}
