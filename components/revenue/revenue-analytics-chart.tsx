"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  ComposedChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, TrendingUp } from "lucide-react";

interface RevenueAnalyticsChartProps {
  filters?: {
    dateRange?: {
      from: Date;
      to: Date;
    };
    selectedProvinces: string[];
    selectedDistricts: string[];
    selectedAreas: string[];
    selectedStations: string[];
    aggregation?: "daily" | "monthly" | "quarterly" | "annually";
  };
  data?: any[];
  loading?: boolean;
  error?: string;
}

export function RevenueAnalyticsChart({
  filters,
  data = [],
  loading = false,
  error,
}: RevenueAnalyticsChartProps) {
  const [swapData, setSwapData] = useState(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState(null);
  const prevFiltersRef = useRef<string>("");
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fetchSwapData = async () => {
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
        console.log("Already fetching, skipping duplicate requests");
        return;
      }

      console.log("Fetching revenue metrics with filters:", filters);

      // 🔧 FIX: Update ref BEFORE starting fetch
      prevFiltersRef.current = currentFiltersString;
      isFetchingRef.current = true;

      setSwapLoading(true);
      setSwapError(null);

      try {
        // Build geographic filter conditions (same as revenue chart)
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
            conditions.push(`ss.LOCATIONNAME IN (${areas})`);
          }

          if (filters.selectedStations.length > 0) {
            const stations = filters.selectedStations
              .map((s) => `'${s.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`ss.STATIONNAME IN (${stations})`);
          }

          return conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";
        };

        const geographicFilters = buildGeographicFilters();

        // Get aggregation format for swap data
        const getAggregationFormat = () => {
          switch (filters.aggregation) {
            case "daily":
              return "TO_DATE(ss.DATE)";
            case "monthly":
              return "TO_VARCHAR(YEAR(ss.DATE)) || '-' || LPAD(MONTH(ss.DATE), 2, '0')";
            case "quarterly":
              return "TO_VARCHAR(YEAR(ss.DATE)) || '-Q' || TO_VARCHAR(QUARTER(ss.DATE))";
            case "annually":
              return "TO_VARCHAR(YEAR(ss.DATE))";
            default:
              return "TO_VARCHAR(YEAR(ss.DATE)) || '-' || LPAD(MONTH(ss.DATE), 2, '0')";
          }
        };

        const aggregationFormat = getAggregationFormat();

        const addOneDay = (date: Date) => {
          const newDate = new Date(date);
          newDate.setDate(newDate.getDate() + 1);
          return newDate;
        };

        // Enhanced swap query with all filters applied
        const swapQuery = `
          SELECT 
              ${aggregationFormat} as PERIOD,
              SUM(ss.TOTAL_SWAPS) as TOTAL_SWAPS,
              SUM(ss.TOTAL_REVENUE) as TOTAL_REVENUE,
              SUM(ss.TOTAL_REVENUE) / NULLIF(SUM(ss.TOTAL_SWAPS), 0) as AVERAGE_REVENUE_PER_SWAP,
              AVG(ss.EFFICIENCY) as SWAP_EFFICIENCY,
              1.2 as AVERAGE_SWAP_TIME,
              COUNT(DISTINCT ss.STATIONNAME) as ACTIVE_STATIONS
            FROM DB_DUMP.PUBLIC.SWAP_SUMMARY ss
            LEFT JOIN SOURCE_DATA.MASTER_DATA.AREA_DISTRICT_PROVICE_LOOKUP adp 
              ON ss.LOCATIONNAME = adp.AREA_NAME
            WHERE ss.DATE >= '${
              addOneDay(filters.dateRange.from).toISOString().split("T")[0]
            }'
              AND ss.DATE <= '${
                addOneDay(filters.dateRange.to).toISOString().split("T")[0]
              }'
              AND ss.TOTAL_SWAPS > 0
              ${geographicFilters}
            GROUP BY ${aggregationFormat}
            ORDER BY ${aggregationFormat}
        `;

        console.log("Enhanced Swap Query:", swapQuery);

        const response = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql: swapQuery }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch swap data: ${response.status}`);
        }

        const result = await response.json();
        console.log("Enhanced Swap Data:", result);

        setSwapData(result || []);
      } catch (err) {
        console.error("Error fetching enhanced swap data:", err);
        setSwapError(err);
      } finally {
        setSwapLoading(false);
      }
    };

    fetchSwapData();
  }, [
    filters?.dateRange?.from,
    filters?.dateRange?.to,
    filters?.selectedProvinces,
    filters?.selectedDistricts,
    filters?.selectedAreas,
    filters?.selectedStations,
    filters?.aggregation,
  ]);

  const aggregation = filters?.aggregation || "daily";

  // Transform data for charts using the filtered swap data
  const chartData = useMemo(() => {
    const dataToUse = swapData || data;

    if (!dataToUse || !Array.isArray(dataToUse) || dataToUse.length === 0) {
      return [];
    }

    const processedData = dataToUse.map((item, index) => {
      const revenue = item.TOTAL_REVENUE || 0;
      const swaps = item.TOTAL_SWAPS || 0;
      const efficiency = item.SWAP_EFFICIENCY || 0;
      const avgPerSwap = item.AVERAGE_REVENUE_PER_SWAP || 0;
      const avgSwapTime = item.AVERAGE_SWAP_TIME || 0;
      const activeStations = item.ACTIVE_STATIONS || 0;
      const period = item.PERIOD || item.DATE || `Period ${index + 1}`;

      // Format the period label based on aggregation
      let periodLabel;

      if (aggregation === "daily") {
        const dateObj = new Date(period);
        periodLabel = isNaN(dateObj.getTime())
          ? period
          : dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
      } else if (aggregation === "monthly") {
        if (period.includes("-")) {
          const [year, month] = period.split("-");
          const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          periodLabel = `${monthNames[parseInt(month) - 1]} ${year}`;
        } else {
          periodLabel = period;
        }
      } else if (aggregation === "quarterly") {
        periodLabel = period; // Format like "2024-Q1"
      } else {
        periodLabel = period; // Just the year
      }

      // Calculate optimal revenue (what revenue would be at 100% efficiency)
      const optimalRevenue =
        efficiency > 0 ? (revenue / efficiency) * 100 : revenue;

      return {
        period: periodLabel,
        revenue,
        swaps,
        avgPerSwap,
        efficiency,
        avgSwapTime,
        activeStations,
        optimalRevenue,
        originalPeriod: period,
      };
    });

    return processedData;
  }, [swapData, data, aggregation]);

  // Get display labels based on aggregation
  const getDisplayLabels = () => {
    switch (aggregation) {
      case "daily":
        return {
          periodLabel: "Date",
          title: "Swap Analytics",
          combinedTitle: "Revenue vs Swaps",
          efficiencyTitle: "Efficiency",
        };
      case "monthly":
        return {
          periodLabel: "Month",
          title: "Swap Analytics",
          combinedTitle: "Revenue vs Swaps",
          efficiencyTitle: "Efficiency",
        };
      case "quarterly":
        return {
          periodLabel: "Quarter",
          title: "Swap Analytics",
          combinedTitle: "Revenue vs Swaps",
          efficiencyTitle: "Efficiency",
        };
      case "annually":
        return {
          periodLabel: "Year",
          title: "Swap Analytics",
          combinedTitle: "Revenue vs Swaps",
          efficiencyTitle: "Efficiency",
        };
      default:
        return {
          periodLabel: "Period",
          title: "Swap Analytics",
          combinedTitle: "Revenue vs Swaps",
          efficiencyTitle: "Efficiency Analysis",
        };
    }
  };

  const labels = getDisplayLabels();

  // Show loading state for filtered data
  if (loading || swapLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="h-[400px] bg-gray-100 rounded animate-pulse flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-gray-400" />
        </div>
      </div>
    );
  }

  // Show error state
  if (error || swapError) {
    const errorMessage = error || swapError?.message || "Unknown error";
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Unable to load swap analytics data
            </p>
            <p className="text-xs text-red-500 mt-1">{errorMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!chartData.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No swap data available for selected filters
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your date range, location filters, or aggregation
              level
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats from filtered data
  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const totalSwaps = chartData.reduce((sum, item) => sum + item.swaps, 0);
  const avgEfficiency =
    chartData.length > 0
      ? chartData.reduce((sum, item) => sum + item.efficiency, 0) /
        chartData.length
      : 0;
  const totalActiveStations =
    chartData.length > 0
      ? Math.max(...chartData.map((item) => item.activeStations))
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground capitalize">
          {aggregation} View • {chartData.length} data points
          {totalActiveStations > 0 && ` • ${totalActiveStations} stations`}
        </div>
        <div className="text-xs text-muted-foreground">
          Filtered by: {filters?.selectedProvinces?.length || 0} provinces,{" "}
          {filters?.selectedDistricts?.length || 0} districts,{" "}
          {filters?.selectedAreas?.length || 0} areas,{" "}
          {filters?.selectedStations?.length || 0} stations
        </div>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">{labels.title}</TabsTrigger>
          <TabsTrigger value="combined">{labels.combinedTitle}</TabsTrigger>
          <TabsTrigger value="efficiency">{labels.efficiencyTitle}</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                className="text-xs fill-muted-foreground"
                // yAxisId="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  `Rs. ${value.toLocaleString(undefined, {
                    notation: value > 1000000 ? "compact" : "standard",
                    maximumFractionDigits: 1,
                  })}`
                }
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                label={{ value: "Swaps", angle: 90, position: "insideRight" }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              {labels.periodLabel}
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {label}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Revenue
                            </span>
                            <span className="font-bold text-primary">
                              Rs. {payload[0].value?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Battery Swaps
                            </span>
                            <span className="font-bold">
                              {data.swaps?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Avg per Swap
                            </span>
                            <span className="font-bold">
                              Rs. {data.avgPerSwap?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Active Stations
                            </span>
                            <span className="font-bold">
                              {data.activeStations}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Efficiency
                            </span>
                            <span className="font-bold">
                              {data.efficiency?.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                strokeWidth={2}
                className="stroke-primary"
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, className: "fill-primary" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="combined">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                yAxisId="left"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  `Rs. ${value.toLocaleString(undefined, {
                    notation: value > 1000000 ? "compact" : "standard",
                    maximumFractionDigits: 1,
                  })}`
                }
                label={{
                  value: "Revenue",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                label={{ value: "Swaps", angle: 90, position: "insideRight" }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="grid gap-2">
                          <div className="font-medium">{label}</div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Revenue
                              </span>
                              <div className="font-bold text-primary">
                                Rs. {data.revenue?.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Battery Swaps
                              </span>
                              <div className="font-bold text-orange-600">
                                {data.swaps?.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Avg per Swap
                              </span>
                              <div className="font-bold">
                                Rs. {data.avgPerSwap?.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Efficiency
                              </span>
                              <div className="font-bold">
                                {data.efficiency?.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="hsl(var(--primary))"
                opacity={0.8}
                radius={[2, 2, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="swaps"
                stroke="#ea580c"
                strokeWidth={3}
                dot={{ fill: "#ea580c", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#ea580c" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="efficiency">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                yAxisId="swaps"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                label={{
                  value: "Battery Swaps",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <YAxis
                yAxisId="efficiency"
                orientation="right"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                label={{
                  value: "Efficiency (%)",
                  angle: 90,
                  position: "insideRight",
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const revenueGap = data.optimalRevenue - data.revenue;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="grid gap-2">
                          <div className="font-medium">{label}</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Battery Swaps
                              </span>
                              <div className="font-bold text-blue-600">
                                {data.swaps?.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Efficiency
                              </span>
                              <div className="font-bold text-green-600">
                                {data.efficiency?.toFixed(2)}%
                              </div>
                            </div>
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Actual Revenue
                              </span>
                              <div className="font-bold text-primary">
                                Rs. {data.revenue?.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Potential Revenue
                              </span>
                              <div className="font-bold text-green-600">
                                Rs.{" "}
                                {data.optimalRevenue
                                  ?.toFixed(0)
                                  ?.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                              </div>
                            </div>
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Active Stations
                              </span>
                              <div className="font-bold">
                                {data.activeStations}
                              </div>
                            </div>
                            {revenueGap > 0 && (
                              <div>
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  Revenue Gap
                                </span>
                                <div className="font-bold text-red-500">
                                  -Rs.{" "}
                                  {revenueGap
                                    ?.toFixed(0)
                                    ?.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                yAxisId="swaps"
                dataKey="swaps"
                fill="#3b82f6"
                opacity={0.6}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="efficiency"
                type="monotone"
                dataKey="efficiency"
                stroke="#16a34a"
                strokeWidth={3}
                dot={{ fill: "#16a34a", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, fill: "#16a34a" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="performance">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                yAxisId="revenue"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}K`}
                label={{
                  value: "Revenue per Swap (Rs.)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <YAxis
                yAxisId="stations"
                orientation="right"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                label={{
                  value: "Active Stations",
                  angle: 90,
                  position: "insideRight",
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="grid gap-2">
                          <div className="font-medium">{label}</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Avg Revenue/Swap
                              </span>
                              <div className="font-bold text-purple-600">
                                Rs. {data.avgPerSwap?.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Active Stations
                              </span>
                              <div className="font-bold text-indigo-600">
                                {data.activeStations}
                              </div>
                            </div>
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Total Swaps
                              </span>
                              <div className="font-bold">
                                {data.swaps?.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Total Revenue
                              </span>
                              <div className="font-bold">
                                Rs. {data.revenue?.toLocaleString()}
                              </div>
                            </div>
                            {data.avgSwapTime && (
                              <div className="col-span-2">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  Avg Swap Time
                                </span>
                                <div className="font-bold">
                                  {data.avgSwapTime?.toFixed(1)} min
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                yAxisId="revenue"
                dataKey="avgPerSwap"
                fill="#8b5cf6"
                opacity={0.7}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="stations"
                type="monotone"
                dataKey="activeStations"
                stroke="#4f46e5"
                strokeWidth={3}
                dot={{ fill: "#4f46e5", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, fill: "#4f46e5" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}
