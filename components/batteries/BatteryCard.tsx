import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Shield,
  TrendingUp,
  XCircle,
  Radio,
  Battery,
  Zap,
  Layers,
} from "lucide-react";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BatteryTelemetry } from "@/hooks/useBatteryTelemetry";
import {
  formatNumber,
  getScoreColor,
  getScoreBgColor,
  getAnomalyColor,
} from "@/utils/battery-utils";
import { Badge } from "@/components/ui/badge";
import { BatteryDetailModal } from "./BatteryDetailModal";

// Local icon mapping functions
const getAnomalyIconComponent = (type: string) => {
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

const getCategoryIconComponent = (category: string) => {
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

// ============================================================================
// CELL VOLTAGE UTILITIES
// ============================================================================

const getCellVoltageColor = (voltage: number): string => {
  if (voltage < 2.6) return "bg-red-500"; // Critical - below threshold
  if (voltage < 3.0) return "bg-orange-500"; // Warning - low
  if (voltage > 4.2) return "bg-yellow-500"; // Warning - high
  if (voltage > 4.25) return "bg-red-500"; // Critical - too high
  return "bg-green-500"; // Normal
};

const getCellVoltageTextColor = (voltage: number): string => {
  if (voltage < 2.6) return "text-red-400";
  if (voltage < 3.0) return "text-orange-400";
  if (voltage > 4.2) return "text-yellow-400";
  if (voltage > 4.25) return "text-red-400";
  return "text-green-400";
};

const getCellHealthStatus = (voltage: number): string => {
  if (voltage < 2.6) return "CRITICAL";
  if (voltage < 3.0) return "LOW";
  if (voltage > 4.25) return "CRITICAL HIGH";
  if (voltage > 4.2) return "HIGH";
  return "OK";
};

// ============================================================================
// CELL VOLTAGE DISPLAY COMPONENT
// ============================================================================

interface CellVoltageDisplayProps {
  cellVoltages: number[];
  bssVoltageTimestamp: Date | null;
}

const CellVoltageDisplay = ({
  cellVoltages,
  bssVoltageTimestamp,
}: CellVoltageDisplayProps) => {
  const minVoltage = Math.min(...cellVoltages);
  const maxVoltage = Math.max(...cellVoltages);
  const avgVoltage =
    cellVoltages.reduce((a, b) => a + b, 0) / cellVoltages.length;
  const voltageSpread = maxVoltage - minVoltage;

  // Check for critical cells
  const criticalCells = cellVoltages.filter((v) => v < 2.6 || v > 4.25);
  const warningCells = cellVoltages.filter(
    (v) => (v >= 2.6 && v < 3.0) || (v > 4.2 && v <= 4.25)
  );
  const hasCriticalIssue = criticalCells.length > 0;
  const hasWarning = warningCells.length > 0;

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-700/30">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          Cell Voltages ({cellVoltages.length} cells)
        </div>
        {bssVoltageTimestamp && (
          <div className="text-xs text-slate-500">
            {new Date(bssVoltageTimestamp).toLocaleString()}
          </div>
        )}
      </div>

      {/* Status Alert */}
      {hasCriticalIssue && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400 font-medium">
            {criticalCells.length} cell{criticalCells.length !== 1 ? "s" : ""}{" "}
            below 2.6V threshold - IMMEDIATE ACTION REQUIRED
          </span>
        </div>
      )}
      {!hasCriticalIssue && hasWarning && (
        <div className="mb-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <span className="text-xs text-orange-400 font-medium">
            {warningCells.length} cell{warningCells.length !== 1 ? "s" : ""}{" "}
            showing warning signs
          </span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div>
          <p className="text-slate-400 text-xs">Min</p>
          <p
            className={`text-sm font-medium ${getCellVoltageTextColor(
              minVoltage
            )}`}
          >
            {minVoltage.toFixed(3)}V
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Max</p>
          <p
            className={`text-sm font-medium ${getCellVoltageTextColor(
              maxVoltage
            )}`}
          >
            {maxVoltage.toFixed(3)}V
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Avg</p>
          <p className="text-slate-200 text-sm font-medium">
            {avgVoltage.toFixed(3)}V
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Spread</p>
          <p
            className={`text-sm font-medium ${
              voltageSpread > 0.3
                ? "text-red-400"
                : voltageSpread > 0.15
                ? "text-orange-400"
                : "text-green-400"
            }`}
          >
            {voltageSpread.toFixed(3)}V
          </p>
        </div>
      </div>

      {/* Visual Cell Grid */}
      <div className="space-y-2">
        <div className="text-xs text-slate-400 mb-1">
          Cell Status Visualization:
        </div>
        <div className="grid grid-cols-10 gap-1">
          {cellVoltages.map((voltage, index) => {
            const isCritical = voltage < 2.6 || voltage > 4.25;
            const isWarning =
              (voltage >= 2.6 && voltage < 3.0) ||
              (voltage > 4.2 && voltage <= 4.25);

            return (
              <div
                key={index}
                className="group/cell relative transition-transform duration-200 hover:scale-110 transform-gpu"
              >
                {/* Custom tooltip - only shows for this specific cell */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-xs text-slate-200 rounded shadow-lg border border-slate-700 z-10 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  <div className="font-mono font-semibold">
                    Cell {index + 1}: {voltage.toFixed(3)}V
                  </div>
                  <div className="text-xs mt-0.5">
                    Status:{" "}
                    <span className={getCellVoltageTextColor(voltage)}>
                      {getCellHealthStatus(voltage)}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900 border-r border-b border-slate-700" />
                </div>

                {/* Cell voltage indicator */}
                <div
                  className={`h-8 rounded ${getCellVoltageColor(
                    voltage
                  )} cursor-pointer relative z-0 ${
                    isCritical ? "animate-pulse ring-2 ring-red-500/50" : ""
                  }`}
                  style={{
                    opacity: 0.3 + (voltage / 4.2) * 0.7,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Critical (&lt;2.6V or &gt;4.25V)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Normal</span>
          </div>
        </div>
      </div>

      {/* Detailed Cell List for Critical/Warning Cells */}
      {(hasCriticalIssue || hasWarning) && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="text-xs text-slate-400 mb-2">Problem Cells:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
            {cellVoltages.map((voltage, index) => {
              const isCritical = voltage < 2.6 || voltage > 4.25;
              const isWarning =
                (voltage >= 2.6 && voltage < 3.0) ||
                (voltage > 4.2 && voltage <= 4.25);

              if (!isCritical && !isWarning) return null;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-1.5 rounded text-xs ${
                    isCritical
                      ? "bg-red-500/10 text-red-400"
                      : "bg-orange-500/10 text-orange-400"
                  }`}
                >
                  <span className="font-medium">Cell {index + 1}</span>
                  <span className="font-mono">{voltage.toFixed(3)}V</span>
                  <span className="text-xs opacity-75">
                    {getCellHealthStatus(voltage)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// BATTERY CARD COMPONENT
// ============================================================================

interface BatteryCardProps {
  battery: BatteryTelemetry;
  onClick: () => void;
}

const BatteryCard = ({ battery, onClick }: BatteryCardProps) => {
  const criticalAnomalies = battery.anomalies.filter(
    (a) => a.type === "critical"
  );
  const warningAnomalies = battery.anomalies.filter(
    (a) => a.type === "warning"
  );
  const infoAnomalies = battery.anomalies.filter((a) => a.type === "info");

  // Check if there are cell voltage issues
  const hasCellVoltageData =
    battery.cellVoltages && battery.cellVoltages.length > 0;
  const hasCriticalCells = hasCellVoltageData
    ? battery.cellVoltages!.some((v) => v < 2.6 || v > 4.25)
    : false;

  return (
    <Card
      className={`border-slate-800 hover:border-slate-600 transition-all duration-200 group cursor-pointer ${
        hasCriticalCells ? "ring-2 ring-red-500/30 border-red-500/50" : ""
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`p-2 rounded-lg flex-shrink-0 ${
                hasCriticalCells ? "bg-red-500/20" : "bg-slate-800"
              }`}
            >
              <Shield
                className={`h-5 w-5 ${
                  hasCriticalCells
                    ? "text-red-400"
                    : getScoreColor(battery.healthScore)
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-slate-200 font-semibold text-md break-all">
                {battery.bmsId}
              </h3>
              <p className="text-slate-400 text-sm font-mono break-all">
                📍 {battery.tboxId}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
            <div className="text-right">
              <div
                className={`text-2xl font-bold ${getScoreColor(
                  battery.healthScore
                )}`}
              >
                {battery.healthScore}
              </div>
              <div className="text-xs text-slate-500">Health</div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getScoreBgColor(battery.healthScore)}`}
              style={{ width: `${battery.healthScore}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {hasCriticalCells && (
            <Badge className="bg-red-500/10 text-red-400 border-red-500/20 animate-pulse">
              <Layers className="w-3 h-3 mr-1" />
              Cell Voltage Issue
            </Badge>
          )}
          {criticalAnomalies.length > 0 && (
            <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
              <XCircle className="w-3 h-3 mr-1" />
              {criticalAnomalies.length} Critical
            </Badge>
          )}
          {warningAnomalies.length > 0 && (
            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {warningAnomalies.length} Warning
            </Badge>
          )}
          {infoAnomalies.length > 0 && (
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              <AlertCircle className="w-3 h-3 mr-1" />
              {infoAnomalies.length} Info
            </Badge>
          )}
          {battery.anomalies.length === 0 && !hasCriticalCells && (
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              No Issues
            </Badge>
          )}
        </div>

        {/* Cell Voltage Display - Always show when data exists */}
        {hasCellVoltageData && (
          <CellVoltageDisplay
            cellVoltages={battery.cellVoltages!}
            bssVoltageTimestamp={battery.bssVoltageTimestamp}
          />
        )}

        {/* Show placeholder when no cell voltage data */}
        {!hasCellVoltageData && (
          <div className="bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-700/30">
            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm py-4">
              <Layers className="w-4 h-4" />
              <span>No cell voltage data available</span>
            </div>
          </div>
        )}

        <div className="bg-slate-800/30 rounded-lg p-3 mb-4 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Usage Metrics
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-400 text-xs">Total Distance</p>
              <p className="text-slate-200 text-sm font-medium">
                {formatNumber(battery.totalDistanceTraveled)} km
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total Cycles</p>
              <p className="text-slate-200 text-sm font-medium">
                {formatNumber(battery.batCycleCount)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Avg per Cycle</p>
              <p className="text-slate-200 text-sm font-medium">
                {(battery.avgDistancePerCycle ?? 0).toFixed(1)} km
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">SOH</p>
              <p className="text-slate-200 text-sm font-medium">
                {battery.batSOH}%
              </p>
            </div>
          </div>
        </div>

        {battery.anomalies.length > 0 && (
          <div className="space-y-2">
            {battery.anomalies
              .sort((a, b) => {
                // Priority order: critical (0) > warning (1) > info (2)
                const priorityOrder = { critical: 0, warning: 1, info: 2 };
                const typePriority =
                  priorityOrder[a.type] - priorityOrder[b.type];

                // If same type, sort by impact (higher impact first)
                if (typePriority === 0) {
                  return b.impact - a.impact;
                }

                return typePriority;
              })
              .slice(0, 2) // Show top 2 most critical anomalies
              .map((anomaly, idx) => {
                const AnomalyIcon = getAnomalyIconComponent(anomaly.type);
                const CategoryIcon = getCategoryIconComponent(anomaly.category);

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${getAnomalyColor(
                      anomaly.type
                    )}`}
                  >
                    <div className="flex items-start gap-2">
                      <AnomalyIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CategoryIcon className="w-3 h-3" />
                          <span className="text-xs font-medium uppercase tracking-wide">
                            {anomaly.category}
                          </span>
                          {/* Show priority indicator for critical issues */}
                          {anomaly.type === "critical" && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full font-bold">
                              HIGH PRIORITY
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium">{anomaly.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Show indicator if there are more anomalies */}
            {battery.anomalies.length > 2 && (
              <div className="text-xs text-slate-400 text-center py-2">
                +{battery.anomalies.length - 2} more issue
                {battery.anomalies.length - 2 !== 1 ? "s" : ""} • Click to view
                all
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <button
            onClick={onClick}
            className="w-full flex items-center justify-between text-slate-400 hover:text-cyan-400 transition-colors text-sm group"
          >
            <span>View Full Details & Recommendations</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Last update: {battery.dataIngestionTime.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default BatteryCard;
export { CellVoltageDisplay };
