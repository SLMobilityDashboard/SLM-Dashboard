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
  ThermometerSun,
  AlertTriangle,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  X,
  Radio,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

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
}

interface BatteryKPIs {
  TOTAL_BMS: number;
  ONLINE_BMS: number;
  OFFLINE_BMS: number;
  ERROR_BMS: number;
  HEALTHY_BMS: number;
  DEGRADED_BMS: number;
  AVG_SOH: number;
  TOTAL_DISTANCE: number;
  AVG_CYCLES: number;
}

interface FilterState {
  searchTerm: string;
  selectedStatuses: string[];
  sohRange: string;
  sortBy: string;
}

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

const generateBatteryData = (): BatteryTelemetry[] => {
  const tboxIds = Array.from(
    { length: 30 },
    (_, i) => `86520906951${9300 + i}`
  );

  // Current time - data ingestion happens at 1 AM daily
  const now = new Date();
  const lastIngestion = new Date(now);
  lastIngestion.setHours(1, 0, 0, 0);
  if (now.getHours() < 1) {
    lastIngestion.setDate(lastIngestion.getDate() - 1);
  }

  return tboxIds.map((tboxId, i) => {
    // Simulate various scenarios
    const hoursSincePulse = Math.random() * 72; // 0-72 hours
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

    return {
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
      status: hasError ? "error" : isOnline ? "online" : "offline",
    };
  });
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getStatusColor = (status: string) => {
  switch (status) {
    case "online":
      return "text-green-400 bg-green-500/10 border-green-500/20";
    case "offline":
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    case "error":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
};

const getSOHColor = (soh: number) => {
  if (soh >= 85) return "text-green-400";
  if (soh >= 75) return "text-yellow-400";
  if (soh >= 65) return "text-orange-400";
  return "text-red-400";
};

const getSOHBgColor = (soh: number) => {
  if (soh >= 85) return "bg-green-500";
  if (soh >= 75) return "bg-yellow-500";
  if (soh >= 65) return "bg-orange-500";
  return "bg-red-500";
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case "online":
      return CheckCircle;
    case "error":
      return XCircle;
    default:
      return Clock;
  }
};

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

const BatteryCard = ({ battery }: { battery: BatteryTelemetry }) => {
  const StatusIcon = getStatusIcon(battery.status);
  const isCharging = battery.batCurrent > 0;
  const isDischarging = battery.batCurrent < 0;

  return (
    <Card className="border-slate-800 hover:border-slate-700 transition-all duration-200 group">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-slate-800 rounded-lg flex-shrink-0">
              <Battery className="h-4 w-4 text-slate-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-slate-200 font-semibold text-lg break-all">
                {battery.bmsId}
              </h3>
              <p className="text-slate-400 text-sm font-mono break-all">
                {battery.tboxId}
              </p>
              {battery.vehicleId && (
                <p className="text-slate-500 text-xs">{battery.vehicleId}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
            <Badge
              className={`${getStatusColor(
                battery.status
              )} flex items-center gap-1.5 px-2.5 py-1`}
            >
              <StatusIcon className="h-3 w-3" />
              {battery.status}
            </Badge>
          </div>
        </div>

        {/* Signal Status */}
        <div className="bg-slate-800/30 rounded-lg p-3 mb-4 border border-slate-700/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Radio className="w-3 h-3" />
              BMS Signal Status
            </span>
            <Badge
              className={
                battery.isOnline
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-orange-500/10 text-orange-400 border-orange-500/20"
              }
            >
              {battery.isOnline ? "Transmitting" : "No Signal"}
            </Badge>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Last Pulse:</span>
              <span className="text-slate-300">
                {battery.lastPulseTime.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time Since Pulse:</span>
              <span
                className={
                  battery.hoursSinceLastPulse > 24
                    ? "text-orange-400"
                    : "text-slate-300"
                }
              >
                {formatDuration(battery.hoursSinceLastPulse)}
              </span>
            </div>
            {!battery.isOnline && (
              <div className="flex justify-between">
                <span className="text-slate-500">Offline Duration:</span>
                <span className="text-red-400">
                  {formatDuration(battery.offlineDuration)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SOH - Main Health Indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              State of Health (SOH)
            </span>
            <span
              className={`font-bold text-sm ${getSOHColor(battery.batSOH)}`}
            >
              {battery.batSOH}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getSOHBgColor(battery.batSOH)}`}
              style={{ width: `${battery.batSOH}%` }}
            />
          </div>
        </div>

        {/* Distance Metrics */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-700/30">
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
              <p className="text-slate-400 text-xs">Avg per Cycle</p>
              <p className="text-slate-200 text-sm font-medium">
                {battery.avgDistancePerCycle.toFixed(1)} km
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total Cycles</p>
              <p className="text-slate-200 text-sm font-medium">
                {formatNumber(battery.batCycleCount)}
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

        {/* Current Readings */}
        <div className="space-y-3 mb-4">
          {/* Voltage */}
          <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-slate-300 text-sm">Voltage</span>
            </div>
            <span className="text-slate-200 font-medium text-sm">
              {battery.batVolt.toFixed(1)}V
            </span>
          </div>

          {/* Current */}
          <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <span className="text-slate-300 text-sm">Current</span>
            </div>
            <span
              className={`font-medium text-sm ${
                isCharging
                  ? "text-green-400"
                  : isDischarging
                  ? "text-orange-400"
                  : "text-slate-200"
              }`}
            >
              {battery.batCurrent.toFixed(1)}A
              {isCharging && <span className="text-xs ml-1">⚡</span>}
              {isDischarging && <span className="text-xs ml-1">↓</span>}
            </span>
          </div>

          {/* Temperature */}
          <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <ThermometerSun className="h-4 w-4 text-orange-400" />
              <span className="text-slate-300 text-sm">Temperature</span>
            </div>
            <span
              className={`font-medium text-sm ${
                battery.batTemp > 40
                  ? "text-red-400"
                  : battery.batTemp > 35
                  ? "text-orange-400"
                  : "text-slate-200"
              }`}
            >
              {battery.batTemp.toFixed(1)}°C
            </span>
          </div>
        </div>

        {/* Alerts */}
        {(battery.batSOH < 75 ||
          battery.batTemp > 40 ||
          !battery.isOnline ||
          battery.batteryError) && (
          <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded text-xs text-orange-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                {battery.batSOH < 75 && (
                  <div>• Low SOH: {battery.batSOH}% - Consider replacement</div>
                )}
                {battery.batTemp > 40 && (
                  <div>• High temperature: {battery.batTemp.toFixed(1)}°C</div>
                )}
                {!battery.isOnline && (
                  <div>
                    • No signal for {formatDuration(battery.offlineDuration)} -
                    Check BMS connectivity
                  </div>
                )}
                {battery.batteryError && <div>• {battery.batteryError}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Data Ingestion Info */}
        <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
          Data ingested: {battery.dataIngestionTime.toLocaleString()} (Daily at
          1 AM)
        </div>
      </CardContent>
    </Card>
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
      selectedStatuses: [],
      sohRange: "all",
      sortBy: "soh-asc",
    });
  }, [onFiltersChange]);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.selectedStatuses.length > 0) count++;
    if (filters.sohRange !== "all") count++;
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
          {/* Status */}
          <div className="space-y-2">
            <Label className="text-slate-300">Status</Label>
            <Select
              onValueChange={(value) =>
                handleArrayFilterChange("selectedStatuses", value, true)
              }
              disabled={loading}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue
                  placeholder={
                    filters.selectedStatuses.length > 0
                      ? `${filters.selectedStatuses.length} selected`
                      : "All statuses"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {["online", "offline", "error"]
                  .filter((s) => !filters.selectedStatuses.includes(s))
                  .map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1">
              {filters.selectedStatuses.map((status: string) => (
                <Badge key={status} variant="secondary" className="text-xs">
                  {status}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() =>
                      handleArrayFilterChange("selectedStatuses", status, false)
                    }
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* SOH Range */}
          <div className="space-y-2">
            <Label className="text-slate-300">SOH Range</Label>
            <Select
              value={filters.sohRange}
              onValueChange={(value) => updateFilters({ sohRange: value })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SOH</SelectItem>
                <SelectItem value="healthy">Healthy (≥85%)</SelectItem>
                <SelectItem value="acceptable">Acceptable (75-84%)</SelectItem>
                <SelectItem value="degraded">Degraded (65-74%)</SelectItem>
                <SelectItem value="critical">Critical (&lt;65%)</SelectItem>
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
                <SelectItem value="soh-asc">SOH (Low to High)</SelectItem>
                <SelectItem value="soh-desc">SOH (High to Low)</SelectItem>
                <SelectItem value="offline-desc">Longest Offline</SelectItem>
                <SelectItem value="pulse-asc">Oldest Pulse</SelectItem>
                <SelectItem value="cycles-desc">Most Cycles</SelectItem>
                <SelectItem value="distance-desc">Most Distance</SelectItem>
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
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    selectedStatuses: [],
    sohRange: "all",
    sortBy: "soh-asc",
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    setTimeout(() => {
      setBatteries(generateBatteryData());
      setLastRefresh(new Date());
      setLoading(false);
    }, 500);
  };

  // Calculate KPIs
  const kpis: BatteryKPIs = useMemo(() => {
    return {
      TOTAL_BMS: batteries.length,
      ONLINE_BMS: batteries.filter((b) => b.isOnline).length,
      OFFLINE_BMS: batteries.filter((b) => !b.isOnline && !b.batteryError)
        .length,
      ERROR_BMS: batteries.filter((b) => b.batteryError).length,
      HEALTHY_BMS: batteries.filter((b) => b.batSOH >= 85 && b.isOnline).length,
      DEGRADED_BMS: batteries.filter((b) => b.batSOH < 75).length,
      AVG_SOH:
        batteries.length > 0
          ? Number(
              (
                batteries.reduce((sum, b) => sum + b.batSOH, 0) /
                batteries.length
              ).toFixed(1)
            )
          : 0,
      TOTAL_DISTANCE: batteries.reduce(
        (sum, b) => sum + b.totalDistanceTraveled,
        0
      ),
      AVG_CYCLES:
        batteries.length > 0
          ? Math.floor(
              batteries.reduce((sum, b) => sum + b.batCycleCount, 0) /
                batteries.length
            )
          : 0,
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

      const matchesStatus =
        filters.selectedStatuses.length === 0 ||
        filters.selectedStatuses.includes(battery.status);

      const matchesSOH = (() => {
        if (filters.sohRange === "all") return true;
        const soh = battery.batSOH;
        switch (filters.sohRange) {
          case "healthy":
            return soh >= 85;
          case "acceptable":
            return soh >= 75 && soh < 85;
          case "degraded":
            return soh >= 65 && soh < 75;
          case "critical":
            return soh < 65;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesStatus && matchesSOH;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "soh-asc":
          return a.batSOH - b.batSOH;
        case "soh-desc":
          return b.batSOH - a.batSOH;
        case "offline-desc":
          return b.offlineDuration - a.offlineDuration;
        case "pulse-asc":
          return b.hoursSinceLastPulse - a.hoursSinceLastPulse;
        case "cycles-desc":
          return b.batCycleCount - a.batCycleCount;
        case "distance-desc":
          return b.totalDistanceTraveled - a.totalDistanceTraveled;
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
      "Status",
      "Is Online",
      "Last Pulse Time",
      "Hours Since Pulse",
      "Offline Duration (hours)",
      "SOH %",
      "Voltage",
      "Current",
      "Temperature",
      "Cycles",
      "Total Distance (km)",
      "Avg Distance/Cycle",
      "Data Ingestion Time",
      "Error",
    ];

    const rows = filteredBatteries.map((b) => [
      b.bmsId,
      b.tboxId,
      b.vehicleId || "",
      b.status,
      b.isOnline ? "Yes" : "No",
      b.lastPulseTime.toISOString(),
      b.hoursSinceLastPulse,
      b.offlineDuration,
      b.batSOH,
      b.batVolt.toFixed(1),
      b.batCurrent.toFixed(1),
      b.batTemp.toFixed(1),
      b.batCycleCount,
      b.totalDistanceTraveled,
      b.avgDistancePerCycle.toFixed(1),
      b.dataIngestionTime.toISOString(),
      b.batteryError,
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
      `bms_monitoring_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-cyan-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading BMS monitoring data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <Radio className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">
              BMS Signal Monitoring System
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Battery Management System Dashboard
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Monitor BMS signal health, battery performance, and identify units
            requiring attention
          </p>
          <p className="text-sm text-slate-500">
            Last data ingestion: Today at 1:00 AM • Next update: Tomorrow at
            1:00 AM
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard
            icon={Battery}
            label="Total BMS Units"
            value={formatNumber(kpis.TOTAL_BMS)}
            description="All tracked batteries"
            color="text-blue-400"
            loading={loading}
          />
          <KPICard
            icon={CheckCircle}
            label="Online"
            value={formatNumber(kpis.ONLINE_BMS)}
            description="Transmitting signals"
            color="text-green-400"
            loading={loading}
          />
          <KPICard
            icon={Clock}
            label="Offline"
            value={formatNumber(kpis.OFFLINE_BMS)}
            description="No signal >24h"
            color="text-orange-400"
            loading={loading}
          />
          <KPICard
            icon={XCircle}
            label="Errors"
            value={formatNumber(kpis.ERROR_BMS)}
            description="Communication errors"
            color="text-red-400"
            loading={loading}
          />
          <KPICard
            icon={Activity}
            label="Healthy"
            value={formatNumber(kpis.HEALTHY_BMS)}
            description="SOH ≥85%, online"
            color="text-emerald-400"
            loading={loading}
          />
          <KPICard
            icon={AlertTriangle}
            label="Degraded"
            value={formatNumber(kpis.DEGRADED_BMS)}
            description="SOH <75%"
            color="text-yellow-400"
            loading={loading}
          />
          <KPICard
            icon={Gauge}
            label="Avg SOH"
            value={`${kpis.AVG_SOH}%`}
            description="Fleet health average"
            color="text-cyan-400"
            loading={loading}
          />
          <KPICard
            icon={TrendingUp}
            label="Total Distance"
            value={`${formatNumber(kpis.TOTAL_DISTANCE)} km`}
            description="Cumulative fleet"
            color="text-indigo-400"
            loading={loading}
          />
          <KPICard
            icon={RefreshCw}
            label="Avg Cycles"
            value={formatNumber(kpis.AVG_CYCLES)}
            description="Fleet average"
            color="text-pink-400"
            loading={loading}
          />
        </div>

        {/* Business Insights */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="text-slate-200 font-semibold">
                  Business Action Items
                </h3>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>
                    •{" "}
                    <strong className="text-orange-400">
                      {kpis.OFFLINE_BMS}
                    </strong>{" "}
                    BMS units offline - Check connectivity and schedule
                    maintenance
                  </p>
                  <p>
                    • <strong className="text-red-400">{kpis.ERROR_BMS}</strong>{" "}
                    BMS units reporting errors - Immediate investigation
                    required
                  </p>
                  <p>
                    •{" "}
                    <strong className="text-yellow-400">
                      {kpis.DEGRADED_BMS}
                    </strong>{" "}
                    batteries with SOH &lt;75% - Plan for replacement
                  </p>
                  <p>
                    •{" "}
                    <strong className="text-green-400">
                      {kpis.HEALTHY_BMS}
                    </strong>{" "}
                    healthy units ready for deployment
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
        <div className="flex items-center justify-between">
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
              Export CSV
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBatteries.map((battery) => (
              <BatteryCard key={battery.bmsId} battery={battery} />
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
    </div>
  );
};

export default BatteryTelemetryDashboard;
