"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { CanvasElement } from "../types/professional-types"

interface CanvasChartProps {
  element: CanvasElement
}

const mockChartData = [
  { name: "Downtown", value: 1250, swaps: 45 },
  { name: "University", value: 980, swaps: 38 },
  { name: "Business", value: 1450, swaps: 52 },
  { name: "Residential", value: 750, swaps: 28 },
  { name: "Tourist", value: 1100, swaps: 41 },
]

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function CanvasChart({ element }: CanvasChartProps) {
  const chartType = element.config.chartType || "bar"
  const fields = element.config.fields

  if (!fields?.rows?.length && !fields?.values?.length) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Drop fields to configure chart
      </div>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <BarChart data={mockChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--chart-1))" />
          </BarChart>
        )

      case "line":
        return (
          <LineChart data={mockChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} />
          </LineChart>
        )

      case "pie":
        return (
          <PieChart>
            <Pie
              data={mockChartData}
              cx="50%"
              cy="50%"
              outerRadius={60}
              fill="hsl(var(--chart-1))"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelStyle={{ fontSize: "10px" }}
            >
              {mockChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
          </PieChart>
        )

      default:
        return <div className="text-center text-gray-400">Unsupported chart type</div>
    }
  }

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
