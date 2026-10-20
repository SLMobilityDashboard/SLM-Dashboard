import React, { useState, useMemo } from "react";
import {
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
  AlertTriangle,
  XCircle,
  Activity,
  Gauge,
  RefreshCw,
  ArrowUpDown,
  Target,
  FileText,
  Loader2,
  Filter,
  Calendar,
  X,
} from "lucide-react";

import useBatteryData, {
  TboxData,
  BatteryFilters,
} from "@/hooks/useChargeData";

interface ProcessedDataPoint extends TboxData {
  swapTransition?: boolean;
}

const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/* -------------------------------------------------------------------------- */
/*  Data helpers                                                              */
/* -------------------------------------------------------------------------- */

// Marks the first reading of each new battery. Values are the REAL readings
// (no averaging between the old and new battery).
const markSwapPoints = (data: TboxData[]): ProcessedDataPoint[] => {
  return data.map((d, i) => ({
    ...d,
    swapTransition: i > 0 && d.BMS_ID !== data[i - 1].BMS_ID,
  }));
};

// Render-time decimation. The full data stays in state (stats, counts and
// exports are untouched); this only limits what recharts has to draw.
// Per bucket it keeps the first row, last row, and the rows holding the MIN
// and MAX of the charted value, so spikes and dips are always drawn. It also
// always keeps battery changes and the onset of every error.
const decimate = (
  data: ProcessedDataPoint[],
  valueOf: (d: ProcessedDataPoint) => number,
  buckets: number = 800
): ProcessedDataPoint[] => {
  if (data.length <= buckets * 4) return data;

  const size = Math.ceil(data.length / buckets);
  const keep = new Set<number>();

  for (let start = 0; start < data.length; start += size) {
    const end = Math.min(start + size, data.length);
    let minI = start;
    let maxI = start;
    let minV = Infinity;
    let maxV = -Infinity;

    for (let i = start; i < end; i++) {
      const v = valueOf(data[i]);
      if (v < minV) {
        minV = v;
        minI = i;
      }
      if (v > maxV) {
        maxV = v;
        maxI = i;
      }

      if (i > 0 && data[i].BMS_ID !== data[i - 1].BMS_ID) {
        keep.add(i - 1);
        keep.add(i);
      }
      if (
        data[i].BATTERY_ERROR &&
        data[i].BATTERY_ERROR !== (i > 0 ? data[i - 1].BATTERY_ERROR : "")
      ) {
        keep.add(i);
      }
    }

    keep.add(start);
    keep.add(end - 1);
    keep.add(minI);
    keep.add(maxI);
  }

  return Array.from(keep)
    .sort((a, b) => a - b)
    .map((i) => data[i]);
};

type Metric = "temp" | "voltage" | "current" | "cellDiff";

const METRIC_VALUE: Record<Metric, (d: TboxData) => number> = {
  temp: (d) => safeNumber(d.BATTEMP),
  voltage: (d) => safeNumber(d.BATVOLT),
  current: (d) => safeNumber(d.BATCURRENT),
  cellDiff: (d) => safeNumber(d.BATCELLDIFFMAX),
};

// One series key per battery, null where that battery isn't the active one
const segmentByBms = (
  data: ProcessedDataPoint[],
  metric: Metric,
  bmsIds: string[]
) =>
  data.map((d) => {
    const row: Record<string, any> = { ...d };
    for (const id of bmsIds) {
      row[`${metric}_${id}`] = d.BMS_ID === id ? METRIC_VALUE[metric](d) : null;
    }
    return row;
  });

