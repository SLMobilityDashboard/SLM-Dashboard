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

interface BatteryHistoryProps {
  IMEI: string;
  filters: BatteryFilters;
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

const BatteryHistory: React.FC<BatteryHistoryProps> = ({ IMEI, filters }) => {
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
              <span className="text-sm text-slate-300 font-mono">{bmsId}</span>
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
                <p className="text-lg mb-1">No Cell Imbalance Data Available</p>
                <p className="text-sm text-slate-500">
                  BATCELLDIFFMAX values may not be present in the telemetry data
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
        </div>
      </div>
    </div>
  );
};

export default BatteryHistory;