import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
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
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

// Import the optimized hook and types
import useBatteryData, {
  TboxData,
  BatteryFilters,
} from "@/hooks/useBatteryData";
import useHomeCharging from "@/hooks/useHomeCharging";

interface ProcessedDataPoint extends TboxData {
  continuousTemp?: number;
  continuousVoltage?: number;
  continuousCurrent?: number;
  continuousCellDiff?: number;
  swapTransition?: boolean;
}

// ─── Illegal charge event type (passed in from parent) ───────────────────────
export interface IllegalChargeEvent {
  timestamp: string;
  beforePct: number;
  afterPct: number;
  diff: number;
}

interface BatteryHistoryProps {
  IMEI: string;
  filters: BatteryFilters;
  illegalChargeEvents?: IllegalChargeEvent[];
}

// Helper function to safely convert values to numbers
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

// Convert event timestamp → Unix epoch seconds
const toEpochSec = (ts: string): number => {
  if (!ts) return 0;
  const n = Number(ts);
  if (!isNaN(n) && n > 1_000_000_000) return n;
  return Math.floor(new Date(ts).getTime() / 1000);
};

// Severity colour lookup
const getFraudColor = (diff: number) => {
  if (diff >= 30) return { stroke: "#ef4444", fill: "#ef444418" };
  if (diff >= 15) return { stroke: "#f59e0b", fill: "#f59e0b18" };
  return { stroke: "#38bdf8", fill: "#38bdf818" };
};

const getFraudLabel = (diff: number) =>
  diff >= 30 ? "Critical" : diff >= 15 ? "Warning" : "Suspicious";

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

