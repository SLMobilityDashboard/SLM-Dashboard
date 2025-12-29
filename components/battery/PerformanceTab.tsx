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
  Truck,
} from "lucide-react";

// Import the optimized hook and types
import useBatteryDataByBMS, {
  TboxData,
  BatteryFilters,
} from "@/hooks/useBatteryDataByBMS";

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

// Function to create continuous data with smooth vehicle swap transitions
const createContinuousData = (data: TboxData[]): ProcessedDataPoint[] => {
  if (data.length === 0) return [];

  const processedData: ProcessedDataPoint[] = [];
  const swapPoints: number[] = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i].TBOXID !== data[i - 1].TBOXID) {
      swapPoints.push(i);
    }
  }

  for (let i = 0; i < data.length; i++) {
    const currentPoint = { ...data[i] } as ProcessedDataPoint;
    const isSwapPoint = swapPoints.includes(i);

    if (isSwapPoint && i > 0) {
      const prevPoint = data[i - 1];
      const currentVehiclePoint = data[i];

      currentPoint.continuousTemp =
        (safeNumber(prevPoint.BATTEMP) +
          safeNumber(currentVehiclePoint.BATTEMP)) /
        2;
      currentPoint.continuousVoltage =
        (safeNumber(prevPoint.BATVOLT) +
          safeNumber(currentVehiclePoint.BATVOLT)) /
        2;
      currentPoint.continuousCurrent =
        (safeNumber(prevPoint.BATCURRENT) +
          safeNumber(currentVehiclePoint.BATCURRENT)) /
        2;
      currentPoint.continuousCellDiff =
        (safeNumber(prevPoint.BATCELLDIFFMAX) +
          safeNumber(currentVehiclePoint.BATCELLDIFFMAX)) /
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

// Function to create TBox-segmented data for area charts
const createTBoxSegmentedData = (
  data: ProcessedDataPoint[],
  metric: string
) => {
  if (!data.length) return [];

  const uniqueTBoxIds = [...new Set(data.map((d) => d.TBOXID))];
  const segmentedData = [];

  for (let i = 0; i < data.length; i++) {
    const dataPoint = { ...data[i] };

    uniqueTBoxIds.forEach((tboxId) => {
      const key = `${metric}_${tboxId}`;
      if (data[i].TBOXID === tboxId) {
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
const BatteryTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ProcessedDataPoint;

    return (
      <div className="rounded-lg border border-slate-700 shadow-xl bg-slate-900 p-4 max-w-xs">
        <div className="text-sm font-medium text-slate-200 mb-2">
          {new Date(safeNumber(data.CTIME) * 1000).toLocaleString()}
        </div>
        <div className="text-xs text-slate-300 mb-2 flex items-center gap-2 flex-wrap">
          <span className="text-green-400 font-mono flex items-center gap-1">
            <Truck className="w-3 h-3" />
            {data.TBOXID}
          </span>
          {data.swapTransition && (
            <>
              <span>|</span>
              <span className="text-purple-400 font-semibold">
                VEHICLE SWAP
              </span>
            </>
          )}
          <span>|</span>
          <span className="text-blue-400">
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

const BatteryHistoryByBattery: React.FC<{ BMSID: string }> = ({ BMSID }) => {
  const [selectedBmsId, setSelectedBmsId] = useState<string>(BMSID || "");
  const [inputBmsId, setInputBmsId] = useState<string>("");
  const [filters, setFilters] = useState<BatteryFilters>({
    timeRange: 168, // 7 days default
    includeIdleData: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Use the optimized hook for battery-centered data
  const {
    batteryData,
    vehicleSwaps,
    vehicleSessions,
    diagnostics,
    loading,
    error,
    debugInfo,
    refetch,
  } = useBatteryDataByBMS(selectedBmsId, filters);

  // Process the data for continuous charts
  const processedData = useMemo(() => {
    return createContinuousData(batteryData);
  }, [batteryData]);

  // Color mapping for different TBox IDs
  const tboxColors = useMemo(() => {
    const uniqueTboxIds = [...new Set(batteryData.map((d) => d.TBOXID))];
    const colors = [
      "#10b981", // green
      "#3b82f6", // blue
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // purple
      "#06b6d4", // cyan
      "#84cc16", // lime
      "#f97316", // orange
      "#ec4899", // pink
      "#6366f1", // indigo
    ];
    return uniqueTboxIds.reduce((acc, tboxId, index) => {
      acc[tboxId] = colors[index % colors.length];
      return acc;
    }, {} as Record<string, string>);
  }, [batteryData]);

  // Create segmented data for each metric
  const temperatureData = useMemo(
    () => createTBoxSegmentedData(processedData, "temp"),
    [processedData]
  );
  const voltageData = useMemo(
    () => createTBoxSegmentedData(processedData, "voltage"),
    [processedData]
  );
  const currentData = useMemo(
    () => createTBoxSegmentedData(processedData, "current"),
    [processedData]
  );
  const cellDiffData = useMemo(() => {
    const data = createTBoxSegmentedData(processedData, "cellDiff");
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

  const uniqueTBoxIds = [...new Set(batteryData.map((d) => d.TBOXID))];

  // Handle BMS ID submission
  const handleBmsSubmit = () => {
    if (inputBmsId.trim()) {
      setSelectedBmsId(inputBmsId.trim());
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
            Loading battery usage history...
          </p>
          <p className="text-slate-500 text-sm">
            Analyzing data for battery {selectedBmsId}
          </p>
          {debugInfo && (
            <div className="mt-4 text-xs text-slate-500 space-y-1">
              <p>Telemetry Records: {safeNumber(debugInfo.telemetryCount)}</p>
              <p>
                Vehicle Swaps: {safeNumber(debugInfo.consolidatedSwapCount)}
              </p>
              <p>Vehicle Sessions: {safeNumber(debugInfo.sessionCount)}</p>
              <p>Unique Vehicles: {safeNumber(debugInfo.uniqueVehicles)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error && selectedBmsId) {
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
              onClick={() => setSelectedBmsId("")}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Change Battery ID
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

  // No BMS ID selected state
  if (!selectedBmsId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Battery className="w-20 h-20 mx-auto mb-6 text-purple-400" />
          <h2 className="text-2xl font-semibold text-slate-200 mb-4">
            Battery Usage History
          </h2>
          <p className="text-slate-400 mb-6">
            Enter a Battery ID (BMS ID) to analyze which vehicles used this
            battery
          </p>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter Battery ID (e.g., BMS_001, BAT_12345)"
              value={inputBmsId}
              onChange={(e) => setInputBmsId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleBmsSubmit();
                }
              }}
            />
            <button
              onClick={handleBmsSubmit}
              disabled={!inputBmsId.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              Load Battery History
            </button>
          </div>
          <div className="mt-8 text-xs text-slate-500">
            <p>• Track vehicle usage history</p>
            <p>• Vehicle swap detection</p>
            <p>• Multi-vehicle session tracking</p>
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
              No telemetry data found for battery:{" "}
              <span className="font-mono text-yellow-400">{selectedBmsId}</span>
            </p>
            <div className="text-sm text-slate-400 space-y-1">
              <p>Time Range: {filters.timeRange} hours</p>
              <p>Include Idle Data: {filters.includeIdleData ? "Yes" : "No"}</p>
              {debugInfo && <p>Database Query: Executed successfully</p>}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSelectedBmsId("")}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Change Battery ID
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
              Battery Usage History
            </h1>

            <div className="mt-2 space-y-1">
              <p className="text-slate-400">
                Battery:{" "}
                <span className="font-mono text-blue-400">{selectedBmsId}</span>{" "}
                | Vehicle usage tracking & performance analysis
              </p>

              {debugInfo && (
                <div className="text-xs text-slate-500 flex items-center gap-4">
                  <span>
                    {safeNumber(debugInfo.telemetryCount)} data points
                  </span>
                  <span>•</span>
                  <span>
                    {safeNumber(debugInfo.uniqueVehicles)} unique vehicles
                  </span>
                  <span>•</span>
                  <span>{vehicleSwaps.length} vehicle swaps detected</span>
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

        {/* Quick Status Overview */}
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
                Battery Health: {diagnostics.overallHealth}
              </h2>
              <div className="text-sm text-slate-400">
                {safeNumber(diagnostics.totalVehicles)} vehicles used |{" "}
                {safeNumber(diagnostics.totalSwaps)} vehicle swaps
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {safeNumber(diagnostics.totalVehicles)}
                </div>
                <div className="text-slate-400 text-sm">Unique Vehicles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {safeNumber(diagnostics.totalSwaps)}
                </div>
                <div className="text-slate-400 text-sm">Vehicle Swaps</div>
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

        {/* Battery Usage Timeline by Vehicle */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Battery Usage Timeline by Vehicle
          </h3>

          {/* Vehicle Legend */}
          <div className="flex flex-wrap gap-3 mb-4 p-3 bg-slate-800/50 rounded-lg">
            {Object.entries(tboxColors).map(([tboxId, color]) => (
              <div key={tboxId} className="flex items-center gap-2">
                <Truck className="w-4 h-4" style={{ color }} />
                <span className="text-sm text-slate-300 font-mono">
                  TBox {tboxId}
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
              <Tooltip content={<BatteryTooltip />} />

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

              {/* Vehicle indicator line at the bottom */}
              {uniqueTBoxIds.map((tboxId) => (
                <Line
                  key={`indicator_${tboxId}`}
                  yAxisId="percent"
                  type="stepAfter"
                  dataKey={(data: ProcessedDataPoint) =>
                    data.TBOXID === tboxId ? -5 : null
                  }
                  stroke={tboxColors[tboxId]}
                  strokeWidth={6}
                  dot={false}
                  connectNulls={false}
                  name={`TBox ${tboxId} Active`}
                />
              ))}

              {vehicleSwaps.map((swap, idx) => (
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
          {/* Temperature Analysis by Vehicle */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-orange-400" />
              Battery Temperature by Vehicle
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
                <Tooltip content={<BatteryTooltip />} />

                {/* Create separate Area for each Vehicle */}
                {uniqueTBoxIds.map((tboxId) => (
                  <Area
                    key={tboxId}
                    type="monotone"
                    dataKey={`temp_${tboxId}`}
                    stackId="temp"
                    stroke={tboxColors[tboxId]}
                    fill={tboxColors[tboxId]}
                    fillOpacity={0.6}
                    name={`TBox ${tboxId} Temp (°C)`}
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
                {vehicleSwaps.map((swap, idx) => (
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

          {/* Voltage Analysis by Vehicle */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              Battery Voltage by Vehicle
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
                <Tooltip content={<BatteryTooltip />} />

                {/* Create separate Area for each Vehicle */}
                {uniqueTBoxIds.map((tboxId) => (
                  <Area
                    key={tboxId}
                    type="monotone"
                    dataKey={`voltage_${tboxId}`}
                    stackId="voltage"
                    stroke={tboxColors[tboxId]}
                    fill={tboxColors[tboxId]}
                    fillOpacity={0.6}
                    name={`TBox ${tboxId} Voltage (V)`}
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
                {vehicleSwaps.map((swap, idx) => (
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

          {/* Cell Imbalance Analysis by Vehicle */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Cell Imbalance by Vehicle
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
                  <Tooltip content={<BatteryTooltip />} />

                  {/* Create separate Area for each Vehicle */}
                  {uniqueTBoxIds.map((tboxId) => (
                    <Area
                      key={tboxId}
                      type="monotone"
                      dataKey={`cellDiff_${tboxId}`}
                      stackId="cellDiff"
                      stroke={tboxColors[tboxId]}
                      fill={tboxColors[tboxId]}
                      fillOpacity={0.6}
                      name={`TBox ${tboxId} Cell Diff (mV)`}
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
                  {vehicleSwaps.map((swap, idx) => (
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
                </div>
              </div>
            )}
          </div>

          {/* Current Flow Analysis by Vehicle */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-green-400" />
              Battery Current by Vehicle
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
                <Tooltip content={<BatteryTooltip />} />

                {/* Create separate Area for each Vehicle */}
                {uniqueTBoxIds.map((tboxId) => (
                  <Area
                    key={tboxId}
                    type="monotone"
                    dataKey={`current_${tboxId}`}
                    stackId="current"
                    stroke={tboxColors[tboxId]}
                    fill={tboxColors[tboxId]}
                    fillOpacity={0.6}
                    name={`TBox ${tboxId} Current (A)`}
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
                {vehicleSwaps.map((swap, idx) => (
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
          {/* Vehicle Session Performance Table */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Vehicle Session Analysis
            </h3>
            <div className="overflow-x-auto">
              <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-slate-300 font-medium">
                        Vehicle ID
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
                    {vehicleSessions.slice(0, 20).map((session, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Truck
                              className="w-3 h-3"
                              style={{ color: tboxColors[session.TBOXID] }}
                            />
                            <span className="font-mono text-green-400 text-xs">
                              TBox {session.TBOXID}
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
                {vehicleSessions.length > 20 && (
                  <div className="text-center text-slate-400 text-xs py-2">
                    Showing first 20 of {vehicleSessions.length} sessions
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Swap Events */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              Recent Vehicle Swap Events
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto h-full">
              {vehicleSwaps.length > 0 ? (
                vehicleSwaps
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
                          <Truck
                            className="w-3 h-3"
                            style={{ color: tboxColors[swap.OLDTBOXID] }}
                          />
                          <span className="text-slate-400 font-mono text-xs">
                            TBox {swap.OLDTBOXID}
                          </span>
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                          <Truck
                            className="w-3 h-3"
                            style={{ color: tboxColors[swap.NEWTBOXID] }}
                          />
                          <span className="text-green-400 font-mono text-xs">
                            TBox {swap.NEWTBOXID}
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
                    <p>No vehicle swaps detected in current timeframe</p>
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
            <span>Battery: {selectedBmsId}</span>
            <span>•</span>
            <span>Data Points: {batteryData.length}</span>
            <span>•</span>
            <span>Time Range: {filters.timeRange}h</span>
            <span>•</span>
            <span>Vehicles Used: {safeNumber(diagnostics?.totalVehicles)}</span>
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

export default BatteryHistoryByBattery;
