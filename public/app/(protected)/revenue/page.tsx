"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RevenueOverview } from "@/components/revenue/revenue-overview";
import { RevenueMetrics } from "@/components/revenue/revenue-metrics";
import { RevenueChart } from "@/components/revenue/revenue-chart";
import { TopPerformingStations } from "@/components/revenue/top-performing-routes";
import { RevenueByArea } from "@/components/revenue/revenue-by-vehicle-type";
import {
  RevenueFilters,
  type RevenueFilters as RevenueFiltersType,
} from "@/components/revenue/revenue-filters";
import { useRevenueByArea } from "@/hooks/Snowflake/useRevenue4stations";
import { useTopStations } from "@/hooks/Snowflake/useTopStations";

export default function RevenuePage() {
  const [filters, setFilters] = useState<RevenueFiltersType>({
    selectedProvinces: [],
    selectedDistricts: [],
    selectedAreas: [],
    selectedStations: [],
    customerSegments: [],
    revenueRange: {},
    paymentMethods: [],
    aggregation: "monthly",
  });

  // Set default date range to past year if not already set
  useEffect(() => {
    if (!filters.dateRange?.from || !filters.dateRange?.to) {
      const today = new Date();

      const from = new Date(today);
      from.setMonth(today.getMonth() - 12);
      from.setDate(1);

      const to = new Date(today.getFullYear(), today.getMonth(), 0);

      setFilters((prev) => ({
        ...prev,
        dateRange: { from, to },
      }));
    }
  }, [filters.dateRange?.from, filters.dateRange?.to]);

  const handleFiltersChange = (newFilters: RevenueFiltersType) => {
    console.log("Filters changed:", newFilters); // Debug log
    setFilters(newFilters);
  };

  // No external data fetching needed - all components handle their own data
  // const { data: ArearevenueData, Arealoading } = useRevenueByArea(filters);

  const isDateRangeSet =
    filters.dateRange &&
    filters.dateRange.from instanceof Date &&
    filters.dateRange.to instanceof Date;

  const chartTitle = useMemo(() => {
    return filters.selectedAreas.length === 1
      ? `Revenue by Stations - ${filters.selectedAreas[0]}`
      : "Revenue by Area";
  }, [filters.selectedAreas]);

  const chartDescription = useMemo(() => {
    return filters.selectedAreas.length === 1
      ? `Distribution of revenue across BSS stations in ${filters.selectedAreas[0]}`
      : "Distribution of revenue across different service areas";
  }, [filters.selectedAreas]);

  const getFilterSummary = () => {
    const parts = [];

    if (filters.selectedProvinces.length > 0) {
      parts.push(
        `${filters.selectedProvinces.length} Province${
          filters.selectedProvinces.length > 1 ? "s" : ""
        }`
      );
    }

    if (filters.selectedDistricts.length > 0) {
      parts.push(
        `${filters.selectedDistricts.length} District${
          filters.selectedDistricts.length > 1 ? "s" : ""
        }`
      );
    }

    if (filters.selectedAreas.length > 0) {
      parts.push(
        `${filters.selectedAreas.length} Area${
          filters.selectedAreas.length > 1 ? "s" : ""
        }`
      );
    }

    if (filters.selectedStations.length > 0) {
      parts.push(
        `${filters.selectedStations.length} Station${
          filters.selectedStations.length > 1 ? "s" : ""
        }`
      );
    }

    return parts.length > 0 ? ` - ${parts.join(", ")}` : "";
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Revenue Overview{getFilterSummary()}
          </h2>
          {(filters.selectedProvinces.length > 0 ||
            filters.selectedDistricts.length > 0 ||
            filters.selectedAreas.length > 0 ||
            filters.selectedStations.length > 0) && (
            <p className="text-muted-foreground">
              Data filtered by selected geographic locations
            </p>
          )}
        </div>
      </div>

      <RevenueFilters onFiltersChange={handleFiltersChange} />

      {isDateRangeSet && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* RevenueMetrics handles its own data fetching */}
            <RevenueMetrics filters={filters} />
          </div>

          <div className="grid gap-4">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue Trends{getFilterSummary()}</CardTitle>
                <CardDescription>
                  {filters.aggregation.charAt(0).toUpperCase() +
                    filters.aggregation.slice(1)}{" "}
                  revenue over the selected period
                  {filters.dateRange?.from &&
                    filters.dateRange?.to &&
                    ` (${filters.dateRange.from.toLocaleDateString()} - ${filters.dateRange.to.toLocaleDateString()})`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {/* RevenueChart now handles its own data fetching */}
                <RevenueChart filters={filters} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent>
                {/* TopPerformingStations now handles its own data fetching */}
                <TopPerformingStations filters={filters} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {chartTitle}
                  {getFilterSummary()}
                </CardTitle>
                <CardDescription>{chartDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* RevenueByArea now handles its own data fetching */}
                <RevenueByArea filters={filters} chartTitle={chartTitle} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
