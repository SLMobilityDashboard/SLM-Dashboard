import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import {
  Battery,
  Thermometer,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Gauge,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowUpDown,
  Target,
  FileText,
  Loader2,
  Filter,
  Calendar,
  X,
} from "lucide-react";

// Import the optimized hook and types
import useBatteryData, {
  TboxData,
  BatterySwapEvent,
  BatterySession,
  DiagnosticMetrics,
  BatteryFilters,
} from "@/hooks/useBatteryData";

interface ProcessedDataPoint extends TboxData {
  continuousTemp?: number;
  continuousVoltage?: number;
  continuousCurrent?: number;
  continuousCellDiff?: number;
  swapTransition?: boolean;
}

// Helper function to safely convert values to numbers
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

// Function to create continuous data with smooth battery swap transitions
const createContinuousData = (data: TboxData[]): ProcessedDataPoint[] => {
  if (data.length === 0) return [];

  const processedData: ProcessedDataPoint[] = [];
  const swapPoints: number[] = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i].BMS_ID !== data[i - 1].BMS_ID) {
      swapPoints.push(i);
    }
  }

  for (let i = 0; i < data.length; i++) {
    const currentPoint = { ...data[i] } as ProcessedDataPoint;
    const isSwapPoint = swapPoints.includes(i);

    if (isSwapPoint && i > 0) {
      const prevPoint = data[i - 1];
      const currentBatteryPoint = data[i];

      currentPoint.continuousTemp =
        (safeNumber(prevPoint.BATTEMP) +
          safeNumber(currentBatteryPoint.BATTEMP)) /
        2;
      currentPoint.continuousVoltage =
        (safeNumber(prevPoint.BATVOLT) +
          safeNumber(currentBatteryPoint.BATVOLT)) /
        2;
      currentPoint.continuousCurrent =
        (safeNumber(prevPoint.BATCURRENT) +
          safeNumber(currentBatteryPoint.BATCURRENT)) /
        2;
      currentPoint.continuousCellDiff =
        (safeNumber(prevPoint.BATCELLDIFFMAX) +
          safeNumber(currentBatteryPoint.BATCELLDIFFMAX)) /
        2;
      currentPoint.swapTransition = true;
    } else {
      currentPoint.continuousTemp = safeNumber(currentPoint.BATTEMP);
      currentPoint.continuousVoltage = safeNumber(currentPoint.BATVOLT);
      currentPoint.continuousCurrent = safeNumber(currentPoint.BATCURRENT);
      currentPoint.continuousCellDiff = safeNumber(currentPoint.BATCELLDIFFMAX);
      currentPoint.swapTransition = false;
    }

    processedData.push(currentPoint);
  }

  return processedData;
};

// Function to create BMS-segmented data for area charts
const createBMSSegmentedData = (data: ProcessedDataPoint[], metric: string) => {
  if (!data.length) return [];

  const uniqueBMSIds = [...new Set(data.map((d) => d.BMS_ID))];
  const segmentedData = [];

  for (let i = 0; i < data.length; i++) {
    const dataPoint = { ...data[i] };

    uniqueBMSIds.forEach((bmsId) => {
      const key = `${metric}_${bmsId}`;
      if (data[i].BMS_ID === bmsId) {
        switch (metric) {
          case "temp":
            dataPoint[key] = safeNumber(
              data[i].continuousTemp || data[i].BATTEMP
            );
            break;
          case "voltage":
            dataPoint[key] = safeNumber(
              data[i].continuousVoltage || data[i].BATVOLT
            );
            break;
          case "current":
            dataPoint[key] = safeNumber(
              data[i].continuousCurrent || data[i].BATCURRENT
            );
            break;
          case "cellDiff":
            dataPoint[key] = safeNumber(
              data[i].continuousCellDiff || data[i].BATCELLDIFFMAX
            );
            break;
          case "soh":
            dataPoint[key] = safeNumber(data[i].BATSOH);
            break;
          case "charge":
            dataPoint[key] = safeNumber(data[i].BATPERCENT);
            break;
          default:
            dataPoint[key] = 0;
        }
      } else {
        dataPoint[key] = null;
      }
    });

    segmentedData.push(dataPoint);
  }

  return segmentedData;
};

