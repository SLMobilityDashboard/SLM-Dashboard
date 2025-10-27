import React from "react";

// ============================================================================
// COMPONENT 2: OVERVIEW & EDA VISUALIZATIONS
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
  const {
    Users,
    DollarSign,
    Zap,
    TrendingUp,
    AlertCircle,
  } = require("lucide-react");

  if (!eda) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="text-sm font-medium">Total Customers</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{eda.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Active user base</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="text-sm font-medium">Total Weekly Revenue</h3>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">
              {Math.round(eda.totalRevenue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">LKR per week</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="text-sm font-medium">Total Weekly Swaps</h3>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">
              {Math.round(eda.totalSwaps)}
            </div>
            <p className="text-xs text-muted-foreground">Battery swaps</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="text-sm font-medium">Avg Revenue/Swap</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">
              {Math.round(eda.avgRevenuePerSwap)}
            </div>
            <p className="text-xs text-muted-foreground">LKR per swap</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Customer Opportunity Analysis
          </h3>
          <p className="text-sm text-muted-foreground">
            Identify customer segments and engagement patterns
          </p>
        </div>
        <div className="p-6 pt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-destructive mb-2">
                {eda.opportunityAnalysis.lowEngagement}
              </div>
              <div className="text-sm font-medium mb-1">Low Engagement</div>
              <div className="text-xs text-muted-foreground mb-2">
                &lt;2 swaps, &lt;500 LKR/week
              </div>
              <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors text-foreground border border-input bg-background hover:bg-accent">
                Needs activation
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div
                className="text-2xl font-bold mb-2"
                style={{ color: "hsl(var(--chart-2))" }}
              >
                {eda.opportunityAnalysis.highPotential}
              </div>
              <div className="text-sm font-medium mb-1">High Potential</div>
              <div className="text-xs text-muted-foreground mb-2">
                3-7 swaps/week
              </div>
              <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors text-foreground border border-input bg-background hover:bg-accent">
                Growth opportunity
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div
                className="text-2xl font-bold mb-2"
                style={{ color: "hsl(var(--chart-1))" }}
              >
                {eda.opportunityAnalysis.premiumCandidates}
              </div>
              <div className="text-sm font-medium mb-1">Premium Users</div>
              <div className="text-xs text-muted-foreground mb-2">
                7+ swaps/week
              </div>
              <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors text-foreground border border-input bg-background hover:bg-accent">
                High value
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div
                className="text-2xl font-bold mb-2"
                style={{ color: "hsl(var(--chart-4))" }}
              >
                {eda.opportunityAnalysis.homeChargeDominant}
              </div>
              <div className="text-sm font-medium mb-1">
                Home Charge Dominant
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Home charges &gt; 2x swaps
              </div>
              <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors text-foreground border border-input bg-background hover:bg-accent">
                Different usage
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              Revenue Distribution
            </h3>
            <p className="text-sm text-muted-foreground">
              Weekly revenue per customer (LKR)
            </p>
          </div>
          <div className="p-6 pt-0">
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
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              Swap Frequency Distribution
            </h3>
            <p className="text-sm text-muted-foreground">
              Swaps per week per customer
            </p>
          </div>
          <div className="p-6 pt-0">
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

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">
            Customer Engagement Breakdown
          </h3>
          <p className="text-sm text-muted-foreground">
            User activity across different categories
          </p>
        </div>
        <div className="p-6 pt-0">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div
                className="text-2xl font-bold mb-2"
                style={{ color: "hsl(var(--chart-3))" }}
              >
                {eda.swapUsers}
              </div>
              <div className="text-sm font-medium mb-1">Active Swap Users</div>
              <div className="text-xs text-muted-foreground">
                {((eda.swapUsers / eda.totalCustomers) * 100).toFixed(1)}% of
                total
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div
                className="text-2xl font-bold mb-2"
                style={{ color: "hsl(var(--chart-4))" }}
              >
                {eda.homeChargers}
              </div>
              <div className="text-sm font-medium mb-1">Home Energizers</div>
              <div className="text-xs text-muted-foreground">
                {((eda.homeChargers / eda.totalCustomers) * 100).toFixed(1)}% of
                total
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-destructive mb-2">
                {eda.inactiveUsers}
              </div>
              <div className="text-sm font-medium mb-1">Inactive Users</div>
              <div className="text-xs text-muted-foreground">
                {((eda.inactiveUsers / eda.totalCustomers) * 100).toFixed(1)}%
                of total
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
