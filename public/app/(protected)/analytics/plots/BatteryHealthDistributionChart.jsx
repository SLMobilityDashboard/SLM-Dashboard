// components/analytics/BatteryHealthDistributionChart.jsx
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export default function BatteryHealthDistributionChart({ dateRange }) {
  // This is where you'd fetch and process your battery health distribution data
  // based on the selected 'dateRange'.
  // Example dummy data structure:
  const data = [
    { name: "Good", value: 70 },
    { name: "Fair", value: 20 },
    { name: "Poor", value: 10 },
  ];
  const COLORS = ["#82ca9d", "#ffc658", "#ff7300"]; // Example colors

  // Conditional rendering: If data is empty, display a message. Otherwise, render the chart.
  if (data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-slate-500">
        No data available for the selected date range.
      </div>
    );
  }

  // Render the chart if data is available
  return (
    <div className="h-full w-full flex items-center justify-center">
      {/* Replace this div with your actual Pie Chart component (e.g., using Recharts): */}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            labelLine={false}
            label={({ name, percent }) =>
              `${name} (${(percent * 100).toFixed(0)}%)`
            }
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
