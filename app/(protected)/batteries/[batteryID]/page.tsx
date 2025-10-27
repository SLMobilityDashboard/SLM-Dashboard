"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BatteryDetail, DecisionMetrics } from "./types";
import { generateBatteryDetail, calculateDecisionMetrics } from "./mockdata";
import {
  getStatusColor,
  getRecommendationColor,
  getRecommendationLabel,
  getUrgencyColor,
} from "./utils";
import {
  ArrowLeft,
  Download,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// Import tab components
import OverviewTab from "@/components/battery/OverviewTab";
import CellAnalysisTab from "@/components/battery/CellAnalysisTab";
import CapacitySohTab from "@/components/battery/CapacitySohTab";
import ThermalManagementTab from "@/components/battery/ThermalManagementTab";
import ChargingAnalysisTab from "@/components/battery/ChargingAnalysisTab";
import PerformanceTab from "@/components/battery/PerformanceTab";
import LifecycleUsageTab from "@/components/battery/LifecycleUsageTab";
import DecisionSupportPanel from "@/components/battery/DecisionSupportPanel";
import KeyMetricsDashboard from "@/components/battery/KeyMetricsDashboard";
import ScoreCards from "@/components/battery/ScoreCards";

const BatteryDetailAnalytics = () => {
  const [battery, setBattery] = useState<BatteryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setTimeout(() => {
      setBattery(generateBatteryDetail("BMS-BAT-0001"));
      setLoading(false);
    }, 500);
  }, []);

  const decisionMetrics = useMemo(() => {
    if (!battery) return null;
    return calculateDecisionMetrics(battery);
  }, [battery]);

  if (loading || !battery || !decisionMetrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-cyan-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading battery analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">
                {battery.bmsId}
              </h1>
              <p className="text-slate-400">
                Advanced Battery Analytics & Decision Intelligence
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Critical Alerts */}
        {decisionMetrics.recommendation === "immediate_action" && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="text-red-400 font-bold text-lg">
                    IMMEDIATE ACTION REQUIRED
                  </h3>
                  <p className="text-slate-300 text-sm">
                    This battery requires immediate attention. Safety risk
                    detected.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Dashboard */}
        <KeyMetricsDashboard battery={battery} />

        {/* Decision Support Panel */}
        <DecisionSupportPanel
          battery={battery}
          decisionMetrics={decisionMetrics}
        />

        {/* Score Cards */}
        <ScoreCards decisionMetrics={decisionMetrics} />

        {/* Detailed Analytics Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="bg-slate-900/50 border border-slate-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cells">Cell Analysis</TabsTrigger>
            <TabsTrigger value="capacity">Capacity & SOH</TabsTrigger>
            <TabsTrigger value="thermal">Thermal Management</TabsTrigger>
            <TabsTrigger value="charging">Charging Analysis</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="lifecycle">Lifecycle & Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab battery={battery} />
          </TabsContent>

          <TabsContent value="cells">
            <CellAnalysisTab battery={battery} />
          </TabsContent>

          <TabsContent value="capacity">
            <CapacitySohTab battery={battery} />
          </TabsContent>

          <TabsContent value="thermal">
            <ThermalManagementTab battery={battery} />
          </TabsContent>

          <TabsContent value="charging">
            <ChargingAnalysisTab battery={battery} />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTab battery={battery} />
          </TabsContent>

          <TabsContent value="lifecycle">
            <LifecycleUsageTab battery={battery} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BatteryDetailAnalytics;
