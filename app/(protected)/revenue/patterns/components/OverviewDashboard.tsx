import React from "react";
import { Users, DollarSign, Zap, TrendingUp } from "lucide-react";

// ============================================================================
// OVERVIEW DASHBOARD COMPONENT
// ============================================================================
export const OverviewDashboard = ({ eda, customerSegments }) => {
  const {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
  } = require("recharts");

  if (!eda) return null;

  const segmentCounts = customerSegments.reduce((acc, seg) => {
    acc[seg.name] = seg.count;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Total Customers
            </h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{eda.totalCustomers}</div>
          <p className="text-xs text-muted-foreground">Active user base</p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Total Weekly Revenue
            </h3>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {Math.round(eda.totalRevenue).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">LKR per week</p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Total Weekly Swaps
            </h3>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{Math.round(eda.totalSwaps)}</div>
          <p className="text-xs text-muted-foreground">Battery swaps</p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Avg Revenue/Swap
            </h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {Math.round(eda.avgRevenuePerSwap)}
          </div>
          <p className="text-xs text-muted-foreground">LKR per swap</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Customer Segments</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(segmentCounts).map(([segment, count]) => (
              <div key={segment} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{segment}</span>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${(count / eda.totalCustomers) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eda.revenueDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="range" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Swap Frequency</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eda.swapDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="range" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
