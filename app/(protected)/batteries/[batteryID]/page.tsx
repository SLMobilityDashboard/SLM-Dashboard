"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Battery,
  RefreshCw,
  AlertTriangle,
  Activity,
  Percent,
  TrendingUp,
  PlugZap,
  Wrench,
  Thermometer,
  Zap,
  Loader2,
  Info,
  AlertCircle,
} from "lucide-react";
import { TabsTrigger, Tabs, TabsContent, TabsList } from "@/components/ui/tabs";

import OverviewTab from "@/components/battery/OverviewTab";
import CellAnalysisTab from "@/components/battery/CellAnalysisTab";
import CapacitySohTab from "@/components/battery/CapacitySohTab";
import BatteryHistoryByBattery from "@/components/battery/BatteryHistoryByBattery";
import SwapManagementTab from "@/components/battery/SwapManagementTab";
import BatteryHomeChargingHistory from "@/components/battery/BatteryHomeChargingHistory";
import { useParams } from "next/navigation";

// Import health score utilities
import {
  calculateComprehensiveHealth,
  calculateTimeMetrics,
  parseCellVoltages,
  getHealthColor,
  getAnomalyBadgeColor,
  type Anomaly,
} from "@/utils/batteryHealthScore";

interface BatteryAnalyticsData {
  bmsId: string;
  batteryId: string;
  serialNo: string;
  vendorName: string;
  vendorCountry: string;
  batteryTypeName: string;
  batteryCapacity: string;
  manufactureDate: string;
  tboxId: string;
  batVolt: number;
  batCurrent: number;
  batTemp: number;
  batSOH: number;
  batCycleCount: number;
  batteryError: string;
  lastTelemetryTime: string;
  lastPulseTime: string;
  totalDistanceTraveled: number;
  avgDistancePerCycle: number;
  dataIngestionTime: string;
  bssSingleVol: string;
  bssVoltageTimestamp: string;
  telemetryStatus: string;
  telemetryAgeHours: number;
  dataSource: string;
  status: string;
}

