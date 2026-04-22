"use client";

import { useMemo, useState, useCallback } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { CustomerSwapData, DayPattern } from "@/hooks/useSwapAnalytics";
import { DAY_PATTERN_COLORS } from "@/hooks/useSwapAnalytics";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_PATTERNS: DayPattern[] = [
  "Fleet operator",
  "Weekend warrior",
  "Balanced",
  "Sporadic",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  customers: CustomerSwapData[];
  dowFleet?: number[];   // kept in signature for API compat, not used in scatter
  loading: boolean;
  onFilter?: (ids: string[] | null) => void;
}

interface ScatterPoint {
  customerId: string;
  customerName: string;
  x: number;           // weekday ratio 0–100
  y: number;           // total swaps
  pattern: DayPattern;
  consistency: number;
  dowProfile: number[];
  segment: string;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: ScatterPoint = payload[0]?.payload;
  if (!d) return null;

  const color  = DAY_PATTERN_COLORS[d.pattern];
  const dowMax = Math.max(...d.dowProfile, 1);

  return (
    <div className="rounded-lg border border-border bg-background shadow-lg p-3 text-xs min-w-[190px]">
      <p className="font-medium text-sm mb-1 truncate">{d.customerName}</p>
      <span
        className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-2"
        style={{ background: color + "22", color }}
      >
        {d.pattern}
      </span>

      <div className="space-y-0.5 text-muted-foreground mb-2">
        <div className="flex justify-between gap-6">
          <span>Weekday ratio</span>
          <span className="font-medium text-foreground">{Math.round(d.x)}%</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Total swaps</span>
          <span className="font-medium text-foreground">{d.y.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Consistency</span>
          <span className="font-medium text-foreground">{d.consistency}%</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Segment</span>
          <span className="font-medium text-foreground">{d.segment}</span>
        </div>
      </div>

      {/* Mini DOW bars in tooltip */}
      <div className="border-t border-border pt-2">
        <p className="text-[10px] text-muted-foreground mb-1">Swaps by day</p>
        <div className="flex items-end gap-[3px] h-8">
          {d.dowProfile.map((v, i) => {
            const isWe = i >= 5;
            const pct  = Math.round((v / dowMax) * 100);
            return (
              <div key={i} className="flex flex-col items-center gap-[1px] flex-1">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${Math.max(pct, 6)}%`,
                    background: isWe
                      ? DAY_PATTERN_COLORS["Weekend warrior"]
                      : DAY_PATTERN_COLORS["Fleet operator"],
                    opacity: v === 0 ? 0.15 : 0.85,
                    minHeight: 2,
                  }}
                />
                <span className="text-[8px] text-muted-foreground leading-none">
                  {DAY_LABELS[i][0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Custom scatter dot ────────────────────────────────────────────────────────
// Size encodes consistency (4–10px radius), opacity dims unselected dots.

function CustomDot(props: any) {
  const { cx, cy, payload, selectedId, activePattern } = props;
  if (!payload || cx === undefined || cy === undefined) return null;

  const color      = DAY_PATTERN_COLORS[payload.pattern as DayPattern];
  const r          = Math.max(4, Math.min(10, 4 + (payload.consistency / 100) * 6));
  const isSelected = selectedId === payload.customerId;
  const isFiltered = activePattern !== "all" && payload.pattern !== activePattern;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={isSelected ? r + 2.5 : r}
      fill={color}
      fillOpacity={isFiltered ? 0.08 : isSelected ? 1 : 0.62}
      stroke={color}
      strokeWidth={isSelected ? 2 : 0.5}
      strokeOpacity={isFiltered ? 0.15 : 0.9}
      style={{ cursor: "pointer" }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SwapDowChart({ customers, loading, onFilter }: Props) {
  const [activePattern, setActivePattern] = useState<DayPattern | "all">("all");
  const [selectedId, setSelectedId]       = useState<string | null>(null);

  // All customers as scatter points — always render all, dim filtered-out ones
  const allPoints = useMemo<ScatterPoint[]>(() =>
    customers.map((c) => ({
      customerId:   c.customerId,
      customerName: c.customerName,
      x:            Math.round(c.wdRatio * 100),
      y:            c.total,
      pattern:      c.dayPattern,
      consistency:  c.consistency,
      dowProfile:   c.dowProfile,
      segment:      c.segment,
    })),
    [customers]
  );

  const patternCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of ALL_PATTERNS) counts[p] = 0;
    for (const c of customers) counts[c.dayPattern] = (counts[c.dayPattern] ?? 0) + 1;
    return counts;
  }, [customers]);

  const handleDotClick = useCallback((data: any) => {
    const id = data?.customerId;
    if (!id) return;
    if (selectedId === id) {
      setSelectedId(null);
      onFilter?.(null);
    } else {
      setSelectedId(id);
      onFilter?.([id]);
    }
  }, [selectedId, onFilter]);

  const handlePatternFilter = (p: DayPattern | "all") => {
    setActivePattern(p);
    setSelectedId(null);
    if (p === "all") {
      onFilter?.(null);
    } else {
      onFilter?.(customers.filter((c) => c.dayPattern === p).map((c) => c.customerId));
    }
  };

  const visibleCount = activePattern === "all"
    ? customers.length
    : (patternCounts[activePattern] ?? 0);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="flex gap-2">
          {[80, 120, 130, 100, 90].map((w, i) => (
            <div key={i} className="h-7 rounded-full bg-muted" style={{ width: w }} />
          ))}
        </div>
        <div className="h-[360px] rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Pattern filter pills ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={activePattern === "all" ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs rounded-full"
          onClick={() => handlePatternFilter("all")}
        >
          All
          <span className="ml-1 text-[10px] opacity-60">{customers.length}</span>
        </Button>

        {ALL_PATTERNS.map((p) => {
          const color    = DAY_PATTERN_COLORS[p];
          const isActive = activePattern === p;
          return (
            <Button
              key={p}
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-full"
              style={
                isActive
                  ? { background: color, color: "#fff", borderColor: color }
                  : { borderColor: color + "55", color }
              }
              onClick={() => handlePatternFilter(p)}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
                style={{ background: isActive ? "#fff" : color }}
              />
              {p}
              <span className="ml-1 text-[10px] opacity-60">{patternCounts[p] ?? 0}</span>
            </Button>
          );
        })}

        {(selectedId || activePattern !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={() => { setSelectedId(null); setActivePattern("all"); onFilter?.(null); }}
          >
            ✕ Clear
          </Button>
        )}
      </div>

      {/* ── Scatter chart ─────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Zone labels */}
        <div className="absolute top-1 left-12 right-4 flex justify-between pointer-events-none z-10">
          <span className="text-[10px]" style={{ color: DAY_PATTERN_COLORS["Weekend warrior"], opacity: 0.65 }}>
            ← Weekend warriors
          </span>
          <span className="text-[10px] text-muted-foreground opacity-50">Balanced</span>
          <span className="text-[10px]" style={{ color: DAY_PATTERN_COLORS["Fleet operator"], opacity: 0.65 }}>
            Fleet operators →
          </span>
        </div>

        <ResponsiveContainer width="100%" height={360}>
          <ScatterChart margin={{ top: 20, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.4}
            />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{
                value: "Weekday ratio (%)",
                position: "insideBottom",
                offset: -12,
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={44}
              label={{
                value: "Total swaps",
                angle: -90,
                position: "insideLeft",
                offset: 14,
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Tooltip
              content={<ScatterTooltip />}
              cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--border))" }}
            />

            {/* Classification threshold lines */}
            <ReferenceLine
              x={40}
              stroke={DAY_PATTERN_COLORS["Weekend warrior"]}
              strokeDasharray="4 3"
              strokeOpacity={0.4}
              strokeWidth={1.5}
            />
            <ReferenceLine
              x={70}
              stroke={DAY_PATTERN_COLORS["Fleet operator"]}
              strokeDasharray="4 3"
              strokeOpacity={0.4}
              strokeWidth={1.5}
            />

            <Scatter
              data={allPoints}
              shape={(props: any) => (
                <CustomDot
                  {...props}
                  selectedId={selectedId}
                  activePattern={activePattern}
                />
              )}
              onClick={handleDotClick}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="space-y-1.5 text-[11px] text-muted-foreground">
        {/* Zone descriptions */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span style={{ color: DAY_PATTERN_COLORS["Weekend warrior"] }}>
            <span className="font-medium">Weekend warrior</span>
            <span className="text-muted-foreground"> — ≤40% weekday · likely personal / leisure use</span>
          </span>
          <span style={{ color: DAY_PATTERN_COLORS["Balanced"] }}>
            <span className="font-medium">Balanced</span>
            <span className="text-muted-foreground"> — 40–70% weekday · mixed-use pattern</span>
          </span>
          <span style={{ color: DAY_PATTERN_COLORS["Fleet operator"] }}>
            <span className="font-medium">Fleet operator</span>
            <span className="text-muted-foreground"> — ≥70% weekday · commercial / B2B candidate</span>
          </span>
          <span style={{ color: DAY_PATTERN_COLORS["Sporadic"] }}>
            <span className="font-medium">Sporadic</span>
            <span className="text-muted-foreground"> — &lt;5 total swaps · insufficient data to classify</span>
          </span>
        </div>
        {/* Dot legend + count */}
        <div className="flex items-center justify-between">
          <span>Dot size = consistency score · dashed lines = thresholds (40% / 70%) · click dot to filter table</span>
          <span className="shrink-0 ml-4">{visibleCount} of {customers.length} customers</span>
        </div>
      </div>
    </div>
  );
}