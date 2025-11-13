"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"

interface CabinetHealthPanelProps {
  selectedDevice: string | null
}

const CABINET_DATA = {
  "BSS-001": [
    {
      cabinetNo: 1,
      communication: "Online",
      door: "Closed",
      battery: "OK",
      outFire: "Normal",
      urgency: "None",
      temp: 28.5,
      vol: "3.85V",
    },
    {
      cabinetNo: 2,
      communication: "Online",
      door: "Closed",
      battery: "OK",
      outFire: "Normal",
      urgency: "None",
      temp: 28.2,
      vol: "3.84V",
    },
    {
      cabinetNo: 3,
      communication: "Online",
      door: "Closed",
      battery: "OK",
      outFire: "Normal",
      urgency: "None",
      temp: 29.1,
      vol: "3.86V",
    },
    {
      cabinetNo: 4,
      communication: "Online",
      door: "Closed",
      battery: "OK",
      outFire: "Normal",
      urgency: "None",
      temp: 28.8,
      vol: "3.85V",
    },
  ],
  "BSS-002": [
    {
      cabinetNo: 1,
      communication: "Online",
      door: "Closed",
      battery: "OK",
      outFire: "Normal",
      urgency: "None",
      temp: 31.2,
      vol: "3.82V",
    },
    {
      cabinetNo: 2,
      communication: "Online",
      door: "Closed",
      battery: "Warning",
      outFire: "Normal",
      urgency: "Low",
      temp: 32.5,
      vol: "3.80V",
    },
    {
      cabinetNo: 3,
      communication: "Online",
      door: "Closed",
      battery: "OK",
      outFire: "Normal",
      urgency: "None",
      temp: 30.8,
      vol: "3.83V",
    },
  ],
}

export default function CabinetHealthPanel({ selectedDevice }: CabinetHealthPanelProps) {
  const deviceId = selectedDevice || "BSS-001"
  const cabinets = CABINET_DATA[deviceId as keyof typeof CABINET_DATA] || []

  const getStatusIcon = (status: string) => {
    if (status === "OK" || status === "Online" || status === "Normal" || status === "None") {
      return <CheckCircle2 className="w-4 h-4 text-green-400" />
    } else if (status === "Warning" || status === "Low") {
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    } else {
      return <AlertCircle className="w-4 h-4 text-red-400" />
    }
  }

  const getStatusBadgeClass = (status: string) => {
    if (status === "OK" || status === "Online" || status === "Normal" || status === "None") {
      return "bg-green-500/20 text-green-400 border-green-500/30"
    } else if (status === "Warning" || status === "Low") {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    } else {
      return "bg-red-500/20 text-red-400 border-red-500/30"
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle>Cabinet Status Overview - {deviceId}</CardTitle>
          <CardDescription>{cabinets.length} cabinets total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cabinets.map((cabinet, idx) => (
              <div key={idx} className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-100">Cabinet #{cabinet.cabinetNo}</h4>
                  <Badge className={`text-xs ${getStatusBadgeClass(cabinet.communication)}`}>
                    <span className="mr-1">{getStatusIcon(cabinet.communication)}</span>
                    {cabinet.communication}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs">Door Status</p>
                    <p className="text-slate-100 flex items-center mt-1">
                      {getStatusIcon(cabinet.door)}
                      <span className="ml-2">{cabinet.door}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Battery Status</p>
                    <p className="text-slate-100 flex items-center mt-1">
                      {getStatusIcon(cabinet.battery)}
                      <span className="ml-2">{cabinet.battery}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Temperature</p>
                    <p className="text-slate-100 font-medium mt-1">{cabinet.temp}°C</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Single Cell Voltage</p>
                    <p className="text-slate-100 font-medium mt-1">{cabinet.vol}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Fire Alert:{" "}
                    <span className={getStatusIcon(cabinet.outFire) ? "text-green-400" : "text-red-400"}>
                      {cabinet.outFire}
                    </span>
                  </span>
                  <span className="text-slate-400">
                    Urgency:{" "}
                    <Badge className={`text-xs ${getStatusBadgeClass(cabinet.urgency)}`}>{cabinet.urgency}</Badge>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
