"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  SEGMENT_COLORS, DAY_PATTERN_COLORS,
  type Segment, type DayPattern, type SwapAnalyticsKpi,
} from "@/hooks/useSwapAnalytics";

const ALL_SEGMENTS: Segment[] = [
  "Champion", "Rising", "Re-engaged", "Steady", "Cooling", "At risk", "New",
];

const ALL_PATTERNS: DayPattern[] = [
  "Fleet operator", "Weekend warrior", "Balanced", "Sporadic",
];

function SwapSegmentChartSkeleton() {
  return (
    <div className="w-full h-[550px] rounded-lg bg-background p-6">
      <div className="h-6 w-1/3 rounded-md bg-gray-300 mb-4 animate-pulse" />
      <div className="flex justify-center items-center h-[240px] gap-2 flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-full animate-pulse"
            style={{ width: 60, height: 60, backgroundColor: "#ddd" }} />
        ))}
      </div>
    </div>
  );
}

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
  ring: "inner" | "outer";
  _total: number;
  x: number;
  y: number;
}

interface SwapSegmentChartProps {
  segmentCounts:    SwapAnalyticsKpi["segmentCounts"]    | undefined;
  dayPatternCounts: SwapAnalyticsKpi["dayPatternCounts"] | undefined;
  loading: boolean;
}

export function SwapSegmentChart({ segmentCounts, dayPatternCounts, loading }: SwapSegmentChartProps) {
  const [tooltip, setTooltip] = useState<TooltipEntry | null>(null);

  if (loading) return <SwapSegmentChartSkeleton />;
  if (!segmentCounts || !dayPatternCounts) return null;

  const innerTotal = ALL_SEGMENTS.reduce((s, seg) => s + (segmentCounts[seg] ?? 0), 0);
  const outerTotal = ALL_PATTERNS.reduce((s, p) => s + (dayPatternCounts[p] ?? 0), 0);

  if (innerTotal === 0) {
    return (
      <div className="flex items-center justify-center h-[550px] text-muted-foreground">
        <div className="text-center">
          <p>No data for selected period</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  const innerData = ALL_SEGMENTS
    .map((seg) => ({ name: seg, value: segmentCounts[seg] ?? 0, color: SEGMENT_COLORS[seg], ring: "inner" as const, _total: innerTotal }))
    .filter((d) => d.value > 0);

  const outerData = ALL_PATTERNS
    .map((p) => ({ name: p, value: dayPatternCounts[p] ?? 0, color: DAY_PATTERN_COLORS[p], ring: "outer" as const, _total: outerTotal }))
    .filter((d) => d.value > 0);

  const handleMouseEnter = (entry: any, ring: "inner" | "outer", e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).closest(".pie-wrapper")?.getBoundingClientRect();
    const data = ring === "inner"
      ? innerData.find(d => d.name === entry.name)
      : outerData.find(d => d.name === entry.name);
    if (!data) return;
    setTooltip({
      ...data,
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    });
  };

  return (
    <div className="space-y-4">
      {/* Chart wrapper — two overlapping PieCharts */}
      <div className="pie-wrapper relative w-full" style={{ height: 340 }}
        onMouseLeave={() => setTooltip(null)}
        onMouseMove={(e) => {
          if (tooltip) {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip(t => t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
          }
        }}
      >
        {/* Outer ring */}
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={outerData}
                cx="50%" cy="50%"
                innerRadius={20} outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={(entry, _, e) => handleMouseEnter(entry, "outer", e as any)}
              >
                {outerData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Inner ring — rendered on top but pointer-events only in its area */}
        <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={innerData}
                cx="50%" cy="50%"
                innerRadius={90} outerRadius={160}
                paddingAngle={2}
                dataKey="value"
                style={{ pointerEvents: "all" }}
                onMouseEnter={(entry, _, e) => handleMouseEnter(entry, "inner", e as any)}
              >
                {innerData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Manual tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 rounded-lg border bg-background p-3 shadow-md"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10, transform: "translateY(-50%)" }}
          >
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tooltip.color }} />
                <span className="font-medium text-sm">{tooltip.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {tooltip.ring === "inner" ? "Behavioral segment" : "Day pattern"}
              </div>
              <div className="text-sm text-muted-foreground">
                {((tooltip.value / tooltip._total) * 100).toFixed(1)}% of total
              </div>
              <div className="text-sm font-medium">Count: {tooltip.value}</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-center mb-1.5">
            Behavioral segment (inner)
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {innerData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-sm text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-center mb-1.5">
            Day pattern (outer)
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {outerData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-sm text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}