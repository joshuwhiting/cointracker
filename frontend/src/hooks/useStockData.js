import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";

// Initialize socket outside the hook to prevent multiple connections
const socket = io("http://127.0.0.1:8000");

export const useStockData = () => {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartSeries, setChartSeries] = useState([{ data: [] }]);
  const [rsiSeries, setRsiSeries] = useState([{ data: [] }]);
  const [timeRange, setTimeRange] = useState("1y");
  const [interval, setInterval] = useState("1d");

  // Socket listener for real-time updates
  useEffect(() => {
    const handlePriceUpdate = (data) => {
      // 1. Update the main list
      setStocks((currentStocks) =>
        currentStocks.map((s) =>
          s.symbol === data.symbol
            ? {
                ...s,
                price: data.price,
                change: data.change,
                percent: data.percent,
                marketState: data.marketState,
                preMarketPrice: data.preMarketPrice,
                postMarketPrice: data.postMarketPrice,
              }
            : s,
        ),
      );

      // 2. Update the header if the updated stock is currently selected
      setSelectedStock((currentSelected) => {
        if (currentSelected?.symbol === data.symbol) {
          return {
            ...currentSelected,
            price: data.price,
            change: data.change,
            percent: data.percent,
            longName: data.longName,
            open: data.open,
            day_low: data.day_low,
            day_high: data.day_high,
            price_change: data.price_change,
            marketState: data.marketState,
            preMarketPrice: data.preMarketPrice,
            postMarketPrice: data.postMarketPrice,
          };
        }
        return currentSelected;
      });
    };

    socket.on("price_update", handlePriceUpdate);
    return () => socket.off("price_update", handlePriceUpdate);
  }, []);

  const fetchStocks = useCallback(async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/tracked");
      const data = await response.json();
      setStocks(data);

      // Update selectedStock based on new data
      setSelectedStock((prevSelected) => {
        if (prevSelected) {
          const updated = data.find((s) => s.symbol === prevSelected.symbol);
          return updated || prevSelected;
        } else if (data.length > 0) {
          return data[0];
        }
        return null;
      });
    } catch (error) {
      console.error("Error fetching stocks:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Fetch history when selected stock changes
  useEffect(() => {
    if (!selectedStock) {
      setChartSeries([{ data: [] }]);
      setRsiSeries([{ data: [] }]);
      return;
    }
    const fetchHistory = async () => {
      try {
        const params = new URLSearchParams({ period: timeRange, interval });
        const res = await fetch(
          `http://127.0.0.1:8000/history/${selectedStock.symbol}?${params}`,
        );
        const data = await res.json();
        setChartSeries([{ data }]);
      } catch (e) {
        console.error("Error fetching history:", e);
      }
    };
    fetchHistory();
  }, [selectedStock?.symbol, timeRange, interval]);

  useEffect(() => {
    if (!selectedStock) {
      setChartSeries([{ data: [] }]);
      setRsiSeries([{ data: [] }]);
      return;
    }

    const fetchRSI = async () => {
      try {
        const params = new URLSearchParams({ period: timeRange, interval });
        const res = await fetch(
          `http://127.0.0.1:8000/rsi/${selectedStock.symbol}?${params}`,
        );
        const data = await res.json();

        // Expecting: [{ x: timestamp, y: rsi }]
        setRsiSeries([{ name: "RSI", data }]);
      } catch (e) {
        console.error("Error fetching RSI:", e);
      }
    };

    fetchRSI();
  }, [selectedStock?.symbol, timeRange, interval]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetch("http://127.0.0.1:8000/refresh", { method: "POST" });
      await fetchStocks();
    } finally {
      setLoading(false);
    }
  };

  const handleTrackStock = async (symbol) => {
    if (!symbol) return false;
    setLoading(true);
    try {
      await fetch("http://127.0.0.1:8000/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      await fetchStocks();
      return true;
    } catch (e) {
      console.error("Error tracking stock:", e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Remove this stock?")) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/tracked/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setStocks((prev) => prev.filter((s) => s.id !== id));
        setSelectedStock((prev) => (prev?.id === id ? null : prev));
      }
    } catch (error) {
      console.error("Delete Failed:", error);
    }
  };

  return {
    stocks,
    selectedStock,
    setSelectedStock,
    loading,
    chartSeries,
    rsiSeries,
    handleRefresh,
    handleTrackStock,
    handleDelete,
    timeRange,
    setTimeRange,
    interval,
    setInterval,
  };
};
