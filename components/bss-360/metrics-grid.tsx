"use client"

import { Card } from "@/components/ui/card"
import { Zap, Thermometer, Gauge, AlertTriangle } from "lucide-react"

interface MetricsGridProps {
  selectedDevice: string | null
  selectedBatch: string
}

export default function MetricsGrid({ selectedDevice, selectedBatch }: MetricsGridProps) {
  const metrics = [
    {
      label: "Avg Temperature",
      value: "29.8°C",
      change: "+2.1%",
      icon: Thermometer,
      color: "from-orange-500 to-red-500",
      trend: "up",
    },
    {
      label: "Total Energy",
      value: "1,842.5 kWh",
      change: "+12.3%",
      icon: Zap,
      color: "from-green-500 to-emerald-500",
      trend: "up",
    },
    {
      label: "Availability",
      value: "97.9%",
      change: "-0.5%",
      icon: Gauge,
      color: "from-blue-500 to-cyan-500",
      trend: "down",
    },
    {
      label: "Alerts",
      value: "2",
      change: "Active",
      icon: AlertTriangle,
      color: "from-red-500 to-rose-500",
      trend: "stable",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon
        return (
          <Card key={idx} className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-400">{metric.label}</p>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${metric.color} bg-opacity-20`}>
                  <Icon className="w-4 h-4 text-slate-300" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-100 mb-1">{metric.value}</p>
              <p
                className={`text-xs ${metric.trend === "up" ? "text-green-400" : metric.trend === "down" ? "text-red-400" : "text-slate-500"}`}
              >
                {metric.change}
              </p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
