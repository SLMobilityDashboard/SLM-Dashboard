"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Database,
  Activity,
  Zap,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Settings,
  AlertTriangle,
} from "lucide-react";

interface StreamingDataProps {
  isStreaming: boolean;
}

export default function StreamingData({ isStreaming }: StreamingDataProps) {
  const [streamMetrics, setStreamMetrics] = useState({
    totalEvents: 0,
    gpsEvents: 0,
    telemetryEvents: 0,
    heartbeats: 0,
    errorRate: 0.02,
    throughput: 1247,
    latency: 145,
  });

  const [bufferMetrics, setBufferMetrics] = useState({
    gpsBuffer: 85,
    telemetryBuffer: 67,
    heartbeatBuffer: 23,
    processingQueue: 156,
  });

  const [connectionStats, setConnectionStats] = useState({
    activeConnections: 2847,
    reconnections: 12,
    timeouts: 3,
    dataLoss: 0.03,
  });

  const [streamConfig, setStreamConfig] = useState({
    gpsEnabled: true,
    telemetryEnabled: true,
    heartbeatsEnabled: true,
    batchSize: 100,
    flushInterval: 1000,
  });

  // Simulate real-time updates
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setStreamMetrics((prev) => ({
        ...prev,
        totalEvents: prev.totalEvents + Math.floor(Math.random() * 200) + 100,
        gpsEvents: prev.gpsEvents + Math.floor(Math.random() * 100) + 50,
        telemetryEvents:
          prev.telemetryEvents + Math.floor(Math.random() * 60) + 30,
        heartbeats: prev.heartbeats + Math.floor(Math.random() * 20) + 10,
        throughput: Math.max(
          800,
          Math.min(2000, prev.throughput + (Math.random() - 0.5) * 100)
        ),
        latency: Math.max(
          50,
          Math.min(300, prev.latency + (Math.random() - 0.5) * 20)
        ),
        errorRate: Math.max(
          0,
          Math.min(0.1, prev.errorRate + (Math.random() - 0.5) * 0.01)
        ),
      }));

      setBufferMetrics((prev) => ({
        gpsBuffer: Math.max(
          0,
          Math.min(100, prev.gpsBuffer + (Math.random() - 0.5) * 10)
        ),
        telemetryBuffer: Math.max(
          0,
          Math.min(100, prev.telemetryBuffer + (Math.random() - 0.5) * 8)
        ),
        heartbeatBuffer: Math.max(
          0,
          Math.min(100, prev.heartbeatBuffer + (Math.random() - 0.5) * 5)
        ),
        processingQueue: Math.max(
          0,
          Math.min(500, prev.processingQueue + (Math.random() - 0.5) * 20)
        ),
      }));

      setConnectionStats((prev) => ({
        ...prev,
        reconnections: prev.reconnections + (Math.random() > 0.95 ? 1 : 0),
        timeouts: prev.timeouts + (Math.random() > 0.98 ? 1 : 0),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const streamSources = [
    {
      name: "GPS Tracking",
      enabled: streamConfig.gpsEnabled,
      eventsPerSec: Math.floor(streamMetrics.throughput * 0.6),
      buffer: bufferMetrics.gpsBuffer,
      status: "healthy",
      description: "Real-time location data from 2,847 scooters",
    },
    {
      name: "Telemetry Data",
      enabled: streamConfig.telemetryEnabled,
      eventsPerSec: Math.floor(streamMetrics.throughput * 0.3),
      buffer: bufferMetrics.telemetryBuffer,
      status: "healthy",
      description: "Battery, speed, and diagnostic data",
    },
    {
      name: "Station Heartbeats",
      enabled: streamConfig.heartbeatsEnabled,
      eventsPerSec: Math.floor(streamMetrics.throughput * 0.1),
      buffer: bufferMetrics.heartbeatBuffer,
      status: bufferMetrics.heartbeatBuffer > 80 ? "warning" : "healthy",
      description: "Health checks from 156 charging stations",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500/10 text-green-400 border-green-500/30";
      case "warning":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "error":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stream Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Events</p>
                <p className="text-2xl font-bold text-slate-100">
                  {streamMetrics.totalEvents.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Since stream start
                </p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/10">
                <Database className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Throughput</p>
                <p className="text-2xl font-bold text-slate-100">
                  {Number.isInteger(streamMetrics.throughput)
                    ? streamMetrics.throughput
                    : parseFloat(streamMetrics.throughput).toFixed(3)}
                </p>
                <p className="text-xs text-slate-500 mt-1">events/second</p>
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
                <p className="text-sm text-slate-400 mb-1">Latency</p>
                <p className="text-2xl font-bold text-slate-100">
                  {Number.isInteger(streamMetrics.latency)
                    ? streamMetrics.latency
                    : parseFloat(streamMetrics.latency).toFixed(3)}
                  ms
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  avg processing time
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Error Rate</p>
                <p className="text-2xl font-bold text-slate-100">
                  {(streamMetrics.errorRate * 100).toFixed(2)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">last 5 minutes</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stream Sources */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Data Stream Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {streamSources.map((source, index) => (
            <div
              key={index}
              className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={source.enabled}
                    onCheckedChange={(checked) => {
                      setStreamConfig((prev) => ({
                        ...prev,
                        [`${source.name
                          .toLowerCase()
                          .replace(/\s+/g, "")}Enabled`]: checked,
                      }));
                    }}
                  />
                  <div>
                    <h4 className="font-medium text-slate-200">
                      {source.name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {source.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge
                    variant="outline"
                    className={getStatusColor(source.status)}
                  >
                    {source.status}
                  </Badge>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-200">
                      {source.eventsPerSec}/sec
                    </div>
                    <div className="text-xs text-slate-500">events</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Buffer Usage</span>
                  <span className="text-slate-300">
                    {source.buffer.toFixed(1)}%
                  </span>
                </div>
                <Progress value={source.buffer} className="h-2 bg-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      source.buffer > 80
                        ? "bg-gradient-to-r from-red-500 to-orange-500"
                        : source.buffer > 60
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                        : "bg-gradient-to-r from-green-500 to-cyan-500"
                    }`}
                    style={{ width: `${source.buffer}%` }}
                  />
                </Progress>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-slate-800/50 p-1">
          <TabsTrigger
            value="performance"
            className="data-[state=active]:bg-slate-700"
          >
            Performance
          </TabsTrigger>
          <TabsTrigger
            value="connections"
            className="data-[state=active]:bg-slate-700"
          >
            Connections
          </TabsTrigger>
          <TabsTrigger
            value="infrastructure"
            className="data-[state=active]:bg-slate-700"
          >
            Infrastructure
          </TabsTrigger>
          <TabsTrigger
            value="configuration"
            className="data-[state=active]:bg-slate-700"
          >
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 text-lg">
                  Processing Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Processing Queue</span>
                    <span className="text-slate-300">
                      {bufferMetrics.processingQueue} events
                    </span>
                  </div>
                  <Progress
                    value={(bufferMetrics.processingQueue / 500) * 100}
                    className="h-2 bg-slate-700"
                  >
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      style={{
                        width: `${
                          (bufferMetrics.processingQueue / 500) * 100
                        }%`,
                      }}
                    />
                  </Progress>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">
                      Avg Latency
                    </div>
                    <div className="text-lg font-mono text-purple-400">
                      {streamMetrics.latency}ms
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">
                      Peak Throughput
                    </div>
                    <div className="text-lg font-mono text-green-400">
                      2,847/s
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Success Rate</span>
                    <span className="text-green-400">
                      {((1 - streamMetrics.errorRate) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Retry Rate</span>
                    <span className="text-amber-400">0.8%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Dead Letter Queue</span>
                    <span className="text-red-400">3 events</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 text-lg">
                  Event Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                      <span className="text-sm text-slate-400">GPS Events</span>
                    </div>
                    <div className="text-sm font-medium text-slate-200">
                      {streamMetrics.gpsEvents.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm text-slate-400">Telemetry</span>
                    </div>
                    <div className="text-sm font-medium text-slate-200">
                      {streamMetrics.telemetryEvents.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-slate-400">Heartbeats</span>
                    </div>
                    <div className="text-sm font-medium text-slate-200">
                      {streamMetrics.heartbeats.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Data Volume (Last Hour)
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Raw Data</span>
                      <span className="text-slate-300">4.2 GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Compressed</span>
                      <span className="text-slate-300">1.8 GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Stored</span>
                      <span className="text-slate-300">1.6 GB</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-slate-400">Active</span>
                </div>
                <div className="text-xl font-bold text-green-400">
                  {connectionStats.activeConnections}
                </div>
                <div className="text-xs text-slate-500">Connected devices</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Network className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-slate-400">Reconnections</span>
                </div>
                <div className="text-xl font-bold text-amber-400">
                  {connectionStats.reconnections}
                </div>
                <div className="text-xs text-slate-500">Last hour</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-slate-400">Timeouts</span>
                </div>
                <div className="text-xl font-bold text-red-400">
                  {connectionStats.timeouts}
                </div>
                <div className="text-xs text-slate-500">
                  Connection failures
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-slate-400">Data Loss</span>
                </div>
                <div className="text-xl font-bold text-purple-400">
                  {connectionStats.dataLoss.toFixed(2)}%
                </div>
                <div className="text-xs text-slate-500">Packet loss rate</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-800/30 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200 text-lg">
                Connection Quality by Region
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    region: "Downtown",
                    connections: 1247,
                    quality: 98.5,
                    latency: 45,
                  },
                  {
                    region: "University District",
                    connections: 892,
                    quality: 96.2,
                    latency: 67,
                  },
                  {
                    region: "Business Park",
                    connections: 708,
                    quality: 94.8,
                    latency: 89,
                  },
                ].map((region, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-slate-200">
                        {region.region}
                      </div>
                      <div className="text-sm text-slate-400">
                        {region.connections} active connections
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-400">
                        {region.quality}% quality
                      </div>
                      <div className="text-xs text-slate-500">
                        {region.latency}ms avg latency
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 text-lg">
                  System Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span className="text-slate-400">CPU Usage</span>
                    </div>
                    <span className="text-slate-300">67%</span>
                  </div>
                  <Progress value={67} className="h-2 bg-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      style={{ width: "67%" }}
                    />
                  </Progress>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center space-x-2">
                      <MemoryStick className="w-4 h-4 text-purple-400" />
                      <span className="text-slate-400">Memory Usage</span>
                    </div>
                    <span className="text-slate-300">12.4 GB / 32 GB</span>
                  </div>
                  <Progress value={38.75} className="h-2 bg-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      style={{ width: "38.75%" }}
                    />
                  </Progress>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-green-400" />
                      <span className="text-slate-400">Disk Usage</span>
                    </div>
                    <span className="text-slate-300">2.1 TB / 10 TB</span>
                  </div>
                  <Progress value={21} className="h-2 bg-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                      style={{ width: "21%" }}
                    />
                  </Progress>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center space-x-2">
                      <Network className="w-4 h-4 text-amber-400" />
                      <span className="text-slate-400">Network I/O</span>
                    </div>
                    <span className="text-slate-300">847 MB/s</span>
                  </div>
                  <Progress value={42} className="h-2 bg-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                      style={{ width: "42%" }}
                    />
                  </Progress>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 text-lg">
                  Service Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    service: "Stream Processor",
                    status: "healthy",
                    uptime: "99.8%",
                  },
                  {
                    service: "Message Queue",
                    status: "healthy",
                    uptime: "99.9%",
                  },
                  {
                    service: "Database Cluster",
                    status: "healthy",
                    uptime: "99.7%",
                  },
                  {
                    service: "API Gateway",
                    status: "warning",
                    uptime: "98.2%",
                  },
                  {
                    service: "Load Balancer",
                    status: "healthy",
                    uptime: "99.9%",
                  },
                ].map((service, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          service.status === "healthy"
                            ? "bg-green-500"
                            : service.status === "warning"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <span className="text-sm text-slate-300">
                        {service.service}
                      </span>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          service.status === "healthy"
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : service.status === "warning"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }
                      >
                        {service.uptime}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 text-lg">
                  Stream Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300">GPS Stream</Label>
                    <Switch
                      checked={streamConfig.gpsEnabled}
                      onCheckedChange={() => {}}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300">Telemetry Stream</Label>
                    <Switch
                      checked={streamConfig.telemetryEnabled}
                      onCheckedChange={() => {}}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300">Heartbeat Stream</Label>
                    <Switch
                      checked={streamConfig.heartbeatsEnabled}
                      onCheckedChange={() => {}}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700 space-y-3">
                  <div>
                    <Label className="text-sm text-slate-400">Batch Size</Label>
                    <div className="mt-1 bg-slate-900/50 rounded px-3 py-2 text-sm text-slate-300">
                      {streamConfig.batchSize} events
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-400">
                      Flush Interval
                    </Label>
                    <div className="mt-1 bg-slate-900/50 rounded px-3 py-2 text-sm text-slate-300">
                      {streamConfig.flushInterval}ms
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200 text-lg">
                  Processing Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-slate-900/50 rounded-lg">
                    <div className="text-sm font-medium text-slate-200 mb-1">
                      GPS Filtering
                    </div>
                    <div className="text-xs text-slate-400">
                      Filter out GPS coordinates with accuracy &gt; 10m
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg">
                    <div className="text-sm font-medium text-slate-200 mb-1">
                      Telemetry Validation
                    </div>
                    <div className="text-xs text-slate-400">
                      Validate battery levels and speed readings
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg">
                    <div className="text-sm font-medium text-slate-200 mb-1">
                      Duplicate Detection
                    </div>
                    <div className="text-xs text-slate-400">
                      Remove duplicate events within 5-second window
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Rules
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
