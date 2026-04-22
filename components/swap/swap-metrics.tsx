"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Users, Activity } from "lucide-react";
import type { SwapAnalyticsKpi } from "@/hooks/useSwapAnalytics";

interface SwapMetricsProps {
  kpi: SwapAnalyticsKpi | null;
  loading: boolean;
}

export function SwapMetrics({ kpi, loading }: SwapMetricsProps) {
  if (loading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-20 mb-1" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  if (!kpi) return null;

  const metrics = [
    {
      title: "Total swaps (period)",
      value: kpi.totalSwaps.toLocaleString(),
      sub: `across ${kpi.totalCustomers} customers`,
      icon: Activity,
      color: "text-blue-600",
    },
    {
      title: "Avg health score",
      value: `${kpi.avgHealthScore}/100`,
      sub: "volume · trend · consistency · stability",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Trending up",
      value: String(kpi.trendingUp),
      sub: "+20% or more vs first 3 months",
      icon: TrendingUp,
      color: "text-emerald-600",
    },
    {
      title: "At-risk customers",
      value: String(kpi.atRisk),
      sub: "sharp drop — need immediate outreach",
      icon: TrendingDown,
      color: "text-red-600",
    },
  ];

  return (
    <>
      {metrics.map((m) => (
        <Card key={m.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
            <m.icon className={`h-4 w-4 ${m.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{m.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}