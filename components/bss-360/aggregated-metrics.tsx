"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  TrendingUp,
  Zap,
  Battery,
  AlertCircle,
  Download,
} from "lucide-react";

interface AggregatedMetricsProps {
  dateRange: { start: Date; end: Date };
  selectedStation: string;
}

// Mock aggregated data for the date range
const generateAggregatedData = (dateRange: { start: Date; end: Date }) => {
  const days =
    Math.floor(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    ) || 1;

  // Historical daily data for trends
  const dailyData = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(dateRange.start);
    date.setDate(date.getDate() + i);
    dailyData.push({
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      energy: Math.floor(Math.random() * 500) + 300,
      power: Math.floor(Math.random() * 150) + 80,
      swaps: Math.floor(Math.random() * 100) + 40,
      avgTemp: Math.floor(Math.random() * 8) + 26,
      uptime: Math.floor(Math.random() * 8) + 92,
    });
  }

  return {
    // KPI Summary
    totalCabinets: 12,
    onlineCabinets: 11,
    totalBatteries: 47,
    criticalBatteries: 3,
    totalSwaps: 298,
    totalEnergyKwh: 8450,
    avgPowerFactor: 0.94,
    avgTemp: 28.5,
    uptimePercent: 94.2,

    // Communication Status
    communicationStatus: [
      { name: "Online", value: 11, color: "#10b981" },
      { name: "Offline", value: 1, color: "#ef4444" },
    ],

    // Battery Status Distribution
    batteryStatus: [
      { name: "Charging", value: 23 },
      { name: "Available", value: 18 },
      { name: "Low Battery", value: 4 },
      { name: "Critical", value: 2 },
    ],

    // Daily trends
    dailyTrends: dailyData,

    // Cabinet Performance
    cabinetPerformance: [
      { cabinet: "Cab 1", swaps: 45, utilization: 92, temp: 27.5 },
      { cabinet: "Cab 2", swaps: 52, utilization: 95, temp: 28.1 },
      { cabinet: "Cab 3", swaps: 38, utilization: 85, temp: 26.9 },
      { cabinet: "Cab 4", swaps: 41, utilization: 88, temp: 29.2 },
      { cabinet: "Cab 5", swaps: 48, utilization: 91, temp: 28.5 },
      { cabinet: "Cab 6", swaps: 35, utilization: 80, temp: 25.8 },
      { cabinet: "Cab 7", swaps: 28, utilization: 72, temp: 31.2 },
      { cabinet: "Cab 8", swaps: 50, utilization: 94, temp: 27.3 },
      { cabinet: "Cab 9", swaps: 42, utilization: 89, temp: 28.7 },
      { cabinet: "Cab 10", swaps: 39, utilization: 86, temp: 27.9 },
      { cabinet: "Cab 11", swaps: 44, utilization: 90, temp: 30.1 },
      { cabinet: "Cab 12", swaps: 36, utilization: 82, temp: 26.3 },
    ],

    // Power factor by cabinet
    powerFactor: [
      { cabinet: "Cab 1", pf: 0.94 },
      { cabinet: "Cab 2", pf: 0.96 },
      { cabinet: "Cab 3", pf: 0.93 },
      { cabinet: "Cab 4", pf: 0.95 },
      { cabinet: "Cab 5", pf: 0.94 },
      { cabinet: "Cab 6", pf: 0.92 },
      { cabinet: "Cab 7", pf: 0.91 },
      { cabinet: "Cab 8", pf: 0.96 },
      { cabinet: "Cab 9", pf: 0.95 },
      { cabinet: "Cab 10", pf: 0.93 },
      { cabinet: "Cab 11", pf: 0.92 },
      { cabinet: "Cab 12", pf: 0.94 },
    ],

    // Faults and alerts
    faults: [
      {
        id: 1,
        type: "Temperature Alert",
        cabinet: 7,
        severity: "warning",
        message: "Cabinet 7 running above 30°C",
        date: "2024-11-05 14:30",
      },
      {
        id: 2,
        type: "Low Battery",
        cabinet: 3,
        severity: "critical",
        message: "4 batteries below 20% charge",
        date: "2024-11-05 12:15",
      },
      {
        id: 3,
        type: "Communication Loss",
        cabinet: 11,
        severity: "critical",
        message: "Intermittent communication detected",
        date: "2024-11-05 10:45",
      },
      {
        id: 4,
        type: "Charger Offline",
        cabinet: 6,
        severity: "warning",
        message: "Charger offline - manual intervention needed",
        date: "2024-11-05 09:20",
      },
      {
        id: 5,
        type: "Door Alert",
        cabinet: 2,
        severity: "info",
        message: "Door left open for 5 minutes",
        date: "2024-11-05 08:15",
      },
    ],
  };
};

const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#8b5cf6"];

