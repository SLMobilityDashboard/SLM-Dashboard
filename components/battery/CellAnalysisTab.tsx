import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  Battery,
  TrendingUp,
  AlertTriangle,
  Activity,
  Zap,
  ThermometerSun,
  BarChart3,
} from "lucide-react";

// Generate 30 days of daily battery data based on the schema
const generateMonthlyData = () => {
  const data = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  let totalCycles = 145;
  let soh = 98.5;
  let baseImbalance = 45;

  for (let i = 30; i >= 0; i--) {
    const timestamp = now - i * dayMs;
    const date = new Date(timestamp);

    // Simulate gradual degradation over time
    const dayFactor = (30 - i) / 30;
    soh = 98.5 - dayFactor * 0.8 - Math.random() * 0.1;
    totalCycles = 145 + Math.floor(dayFactor * 12);

    // Cell imbalance varies but tends to increase
    const imbalance = baseImbalance + dayFactor * 15 + (Math.random() * 12 - 6);

    // Simulate charging pattern (higher imbalance during charging)
    const isChargingDay = Math.random() > 0.6;
    const chargingImbalance = isChargingDay ? imbalance + 15 : imbalance;

    const record = {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: date.toISOString().split("T")[0],
      timestamp: Math.floor(timestamp / 1000),

      // Battery metrics
      BATVOLT: 5180 + Math.random() * 200 - 100,
      BATPERCENT: 65 + Math.random() * 30,
      BATCURRENT: -5 + Math.random() * 25 - 10,
      BATTEMP: 30 + Math.random() * 12,

      // Cell balance - key metric
      BATCELLDIFFMAX: chargingImbalance,

      // Health metrics
      BATSOH: soh,
      BATCYCLECOUNT: totalCycles,

      // Usage patterns
      SPEED_KMPH: Math.random() * 45,
      THROTTLEPERCENT: Math.random() * 100,
      DISTANCE_M: 5000 + Math.random() * 15000,
      TRIP_DISTANCE_KM: 5 + Math.random() * 15,
    };

    data.push(record);
  }

  return data;
};