// Enhanced tooltip
const ScooterTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ProcessedDataPoint;

    return (
      <div className="rounded-lg border border-slate-700 shadow-xl bg-slate-900 p-4 max-w-xs">
        <div className="text-sm font-medium text-slate-200 mb-2">
          {new Date(safeNumber(data.CTIME) * 1000).toLocaleString()}
        </div>
        <div className="text-xs text-slate-300 mb-2 flex items-center gap-2 flex-wrap">
          <span className="text-blue-400 font-mono">{data.BMS_ID}</span>
          {data.swapTransition && (
            <>
              <span>|</span>
              <span className="text-purple-400 font-semibold">SWAP</span>
            </>
          )}
          <span>|</span>
          <span className="text-green-400">
            {safeNumber(data.TOTAL_DISTANCE_KM).toFixed(1)}km
          </span>
        </div>
        <div className="grid gap-1 text-xs max-h-32 overflow-y-auto">
          {payload.map(
            (entry: any, index: number) =>
              entry.value !== null && (
                <div key={index} className="flex justify-between">
                  <span style={{ color: entry.color }}>{entry.name}:</span>
                  <span className="font-medium text-slate-200">
                    {typeof entry.value === "number"
                      ? entry.value.toFixed(2)
                      : entry.value}
                  </span>
                </div>
              )
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Filters Panel Component with Apply Button
const FiltersPanel: React.FC<{
  filters: BatteryFilters;
  onFiltersChange: (filters: BatteryFilters) => void;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ filters, onFiltersChange, isOpen, onToggle }) => {
  // Calculate default dates (last 7 days)
  const getDefaultEndDate = () => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  };

  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0];
  };

  // Local state for pending filter changes
  const [pendingFilters, setPendingFilters] = useState<BatteryFilters>(filters);
  const [startDate, setStartDate] = useState<string>(
    filters.startTimestamp
      ? new Date(filters.startTimestamp * 1000).toISOString().split("T")[0]
      : getDefaultStartDate()
  );
  const [endDate, setEndDate] = useState<string>(
    filters.endTimestamp
      ? new Date(filters.endTimestamp * 1000).toISOString().split("T")[0]
      : getDefaultEndDate()
  );
  const [dateRangeError, setDateRangeError] = useState<string>("");

  // Check if there are unapplied changes
  const hasUnappliedChanges =
    JSON.stringify(pendingFilters) !== JSON.stringify(filters);

  const calculateDaysDifference = (start: string, end: string): number => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
  };

  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    setDateRangeError("");

    const start = new Date(newStartDate);
    const maxEnd = new Date(start);
    maxEnd.setDate(maxEnd.getDate() + 7);
    const currentEnd = new Date(endDate);
    const daysDiff = calculateDaysDifference(newStartDate, endDate);

    if (daysDiff > 7) {
      const adjustedEnd = maxEnd.toISOString().split("T")[0];
      setEndDate(adjustedEnd);
      setDateRangeError("End date adjusted to maintain 7-day maximum range");
      updatePendingTimeRange(newStartDate, adjustedEnd);
    } else if (currentEnd < start) {
      setEndDate(newStartDate);
      updatePendingTimeRange(newStartDate, newStartDate);
    } else {
      updatePendingTimeRange(newStartDate, endDate);
    }
  };

  const handleEndDateChange = (newEndDate: string) => {
    setDateRangeError("");
    const start = new Date(startDate);
    const end = new Date(newEndDate);
    const maxEnd = new Date(start);
    maxEnd.setDate(maxEnd.getDate() + 7);
    const daysDiff = calculateDaysDifference(startDate, newEndDate);

    if (daysDiff > 7) {
      const adjustedEnd = maxEnd.toISOString().split("T")[0];
      setEndDate(adjustedEnd);
      setDateRangeError("Maximum date range is 7 days");
      updatePendingTimeRange(startDate, adjustedEnd);
      return;
    }

    if (end < start) {
      setEndDate(startDate);
      setDateRangeError("End date cannot be before start date");
      updatePendingTimeRange(startDate, startDate);
      return;
    }

    setEndDate(newEndDate);
    updatePendingTimeRange(startDate, newEndDate);
  };

  const updatePendingTimeRange = (start: string, end: string) => {
    const startTime = new Date(start + "T00:00:00").getTime() / 1000;
    const endTime = new Date(end + "T23:59:59").getTime() / 1000;
    const hours = Math.ceil((endTime - startTime) / 3600);

    setPendingFilters({
      ...pendingFilters,
      timeRange: hours,
      startTimestamp: startTime,
      endTimestamp: endTime,
    });
  };

  const getMaxEndDate = () => {
    const start = new Date(startDate);
    const maxEnd = new Date(start);
    maxEnd.setDate(maxEnd.getDate() + 7);
    const today = new Date();
    return maxEnd < today
      ? maxEnd.toISOString().split("T")[0]
      : today.toISOString().split("T")[0];
  };

  const handleReset = () => {
    const defaultStart = getDefaultStartDate();
    const defaultEnd = getDefaultEndDate();
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setDateRangeError("");

    const startTime = new Date(defaultStart + "T00:00:00").getTime() / 1000;
    const endTime = new Date(defaultEnd + "T23:59:59").getTime() / 1000;

    setPendingFilters({
      timeRange: 168,
      startTimestamp: startTime,
      endTimestamp: endTime,
      includeIdleData: false,
    });
  };

  const handleApply = () => {
    onFiltersChange(pendingFilters);
    onToggle();
  };

  const handleCancel = () => {
    // Reset to current applied filters
    setPendingFilters(filters);
    if (filters.startTimestamp) {
      setStartDate(
        new Date(filters.startTimestamp * 1000).toISOString().split("T")[0]
      );
    }
    if (filters.endTimestamp) {
      setEndDate(
        new Date(filters.endTimestamp * 1000).toISOString().split("T")[0]
      );
    }
    setDateRangeError("");
    onToggle();
  };

  const daysDifference = calculateDaysDifference(startDate, endDate);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg"
      >
        <Filter className="w-4 h-4" />
        Filters
        {(filters.startTimestamp || filters.endTimestamp) && (
          <span className="bg-purple-500 text-white text-xs font-medium px-2 py-1 rounded-full">
            {calculateDaysDifference(
              new Date(filters.startTimestamp! * 1000)
                .toISOString()
                .split("T")[0],
              new Date(filters.endTimestamp! * 1000).toISOString().split("T")[0]
            )}
            d
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-2xl z-50 min-w-80">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-400" />
              Data Filters
            </h4>
            <button
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Date Range Filter */}
            <div className="pb-4 border-b border-slate-700">
              <label className="block text-sm text-slate-300 mb-2 font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Date Range (Max 7 days)
              </label>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    max={getDefaultEndDate()}
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    min={startDate}
                    max={getMaxEndDate()}
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Selected Range:</span>
                  <span
                    className={`font-medium ${
                      daysDifference === 7 ? "text-purple-400" : "text-blue-400"
                    }`}
                  >
                    {daysDifference} day{daysDifference !== 1 ? "s" : ""}
                  </span>
                </div>

                {dateRangeError && (
                  <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded px-2 py-1">
                    {dateRangeError}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={handleReset}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded transition-colors text-sm font-medium"
              >
                Reset
              </button>
              <button
                onClick={handleApply}
                disabled={!hasUnappliedChanges}
                className={`flex-1 px-3 py-2 rounded transition-colors text-sm font-medium ${
                  hasUnappliedChanges
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-slate-600 text-slate-400 cursor-not-allowed"
                }`}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BatteryHistory: React.FC<{ IMEI: string }> = ({ IMEI }) => {
  const [selectedTboxId, setSelectedTboxId] = useState<string>(IMEI || "");
  const [inputTboxId, setInputTboxId] = useState<string>("");
  const [filters, setFilters] = useState<BatteryFilters>({
    timeRange: 168, // 7 days default
    includeIdleData: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Use the optimized hook
  const {
    batteryData,
    batterySwaps,
    batterySessions,
    diagnostics,
    loading,
    error,
    debugInfo,
    refetch,
  } = useBatteryData(selectedTboxId, filters);

  // Process the data for continuous charts
  const processedData = useMemo(() => {
    return createContinuousData(batteryData);
  }, [batteryData]);

  // Color mapping for different BMS IDs
  const bmsColors = useMemo(() => {
    const uniqueBmsIds = [...new Set(batteryData.map((d) => d.BMS_ID))];
    const colors = [
      "#8b5cf6",
      "#06b6d4",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#ec4899",
      "#84cc16",
      "#f97316",
    ];
    return uniqueBmsIds.reduce((acc, bmsId, index) => {
      acc[bmsId] = colors[index % colors.length];
      return acc;
    }, {} as Record<string, string>);
  }, [batteryData]);

  // Create segmented data for each metric
  const temperatureData = useMemo(
    () => createBMSSegmentedData(processedData, "temp"),
    [processedData]
  );
  const voltageData = useMemo(
    () => createBMSSegmentedData(processedData, "voltage"),
    [processedData]
  );
  const currentData = useMemo(
    () => createBMSSegmentedData(processedData, "current"),
    [processedData]
  );
  const cellDiffData = useMemo(() => {
    const data = createBMSSegmentedData(processedData, "cellDiff");
    const hasData = data.some((d: any) => {
      return Object.keys(d).some(
        (key) => key.startsWith("cellDiff_") && d[key] !== null && d[key] !== 0
      );
    });
    if (!hasData && processedData.length > 0) {
      console.warn("Cell imbalance data appears to be empty or all zeros");
      console.log("Sample data point:", processedData[0]);
    }
    return data;
  }, [processedData]);

  const uniqueBMSIds = [...new Set(batteryData.map((d) => d.BMS_ID))];

  // Handle TBOX ID submission
  const handleTboxSubmit = () => {
    if (inputTboxId.trim()) {
      setSelectedTboxId(inputTboxId.trim());
      setShowFilters(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-purple-400" />
          <p className="text-slate-300 text-lg mb-2">
            Loading battery diagnostics...
          </p>
          <p className="text-slate-500 text-sm">
            Analyzing data for {selectedTboxId}
          </p>
          {debugInfo && (
            <div className="mt-4 text-xs text-slate-500 space-y-1">
              <p>Telemetry Records: {safeNumber(debugInfo.telemetryCount)}</p>
              <p>
                Battery Swaps: {safeNumber(debugInfo.consolidatedSwapCount)}
              </p>
              <p>Battery Sessions: {safeNumber(debugInfo.sessionCount)}</p>
              <p>Unique Batteries: {safeNumber(debugInfo.uniqueBatteries)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error && selectedTboxId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center max-w-lg">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-semibold text-red-300 mb-4">
            Data Loading Error
          </h2>
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-slate-300 text-sm">{error}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSelectedTboxId("")}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Change TBOX ID
            </button>
            <button
              onClick={refetch}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No TBOX ID selected state
  if (!selectedTboxId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Battery className="w-20 h-20 mx-auto mb-6 text-purple-400" />
          <h2 className="text-2xl font-semibold text-slate-200 mb-4">
            Scooter Battery Diagnostics
          </h2>
          <p className="text-slate-400 mb-6">
            Enter a TBOX ID to analyze battery performance and health metrics
          </p>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter TBOX ID (e.g., SCOOTER_001, TB_12345)"
              value={inputTboxId}
              onChange={(e) => setInputTboxId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleTboxSubmit();
                }
              }}
            />
            <button
              onClick={handleTboxSubmit}
              disabled={!inputTboxId.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              Load Battery Data
            </button>
          </div>
          <div className="mt-8 text-xs text-slate-500">
            <p>• Real-time battery swap detection</p>
            <p>• Health & performance analytics</p>
            <p>• Multi-battery session tracking</p>
          </div>
        </div>
      </div>
    );
  }

  // No data available - only show after loading completes
  if (!loading && batteryData.length === 0) {
    return (
      <div className="min-h-screen text-slate-100 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-xl font-semibold text-slate-200 mb-4">
            No Battery Data Found
          </h2>
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-6">
            <p className="text-slate-300 mb-2">
              No battery telemetry data found for:{" "}
              <span className="font-mono text-yellow-400">
                {selectedTboxId}
              </span>
            </p>
            <div className="text-sm text-slate-400 space-y-1">
              <p>Time Range: {filters.timeRange} hours</p>
              <p>Include Idle Data: {filters.includeIdleData ? "Yes" : "No"}</p>
              {debugInfo && <p>Database Query: Executed successfully</p>}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSelectedTboxId("")}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Change TBOX ID
            </button>
            <button
              onClick={refetch}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard view with data
  return (
    <div className="min-h-screen text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* LEFT SIDE */}
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Battery className="w-8 h-8 text-purple-400" />
              Battery Diagnostics
            </h1>

            <div className="mt-2 space-y-1">
              <p className="text-slate-400">
                Scooter:{" "}
                <span className="font-mono text-blue-400">
                  {selectedTboxId}
                </span>{" "}
                | Battery swap tracking & health analysis
              </p>

              {debugInfo && (
                <div className="text-xs text-slate-500 flex items-center gap-4">
                  <span>
                    {safeNumber(debugInfo.telemetryCount)} data points
                  </span>
                  <span>•</span>
                  <span>
                    {safeNumber(debugInfo.uniqueBatteries)} unique batteries
                  </span>
                  <span>•</span>
                  <span>{batterySwaps.length} swaps detected</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE (Filters) */}
          <div className="flex justify-start lg:justify-end">
            <FiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              isOpen={showFilters}
              onToggle={() => setShowFilters(!showFilters)}
            />
          </div>
        </div>

        {/* Quick Status Overview - Only show if diagnostics exist */}
        {diagnostics && (
          <div
            className={`rounded-lg p-6 border-2 ${
              diagnostics.overallHealth === "Excellent"
                ? "bg-green-900/20 border-green-700"
                : diagnostics.overallHealth === "Good"
                ? "bg-blue-900/20 border-blue-700"
                : diagnostics.overallHealth === "Fair"
                ? "bg-yellow-900/20 border-yellow-700"
                : "bg-red-900/20 border-red-700"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Target className="w-6 h-6" />
                Overall Health: {diagnostics.overallHealth}
              </h2>
              <div className="text-sm text-slate-400">
                {safeNumber(diagnostics.totalBatteries)} batteries tracked |{" "}
                {safeNumber(diagnostics.totalSwaps)} swaps detected
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {safeNumber(diagnostics.totalBatteries)}
                </div>
                <div className="text-slate-400 text-sm">Unique Batteries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {safeNumber(diagnostics.totalSwaps)}
                </div>
                <div className="text-slate-400 text-sm">Battery Swaps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {safeNumber(diagnostics.swapFrequency).toFixed(1)}
                </div>
                <div className="text-slate-400 text-sm">Swaps/Day</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {safeNumber(diagnostics.avgSessionDuration).toFixed(1)}h
                </div>
                <div className="text-slate-400 text-sm">Avg Session</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {diagnostics.thermalPerformance}
                </div>
                <div className="text-slate-400 text-sm">Thermal Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-400">
                  {diagnostics.voltageStability}
                </div>
                <div className="text-slate-400 text-sm">Voltage Status</div>
              </div>
            </div>
          </div>
        )}

        {/* Battery Usage Timeline */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Battery Usage Timeline
          </h3>

          {/* BMS Legend */}
          <div className="flex flex-wrap gap-3 mb-4 p-3 bg-slate-800/50 rounded-lg">
            {Object.entries(bmsColors).map(([bmsId, color]) => (
              <div key={bmsId} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-sm text-slate-300 font-mono">
                  {bmsId}
                </span>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                dataKey="CTIME"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) => {
                  const date = new Date(safeNumber(value) * 1000);
                  return date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                yAxisId="percent"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                domain={[0, 100]}
                label={{
                  value: "Charge %",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#94a3b8" },
                }}
              />
              <YAxis
                yAxisId="soh"
                orientation="right"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                domain={[70, 100]}
                label={{
                  value: "SOH %",
                  angle: 90,
                  position: "insideRight",
                  style: { fill: "#94a3b8" },
                }}
              />
              <Tooltip content={<ScooterTooltip />} />

              <Area
                yAxisId="percent"
                type="monotone"
                dataKey={(data: ProcessedDataPoint) =>
                  safeNumber(data.BATPERCENT)
                }
                fill="#10b981"
                fillOpacity={0.3}
                stroke="#10b981"
                strokeWidth={2}
                name="Charge Level (%)"
              />

              <Line
                yAxisId="soh"
                type="monotone"
                dataKey={(data: ProcessedDataPoint) => safeNumber(data.BATSOH)}
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={false}
                name="Battery Health (%)"
              />

              {/* Battery indicator line at the bottom */}
              {uniqueBMSIds.map((bmsId) => (
                <Line
                  key={`indicator_${bmsId}`}
                  yAxisId="percent"
                  type="stepAfter"
                  dataKey={(data: ProcessedDataPoint) =>
                    data.BMS_ID === bmsId ? -5 : null
                  }
                  stroke={bmsColors[bmsId]}
                  strokeWidth={6}
                  dot={false}
                  connectNulls={false}
                  name={`${bmsId} Active`}
                />
              ))}

              {batterySwaps.map((swap, idx) => (
                <ReferenceLine
                  key={idx}
                  x={safeNumber(swap.TIMESTAMP)}
                  stroke="#a855f7"
                  strokeDasharray="2 2"
                  strokeWidth={2}
                  label={{
                    value: "SWAP",
                    position: "top",
                    fontSize: 10,
                    fill: "#a855f7",
                  }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Temperature Analysis */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-orange-400" />
              Battery Temperature by BMS
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="CTIME"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(value) => {
                    const date = new Date(safeNumber(value) * 1000);
                    return date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  label={{
                    value: "°C",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#94a3b8" },
                  }}
                />
                <Tooltip content={<ScooterTooltip />} />

                {/* Create separate Area for each BMS */}
                {uniqueBMSIds.map((bmsId) => (
                  <Area
                    key={bmsId}
                    type="monotone"
                    dataKey={`temp_${bmsId}`}
                    stackId="temp"
                    stroke={bmsColors[bmsId]}
                    fill={bmsColors[bmsId]}
                    fillOpacity={0.6}
                    name={`${bmsId} Temp (°C)`}
                    connectNulls={false}
                  />
                ))}

                <ReferenceLine
                  y={45}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{
                    value: "Warning (45°C)",
                    position: "topRight",
                    fontSize: 10,
                    fill: "#f59e0b",
                  }}
                />
                <ReferenceLine
                  y={65}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{
                    value: "Critical (65°C)",
                    position: "topRight",
                    fontSize: 10,
                    fill: "#ef4444",
                  }}
                />

                {/* Swap event markers */}
                {batterySwaps.map((swap, idx) => (
                  <ReferenceLine
                    key={idx}
                    x={safeNumber(swap.timestamp)}
                    stroke="#a855f7"
                    strokeDasharray="1 1"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Voltage Analysis */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              Battery Voltage by BMS
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={voltageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="CTIME"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(value) => {
                    const date = new Date(safeNumber(value) * 1000);
                    return date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  domain={[42, 56]}
                  label={{
                    value: "V",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#94a3b8" },
                  }}
                />
                <Tooltip content={<ScooterTooltip />} />

                {/* Create separate Area for each BMS */}
                {uniqueBMSIds.map((bmsId) => (
                  <Area
                    key={bmsId}
                    type="monotone"
                    dataKey={`voltage_${bmsId}`}
                    stackId="voltage"
                    stroke={bmsColors[bmsId]}
                    fill={bmsColors[bmsId]}
                    fillOpacity={0.6}
                    name={`${bmsId} Voltage (V)`}
                    connectNulls={false}
                  />
                ))}

                <ReferenceLine
                  y={44}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{
                    value: "Min Safe (44V)",
                    position: "topRight",
                    fontSize: 10,
                    fill: "#ef4444",
                  }}
                />
                <ReferenceLine
                  y={52}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  label={{
                    value: "Nominal (52V)",
                    position: "topRight",
                    fontSize: 10,
                    fill: "#10b981",
                  }}
                />

                {/* Swap event markers */}
                {batterySwaps.map((swap, idx) => (
                  <ReferenceLine
                    key={idx}
                    x={safeNumber(swap.timestamp)}
                    stroke="#a855f7"
                    strokeDasharray="1 1"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Cell Imbalance Analysis */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Cell Imbalance by BMS
            </h3>
            {cellDiffData.length > 0 &&
            cellDiffData.some((d: any) =>
              Object.keys(d).some(
                (key) => key.startsWith("cellDiff_") && d[key] > 0
              )
            ) ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={cellDiffData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    dataKey="CTIME"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={(value) => {
                      const date = new Date(safeNumber(value) * 1000);
                      return date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    label={{
                      value: "mV",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "#94a3b8" },
                    }}
                  />
                  <Tooltip content={<ScooterTooltip />} />

                  {/* Create separate Area for each BMS */}
                  {uniqueBMSIds.map((bmsId) => (
                    <Area
                      key={bmsId}
                      type="monotone"
                      dataKey={`cellDiff_${bmsId}`}
                      stackId="cellDiff"
                      stroke={bmsColors[bmsId]}
                      fill={bmsColors[bmsId]}
                      fillOpacity={0.6}
                      name={`${bmsId} Cell Diff (mV)`}
                      connectNulls={false}
                    />
                  ))}

                  <ReferenceLine
                    y={300}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    label={{
                      value: "Warning (300mV)",
                      position: "topRight",
                      fontSize: 10,
                      fill: "#f59e0b",
                    }}
                  />
                  <ReferenceLine
                    y={500}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    label={{
                      value: "Critical (500mV)",
                      position: "topRight",
                      fontSize: 10,
                      fill: "#ef4444",
                    }}
                  />

                  {/* Swap event markers */}
                  {batterySwaps.map((swap, idx) => (
                    <ReferenceLine
                      key={idx}
                      x={safeNumber(swap.timestamp)}
                      stroke="#a855f7"
                      strokeDasharray="1 1"
                      strokeWidth={1}
                      opacity={0.5}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-80">
                <div className="text-center text-slate-400">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg mb-1">
                    No Cell Imbalance Data Available
                  </p>
                  <p className="text-sm text-slate-500">
                    BATCELLDIFFMAX values may not be present in the telemetry
                    data
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    This could indicate: Missing BMS sensor data, or all cells
                    are perfectly balanced
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Current Flow Analysis */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-green-400" />
              Battery Current by BMS
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="CTIME"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(value) => {
                    const date = new Date(safeNumber(value) * 1000);
                    return date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  label={{
                    value: "A",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#94a3b8" },
                  }}
                />
                <Tooltip content={<ScooterTooltip />} />

                {/* Create separate Area for each BMS */}
                {uniqueBMSIds.map((bmsId) => (
                  <Area
                    key={bmsId}
                    type="monotone"
                    dataKey={`current_${bmsId}`}
                    stackId="current"
                    stroke={bmsColors[bmsId]}
                    fill={bmsColors[bmsId]}
                    fillOpacity={0.6}
                    name={`${bmsId} Current (A)`}
                    connectNulls={false}
                  />
                ))}

                <ReferenceLine
                  y={0}
                  stroke="#64748b"
                  strokeDasharray="2 2"
                  label={{
                    value: "Zero Current",
                    position: "topLeft",
                    fontSize: 10,
                    fill: "#64748b",
                  }}
                />
                <ReferenceLine
                  y={-25}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{
                    value: "High Discharge (-25A)",
                    position: "topRight",
                    fontSize: 10,
                    fill: "#ef4444",
                  }}
                />
                <ReferenceLine
                  y={25}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  label={{
                    value: "Fast Charge (+25A)",
                    position: "topRight",
                    fontSize: 10,
                    fill: "#10b981",
                  }}
                />

                {/* Swap event markers */}
                {batterySwaps.map((swap, idx) => (
                  <ReferenceLine
                    key={idx}
                    x={safeNumber(swap.timestamp)}
                    stroke="#a855f7"
                    strokeDasharray="1 1"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Battery Sessions Performance Table */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Battery Session Analysis
            </h3>
            <div className="overflow-x-auto">
              <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-slate-300 font-medium">
                        Battery ID
                      </th>
                      <th className="text-right p-3 text-slate-300 font-medium">
                        Duration
                      </th>
                      <th className="text-right p-3 text-slate-300 font-medium">
                        SOH
                      </th>
                      <th className="text-right p-3 text-slate-300 font-medium">
                        Max Temp
                      </th>
                      <th className="text-right p-3 text-slate-300 font-medium">
                        Errors
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {batterySessions.slice(0, 20).map((session, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: bmsColors[session.BMSID],
                              }}
                            ></div>
                            <span className="font-mono text-blue-400 text-xs">
                              {session.BMSID}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right text-slate-300">
                          {safeNumber(session.DURATION).toFixed(1)}h
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`font-semibold ${
                              safeNumber(session.AVGSOH) > 90
                                ? "text-green-400"
                                : safeNumber(session.AVGSOH) > 80
                                ? "text-blue-400"
                                : safeNumber(session.AVGSOH) > 70
                                ? "text-yellow-400"
                                : "text-red-400"
                            }`}
                          >
                            {safeNumber(session.AVGSOH).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`${
                              safeNumber(session.MAXTEMP) > 60
                                ? "text-red-400"
                                : safeNumber(session.MAXTEMP) > 45
                                ? "text-yellow-400"
                                : "text-slate-300"
                            }`}
                          >
                            {safeNumber(session.MAXTEMP).toFixed(1)}°C
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`${
                              safeNumber(session.ERROREVENTS) > 0
                                ? "text-red-400 font-semibold"
                                : "text-green-400"
                            }`}
                          >
                            {safeNumber(session.ERROREVENTS)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {batterySessions.length > 20 && (
                  <div className="text-center text-slate-400 text-xs py-2">
                    Showing first 20 of {batterySessions.length} sessions
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Battery Swap Events */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              Recent Battery Swap Events
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto h-full">
              {batterySwaps.length > 0 ? (
                batterySwaps
                  .slice(-10)
                  .reverse()
                  .map((swap, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-purple-900/20 border border-purple-800/50 rounded-lg hover:bg-purple-900/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-purple-300">
                          {new Date(
                            safeNumber(swap.TIMESTAMP) * 1000
                          ).toLocaleString()}
                        </div>
                        <div
                          className={`text-sm px-2 py-1 rounded font-medium ${
                            safeNumber(swap.CHARGECHANGE) > 0
                              ? "bg-green-900/50 text-green-400"
                              : "bg-red-900/50 text-red-400"
                          }`}
                        >
                          {safeNumber(swap.CHARGECHANGE) > 0 ? "+" : ""}
                          {safeNumber(swap.CHARGECHANGE).toFixed(1)}%
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: bmsColors[swap.OLDBMSID],
                            }}
                          ></div>
                          <span className="text-slate-400 font-mono text-xs">
                            {swap.OLDBMSID}
                          </span>
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: bmsColors[swap.NEWBMSID],
                            }}
                          ></div>
                          <span className="text-blue-400 font-mono text-xs">
                            {swap.NEWBMSID}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">
                            SOH: {safeNumber(swap.OLDSOH).toFixed(1)}% →{" "}
                            {safeNumber(swap.NEWSOH).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-400 py-8">
                    <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No battery swaps detected in current timeframe</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try extending the time range or checking filters
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Status */}
        <div className="text-center text-slate-500 text-sm py-4 border-t border-slate-800">
          <div className="flex justify-center items-center gap-6 text-xs">
            <span>Scooter: {selectedTboxId}</span>
            <span>•</span>
            <span>Data Points: {batteryData.length}</span>
            <span>•</span>
            <span>Time Range: {filters.timeRange}h</span>
            <span>•</span>
            <span>
              Batteries Tracked: {safeNumber(diagnostics?.totalBatteries)}
            </span>
            {diagnostics && (
              <>
                <span>•</span>
                <span
                  className={`px-2 py-1 rounded ${
                    diagnostics.overallHealth === "Excellent"
                      ? "bg-green-900/50 text-green-400"
                      : diagnostics.overallHealth === "Good"
                      ? "bg-blue-900/50 text-blue-400"
                      : diagnostics.overallHealth === "Fair"
                      ? "bg-yellow-900/50 text-yellow-400"
                      : "bg-red-900/50 text-red-400"
                  }`}
                >
                  {diagnostics.overallHealth.toUpperCase()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatteryHistory;
