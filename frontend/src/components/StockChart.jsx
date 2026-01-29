import React from "react";
import Chart from "react-apexcharts";
import { Activity } from "lucide-react";

const StockChart = ({
  series,
  type = "price",
  height = 350,
  timeRange,
  setTimeRange,
  interval,
  setInterval,
}) => {
  const isRSI = type === "rsi";
  const isIntraday = ["1m", "5m", "15m", "1h"].includes(interval);

  // Generate grey background annotations for non-market hours (Pre/Post market)
  const getXAxisAnnotations = () => {
    if (!isIntraday || isRSI || !series[0]?.data?.length) return [];

    const uniqueDates = [
      ...new Set(series[0].data.map((d) => d.x.toString().split(" ")[0])),
    ];
    const annotations = [];

    uniqueDates.forEach((date) => {
      // Pre-market: 00:00 - 09:30
      annotations.push({
        x: new Date(`${date} 00:00`).getTime(),
        x2: new Date(`${date} 09:30`).getTime(),
        fillColor: "#e5e7eb", // gray-200
        opacity: 0.3,
        borderColor: "transparent",
        label: { text: "" },
      });
      // Post-market: 16:00 - 23:59
      annotations.push({
        x: new Date(`${date} 16:00`).getTime(),
        x2: new Date(`${date} 23:59`).getTime(),
        fillColor: "#e5e7eb", // gray-200
        opacity: 0.3,
        borderColor: "transparent",
        label: { text: "" },
      });
    });
    return annotations;
  };

  const chartOptions = {
    chart: {
      type: isRSI ? "line" : "candlestick",
      height: height,
      toolbar: { show: false },
      background: "#fff",
    },
    xaxis: {
      type: "datetime",
      // Hide weekends (Saturday=6, Sunday=0)
      rangeBreaks: [
        {
          pattern: "day of week",
          values: [6, 0],
        },
      ],
    },
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
      width: isRSI ? 2 : 1,
      curve: "smooth",
      colors: isRSI ? undefined : ["#000000"],
    },
    annotations: isRSI
      ? {
          yaxis: [
            { y: 70, borderColor: "#f87171", label: { text: "Overbought" } },
            { y: 30, borderColor: "#60a5fa", label: { text: "Oversold" } },
          ],
        }
      : {
          xaxis: getXAxisAnnotations(),
        },
  };

  const handleRangeChange = (newRange) => {
    setTimeRange(newRange);

    // 1m interval is only valid for 1d and 5d ranges
    if (interval === "1m" && !["1d", "5d"].includes(newRange)) {
      setInterval("5m");
    }
    // Intraday (minutes) generally not available > 60 days
    else if (
      ["6mo", "1y", "5y", "max"].includes(newRange) &&
      ["1m", "5m", "15m"].includes(interval)
    ) {
      setInterval("1d");
    }
    // Hourly not available > 730 days
    else if (["5y", "max"].includes(newRange) && interval === "1h") {
      setInterval("1d");
    }
  };

  const handleIntervalChange = (newInterval) => {
    setInterval(newInterval);

    // 1m needs short range (max 7d)
    if (newInterval === "1m" && !["1d", "5d"].includes(timeRange)) {
      setTimeRange("1d");
    }
    // 5m/15m needs < 60d
    else if (
      ["5m", "15m"].includes(newInterval) &&
      ["6mo", "1y", "5y", "max"].includes(timeRange)
    ) {
      setTimeRange("1mo");
    }
    // 1h needs < 730d
    else if (newInterval === "1h" && ["5y", "max"].includes(timeRange)) {
      setTimeRange("1y");
    }
  };

  const ranges = [
    { label: "1D", value: "1d" },
    { label: "5D", value: "5d" },
    { label: "1M", value: "1mo" },
    { label: "6M", value: "6mo" },
    { label: "1Y", value: "1y" },
    { label: "5Y", value: "5y" },
    { label: "Max", value: "max" },
  ];

  const intervals = [
    { label: "1m", value: "1m" },
    { label: "5m", value: "5m" },
    { label: "15m", value: "15m" },
    { label: "1h", value: "1h" },
    { label: "1d", value: "1d" },
  ];

  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Activity size={12} />{" "}
          {isRSI ? "Relative Strength Index (14)" : "Price Action"}
        </span>

        {!isRSI && (
          <div className="flex gap-3">
            <div className="flex gap-1 bg-gray-50 p-0.5 rounded-md">
              {ranges.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRangeChange(r.value)}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                    timeRange === r.value
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="w-px bg-gray-200 mx-1"></div>
            <div className="flex gap-1 bg-gray-50 p-0.5 rounded-md">
              {intervals.map((i) => (
                <button
                  key={i.value}
                  onClick={() => handleIntervalChange(i.value)}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                    interval === i.value
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>
        )}
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
