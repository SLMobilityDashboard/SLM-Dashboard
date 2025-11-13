"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface BatteryHealthChartProps {
  dateRange: { from: Date; to: Date }
  batteryId: string
}

export function BatteryHealthChart({ dateRange, batteryId }: BatteryHealthChartProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const healthData = []
      const startDate = new Date(dateRange.from)
      const endDate = new Date(dateRange.to)

      // Start with a base health of 100%
      let baseHealth = 100
      let baseCapacity = 75 // kWh
      let baseResistance = 20 // mΩ

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 2)) {
        // Gradually decrease health over time (very slightly)
        baseHealth -= 0.05 + Math.random() * 0.1
        // Gradually decrease capacity
        baseCapacity -= 0.02 + Math.random() * 0.04
        // Gradually increase resistance
        baseResistance += 0.01 + Math.random() * 0.03

        healthData.push({
          date: `Feb ${date.getDate()}`,
          stateOfHealth: Number.parseFloat(baseHealth.toFixed(2)),
          capacityRetention: Number.parseFloat(((baseCapacity / 75) * 100).toFixed(2)),
          internalResistance: Number.parseFloat(baseResistance.toFixed(2)),
        })
      }

      setData(healthData)
      setLoading(false)
    }, 1500)
  }, [dateRange, batteryId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
          <p className="mt-2 text-sm text-slate-300">Loading health data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" stroke="#94a3b8" />
          <YAxis yAxisId="left" stroke="#94a3b8" domain={[85, 100]} />
          <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" domain={[15, 30]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              borderColor: "#475569",
              color: "#e2e8f0",
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="stateOfHealth"
            name="State of Health (%)"
            stroke="#10b981"
            activeDot={{ r: 8 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="capacityRetention"
            name="Capacity Retention (%)"
            stroke="#06b6d4"
            activeDot={{ r: 8 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="internalResistance"
            name="Internal Resistance (mΩ)"
            stroke="#f59e0b"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
