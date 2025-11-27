import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ToggleLeft,
  ToggleRight,
  Play,
  ChevronDown,
  ChevronUp,
  TestTube,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react";
import CustomAnalysisBuilder from "./CustomAnalysisBuilder";

const AnalysisConfiguration = ({
  config,
  onChange,
  onRun,
  disabled = false,
  onTestCustomAnalysis,
}) => {
  const [showCustomAnalyses, setShowCustomAnalyses] = useState(false);
  const [customAnalyses, setCustomAnalyses] = useState([]);
  const [enabledCustomAnalyses, setEnabledCustomAnalyses] = useState(new Set());
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(new Set());
  const [showBuilderOverlay, setShowBuilderOverlay] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState(null);

  useEffect(() => {
    // Load custom analyses from memory (since localStorage isn't available)
    // In a real app, this would come from your backend or state management
    const mockCustomAnalyses = [
      {
        id: "custom-1",
        name: "High Idle Time Detection",
        table: "vehicle_daily_distance",
        columns: ["VEHICLE_ID", "IDLE_TIME", "OPERATIONAL_TIME"],
        conditions: [
          {
            id: 1,
            column: "IDLE_TIME",
            operator: ">",
            value: "8",
            logicalOperator: null,
          },
        ],
        insightConfig: {
          type: "efficiency",
          severity: "medium",
          messageTemplate:
            "Vehicle {VEHICLE_ID} has excessive idle time: {IDLE_TIME} hours",
          recommendation: "Review scheduling to improve utilization",
        },
      },
    ];

    setCustomAnalyses(mockCustomAnalyses);
  }, []);

  // Handle body scroll lock when overlay is open
  useEffect(() => {
    if (showBuilderOverlay) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showBuilderOverlay]);

  const toggleCustomAnalysis = (analysisId) => {
    const newEnabled = new Set(enabledCustomAnalyses);
    if (newEnabled.has(analysisId)) {
      newEnabled.delete(analysisId);
    } else {
      newEnabled.add(analysisId);
    }
    setEnabledCustomAnalyses(newEnabled);
  };

  const testCustomAnalysis = async (analysis) => {
    if (!onTestCustomAnalysis) return;

    setTesting((prev) => new Set([...prev, analysis.id]));

    try {
      const result = await onTestCustomAnalysis(analysis, config);
      setTestResults((prev) => ({
        ...prev,
        [analysis.id]: result,
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [analysis.id]: {
          success: false,
          error: error.message,
          insights: [],
        },
      }));
    } finally {
      setTesting((prev) => {
        const newTesting = new Set(prev);
        newTesting.delete(analysis.id);
        return newTesting;
      });
    }
  };

  const openCustomAnalysisBuilder = (analysisToEdit = null) => {
    setEditingAnalysis(analysisToEdit);
    setShowBuilderOverlay(true);
  };

  const closeCustomAnalysisBuilder = () => {
    setShowBuilderOverlay(false);
    setEditingAnalysis(null);
  };

  const handleSaveAnalysis = (analysis) => {
    const existing = customAnalyses;
    const updated =
      analysis.id && existing.find((a) => a.id === analysis.id)
        ? existing.map((a) => (a.id === analysis.id ? analysis : a))
        : [...existing, analysis];

    setCustomAnalyses(updated);
    closeCustomAnalysisBuilder();
  };

  const handleDeleteAnalysis = (id) => {
    const updated = customAnalyses.filter((a) => a.id !== id);
    setCustomAnalyses(updated);

    // Remove from enabled set
    const newEnabled = new Set(enabledCustomAnalyses);
    newEnabled.delete(id);
    setEnabledCustomAnalyses(newEnabled);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-green-400";
      default:
        return "text-slate-400";
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      efficiency: "bg-blue-500",
      maintenance: "bg-orange-500",
      safety: "bg-red-500",
      battery: "bg-green-500",
      routing: "bg-purple-500",
      planning: "bg-cyan-500",
      charging: "bg-yellow-500",
    };
    return colors[type] || "bg-slate-500";
  };

  return (
    <>
      <motion.div
        className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 h-full"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-200">
            Analysis Configuration
          </h3>
          <button
            onClick={() => openCustomAnalysisBuilder()}
            className="flex items-center text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Custom Analysis
          </button>
        </div>

        <div className="space-y-6">
          {/* Time Range Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Time Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "1d", label: "1 Day" },
                { value: "7d", label: "7 Days" },
                { value: "30d", label: "30 Days" },
                { value: "90d", label: "90 Days" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    onChange({ ...config, timeRange: option.value })
                  }
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    config.timeRange === option.value
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Built-in Data Sources */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Data Sources
            </label>
            <div className="space-y-2">
              {Object.entries(config.includedTables).map(([table, enabled]) => {
                const labels = {
                  vehicle_daily_distance: "vehicle_daily_distance",
                  route_metrics: "Route Metrics",
                  battery_health: "Battery Health",
                  alert_logs: "Alert Logs",
                };

                return (
                  <motion.div
                    key={table}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/30 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-3 ${
                          enabled ? "bg-cyan-400" : "bg-slate-600"
                        }`}
                      />
                      <span className="text-slate-200 font-medium">
                        {labels[table]}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        onChange({
                          ...config,
                          includedTables: {
                            ...config.includedTables,
                            [table]: !enabled,
                          },
                        })
                      }
                    >
                      {enabled ? (
                        <ToggleRight className="w-6 h-6 text-cyan-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-500" />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Custom Analyses Section */}
          {customAnalyses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-300">
                  Custom Analyses ({customAnalyses.length})
                </label>
                <button
                  onClick={() => setShowCustomAnalyses(!showCustomAnalyses)}
                  className="text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showCustomAnalyses ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              <AnimatePresence>
                {showCustomAnalyses && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {customAnalyses.map((analysis) => {
                      const isEnabled = enabledCustomAnalyses.has(analysis.id);
                      const isTesting = testing.has(analysis.id);
                      const testResult = testResults[analysis.id];

                      return (
                        <motion.div
                          key={analysis.id}
                          className="bg-slate-900/50 rounded-lg p-4 border border-slate-600"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <button
                                  onClick={() =>
                                    openCustomAnalysisBuilder(analysis)
                                  }
                                  className="text-slate-200 font-medium text-sm hover:text-cyan-400 transition-colors"
                                >
                                  {analysis.name}
                                </button>
                                <div
                                  className={`w-2 h-2 rounded-full ${getTypeColor(
                                    analysis.insightConfig.type
                                  )}`}
                                />
                                <span
                                  className={`text-xs ${getSeverityColor(
                                    analysis.insightConfig.severity
                                  )}`}
                                >
                                  {analysis.insightConfig.severity.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mb-2">
                                Table: {analysis.table} • Columns:{" "}
                                {analysis.columns.length} • Conditions:{" "}
                                {analysis.conditions.length}
                              </p>
                              <p className="text-xs text-slate-300">
                                {analysis.insightConfig.messageTemplate}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => testCustomAnalysis(analysis)}
                                disabled={isTesting || disabled}
                                className={`p-1 rounded transition-colors ${
                                  isTesting
                                    ? "text-slate-500 cursor-not-allowed"
                                    : "text-slate-400 hover:text-cyan-400"
                                }`}
                                title="Test Analysis"
                              >
                                <TestTube className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() =>
                                  handleDeleteAnalysis(analysis.id)
                                }
                                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                                title="Delete Analysis"
                              >
                                <X className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() =>
                                  toggleCustomAnalysis(analysis.id)
                                }
                                disabled={disabled}
                              >
                                {isEnabled ? (
                                  <ToggleRight className="w-5 h-5 text-cyan-400" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5 text-slate-500" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Test Results */}
                          <AnimatePresence>
                            {testResult && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 pt-3 border-t border-slate-700"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {testResult.success ? (
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-400" />
                                  )}
                                  <span className="text-xs font-medium text-slate-300">
                                    Test Results
                                  </span>
                                </div>

                                {testResult.success ? (
                                  <div className="text-xs text-slate-400 space-y-1">
                                    <div>
                                      Sample Size: {testResult.sampleSize} rows
                                    </div>
                                    <div>
                                      Matching Records:{" "}
                                      {testResult.matchingRows}
                                    </div>
                                    <div>
                                      Insights Generated:{" "}
                                      {testResult.insights.length}
                                    </div>
                                    {testResult.insights.length > 0 && (
                                      <div className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-600">
                                        <div className="text-slate-300 font-medium mb-1">
                                          Sample Insight:
                                        </div>
                                        <div className="text-slate-400">
                                          {testResult.insights[0].message}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs text-red-400">
                                    Error: {testResult.error}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {isTesting && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-3 flex items-center gap-2 text-xs text-slate-400"
                            >
                              <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                              Testing analysis...
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {Object.values(config.includedTables).filter(Boolean).length}
              </div>
              <div className="text-xs text-slate-500">Built-in Sources</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {enabledCustomAnalyses.size}
              </div>
              <div className="text-xs text-slate-500">Custom Analyses</div>
            </div>
          </div>

          {/* Run Analysis Button */}
          <motion.button
            onClick={onRun}
            disabled={disabled}
            className={`w-full py-3 rounded-lg font-medium transition-all ${
              disabled
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-105"
            }`}
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
          >
            <Play className="w-4 h-4 inline mr-2" />
            {disabled ? "Analysis Running..." : "Run Analysis"}
          </motion.button>

          {/* Enabled Analyses Summary */}
          {(Object.values(config.includedTables).some(Boolean) ||
            enabledCustomAnalyses.size > 0) && (
            <div className="text-xs text-slate-500 text-center">
              {Object.values(config.includedTables).filter(Boolean).length}{" "}
              built-in + {enabledCustomAnalyses.size} custom analyses enabled
            </div>
          )}
        </div>
      </motion.div>

      {/* Custom Analysis Builder Overlay */}
      <AnimatePresence>
        {showBuilderOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeCustomAnalysisBuilder();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-[80vw] h-[80vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CustomAnalysisBuilder
                existingAnalysis={editingAnalysis}
                onSave={handleSaveAnalysis}
                onCancel={closeCustomAnalysisBuilder}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AnalysisConfiguration;
