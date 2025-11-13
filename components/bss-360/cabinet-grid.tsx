"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Battery } from "lucide-react";

interface CabinetGridProps {
  selectedStation: string;
  selectedCabinet: number | null;
  onCabinetSelect: (cabinetNo: number) => void;
}

// Generate mock cabinet data for 12 cabinets per station
const generateCabinetData = (stationId: string) => {
  const cabinets = [];
  for (let i = 1; i <= 12; i++) {
    const isCharging = Math.random() > 0.3;
    const temp = 25 + Math.random() * 12;
    const voltage = 3.8 + Math.random() * 0.1;

    cabinets.push({
      cabinetNo: i,
      status: Math.random() > 0.95 ? "offline" : "online",
      charging: isCharging,
      chargingPercent: isCharging ? Math.floor(Math.random() * 100) : 0,
      temp: Number.parseFloat(temp.toFixed(1)),
      voltage: Number.parseFloat(voltage.toFixed(2)),
      swapCount: Math.floor(Math.random() * 50) + 10,
      lastSwap: Math.floor(Math.random() * 120) + " min ago",
    });
  }
  return cabinets;
};

export default function CabinetGrid({
  selectedStation,
  selectedCabinet,
  onCabinetSelect,
}: CabinetGridProps) {
  const cabinets = generateCabinetData(selectedStation);

  const getStatusColor = (status: string) => {
    if (status === "offline") return "border-red-500/50 bg-red-500/10";
    return "border-slate-600 bg-slate-800/50";
  };

  const getStatusIcon = (status: string) => {
    if (status === "offline")
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-4">
          {selectedStation} - 12 Cabinets
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cabinets.map((cabinet) => (
            <button
              key={cabinet.cabinetNo}
              onClick={() => onCabinetSelect(cabinet.cabinetNo)}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer text-left ${getStatusColor(
                cabinet.status
              )} ${
                selectedCabinet === cabinet.cabinetNo
                  ? "border-cyan-500 bg-cyan-500/20"
                  : ""
              }`}
            >
              {/* Header with Status */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-100">
                  Cabinet {cabinet.cabinetNo}
                </h3>
                {getStatusIcon(cabinet.status)}
              </div>

              {/* Charging Status */}
              {cabinet.charging && (
                <div className="mb-3 bg-slate-700/50 rounded p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Battery className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-slate-300">Charging</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div
                      className="bg-emerald-400 h-1.5 rounded-full"
                      style={{ width: `${cabinet.chargingPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {cabinet.chargingPercent}%
                  </p>
                </div>
              )}

              {/* Metrics */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Temp:</span>
                  <span
                    className={
                      cabinet.temp > 32
                        ? "text-orange-400 font-medium"
                        : "text-slate-200"
                    }
                  >
                    {cabinet.temp}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Voltage:</span>
                  <span className="text-slate-200">{cabinet.voltage}V</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Swaps:</span>
                  <span className="text-cyan-400 font-medium">
                    {cabinet.swapCount}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-700">
                  <span className="text-slate-400">Last:</span>
                  <span className="text-slate-300 text-xs">
                    {cabinet.lastSwap}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cabinet Details */}
      {selectedCabinet && (
        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">
              {selectedStation} - Cabinet {selectedCabinet} Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-400">Status</p>
                <p className="text-lg font-semibold text-green-400 mt-1">
                  Online
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Temperature</p>
                <p className="text-lg font-semibold text-slate-100 mt-1">
                  28.5°C
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Cell Voltage</p>
                <p className="text-lg font-semibold text-slate-100 mt-1">
                  3.85V
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Daily Swaps</p>
                <p className="text-lg font-semibold text-cyan-400 mt-1">8</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
