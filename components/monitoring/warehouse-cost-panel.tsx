"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, AlertCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { WarehouseCostRow, formatCredits, formatDateTime } from "@/lib/monitoring-queries";

interface Props {
  data: WarehouseCostRow[] | null;
  loading: boolean;
  error: string | null;
}

// --- Shared chart styling (matches the Hourly Swap Activity chart) --------
// Kept identical to the swap-analytics charts so every chart on the
// dashboard shares the same grid color, tick styling, and tooltip look.
const CHART_GRID_STROKE = "#334155";
const CHART_AXIS_TICK = { fontSize: 12, fill: "#94a3b8" };

// --- Warehouse color mapping -------------------------------------------
// Fixed colors for known warehouses so the important ones are always
// recognizable at a glance. Anything not in this map falls back to a
// deterministic round-robin from FALLBACK_PALETTE, keyed by warehouse
// name (not array index), so the same unknown warehouse always lands on
// the same fallback color no matter which panel renders first or what
// order the dataset returns rows in.
const WAREHOUSE_COLOR_MAP: Record<string, string> = {
  COMPUTE_WH: "#06b6d4",
  ETL_WH: "#8b5cf6",
  ANALYTICS_WH: "#10b981",
  REPORTING_WH: "#f59e0b",
  LOAD_WH: "#ec4899",
};

const FALLBACK_PALETTE = ["#64748b", "#3b82f6", "#ef4444", "#14b8a6", "#a855f7", "#eab308"];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getWarehouseColor(warehouseName: string): string {
  if (WAREHOUSE_COLOR_MAP[warehouseName]) return WAREHOUSE_COLOR_MAP[warehouseName];
  return FALLBACK_PALETTE[hashString(warehouseName) % FALLBACK_PALETTE.length];
}
// -------------------------------------------------------------------------

// Same tooltip shape/spacing/dot-per-entry layout as the swap-analytics
// charts (ScooterTooltip), just renamed for this file.
const WarehouseTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 shadow-xl bg-slate-900 p-4 max-w-xs">
        {label !== undefined && (
          <p className="text-xs font-semibold text-slate-200 mb-2">
            {new Date(label).toLocaleDateString()}
          </p>
        )}
        <div className="grid gap-1 text-xs">
          {payload.map(
            (entry: any, index: number) =>
              entry.value !== null &&
              entry.value !== undefined && (
                <div key={index} className="flex justify-between gap-4">
                  <span style={{ color: entry.color }}>{entry.name}:</span>
                  <span className="font-medium text-slate-200">{formatCredits(entry.value)}</span>
                </div>
              )
          )}
        </div>
      </div>
    );
  }
  return null;
};

function ChartSkeleton() {
  return (
    <div className="h-72 flex flex-col justify-end gap-2 px-2">
      <div className="flex items-end gap-3 h-full">
        {[45, 70, 55, 85, 60, 75, 50].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-slate-800 animate-pulse"
            style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <div className="h-px bg-slate-800" />
    </div>
  );
}

function BreakdownSkeleton() {
  return (
    <div className="space-y-4">
      {[100, 75, 55, 40].map((w, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-28 rounded bg-slate-800 animate-pulse" />
            <div className="h-3.5 w-20 rounded bg-slate-800 animate-pulse" />
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 animate-pulse" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

export default function WarehouseCostPanel({ data, loading, error }: Props) {
  const rows = data ?? [];
  const isInitialLoad = loading && rows.length === 0 && !error;

  const warehouses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.WAREHOUSE_NAME))).sort(),
    [rows]
  );

  // Pivot long-format (date, warehouse, credits) into one row per date
  // with a key per warehouse, which is what recharts wants.
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, any>>();
    rows.forEach((row) => {
      const key = row.USAGE_DATE;
      if (!byDate.has(key)) byDate.set(key, { date: key });
      byDate.get(key)![row.WAREHOUSE_NAME] = row.TOTAL_CREDITS_USED;
    });
    return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [rows]);

  const totalsByWarehouse = useMemo(() => {
    const totals = new Map<string, number>();
    rows.forEach((row) => {
      totals.set(row.WAREHOUSE_NAME, (totals.get(row.WAREHOUSE_NAME) ?? 0) + row.TOTAL_CREDITS_USED);
    });
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const grandTotal = totalsByWarehouse.reduce((sum, [, credits]) => sum + credits, 0);

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100 text-lg flex items-center">
              <Zap className="w-5 h-5 mr-2 text-cyan-400" />
              Credits Used — Last 7 Days
            </CardTitle>
            {!isInitialLoad && !error && (
              <span className="text-sm text-slate-400">
                Total: <span className="text-cyan-400 font-semibold">{formatCredits(grandTotal)}</span> credits
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isInitialLoad && <ChartSkeleton />}

          {error && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-400">Failed to load costs: {error}</p>
            </div>
          )}

          {!isInitialLoad && !error && chartData.length > 0 && (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={CHART_AXIS_TICK}
                    tickLine={false}
                    axisLine={{ stroke: CHART_GRID_STROKE }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString([], { month: "short", day: "numeric" })}
                  />
                  <YAxis tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<WarehouseTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.06)" }} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 12 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  {warehouses.map((wh, i) => (
                    <Bar
                      key={wh}
                      dataKey={wh}
                      stackId="credits"
                      fill={getWarehouseColor(wh)}
                      radius={i === warehouses.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      maxBarSize={48}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {!isInitialLoad && !error && chartData.length === 0 && (
            <p className="text-sm text-slate-500 py-10 text-center">No cost data for this period.</p>
          )}

          {rows[0]?._AS_OF && !isInitialLoad && (
            <p className="text-xs text-slate-600 mt-3">Snapshot as of {formatDateTime(rows[0]._AS_OF)}</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100 text-lg">Breakdown by Warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          {isInitialLoad ? (
            <BreakdownSkeleton />
          ) : (
            <div className="space-y-4">
              {totalsByWarehouse.map(([wh, credits]) => {
                const pct = grandTotal > 0 ? (credits / grandTotal) * 100 : 0;
                const color = getWarehouseColor(wh);
                return (
                  <div key={wh} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-slate-300 font-medium">{wh}</span>
                      </div>
                      <span className="text-slate-400 tabular-nums">
                        {formatCredits(credits)} credits <span className="text-slate-600">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
              {totalsByWarehouse.length === 0 && !error && (
                <p className="text-sm text-slate-500 text-center py-4">No cost data for this period.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}