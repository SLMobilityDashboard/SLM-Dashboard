// components/batteries/BatteryDetailModal.tsx
"use client";

import { BatteryTelemetry } from "@/hooks/useBatteryTelemetry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Battery,
  TrendingUp,
  Radio,
  Zap,
  X,
  Shield,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface BatteryDetailModalProps {
  battery: BatteryTelemetry;
  onClose: () => void;
}

// Utility functions (could also be moved to a separate utils file)
const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
};

const getScoreBgColor = (score: number) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
};

const getAnomalyColor = (type: string) => {
  switch (type) {
    case "critical":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    case "warning":
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    case "info":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
};

const getAnomalyIcon = (type: string) => {
  switch (type) {
    case "critical":
      return XCircle;
    case "warning":
      return AlertTriangle;
    case "info":
      return AlertCircle;
    default:
      return AlertCircle;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "signal":
      return Radio;
    case "health":
      return Battery;
    case "usage":
      return TrendingUp;
    case "error":
      return Zap;
    default:
      return AlertCircle;
  }
};

const formatDuration = (hours: number) => {
  if (hours < 1) return "< 1 hour";
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
};

const formatNumber = (num: number) =>
  new Intl.NumberFormat("en-US").format(Math.floor(num));

export const BatteryDetailModal = ({
  battery,
  onClose,
}: BatteryDetailModalProps) => {
  if (!battery) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card
        className="bg-slate-900 border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 hover:scrollbar-thumb-slate-500"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-slate-100 mb-2">
                {battery.bmsId}
              </CardTitle>
              <p className="text-slate-400 font-mono">{battery.tboxId}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Shield
                  className={`w-5 h-5 ${getScoreColor(battery.healthScore)}`}
                />
                Overall Health Score
              </h3>
              <div
                className={`text-4xl font-bold ${getScoreColor(
                  battery.healthScore
                )}`}
              >
                {battery.healthScore}
              </div>
            </div>
            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreBgColor(battery.healthScore)}`}
                style={{ width: `${battery.healthScore}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Score calculated based on {battery.anomalies.length} detected
              anomalies
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">
              Technical Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Battery Voltage</p>
                <p className="text-slate-200 text-lg font-semibold">
                  {battery.batVolt?.toFixed(1) || "N/A"}V
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Current</p>
                <p className="text-slate-200 text-lg font-semibold">
                  {battery.batCurrent?.toFixed(1) || "N/A"}A
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Temperature</p>
                <p className="text-slate-200 text-lg font-semibold">
                  {battery.batTemp?.toFixed(1) || "N/A"}°C
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">State of Health</p>
                <p
                  className={`text-lg font-semibold ${getScoreColor(
                    battery.batSOH
                  )}`}
                >
                  {battery.batSOH?.toFixed(1) || "N/A"}%
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Charge Cycles</p>
                <p className="text-slate-200 text-lg font-semibold">
                  {formatNumber(battery.batCycleCount) || "N/A"}
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Total Distance</p>
                <p className="text-slate-200 text-lg font-semibold">
                  {formatNumber(battery.totalDistanceTraveled) || "N/A"} km
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">
                  Avg Distance/Cycle
                </p>
                <p className="text-slate-200 text-lg font-semibold">
                  {battery.avgDistancePerCycle?.toFixed(1) || "N/A"} km
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Signal Status</p>
                <p
                  className={`text-lg font-semibold ${
                    battery.isOnline ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {battery.isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">
              Signal Information
            </h3>
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Last Pulse Received:</span>
                <span className="text-slate-200">
                  {battery.lastPulseTime
                    ? battery.lastPulseTime.toLocaleString()
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time Since Last Pulse:</span>
                <span
                  className={
                    battery.hoursSinceLastPulse > 24
                      ? "text-orange-400"
                      : "text-slate-200"
                  }
                >
                  {formatDuration(battery.hoursSinceLastPulse)}
                </span>
              </div>
              {!battery.isOnline && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Offline Duration:</span>
                  <span className="text-red-400">
                    {formatDuration(battery.offlineDuration)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">
              Detected Anomalies & Recommendations
            </h3>
            {battery.anomalies.length === 0 ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-green-400 font-medium">
                  No anomalies detected
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Battery operating within normal parameters
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {battery.anomalies.map((anomaly, idx) => {
                  const AnomalyIcon = getAnomalyIcon(anomaly.type);
                  const CategoryIcon = getCategoryIcon(anomaly.category);

                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-4 ${getAnomalyColor(
                        anomaly.type
                      )}`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <AnomalyIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CategoryIcon className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wide">
                              {anomaly.category}
                            </span>
                            <Badge className={getAnomalyColor(anomaly.type)}>
                              {anomaly.type}
                            </Badge>
                            <span className="text-xs ml-auto">
                              Impact: -{anomaly.impact} points
                            </span>
                          </div>
                          <p className="font-medium mb-2">{anomaly.message}</p>
                          <div className="bg-slate-900/50 rounded p-3 mt-2">
                            <p className="text-xs font-semibold mb-1 opacity-80">
                              💡 Recommendation:
                            </p>
                            <p className="text-sm">{anomaly.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
