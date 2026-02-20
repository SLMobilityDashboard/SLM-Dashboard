// ============================================================================
// MAIN COMPONENT
// ============================================================================

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Battery,
  RefreshCw,
  Activity,
  Gauge,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  TrendingUp,
  Shield,
  Layers,
} from "lucide-react";
import Router from "next/router";
import {
  useBatteryTelemetry,
  BatteryTelemetry,
} from "@/hooks/useBatteryTelemetry";
import {
  BatteryFilter,
  BatteryFilterState,
} from "@/components/batteries/BatteryFilters";
import KPICard from "@/components/batteries/kpi-card";
import BatteryCard from "@/components/batteries/BatteryCard";
import Pagination from "@/components/batteries/Pagination";
import { formatNumber } from "@/utils/battery-utils";
import { BatteryDetailModal } from "@/components/batteries/BatteryDetailModal";

// Types
interface BatteryKPIs {
  TOTAL_BMS: number;
  CRITICAL_BMS: number;
  WARNING_BMS: number;
  HEALTHY_BMS: number;
  AVG_HEALTH_SCORE: number;
  TOTAL_ANOMALIES: number;
  TOTAL_DISTANCE: number;
  AVG_CYCLES: number;
  AVG_DISTANCE_PER_CYCLE: number;
  CELL_VOLTAGE_ISSUES: number; // NEW: Batteries with critical cell voltages
  BATTERIES_WITH_CELL_DATA: number; // NEW: Total batteries with cell data
}