const makeTickFormatter = (spanDays: number) => (value: number) => {
  const date = new Date(safeNumber(value) * 1000);
  return spanDays <= 2
    ? date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/* -------------------------------------------------------------------------- */
/*  Tooltip                                                                   */
/* -------------------------------------------------------------------------- */

const ScooterTooltip: React.FC<any> = ({ active, payload }) => {
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
              entry.value !== null &&
              entry.value !== undefined && (
                <div key={index} className="flex justify-between gap-3">
                  <span style={{ color: entry.color }}>{entry.name}:</span>
                  <span className="font-medium text-slate-200">
                    {typeof entry.value === "number"
                      ? entry.value.toFixed(2)
                      : entry.value}
                  </span>
                </div>
              )
          )}
          {data.BATTERY_ERROR && (
            <div className="text-red-400 mt-1">Error: {data.BATTERY_ERROR}</div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

/* -------------------------------------------------------------------------- */
/*  Reusable per-BMS metric chart                                             */
/* -------------------------------------------------------------------------- */

interface RefLineDef {
  y: number;
  color: string;
  label: string;
}

const MetricChart: React.FC<{
  title: string;
  icon: React.ReactNode;
  metric: Metric;
  data: ProcessedDataPoint[];
  bmsIds: string[];
  bmsColors: Record<string, string>;
  swaps: { TIMESTAMP: number }[];
  yLabel: string;
  yDomain?: [number, number];
  refLines: RefLineDef[];
  seriesLabel: string;
  tickFormatter: (v: number) => string;
  emptyMessage?: React.ReactNode;
  hasData?: boolean;
}> = ({
  title,
  icon,
  metric,
  data,
  bmsIds,
  bmsColors,
  swaps,
  yLabel,
  yDomain,
  refLines,
  seriesLabel,
  tickFormatter,
  emptyMessage,
  hasData = true,
}) => {
  const chartData = useMemo(
    () => segmentByBms(decimate(data, METRIC_VALUE[metric]), metric, bmsIds),
    [data, metric, bmsIds]
  );

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis
              type="number"
              dataKey="CTIME"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              tickFormatter={tickFormatter}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              domain={yDomain}
              label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                style: { fill: "#94a3b8" },
              }}
            />
            <Tooltip content={<ScooterTooltip />} />

            {bmsIds.map((bmsId) => (
              <Area
                key={bmsId}
                type="monotone"
                dataKey={`${metric}_${bmsId}`}
                stroke={bmsColors[bmsId]}
                fill={bmsColors[bmsId]}
                fillOpacity={0.4}
                name={`${bmsId} ${seriesLabel}`}
                connectNulls={false}
                dot={false}
                isAnimationActive={false}
              />
            ))}

            {refLines.map((r) => (
              <ReferenceLine
                key={r.label}
                y={r.y}
                stroke={r.color}
                strokeDasharray="5 5"
                label={{
                  value: r.label,
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: r.color,
                }}
              />
            ))}

            {swaps.map((swap, idx) => (
              <ReferenceLine
                key={idx}
                x={safeNumber(swap.TIMESTAMP)}
                stroke="#a855f7"
                strokeDasharray="1 1"
                strokeWidth={1}
                opacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-80">{emptyMessage}</div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Filters panel (unchanged)                                                 */
/* -------------------------------------------------------------------------- */

const FiltersPanel: React.FC<{
  filters: BatteryFilters;
  onFiltersChange: (filters: BatteryFilters) => void;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ filters, onFiltersChange, isOpen, onToggle }) => {
  const getDefaultEndDate = () => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  };

  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0];
  };

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
      timeRange: 48,
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

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

const BMS_PALETTE = [
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#84cc16",
  "#f97316",
];

const BatteryHistory: React.FC<{ IMEI: string }> = ({ IMEI }) => {
  const [selectedTboxId, setSelectedTboxId] = useState<string>(IMEI || "");
  const [inputTboxId, setInputTboxId] = useState<string>("");
  const [filters, setFilters] = useState<BatteryFilters>({
    timeRange: 168,
    includeIdleData: false,
  });
  const [showFilters, setShowFilters] = useState(false);

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

  // Full-resolution data with swap markers (charts decimate this themselves)
  const processedData = useMemo(() => markSwapPoints(batteryData), [batteryData]);

  const uniqueBMSIds = useMemo(
    () => [...new Set(batteryData.map((d) => d.BMS_ID))],
    [batteryData]
  );

  const bmsColors = useMemo(() => {
    return uniqueBMSIds.reduce((acc, bmsId, index) => {
      acc[bmsId] = BMS_PALETTE[index % BMS_PALETTE.length];
      return acc;
    }, {} as Record<string, string>);
  }, [uniqueBMSIds]);

  // Data for the main timeline chart (decimated for drawing only)
  const timelineData = useMemo(
    () => decimate(processedData, (d) => safeNumber(d.BATPERCENT)),
    [processedData]
  );

  const spanDays = useMemo(() => {
    if (batteryData.length < 2) return 1;
    const first = safeNumber(batteryData[0].CTIME);
    const last = safeNumber(batteryData[batteryData.length - 1].CTIME);
    return (last - first) / 86400;
  }, [batteryData]);
  const tickFormatter = useMemo(() => makeTickFormatter(spanDays), [spanDays]);

  const hasCellDiffData = useMemo(
    () => batteryData.some((d) => safeNumber(d.BATCELLDIFFMAX) > 0),
    [batteryData]
  );

  const handleTboxSubmit = () => {
    if (inputTboxId.trim()) {
      setSelectedTboxId(inputTboxId.trim());
      setShowFilters(false);
    }
  };

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
        </div>
      </div>
    );
  }

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
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTboxSubmit();
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

  const chartCommon = {
    data: processedData,
    bmsIds: uniqueBMSIds,
    bmsColors,
    swaps: batterySwaps,
    tickFormatter,
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
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
                    {safeNumber(debugInfo.telemetryCount).toLocaleString()} data
                    points
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
            <ComposedChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                type="number"
                dataKey="CTIME"
                domain={["dataMin", "dataMax"]}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={tickFormatter}
              />
              <YAxis
                yAxisId="percent"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                domain={[-10, 100]}
                allowDataOverflow
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
                dataKey={(data: ProcessedDataPoint) => safeNumber(data.BATPERCENT)}
                fill="#10b981"
                fillOpacity={0.3}
                stroke="#10b981"
                strokeWidth={2}
                name="Charge Level (%)"
                isAnimationActive={false}
              />

              <Line
                yAxisId="soh"
                type="monotone"
                dataKey={(data: ProcessedDataPoint) => safeNumber(data.BATSOH)}
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={false}
                name="Battery Health (%)"
                isAnimationActive={false}
              />

              {/* Active-battery indicator along the bottom */}
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
                  isAnimationActive={false}
                />
              ))}

              {batterySwaps.map((swap, idx) => (
                <ReferenceLine
                  key={idx}
                  yAxisId="percent"
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

        {/* Analytics grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricChart
            {...chartCommon}
            title="Battery Temperature by BMS"
            icon={<Thermometer className="w-5 h-5 text-orange-400" />}
            metric="temp"
            yLabel="°C"
            seriesLabel="Temp (°C)"
            refLines={[
              { y: 45, color: "#f59e0b", label: "Warning (45°C)" },
              { y: 65, color: "#ef4444", label: "Critical (65°C)" },
            ]}
          />

          <MetricChart
            {...chartCommon}
            title="Battery Voltage by BMS"
            icon={<Zap className="w-5 h-5 text-blue-400" />}
            metric="voltage"
            yLabel="V"
            yDomain={[42, 56]}
            seriesLabel="Voltage (V)"
            refLines={[
              { y: 44, color: "#ef4444", label: "Min Safe (44V)" },
              { y: 52, color: "#10b981", label: "Nominal (52V)" },
            ]}
          />

          <MetricChart
            {...chartCommon}
            title="Cell Imbalance by BMS"
            icon={<Activity className="w-5 h-5 text-cyan-400" />}
            metric="cellDiff"
            yLabel="mV"
            seriesLabel="Cell Diff (mV)"
            hasData={hasCellDiffData}
            refLines={[
              { y: 300, color: "#f59e0b", label: "Warning (300mV)" },
              { y: 500, color: "#ef4444", label: "Critical (500mV)" },
            ]}
            emptyMessage={
              <div className="text-center text-slate-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg mb-1">No Cell Imbalance Data Available</p>
                <p className="text-sm text-slate-500">
                  BATCELLDIFFMAX values may not be present in the telemetry data
                </p>
              </div>
            }
          />

          <MetricChart
            {...chartCommon}
            title="Battery Current by BMS"
            icon={<Gauge className="w-5 h-5 text-green-400" />}
            metric="current"
            yLabel="A"
            seriesLabel="Current (A)"
            refLines={[
              { y: 0, color: "#64748b", label: "Zero Current" },
              { y: -25, color: "#ef4444", label: "High Discharge (-25A)" },
              { y: 25, color: "#10b981", label: "Fast Charge (+25A)" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sessions */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Battery Session Analysis
            </h3>
            <div className="overflow-x-auto">
              <div className="max-h-96 overflow-y-auto">
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
                            className={
                              safeNumber(session.MAXTEMP) > 60
                                ? "text-red-400"
                                : safeNumber(session.MAXTEMP) > 45
                                ? "text-yellow-400"
                                : "text-slate-300"
                            }
                          >
                            {safeNumber(session.MAXTEMP).toFixed(1)}°C
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={
                              safeNumber(session.ERROREVENTS) > 0
                                ? "text-red-400 font-semibold"
                                : "text-green-400"
                            }
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

          {/* Swap events */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              Recent Battery Swap Events
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto h-full">
              {batterySwaps.length > 0 ? (
                // batterySwaps is already newest-first
                batterySwaps.slice(0, 10).map((swap, idx) => (
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
                          style={{ backgroundColor: bmsColors[swap.OLDBMSID] }}
                        ></div>
                        <span className="text-slate-400 font-mono text-xs">
                          {swap.OLDBMSID}
                        </span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: bmsColors[swap.NEWBMSID] }}
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

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm py-4 border-t border-slate-800">
          <div className="flex justify-center items-center gap-6 text-xs flex-wrap">
            <span>Scooter: {selectedTboxId}</span>
            <span>•</span>
            <span>Data Points: {batteryData.length.toLocaleString()}</span>
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
          <p className="text-slate-600 text-xs mt-2">
            Charts draw each period's first, last, minimum and maximum readings
            (plus swaps and error onsets), so peaks are never hidden. All
            statistics use every row.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BatteryHistory;