"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";

// Mock data generators
const generateCabinetComparison = () => {
  const cabinets = [];
  for (let i = 1; i <= 12; i++) {
    cabinets.push({
      cabinet: `Cab ${i}`,
      efficiency: Math.floor(Math.random() * 20) + 85,
      swaps: Math.floor(Math.random() * 50) + 20,
      avgTemp: Math.floor(Math.random() * 10) + 26,
    });
  }
  return cabinets;
};

const generateChargingCycles = () => [
  { hour: "00:00", active: 2 },
  { hour: "04:00", active: 4 },
  { hour: "08:00", active: 7 },
  { hour: "12:00", active: 10 },
  { hour: "16:00", active: 9 },
  { hour: "20:00", active: 5 },
];

const generateSwapActivity = () => [
  { time: "00:00", swaps: 2 },
  { time: "04:00", swaps: 1 },
  { time: "08:00", swaps: 8 },
  { time: "12:00", swaps: 15 },
  { time: "16:00", swaps: 12 },
  { time: "20:00", swaps: 4 },
];

const generateCabinetEfficiency = () => {
  const data = [];
  for (let i = 1; i <= 12; i++) {
    data.push({
      cabinet: i,
      efficiency: Math.floor(Math.random() * 15) + 82,
      utilization: Math.floor(Math.random() * 20) + 75,
    });
  }
  return data;
};

interface BSS360DashboardProps {
  selectedStation: string;
  selectedCabinet: number | null;
  dateRange?: { start: Date; end: Date };
}

export default function BSS360Dashboard({
  selectedStation,
  selectedCabinet,
  dateRange,
}: BSS360DashboardProps) {
  const cabinetData = generateCabinetComparison();
  const chargingData = generateChargingCycles();
  const swapData = generateSwapActivity();
  const efficiencyData = generateCabinetEfficiency();

  // Compute period label based on dateRange
  const getPeriodLabel = () => {
    if (!dateRange) return "Last 24 Hours";
    const days = Math.floor(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Add period context to tabs */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Analysis Period:{" "}
          <span className="text-cyan-400 font-medium">{getPeriodLabel()}</span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800 border border-slate-700">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Cabinet Usage</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="thermal">Thermal Management</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>Active Charging Cycles</CardTitle>
              {/* Update description to reflect date range */}
              <CardDescription>
                Number of cabinets actively charging across the analysis period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chargingData}>
                  <defs>
                    <linearGradient
                      id="colorCharging"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#06b6d4"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="hour" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="active"
                    stroke="#06b6d4"
                    fill="url(#colorCharging)"
                    name="Active Cabinets"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>Battery Swap Activity</CardTitle>
              {/* Update description to reflect date range */}
              <CardDescription>
                Total battery swaps across the analysis period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={swapData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />
                  <Bar dataKey="swaps" fill="#a78bfa" name="Swaps" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cabinet Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>Cabinet Swap Count</CardTitle>
              <CardDescription>
                Total battery swaps per cabinet today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={cabinetData}
                  layout="vertical"
                  margin={{ left: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis
                    dataKey="cabinet"
                    type="category"
                    stroke="#94a3b8"
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />
                  <Bar dataKey="swaps" fill="#3b82f6" name="Swaps" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>Average Cabinet Temperature</CardTitle>
              <CardDescription>
                Temperature distribution across all cabinets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cabinetData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="cabinet" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[20, 40]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />
                  <Bar dataKey="avgTemp" fill="#f97316" name="Temp (°C)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Efficiency Tab */}
        <TabsContent value="efficiency" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>Cabinet Efficiency & Utilization</CardTitle>
              <CardDescription>
                Efficiency vs Utilization rate for each cabinet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    dataKey="efficiency"
                    name="Efficiency %"
                    stroke="#94a3b8"
                    domain={[75, 100]}
                  />
                  <YAxis
                    type="number"
                    dataKey="utilization"
                    name="Utilization %"
                    stroke="#94a3b8"
                    domain={[70, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />
                  <Scatter
                    name="Cabinets"
                    data={efficiencyData}
                    fill="#06b6d4"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>Efficiency Trend</CardTitle>
              <CardDescription>
                Cabinet efficiency score across all 12 units
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cabinetData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="cabinet" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[80, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />
                  <Bar
                    dataKey="efficiency"
                    fill="#10b981"
                    name="Efficiency %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thermal Management Tab */}
        <TabsContent value="thermal" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle>Thermal Profile</CardTitle>
              <CardDescription>
                Temperature monitoring across all cabinets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cabinetData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="cabinet" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[20, 40]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgTemp"
                    stroke="#f97316"
                    name="Temperature (°C)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-orange-500/10 border-orange-500/30 p-4">
              <p className="text-sm text-slate-400 mb-1">Avg Temperature</p>
              <p className="text-2xl font-bold text-orange-400">28.5°C</p>
              <p className="text-xs text-slate-500 mt-2">
                Within optimal range
              </p>
            </Card>
            <Card className="bg-cyan-500/10 border-cyan-500/30 p-4">
              <p className="text-sm text-slate-400 mb-1">Cooling Active</p>
              <p className="text-2xl font-bold text-cyan-400">7 Cabinets</p>
              <p className="text-xs text-slate-500 mt-2">58.3% of total</p>
            </Card>
            <Card className="bg-red-500/10 border-red-500/30 p-4">
              <p className="text-sm text-slate-400 mb-1">Alert Threshold</p>
              <p className="text-2xl font-bold text-red-400">0 Cabinets</p>
              <p className="text-xs text-slate-500 mt-2">No overheating</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alerts */}
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="w-5 h-5" />
            Maintenance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-yellow-400">
              Cabinet 7 - Low Communication Signal
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Signal strength 45% - check antenna connections
            </p>
          </div>
          <div>
            <p className="font-medium text-yellow-400">
              Cabinet 11 - Above Average Temperature
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Running at 35°C - verify cooling fan operation
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
