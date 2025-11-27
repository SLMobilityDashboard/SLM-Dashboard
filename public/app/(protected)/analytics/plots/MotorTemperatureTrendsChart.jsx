// components/analytics/MotorTemperatureTrendsChart.jsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"; // Example imports for Recharts

export default function MotorTemperatureTrendsChart({ dateRange }) {
  // Fetch and process your motor temperature trend data here based on 'dateRange'.
  // Example dummy data:
  const data = [
    { date: "Feb 01", avgTemp: 40.1, maxTemp: 45.2 },
    { date: "Feb 07", avgTemp: 41.5, maxTemp: 46.8 },
    { date: "Feb 14", avgTemp: 42.3, maxTemp: 48.1 },
    { date: "Feb 21", avgTemp: 41.9, maxTemp: 47.5 },
    { date: "Feb 28", avgTemp: 42.8, maxTemp: 49.0 },
  ];

  return (
    <div className="h-full w-full flex items-center justify-center text-slate-500">
      {/* Replace this div with your actual Line Chart component: */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="date" tick={{ fill: "#a0aec0" }} />
          <YAxis
            tick={{ fill: "#a0aec0" }}
            label={{
              value: "Temperature (°C)",
              angle: -90,
              position: "insideLeft",
              fill: "#a0aec0",
            }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#333", border: "none" }}
            itemStyle={{ color: "#fff" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="avgTemp"
            stroke="#82ca9d"
            name="Average Temp"
          />
          <Line
            type="monotone"
            dataKey="maxTemp"
            stroke="#ff7300"
            name="Max Temp"
          />
        </LineChart>
      </ResponsiveContainer>
      {/* Motor Temperature Trends Chart */}
    </div>
  );
}
