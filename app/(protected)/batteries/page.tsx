"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Battery,
  RefreshCw,
  Activity,
  Gauge,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  X,
  Radio,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Shield,
  Zap,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Anomaly {
  type: 'critical' | 'warning' | 'info';
  category: 'signal' | 'health' | 'usage' | 'error';
  message: string;
  impact: number; // Score impact (higher = worse)
  recommendation: string;
}

interface BatteryTelemetry {
  bmsId: string;
  tboxId: string;
  vehicleId?: string;
  // Battery Health Metrics
  batVolt: number;
  batCurrent: number;
  batTemp: number;
  batSOH: number;
  batCycleCount: number;
  batteryError: string;
  // Signal tracking
  lastPulseTime: Date;
  hoursSinceLastPulse: number;
  isOnline: boolean;
  offlineDuration: number; // hours offline
  // Distance metrics
  totalDistanceTraveled: number;
  avgDistancePerCycle: number;
  // Ingestion metadata
  dataIngestionTime: Date;
  status: "online" | "offline" | "error";
  // Anomaly detection
  anomalies: Anomaly[];
  healthScore: number; // 0-100, lower = worse
}

interface BatteryKPIs {
  TOTAL_BMS: number;
  CRITICAL_BMS: number;
  WARNING_BMS: number;
  HEALTHY_BMS: number;
  AVG_HEALTH_SCORE: number;
  TOTAL_ANOMALIES: number;
  TOTAL_DISTANCE: number;
  AVG_CYCLES: number;
  AVG_DISTANCE_PER_CYCLE: number;
}

interface FilterState {
  searchTerm: string;
  selectedSeverities: string[];
  scoreRange: string;
  sortBy: string;
}

// ============================================================================
// ANOMALY DETECTION ENGINE
// ============================================================================

const detectAnomalies = (battery: Omit<BatteryTelemetry, 'anomalies' | 'healthScore'>): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  // 1. CRITICAL: BMS Communication Error
  if (battery.batteryError) {
    anomalies.push({
      type: 'critical',
      category: 'error',
      message: `BMS Communication Error: ${battery.batteryError}`,
      impact: 40,
      recommendation: 'Immediate technical inspection required. Check BMS wiring and module functionality.'
    });
  }

  // 2. CRITICAL: Extended Offline (>48 hours)
  if (battery.offlineDuration > 48) {
    anomalies.push({
      type: 'critical',
      category: 'signal',
      message: `BMS offline for ${Math.floor(battery.offlineDuration / 24)} days`,
      impact: 35,
      recommendation: 'Critical connectivity issue. Verify power supply, antenna connection, and SIM card status.'
    });
  }

  // 3. CRITICAL: Very Low SOH (<65%)
  if (battery.batSOH < 65) {
    anomalies.push({
      type: 'critical',
      category: 'health',
      message: `Critical battery degradation: ${battery.batSOH}% SOH`,
      impact: 30,
      recommendation: 'Battery replacement required immediately. Performance and safety compromised.'
    });
  }

  // 4. WARNING: Offline (24-48 hours)
  if (battery.offlineDuration >= 24 && battery.offlineDuration <= 48) {
    anomalies.push({
      type: 'warning',
      category: 'signal',
      message: `No signal for ${battery.offlineDuration} hours`,
      impact: 20,
      recommendation: 'Check vehicle location and network coverage. Schedule maintenance if pattern continues.'
    });
  }

  // 5. WARNING: Low SOH (65-75%)
  if (battery.batSOH >= 65 && battery.batSOH < 75) {
    anomalies.push({
      type: 'warning',
      category: 'health',
      message: `Battery degradation detected: ${battery.batSOH}% SOH`,
      impact: 20,
      recommendation: 'Plan replacement within 1-2 months. Monitor closely for performance issues.'
    });
  }

  // 6. WARNING: Moderate SOH (75-85%)
  if (battery.batSOH >= 75 && battery.batSOH < 85) {
    anomalies.push({
      type: 'warning',
      category: 'health',
      message: `Moderate battery wear: ${battery.batSOH}% SOH`,
      impact: 10,
      recommendation: 'Continue monitoring. Consider replacement planning in 3-6 months.'
    });
  }

  // 7. WARNING: High Cycle Count (>400)
  if (battery.batCycleCount > 400) {
    anomalies.push({
      type: 'warning',
      category: 'usage',
      message: `High usage: ${battery.batCycleCount} charge cycles`,
      impact: 15,
      recommendation: 'Battery approaching end of life. Plan proactive replacement.'
    });
  }

  // 8. WARNING: Excessive Distance per Cycle (>50km average)
  if (battery.avgDistancePerCycle > 50) {
    anomalies.push({
      type: 'warning',
      category: 'usage',
      message: `Heavy usage pattern: ${battery.avgDistancePerCycle.toFixed(1)} km/cycle average`,
      impact: 10,
      recommendation: 'Monitor for accelerated degradation. Verify charging practices.'
    });
  }

  // 9. INFO: Recent Signal Loss (12-24 hours)
  if (battery.hoursSinceLastPulse >= 12 && battery.hoursSinceLastPulse < 24) {
    anomalies.push({
      type: 'info',
      category: 'signal',
      message: `Signal delayed: ${battery.hoursSinceLastPulse} hours since last pulse`,
      impact: 5,
      recommendation: 'Monitor signal stability. May be temporary connectivity issue.'
    });
  }

  // 10. INFO: Low Distance Usage
  if (battery.avgDistancePerCycle < 15 && battery.batCycleCount > 50) {
    anomalies.push({
      type: 'info',
      category: 'usage',
      message: `Low usage pattern: ${battery.avgDistancePerCycle.toFixed(1)} km/cycle average`,
      impact: 3,
      recommendation: 'Vehicle may be underutilized or used for short trips only.'
    });
  }

  return anomalies;
};

