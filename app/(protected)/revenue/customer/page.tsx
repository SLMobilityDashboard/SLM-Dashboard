"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

import { SwapMetrics } from "@/components/swap/swap-metrics";
import { SwapTrendChart } from "@/components/swap/swap-trend-chart";
import { SwapCustomerTable } from "@/components/swap/swap-customer-table";
import { SwapSegmentChart } from "@/components/swap/swap-segment-chart";
import { SwapScatterChart } from "@/components/swap/swap-scatter-chart"; // 👈 new
import { SwapFilters, type SwapFilters as SwapFiltersType } from "@/components/swap/swap-filters";

import { useSwapAnalytics } from "@/hooks/useSwapAnalytics";

// ---------------------------------------------------------------------------
// Skeleton helpers
// ---------------------------------------------------------------------------

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2 space-y-1">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-36" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-1">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-64" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-[220px] pt-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-sm"
              style={{ height: `${30 + Math.round(Math.random() * 60)}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DonutSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Skeleton className="h-[180px] w-[180px] rounded-full" />
        <div className="w-full space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-sm" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-3 w-80" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 pb-3 border-b mb-3">
          {[120, 80, 60, 60, 60, 90, 80].map((w, i) => (
            <Skeleton key={i} className="h-4" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-3 border-b last:border-0 items-center">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-5 w-[80px] rounded-full" />
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-4 w-[90px]" />
            <Skeleton className="h-4 w-[80px]" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SwapAnalyticsPage() {
  const [filters, setFilters] = useState<SwapFiltersType>({
    search: "",
    segment: "all",
    sortBy: "score",
    selectedProvinces: [],
    selectedDistricts: [],
    selectedAreas: [],
    selectedStations: [],
    dateRange: {
      from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      to: new Date(),
    },
  });

  const { customers, kpi, loading, error, refetch } = useSwapAnalytics(filters);

  const filteredCustomers = useMemo(() => {
    let list = [...customers];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.customerId.toLowerCase().includes(q)
      );
    }
    if (filters.segment !== "all") {
      list = list.filter((c) => c.segment === filters.segment);
    }
    return list;
  }, [customers, filters.search, filters.segment]);

  const handleFiltersChange = (newFilters: SwapFiltersType) => {
    if (JSON.stringify(newFilters) === JSON.stringify(filters)) return;
    setFilters(newFilters);
  };

  const isDateRangeSet =
    filters.dateRange?.from instanceof Date &&
    filters.dateRange?.to instanceof Date;

  const isInitialLoad = loading && customers.length === 0 && kpi === null;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Customer swap analytics
          </h2>
          <p className="text-muted-foreground">
            Historical behavioral scoring — volume · trend · consistency · stability
          </p>
        </div>
        {isDateRangeSet && (
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Filters */}
      <SwapFilters onFiltersChange={handleFiltersChange} />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load data: {error}
        </div>
      )}

      {isDateRangeSet && (
        <>
          {/* KPI metric cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isInitialLoad ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <SwapMetrics kpi={kpi} loading={loading} />
            )}
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {isInitialLoad ? (
              <>
                <ChartSkeleton className="col-span-2" />
                <ChartSkeleton />
                <DonutSkeleton />
              </>
            ) : (
              <>
                {/* 1. Scatter plot — full width */}
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle>Customer segment map</CardTitle>
                    <CardDescription>
                      Health score vs swap trend — dot size = total swaps. Click legend to filter segments.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SwapScatterChart
                      customers={customers}
                      loading={loading}
                    />
                  </CardContent>
                </Card>

                {/* 2. Monthly trend chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly swap volume</CardTitle>
                    <CardDescription>
                      Fleet total with 3-month rolling average
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SwapTrendChart
                      fleetMonthly={kpi?.fleetMonthly}
                      loading={loading}
                    />
                  </CardContent>
                </Card>

                {/* 3. Segment donut */}
                <Card>
                  <CardHeader>
                    <CardTitle>Segment breakdown</CardTitle>
                    <CardDescription>
                      Customers by behavioral classification
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SwapSegmentChart
                      segmentCounts={kpi?.segmentCounts}
                      loading={loading}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Customer table */}
          {isInitialLoad ? (
            <TableSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Customer swap intelligence</CardTitle>
                <CardDescription>
                  Scored 0–100 per customer from{" "}
                  <code className="text-xs">DB_DUMP.PUBLIC.SWAP_OVERALL</code>.
                  Score = volume (30) + trend (25) + consistency (25) + stability (20).
                  Trend compares last 3 months vs first 3 months of the selected period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SwapCustomerTable
                  customers={filteredCustomers}
                  loading={loading}
                  filters={filters}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!isDateRangeSet && !loading && (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          Select a date range to load customer analytics.
        </div>
      )}
    </div>
  );
}