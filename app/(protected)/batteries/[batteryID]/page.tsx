"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Battery,
  ArrowLeft,
  Download,
  Share2,
  RefreshCw,
  AlertTriangle,
  Activity,
  Percent,
  TrendingUp,
  ThermometerSun,
  PlugZap,
  Wrench,
  Thermometer,
  Zap,
  FileText,
} from "lucide-react";
import { TabsTrigger, Tabs, TabsContent, TabsList } from "@/components/ui/tabs";

import OverviewTab from "@/components/battery/OverviewTab";
import CellAnalysisTab from "@/components/battery/CellAnalysisTab";
import CapacitySohTab from "@/components/battery/CapacitySohTab";
import ThermalManagementTab from "@/components/battery/ThermalManagementTab";
import ChargingAnalysisTab from "@/components/battery/ChargingAnalysisTab";
import BatteryHistoryByBattery from "@/components/battery/PerformanceTab";
import LifecycleUsageTab from "@/components/battery/LifecycleUsageTab";
import SwapManagementTab from "@/components/battery/SwapManagementTab";

// Mock data
const battery = {
  bmsId: "BT106003012MT00221017822",
  manufacturer: "EcoPower Systems",
  chemistry: "Li-ion",
  status: "online",
  healthScore: 86,
  soc: 75,
  soh: 95,
  totalCycles: 15,
  totalDistance: 44,
};

const BatteryDetailAnalytics = () => {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshed] = useState(new Date());
  const [refreshCount] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");

  const formatTimeAgo = (date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const getHealthColor = (health) => {
    if (health >= 80) return "text-green-400";
    if (health >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8 p-2">
        {/* Header Section - Matching Vehicle Page Design */}
        <div className="text-center space-y-6 pt-8">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <Battery className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">
              Battery Management System
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Battery Analytics Dashboard
          </h1>

          {/* Subtitle with Battery ID */}
          <div className="space-y-2">
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Comprehensive health monitoring and performance insights
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="font-mono text-lg text-cyan-300">
                {battery.bmsId}
              </span>
              <Badge
                variant="outline"
                className={
                  battery.status === "online"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }
              >
                {battery.status.toUpperCase()}
              </Badge>
              {battery.manufacturer && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 text-sm">
                    {battery.manufacturer}
                  </span>
                </>
              )}
              {battery.chemistry && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 text-sm">
                    {battery.chemistry}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Critical Alert (conditional) */}
        {battery.healthScore < 70 && (
          <Card className="bg-gradient-to-r from-red-500/10 via-orange-500/5 to-red-500/10 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 animate-pulse" />
                  <div>
                    <h3 className="text-red-400 font-bold text-lg">
                      ⚠️ IMMEDIATE ACTION REQUIRED
                    </h3>
                    <p className="text-slate-300 text-sm">
                      Critical safety risk detected. This battery requires
                      immediate attention.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-400 text-red-400 hover:bg-red-500/10"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-cyan-500/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Activity className="h-5 w-5 text-cyan-400" />
                </div>
                <Badge
                  variant="outline"
                  className="border-slate-700 text-slate-400 text-xs"
                >
                  Live
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-400">
                  Health Score
                </p>
                <p
                  className={`text-3xl font-bold ${getHealthColor(
                    battery.healthScore
                  )}`}
                >
                  {battery.healthScore}
                </p>
                <p className="text-xs text-slate-500">Overall health status</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-green-500/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Percent className="h-5 w-5 text-green-400" />
                </div>
                <Badge
                  variant="outline"
                  className="border-slate-700 text-slate-400 text-xs"
                >
                  SOH
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-400">
                  State of Health
                </p>
                <p className="text-3xl font-bold text-slate-100">
                  {battery.soh}%
                </p>
                <p className="text-xs text-slate-500">Battery capacity</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-purple-500/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-purple-400" />
                </div>
                <Badge
                  variant="outline"
                  className="border-slate-700 text-slate-400 text-xs"
                >
                  Total
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-400">
                  Charge Cycles
                </p>
                <p className="text-3xl font-bold text-slate-100">
                  {battery.totalCycles}
                </p>
                <p className="text-xs text-slate-500">Completed cycles</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-blue-500/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <Badge
                  variant="outline"
                  className="border-slate-700 text-slate-400 text-xs"
                >
                  Total
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-400">
                  Distance Traveled
                </p>
                <p className="text-3xl font-bold text-slate-100">
                  {battery.totalDistance} <span className="text-xl">km</span>
                </p>
                <p className="text-xs text-slate-500">Lifetime distance</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section - Fixed */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6 content-center"
        >
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full mx-auto grid-cols-7 bg-slate-900/50 border border-slate-700 rounded-lg">
              <TabsTrigger
                value="overview"
                className="tab data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
              >
                <Activity className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>

              <TabsTrigger
                value="cells"
                className="tab data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
              >
                <Battery className="w-4 h-4 mr-2" />
                Cell and Cycle
              </TabsTrigger>

              <TabsTrigger
                value="sessions"
                className="tab data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
              >
                <Zap className="w-4 h-4 mr-2" />
                Battery Session
              </TabsTrigger>

              <TabsTrigger
                value="swaps"
                className="tab data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
              >
                <Thermometer className="w-4 h-4 mr-2" />
                Swaps
              </TabsTrigger>

              <TabsTrigger
                value="charging"
                className="tab data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
              >
                <PlugZap className="w-4 h-4 mr-2" />
                Home Charging
              </TabsTrigger>

              <TabsTrigger
                value="charge"
                className="tab data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Charge patterns
              </TabsTrigger>

              <TabsTrigger
                value="maintenance"
                className="tab data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Maintenance
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Contents */}
          <TabsContent value="overview" className="mt-0">
            <OverviewTab battery={battery} />
          </TabsContent>

          <TabsContent value="cells" className="mt-0">
            <CellAnalysisTab />
            {/* <div className="p-4 text-slate-400">
              Cell Analysis is under development. Please check back later.
            </div> */}
          </TabsContent>

          <TabsContent value="sessions" className="mt-0">
            <CapacitySohTab BMSID={"BT106003012MT00230884121"} />
            {/* <div className="p-4 text-slate-400">
              Capacity SOH is under development. Please check back later.
            </div> */}
          </TabsContent>

          <TabsContent value="swaps" className="mt-0">
            <SwapManagementTab BMSID={"BT106003012MT00230884121"} />
            {/* <div className="p-4 text-slate-400">
              Thermal Management is under development. Please check back later.
            </div> */}
          </TabsContent>

          <TabsContent value="charging" className="mt-0">
            {/* <ChargingAnalysisTab batteryData={battery} /> */}
            <div className="p-4 text-slate-400">
              Home Charging is under development. Please check back later.
            </div>
          </TabsContent>

          <TabsContent value="charge" className="mt-0">
            <BatteryHistoryByBattery BMSID={battery.BMSID} />
            {/* <div className="p-4 text-slate-400">
              Performance is under development. Please check back later.
            </div> */}
          </TabsContent>

          <TabsContent value="maintenance" className="mt-0">
            {/* <LifecycleUsageTab batteryData={battery} /> */}
            <div className="p-4 text-slate-400">
              Lifecycle Usage is under development. Please check back later.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BatteryDetailAnalytics;