export default function AggregatedMetrics({
  dateRange,
  selectedStation,
}: AggregatedMetricsProps) {
  const data = generateAggregatedData(dateRange);
  const days =
    Math.floor(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    ) || 1;

  const handleDownloadReport = () => {
    console.log(
      "[v0] Downloading report for",
      selectedStation,
      "from",
      dateRange.start,
      "to",
      dateRange.end
    );
    // In a real app, this would generate a PDF/CSV
  };

  return (
    <div className="space-y-6">
      {/* Period Context */}
      <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div>
          <p className="text-sm text-slate-400">Analysis Period</p>
          <p className="text-lg font-semibold text-cyan-400">
            {dateRange.start.toLocaleDateString()} -{" "}
            {dateRange.end.toLocaleDateString()} ({days} days)
          </p>
        </div>
        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/30 transition-all"
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cabinets */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Cabinets</p>
                <p className="text-3xl font-bold text-cyan-400">
                  {data.totalCabinets}
                </p>
              </div>
              <Battery className="w-8 h-8 text-cyan-400 opacity-30" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {data.onlineCabinets} online /{" "}
              {data.totalCabinets - data.onlineCabinets} offline
            </p>
          </CardContent>
        </Card>

        {/* Battery Inventory */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Battery Inventory</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {data.totalBatteries}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-emerald-400 opacity-30" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {data.criticalBatteries} critical batteries
            </p>
          </CardContent>
        </Card>

        {/* Total Energy */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Energy Delivered</p>
                <p className="text-3xl font-bold text-purple-400">
                  {(data.totalEnergyKwh / 1000).toFixed(1)} MWh
                </p>
              </div>
              <Zap className="w-8 h-8 text-purple-400 opacity-30" />
            </div>
            <p className="text-xs text-slate-500 mt-2">Over {days} days</p>
          </CardContent>
        </Card>

        {/* Battery Swaps */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Swaps</p>
                <p className="text-3xl font-bold text-orange-400">
                  {data.totalSwaps}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-400 opacity-30" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {(data.totalSwaps / days).toFixed(1)} swaps/day avg
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400 mb-1">Avg Power Factor</p>
            <p className="text-2xl font-bold text-cyan-400">
              {data.avgPowerFactor.toFixed(3)}
            </p>
            <p className="text-xs text-emerald-400 mt-2">Optimal efficiency</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400 mb-1">Avg Temperature</p>
            <p className="text-2xl font-bold text-orange-400">
              {data.avgTemp.toFixed(1)}°C
            </p>
            <p className="text-xs text-emerald-400 mt-2">Within normal range</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400 mb-1">System Uptime</p>
            <p className="text-2xl font-bold text-emerald-400">
              {data.uptimePercent}%
            </p>
            <p className="text-xs text-slate-500 mt-2">Over analysis period</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-slate-800 border border-slate-700">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="health">Battery Health</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Historical Trends */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>Daily Energy Consumption Trend</CardTitle>
              <CardDescription>
                Total energy delivered over the analysis period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.dailyTrends}>
                  <defs>
                    <linearGradient
                      id="colorEnergy"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#8b5cf6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="energy"
                    stroke="#8b5cf6"
                    fill="url(#colorEnergy)"
                    name="Energy (kWh)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle>Daily Battery Swaps</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                    />
                    <Bar dataKey="swaps" fill="#f59e0b" name="Swaps" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle>Daily Average Temperature</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={[20, 35]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgTemp"
                      stroke="#f97316"
                      name="Temp (°C)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Status Tab - Communication and Online Status */}
        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle>Communication Status</CardTitle>
                <CardDescription>Online vs Offline cabinets</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.communicationStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) =>
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.communicationStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle>Battery Status Distribution</CardTitle>
                <CardDescription>
                  Aggregate battery state across all cabinets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.batteryStatus}
                    layout="vertical"
                    margin={{ left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#94a3b8"
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                    />
                    <Bar dataKey="value" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>Cabinet Performance Overview</CardTitle>
              <CardDescription>
                Swaps and utilization by cabinet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.cabinetPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="cabinet" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" yAxisId="left" />
                  <YAxis stroke="#94a3b8" yAxisId="right" orientation="right" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="swaps"
                    fill="#3b82f6"
                    name="Swaps"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="utilization"
                    fill="#10b981"
                    name="Utilization %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>Power Factor by Cabinet</CardTitle>
              <CardDescription>
                Electrical efficiency across all cabinets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.powerFactor}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="cabinet" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[0.85, 1]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />
                  <Bar dataKey="pf" fill="#a78bfa" name="Power Factor" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Battery Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>Temperature Profile by Cabinet</CardTitle>
              <CardDescription>
                Thermal management across the station
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.cabinetPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="cabinet" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[20, 35]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />
                  <Bar dataKey="temp" fill="#f97316" name="Temperature (°C)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-emerald-500/10 border-emerald-500/30">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-400 mb-1">
                  Batteries Available
                </p>
                <p className="text-3xl font-bold text-emerald-400">18</p>
                <p className="text-xs text-slate-500 mt-2">Ready for swap</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-400 mb-1">Low Battery</p>
                <p className="text-3xl font-bold text-yellow-400">4</p>
                <p className="text-xs text-slate-500 mt-2">Below 20% charge</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-400 mb-1">
                  Critical Batteries
                </p>
                <p className="text-3xl font-bold text-red-400">2</p>
                <p className="text-xs text-slate-500 mt-2">
                  Requires maintenance
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>System Alerts & Faults</CardTitle>
              <CardDescription>
                All critical and warning alerts over the analysis period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.faults.map((fault) => (
                  <div
                    key={fault.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      fault.severity === "critical"
                        ? "bg-red-500/10 border-red-500/30"
                        : fault.severity === "warning"
                        ? "bg-yellow-500/10 border-yellow-500/30"
                        : "bg-blue-500/10 border-blue-500/30"
                    }`}
                  >
                    <AlertCircle
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        fault.severity === "critical"
                          ? "text-red-400"
                          : fault.severity === "warning"
                          ? "text-yellow-400"
                          : "text-blue-400"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-slate-100">
                          {fault.type}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            fault.severity === "critical"
                              ? "bg-red-500/20 text-red-300"
                              : fault.severity === "warning"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {fault.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-1">
                        {fault.message}
                      </p>
                      <p className="text-xs text-slate-500">
                        {fault.cabinet && `Cabinet ${fault.cabinet} · `}
                        {fault.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
