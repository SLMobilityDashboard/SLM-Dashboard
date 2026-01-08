"use client";

import { useState } from "react";
import StationSelector from "@/components/bss-360/station-selector";
import { Card } from "@/components/ui/card";
import DateRangeFilter from "@/components/bss-360/date-range-filter";
import AggregatedMetrics from "@/components/bss-360/aggregated-metrics";

export default function BSS360Page() {
  const [selectedStation, setSelectedStation] = useState<string>("BSS-001");
  const [selectedCabinet, setSelectedCabinet] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "analytics">("grid");
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate() - 7
    ),
    end: new Date(),
  });

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-700 pb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          BSS 360 Analytics
        </h1>
        <p className="text-slate-400">
          Cabinet-level battery swap & charging station analytics
        </p>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Station Selector */}
        <div className="lg:col-span-1">
          <StationSelector
            selectedStation={selectedStation}
            onStationChange={setSelectedStation}
          />
        </div>

        {/* Date Range Filter */}
        <div className="lg:col-span-2">
          <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
        </div>
      </div>

      {/* View Controls */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setViewMode("grid")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === "grid"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Cabinet Grid
        </button>
        <button
          onClick={() => setViewMode("analytics")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === "analytics"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <p className="text-sm text-slate-400 mb-1">Active Cabinets</p>
          <p className="text-2xl font-bold text-cyan-400">11/12</p>
          <p className="text-xs text-slate-500 mt-1">91.7% uptime</p>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <p className="text-sm text-slate-400 mb-1">Battery Utilization</p>
          <p className="text-2xl font-bold text-emerald-400">87%</p>
          <p className="text-xs text-slate-500 mt-1">8 charging, 3 available</p>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <p className="text-sm text-slate-400 mb-1">Avg Cabinet Temp</p>
          <p className="text-2xl font-bold text-orange-400">28.5°C</p>
          <p className="text-xs text-slate-500 mt-1">Optimal range</p>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <p className="text-sm text-slate-400 mb-1">Period Swaps</p>
          <p className="text-2xl font-bold text-purple-400">298</p>
          <p className="text-xs text-slate-500 mt-1">
            Over{" "}
            {Math.floor(
              (dateRange.end.getTime() - dateRange.start.getTime()) /
                (1000 * 60 * 60 * 24)
            )}{" "}
            days
          </p>
        </Card>
      </div>

      {/* Main Content Area */}
      <AggregatedMetrics
        selectedStation={selectedStation}
        dateRange={dateRange}
      />
    </div>
  );
}