const BatteryHistory: React.FC<BatteryHistoryProps> = ({
  IMEI,
  filters,
  illegalChargeEvents = [],
}) => {
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
  } = useHomeCharging(IMEI, filters);

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
    }
    return data;
  }, [processedData]);

  const uniqueBMSIds = [...new Set(batteryData.map((d) => d.BMS_ID))];

  // ── THE FIX: snap each fraud event's timestamp to the nearest real CTIME
  // in the dataset. Recharts ReferenceArea/ReferenceLine on a numeric X axis
  // only renders when x / x1 / x2 fall within the actual data domain — if the
  // fraud timestamp doesn't land on an existing data point it is silently
  // skipped. Snapping guarantees the marker always renders.
  const fraudEpochs = useMemo(() => {
    if (!illegalChargeEvents.length || !processedData.length) return [];

    const ctimes = processedData.map((d) => safeNumber(d.CTIME));
    const dataMin = Math.min(...ctimes);
    const dataMax = Math.max(...ctimes);

    return illegalChargeEvents.map((e) => {
      const epochSec = toEpochSec(e.timestamp);

      // Find the closest real CTIME to the fraud event timestamp
      const snappedCtime = ctimes.reduce((prev, curr) =>
        Math.abs(curr - epochSec) < Math.abs(prev - epochSec) ? curr : prev
      );

      console.log(
        "[FraudMarker] ts:", e.timestamp,
        "→ epochSec:", epochSec,
        "→ snappedCtime:", snappedCtime,
        "| dataRange:", dataMin, "–", dataMax,
        "| inRange:", epochSec >= dataMin && epochSec <= dataMax
      );

      return { ...e, epochSec, snappedCtime };
    });
  }, [illegalChargeEvents, processedData]);

  console.log("CTIME sample:", processedData[0]?.CTIME, processedData[1]?.CTIME);
  console.log("illegalChargeEvents raw:", illegalChargeEvents);
  console.log("fraudEpochs computed:", fraudEpochs);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-purple-400" />
          <p className="text-slate-300 text-lg mb-2">
            Loading battery diagnostics...
          </p>
          <p className="text-slate-500 text-sm">Analyzing data for {IMEI}</p>
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
  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-lg">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-semibold text-red-300 mb-4">
            Data Loading Error
          </h2>
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-slate-300 text-sm">{error}</p>
          </div>
          <button
            onClick={refetch}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data available
  if (batteryData.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-lg">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-xl font-semibold text-slate-200 mb-4">
            No Battery Data Found
          </h2>
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-6">
            <p className="text-slate-300 mb-2">
              No battery telemetry data found for:{" "}
              <span className="font-mono text-yellow-400">{IMEI}</span>
            </p>
            <div className="text-sm text-slate-400 space-y-1">
              <p>Time Range: {filters.timeRange} hours</p>
              <p>Include Idle Data: {filters.includeIdleData ? "Yes" : "No"}</p>
            </div>
          </div>
          <button
            onClick={refetch}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main dashboard view with data
  return (
    <div className="space-y-6">
      {/* Header with Debug Info */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Battery className="w-7 h-7 text-purple-400" />
            Battery Diagnostics
          </h2>
          {debugInfo && (
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-4">
              <span>{safeNumber(debugInfo.telemetryCount)} data points</span>
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
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Target className="w-6 h-6" />
              Overall Health: {diagnostics.overallHealth}
            </h3>
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

      {/* Illegal charge warning banner */}
      {fraudEpochs.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-300 mb-2">
                {fraudEpochs.length} Illegal Charge Event{fraudEpochs.length > 1 ? "s" : ""} Detected for This Vehicle
              </p>
              <div className="flex flex-wrap gap-2">
                {fraudEpochs.map((e, i) => {
                  const { stroke } = getFraudColor(e.diff);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700"
                    >
                      <TrendingUp className="w-3 h-3" style={{ color: stroke }} />
                      <span style={{ color: stroke }} className="font-bold">+{e.diff}%</span>
                      <span className="text-slate-400">{e.beforePct}% → {e.afterPct}%</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">
                        {new Date(e.epochSec * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{ background: stroke + "22", color: stroke, border: `1px solid ${stroke}55` }}
                      >
                        {getFraudLabel(e.diff)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Battery Usage Timeline */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Battery Usage Timeline
          </h3>

          {fraudEpochs.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5" />
              {fraudEpochs.length} illegal charge{fraudEpochs.length > 1 ? "s" : ""} marked
            </div>
          )}
        </div>

        {/* BMS Legend */}
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-slate-800/50 rounded-lg">
          {Object.entries(bmsColors).map(([bmsId, color]) => (
            <div key={bmsId} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              ></div>
              <span className="text-sm text-slate-300 font-mono">{bmsId}</span>
            </div>
          ))}
          {fraudEpochs.length > 0 && (
            <>
              <div className="w-px h-5 bg-slate-600 mx-1" />
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-sm bg-red-500/25 border border-red-500/60" />
                <span className="text-sm text-red-400">Illegal Charge</span>
              </div>
            </>
          )}
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

            {/* Shaded ±4h band — centred on snappedCtime so it always renders */}
            {fraudEpochs.map((e, i) => {
              const { fill } = getFraudColor(e.diff);
              const WINDOW = 3600 * 4;
              return (
                <ReferenceArea
                  key={`fraud-area-${i}`}
                  yAxisId="percent"
                  x1={e.snappedCtime - WINDOW}
                  x2={e.snappedCtime + WINDOW}
                  fill={fill}
                  strokeOpacity={0}
                />
              );
            })}

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
                yAxisId="percent"
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

            {/* Vertical dashed line — uses snappedCtime to guarantee render */}
            {fraudEpochs.map((e, i) => {
              const { stroke } = getFraudColor(e.diff);
              return (
                <ReferenceLine
                  key={`fraud-line-${i}`}
                  x={e.snappedCtime}
                  yAxisId="percent"
                  stroke={stroke}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  label={{
                    value: `⚠ +${e.diff}%`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fontWeight: 700,
                    fill: stroke,
                  }}
                />
              );
            })}
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

              {/* Fraud markers on temp chart — snappedCtime */}
              {fraudEpochs.map((e, i) => {
                const { stroke } = getFraudColor(e.diff);
                return (
                  <ReferenceLine
                    key={`fraud-temp-${i}`}
                    x={e.snappedCtime}
                    stroke={stroke}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={0.8}
                    label={{ value: "⚠", position: "top", fontSize: 10, fill: stroke }}
                  />
                );
              })}
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

              {/* Fraud markers on voltage chart — snappedCtime */}
              {fraudEpochs.map((e, i) => {
                const { stroke } = getFraudColor(e.diff);
                return (
                  <ReferenceLine
                    key={`fraud-volt-${i}`}
                    x={e.snappedCtime}
                    stroke={stroke}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={0.8}
                    label={{ value: "⚠", position: "top", fontSize: 10, fill: stroke }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer Status */}
      <div className="text-center text-slate-500 text-sm py-4 border-t border-slate-800">
        <div className="flex justify-center items-center gap-6 text-xs flex-wrap">
          <span>IMEI: {IMEI}</span>
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
          {fraudEpochs.length > 0 && (
            <>
              <span>•</span>
              <span className="px-2 py-1 rounded bg-red-900/50 text-red-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                {fraudEpochs.length} Illegal Charge{fraudEpochs.length > 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatteryHistory;