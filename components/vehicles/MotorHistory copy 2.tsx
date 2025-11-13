import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import {
  AlertTriangle,
  Activity,
  RefreshCw,
  TrendingUp,
  Cog,
  Shield,
  Gauge,
  CheckCircle,
  XCircle,
  Download,
  Clock,
  Database,
  Battery,
  ChevronLeft,
  ChevronRight,
  Settings,
  RotateCcw,
  X,
} from "lucide-react";

// Import the actual hook and types
import useTelemetryData, {
  TelemetryAnalytics,
  GearPerformance,
  AnomalyData,
  SystemHealth,
  TelemetryFilters,
  TimeFilters,
  ThresholdConfig,
} from "@/hooks/useTelemetryData";
import { th } from "date-fns/locale";
import { util } from "echarts";

// Default configurations
const DEFAULT_THRESHOLDS: ThresholdConfig = {
  minRPM: 20,
  minThrottlePercent: 5,
  minPowerW: 50,
  minCurrentA: 10,
  criticalEfficiencyPercent: 0.5,
  lowEfficiencyPercent: 1.0,
  mediumEfficiencyPercent: 3.0,
  batteryOverheatTemp: 340, // 67.0°C
  motorOverheatTemp: 40, // 40.0°C
  inverterOverheatTemp: 40, // 40.0°C
  criticalBatteryTemp: 360, // 87.0°C
  currentSpikeA: 350, // 350A
  highPowerW: 120000, // 120kW
  abnormalRPMChange: 300,
  voltageStabilityThreshold: 10,
};

const DEFAULT_FILTERS: TelemetryFilters = {
  operationalOnly: false,
  validReadingsOnly: false,
};

const DEFAULT_TIME_FILTERS: TimeFilters = {
  timeRange: 500, // Last 500 hours
  groupBy: "hour",
};

// Custom components
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-slate-900/95 backdrop-blur-sm p-4 shadow-xl border-slate-700">
        <div className="text-sm font-medium text-slate-200 mb-2">
          {new Date(label).toLocaleString()}
        </div>
        <div className="grid gap-1 text-xs">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium text-slate-200">
                {typeof entry.value === "number" ? entry.value : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="flex justify-center items-center gap-2 mt-6">
    <button
      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      disabled={currentPage === 1}
      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg transition-colors flex items-center gap-2"
    >
      <ChevronLeft className="w-4 h-4" />
      Previous
    </button>
    <span className="text-slate-300 px-4">
      Page {currentPage} of {totalPages}
    </span>
    <button
      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      disabled={currentPage === totalPages}
      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg transition-colors flex items-center gap-2"
    >
      Next
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
);

interface Props {
  IMEI: number;
}

