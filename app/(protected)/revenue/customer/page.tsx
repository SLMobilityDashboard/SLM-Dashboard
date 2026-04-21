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

import { SwapMetrics }       from "@/components/swap/swap-metrics";
import { SwapDowChart }      from "@/components/swap/swap-dow-chart";   // ← replaces SwapTrendChart
import { SwapCustomerTable } from "@/components/swap/swap-customer-table";
import { SwapSegmentChart }  from "@/components/swap/swap-segment-chart";
import { SwapSegmentChart as SwapBeeswarmMatrix } from "@/components/swap/swap-scatter-chart";
import { SwapFilters, type SwapFilters as SwapFiltersType } from "@/components/swap/swap-filters";

import { useSwapAnalytics } from "@/hooks/useSwapAnalytics";

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

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

function DowSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-3 w-72" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fleet bar chart skeleton */}
        <div className="flex items-end gap-2 h-[180px]">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
            <Skeleton
              key={d}
              className="flex-1 rounded-sm"
              style={{ height: `${40 + Math.random() * 50}%` }}
            />
          ))}
        </div>
        {/* Filter pills skeleton */}
        <div className="flex gap-2">
          {[80, 110, 120, 90, 80].map((w, i) => (
            <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
          ))}
        </div>
        {/* Table skeleton */}
        <div className="rounded-lg border overflow-hidden">
          <div className="flex gap-3 p-3 border-b bg-muted/40">
            {[130, 110, 60, 60, 110, 45, 45, 45, 45, 45, 45, 45].map((w, i) => (
              <Skeleton key={i} className="h-3" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 border-b last:border-0 items-center">
              <Skeleton className="h-4 w-[130px]" />
              <Skeleton className="h-5 w-[110px] rounded-full" />
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-4 w-[110px]" />
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-6 w-[45px]" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BeeswarmSkeleton() {
  return (
    <Card className="col-span-2">
      <CardHeader className="space-y-1">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-3 w-80" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 280px" }}>
          <Skeleton className="h-[400px] w-full rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-[180px] w-full rounded-lg" />
            <Skeleton className="h-[180px] w-full rounded-lg" />
          </div>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SwapAnalyticsPage() {
  const [filters, setFilters] = useState<SwapFiltersType>({
    search:            "",
    segment:           "all",
    sortBy:            "score",
    selectedProvinces: [],
    selectedDistricts: [],
    selectedAreas:     [],
    selectedStations:  [],
    dateRange: {
      from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      to:   new Date(),
    },
  });

  const [chartFilterIds, setChartFilterIds] = useState<string[] | null>(null);

  const { customers, kpi, loading, error, refetch } = useSwapAnalytics(filters);

  // ── Table filtering ────────────────────────────────────────────────────────
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

    if (chartFilterIds !== null) {
      const idSet = new Set(chartFilterIds);
      list = list.filter((c) => idSet.has(c.customerId));
    }

    return list;
  }, [customers, filters.search, filters.segment, chartFilterIds]);

  const handleFiltersChange = (newFilters: SwapFiltersType) => {
    if (JSON.stringify(newFilters) === JSON.stringify(filters)) return;
    setChartFilterIds(null);
    setFilters(newFilters);
  };

  const handleChartFilter = (ids: string[] | null) => {
    setChartFilterIds(ids);
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
            Behavioral scoring — volume · trend · consistency · stability · day pattern
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

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load data: {error}
        </div>
      )}

      {isDateRangeSet && (
        <>
          {/* KPI cards */}
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
                <BeeswarmSkeleton />
                <DowSkeleton />
                <DonutSkeleton />
              </>
            ) : (
              <>
                {/* ── 1. Beeswarm + action matrix — full width ─────────── */}
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle>Customer segment map</CardTitle>
                    <CardDescription>
                      Grouped by segment · Y = health score · colour = trend direction ·
                      size = total swaps. Click a dot or action quadrant to filter the
                      table below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SwapBeeswarmMatrix
                      customers={customers}
                      loading={loading}
                      onFilter={handleChartFilter}
                    />
                  </CardContent>
                </Card>

                {/* ── 2. Day-of-week pattern — replaces monthly trend ───── */}
                <Card>
                  <CardHeader>
                    <CardTitle>Weekday vs weekend swap patterns</CardTitle>
                    <CardDescription>
                      Fleet swap volume by day · per-customer pattern classification ·
                      filter by Fleet operator, Weekend warrior, Balanced, or Sporadic
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SwapDowChart
                      customers={customers}
                      dowFleet={kpi?.dowFleet}
                      loading={loading}
                    />
                  </CardContent>
                </Card>

                {/* ── 3. Segment donut ─────────────────────────────────── */}
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
                      dayPatternCounts={kpi?.dayPatternCounts}
                      loading={loading}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* ── Customer table ─────────────────────────────────────────── */}
          {isInitialLoad ? (
            <TableSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Customer swap intelligence</CardTitle>
                    <CardDescription className="mt-1">
                      Scored 0–100 from{" "}
                      <code className="text-xs">DB_DUMP.PUBLIC.SWAP_OVERALL</code>.
                      Score = volume (30 pts) + trend (25 pts) + consistency (25 pts) +
                      stability (20 pts). Trend uses weighted regression over all active
                      months — recent months weighted 2×.
                    </CardDescription>
                  </div>

                  {chartFilterIds !== null && (
                    <div className="flex items-center gap-2 text-sm shrink-0">
                      <span className="text-muted-foreground">
                        Showing{" "}
                        <span className="font-medium text-foreground">
                          {filteredCustomers.length}
                        </span>{" "}
                        of {customers.length} customers
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setChartFilterIds(null)}
                      >
                        ✕ Clear chart filter
                      </Button>
                    </div>
                  )}
                </div>
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