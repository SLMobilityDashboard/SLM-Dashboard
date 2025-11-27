"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Activity,
  Gauge,
  Clock,
  Wifi,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export default function LiveMetrics() {
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 67,
    memory: 78,
    disk: 45,
    network: 234,
    uptime: "14d 6h 42m",
    processes: 247,
  });

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [networkStats, setNetworkStats] = useState({
    inbound: 1247,
    outbound: 892,
    connections: 2847,
    latency: 45,
  });

  // Generate initial performance data
  useEffect(() => {
    const generateInitialData = () => {
      const data = [];
      for (let i = 0; i < 50; i++) {
        const timestamp = new Date(Date.now() - (49 - i) * 30000);
        data.push({
          timestamp: timestamp.toISOString(),
          cpu: Math.floor(Math.random() * 30) + 50,
          memory: Math.floor(Math.random() * 25) + 65,
          network: Math.floor(Math.random() * 500) + 200,
          disk: Math.floor(Math.random() * 10) + 40,
        });
      }
      return data;
    };

    setPerformanceData(generateInitialData());
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update system metrics
      setSystemMetrics((prev) => ({
        ...prev,
        cpu: Math.max(30, Math.min(95, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(
          50,
          Math.min(90, prev.memory + (Math.random() - 0.5) * 8)
        ),
        disk: Math.max(30, Math.min(80, prev.disk + (Math.random() - 0.5) * 2)),
        network: Math.max(
          100,
          Math.min(500, prev.network + (Math.random() - 0.5) * 50)
        ),
        processes: Math.max(
          200,
          Math.min(300, prev.processes + (Math.random() - 0.5) * 10)
        ),
      }));

      // Update network stats
      setNetworkStats((prev) => ({
        ...prev,
        inbound: Math.max(
          800,
          Math.min(2000, prev.inbound + (Math.random() - 0.5) * 100)
        ),
        outbound: Math.max(
          500,
          Math.min(1500, prev.outbound + (Math.random() - 0.5) * 80)
        ),
        latency: Math.max(
          20,
          Math.min(100, prev.latency + (Math.random() - 0.5) * 10)
        ),
      }));

      // Add new performance data point
      setPerformanceData((prev) => {
        const newPoint = {
          timestamp: new Date().toISOString(),
          cpu: systemMetrics.cpu,
          memory: systemMetrics.memory,
          network: systemMetrics.network,
          disk: systemMetrics.disk,
        };
        return [...prev.slice(1), newPoint];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [
    systemMetrics.cpu,
    systemMetrics.memory,
    systemMetrics.network,
    systemMetrics.disk,
  ]);

  const getMetricColor = (
    value: number,
    thresholds = { warning: 70, critical: 85 }
  ) => {
    if (value >= thresholds.critical) return "text-red-400";
    if (value >= thresholds.warning) return "text-amber-400";
    return "text-green-400";
  };

  const getProgressColor = (
    value: number,
    thresholds = { warning: 70, critical: 85 }
  ) => {
    if (value >= thresholds.critical) return "from-red-500 to-red-600";
    if (value >= thresholds.warning) return "from-amber-500 to-amber-600";
    return "from-green-500 to-cyan-500";
  };

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">CPU Usage</p>
                <p
                  className={`text-2xl font-bold ${getMetricColor(
                    systemMetrics.cpu
                  )}`}
                >
                  {systemMetrics.cpu.toFixed(3)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">8 cores active</p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/10">
                <Cpu className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Memory Usage</p>
                <p
                  className={`text-2xl font-bold ${getMetricColor(
                    systemMetrics.memory
                  )}`}
                >
                  {systemMetrics.memory.toFixed(3)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">24.8 GB / 32 GB</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10">
                <MemoryStick className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Disk Usage</p>
                <p
                  className={`text-2xl font-bold ${getMetricColor(
                    systemMetrics.disk,
                    { warning: 80, critical: 90 }
                  )}`}
                >
                  {systemMetrics.disk.toFixed(3)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">4.5 TB / 10 TB</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <HardDrive className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Network I/O</p>
                <p className="text-2xl font-bold text-slate-100">
                  {systemMetrics.network.toFixed(3)}
                </p>
                <p className="text-xs text-slate-500 mt-1">MB/s throughput</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Network className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-cyan-400" />
              System Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
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
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
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
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="disk"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center space-x-6 mt-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                <span className="text-slate-400">CPU</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-slate-400">Memory</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-slate-400">Disk</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <Network className="w-5 h-5 mr-2 text-amber-400" />
              Network Traffic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
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
                  />
                  <Area
                    type="monotone"
                    dataKey="network"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="text-center">
                <div className="text-green-400 font-medium">
                  {networkStats.inbound} MB/s
                </div>
                <div className="text-slate-500 text-xs">Inbound</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-medium">
                  {networkStats.outbound} MB/s
                </div>
                <div className="text-slate-500 text-xs">Outbound</div>
              </div>
              <div className="text-center">
                <div className="text-purple-400 font-medium">
                  {networkStats.latency}ms
                </div>
                <div className="text-slate-500 text-xs">Latency</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="bg-slate-800/50 p-1">
          <TabsTrigger
            value="system"
            className="data-[state=active]:bg-slate-700"
          >
            System Resources
          </TabsTrigger>
          <TabsTrigger
            value="processes"
            className="data-[state=active]:bg-slate-700"
          >
            Processes
          </TabsTrigger>
          <TabsTrigger
            value="network"
            className="data-[state=active]:bg-slate-700"
          >
            Network
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="data-[state=active]:bg-slate-700"
          >
            Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 text-lg">
                  Resource Utilization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">CPU Usage</span>
                    <span className={getMetricColor(systemMetrics.cpu)}>
                      {systemMetrics.cpu}%
                    </span>
                  </div>
                  <Progress
                    value={systemMetrics.cpu}
                    className="h-3 bg-slate-700"
                  >
                    <div
                      className={`h-full bg-gradient-to-r ${getProgressColor(
                        systemMetrics.cpu
                      )} rounded-full`}
                      style={{ width: `${systemMetrics.cpu}%` }}
                    />
                  </Progress>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>8 cores @ 3.2 GHz</span>
                    <span>Load avg: 2.4</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Memory Usage</span>
                    <span className={getMetricColor(systemMetrics.memory)}>
                      {systemMetrics.memory}%
                    </span>
                  </div>
                  <Progress
                    value={systemMetrics.memory}
                    className="h-3 bg-slate-700"
                  >
                    <div
                      className={`h-full bg-gradient-to-r ${getProgressColor(
                        systemMetrics.memory
                      )} rounded-full`}
                      style={{ width: `${systemMetrics.memory}%` }}
                    />
                  </Progress>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>24.8 GB used</span>
                    <span>7.2 GB free</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Disk Usage</span>
                    <span
                      className={getMetricColor(systemMetrics.disk, {
                        warning: 80,
                        critical: 90,
                      })}
                    >
                      {systemMetrics.disk}%
                    </span>
                  </div>
                  <Progress
                    value={systemMetrics.disk}
                    className="h-3 bg-slate-700"
                  >
                    <div
                      className={`h-full bg-gradient-to-r ${getProgressColor(
                        systemMetrics.disk,
                        { warning: 80, critical: 90 }
                      )} rounded-full`}
                      style={{ width: `${systemMetrics.disk}%` }}
                    />
                  </Progress>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>4.5 TB used</span>
                    <span>5.5 TB free</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 text-lg">
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-slate-500">Uptime</span>
                    </div>
                    <div className="text-sm font-medium text-slate-200">
                      {systemMetrics.uptime}
                    </div>
                  </div>

                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Activity className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-slate-500">Processes</span>
                    </div>
                    <div className="text-sm font-medium text-slate-200">
                      {systemMetrics.processes}
                    </div>
                  </div>

                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Wifi className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-slate-500">
                        Connections
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-200">
                      {networkStats.connections}
                    </div>
                  </div>

                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Gauge className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-slate-500">Load Avg</span>
                    </div>
                    <div className="text-sm font-medium text-slate-200">
                      2.4, 2.1, 1.8
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Hardware Info
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">CPU:</span>
                      <span className="text-slate-300">
                        Intel Xeon E5-2686 v4
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Memory:</span>
                      <span className="text-slate-300">32 GB DDR4</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Storage:</span>
                      <span className="text-slate-300">10 TB NVMe SSD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">OS:</span>
                      <span className="text-slate-300">Ubuntu 22.04 LTS</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="processes" className="space-y-4">
          <Card className="bg-slate-800/30 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200 text-lg">
                Top Processes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                        PID
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                        Process
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                        CPU %
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                        Memory
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        pid: 1247,
                        name: "stream-processor",
                        cpu: 23.4,
                        memory: "2.1 GB",
                        status: "running",
                      },
                      {
                        pid: 1892,
                        name: "database-server",
                        cpu: 18.7,
                        memory: "4.8 GB",
                        status: "running",
                      },
                      {
                        pid: 2156,
                        name: "api-gateway",
                        cpu: 12.3,
                        memory: "1.2 GB",
                        status: "running",
                      },
                      {
                        pid: 3012,
                        name: "message-queue",
                        cpu: 8.9,
                        memory: "856 MB",
                        status: "running",
                      },
                      {
                        pid: 4268,
                        name: "analytics-engine",
                        cpu: 15.6,
                        memory: "3.4 GB",
                        status: "running",
                      },
                      {
                        pid: 5124,
                        name: "web-server",
                        cpu: 6.2,
                        memory: "512 MB",
                        status: "running",
                      },
                    ].map((process, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-800 hover:bg-slate-800/30"
                      >
                        <td className="py-3 px-4 text-sm text-slate-400">
                          {process.pid}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-200">
                          {process.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-cyan-400">
                          {process.cpu}%
                        </td>
                        <td className="py-3 px-4 text-sm text-purple-400">
                          {process.memory}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-400 border-green-500/30 text-xs"
                          >
                            {process.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 text-lg">
                  Network Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-400">
                      {networkStats.inbound}
                    </div>
                    <div className="text-xs text-slate-500">MB/s Inbound</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-blue-400">
                      {networkStats.outbound}
                    </div>
                    <div className="text-xs text-slate-500">MB/s Outbound</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Active Connections:</span>
                    <span className="text-slate-300">
                      {networkStats.connections.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Average Latency:</span>
                    <span className="text-slate-300">
                      {networkStats.latency.toFixed(3)}ms
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Packet Loss:</span>
                    <span className="text-green-400">0.02%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      Bandwidth Utilization:
                    </span>
                    <span className="text-slate-300">67%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 text-lg">
                  Connection Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                    <span className="text-sm text-slate-300">
                      TCP Connections
                    </span>
                    <span className="text-sm text-cyan-400">2,156</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                    <span className="text-sm text-slate-300">
                      UDP Connections
                    </span>
                    <span className="text-sm text-purple-400">691</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                    <span className="text-sm text-slate-300">
                      WebSocket Connections
                    </span>
                    <span className="text-sm text-green-400">2,847</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                    <span className="text-sm text-slate-300">
                      HTTP/2 Streams
                    </span>
                    <span className="text-sm text-amber-400">1,423</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card className="bg-slate-800/30 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200 text-lg">
                Service Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    name: "Stream Processing Service",
                    status: "running",
                    uptime: "14d 6h",
                    cpu: 23.4,
                    memory: "2.1 GB",
                  },
                  {
                    name: "Database Service",
                    status: "running",
                    uptime: "14d 6h",
                    cpu: 18.7,
                    memory: "4.8 GB",
                  },
                  {
                    name: "API Gateway",
                    status: "running",
                    uptime: "14d 6h",
                    cpu: 12.3,
                    memory: "1.2 GB",
                  },
                  {
                    name: "Message Queue",
                    status: "running",
                    uptime: "14d 6h",
                    cpu: 8.9,
                    memory: "856 MB",
                  },
                  {
                    name: "Analytics Engine",
                    status: "running",
                    uptime: "14d 6h",
                    cpu: 15.6,
                    memory: "3.4 GB",
                  },
                  {
                    name: "Load Balancer",
                    status: "running",
                    uptime: "14d 6h",
                    cpu: 6.2,
                    memory: "512 MB",
                  },
                ].map((service, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-200">
                        {service.name}
                      </h4>
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-400 border-green-500/30"
                      >
                        {service.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-slate-500">Uptime</div>
                        <div className="text-slate-300">{service.uptime}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">CPU</div>
                        <div className="text-cyan-400">{service.cpu}%</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Memory</div>
                        <div className="text-purple-400">{service.memory}</div>
                      </div>
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
