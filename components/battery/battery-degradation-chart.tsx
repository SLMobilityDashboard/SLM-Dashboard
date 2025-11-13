"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface BatteryDegradationChartProps {
  dateRange: { from: Date; to: Date }
  batteryId: string
}

export function BatteryDegradationChart({ dateRange, batteryId }: BatteryDegradationChartProps) {
  const [loading, setLoading] = useState(true)
  const [timeData, setTimeData] = useState<any[]>([])
  const [cycleData, setCycleData] = useState<any[]>([])

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Generate time-based degradation data
      const timeDegradation = []
      const startDate = new Date(dateRange.from)
      const endDate = new Date(dateRange.to)

      // Start with a base capacity of 100%
      let baseCapacity = 100

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Gradually decrease capacity over time (very slightly)
        baseCapacity -= 0.01 + Math.random() * 0.03

        // Add some random variation
        const capacity = baseCapacity + (Math.random() * 0.4 - 0.2)

        // Days since start
        const daysSinceStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

        timeDegradation.push({
          x: daysSinceStart,
          y: Number.parseFloat(capacity.toFixed(2)),
          z: 5,
        })
      }

      // Generate cycle-based degradation data
      const cycleDegradation = []

      // Start with a base capacity of 100%
      baseCapacity = 100

      for (let cycle = 0; cycle <= 400; cycle += 10) {
        // Gradually decrease capacity with cycles
        const capacityLoss = 0.0015 * cycle
        const capacity = 100 - capacityLoss + (Math.random() * 0.6 - 0.3)

        cycleDegradation.push({
          x: cycle,
          y: Number.parseFloat(capacity.toFixed(2)),
          z: 5,
        })
      }

      setTimeData(timeDegradation)
      setCycleData(cycleDegradation)
      setLoading(false)
    }, 1500)
  }, [dateRange, batteryId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
          <p className="mt-2 text-sm text-slate-300">Loading degradation data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="time">
        <TabsList>
          <TabsTrigger value="time">Time-Based</TabsTrigger>
          <TabsTrigger value="cycle">Cycle-Based</TabsTrigger>
        </TabsList>

        <TabsContent value="time" className="pt-4">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Days"
                  stroke="#94a3b8"
                  label={{ value: "Days", position: "insideBottomRight", offset: -5, fill: "#94a3b8" }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Capacity"
                  stroke="#94a3b8"
                  domain={[95, 100]}
                  label={{ value: "Capacity (%)", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                />
                <ZAxis type="number" dataKey="z" range={[60, 400]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderColor: "#475569",
                    color: "#e2e8f0",
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === "Capacity") return [`${value}%`, name]
                    return [value, name]
                  }}
                />
                <Scatter name="Capacity over Time" data={timeData} fill="#06b6d4" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="cycle" className="pt-4">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Cycles"
                  stroke="#94a3b8"
                  label={{ value: "Charge Cycles", position: "insideBottomRight", offset: -5, fill: "#94a3b8" }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Capacity"
                  stroke="#94a3b8"
                  domain={[90, 100]}
                  label={{ value: "Capacity (%)", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                />
                <ZAxis type="number" dataKey="z" range={[60, 400]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderColor: "#475569",
                    color: "#e2e8f0",
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === "Capacity") return [`${value}%`, name]
                    return [value, name]
                  }}
                />
                <Scatter name="Capacity vs Cycles" data={cycleData} fill="#10b981" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