const calculateHealthScore = (anomalies: Anomaly[]): number => {
  const totalImpact = anomalies.reduce((sum, a) => sum + a.impact, 0);
  const score = Math.max(0, 100 - totalImpact);
  return Math.round(score);
};

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

const generateBatteryData = (): BatteryTelemetry[] => {
  const tboxIds = Array.from(
    { length: 30 },
    (_, i) => `86520906951${9300 + i}`
  );

  const now = new Date();
  const lastIngestion = new Date(now);
  lastIngestion.setHours(1, 0, 0, 0);
  if (now.getHours() < 1) {
    lastIngestion.setDate(lastIngestion.getDate() - 1);
  }

  return tboxIds.map((tboxId, i) => {
    const hoursSincePulse = Math.random() * 72;
    const isOnline = hoursSincePulse < 24;
    const hasError = Math.random() > 0.92;

    const lastPulseTime = new Date(
      lastIngestion.getTime() - hoursSincePulse * 3600000
    );
    const offlineDuration = isOnline ? 0 : Math.floor(hoursSincePulse - 24);

    const batCycleCount = Math.floor(100 + Math.random() * 400);
    const totalDistance = batCycleCount * (30 + Math.random() * 20);
    const avgDistancePerCycle = totalDistance / batCycleCount;

    const batSOH = Math.floor(65 + Math.random() * 35);

    const batteryBase = {
      bmsId: `BMS-${String(i + 1).padStart(4, "0")}`,
      tboxId,
      vehicleId:
        Math.random() > 0.3
          ? `VEH-${String(i + 1).padStart(4, "0")}`
          : undefined,
      batVolt: 48 + Math.random() * 10,
      batCurrent: (Math.random() - 0.5) * 20,
      batTemp: 20 + Math.random() * 25,
      batSOH,
      batCycleCount,
      batteryError: hasError ? "BMS communication error" : "",
      lastPulseTime,
      hoursSinceLastPulse: Math.floor(hoursSincePulse),
      isOnline,
      offlineDuration,
      totalDistanceTraveled: Math.floor(totalDistance),
      avgDistancePerCycle: Math.floor(avgDistancePerCycle),
      dataIngestionTime: lastIngestion,
      status: (hasError ? "error" : isOnline ? "online" : "offline") as any,
    };

    const anomalies = detectAnomalies(batteryBase);
    const healthScore = calculateHealthScore(anomalies);

    return {
      ...batteryBase,
      anomalies,
      healthScore,
    };
  });
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

const KPICard = ({
  icon: Icon,
  label,
  value,
  description,
  color,
  loading = false,
}: any) => (
  <Card className="bg-slate-900/50 border-slate-700/50">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-300">
        {label}
      </CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="h-8 w-20 bg-slate-800 rounded animate-pulse"></div>
      ) : (
        <div className="text-2xl font-bold text-slate-100">{value}</div>
      )}
      <p className="text-xs text-slate-400 mt-1">{description}</p>
    </CardContent>
  </Card>
);

