import React from "react";
import Chart from "react-apexcharts";
import { Activity } from "lucide-react";

const StockChart = ({ series, type = "price", height = 350 }) => {
  const isRSI = type === "rsi";

  const chartOptions = {
    chart: {
      type: isRSI ? "line" : "candlestick",
      height: height,
      toolbar: { show: false },
      background: "#fff",
    },
    xaxis: { type: "datetime" },
    yaxis: isRSI
      ? {
          min: 0,
          max: 100,
          tickAmount: 4,
        }
      : {
          tooltip: { enabled: true },
          labels: { formatter: (v) => `$${v.toFixed(2)}` },
        },
    grid: { borderColor: "#f1f1f1" },
    tooltip: {
      y: {
        formatter: isRSI ? (v) => v?.toFixed(2) : (v) => `$${v?.toFixed(2)}`,
      },
    },
    stroke: {
      width: isRSI ? 1 : 2,
      curve: "smooth",
    },
    annotations: isRSI
      ? {
          yaxis: [
            { y: 70, borderColor: "#f87171", label: { text: "Overbought" } },
            { y: 30, borderColor: "#60a5fa", label: { text: "Oversold" } },
          ],
        }
      : {},
  };

  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Activity size={12} />{" "}
          {isRSI ? "Relative Strength Index (14)" : "Price Action (Daily)"}
        </span>
      </div>
      <Chart
        options={chartOptions}
        series={series}
        type={isRSI ? "line" : "candlestick"}
        height={height}
      />
    </div>
  );
};

export default StockChart;
