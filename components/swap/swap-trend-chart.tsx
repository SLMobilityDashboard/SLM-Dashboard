"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { SwapAnalyticsKpi } from "@/hooks/useSwapAnalytics";

// ─── Skeleton ────────────────────────────────────────────────────────────────

const BAR_HEIGHTS = [45, 65, 38, 72, 55, 85, 48, 70, 60, 80, 52, 90];

function SwapTrendChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />
        ))}
      </div>
      <div className="w-full h-[280px] flex flex-col gap-2 select-none" aria-hidden>
        <div className="relative flex-1 flex items-end gap-[3px] px-1">
          {[20, 45, 70, 95].map((pct) => (
            <div
              key={pct}
              className="absolute inset-x-0 border-t border-muted/60"
              style={{ bottom: `${pct}%` }}
            />
          ))}
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-muted animate-pulse"
              style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>
        <div className="flex gap-[3px] px-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-2.5 rounded-sm bg-muted animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, data }: any) {
  if (!active || !payload?.length) return null;

  const idx = data.findIndex((d: any) => d.month === label);
  const current = data[idx]?.swaps ?? 0;
  const prev = idx > 0 ? data[idx - 1]?.swaps : null;
  const delta = prev !== null ? current - prev : null;
  const rolling = payload.find((p: any) => p.dataKey === "rolling3")?.value;
  const isPeak = current === Math.max(...data.map((d: any) => d.swaps));

  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm text-sm min-w-[170px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium">{label}</span>
        {isPeak && (
          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded">
            Peak month
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div>
          <div className="text-[0.65rem] uppercase text-muted-foreground">Total swaps</div>
          <div className="font-bold text-primary">{current.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[0.65rem] uppercase text-muted-foreground">3-mo avg</div>
          <div className="font-bold text-blue-700">{rolling ? rolling.toLocaleString() : "—"}</div>
        </div>
        <div>
          <div className="text-[0.65rem] uppercase text-muted-foreground">vs prev month</div>
          <div
            className={`font-bold ${
              delta === null ? "text-muted-foreground" :
              delta >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {delta === null ? "—" : (delta >= 0 ? "+" : "") + delta.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SwapTrendChartProps {
  fleetMonthly: SwapAnalyticsKpi["fleetMonthly"] | undefined;
  loading: boolean;
}

export function SwapTrendChart({ fleetMonthly, loading }: SwapTrendChartProps) {
  if (loading) return <SwapTrendChartSkeleton />;

  if (!fleetMonthly?.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No data for selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Derived stats ─────────────────────────────────────────────────────────

  const totalSwaps = fleetMonthly.reduce((s, d) => s + d.swaps, 0);
  const maxSwaps = Math.max(...fleetMonthly.map((d) => d.swaps));
  const peakMonth = fleetMonthly.reduce((p, c) => (c.swaps > p.swaps ? c : p));
  const avgSwaps = Math.round(totalSwaps / fleetMonthly.length);
  const latestRolling = [...fleetMonthly].reverse().find((d) => d.rolling3 != null)?.rolling3;

  const half = Math.floor(fleetMonthly.length / 2);
  const h1 = fleetMonthly.slice(0, half).reduce((s, d) => s + d.swaps, 0);
  const h2 = fleetMonthly.slice(half).reduce((s, d) => s + d.swaps, 0);
  const h1Peak = fleetMonthly.slice(0, half).reduce((p, c) => (c.swaps > p.swaps ? c : p));
  const h2Peak = fleetMonthly.slice(half).reduce((p, c) => (c.swaps > p.swaps ? c : p));

  // ─── Bar colors (matches HourlyPaymentsChart) ──────────────────────────────

  const getBarColor = (swaps: number) => {
    const r = maxSwaps > 0 ? swaps / maxSwaps : 0;
    if (r > 0.8) return "#dc2626";
    if (r > 0.6) return "#ea580c";
    if (r > 0.4) return "#d97706";
    if (r > 0.2) return "#ca8a04";
    return "#65a30d";
  };

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total swaps", value: totalSwaps.toLocaleString() },
          { label: "Peak month", value: peakMonth.month },
          { label: "Monthly avg", value: avgSwaps.toLocaleString() },
          { label: "Rolling avg (latest)", value: latestRolling ? latestRolling.toLocaleString() : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-muted/50 rounded-md p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
            <div className="text-xl font-medium">{value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={fleetMonthly} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip data={fleetMonthly} />} />
          <Bar dataKey="swaps" radius={[3, 3, 0, 0]} name="swaps">
            {fleetMonthly.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={getBarColor(entry.swaps)} />
            ))}
          </Bar>
          <Line
            dataKey="rolling3"
            stroke="#185FA5"
            strokeWidth={2}
            dot={{ r: 3, fill: "#185FA5" }}
            connectNulls={false}
            type="monotone"
            name="rolling3"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {[
          { color: "#dc2626", label: "High volume" },
          { color: "#d97706", label: "Medium" },
          { color: "#65a30d", label: "Low volume" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 rounded" style={{ background: "#185FA5" }} />
          3-mo rolling avg
        </span>
      </div>

      {/* Analysis card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            Swap trend analysis — {totalSwaps.toLocaleString()} total swaps
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">H1 peak:</span>
            <div className="font-medium">{h1Peak.month} ({h1Peak.swaps.toLocaleString()})</div>
          </div>
          <div>
            <span className="text-muted-foreground">H2 peak:</span>
            <div className="font-medium">{h2Peak.month} ({h2Peak.swaps.toLocaleString()})</div>
          </div>
          <div>
            <span className="text-muted-foreground">H2 vs H1:</span>
            <div className="font-medium">
              {h1 > 0 ? `${(((h2 / h1) - 1) * 100).toFixed(1)}%` : "—"}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Peak share:</span>
            <div className="font-medium">
              {totalSwaps > 0 ? `${((peakMonth.swaps / totalSwaps) * 100).toFixed(1)}% of total` : "—"}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}