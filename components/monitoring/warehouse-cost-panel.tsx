"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, AlertCircle, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { WarehouseCostRow, formatCredits, formatDateTime } from "@/lib/monitoring-queries";

interface Props {
  data: WarehouseCostRow[] | null;
  loading: boolean;
  error: string | null;
}

// --- Shared chart styling (matches the Hourly Swap Activity chart) --------
const CHART_GRID_STROKE = "#334155";
const CHART_AXIS_TICK = { fontSize: 12, fill: "#94a3b8" };

// --- Warehouse color mapping -------------------------------------------
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

// --- Period helpers -------------------------------------------------------
// Rolling 30-day windows rather than calendar months, so "this period" and
// "prior period" are always equal-length and comparable regardless of what
// day of the month it is.
function isoDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const CURRENT_PERIOD_START = isoDateNDaysAgo(29); // today + 29 days back = 30 days
const PREVIOUS_PERIOD_START = isoDateNDaysAgo(59);
const PREVIOUS_PERIOD_END = isoDateNDaysAgo(30);
// -------------------------------------------------------------------------

const WarehouseTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const sorted = [...payload]
      .filter((p: any) => p.dataKey !== "__prevAvg__")
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return (
      <div className="rounded-lg border border-slate-700 shadow-xl bg-slate-900 p-4 max-w-xs">
        {label !== undefined && (
          <p className="text-xs font-semibold text-slate-200 mb-2">
            {new Date(label).toLocaleDateString()}
          </p>
        )}
        <div className="grid gap-1 text-xs">
          {sorted.map(
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

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-lg bg-slate-800/40 border border-slate-800 p-4 space-y-2">
          <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
          <div className="h-6 w-20 rounded bg-slate-800 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function TrendIcon({ pctChange }: { pctChange: number | null }) {
  if (pctChange === null || Math.abs(pctChange) < 1) {
    return <Minus className="w-3 h-3 text-slate-500" />;
  }
  return pctChange > 0 ? (
    <TrendingUp className="w-3 h-3 text-red-400" />
  ) : (
    <TrendingDown className="w-3 h-3 text-green-400" />
  );
}

export default function WarehouseCostPanel({ data, loading, error }: Props) {
  const allRows = data ?? [];
  const isInitialLoad = loading && allRows.length === 0 && !error;

  // Split the 60-day fetch into "this 30 days" and "prior 30 days".
  const currentRows = useMemo(
    () => allRows.filter((r) => r.USAGE_DATE?.slice(0, 10) >= CURRENT_PERIOD_START),
    [allRows]
  );
  const previousRows = useMemo(
    () =>
      allRows.filter(
        (r) =>
          r.USAGE_DATE?.slice(0, 10) >= PREVIOUS_PERIOD_START &&
          r.USAGE_DATE?.slice(0, 10) <= PREVIOUS_PERIOD_END
      ),
    [allRows]
  );

  const warehouses = useMemo(
    () => Array.from(new Set(currentRows.map((r) => r.WAREHOUSE_NAME))).sort(),
    [currentRows]
  );

  // Pivot long-format (date, warehouse, credits) into one row per date
  // with a key per warehouse, which is what recharts wants. Chart only
  // shows the current 30-day window — the previous period is used for
  // comparison numbers and the reference line, not plotted directly.
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, any>>();
    currentRows.forEach((row) => {
      const key = row.USAGE_DATE;
      if (!byDate.has(key)) byDate.set(key, { date: key });
      byDate.get(key)![row.WAREHOUSE_NAME] = row.TOTAL_CREDITS_USED;
    });
    return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [currentRows]);

  const totalsByWarehouse = useMemo(() => {
    const totals = new Map<string, number>();
    currentRows.forEach((row) => {
      totals.set(row.WAREHOUSE_NAME, (totals.get(row.WAREHOUSE_NAME) ?? 0) + row.TOTAL_CREDITS_USED);
    });
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  }, [currentRows]);

  const previousTotalsByWarehouse = useMemo(() => {
    const totals = new Map<string, number>();
    previousRows.forEach((row) => {
      totals.set(row.WAREHOUSE_NAME, (totals.get(row.WAREHOUSE_NAME) ?? 0) + row.TOTAL_CREDITS_USED);
    });
    return totals;
  }, [previousRows]);

  const grandTotal = totalsByWarehouse.reduce((sum, [, credits]) => sum + credits, 0);
  const previousGrandTotal = useMemo(
    () => previousRows.reduce((sum, r) => sum + (r.TOTAL_CREDITS_USED ?? 0), 0),
    [previousRows]
  );

  const periodOverPeriodPct =
    previousGrandTotal > 0 ? ((grandTotal - previousGrandTotal) / previousGrandTotal) * 100 : null;

  // Per-warehouse period-over-period % change, replaces day-over-day since
  // a 30-day comparison is far less noisy than a single-day delta.
  const periodChangeByWarehouse = useMemo(() => {
    const result = new Map<string, number | null>();
    warehouses.forEach((wh) => {
      const curr = totalsByWarehouse.find(([name]) => name === wh)?.[1] ?? 0;
      const prev = previousTotalsByWarehouse.get(wh) ?? 0;
      result.set(wh, prev > 0 ? ((curr - prev) / prev) * 100 : null);
    });
    return result;
  }, [warehouses, totalsByWarehouse, previousTotalsByWarehouse]);

  // Daily totals across all warehouses (current period only), used for
  // anomaly detection and the KPI row.
  const dailyTotals = useMemo(() => {
    return chartData
      .map((row) => {
        const total = warehouses.reduce((sum, wh) => sum + (row[wh] ?? 0), 0);
        return { date: row.date as string, total };
      })
      .filter((d) => d.total > 0);
  }, [chartData, warehouses]);

  // Average daily spend during the PRIOR 30-day period, used as a
  // reference line on the current-period chart — an easy visual anchor
  // for "are we running hotter than last month, day by day."
  const previousPeriodDailyAvg = useMemo(() => {
    const byDate = new Map<string, number>();
    previousRows.forEach((r) => {
      byDate.set(r.USAGE_DATE, (byDate.get(r.USAGE_DATE) ?? 0) + (r.TOTAL_CREDITS_USED ?? 0));
    });
    const days = Array.from(byDate.values()).filter((v) => v > 0);
    return days.length > 0 ? days.reduce((s, v) => s + v, 0) / days.length : null;
  }, [previousRows]);

  // Anomaly days: total spend more than 1.5x the trailing average of
  // prior days within the current period (needs 3+ prior days of data).
  const anomalyDays = useMemo(() => {
    const anomalies: { date: string; total: number }[] = [];
    for (let i = 3; i < dailyTotals.length; i++) {
      const priorAvg = dailyTotals.slice(0, i).reduce((s, d) => s + d.total, 0) / i;
      if (priorAvg > 0 && dailyTotals[i].total > priorAvg * 1.5) {
        anomalies.push(dailyTotals[i]);
      }
    }
    return anomalies;
  }, [dailyTotals]);

  const mostChangedWarehouse = useMemo(() => {
    let result: { wh: string; pct: number } | null = null;
    periodChangeByWarehouse.forEach((pct, wh) => {
      if (pct !== null && (result === null || Math.abs(pct) > Math.abs(result.pct))) {
        result = { wh, pct };
      }
    });
    return result;
  }, [periodChangeByWarehouse]);

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100 text-lg flex items-center">
              <Zap className="w-5 h-5 mr-2 text-cyan-400" />
              Credits Used — Last 30 Days
            </CardTitle>
            {!isInitialLoad && !error && (
              <span className="text-sm text-slate-400">
                Total: <span className="text-cyan-400 font-semibold">{formatCredits(grandTotal)}</span> credits
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isInitialLoad && <KpiSkeleton />}

          {!isInitialLoad && !error && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-slate-800/40 border border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">vs previous 30 days</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-slate-100">{formatCredits(grandTotal)}</p>
                  {periodOverPeriodPct !== null ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        periodOverPeriodPct > 10
                          ? "text-red-400"
                          : periodOverPeriodPct < -10
                          ? "text-green-400"
                          : "text-slate-500"
                      }`}
                    >
                      <TrendIcon pctChange={periodOverPeriodPct} />
                      {Math.abs(periodOverPeriodPct).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">no prior data</span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  prior period: {formatCredits(previousGrandTotal)} credits
                </p>
              </div>

              <div className="rounded-lg bg-slate-800/40 border border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Biggest mover vs last period</p>
                {mostChangedWarehouse ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getWarehouseColor(mostChangedWarehouse.wh) }}
                    />
                    <p className="text-sm font-semibold text-slate-100 truncate">{mostChangedWarehouse.wh}</p>
                    <span
                      className={`text-xs font-medium ${
                        mostChangedWarehouse.pct > 0 ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {mostChangedWarehouse.pct > 0 ? "+" : ""}
                      {mostChangedWarehouse.pct.toFixed(0)}%
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Not enough history</p>
                )}
              </div>

              <div className="rounded-lg bg-slate-800/40 border border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Avg daily spend, this period</p>
                <p className="text-lg font-semibold text-slate-100">
                  {formatCredits(dailyTotals.length > 0 ? grandTotal / dailyTotals.length : 0)}
                </p>
                {previousPeriodDailyAvg !== null && (
                  <p className="text-xs text-slate-600 mt-1">
                    prior period avg: {formatCredits(previousPeriodDailyAvg)}/day
                  </p>
                )}
              </div>
            </div>
          )}

          {isInitialLoad && <ChartSkeleton />}

          {error && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-400">Failed to load costs: {error}</p>
            </div>
          )}

          {!isInitialLoad && !error && chartData.length > 0 && (
            <>
              {anomalyDays.length > 0 && (
                <div className="flex items-center gap-1.5 mb-3 text-xs text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {anomalyDays.length} day{anomalyDays.length > 1 ? "s" : ""} with spend well above trend
                  (marked below)
                </div>
              )}

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      tick={CHART_AXIS_TICK}
                      tickLine={false}
                      axisLine={{ stroke: CHART_GRID_STROKE }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString([], { month: "short", day: "numeric" })}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} width={40} />
                    <Tooltip content={<WarehouseTooltip />} cursor={{ stroke: "#475569", strokeWidth: 1 }} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 12 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    {previousPeriodDailyAvg !== null && (
                      <ReferenceLine
                        y={previousPeriodDailyAvg}
                        stroke="#64748b"
                        strokeDasharray="4 4"
                        label={{
                          value: "Prior 30-day avg/day",
                          position: "insideTopRight",
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                      />
                    )}
                    {warehouses.map((wh) => (
                      <Line
                        key={wh}
                        type="monotone"
                        dataKey={wh}
                        name={wh}
                        stroke={getWarehouseColor(wh)}
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 0, fill: getWarehouseColor(wh) }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#0f172a" }}
                        connectNulls
                      />
                    ))}
                    {anomalyDays.map((a) => {
                      const total = warehouses.reduce(
                        (sum, wh) => sum + (chartData.find((c) => c.date === a.date)?.[wh] ?? 0),
                        0
                      );
                      return (
                        <ReferenceDot
                          key={a.date}
                          x={a.date}
                          y={total}
                          r={7}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          ifOverflow="extendDomain"
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {!isInitialLoad && !error && chartData.length === 0 && (
            <p className="text-sm text-slate-500 py-10 text-center">No cost data for this period.</p>
          )}

          {allRows[0]?._AS_OF && !isInitialLoad && (
            <p className="text-xs text-slate-600 mt-3">Snapshot as of {formatDateTime(allRows[0]._AS_OF)}</p>
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
                const periodChange = periodChangeByWarehouse.get(wh) ?? null;
                return (
                  <div key={wh} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-slate-300 font-medium">{wh}</span>
                        {periodChange !== null && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs ${
                              Math.abs(periodChange) < 1
                                ? "text-slate-500"
                                : periodChange > 0
                                ? "text-red-400"
                                : "text-green-400"
                            }`}
                            title="vs. previous 30-day period"
                          >
                            <TrendIcon pctChange={periodChange} />
                            {Math.abs(periodChange).toFixed(0)}%
                          </span>
                        )}
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