const BatteryDetailAnalytics = () => {
  const params = useParams();
  const bmsId = params.batteryID as string;

  const [batteryData, setBatteryData] = useState<BatteryAnalyticsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchBatteryData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/testquery`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sql: `
                SELECT 
                  "bmsId",
                  "batteryId",
                  "serialNo",
                  "vendorName",
                  "vendorCountry",
                  "batteryTypeName",
                  "batteryCapacity",
                  "manufactureDate",
                  "tboxId",
                  "batVolt",
                  "batCurrent",
                  "batTemp",
                  "batSOH",
                  "batCycleCount",
                  "batteryError",
                  "lastTelemetryTime",
                  "lastPulseTime",
                  "totalDistanceTraveled",
                  "avgDistancePerCycle",
                  "dataIngestionTime",
                  "bssSingleVol",
                  "bssVoltageTimestamp",
                  "telemetryStatus",
                  "telemetryAgeHours",
                  "dataSource",
                  "status"
                FROM REPORT_DB.BMS_ANALYTICS.BATTERY_ANALYTICS
                WHERE "bmsId" = '${bmsId}'
                ORDER BY "dataIngestionTime" DESC
                LIMIT 1
              `,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("No battery data found for this BMS ID");
        }

        setBatteryData(data[0]);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "An unknown error occurred while fetching battery data";
        setError(errorMessage);
        console.error("Error fetching battery data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (bmsId) {
      fetchBatteryData();
    }
  }, [bmsId]);

  // Calculate health score and anomalies using the utility
  const healthData = useMemo(() => {
    if (!batteryData) {
      return { anomalies: [], healthScore: 0 };
    }

    // Parse cell voltages
    const cellVoltages = parseCellVoltages(batteryData.bssSingleVol);

    // Calculate time metrics
    const timeMetrics = calculateTimeMetrics(batteryData.lastPulseTime);

    // Calculate comprehensive health with anomalies
    return calculateComprehensiveHealth({
      batSOH: batteryData.batSOH,
      batteryError: batteryData.batteryError,
      batCycleCount: batteryData.batCycleCount,
      cellVoltages: cellVoltages,
      telemetryStatus: batteryData.telemetryStatus,
      telemetryAgeHours: batteryData.telemetryAgeHours,
      avgDistancePerCycle: batteryData.avgDistancePerCycle,
      hoursSinceLastPulse: timeMetrics.hoursSinceLastPulse,
      offlineDuration: timeMetrics.offlineDuration,
      dataSource: batteryData.dataSource as any,
    });
  }, [batteryData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading battery analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="bg-slate-900/50 border-slate-800 max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-semibold text-slate-200">
                Error Loading Battery Data
              </h3>
              <p className="text-slate-400">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!batteryData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="bg-slate-900/50 border-slate-800 max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Battery className="h-12 w-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-semibold text-slate-200">
                No Battery Data Available
              </h3>
              <p className="text-slate-400">
                No data found for BMS ID: {bmsId}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { anomalies, healthScore } = healthData;
  const hasDistanceData =
    batteryData.totalDistanceTraveled && batteryData.totalDistanceTraveled > 0;

  // Filter critical and warning anomalies for the alert
  const criticalAnomalies = anomalies.filter((a) => a.type === "critical");
  const warningAnomalies = anomalies.filter((a) => a.type === "warning");
  const infoAnomalies = anomalies.filter((a) => a.type === "info");

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8 p-2">
        {/* Header Section */}
        <div className="text-center space-y-6 pt-8">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <Battery className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">
              Battery Management System
            </span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Battery Analytics Dashboard
          </h1>

          <div className="space-y-2">
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Comprehensive health monitoring and performance insights
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="font-mono text-lg text-cyan-300">{bmsId}</span>
              <Badge
                variant="outline"
                className={
                  batteryData.telemetryStatus === "ONLINE"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : batteryData.telemetryStatus === "STALE"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }
              >
                {batteryData.telemetryStatus || "UNKNOWN"}
              </Badge>
              {batteryData.vendorName && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 text-sm">
                    {batteryData.vendorName}
                  </span>
                </>
              )}
              {batteryData.batteryTypeName && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 text-sm">
                    {batteryData.batteryTypeName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Distance Data Info Alert */}
        {!hasDistanceData && (
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-blue-400 font-semibold text-sm mb-1">
                    Distance Tracking Not Available
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Distance tracking data is currently unavailable for this
                    battery. Metrics are based on charge cycles and health
                    indicators.
                  </p>
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
                  className={`${
                    anomalies.length > 0
                      ? "border-red-500/30 text-red-400"
                      : "border-slate-700 text-slate-400"
                  } text-xs`}
                >
                  {anomalies.length}{" "}
                  {anomalies.length === 1 ? "issue" : "issues"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-400">
                  Health Score
                </p>
                <p
                  className={`text-3xl font-bold ${getHealthColor(
                    healthScore
                  )}`}
                >
                  {healthScore > 0 ? healthScore : "N/A"}
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
                  {batteryData.batSOH || 0}%
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
                  {batteryData.batCycleCount || 0}
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
                  {hasDistanceData ? "Total" : "N/A"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-400">
                  Distance Traveled
                </p>
                {hasDistanceData ? (
                  <>
                    <p className="text-3xl font-bold text-slate-100">
                      {batteryData.totalDistanceTraveled.toFixed(1)}{" "}
                      <span className="text-xl">km</span>
                    </p>
                    <p className="text-xs text-slate-500">Lifetime distance</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-slate-500">—</p>
                    <p className="text-xs text-slate-500">Not tracked</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Battery Errors & Warnings Box - Placed right above tabs */}
        {(criticalAnomalies.length > 0 ||
          warningAnomalies.length > 0 ||
          infoAnomalies.length > 0) && (
          <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-slate-200">
                  Battery Errors & Warnings
                </h3>
                <div className="flex-1"></div>
                <Badge
                  variant="outline"
                  className={
                    criticalAnomalies.length > 0
                      ? "border-red-500/30 text-red-400"
                      : warningAnomalies.length > 0
                      ? "border-amber-500/30 text-amber-400"
                      : "border-blue-500/30 text-blue-400"
                  }
                >
                  {criticalAnomalies.length > 0
                    ? `${criticalAnomalies.length} Critical`
                    : warningAnomalies.length > 0
                    ? `${warningAnomalies.length} Warnings`
                    : `${infoAnomalies.length} Notices`}
                </Badge>
              </div>

              <div className="space-y-4">
                {/* Critical Anomalies */}
                {criticalAnomalies.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                      <h4 className="text-red-400 font-medium text-sm">
                        Critical Issues ({criticalAnomalies.length})
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                      {criticalAnomalies.map((anomaly, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg"
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-300">
                              {anomaly.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warning Anomalies */}
                {warningAnomalies.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                      <h4 className="text-amber-400 font-medium text-sm">
                        Warnings ({warningAnomalies.length})
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                      {warningAnomalies.map((anomaly, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-300">
                              {anomaly.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info Anomalies */}
                {infoAnomalies.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <h4 className="text-blue-400 font-medium text-sm">
                        Notices ({infoAnomalies.length})
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                      {infoAnomalies.map((anomaly, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg"
                        >
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-300">
                              {anomaly.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Last updated:{" "}
                    {new Date(batteryData.dataIngestionTime).toLocaleString()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    onClick={() => setActiveTab("overview")}
                  >
                    View Detailed Analysis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs Section */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full mx-auto grid-cols-7 bg-slate-900/50 border border-slate-700 rounded-lg">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
            >
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>

            <TabsTrigger
              value="cells"
                disabled
                className="
                  data-[state=active]:bg-slate-800
                  data-[state=active]:text-slate-100
                  disabled:opacity-50
                  disabled:cursor-not-allowed"
            >
              <Battery className="w-4 h-4 mr-2" />
              Cell & Cycle
            </TabsTrigger>

            <TabsTrigger
              value="sessions"
              className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
            >
              <Zap className="w-4 h-4 mr-2" />
              Sessions
            </TabsTrigger>

            <TabsTrigger
              value="swaps"
              className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
            >
              <Thermometer className="w-4 h-4 mr-2" />
              Swaps
            </TabsTrigger>

            <TabsTrigger
              value="charging"
                disabled
                className="
                  data-[state=active]:bg-slate-800
                  data-[state=active]:text-slate-100
                  disabled:opacity-50
                  disabled:cursor-not-allowed"
            >
              <PlugZap className="w-4 h-4 mr-2" />
              Home Charging
            </TabsTrigger>

            <TabsTrigger
              value="charge"
              className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Charging
            </TabsTrigger>

            <TabsTrigger
              value="maintenance"
                disabled
                className="
                  data-[state=active]:bg-slate-800
                  data-[state=active]:text-slate-100
                  disabled:opacity-50
                  disabled:cursor-not-allowed"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Maintenance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <OverviewTab
              bmsId={bmsId}
              batteryData={batteryData}
              anomalies={anomalies}
              healthScore={healthScore}
            />
          </TabsContent>

          <TabsContent value="cells" className="mt-0">
            <div className="p-8 text-center text-slate-400">
              <Battery className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-lg">Cell Analysis is under development.</p>
              <p className="text-sm">Please check back later.</p>
            </div>
            {/* <CellAnalysisTab /> */}
          </TabsContent>

          <TabsContent value="sessions" className="mt-0">
            <CapacitySohTab BMSID={bmsId} />
          </TabsContent>

          <TabsContent value="swaps" className="mt-0">
            <SwapManagementTab BMSID={bmsId} />
          </TabsContent>

          <TabsContent value="charging" className="mt-0">
            <div className="p-8 text-center text-slate-400">
              <PlugZap className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-lg">Home Charging is under development.</p>
              <p className="text-sm">Please check back later.</p>
            </div>
            {/* <BatteryHomeChargingHistory BMSID={bmsId} /> */}
          </TabsContent>

          <TabsContent value="charge" className="mt-0">
            <BatteryHistoryByBattery BMSID={bmsId} />
          </TabsContent>

          <TabsContent value="maintenance" className="mt-0">
            <div className="p-8 text-center text-slate-400">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-lg">Lifecycle Usage is under development.</p>
              <p className="text-sm">Please check back later.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BatteryDetailAnalytics;