// ============================================================================
// BATTERY CARD COMPONENT
// ============================================================================

const BatteryCard = ({ battery, onClick }: { battery: BatteryTelemetry; onClick: () => void }) => {
  const criticalAnomalies = battery.anomalies.filter(a => a.type === 'critical');
  const warningAnomalies = battery.anomalies.filter(a => a.type === 'warning');
  const infoAnomalies = battery.anomalies.filter(a => a.type === 'info');

  return (
    <Card 
      className="border-slate-800 hover:border-slate-600 transition-all duration-200 group cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-6">
        {/* Header with Health Score */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-slate-800 rounded-lg flex-shrink-0">
              <Shield className={`h-5 w-5 ${getScoreColor(battery.healthScore)}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-slate-200 font-semibold text-lg break-all">
                {battery.bmsId}
              </h3>
              <p className="text-slate-400 text-sm font-mono break-all">
                {battery.tboxId}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(battery.healthScore)}`}>
                {battery.healthScore}
              </div>
              <div className="text-xs text-slate-500">Health Score</div>
            </div>
          </div>
        </div>

        {/* Health Score Bar */}
        <div className="mb-4">
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getScoreBgColor(battery.healthScore)}`}
              style={{ width: `${battery.healthScore}%` }}
            />
          </div>
        </div>

        {/* Anomaly Summary */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
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
          {battery.anomalies.length === 0 && (
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              No Issues
            </Badge>
          )}
        </div>

        {/* Usage Metrics */}
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
                {battery.avgDistancePerCycle.toFixed(1)} km
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Cycles/Day</p>
              <p className="text-slate-200 text-sm font-medium">
                {(battery.batCycleCount / 365).toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Top Anomalies */}
        {battery.anomalies.length > 0 && (
          <div className="space-y-2">
            {battery.anomalies.slice(0, 2).map((anomaly, idx) => {
              const AnomalyIcon = getAnomalyIcon(anomaly.type);
              const CategoryIcon = getCategoryIcon(anomaly.category);
              
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${getAnomalyColor(anomaly.type)}`}
                >
                  <div className="flex items-start gap-2">
                    <AnomalyIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CategoryIcon className="w-3 h-3" />
                        <span className="text-xs font-medium uppercase tracking-wide">
                          {anomaly.category}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{anomaly.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Details Button */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <button className="w-full flex items-center justify-between text-slate-400 hover:text-cyan-400 transition-colors text-sm group">
            <span>View Full Details & Recommendations</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Last Update */}
        <div className="mt-3 text-xs text-slate-500">
          Last update: {battery.dataIngestionTime.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// DETAIL MODAL
// ============================================================================

const BatteryDetailModal = ({ battery, onClose }: { battery: BatteryTelemetry; onClose: () => void }) => {
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
              {battery.vehicleId && (
                <p className="text-slate-500 text-sm">{battery.vehicleId}</p>
              )}
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
          {/* Health Score Section */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Shield className={`w-5 h-5 ${getScoreColor(battery.healthScore)}`} />
                Overall Health Score
              </h3>
              <div className={`text-4xl font-bold ${getScoreColor(battery.healthScore)}`}>
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
              Score calculated based on {battery.anomalies.length} detected anomalies
            </p>
          </div>

          {/* Technical Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Technical Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Battery Voltage</p>
                <p className="text-slate-200 text-lg font-semibold">{battery.batVolt.toFixed(1)}V</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Current</p>
                <p className="text-slate-200 text-lg font-semibold">{battery.batCurrent.toFixed(1)}A</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Temperature</p>
                <p className="text-slate-200 text-lg font-semibold">{battery.batTemp.toFixed(1)}°C</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">State of Health</p>
                <p className={`text-lg font-semibold ${getScoreColor(battery.batSOH)}`}>
                  {battery.batSOH}%
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Charge Cycles</p>
                <p className="text-slate-200 text-lg font-semibold">{formatNumber(battery.batCycleCount)}</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Total Distance</p>
                <p className="text-slate-200 text-lg font-semibold">{formatNumber(battery.totalDistanceTraveled)} km</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Avg Distance/Cycle</p>
                <p className="text-slate-200 text-lg font-semibold">{battery.avgDistancePerCycle.toFixed(1)} km</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Signal Status</p>
                <p className={`text-lg font-semibold ${battery.isOnline ? 'text-green-400' : 'text-red-400'}`}>
                  {battery.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>

          {/* Signal Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Signal Information</h3>
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Last Pulse Received:</span>
                <span className="text-slate-200">{battery.lastPulseTime.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time Since Last Pulse:</span>
                <span className={battery.hoursSinceLastPulse > 24 ? 'text-orange-400' : 'text-slate-200'}>
                  {formatDuration(battery.hoursSinceLastPulse)}
                </span>
              </div>
              {!battery.isOnline && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Offline Duration:</span>
                  <span className="text-red-400">{formatDuration(battery.offlineDuration)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Anomalies & Recommendations */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">
              Detected Anomalies & Recommendations
            </h3>
            {battery.anomalies.length === 0 ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-green-400 font-medium">No anomalies detected</p>
                <p className="text-slate-400 text-sm mt-1">Battery operating within normal parameters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {battery.anomalies.map((anomaly, idx) => {
                  const AnomalyIcon = getAnomalyIcon(anomaly.type);
                  const CategoryIcon = getCategoryIcon(anomaly.category);
                  
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-4 ${getAnomalyColor(anomaly.type)}`}
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

// ============================================================================
// FILTER COMPONENT
// ============================================================================

const BatteryFilter = ({ onFiltersChange, loading, filters }: any) => {
  const updateFilters = useCallback(
    (newFilters: Partial<FilterState>) => {
      onFiltersChange({ ...filters, ...newFilters });
    },
    [filters, onFiltersChange]
  );

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      searchTerm: "",
      selectedSeverities: [],
      scoreRange: "all",
      sortBy: "score-asc",
    });
  }, [onFiltersChange]);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.selectedSeverities.length > 0) count++;
    if (filters.scoreRange !== "all") count++;
    return count;
  };

  const handleArrayFilterChange = (
    filterKey: string,
    value: string,
    checked: boolean
  ) => {
    const currentArray = filters[filterKey] as string[];
    const newArray = checked
      ? [...currentArray, value]
      : currentArray.filter((item: string) => item !== value);
    updateFilters({ [filterKey]: newArray });
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-200">Filters</span>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary">
                {getActiveFiltersCount()} active
              </Badge>
            )}
          </div>
          {getActiveFiltersCount() > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-slate-300"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label className="text-slate-300">Search</Label>
          <Input
            value={filters.searchTerm}
            onChange={(e) => updateFilters({ searchTerm: e.target.value })}
            placeholder="Search by BMS ID, T-Box ID, Vehicle ID..."
            className="bg-slate-800 border-slate-600 text-slate-200"
          />
        </div>

        {/* Main Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Severity */}
          <div className="space-y-2">
            <Label className="text-slate-300">Anomaly Severity</Label>
            <Select
              onValueChange={(value) =>
                handleArrayFilterChange("selectedSeverities", value, true)
              }
              disabled={loading}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue
                  placeholder={
                    filters.selectedSeverities.length > 0
                      ? `${filters.selectedSeverities.length} selected`
                      : "All severities"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {["critical", "warning", "info"]
                  .filter((s) => !filters.selectedSeverities.includes(s))
                  .map((severity) => (
                    <SelectItem key={severity} value={severity}>
                      {severity}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1">
              {filters.selectedSeverities.map((severity: string) => (
                <Badge key={severity} variant="secondary" className="text-xs">
                  {severity}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() =>
                      handleArrayFilterChange("selectedSeverities", severity, false)
                    }
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Health Score Range */}
          <div className="space-y-2">
            <Label className="text-slate-300">Health Score</Label>
            <Select
              value={filters.scoreRange}
              onValueChange={(value) => updateFilters({ scoreRange: value })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="critical">Critical (&lt;40)</SelectItem>
                <SelectItem value="poor">Poor (40-59)</SelectItem>
                <SelectItem value="fair">Fair (60-79)</SelectItem>
                <SelectItem value="good">Good (≥80)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <Label className="text-slate-300">Sort By</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => updateFilters({ sortBy: value })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score-asc">Health Score (Low to High)</SelectItem>
                <SelectItem value="score-desc">Health Score (High to Low)</SelectItem>
                <SelectItem value="anomalies-desc">Most Anomalies</SelectItem>
                <SelectItem value="critical-desc">Most Critical Issues</SelectItem>
                <SelectItem value="cycles-desc">Most Cycles</SelectItem>
                <SelectItem value="distance-desc">Most Distance</SelectItem>
                <SelectItem value="avg-distance-desc">Highest km/Cycle</SelectItem>
                <SelectItem value="avg-distance-asc">Lowest km/Cycle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BatteryTelemetryDashboard = () => {
  const [batteries, setBatteries] = useState<BatteryTelemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBattery, setSelectedBattery] = useState<BatteryTelemetry | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    selectedSeverities: [],
    scoreRange: "all",
    sortBy: "score-asc",
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    setTimeout(() => {
      setBatteries(generateBatteryData());
      setLoading(false);
    }, 500);
  };

  // Calculate KPIs
  const kpis: BatteryKPIs = useMemo(() => {
    const criticalBatteries = batteries.filter(b => b.healthScore < 40);
    const warningBatteries = batteries.filter(b => b.healthScore >= 40 && b.healthScore < 80);
    const healthyBatteries = batteries.filter(b => b.healthScore >= 80);
    const totalAnomalies = batteries.reduce((sum, b) => sum + b.anomalies.length, 0);
    const avgScore = batteries.length > 0
      ? batteries.reduce((sum, b) => sum + b.healthScore, 0) / batteries.length
      : 0;
    const totalDistance = batteries.reduce((sum, b) => sum + b.totalDistanceTraveled, 0);
    const avgCycles = batteries.length > 0
      ? batteries.reduce((sum, b) => sum + b.batCycleCount, 0) / batteries.length
      : 0;
    const avgDistPerCycle = batteries.length > 0
      ? batteries.reduce((sum, b) => sum + b.avgDistancePerCycle, 0) / batteries.length
      : 0;

    return {
      TOTAL_BMS: batteries.length,
      CRITICAL_BMS: criticalBatteries.length,
      WARNING_BMS: warningBatteries.length,
      HEALTHY_BMS: healthyBatteries.length,
      AVG_HEALTH_SCORE: Math.round(avgScore),
      TOTAL_ANOMALIES: totalAnomalies,
      TOTAL_DISTANCE: totalDistance,
      AVG_CYCLES: Math.round(avgCycles),
      AVG_DISTANCE_PER_CYCLE: avgDistPerCycle,
    };
  }, [batteries]);

  // Filter and sort batteries
  const filteredBatteries = useMemo(() => {
    let filtered = batteries.filter((battery) => {
      const matchesSearch =
        battery.bmsId
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        battery.tboxId
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        (battery.vehicleId &&
          battery.vehicleId
            .toLowerCase()
            .includes(filters.searchTerm.toLowerCase()));

      const matchesSeverity =
        filters.selectedSeverities.length === 0 ||
        battery.anomalies.some(a => filters.selectedSeverities.includes(a.type));

      const matchesScore = (() => {
        if (filters.scoreRange === "all") return true;
        const score = battery.healthScore;
        switch (filters.scoreRange) {
          case "critical":
            return score < 40;
          case "poor":
            return score >= 40 && score < 60;
          case "fair":
            return score >= 60 && score < 80;
          case "good":
            return score >= 80;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesSeverity && matchesScore;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "score-asc":
          return a.healthScore - b.healthScore;
        case "score-desc":
          return b.healthScore - a.healthScore;
        case "anomalies-desc":
          return b.anomalies.length - a.anomalies.length;
        case "critical-desc":
          return b.anomalies.filter(an => an.type === 'critical').length - 
                 a.anomalies.filter(an => an.type === 'critical').length;
        case "cycles-desc":
          return b.batCycleCount - a.batCycleCount;
        case "distance-desc":
          return b.totalDistanceTraveled - a.totalDistanceTraveled;
        case "avg-distance-desc":
          return b.avgDistancePerCycle - a.avgDistancePerCycle;
        case "avg-distance-asc":
          return a.avgDistancePerCycle - b.avgDistancePerCycle;
        default:
          return a.bmsId.localeCompare(b.bmsId);
      }
    });

    return filtered;
  }, [batteries, filters]);

  // Export function
  const handleExport = () => {
    const headers = [
      "BMS ID",
      "T-Box ID",
      "Vehicle ID",
      "Health Score",
      "Total Anomalies",
      "Critical Anomalies",
      "Warning Anomalies",
      "Info Anomalies",
      "SOH %",
      "Signal Status",
      "Hours Since Pulse",
      "Offline Duration",
      "Cycles",
      "Total Distance (km)",
      "Top Anomaly",
      "Top Recommendation",
    ];

    const rows = filteredBatteries.map((b) => [
      b.bmsId,
      b.tboxId,
      b.vehicleId || "",
      b.healthScore,
      b.anomalies.length,
      b.anomalies.filter(a => a.type === 'critical').length,
      b.anomalies.filter(a => a.type === 'warning').length,
      b.anomalies.filter(a => a.type === 'info').length,
      b.batSOH,
      b.isOnline ? "Online" : "Offline",
      b.hoursSinceLastPulse,
      b.offlineDuration,
      b.batCycleCount,
      b.totalDistanceTraveled,
      b.anomalies[0]?.message || "No anomalies",
      b.anomalies[0]?.recommendation || "N/A",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `bms_anomaly_report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-cyan-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading BMS anomaly data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgb(30 41 59);
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgb(71 85 105);
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgb(100 116 139);
        }
      `}</style>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-cyan-500/20 rounded-full">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">
              Anomaly Detection System
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            BMS Health Monitoring Dashboard
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            AI-powered anomaly detection and health scoring for proactive battery management
          </p>
          <p className="text-sm text-slate-500">
            Data as of today at 1:00 AM • Batteries ranked by health score
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard
            icon={Battery}
            label="Total BMS Units"
            value={formatNumber(kpis.TOTAL_BMS)}
            description="All monitored"
            color="text-blue-400"
            loading={loading}
          />
          <KPICard
            icon={XCircle}
            label="Critical"
            value={formatNumber(kpis.CRITICAL_BMS)}
            description="Score < 40"
            color="text-red-400"
            loading={loading}
          />
          <KPICard
            icon={AlertTriangle}
            label="Warning"
            value={formatNumber(kpis.WARNING_BMS)}
            description="Score 40-79"
            color="text-orange-400"
            loading={loading}
          />
          <KPICard
            icon={CheckCircle}
            label="Healthy"
            value={formatNumber(kpis.HEALTHY_BMS)}
            description="Score ≥ 80"
            color="text-green-400"
            loading={loading}
          />
          <KPICard
            icon={Gauge}
            label="Avg Health Score"
            value={kpis.AVG_HEALTH_SCORE}
            description="Fleet average"
            color="text-cyan-400"
            loading={loading}
          />
          <KPICard
            icon={Activity}
            label="Total Anomalies"
            value={formatNumber(kpis.TOTAL_ANOMALIES)}
            description="Detected issues"
            color="text-purple-400"
            loading={loading}
          />
          <KPICard
            icon={TrendingUp}
            label="Fleet Distance"
            value={`${formatNumber(kpis.TOTAL_DISTANCE)} km`}
            description="Total traveled"
            color="text-indigo-400"
            loading={loading}
          />
          <KPICard
            icon={RefreshCw}
            label="Avg Cycles"
            value={formatNumber(kpis.AVG_CYCLES)}
            description="Per battery"
            color="text-pink-400"
            loading={loading}
          />
          <KPICard
            icon={Gauge}
            label="Avg Distance/Cycle"
            value={`${kpis.AVG_DISTANCE_PER_CYCLE.toFixed(1)} km`}
            description="Usage intensity"
            color="text-emerald-400"
            loading={loading}
          />
        </div>

        {/* Priority Actions */}
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="text-slate-200 font-semibold">Priority Actions Required</h3>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>
                    • <strong className="text-red-400">{kpis.CRITICAL_BMS}</strong> batteries require immediate attention (Health Score &lt; 40)
                  </p>
                  <p>
                    • <strong className="text-orange-400">{kpis.WARNING_BMS}</strong> batteries showing warning signs - plan maintenance
                  </p>
                  <p>
                    • <strong className="text-cyan-400">{kpis.TOTAL_ANOMALIES}</strong> total anomalies detected across fleet
                  </p>
                  <p className="text-slate-400 text-xs mt-2">
                    💡 Batteries are sorted by health score (lowest first) to help you prioritize interventions
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <BatteryFilter
          onFiltersChange={setFilters}
          loading={loading}
          filters={filters}
        />

        {/* Results and Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-slate-400">
            Showing{" "}
            <span className="text-cyan-400 font-medium">
              {filteredBatteries.length}
            </span>{" "}
            of{" "}
            <span className="text-cyan-400 font-medium">
              {batteries.length}
            </span>{" "}
            BMS units
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
              onClick={handleExport}
              disabled={filteredBatteries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button
              variant="outline"
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
              onClick={loadData}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Battery Cards Grid */}
        {filteredBatteries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBatteries.map((battery) => (
              <BatteryCard 
                key={battery.bmsId} 
                battery={battery}
                onClick={() => setSelectedBattery(battery)}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-12 text-center">
              <Battery className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-slate-300 text-lg font-medium mb-2">
                No BMS units found
              </h3>
              <p className="text-slate-400 text-sm">
                Try adjusting your filters to see more results
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Modal */}
      {selectedBattery && (
        <BatteryDetailModal
          battery={selectedBattery}
          onClose={() => setSelectedBattery(null)}
        />
      )}
    </div>
  );
};

export default BatteryTelemetryDashboard;