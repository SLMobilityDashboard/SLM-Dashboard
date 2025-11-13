"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, AlertTriangle, CheckCircle } from "lucide-react"

const DEVICES = [
  { id: "BSS-001", name: "Main Battery Unit 1", status: "healthy", temp: 28.5, battery: 95 },
  { id: "BSS-002", name: "Main Battery Unit 2", status: "warning", temp: 32.1, battery: 88 },
  { id: "BSS-003", name: "Reserve Unit A", status: "healthy", temp: 26.8, battery: 98 },
  { id: "BSS-004", name: "Reserve Unit B", status: "alert", temp: 40.2, battery: 72 },
  { id: "BSS-005", name: "Backup System 1", status: "healthy", temp: 29.3, battery: 92 },
]

interface DeviceListPanelProps {
  selectedDevice: string | null
  onDeviceSelect: (deviceId: string | null) => void
}

export default function DeviceListPanel({ selectedDevice, onDeviceSelect }: DeviceListPanelProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "warning":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "alert":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4" />
      case "warning":
        return <AlertTriangle className="w-4 h-4" />
      case "alert":
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700 p-4 h-fit">
      <h3 className="text-sm font-semibold text-slate-100 mb-4">Devices in Batch</h3>
      <div className="space-y-2">
        {DEVICES.map((device) => (
          <Button
            key={device.id}
            variant="ghost"
            className={`w-full justify-start flex-col items-start h-auto py-3 px-3 ${
              selectedDevice === device.id ? "bg-cyan-500/20 border border-cyan-500/50" : "hover:bg-slate-700/50"
            }`}
            onClick={() => onDeviceSelect(device.id)}
          >
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-100">{device.id}</span>
              <Badge className={`text-xs ${getStatusColor(device.status)}`}>
                <span className="mr-1">{getStatusIcon(device.status)}</span>
                {device.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mb-2">{device.name}</p>
            <div className="w-full flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Temp: <span className="text-orange-400">{device.temp}°C</span>
              </span>
              <span className="text-slate-500">
                Battery: <span className="text-cyan-400">{device.battery}%</span>
              </span>
            </div>
          </Button>
        ))}
      </div>
    </Card>
  )
}
