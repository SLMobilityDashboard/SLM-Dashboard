"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Zap,
  MapPin,
  Bell,
  Cpu,
  Wifi,
  Database,
  Play,
  Pause,
} from "lucide-react";
import RealtimeDashboard from "./components/realtime-dashboard";
import StreamingData from "./components/streaming-data";
import AlertsMonitoring from "./components/alerts-monitoring";
import LiveMetrics from "./components/live-metrics";
import RealtimeMapModule from "./components/realtime-map-module";

export default function RealtimeAnalytics() {
  const [isStreaming, setIsStreaming] = useState(true);
  const [eventsPerSecond, setEventsPerSecond] = useState(1247);
  const [activeConnections, setActiveConnections] = useState(89);
  const [systemHealth, setSystemHealth] = useState(98.7);
  const [alertCount, setAlertCount] = useState(3);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setEventsPerSecond((prev) =>
        Math.max(800, Math.min(2000, prev + (Math.random() - 0.5) * 100))
      );
      setActiveConnections((prev) =>
        Math.max(50, Math.min(150, prev + (Math.random() - 0.5) * 5))
      );
      setSystemHealth((prev) =>
        Math.max(95, Math.min(100, prev + (Math.random() - 0.5) * 0.5))
      );
      setAlertCount((prev) =>
        Math.max(
          0,
          prev + (Math.random() > 0.9 ? 1 : Math.random() < 0.1 ? -1 : 0)
        )
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const overviewCards = [
    {
      title: "Events/Second",
      value: eventsPerSecond.toLocaleString(),
      icon: Zap,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
      change: isStreaming ? "LIVE" : "PAUSED",
    },
    {
      title: "Active Connections",
      value: activeConnections,
      icon: Wifi,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      change: "+5 vs last hour",
    },
    {
      title: "System Health",
      value: `${systemHealth.toFixed(1)}%`,
      icon: Activity,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      change: "All systems operational",
    },
    {
      title: "Active Alerts",
      value: alertCount,
      icon: Bell,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      change: "2 high priority",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Real-Time Analytics
          </h1>
          <p className="text-slate-400 mt-1">
            Live monitoring and streaming analytics for EV battery swapping
            network
          </p>
        </div>
        <div className="flex items-center space-x-3">
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
            {isStreaming ? "STREAMING" : "STOPPED"}
          </Badge>
          <Button
            onClick={() => setIsStreaming(!isStreaming)}
            className={
              isStreaming
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }
          >
            {isStreaming ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Stop Stream
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Stream
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewCards.map((card) => (
          <Card
            key={card.title}
            className={`bg-slate-900/50 border-slate-800 ${card.borderColor} backdrop-blur-sm`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {Number.isInteger(card.value)
                      ? card.value
                      : parseFloat(card.value).toFixed(3)}
                  </p>
                  <p className="text-xs/ text-slate-500 mt-1">{card.change}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-slate-900/50 p-1 border border-slate-800">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <Activity className="w-4 h-4 mr-2" />
            Live Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="streaming"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <Database className="w-4 h-4 mr-2" />
            Data Streaming
          </TabsTrigger>
          <TabsTrigger
            value="alerts"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <Bell className="w-4 h-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger
            value="metrics"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <Cpu className="w-4 h-4 mr-2" />
            System Metrics
          </TabsTrigger>
          <TabsTrigger
            disabled
            value="location"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Location Tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <RealtimeDashboard isStreaming={isStreaming} />
        </TabsContent>

        <TabsContent value="streaming">
          <StreamingData isStreaming={isStreaming} />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsMonitoring />
        </TabsContent>

        <TabsContent value="metrics">
          <LiveMetrics />
        </TabsContent>

        <TabsContent value="location">
          <RealtimeMapModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}