const BatteryTelemetryDashboard = () => {
  const {
    batteries,
    loading,
    error,
    refetch,
    processingTime,
    fromCache,
    lastUpdated,
  } = useBatteryTelemetry();

  // Force refresh when needed
  const handleForceRefresh = () => {
    refetch(true); // Clears cache and fetches fresh
  };

  // Normal refresh (uses cache if valid)
  const handleRefresh = () => {
    refetch(); // Uses cache if < 6 hours old
  };

  const router = useRouter();

  const [selectedBattery, setSelectedBattery] =
    useState<BatteryTelemetry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  const [filters, setFilters] = useState<BatteryFilterState>({
    searchTerm: "",
    selectedSeverities: [],
    scoreRange: "all",
    sortBy: "score-asc",
    selectedCategories: [],
    bmsIdSearch: "",
    tboxIdSearch: "",
    minHealthScore: "",
    maxHealthScore: "",
    onlineStatus: "all",
  });

  // Extract unique categories from batteries
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    batteries.forEach((battery) => {
      battery.anomalies.forEach((anomaly) => {
        categories.add(anomaly.category);
      });
    });
    return Array.from(categories).sort();
  }, [batteries]);

  // Calculate KPIs
  const kpis: BatteryKPIs = useMemo(() => {
    const criticalBatteries = batteries.filter((b) => b.healthScore < 40);
    const warningBatteries = batteries.filter(
      (b) => b.healthScore >= 40 && b.healthScore < 80
    );
    const healthyBatteries = batteries.filter((b) => b.healthScore >= 80);
    const totalAnomalies = batteries.reduce(
      (sum, b) => sum + b.anomalies.length,
      0
    );
    const avgScore =
      batteries.length > 0
        ? batteries.reduce((sum, b) => sum + b.healthScore, 0) /
          batteries.length
        : 0;
    const totalDistance = batteries.reduce(
      (sum, b) => sum + b.totalDistanceTraveled,
      0
    );
    const avgCycles =
      batteries.length > 0
        ? batteries.reduce((sum, b) => sum + (b.batCycleCount || 0), 0) /
          batteries.length
        : 0;
    const avgDistPerCycle =
      batteries.length > 0
        ? batteries.reduce((sum, b) => sum + b.avgDistancePerCycle, 0) /
          batteries.length
        : 0;

    // NEW: Calculate cell voltage issues
    const batteriesWithCellData = batteries.filter(
      (b) => b.cellVoltages && b.cellVoltages.length > 0
    );

    const cellVoltageIssues = batteries.filter((b) => {
      if (!b.cellVoltages || b.cellVoltages.length === 0) return false;
      return b.cellVoltages.some((v) => v < 2.6 || v > 4.25);
    });

    return {
      TOTAL_BMS: batteries.length,
      CRITICAL_BMS: criticalBatteries.length,
      WARNING_BMS: warningBatteries.length,
      HEALTHY_BMS: healthyBatteries.length,
      AVG_HEALTH_SCORE: Math.round(avgScore),
      TOTAL_ANOMALIES: totalAnomalies,
      TOTAL_DISTANCE: totalDistance,
      AVG_CYCLES: Math.round(avgCycles),
      AVG_DISTANCE_PER_CYCLE: avgDistPerCycle,
      CELL_VOLTAGE_ISSUES: cellVoltageIssues.length,
      BATTERIES_WITH_CELL_DATA: batteriesWithCellData.length,
    };
  }, [batteries]);

  // Filter and sort batteries
  const filteredBatteries = useMemo(() => {
    let filtered = batteries.filter((battery) => {
      const matchesSearch =
        !filters.searchTerm ||
        battery.bmsId
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        battery.tboxId.toLowerCase().includes(filters.searchTerm.toLowerCase());

      const matchesBmsId =
        !filters.bmsIdSearch ||
        battery.bmsId.toLowerCase().includes(filters.bmsIdSearch.toLowerCase());

      const matchesTboxId =
        !filters.tboxIdSearch ||
        battery.tboxId
          .toLowerCase()
          .includes(filters.tboxIdSearch.toLowerCase());

      const matchesSeverity =
        filters.selectedSeverities.length === 0 ||
        battery.anomalies.some((a) =>
          filters.selectedSeverities.includes(a.type)
        );

      const matchesCategory =
        filters.selectedCategories.length === 0 ||
        battery.anomalies.some((a) =>
          filters.selectedCategories.includes(a.category)
        );

      const matchesScoreRange = (() => {
        if (filters.scoreRange === "all") return true;
        const score = battery.healthScore;
        switch (filters.scoreRange) {
          case "critical":
            return score < 40;
          case "poor":
            return score >= 40 && score < 60;
          case "fair":
            return score >= 60 && score < 80;
          case "good":
            return score >= 80;
          default:
            return true;
        }
      })();

      const matchesMinScore =
        !filters.minHealthScore ||
        battery.healthScore >= parseInt(filters.minHealthScore);

      const matchesMaxScore =
        !filters.maxHealthScore ||
        battery.healthScore <= parseInt(filters.maxHealthScore);

      const matchesOnlineStatus =
        filters.onlineStatus === "all" ||
        (filters.onlineStatus === "online" && battery.isOnline) ||
        (filters.onlineStatus === "offline" && !battery.isOnline);

      return (
        matchesSearch &&
        matchesBmsId &&
        matchesTboxId &&
        matchesSeverity &&
        matchesCategory &&
        matchesScoreRange &&
        matchesMinScore &&
        matchesMaxScore &&
        matchesOnlineStatus
      );
    });

    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "score-asc":
          return a.healthScore - b.healthScore;
        case "score-desc":
          return b.healthScore - a.healthScore;
        case "anomalies-desc":
          return b.anomalies.length - a.anomalies.length;
        case "critical-desc":
          return (
            b.anomalies.filter((an) => an.type === "critical").length -
            a.anomalies.filter((an) => an.type === "critical").length
          );
        case "cycles-desc":
          return (b.batCycleCount || 0) - (a.batCycleCount || 0);
        case "distance-desc":
          return b.totalDistanceTraveled - a.totalDistanceTraveled;
        case "avg-distance-desc":
          return b.avgDistancePerCycle - a.avgDistancePerCycle;
        case "avg-distance-asc":
          return a.avgDistancePerCycle - b.avgDistancePerCycle;
        default:
          return a.bmsId.localeCompare(b.bmsId);
      }
    });

    return filtered;
  }, [batteries, filters]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filters]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredBatteries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedBatteries = filteredBatteries.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Export function - Enhanced with cell voltage data
  const handleExport = () => {
    const headers = [
      "BMS ID",
      "T-Box ID",
      "Health Score",
      "Total Anomalies",
      "Critical Anomalies",
      "Warning Anomalies",
      "Info Anomalies",
      "SOH %",
      "Signal Status",
      "Hours Since Pulse",
      "Offline Duration",
      "Cycles",
      "Total Distance (km)",
      "Has Cell Data",
      "Cell Count",
      "Min Cell Voltage",
      "Max Cell Voltage",
      "Voltage Spread",
      "Critical Cells (<2.6V)",
      "Top Anomaly",
      "Top Recommendation",
    ];

    const rows = filteredBatteries.map((b) => {
      const hasCellData = b.cellVoltages && b.cellVoltages.length > 0;
      const minVoltage = hasCellData ? Math.min(...b.cellVoltages!) : null;
      const maxVoltage = hasCellData ? Math.max(...b.cellVoltages!) : null;
      const voltageSpread =
        hasCellData && minVoltage && maxVoltage
          ? maxVoltage - minVoltage
          : null;
      const criticalCells = hasCellData
        ? b.cellVoltages!.filter((v) => v < 2.6 || v > 4.25).length
        : 0;

      return [
        b.bmsId,
        b.tboxId,
        b.healthScore,
        b.anomalies.length,
        b.anomalies.filter((a) => a.type === "critical").length,
        b.anomalies.filter((a) => a.type === "warning").length,
        b.anomalies.filter((a) => a.type === "info").length,
        b.batSOH || "N/A",
        b.isOnline ? "Online" : "Offline",
        b.hoursSinceLastPulse,
        b.offlineDuration,
        b.batCycleCount || 0,
        b.totalDistanceTraveled,
        hasCellData ? "Yes" : "No",
        hasCellData ? b.cellVoltages!.length : 0,
        minVoltage ? minVoltage.toFixed(3) : "N/A",
        maxVoltage ? maxVoltage.toFixed(3) : "N/A",
        voltageSpread ? voltageSpread.toFixed(3) : "N/A",
        criticalCells,
        b.anomalies[0]?.message || "No anomalies",
        b.anomalies[0]?.recommendation || "N/A",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `bms_anomaly_report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <Card className="bg-slate-900 border-slate-700 max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-200 mb-2">
              Failed to Load Data
            </h3>
            <p className="text-slate-400 mb-4">{error}</p>
            <Button onClick={refetch} className="bg-cyan-600 hover:bg-cyan-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
              BMS Health Monitoring Dashboard
            </h1>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-3 text-cyan-400 mb-4">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <span className="text-xl">Loading battery data...</span>
            </div>

            <div className="max-w-md mx-auto bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Fetching from Snowflake</span>
                <span className="text-cyan-400">✓</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Detecting anomalies</span>
                <span className="text-yellow-400">⏳</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">
                  Calculating health scores
                </span>
                <span className="text-slate-500">...</span>
              </div>
            </div>

            {processingTime && (
              <p className="text-slate-400 text-sm mt-4">
                Processing time: {processingTime.toFixed(0)}ms
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgb(30 41 59);
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgb(71 85 105);
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgb(100 116 139);
        }
      `}</style>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-cyan-500/20 rounded-full">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">
              Anomaly Detection System
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            BMS Health Monitoring Dashboard
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            AI-powered anomaly detection and health scoring for proactive
            battery management
          </p>
          <p className="text-sm text-slate-500">
            Data as of today at 1:00 AM • Batteries ranked by health score
          </p>
        </div>

        {fromCache && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-400">
              <span>📂 Showing cached data</span>
              {lastUpdated && (
                <span className="text-sm text-blue-300">
                  (Updated {formatTimeAgo(lastUpdated)})
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch(true)}
                className="ml-auto"
              >
                Refresh
              </Button>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard
            icon={Battery}
            label="Total BMS Units"
            value={formatNumber(kpis.TOTAL_BMS)}
            description="All monitored"
            color="text-blue-400"
            loading={false}
          />
          <KPICard
            icon={XCircle}
            label="Critical"
            value={formatNumber(kpis.CRITICAL_BMS)}
            description="Score < 40"
            color="text-red-400"
            loading={false}
          />
          <KPICard
            icon={AlertTriangle}
            label="Warning"
            value={formatNumber(kpis.WARNING_BMS)}
            description="Score 40-79"
            color="text-orange-400"
            loading={false}
          />
          <KPICard
            icon={CheckCircle}
            label="Healthy"
            value={formatNumber(kpis.HEALTHY_BMS)}
            description="Score ≥ 80"
            color="text-green-400"
            loading={false}
          />
          <KPICard
            icon={Gauge}
            label="Avg Health Score"
            value={kpis.AVG_HEALTH_SCORE}
            description="Fleet average"
            color="text-cyan-400"
            loading={false}
          />

          {/* NEW: Cell Voltage Issues KPI */}
          <KPICard
            icon={Layers}
            label="Cell Voltage Issues"
            value={formatNumber(kpis.CELL_VOLTAGE_ISSUES)}
            description={`of ${kpis.BATTERIES_WITH_CELL_DATA} with data`}
            color="text-red-400"
            loading={false}
          />

          <KPICard
            icon={Activity}
            label="Total Anomalies"
            value={formatNumber(kpis.TOTAL_ANOMALIES)}
            description="Detected issues"
            color="text-purple-400"
            loading={false}
          />
          <KPICard
            icon={TrendingUp}
            label="Fleet Distance"
            value={`${formatNumber(kpis.TOTAL_DISTANCE)} km`}
            description="Total traveled"
            color="text-indigo-400"
            loading={false}
          />
          <KPICard
            icon={RefreshCw}
            label="Avg Cycles"
            value={formatNumber(kpis.AVG_CYCLES)}
            description="Per battery"
            color="text-pink-400"
            loading={false}
          />
          <KPICard
            icon={Gauge}
            label="Avg Distance/Cycle"
            value={`${kpis.AVG_DISTANCE_PER_CYCLE.toFixed(1)} km`}
            description="Usage intensity"
            color="text-emerald-400"
            loading={false}
          />
        </div>
        {/* <pre>{JSON.stringify(batteries, null, 2)}</pre> */}

        {/* Priority Actions - Dynamic SOH-based battery alerts */}
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-3 w-full">
                <h3 className="text-slate-200 font-semibold">Priority Actions Required</h3>

                {/* Cell voltage issues summary line */}
                {kpis.CELL_VOLTAGE_ISSUES > 0 && (
                  <p className="text-sm text-slate-300">
                    •{" "}
                    <strong className="text-red-400 animate-pulse">
                      {kpis.CELL_VOLTAGE_ISSUES}
                    </strong>{" "}
                    batteries with{" "}
                    <strong className="text-red-400">critical cell voltage issues</strong>{" "}
                    (cells outside safe range) — IMMEDIATE ACTION REQUIRED
                  </p>
                )}

                {/* SOH < 60: Critical batteries */}
                {(() => {
                  const criticalSOH = batteries.filter(
                    (b) => b.batSOH !== null && b.batSOH < 60
                  );
                  if (criticalSOH.length === 0) return null;
                  return (
                    <div>
                      <p className="text-sm font-semibold text-red-400 mb-1">
                        🔴 Critical SOH (&lt;60%) — Immediate Replacement Required
                      </p>
                      <div className="space-y-1 pl-3 border-l-2 border-red-500/40">
                        {criticalSOH.map((b) => (
                          <p key={b.bmsId} className="text-xs text-slate-300">
                            <span className="text-red-400 font-medium">{b.bmsId}</span>
                            {" · "}
                            <span>SOH: <strong className="text-red-300">{b.batSOH}%</strong></span>
                            {" · "}
                            <span>Cycles: {b.batCycleCount ?? "N/A"}</span>
                            {" · "}
                            <span>Distance: {b.totalDistanceTraveled.toLocaleString()} km</span>
                            {" · "}
                            <span className={b.isOnline ? "text-green-400" : "text-slate-500"}>
                              {b.isOnline ? "Online" : `Offline ${Math.floor(b.offlineDuration / 24)}d`}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* SOH 60–69: Warning batteries */}
                {(() => {
                  const warnSOH = batteries.filter(
                    (b) => b.batSOH !== null && b.batSOH >= 60 && b.batSOH < 70
                  );
                  if (warnSOH.length === 0) return null;
                  return (
                    <div>
                      <p className="text-sm font-semibold text-orange-400 mb-1">
                        🟠 Significant Degradation (60–69%) — Plan Replacement Within 1 Month
                      </p>
                      <div className="space-y-1 pl-3 border-l-2 border-orange-500/40">
                        {warnSOH.map((b) => (
                          <p key={b.bmsId} className="text-xs text-slate-300">
                            <span className="text-orange-400 font-medium">{b.bmsId}</span>
                            {" · "}
                            <span>SOH: <strong className="text-orange-300">{b.batSOH}%</strong></span>
                            {" · "}
                            <span>Cycles: {b.batCycleCount ?? "N/A"}</span>
                            {" · "}
                            <span>Distance: {b.totalDistanceTraveled.toLocaleString()} km</span>
                            {" · "}
                            <span className={b.isOnline ? "text-green-400" : "text-slate-500"}>
                              {b.isOnline ? "Online" : `Offline ${Math.floor(b.offlineDuration / 24)}d`}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* SOH 70–79: Monitor batteries */}
                {(() => {
                  const monitorSOH = batteries.filter(
                    (b) => b.batSOH !== null && b.batSOH >= 70 && b.batSOH < 80
                  );
                  if (monitorSOH.length === 0) return null;
                  return (
                    <div>
                      <p className="text-sm font-semibold text-yellow-400 mb-1">
                        🟡 Moderate Wear (70–79%) — Monitor & Plan in 3–6 Months
                      </p>
                      <div className="space-y-1 pl-3 border-l-2 border-yellow-500/40">
                        {monitorSOH.map((b) => (
                          <p key={b.bmsId} className="text-xs text-slate-300">
                            <span className="text-yellow-400 font-medium">{b.bmsId}</span>
                            {" · "}
                            <span>SOH: <strong className="text-yellow-300">{b.batSOH}%</strong></span>
                            {" · "}
                            <span>Cycles: {b.batCycleCount ?? "N/A"}</span>
                            {" · "}
                            <span>Distance: {b.totalDistanceTraveled.toLocaleString()} km</span>
                            {" · "}
                            <span className={b.isOnline ? "text-green-400" : "text-slate-500"}>
                              {b.isOnline ? "Online" : `Offline ${Math.floor(b.offlineDuration / 24)}d`}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Footer note */}
                <p className="text-slate-400 text-xs mt-2">
                  💡 Batteries are sorted by health score (lowest first) to help you prioritize interventions.{" "}
                  <strong className="text-cyan-400">{kpis.TOTAL_ANOMALIES}</strong> total anomalies detected across fleet.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <BatteryFilter
          onFiltersChange={setFilters}
          loading={false}
          filters={filters}
        />

        {/* Results and Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-slate-400">
            Showing{" "}
            <span className="text-cyan-400 font-medium">
              {filteredBatteries.length}
            </span>{" "}
            of{" "}
            <span className="text-cyan-400 font-medium">
              {batteries.length}
            </span>{" "}
            BMS units
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
              onClick={handleExport}
              disabled={filteredBatteries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button
              variant="outline"
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
              onClick={refetch}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Battery Cards Grid */}
        {filteredBatteries.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedBatteries.map((battery) => (
                <BatteryCard
                  key={battery.bmsId}
                  battery={battery}
                  onClick={() => router.push(`/batteries/${battery.bmsId}`)}
                />
              ))}
            </div>

            {/* Pagination Component */}
            {totalPages > 1 && (
              <div className="mt-8 pt-6 border-t border-slate-800">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={filteredBatteries.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </div>
            )}
          </>
        ) : (
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-12 text-center">
              <Battery className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-slate-300 text-lg font-medium mb-2">
                No BMS units found
              </h3>
              <p className="text-slate-400 text-sm">
                Try adjusting your filters to see more results
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Modal */}
      {selectedBattery && (
        <BatteryDetailModal
          battery={selectedBattery}
          onClose={() => setSelectedBattery(null)}
        />
      )}
    </div>
  );
};

export default BatteryTelemetryDashboard;
