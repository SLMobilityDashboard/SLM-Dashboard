"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RevenueFilters } from "./revenue-filters";

interface StationData {
  LOCATIONNAME: string;
  LATEST_NET_REVENUE: number;
  PERSONALBEST: number;
  PERIOD: string;
  "PREVIOUS YEARS revenue percentage": number | null;
  STATIONNAME: string;
  STATION_UTILIZATION: string; // percentage string like "88.78"
}

interface TopPerformingStationsProps {
  filters: RevenueFilters;
}

export function TopPerformingStations({ filters }: TopPerformingStationsProps) {
  const [data, setData] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isDescending, setIsDescending] = useState(true);
  const prevFiltersRef = useRef<string>("");
  const isFetchingRef = useRef(false);

  const toggleOrder = () => setIsDescending((prev) => !prev);

  useEffect(() => {
    const fetchTopStationsData = async () => {
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
        // Build geographic filter conditions with proper SQL escaping
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

        // Get aggregation format
        const getAggregationFormat = () => {
          switch (filters.aggregation) {
            case "daily":
              return "TO_DATE(DATE)";
            case "monthly":
              return "TO_VARCHAR(YEAR(DATE)) || '-' || LPAD(MONTH(DATE), 2, '0')";
            case "quarterly":
              return "TO_VARCHAR(YEAR(DATE)) || '-Q' || TO_VARCHAR(QUARTER(DATE))";
            case "annually":
              return "TO_VARCHAR(YEAR(DATE))";
            default:
              return "TO_VARCHAR(YEAR(DATE)) || '-' || LPAD(MONTH(DATE), 2, '0')";
          }
        };

        const addOneDay = (date: Date) => {
          const newDate = new Date(date);
          newDate.setDate(newDate.getDate() + 1);
          return newDate;
        };

        const aggregationFormat = getAggregationFormat();

        // Query to get all stations with their performance metrics
        const stationsQuery = `
          WITH current_period_data AS (
            SELECT 
              rs.STATIONNAME,
              rs.LOCATIONNAME,
              ${aggregationFormat} as PERIOD,
              SUM(rs.GROSS_REVENUE) as PERIOD_REVENUE
            FROM DB_DUMP.PUBLIC.MY_REVENUESUMMARY rs
            LEFT JOIN SOURCE_DATA.MASTER_DATA.AREA_DISTRICT_PROVICE_LOOKUP adp 
              ON rs.LOCATIONNAME = adp.AREA_NAME
           WHERE rs.DATE >= '${
             addOneDay(filters.dateRange.from).toISOString().split("T")[0]
           }'
            AND rs.DATE <= '${
              addOneDay(filters.dateRange.to).toISOString().split("T")[0]
            }'
              AND rs.GROSS_REVENUE > 0
              ${geographicFilters}
            GROUP BY rs.STATIONNAME, rs.LOCATIONNAME, ${aggregationFormat}
          ),
          station_totals AS (
            SELECT 
              STATIONNAME,
              LOCATIONNAME,
              SUM(PERIOD_REVENUE) as LATEST_NET_REVENUE,
              MAX(PERIOD_REVENUE) as PERSONALBEST,
              COUNT(*) as PERIODS_COUNT
            FROM current_period_data
            GROUP BY STATIONNAME, LOCATIONNAME
          ),
          historical_best AS (
            SELECT 
              rs.STATIONNAME,
              MAX(period_sum.PERIOD_REVENUE) as HISTORICAL_BEST
            FROM DB_DUMP.PUBLIC.MY_REVENUESUMMARY rs
            LEFT JOIN SOURCE_DATA.MASTER_DATA.AREA_DISTRICT_PROVICE_LOOKUP adp 
              ON rs.LOCATIONNAME = adp.AREA_NAME
            JOIN (
              SELECT 
                STATIONNAME,
                ${aggregationFormat} as PERIOD,
                SUM(GROSS_REVENUE) as PERIOD_REVENUE
              FROM DB_DUMP.PUBLIC.MY_REVENUESUMMARY
              WHERE DATE <= '${
                filters.dateRange.from.toISOString().split("T")[0]
              }'
                AND GROSS_REVENUE > 0
              GROUP BY STATIONNAME, ${aggregationFormat}
            ) period_sum ON rs.STATIONNAME = period_sum.STATIONNAME
            WHERE rs.GROSS_REVENUE > 0
              ${geographicFilters}
            GROUP BY rs.STATIONNAME
          )
          SELECT 
            st.STATIONNAME,
            st.LOCATIONNAME,
            st.LATEST_NET_REVENUE,
            COALESCE(hb.HISTORICAL_BEST, st.PERSONALBEST) as PERSONALBEST,
            '${
              addOneDay(filters.dateRange.from).toISOString().split("T")[0]
            } to ${
          addOneDay(filters.dateRange.to).toISOString().split("T")[0]
        }' as PERIOD,
            NULL as "PREVIOUS YEARS revenue percentage",
            CASE 
              WHEN COALESCE(hb.HISTORICAL_BEST, st.PERSONALBEST) = 0 THEN '100.0'
              ELSE TO_VARCHAR(LEAST(100, (st.LATEST_NET_REVENUE / COALESCE(hb.HISTORICAL_BEST, st.PERSONALBEST)) * 100), '999.99')
            END as STATION_UTILIZATION
          FROM station_totals st
          LEFT JOIN historical_best hb ON st.STATIONNAME = hb.STATIONNAME
          ORDER BY st.LATEST_NET_REVENUE DESC
        `;

        console.log("Top Stations Query:", stationsQuery);

        const response = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql: stationsQuery }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch stations data: ${response.status}`);
        }

        const result = await response.json();
        console.log("Top Stations Data:", result);

        setData(result || []);

        // Update prevFiltersRef AFTER successful fetch
        prevFiltersRef.current = currentFiltersString;
      } catch (err: any) {
        console.error("Error fetching top stations data:", err);
        setError(err);
      } finally {
        setLoading(false);
        isFetchingRef.current = false; // Reset the fetching flag
      }
    };

    fetchTopStationsData();
  }, [
    filters.dateRange?.from,
    filters.dateRange?.to,
    filters.selectedProvinces,
    filters.selectedDistricts,
    filters.selectedAreas,
    filters.selectedStations,
    filters.aggregation,
  ]);

  const sortedStations = useMemo(() => {
    return [...data].sort((a, b) =>
      isDescending
        ? b.LATEST_NET_REVENUE - a.LATEST_NET_REVENUE
        : a.LATEST_NET_REVENUE - b.LATEST_NET_REVENUE
    );
  }, [data, isDescending]);

  const maxRevenue = data.reduce(
    (max, station) => Math.max(max, station.LATEST_NET_REVENUE || 0),
    0
  );

  const getBadge = (index: number) => {
    if (isDescending) {
      if (index === 0)
        return (
          <Badge
            className="text-[12px] bg-yellow-400 text-black cursor-help"
            title="Top 1 Station"
          >
            🥇 Gold
          </Badge>
        );
      if (index === 1)
        return (
          <Badge
            className="text-[12px] bg-gray-300 text-black cursor-help"
            title="Top 2 Station"
          >
            🥈 Silver
          </Badge>
        );
      if (index === 2)
        return (
          <Badge
            className="text-[12px] bg-orange-300 text-black cursor-help"
            title="Top 3 Station"
          >
            🥉 Bronze
          </Badge>
        );
    } else {
      if (index === 0)
        return (
          <Badge
            className="text-[12px] bg-red-500 text-white cursor-help"
            title="Lowest performer"
          >
            🛑 Lowest
          </Badge>
        );
      if (index === 1)
        return (
          <Badge
            className="text-[12px] bg-yellow-200 text-black cursor-help"
            title="Low performer"
          >
            ⚠️ Low
          </Badge>
        );
      if (index === 2)
        return (
          <Badge
            className="text-[12px] bg-orange-200 text-black cursor-help"
            title="Moderate performer"
          >
            🟠 Moderate
          </Badge>
        );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <CardContent className="p-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-6" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <div className="text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Error loading stations data</p>
          <p className="text-sm mt-1">{error.message || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  if (sortedStations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No stations found for the selected filters</p>
          <p className="text-sm mt-1">
            Try adjusting your date range or location filters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mt-4">
        <div className="text-xl font-semibold">
          {isDescending
            ? "Top Performing BSS Stations"
            : "Lowest Performing BSS Stations"}
          <div className="text-sm text-muted-foreground font-normal">
            {isDescending
              ? "Stations generating the highest revenue"
              : "Stations generating the lowest revenue"}
          </div>
          <div className="text-xs text-muted-foreground font-normal mt-1">
            Showing {sortedStations.length} stations
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={toggleOrder}
          className="text-xs gap-1"
        >
          <ArrowDownUp className="w-4 h-4" />
          {isDescending ? "Descending" : "Ascending"}
        </Button>
      </div>

      <ScrollArea className="h-[600px] w-full rounded-md">
        <div className="space-y-3 pr-4">
          {sortedStations.map((station, index) => {
            const utilizationRate = parseFloat(station.STATION_UTILIZATION);
            const displayUtilization = !isNaN(utilizationRate)
              ? `${utilizationRate.toFixed(1)}% utilization`
              : "No data";

            const displayPercentage =
              maxRevenue > 0
                ? (station.LATEST_NET_REVENUE / maxRevenue) * 100
                : 0;

            return (
              <Card
                key={`${station.STATIONNAME}-${station.LOCATIONNAME}-${index}`}
                className="p-4 hover:shadow-md transition-shadow duration-200"
              >
                <CardContent className="p-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground min-w-[24px]">
                          #{index + 1}
                        </span>
                        <p
                          className="text-sm font-medium leading-none truncate max-w-[180px]"
                          title={station.STATIONNAME}
                        >
                          {station.STATIONNAME}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span
                          className="truncate max-w-[120px]"
                          title={station.LOCATIONNAME}
                        >
                          {station.LOCATIONNAME}
                        </span>
                        <span>•</span>
                        <span className="whitespace-nowrap">
                          {displayUtilization}
                        </span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium text-green-600">
                        {typeof station.LATEST_NET_REVENUE === "number" &&
                        !isNaN(station.LATEST_NET_REVENUE)
                          ? `Rs. ${station.LATEST_NET_REVENUE.toLocaleString(
                              undefined,
                              {
                                maximumFractionDigits: 0,
                              }
                            )}`
                          : "N/A"}
                      </p>
                      <div className="flex items-center flex-row gap-1">
                        <div className="px-2">{getBadge(index)}</div>
                        <Badge
                          variant={
                            displayPercentage >= 100 ? "default" : "secondary"
                          }
                          className="text-xs whitespace-nowrap"
                        >
                          {displayPercentage.toFixed(1)}% of top
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Progress value={displayPercentage} className="h-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
