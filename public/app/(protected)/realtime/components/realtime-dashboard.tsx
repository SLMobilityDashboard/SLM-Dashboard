"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Zap,
  MapPin,
  Battery,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Navigation,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface RealtimeDashboardProps {
  isStreaming: boolean;
}

export default function RealtimeDashboard({
  isStreaming,
}: RealtimeDashboardProps) {
  const [scooterMetrics, setScooterMetrics] = useState({
    totalScooters: 2847,
    activeScooters: 2156,
    inUse: 423,
    charging: 234,
    maintenance: 34,
    offline: 691,
  });

  const [stationMetrics, setStationMetrics] = useState({
    totalStations: 156,
    online: 148,
    offline: 8,
    batterySwaps: 1247,
    avgUtilization: 67.8,
  });

  const [realtimeData, setRealtimeData] = useState<any[]>([]);
  const [gpsEvents, setGpsEvents] = useState(0);
  const [telemetryEvents, setTelemetryEvents] = useState(0);
  const [heartbeats, setHeartbeats] = useState(0);

  // Generate real-time data
  useEffect(() => {
    const generateInitialData = () => {
      const data = [];
      for (let i = 0; i < 50; i++) {
        const timestamp = new Date(Date.now() - (49 - i) * 30000); // 30 second intervals
        data.push({
          timestamp: timestamp.toISOString(),
          gpsEvents: Math.floor(Math.random() * 500) + 800,
          telemetryEvents: Math.floor(Math.random() * 300) + 400,
          heartbeats: Math.floor(Math.random() * 100) + 150,
          batterySwaps: Math.floor(Math.random() * 20) + 10,
          activeScooters: Math.floor(Math.random() * 200) + 2000,
        });
      }
      return data;
    };

    setRealtimeData(generateInitialData());
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      // Update scooter metrics
      setScooterMetrics((prev) => ({
        ...prev,
        activeScooters: Math.max(
          1800,
          Math.min(2500, prev.activeScooters + (Math.random() - 0.5) * 20)
        ),
        inUse: Math.max(
          300,
          Math.min(600, prev.inUse + (Math.random() - 0.5) * 10)
        ),
        charging: Math.max(
          150,
          Math.min(350, prev.charging + (Math.random() - 0.5) * 8)
        ),
        offline: Math.max(
          500,
          Math.min(800, prev.offline + (Math.random() - 0.5) * 15)
        ),
      }));

      // Update station metrics
      setStationMetrics((prev) => ({
        ...prev,
        batterySwaps: prev.batterySwaps + Math.floor(Math.random() * 5),
        avgUtilization: Math.max(
          50,
          Math.min(85, prev.avgUtilization + (Math.random() - 0.5) * 2)
        ),
      }));

      // Update event counters
      setGpsEvents((prev) => prev + Math.floor(Math.random() * 100) + 50);
      setTelemetryEvents((prev) => prev + Math.floor(Math.random() * 60) + 30);
      setHeartbeats((prev) => prev + Math.floor(Math.random() * 20) + 10);

      // Add new data point
      setRealtimeData((prev) => {
        const newPoint = {
          timestamp: new Date().toISOString(),
          gpsEvents: Math.floor(Math.random() * 500) + 800,
          telemetryEvents: Math.floor(Math.random() * 300) + 400,
          heartbeats: Math.floor(Math.random() * 100) + 150,
          batterySwaps: Math.floor(Math.random() * 20) + 10,
          activeScooters: scooterMetrics.activeScooters,
        };
        return [...prev.slice(1), newPoint];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming, scooterMetrics.activeScooters]);

  const scooterStatusData = [
    {
      name: "Active",
      value: scooterMetrics.activeScooters,
      color: "#10b981",
      percentage: 75.7,
    },
    {
      name: "In Use",
      value: scooterMetrics.inUse,
      color: "#06b6d4",
      percentage: 14.9,
    },
    {
      name: "Charging",
      value: scooterMetrics.charging,
      color: "#8b5cf6",
      percentage: 8.2,
    },
    {
      name: "Offline",
      value: scooterMetrics.offline,
      color: "#64748b",
      percentage: 24.3,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Fleet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Scooters</p>
                <p className="text-2xl font-bold text-slate-100">
                  {scooterMetrics.totalScooters.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Across all regions
                </p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/10">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Active Now</p>
                <p className="text-2xl font-bold text-slate-100">
                  {scooterMetrics.activeScooters.toLocaleString()}
                </p>
                <p className="text-xs text-green-400 mt-1">+12 vs last hour</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Battery Swaps</p>
                <p className="text-2xl font-bold text-slate-100">
                  {stationMetrics.batterySwaps.toLocaleString()}
                </p>
                <p className="text-xs text-purple-400 mt-1">
                  +23 in last 10min
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Battery className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Station Uptime</p>
                <p className="text-2xl font-bold text-slate-100">
                  {(
                    (stationMetrics.online / stationMetrics.totalStations) *
                    100
                  ).toFixed(1)}
                  %
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {stationMetrics.online}/{stationMetrics.totalStations} online
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <MapPin className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Stream Chart */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-cyan-400" />
                Live Event Stream
              </CardTitle>
              <Badge
                variant="outline"
                className={
                  isStreaming
                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full mr-1 ${
                    isStreaming ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                ></div>
                {isStreaming ? "LIVE" : "PAUSED"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={realtimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#cbd5e1" }}
                    labelFormatter={(value) =>
                      new Date(value).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="gpsEvents"
                    stackId="1"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="telemetryEvents"
                    stackId="1"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="heartbeats"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center space-x-6 mt-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                <span className="text-slate-400">GPS Events</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-slate-400">Telemetry</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-slate-400">Heartbeats</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scooter Status Distribution */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-cyan-400" />
              Fleet Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scooterStatusData.map((status, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    ></div>
                    <span className="text-sm text-slate-300">
                      {status.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-200">
                      {status.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">
                      {status.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <Progress
                  value={status.percentage}
                  className="h-2 bg-slate-700"
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${status.percentage}%`,
                      backgroundColor: status.color,
                    }}
                  />
                </Progress>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Event Counters */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">
            Real-time Event Counters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/30 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Navigation className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="text-3xl font-bold text-cyan-400 mb-2">
                {gpsEvents.toLocaleString()}
              </div>
              <div className="text-sm text-slate-400 mb-1">GPS Events</div>
              <div className="text-xs text-slate-500">~850/sec average</div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Activity className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {telemetryEvents.toLocaleString()}
              </div>
              <div className="text-sm text-slate-400 mb-1">
                Telemetry Events
              </div>
              <div className="text-xs text-slate-500">~450/sec average</div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Wifi className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-green-400 mb-2">
                {heartbeats.toLocaleString()}
              </div>
              <div className="text-sm text-slate-400 mb-1">
                Station Heartbeats
              </div>
              <div className="text-xs text-slate-500">~160/sec average</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