const EnhancedTelemetryDashboard: React.FC<Props> = ({ IMEI }) => {
  // Filter states
  const [timeFilters, setTimeFilters] =
    useState<TimeFilters>(DEFAULT_TIME_FILTERS);
  const [telemetryFilters, setTelemetryFilters] =
    useState<TelemetryFilters>(DEFAULT_FILTERS);
  const [thresholds, setThresholds] =
    useState<ThresholdConfig>(DEFAULT_THRESHOLDS);

  // UI states
  const [showThresholds, setShowThresholds] = useState<boolean>(false);
  const [anomalyPage, setAnomalyPage] = useState<number>(1);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [anomalyFilters, setAnomalyFilters] = useState({
    severity: "all",
    type: "all",
  });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Use the actual telemetry hook
  const {
    telemetryData,
    gearData,
    anomalies,
    systemHealth,
    loading,
    error,
    refetch,
    filterOptions,
  } = useTelemetryData(IMEI, timeFilters, telemetryFilters, thresholds);

  // Filter update handlers
  const updateTimeFilter = useCallback((key: keyof TimeFilters, value: any) => {
    setTimeFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateTelemetryFilter = useCallback(
    (key: keyof TelemetryFilters, value: any) => {
      setTelemetryFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateThreshold = useCallback(
    (key: keyof ThresholdConfig, value: number) => {
      setThresholds((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetThresholds = useCallback(() => {
    setThresholds(DEFAULT_THRESHOLDS);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setLastRefresh(new Date());
    setTimeout(() => setRefreshing(false), 1000);
  }, [refetch]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (telemetryData.length === 0) return null;

    return {
      avgRange: systemHealth?.RANGE,
      utilization: systemHealth?.OPERATIONAL_EFFICIENCY,
      totalPowerConsumed: telemetryData.reduce(
        (sum, d) => sum + (d.TOTAL_POWER_CONSUMED || 0),
        0
      ),
      avgBatteryHealth:
        telemetryData.reduce((sum, d) => sum + (d.AVG_BATTERY_HEALTH || 0), 0) /
        telemetryData.length,
      totalDataPoints: telemetryData.reduce(
        (sum, d) => sum + (d.DATA_POINTS || 0),
        0
      ),
      operationalDataPoints: telemetryData.reduce(
        (sum, d) => sum + (d.OPERATIONAL_READINGS || 0),
        0
      ),
      criticalAnomalies: anomalies.filter((a) => a.SEVERITY === "critical")
        .length,
      highAnomalies: anomalies.filter((a) => a.SEVERITY === "high").length,
    };
  }, [telemetryData, anomalies]);

  // Filter anomalies based on selected filters
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((anomaly) => {
      if (
        anomalyFilters.severity !== "all" &&
        anomaly.SEVERITY !== anomalyFilters.severity
      ) {
        return false;
      }
      if (
        anomalyFilters.type !== "all" &&
        anomaly.ANOMALY_TYPE !== anomalyFilters.type
      ) {
        return false;
      }
      return true;
    });
  }, [anomalies, anomalyFilters]);

  // Get unique anomaly types for filter dropdown
  const uniqueAnomalyTypes = useMemo(() => {
    return Array.from(
      new Set(anomalies.map((a) => a.ANOMALY_TYPE).filter(Boolean))
    );
  }, [anomalies]);

  // Paginated anomalies
  const ANOMALIES_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredAnomalies.length / ANOMALIES_PER_PAGE);
  const paginatedAnomalies = filteredAnomalies.slice(
    (anomalyPage - 1) * ANOMALIES_PER_PAGE,
    anomalyPage * ANOMALIES_PER_PAGE
  );

  // Get time range for display
  const timeRange = timeFilters.timeRange || 168;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-96 mb-2"></div>
          <div className="h-4 bg-slate-800 rounded w-full mb-6"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-slate-800 rounded animate-pulse"
            ></div>
          ))}
        </div>
        <div className="h-64 bg-slate-800 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Card className="bg-red-900/20 border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Error Loading Telemetry Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-300">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-cyan-400" />
            Smart Telemetry Analytics
          </h1>
          <p className="text-slate-400 mt-1">
            Advanced diagnostic analysis for Vehicle #{IMEI}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <select
            value={timeFilters.timeRange || ""}
            onChange={(e) =>
              updateTimeFilter("timeRange", Number(e.target.value))
            }
            className="bg-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm border border-slate-700"
          >
            <option value={1}>Last Hour</option>
            <option value={6}>Last 6 Hours</option>
            <option value={24}>Last 24 Hours</option>
            <option value={72}>Last 3 Days</option>
            <option value={168}>Last Week</option>
            <option value={500}>Last 500 Hours</option>
          </select>

          {/* Thresholds Toggle */}
          <button
            onClick={() => setShowThresholds(!showThresholds)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
              showThresholds
                ? "bg-cyan-600 text-white"
                : "bg-slate-800 text-slate-300 border border-slate-700"
            }`}
          >
            <Settings className="w-4 h-4" />
            Thresholds
          </button>

          {/* Refresh Button */}
          {/* <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button> */}

          {/* Export Button */}
          <button
            onClick={() => {
              const csvContent = telemetryData
                .map((data) => Object.values(data).join(","))
                .join("\n");
              const blob = new Blob([csvContent], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "telemetry_data.csv";
              a.click();
            }}
            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Dynamic Thresholds Panel */}
      {showThresholds && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Detection Thresholds
              </span>
              <button
                onClick={resetThresholds}
                className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </button>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Configure anomaly detection and performance thresholds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Performance Thresholds */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2">
                  Performance Limits
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Minimum RPM
                    </label>
                    <input
                      type="number"
                      value={thresholds.minRPM}
                      onChange={(e) =>
                        updateThreshold("minRPM", Number(e.target.value))
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      step="10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Min Throttle (%)
                    </label>
                    <input
                      type="number"
                      value={thresholds.minThrottlePercent}
                      onChange={(e) =>
                        updateThreshold(
                          "minThrottlePercent",
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Min Power (W)
                    </label>
                    <input
                      type="number"
                      value={thresholds.minPowerW}
                      onChange={(e) =>
                        updateThreshold("minPowerW", Number(e.target.value))
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      step="10"
                    />
                  </div>
                </div>
              </div>

              {/* Efficiency Thresholds */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2">
                  Efficiency Thresholds (%)
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Critical Efficiency
                    </label>
                    <input
                      type="number"
                      value={thresholds.criticalEfficiencyPercent}
                      onChange={(e) =>
                        updateThreshold(
                          "criticalEfficiencyPercent",
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Low Efficiency
                    </label>
                    <input
                      type="number"
                      value={thresholds.lowEfficiencyPercent}
                      onChange={(e) =>
                        updateThreshold(
                          "lowEfficiencyPercent",
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Medium Efficiency
                    </label>
                    <input
                      type="number"
                      value={thresholds.mediumEfficiencyPercent}
                      onChange={(e) =>
                        updateThreshold(
                          "mediumEfficiencyPercent",
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              {/* Temperature Thresholds */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2">
                  Temperature Limits (°C)
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Battery Overheat
                    </label>
                    <input
                      type="number"
                      value={thresholds.batteryOverheatTemp}
                      onChange={(e) =>
                        updateThreshold(
                          "batteryOverheatTemp",
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Motor Overheat
                    </label>
                    <input
                      type="number"
                      value={thresholds.motorOverheatTemp}
                      onChange={(e) =>
                        updateThreshold(
                          "motorOverheatTemp",
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      max="150"
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Critical Battery Temp
                    </label>
                    <input
                      type="number"
                      value={thresholds.criticalBatteryTemp}
                      onChange={(e) =>
                        updateThreshold(
                          "criticalBatteryTemp",
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                </div>
              </div>

              {/* Electrical Thresholds */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2">
                  Electrical Limits
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Current Spike (A)
                    </label>
                    <input
                      type="number"
                      value={thresholds.currentSpikeA}
                      onChange={(e) =>
                        updateThreshold("currentSpikeA", Number(e.target.value))
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      step="10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      High Power (W)
                    </label>
                    <input
                      type="number"
                      value={thresholds.highPowerW}
                      onChange={(e) =>
                        updateThreshold("highPowerW", Number(e.target.value))
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      step="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Voltage Stability
                    </label>
                    <input
                      type="number"
                      value={thresholds.voltageStabilityThreshold}
                      onChange={(e) =>
                        updateThreshold(
                          "voltageStabilityThreshold",
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              </div>

              {/* Mechanical Thresholds */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2">
                  Mechanical Limits
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      RPM Change Limit
                    </label>
                    <input
                      type="number"
                      value={thresholds.abnormalRPMChange}
                      onChange={(e) =>
                        updateThreshold(
                          "abnormalRPMChange",
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-slate-800 text-slate-200 rounded px-3 py-2 text-sm border border-slate-700"
                      min="0"
                      step="50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Bar */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-slate-300 text-sm">System Active</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-400 text-sm">Last Update:</span>
                <span className="text-slate-200 text-sm">
                  {lastRefresh.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400 text-sm">Data Quality:</span>
                <span className="text-blue-400 font-medium text-sm">
                  {(systemHealth?.DATA_QUALITY_SCORE || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 text-sm">System Health:</span>
                <span className="text-emerald-400 font-medium text-sm">
                  {systemHealth?.OVERALL_HEALTH_SCORE || 0}/100
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-5 h-5 text-green-400" />
              <span className="text-sm text-slate-300">Motor Utilization</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {(summaryMetrics?.utilization || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-green-300 mt-1">
              Percentage of total Active Time
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-900/30 to-red-800/20 border-red-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-slate-300">Critical Issues</span>
            </div>
            <div className="text-2xl font-bold text-red-400">
              {summaryMetrics?.criticalAnomalies || 0}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {(summaryMetrics?.criticalAnomalies || 0) > 0
                ? "Needs attention"
                : "All clear"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Battery className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-slate-300">Range</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {(summaryMetrics?.avgRange || 0).toFixed(1)} km
            </div>
            <div className="text-xs text-blue-300 mt-1">
              Avg distance travelled per full charge
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-slate-300">Health Score</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {(systemHealth?.OVERALL_HEALTH_SCORE || 0).toFixed(0)}
            </div>
            <div className="text-xs text-purple-300 mt-1">
              {(systemHealth?.OVERALL_HEALTH_SCORE || 0) > 70
                ? "Excellent"
                : (systemHealth?.OVERALL_HEALTH_SCORE || 0) > 40
                ? "Good"
                : "Needs attention"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Distribution */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Anomaly Distribution
          </CardTitle>
          <CardDescription className="text-slate-400">
            System alerts and anomalies by anomaly type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={telemetryData.slice(-24).reverse()}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-slate-700"
              />
              <XAxis
                dataKey="DATE_HOUR"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                  })
                }
              />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />

              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="EFFICIENCY_ANOMALIES"
                stackId="anomalies"
                fill="#ef476f"
                name="efficiency"
              />
              <Bar
                dataKey="TEMPERATURE_ANOMALIES"
                stackId="anomalies"
                fill="#f77f00"
                name="temperature"
              />
              <Bar
                dataKey="POWER_ANOMALIES"
                stackId="anomalies"
                fill="#ffd166"
                name="power"
              />
              <Bar
                dataKey="MECHANICAL_ANOMALIES"
                stackId="anomalies"
                fill="#118ab2"
                name="mechanical"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="ELECTRICAL_ANOMALIES"
                stackId="anomalies"
                fill="#06d6a0"
                name="electrical"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Temperature & Efficiency Analysis */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Temperature & Electrical Trends
          </CardTitle>
          <CardDescription className="text-slate-400">
            Real-time performance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Motor Temp vs Efficiency */}
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={telemetryData.slice(-100).reverse()}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-700"
                />
                <XAxis
                  dataKey="DATE_HOUR"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />

                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />

                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="AVG_MOTOR_TEMP"
                  stroke="#ef476f"
                  strokeWidth={2}
                  dot={false}
                  name="Motor Temp"
                />
                <ReferenceLine
                  yAxisId="temp"
                  y={thresholds.motorOverheatTemp}
                  stroke="#ef476f"
                  strokeDasharray="5 5"
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Battery Temp vs Efficiency */}
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={telemetryData.slice(-100).reverse()}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-700"
                />
                <XAxis
                  dataKey="DATE_HOUR"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />

                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />

                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="AVG_INVERTERTEMP"
                  stroke="#ffd166"
                  strokeWidth={2}
                  dot={false}
                  name="Inverter Temp"
                />
                <ReferenceLine
                  yAxisId="temp"
                  y={thresholds.inverterOverheatTemp}
                  stroke="#ffd166"
                  strokeDasharray="5 5"
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Battery Temp vs Efficiency */}
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={telemetryData.slice(-100).reverse()}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-700"
                />
                <XAxis
                  dataKey="DATE_HOUR"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />

                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />

                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="AVG_BATTERY_TEMP"
                  stroke="#00FFFF"
                  strokeWidth={2}
                  dot={false}
                  name="Battery Temp"
                />
                <ReferenceLine
                  yAxisId="temp"
                  y={thresholds.criticalBatteryTemp}
                  stroke="#00FFFF"
                  strokeDasharray="5 5"
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Motor Temp vs Efficiency */}
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={telemetryData.slice(-100).reverse()}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-700"
                />
                <XAxis
                  dataKey="DATE_HOUR"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />

                <YAxis
                  yAxisId="power"
                  orientation="right"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  domain={[0, thresholds.highPowerW * 1.2]}
                />
                <Tooltip content={<CustomTooltip />} />

                <Line
                  yAxisId="power"
                  type="monotone"
                  dataKey="AVG_ELECTRICAL_POWER"
                  stroke="#FFA500"
                  strokeWidth={2}
                  dot={false}
                  name="Electrical Power"
                />
                <ReferenceLine
                  yAxisId="power"
                  y={thresholds.highPowerW}
                  stroke="#FFA500"
                  strokeDasharray="5 5"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* System Health & Gear Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health Overview */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Shield className="w-5 h-5 text-emerald-400" />
              System Health Overview
            </CardTitle>
            <CardDescription className="text-slate-400">
              Overall system performance status and health indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div
                className={`text-4xl font-bold mb-2 ${
                  (systemHealth?.OVERALL_HEALTH_SCORE || 0) > 70
                    ? "text-green-400"
                    : (systemHealth?.OVERALL_HEALTH_SCORE || 0) > 40
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {(systemHealth?.OVERALL_HEALTH_SCORE || 0).toFixed(0)}
              </div>
              <div className="text-slate-300 font-medium">Health Score</div>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: "Battery Health",
                  value:
                    (systemHealth?.BATTERY_HEALTH_TREND || 0) > 0
                      ? "Improving"
                      : "Monitor",
                  color:
                    (systemHealth?.BATTERY_HEALTH_TREND || 0) > 0
                      ? "emerald"
                      : "yellow",
                },
                {
                  label: "Efficiency Trend",
                  value:
                    (systemHealth?.EFFICIENCY_TREND || 0) > 0
                      ? "Good"
                      : "Declining",
                  color:
                    (systemHealth?.EFFICIENCY_TREND || 0) > 0
                      ? "emerald"
                      : "red",
                },

                {
                  label: "Operational Utilization",
                  value: `${(systemHealth?.OPERATIONAL_EFFICIENCY || 0).toFixed(
                    1
                  )}%`,
                  color:
                    (systemHealth?.OPERATIONAL_EFFICIENCY || 0) > 30
                      ? "emerald"
                      : (systemHealth?.OPERATIONAL_EFFICIENCY || 0) > 15
                      ? "yellow"
                      : "red",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg"
                >
                  <span className="text-slate-300 font-medium">
                    {item.label}
                  </span>
                  <span className={`font-semibold text-${item.color}-400`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Quality Breakdown */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Database className="w-5 h-5 text-blue-400" />
              Data Quality Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={telemetryData
                  .map((row) => ({
                    ...row,
                    ANOMALOUS_READINGS:
                      row.DATA_POINTS -
                      (row.IDLE_READINGS + row.OPERATIONAL_READINGS),
                  }))
                  .slice(-24)
                  .reverse()}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#475569"
                  strokeOpacity={0.3}
                />
                <XAxis
                  dataKey="DATE_HOUR"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: "#64748b", strokeWidth: 1 }}
                  tickLine={{ stroke: "#64748b" }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: "#64748b", strokeWidth: 1 }}
                  tickLine={{ stroke: "#64748b" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="IDLE_READINGS"
                  stackId="1"
                  stroke="#6b7280"
                  fill="#6b7280"
                  name="Idle Readings"
                />
                <Area
                  type="monotone"
                  dataKey="OPERATIONAL_READINGS"
                  stackId="1"
                  stroke="#06d6a0"
                  fill="#06d6a0"
                  name="Operational Readings"
                />
                <Area
                  type="monotone"
                  dataKey="ANOMALOUS_READINGS"
                  stackId="1"
                  stroke="#ef476f"
                  fill="#ef476f"
                  name="Anomalous Readings"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gear Performance Analysis */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Cog className="w-5 h-5 text-purple-400" />
            Gear Performance Analysis
          </CardTitle>
          <CardDescription className="text-slate-400">
            Individual gear performance metrics and efficiency analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">
                Efficiency by Gear Position
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gearData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-slate-700"
                  />
                  <XAxis
                    dataKey="GEAR_POSITION"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="AVG_EFFICIENCY"
                    fill="#8b5cf6"
                    name="Average Efficiency"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="OPERATIONAL_TIME_PERCENT"
                    fill="#10b981"
                    name="Operational Time %"
                    radius={[4, 4, 0, 0]}
                  />
                  <ReferenceLine
                    y={thresholds.mediumEfficiencyPercent}
                    stroke="#ffd166"
                    strokeDasharray="5 5"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-4">
                Performance Summary
              </h4>
              <div className="space-y-3">
                {[
                  {
                    label: "Avg Daily Active time",
                    value: `${(
                      systemHealth?.AVG_DAILY_UTILIZATION || 0
                    ).toFixed(1)}%`,
                    color:
                      (systemHealth?.AVG_DAILY_UTILIZATION || 0) > 5
                        ? "emerald"
                        : (systemHealth?.AVG_DAILY_UTILIZATION || 0) > 3
                        ? "yellow"
                        : "red",
                  },
                  {
                    label: "Power Loss Events",
                    value: systemHealth?.POWER_LOSS_EVENTS || 0,
                    color:
                      (systemHealth?.POWER_LOSS_EVENTS || 0) > 10
                        ? "red"
                        : (systemHealth?.POWER_LOSS_EVENTS || 0) > 5
                        ? "yellow"
                        : "emerald",
                  },
                  {
                    label: "Thermal Events",
                    value: systemHealth?.THERMAL_EVENTS || 0,
                    color:
                      (systemHealth?.THERMAL_EVENTS || 0) > 20
                        ? "red"
                        : (systemHealth?.THERMAL_EVENTS || 0) > 10
                        ? "yellow"
                        : "emerald",
                  },
                  {
                    label: "Total Data Points",
                    value: (
                      summaryMetrics?.totalDataPoints || 0
                    ).toLocaleString(),
                    color: "blue",
                  },
                ].map((metric, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg"
                  >
                    <span className="text-slate-300 font-medium">
                      {metric.label}
                    </span>
                    <span className={`font-bold text-${metric.color}-400`}>
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white mb-4">
              Individual Gear Status
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gearData.map((gear, idx) => {
                const isHealthy =
                  gear.AVG_EFFICIENCY > thresholds.mediumEfficiencyPercent &&
                  gear.ANOMALY_COUNT < 5;
                const isCritical =
                  gear.AVG_EFFICIENCY < thresholds.criticalEfficiencyPercent;

                return (
                  <Card
                    key={idx}
                    className={`${
                      isHealthy
                        ? "bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-800/50"
                        : isCritical
                        ? "bg-gradient-to-br from-red-900/30 to-red-800/20 border-red-800/50"
                        : "bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border-yellow-800/50"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              isHealthy
                                ? "bg-green-400"
                                : isCritical
                                ? "bg-red-400"
                                : "bg-yellow-400"
                            }`}
                          ></div>
                          <h5 className="text-white font-bold">
                            Gear {gear.GEAR_POSITION}
                          </h5>
                        </div>
                        {isHealthy && (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        )}
                        {isCritical && (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Efficiency:</span>
                          <span className="text-white font-semibold">
                            {(gear.AVG_EFFICIENCY || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Operational:</span>
                          <span className="text-slate-300">
                            {(gear.OPERATIONAL_TIME_PERCENT || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Data Points:</span>
                          <span className="text-slate-300">
                            {(gear.DATA_POINTS || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Anomalies:</span>
                          <span
                            className={`font-semibold ${
                              gear.ANOMALY_COUNT > 5
                                ? "text-red-400"
                                : "text-green-400"
                            }`}
                          >
                            {gear.ANOMALY_COUNT}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-600/30">
                        {isCritical && (
                          <p className="text-red-400 text-xs font-semibold">
                            Critical: Immediate inspection required
                          </p>
                        )}
                        {isHealthy && (
                          <p className="text-green-400 text-xs">
                            Performing within normal parameters
                          </p>
                        )}
                        {!isHealthy && !isCritical && (
                          <p className="text-yellow-400 text-xs">
                            Monitor closely, performance declining
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Anomalies */}
      {anomalies.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Recent Anomalies ({filteredAnomalies.length} of {anomalies.length}
              )
            </CardTitle>
            <CardDescription className="text-slate-400">
              Detailed analysis of operational anomalies and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center mb-6">
              <select
                value={anomalyFilters.severity}
                onChange={(e) =>
                  setAnomalyFilters((prev) => ({
                    ...prev,
                    severity: e.target.value,
                  }))
                }
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-2 text-sm border border-slate-700"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={anomalyFilters.type}
                onChange={(e) =>
                  setAnomalyFilters((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-2 text-sm border border-slate-700"
              >
                <option value="all">All Types</option>
                {uniqueAnomalyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type?.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              {(anomalyFilters.severity !== "all" ||
                anomalyFilters.type !== "all") && (
                <button
                  onClick={() =>
                    setAnomalyFilters({ severity: "all", type: "all" })
                  }
                  className="text-slate-400 hover:text-slate-200 text-sm font-medium flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-4">
              {paginatedAnomalies.map((anomaly, idx) => (
                <Card
                  key={idx}
                  className={`${
                    anomaly.SEVERITY === "critical"
                      ? "bg-gradient-to-br from-red-900/30 to-red-800/20 border-red-800/50"
                      : anomaly.SEVERITY === "high"
                      ? "bg-gradient-to-br from-orange-900/30 to-orange-800/20 border-orange-800/50"
                      : anomaly.SEVERITY === "medium"
                      ? "bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border-yellow-800/50"
                      : "bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-800/50"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            anomaly.SEVERITY === "critical"
                              ? "bg-red-400"
                              : anomaly.SEVERITY === "high"
                              ? "bg-orange-400"
                              : anomaly.SEVERITY === "medium"
                              ? "bg-yellow-400"
                              : "bg-blue-400"
                          }`}
                        ></div>
                        <h5 className="text-white font-bold">
                          {anomaly.ANOMALY_TYPE?.replace(/_/g, " ") ||
                            "Performance Issue"}
                        </h5>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          anomaly.SEVERITY === "critical"
                            ? "bg-red-900/40 text-red-300 border border-red-700/40"
                            : anomaly.SEVERITY === "high"
                            ? "bg-orange-900/40 text-orange-300 border border-orange-700/40"
                            : anomaly.SEVERITY === "medium"
                            ? "bg-yellow-900/40 text-yellow-300 border border-yellow-700/40"
                            : "bg-blue-900/40 text-blue-300 border border-blue-700/40"
                        }`}
                      >
                        {anomaly.SEVERITY?.toUpperCase()}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-slate-300 mb-2">
                        {anomaly.DESCRIPTION}
                      </p>
                      <p className="text-yellow-300 font-medium">
                        <strong>Recommendation:</strong>{" "}
                        {anomaly.RECOMMENDATION}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                      <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                        <div className="text-slate-400 text-xs mb-1">
                          Confidence
                        </div>
                        <div className="text-white font-semibold">
                          {((anomaly.CONFIDENCE || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                        <div className="text-slate-400 text-xs mb-1">Gear</div>
                        <div className="text-white font-semibold">
                          {anomaly.GEAR_POSITION}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                        <div className="text-slate-400 text-xs mb-1">
                          Efficiency
                        </div>
                        <div className="text-white font-semibold">
                          {(anomaly.EFFICIENCY_VALUE || 0).toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                        <div className="text-slate-400 text-xs mb-1">
                          Timestamp
                        </div>
                        <div className="text-white font-semibold text-xs">
                          {new Date(anomaly.TIMESTAMP).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-600/30">
                      <div className="text-slate-400 text-xs mb-2">
                        PARAMETERS
                      </div>
                      <div className="text-slate-200 text-sm font-mono">
                        {anomaly.PARAMETER_VALUES}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={anomalyPage}
                totalPages={totalPages}
                onPageChange={setAnomalyPage}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Footer */}
      <Card className="bg-gradient-to-r from-slate-900/70 to-slate-800/70 border-slate-700">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">
              Telemetry Analysis Summary
            </h3>
            <p className="text-slate-400 text-sm">
              Based on {summaryMetrics?.totalDataPoints.toLocaleString()} data
              points over the last {timeRange} hours
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">
                {(summaryMetrics?.avgEfficiency || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-slate-400">Average Efficiency</div>
              <div className="text-xs text-slate-500">system performance</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {((summaryMetrics?.totalPowerConsumed || 0) / 1000000).toFixed(
                  1
                )}{" "}
                MWh
              </div>
              <div className="text-sm text-slate-400">Total Power</div>
              <div className="text-xs text-slate-500">consumed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {(summaryMetrics?.operationalDataPoints || 0).toLocaleString()}
              </div>
              <div className="text-sm text-slate-400">Operational Readings</div>
              <div className="text-xs text-slate-500">active usage</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">
                {(systemHealth?.OVERALL_HEALTH_SCORE || 0).toFixed(0)}/100
              </div>
              <div className="text-sm text-slate-400">Health Score</div>
              <div className="text-xs text-slate-500">system status</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedTelemetryDashboard;