const CellAnalysisTab = () => {
  const monthlyData = generateMonthlyData();
  const latestData = monthlyData[monthlyData.length - 1];
  const oldestData = monthlyData[0];

  // Daily insights calculations
  const avgImbalance = (
    monthlyData.reduce((sum, d) => sum + d.BATCELLDIFFMAX, 0) /
    monthlyData.length
  ).toFixed(1);
  const maxImbalance = Math.max(
    ...monthlyData.map((d) => d.BATCELLDIFFMAX)
  ).toFixed(0);
  const minImbalance = Math.min(
    ...monthlyData.map((d) => d.BATCELLDIFFMAX)
  ).toFixed(0);

  const cycleIncrease = latestData.BATCYCLECOUNT - oldestData.BATCYCLECOUNT;
  const sohChange = latestData.BATSOH - oldestData.BATSOH;
  const avgSOH = (
    monthlyData.reduce((sum, d) => sum + d.BATSOH, 0) / monthlyData.length
  ).toFixed(2);

  const avgTemp = (
    monthlyData.reduce((sum, d) => sum + d.BATTEMP, 0) / monthlyData.length
  ).toFixed(1);
  const maxTemp = Math.max(...monthlyData.map((d) => d.BATTEMP)).toFixed(1);

  // Trend analysis
  const recentData = monthlyData.slice(-7);
  const olderData = monthlyData.slice(0, 7);
  const recentAvgImbalance =
    recentData.reduce((sum, d) => sum + d.BATCELLDIFFMAX, 0) /
    recentData.length;
  const olderAvgImbalance =
    olderData.reduce((sum, d) => sum + d.BATCELLDIFFMAX, 0) / olderData.length;
  const imbalanceTrend = recentAvgImbalance - olderAvgImbalance;

  // Days with high imbalance
  const highImbalanceDays = monthlyData.filter(
    (d) => d.BATCELLDIFFMAX > 60
  ).length;

  // Voltage stability
  const voltageStdDev = Math.sqrt(
    monthlyData.reduce((sum, d) => {
      const avg =
        monthlyData.reduce((s, x) => s + x.BATVOLT, 0) / monthlyData.length;
      return sum + Math.pow(d.BATVOLT - avg, 2);
    }, 0) / monthlyData.length
  ).toFixed(0);

  // Weekly breakdown for imbalance
  const weeklyData = [];
  for (let week = 0; week < 4; week++) {
    const weekData = monthlyData.slice(week * 7, (week + 1) * 7);
    weeklyData.push({
      week: `Week ${week + 1}`,
      avgImbalance: (
        weekData.reduce((sum, d) => sum + d.BATCELLDIFFMAX, 0) / weekData.length
      ).toFixed(1),
      maxImbalance: Math.max(...weekData.map((d) => d.BATCELLDIFFMAX)).toFixed(
        0
      ),
      avgSOH: (
        weekData.reduce((sum, d) => sum + d.BATSOH, 0) / weekData.length
      ).toFixed(2),
      cycles:
        weekData[weekData.length - 1].BATCYCLECOUNT - weekData[0].BATCYCLECOUNT,
    });
  }

  return (
    <div className="space-y-4 p-6 bg-slate-950 min-h-screen">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/50 to-slate-900/50 border-slate-700/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs mb-1">Current SOH</p>
                <p className="text-3xl font-bold text-blue-400">
                  {latestData.BATSOH.toFixed(1)}%
                </p>
                <p
                  className={`text-xs mt-1 ${
                    sohChange < 0 ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {sohChange >= 0 ? "+" : ""}
                  {sohChange.toFixed(2)}% (30d)
                </p>
              </div>
              <Battery className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-900/50 to-slate-900/50 border-slate-700/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs mb-1">
                  Avg Cell Imbalance
                </p>
                <p className="text-3xl font-bold text-orange-400">
                  {avgImbalance}mV
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Range: {minImbalance}-{maxImbalance}mV
                </p>
              </div>
              <Zap className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 border-slate-700/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs mb-1">Total Cycles</p>
                <p className="text-3xl font-bold text-purple-400">
                  {latestData.BATCYCLECOUNT}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  +{cycleIncrease} cycles (30d)
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-900/50 to-slate-900/50 border-slate-700/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs mb-1">Avg Temperature</p>
                <p className="text-3xl font-bold text-red-400">{avgTemp}°C</p>
                <p className="text-xs text-slate-500 mt-1">Peak: {maxTemp}°C</p>
              </div>
              <ThermometerSun className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Cell Imbalance Trend */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            Daily Cell Imbalance Pattern (30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorImbalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis
                tick={{ fill: "#94a3b8" }}
                label={{
                  value: "Imbalance (mV)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#94a3b8",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Area
                type="monotone"
                dataKey="BATCELLDIFFMAX"
                stroke="#f59e0b"
                fill="url(#colorImbalance)"
                strokeWidth={2}
                name="Cell Imbalance (mV)"
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">30-Day Average</p>
              <p className="text-xl font-bold text-slate-100">
                {avgImbalance}mV
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">High Imbalance Days</p>
              <p className="text-xl font-bold text-orange-400">
                {highImbalanceDays} days
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Trend (7d vs 7d)</p>
              <p
                className={`text-xl font-bold ${
                  imbalanceTrend > 0 ? "text-red-400" : "text-green-400"
                }`}
              >
                {imbalanceTrend > 0 ? "+" : ""}
                {imbalanceTrend.toFixed(1)}mV
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SOH & Cycles Correlation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              State of Health Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8" }}
                  domain={[96, 100]}
                  label={{
                    value: "SOH (%)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#94a3b8",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="BATSOH"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 3 }}
                  name="SOH (%)"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Analysis</p>
              <p className="text-slate-200 text-sm">
                {sohChange < -0.3
                  ? `SOH declining at ${Math.abs(sohChange / 30).toFixed(
                      3
                    )}% per day. Monitor closely.`
                  : `SOH stable at ${avgSOH}% average. Normal degradation rate.`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              Cycle Count Accumulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorCycle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="BATCYCLECOUNT"
                  stroke="#a855f7"
                  fill="url(#colorCycle)"
                  strokeWidth={2}
                  name="Cycles"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Analysis</p>
              <p className="text-slate-200 text-sm">
                Average {(cycleIncrease / 30).toFixed(1)} cycles per day.
                {latestData.BATCYCLECOUNT > 500
                  ? " Battery entering mid-life."
                  : " Battery in early life stage."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Breakdown */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            Weekly Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="week" tick={{ fill: "#94a3b8" }} />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#94a3b8" }}
                label={{
                  value: "Imbalance (mV)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#94a3b8",
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#94a3b8" }}
                label={{
                  value: "Cycles",
                  angle: 90,
                  position: "insideRight",
                  fill: "#94a3b8",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="avgImbalance"
                fill="#f59e0b"
                name="Avg Imbalance (mV)"
              />
              <Bar
                yAxisId="right"
                dataKey="cycles"
                fill="#a855f7"
                name="New Cycles"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Temperature vs Imbalance Correlation */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <ThermometerSun className="h-5 w-5 text-red-400" />
            Temperature Impact on Cell Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                dataKey="BATTEMP"
                type="number"
                name="Temperature"
                unit="°C"
                tick={{ fill: "#94a3b8" }}
                label={{
                  value: "Temperature (°C)",
                  position: "insideBottom",
                  fill: "#94a3b8",
                  offset: -5,
                }}
              />
              <YAxis
                dataKey="BATCELLDIFFMAX"
                type="number"
                name="Imbalance"
                unit="mV"
                tick={{ fill: "#94a3b8" }}
                label={{
                  value: "Cell Imbalance (mV)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#94a3b8",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                }}
                cursor={{ strokeDasharray: "3 3" }}
              />
              <Scatter data={monthlyData} fill="#3b82f6" name="Daily Records" />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 bg-slate-800/50 rounded">
            <p className="text-slate-400 text-xs mb-1">Correlation Analysis</p>
            <p className="text-slate-200 text-sm">
              {avgTemp > 40
                ? "Higher temperatures correlating with increased cell imbalance. Improve thermal management."
                : "Temperature within optimal range. No significant thermal stress detected."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CellAnalysisTab;
