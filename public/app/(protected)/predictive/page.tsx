"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Zap,
  Target,
  Activity,
  Plus,
  Settings,
} from "lucide-react";
import PredictiveQueryBuilder from "./components/predictive-query-builder";
import ModelTraining from "./components/model-training";
import ForecastingDashboard from "./components/forecasting-dashboard";
import AnomalyDetection from "./components/anomaly-detection";
import ModelPerformance from "./components/model-performance";
import PredictiveInsights from "./components/predictive-insights";

export default function PredictiveAnalytics() {
  const [activeModels, setActiveModels] = useState(12);
  const [totalPredictions, setTotalPredictions] = useState(45678);
  const [accuracy, setAccuracy] = useState(94.2);
  const [anomaliesDetected, setAnomaliesDetected] = useState(23);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalPredictions((prev) => prev + Math.floor(Math.random() * 10));
      setAccuracy((prev) =>
        Math.max(90, Math.min(99, prev + (Math.random() - 0.5) * 0.5))
      );
      setAnomaliesDetected((prev) => prev + (Math.random() > 0.8 ? 1 : 0));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const overviewCards = [
    {
      title: "Active Models",
      value: activeModels,
      icon: Brain,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
      change: "+2 this week",
    },
    {
      title: "Total Predictions",
      value: totalPredictions.toLocaleString(),
      icon: TrendingUp,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      change: "+12% vs last month",
    },
    {
      title: "Model Accuracy",
      value: `${accuracy.toFixed(1)}%`,
      icon: Target,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      change: "+0.3% improvement",
    },
    {
      title: "Anomalies Detected",
      value: anomaliesDetected,
      icon: AlertTriangle,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      change: "3 new alerts",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Predictive Analytics
          </h1>
          <p className="text-slate-400 mt-1">
            AI-powered insights and forecasting for EV battery swapping network
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-400 border-green-500/30"
          >
            <Activity className="w-3 h-3 mr-1" />
            All Systems Operational
          </Badge>
          <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Model
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
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{card.change}</p>
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
      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList className="bg-slate-900/50 p-1 border border-slate-800">
          <TabsTrigger
            value="builder"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <Brain className="w-4 h-4 mr-2" />
            Model Builder
          </TabsTrigger>
          <TabsTrigger
            value="training"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <Settings className="w-4 h-4 mr-2" />
            Training
          </TabsTrigger>
          <TabsTrigger
            value="forecasting"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Forecasting
          </TabsTrigger>
          <TabsTrigger
            value="anomaly"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Anomaly Detection
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <Zap className="w-4 h-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <PredictiveQueryBuilder />
        </TabsContent>

        <TabsContent value="training">
          <ModelTraining />
        </TabsContent>

        <TabsContent value="forecasting">
          <ForecastingDashboard />
        </TabsContent>

        <TabsContent value="anomaly">
          <AnomalyDetection />
        </TabsContent>

        <TabsContent value="performance">
          <ModelPerformance />
        </TabsContent>

        <TabsContent value="insights">
          <PredictiveInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
}
