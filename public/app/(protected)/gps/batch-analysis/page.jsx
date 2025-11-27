"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Clock,
  Database,
  TrendingUp,
  Play,
  History,
  CheckCircle2,
  AlertCircle,
  Activity,
  Settings,
  Eye,
} from "lucide-react";

import DataAnalysisService from "./Services/DataAnalysisService";
import AnalysisConfiguration from "./components/AnalysisConfiguration";
import InsightsViewer from "./components/InsightsViewer";
import AnalysisHistoryItem from "./components/AnalysisHistoryItem";
import { NotificationBanner } from "./components/NotificationBanner";

export default function BatchReportsPage() {
  const [activeTab, setActiveTab] = useState("configure");
  const [analysisConfig, setAnalysisConfig] = useState({
    timeRange: "7d",
    includedTables: {
      vehicle_daily_distance: true,
      route_metrics: false,
      battery_health: false,
      alert_logs: false,
    },
  });
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [notification, setNotification] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const progressRef = useRef(null);

  useEffect(() => {
    const updateHistory = (history) => {
      setAnalysisHistory(history);

      if (history.length > 0) {
        const latest = history[0];
        if (latest.progress) {
          setAnalysisProgress(latest.progress);
        }

        if (latest.status === "completed") {
          setCurrentAnalysis(latest);
          // Auto-switch to insights tab after 1 second when analysis completes
          setTimeout(() => {
            setActiveTab("insights");
          }, 1000);
        }
      }
    };

    updateHistory(DataAnalysisService.getAllAnalyses());
    DataAnalysisService.addListener(updateHistory);

    return () => {
      DataAnalysisService.removeListener(updateHistory);
    };
  }, []);

  const handleRunAnalysis = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setNotification({ message: "Analysis started...", type: "info" });
      setCurrentAnalysis(null);

      const result = await DataAnalysisService.analyzeData(
        analysisConfig,
        (progress) => {
          setAnalysisProgress(progress);
        }
      );

      setCurrentAnalysis(result);
      setNotification({
        message: "Analysis completed successfully!",
        type: "success",
      });
    } catch (error) {
      setNotification({
        message: `Analysis failed: ${error.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeRangeLabel = (timeRange) => {
    const labels = {
      "1d": "1 day",
      "7d": "7 days",
      "30d": "30 days",
      "90d": "90 days",
    };
    return labels[timeRange] || "Custom range";
  };

  const getActiveTablesCount = () =>
    Object.values(analysisConfig.includedTables).filter(Boolean).length;

  const getCurrentTableName = () =>
    analysisProgress?.currentTable?.replace(/_/g, " ") ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
          <Activity className="h-4 w-4 text-cyan-400 mr-2" />
          <span className="text-cyan-400 text-sm font-medium">
            Intelligent Fleet Analysis
          </span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Batch Data Analysis
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Analyze your fleet data in bulk to uncover insights, trends, and
          patterns for business decisions.
        </p>
      </div>

      <NotificationBanner className="my-6" notification={notification} />

      {/* Three Tab Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 border border-slate-700/50">
          <TabsTrigger
            value="configure"
            className="flex items-center space-x-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
          >
            <Settings className="w-4 h-4" />
            <span>Configure & Run</span>
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="flex items-center space-x-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
            disabled={!currentAnalysis}
          >
            <Eye className="w-4 h-4" />
            <span>Insights</span>
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex items-center space-x-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        {/* Configure & Run Tab */}
        <TabsContent value="configure" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <AnalysisConfiguration
              config={analysisConfig}
              onChange={setAnalysisConfig}
              onRun={handleRunAnalysis}
              disabled={!!analysisProgress && analysisProgress.percent < 100}
            />

            {/* Progress Panel */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Analysis Progress
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Real-time analysis status and results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {analysisProgress ? (
                    <motion.div
                      key="progress"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      {/* Main Progress */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 font-medium">
                            {analysisProgress.status}
                          </span>
                          <span className="text-2xl font-bold text-cyan-400">
                            {Math.round(analysisProgress.percent)}%
                          </span>
                        </div>
                        <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-lg shadow-cyan-500/30"
                            initial={{ width: "0%" }}
                            animate={{
                              width: `${analysisProgress.percent}%`,
                            }}
                            transition={{ type: "spring", damping: 15 }}
                          />
                        </div>
                      </div>

                      {/* Current Table Being Processed */}
                      {analysisProgress.currentTable && (
                        <motion.div
                          className="bg-gradient-to-r from-slate-800/70 to-slate-900/70 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm"
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                              <Database className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-300 mb-1">
                                Processing Table
                              </p>
                              <p className="text-lg font-semibold text-cyan-400 capitalize">
                                {getCurrentTableName()}
                              </p>
                              {analysisProgress.processedRows > 0 && (
                                <motion.p
                                  className="text-sm text-slate-400 mt-1"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  Processed{" "}
                                  <span className="font-medium text-slate-300">
                                    {analysisProgress.processedRows.toLocaleString()}
                                  </span>{" "}
                                  rows
                                </motion.p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-slate-400">
                              Tables Selected
                            </p>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                          </div>
                          <p className="text-2xl font-bold text-cyan-400">
                            {getActiveTablesCount()}{" "}
                            <span className="text-lg text-slate-500">/4</span>
                          </p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-slate-400">Time Range</p>
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          </div>
                          <p className="text-2xl font-bold text-blue-400">
                            {getTimeRangeLabel(analysisConfig.timeRange)}
                          </p>
                        </div>
                      </div>

                      {/* Completion Message */}
                      {analysisProgress.percent === 100 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center py-4"
                        >
                          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                          <p className="text-green-400 font-medium">
                            Analysis Complete! Switch to insights...
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-12"
                    >
                      <div className="p-6 bg-slate-800/50 rounded-2xl mb-6 border border-slate-700/50 mx-auto w-fit">
                        <TrendingUp className="w-12 h-12 text-slate-500" />
                      </div>
                      <h4 className="text-xl font-semibold text-slate-300 mb-2">
                        Ready for Analysis
                      </h4>
                      <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                        Configure your analysis parameters and click "Run
                        Analysis" to begin
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6 mt-6">
          {currentAnalysis ? (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Analysis Results
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Insights and patterns from your fleet data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-sm mb-1">
                      Insights Found
                    </div>
                    <div className="text-xl font-bold text-cyan-400">
                      {currentAnalysis.insights?.length || 0}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-sm mb-1">
                      Data Sources
                    </div>
                    <div className="text-xl font-bold text-cyan-400">
                      {getActiveTablesCount()}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-sm mb-1">
                      Time Range
                    </div>
                    <div className="text-xl font-bold text-cyan-400">
                      {getTimeRangeLabel(analysisConfig.timeRange)}
                    </div>
                  </div>
                </div>

                <Separator className="my-4 bg-slate-700/50" />

                <InsightsViewer insights={currentAnalysis.insights} />
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <div className="p-6 bg-slate-800/50 rounded-2xl mb-6 border border-slate-700/50 mx-auto w-fit">
                  <Eye className="w-12 h-12 text-slate-500" />
                </div>
                <h4 className="text-xl font-semibold text-slate-300 mb-2">
                  No Analysis Results
                </h4>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                  Run an analysis from the Configure & Run tab to view insights
                  here
                </p>
                <Button
                  onClick={() => setActiveTab("configure")}
                  className="mt-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/20"
                >
                  Go to Configuration
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6 mt-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>Analysis History</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                View and manage your previous analysis runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisHistory.length > 0 ? (
                <div className="space-y-4">
                  {analysisHistory.map((analysis, index) => (
                    <AnalysisHistoryItem
                      key={analysis.id || index}
                      analysis={analysis}
                      onSelect={(selectedAnalysis) => {
                        setCurrentAnalysis(selectedAnalysis);
                        setActiveTab("insights");
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-6 bg-slate-800/50 rounded-2xl mb-6 border border-slate-700/50 mx-auto w-fit">
                    <History className="w-12 h-12 text-slate-500" />
                  </div>
                  <h4 className="text-xl font-semibold text-slate-300 mb-2">
                    No Analysis History
                  </h4>
                  <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                    Your completed analyses will appear here for future
                    reference
                  </p>
                  <Button
                    onClick={() => setActiveTab("configure")}
                    className="mt-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/20"
                  >
                    Start First Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
