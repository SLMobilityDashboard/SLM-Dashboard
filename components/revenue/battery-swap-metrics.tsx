"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Battery,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";
import { RevenueFilters } from "./revenue-filters";

interface BatterySwapMetricsProps {
  filters: RevenueFilters;
}

interface SwapMetricsData {
  totalSwaps: number;
  totalRevenue: number;
  avgRevenuePerSwap: number;
  avgSwapTime: number;
  previousTotalSwaps: number;
  previousTotalRevenue: number;
  previousAvgRevenuePerSwap: number;
  previousAvgSwapTime: number;
}

export function BatterySwapMetrics({ filters }: BatterySwapMetricsProps) {
  const [data, setData] = useState<SwapMetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const prevFiltersRef = useRef<string>("");
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fetchSwapMetrics = async () => {
      if (!filters.dateRange?.from || !filters.dateRange?.to) {
        return;
      }

      // Check if filters are the same
      const currentFiltersString = JSON.stringify(filters);
      if (prevFiltersRef.current === currentFiltersString) {
        console.log("Filters unchanged, skipping update");
        return;
      }

      // Prevent concurrent fetches
      if (isFetchingRef.current) {
        console.log("Already fetching, skipping duplicate request");
        return;
      }

      console.log("Fetching revenue metrics with filters:", filters);
      isFetchingRef.current = true;

      setLoading(true);
      setError(null);

      try {
        // Helper function to calculate days difference
        const getDaysDifference = (from: Date, to: Date): number => {
          const diffTime = Math.abs(to.getTime() - from.getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };

        // Build geographic filter conditions
        const buildGeographicFilters = () => {
          let conditions = [];

          if (filters.selectedProvinces.length > 0) {
            const provinces = filters.selectedProvinces
              .map((p) => `'${p.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`adp.PROVICE_NAME IN (${provinces})`);
          }

          if (filters.selectedDistricts.length > 0) {
            const districts = filters.selectedDistricts
              .map((d) => `'${d.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`adp.DISTRICT_NAME IN (${districts})`);
          }

          if (filters.selectedAreas.length > 0) {
            const areas = filters.selectedAreas
              .map((a) => `'${a.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`rs.LOCATIONNAME IN (${areas})`);
          }

          if (filters.selectedStations.length > 0) {
            const stations = filters.selectedStations
              .map((s) => `'${s.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`rs.STATIONNAME IN (${stations})`);
          }

          return conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";
        };

        const geographicFilters = buildGeographicFilters();

        const addOneDay = (date: Date) => {
          const newDate = new Date(date);
          newDate.setDate(newDate.getDate() + 1);
          return newDate;
        };

        // Current period metrics
        const currentQuery = `
          SELECT 
            SUM(rs.TOTAL_SWAPS) as totalSwaps,
            SUM(rs.TOTAL_REVENUE) as totalRevenue,
            AVG(rs.TOTAL_REVENUE) as avgRevenuePerSwap,
            1.2 as avgSwapTime
          FROM DB_DUMP.PUBLIC.MY_REVENUESUMMARY rs
          LEFT JOIN SOURCE_DATA.MASTER_DATA.AREA_DISTRICT_PROVICE_LOOKUP adp 
            ON rs.LOCATIONNAME = adp.AREA_NAME
          WHERE rs.DATE >= '${
            addOneDay(filters.dateRange.from).toISOString().split("T")[0]
          }'
            AND rs.DATE <= '${
              addOneDay(filters.dateRange.to).toISOString().split("T")[0]
            }'
            AND rs.TOTAL_REVENUE > 0
            AND rs.LOCATIONNAME != 'HOME_CHARGING'
            ${geographicFilters}
        `;

        // Compute the number of days in the current range
        const daysDiff = getDaysDifference(
          filters.dateRange.from,
          filters.dateRange.to
        );

        // Previous period: subtract the same number of days
        const previousFromDate = new Date(filters.dateRange.from);
        previousFromDate.setDate(previousFromDate.getDate() - daysDiff - 1);

        const previousToDate = new Date(filters.dateRange.to);
        previousToDate.setDate(previousToDate.getDate() - daysDiff);

        const previousQuery = `
          SELECT 
            SUM(rs.TOTAL_SWAPS) as previousTotalSwaps,
            SUM(rs.TOTAL_REVENUE) as previousTotalRevenue,
            AVG(rs.TOTAL_REVENUE) as previousAvgRevenuePerSwap,
            1.2 as previousAvgSwapTime
          FROM DB_DUMP.PUBLIC.MY_REVENUESUMMARY rs
          LEFT JOIN SOURCE_DATA.MASTER_DATA.AREA_DISTRICT_PROVICE_LOOKUP adp 
            ON rs.LOCATIONNAME = adp.AREA_NAME
          WHERE rs.DATE >= '${previousFromDate.toISOString().split("T")[0]}'
            AND rs.DATE <= '${previousToDate.toISOString().split("T")[0]}'
            AND rs.TOTAL_REVENUE > 0
            ${geographicFilters}
        `;

        console.log("Current Swap Metrics Query:", currentQuery);
        console.log("Previous Swap Metrics Query:", previousQuery);

        // Execute both queries
        const [currentResponse, previousResponse] = await Promise.all([
          fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sql: currentQuery }),
          }),
          fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sql: previousQuery }),
          }),
        ]);

        if (!currentResponse.ok) {
          throw new Error(
            `Failed to fetch swap metrics: ${currentResponse.status}`
          );
        }

        const currentData = await currentResponse.json();
        let previousData = null;

        if (previousResponse.ok) {
          previousData = await previousResponse.json();
        }

        console.log("Current Swap Metrics Data:", currentData);
        console.log("Previous Swap Metrics Data:", previousData);

        // Merge current and previous data
        const metricsData = {
          totalSwaps: currentData[0]?.TOTALSWAPS ?? 0,
          totalRevenue: currentData[0]?.TOTALREVENUE ?? 0,
          avgRevenuePerSwap: currentData[0]?.AVGREVENUEPERSWAP ?? 0,
          avgSwapTime: currentData[0]?.AVGSWAPTIME ?? 0,
          previousTotalSwaps: previousData?.[0]?.PREVIOUSTOTALSWAPS ?? 0,
          previousTotalRevenue: previousData?.[0]?.PREVIOUSTOTALREVENUE ?? 0,
          previousAvgRevenuePerSwap:
            previousData?.[0]?.PREVIOUSAVGREVENUEPERSWAP ?? 0,
          previousAvgSwapTime: previousData?.[0]?.PREVIOUSAVGSWAPTIME ?? 0,
        };

        setData(metricsData);
      } catch (err: any) {
        console.error("Error fetching swap metrics:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSwapMetrics();
  }, [
    filters.dateRange?.from,
    filters.dateRange?.to,
    filters.selectedProvinces,
    filters.selectedDistricts,
    filters.selectedAreas,
    filters.selectedStations,
    filters.aggregation,
  ]);

  // Calculate growth percentages
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const formatGrowthPercentage = (growth: number | null) => {
    if (growth === null) return "N/A";
    const sign = growth >= 0 ? "+" : "";
    return `${sign}${growth.toFixed(1)}%`;
  };

  const formatCurrency = (value: number) => {
    return `Rs. ${value.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}`;
  };

  if (loading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <div className="h-4 w-4 bg-muted-foreground/20 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-muted-foreground/20 h-8 w-24 rounded animate-pulse mb-3" />
              <div className="flex justify-between items-center">
                <div className="h-3 w-16 bg-muted-foreground/20 rounded animate-pulse" />
                <div className="h-3 w-12 bg-muted-foreground/20 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  if (error) {
    return (
      <Card className="col-span-4">
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-center">
            <p className="text-muted-foreground">Error loading swap metrics</p>
            <p className="text-sm text-red-500 mt-1">
              {error.message || "Unknown error"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="col-span-4">
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              No swap data available for the selected filters
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your date range or location filters
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const swapsGrowth = calculateGrowth(data.totalSwaps, data.previousTotalSwaps);
  const revenueGrowth = calculateGrowth(
    data.totalRevenue,
    data.previousTotalRevenue
  );
  const revenuePerSwapGrowth = calculateGrowth(
    data.avgRevenuePerSwap,
    data.previousAvgRevenuePerSwap
  );
  const swapTimeGrowth = calculateGrowth(
    data.avgSwapTime,
    data.previousAvgSwapTime
  );

  const metrics = [
    {
      title: "Total Battery Swaps",
      value: data.totalSwaps.toLocaleString(),
      prev: `Prev: ${data.previousTotalSwaps.toLocaleString()}`,
      icon: Battery,
      change: formatGrowthPercentage(swapsGrowth),
      isIncrease: swapsGrowth !== null && swapsGrowth >= 0,
    },
    {
      title: "Total Swap Revenue",
      value: formatCurrency(data.totalRevenue),
      prev: `Prev: ${formatCurrency(data.previousTotalRevenue)}`,
      icon: DollarSign,
      change: formatGrowthPercentage(revenueGrowth),
      isIncrease: revenueGrowth !== null && revenueGrowth >= 0,
    },
    {
      title: "Avg Revenue per Swap",
      value: formatCurrency(data.avgRevenuePerSwap),
      prev: `Prev: ${formatCurrency(data.previousAvgRevenuePerSwap)}`,
      icon: TrendingUp,
      change: formatGrowthPercentage(revenuePerSwapGrowth),
      isIncrease: revenuePerSwapGrowth !== null && revenuePerSwapGrowth >= 0,
    },
    {
      title: "Avg Swap Duration",
      value: `${data.avgSwapTime.toFixed(1)} min`,
      prev: `Prev: ${data.previousAvgSwapTime.toFixed(1)} min`,
      icon: Clock,
      change: formatGrowthPercentage(swapTimeGrowth),
      isIncrease: swapTimeGrowth !== null && swapTimeGrowth < 0, // Lower time is better
    },
  ];

  return (
    <>
      {metrics.map(({ title, value, icon: Icon, change, isIncrease, prev }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <div className="mt-3 flex justify-between items-center text-xs text-muted-foreground">
              <div>{prev}</div>
              {change === "N/A" ? (
                <span className="text-muted-foreground">N/A</span>
              ) : (
                <div className="flex items-center">
                  {isIncrease ? (
                    <ArrowUpIcon className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={isIncrease ? "text-green-500" : "text-red-500"}
                  >
                    {change}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
