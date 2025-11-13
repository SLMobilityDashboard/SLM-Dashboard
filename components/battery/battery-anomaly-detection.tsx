"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface BatteryAnomalyDetectionProps {
  dateRange: { from: Date; to: Date }
  batteryId: string
}

export function BatteryAnomalyDetection({ dateRange, batteryId }: BatteryAnomalyDetectionProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])
  const [anomalies, setAnomalies] = useState<any[]>([])

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Generate voltage data with some anomalies
      const voltageData = []
      const anomalyList = []
      const startDate = new Date(dateRange.from)
      const endDate = new Date(dateRange.to)

      // Base voltage
      const baseVoltage = 3.82

      let dayCounter = 0
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        dayCounter++

        // Normal voltage with small random variations
        let voltage = baseVoltage + (Math.random() * 0.04 - 0.02)

        // Create some anomalies
        let hasAnomaly = false
        let anomalyType = ""
        let severity = ""

        // Voltage drop anomaly around day 7
        if (dayCounter === 7) {
          voltage -= 0.15
          hasAnomaly = true
          anomalyType = "Voltage Drop"
          severity = "medium"

          anomalyList.push({
            date: `Feb ${date.getDate()}`,
            type: "Voltage Drop",
            value: voltage.toFixed(2) + "V",
            severity: "medium",
            description: "Sudden voltage drop detected during discharge cycle",
          })
        }

        // Voltage spike anomaly around day 14
        if (dayCounter === 14) {
          voltage += 0.12
          hasAnomaly = true
          anomalyType = "Voltage Spike"
          severity = "low"

          anomalyList.push({
            date: `Feb ${date.getDate()}`,
            type: "Voltage Spike",
            value: voltage.toFixed(2) + "V",
            severity: "low",
            description: "Unexpected voltage increase during charging",
          })
        }

        // Unstable voltage around day 21
        if (dayCounter === 21) {
          voltage = baseVoltage + 0.08
          hasAnomaly = true
          anomalyType = "Voltage Instability"
          severity = "high"

          anomalyList.push({
            date: `Feb ${date.getDate()}`,
            type: "Voltage Instability",
            value: voltage.toFixed(2) + "V",
            severity: "high",
            description: "Significant voltage fluctuations under constant load",
          })
        }

        voltageData.push({
          date: `Feb ${date.getDate()}`,
          voltage: Number.parseFloat(voltage.toFixed(3)),
          hasAnomaly,
          anomalyType,
          severity,
        })
      }

      setData(voltageData)
      setAnomalies(anomalyList)
      setLoading(false)
    }, 1500)
  }, [dateRange, batteryId])

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "low":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Low</Badge>
      case "medium":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">Medium</Badge>
      case "high":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">High</Badge>
      default:
        return <Badge>{severity}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
          <p className="mt-2 text-sm text-slate-300">Analyzing battery data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" />
            <YAxis domain={[3.6, 4.0]} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                borderColor: "#475569",
                color: "#e2e8f0",
              }}
            />
            <Legend />
            <ReferenceLine y={3.7} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={3.95} stroke="#ef4444" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="voltage"
              name="Cell Voltage (V)"
              stroke="#06b6d4"
              dot={(props: any) => {
                if (props.payload.hasAnomaly) {
                  let color = "#3b82f6" // low severity
                  if (props.payload.severity === "medium") color = "#f59e0b"
                  if (props.payload.severity === "high") color = "#ef4444"

                  return (
                    <svg x={props.cx - 6} y={props.cy - 6} width={12} height={12} fill={color}>
                      <circle cx="6" cy="6" r="6" />
                    </svg>
                  )
                }
                return null
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-lg font-medium text-slate-100 mb-4 flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
          Detected Anomalies
        </h3>

        <div className="rounded-md border border-slate-700/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-800/50">
              <TableRow className="border-slate-700/50">
                <TableHead className="text-slate-400">Date</TableHead>
                <TableHead className="text-slate-400">Type</TableHead>
                <TableHead className="text-slate-400">Value</TableHead>
                <TableHead className="text-slate-400">Severity</TableHead>
                <TableHead className="text-slate-400">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anomalies.map((anomaly, index) => (
                <TableRow key={index} className="border-slate-700/30 hover:bg-slate-800/30">
                  <TableCell className="font-medium text-slate-300">{anomaly.date}</TableCell>
                  <TableCell className="text-slate-300">{anomaly.type}</TableCell>
                  <TableCell className="text-slate-300">{anomaly.value}</TableCell>
                  <TableCell>{getSeverityBadge(anomaly.severity)}</TableCell>
                  <TableCell className="text-slate-300">{anomaly.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
