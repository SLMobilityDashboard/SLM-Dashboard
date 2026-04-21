"use client";

import { useState, useRef } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { SEGMENT_COLORS, type Segment, type SwapAnalyticsKpi } from "@/hooks/useSwapAnalytics";

const ALL_SEGMENTS: Segment[] = [
  "Champion", "Rising", "Steady", "Cooling", "At risk", "New",
];

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SwapSegmentChartSkeleton() {
  return (
    <div className="w-full h-[550px] rounded-lg bg-background p-6">
      <div className="h-6 w-1/3 rounded-md bg-gray-300 mb-4 animate-pulse" />
      <div className="flex justify-center items-center h-[240px] gap-2 flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-full animate-pulse"
            style={{ width: 60, height: 60, backgroundColor: "#ddd" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const total = payload[0].payload._total;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
          <span className="font-medium text-sm">{d.name}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {((d.value / total) * 100).toFixed(1)}% of total
        </div>
        <div className="text-sm font-medium">Count: {d.value}</div>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SwapSegmentChartProps {
  segmentCounts: SwapAnalyticsKpi["segmentCounts"] | undefined;
  loading: boolean;
}

export function SwapSegmentChart({ segmentCounts, loading }: SwapSegmentChartProps) {
  if (loading) return <SwapSegmentChartSkeleton />;

  if (!segmentCounts) return null;

  const chartData = ALL_SEGMENTS
    .map((seg) => ({
      name: seg,
      value: segmentCounts[seg] ?? 0,
      color: SEGMENT_COLORS[seg],
    }))
    .filter((d) => d.value > 0);

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[550px] text-muted-foreground">
        <div className="text-center">
          <p>No data for selected period</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  const total = chartData.reduce((s, d) => s + d.value, 0);
  // inject total into each entry so the tooltip can compute %
  const dataWithTotal = chartData.map((d) => ({ ...d, _total: total }));

  return (
    <ResponsiveContainer width="100%" height={500}>
      <PieChart>
        <Pie
          data={dataWithTotal}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={160}
          paddingAngle={2}
          dataKey="value"
        >
          {dataWithTotal.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>

        <Tooltip content={<CustomTooltip />} />

        <Legend
          content={({ payload }) => (
            <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent pr-2 mt-4 flex justify-center">
              <div className="flex flex-wrap gap-4 justify-center max-w-full">
                {payload?.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span
                      className="text-sm text-muted-foreground truncate max-w-[120px]"
                      title={entry.value?.toString()}
                    >
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}