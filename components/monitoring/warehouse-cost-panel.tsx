"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
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

const SERIES_COLORS = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#64748b"];

interface Props {
  data: WarehouseCostRow[] | null;
  loading: boolean;
  error: string | null;
}

export default function WarehouseCostPanel({ data, loading, error }: Props) {
  const rows = data ?? [];

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
            <span className="text-sm text-slate-400">
              Total: <span className="text-cyan-400 font-semibold">{formatCredits(grandTotal)}</span> credits
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {loading && rows.length === 0 && (
            <p className="text-sm text-slate-500 py-6 text-center">Loading warehouse costs…</p>
          )}
          {error && <p className="text-sm text-red-400 py-6 text-center">Failed to load costs: {error}</p>}

          {chartData.length > 0 && (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(v) => new Date(v).toLocaleDateString([], { month: "short", day: "numeric" })}
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                    labelStyle={{ color: "#cbd5e1" }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    formatter={(value: number) => formatCredits(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                  {warehouses.map((wh, i) => (
                    <Bar key={wh} dataKey={wh} stackId="credits" fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {rows[0]?._AS_OF && (
            <p className="text-xs text-slate-600 mt-2">Snapshot as of {formatDateTime(rows[0]._AS_OF)}</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100 text-lg">Breakdown by Warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {totalsByWarehouse.map(([wh, credits], i) => {
              const pct = grandTotal > 0 ? (credits / grandTotal) * 100 : 0;
              return (
                <div key={wh} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
                      />
                      <span className="text-slate-300">{wh}</span>
                    </div>
                    <span className="text-slate-400">
                      {formatCredits(credits)} credits <span className="text-slate-600">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
            {totalsByWarehouse.length === 0 && !loading && (
              <p className="text-sm text-slate-500 text-center py-4">No cost data for this period.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}