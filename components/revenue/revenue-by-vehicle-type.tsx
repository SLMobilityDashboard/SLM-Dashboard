"use client";

import { useState, useEffect, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { RevenueFilters } from "./revenue-filters";

interface AreaStationData {
  AREA: string;
  STATION?: string;
  TOTAL_REVENUE: number;
  REVENUE?: number;
  UTILIZATION?: number;
  TRIPS?: number;
}

interface RevenueByAreaProps {
  filters: RevenueFilters;
  chartTitle?: string;
}

export function RevenueByArea({ filters, chartTitle }: RevenueByAreaProps) {
  const [data, setData] = useState<AreaStationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const prevFiltersRef = useRef<string>("");
  const isFetchingRef = useRef(false);

  const colors = [
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
    "#14b8a6",
    "#f97316",
    "#a855f7",
    "#22c55e",
    "#fb7185",
  ];

  useEffect(() => {
    const fetchAreaRevenueData = async () => {
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

      console.log("Fetching area revenue data with filters:", filters);
      isFetchingRef.current = true;

      setLoading(true);
      setError(null);

      try {
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

        const addOneDay = (date: Date) => {
          const newDate = new Date(date);
          newDate.setDate(newDate.getDate() + 1);
          return newDate;
        };

        const geographicFilters = buildGeographicFilters();

        // Determine if we should show stations (when exactly one area is selected)
        const isShowingStations = filters.selectedAreas?.length === 1;

        let query = "";

        if (isShowingStations) {
          // Query for stations within the selected area
          query = `
            WITH station_data AS (
              SELECT 
                rs.LOCATIONNAME as AREA,
                rs.STATIONNAME as STATION,
                SUM(rs.GROSS_REVENUE) as TOTAL_REVENUE,
                AVG(rs.GROSS_REVENUE) as AVG_REVENUE,
                COUNT(*) as TRIP_COUNT
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
                AND rs.LOCATIONNAME = '${filters.selectedAreas[0].replace(
                  /'/g,
                  "''"
                )}'
                ${geographicFilters}
              GROUP BY rs.LOCATIONNAME, rs.STATIONNAME
            ),
            station_best AS (
              SELECT 
                rs.STATIONNAME,
                MAX(daily_rev.DAILY_REVENUE) as PERSONAL_BEST
              FROM DB_DUMP.PUBLIC.MY_REVENUESUMMARY rs
              LEFT JOIN SOURCE_DATA.MASTER_DATA.AREA_DISTRICT_PROVICE_LOOKUP adp 
                ON rs.LOCATIONNAME = adp.AREA_NAME
              JOIN (
                SELECT 
                  STATIONNAME,
                  DATE,
                  SUM(GROSS_REVENUE) as DAILY_REVENUE
                FROM DB_DUMP.PUBLIC.MY_REVENUESUMMARY
                WHERE DATE < '${
                  filters.dateRange.from.toISOString().split("T")[0]
                }'
                  AND GROSS_REVENUE > 0
                GROUP BY STATIONNAME, DATE
              ) daily_rev ON rs.STATIONNAME = daily_rev.STATIONNAME
              WHERE rs.LOCATIONNAME = '${filters.selectedAreas[0].replace(
                /'/g,
                "''"
              )}'
                ${geographicFilters}
              GROUP BY rs.STATIONNAME
            )
            SELECT 
              sd.AREA,
              sd.STATION,
              sd.TOTAL_REVENUE,
              sd.TOTAL_REVENUE as REVENUE,
              CASE 
                WHEN sb.PERSONAL_BEST IS NULL OR sb.PERSONAL_BEST = 0 THEN 100
                ELSE LEAST(100, (sd.AVG_REVENUE / sb.PERSONAL_BEST) * 100)
              END as UTILIZATION,
              sd.TRIP_COUNT as TRIPS
            FROM station_data sd
            LEFT JOIN station_best sb ON sd.STATION = sb.STATIONNAME
            ORDER BY sd.TOTAL_REVENUE DESC
          `;
        } else {
          // Query for areas
          query = `
            SELECT 
              rs.LOCATIONNAME as AREA,
              NULL as STATION,
              SUM(rs.GROSS_REVENUE) as TOTAL_REVENUE,
              SUM(rs.GROSS_REVENUE) as REVENUE,
              AVG(CASE 
                WHEN rs.GROSS_REVENUE > 0 THEN 75.0 
                ELSE 0 
              END) as UTILIZATION,
              COUNT(*) as TRIPS
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
            GROUP BY rs.LOCATIONNAME
            ORDER BY SUM(rs.GROSS_REVENUE) DESC
          `;
        }

        console.log("Area Revenue Query:", query);

        const response = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql: query }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch area revenue data: ${response.status}`
          );
        }

        const result = await response.json();
        console.log("Area Revenue Data:", result);

        setData(result || []);
        prevFiltersRef.current = currentFiltersString; // Update after successful fetch
      } catch (err: any) {
        console.error("Error fetching area revenue data:", err);
        setError(err);
      } finally {
        setLoading(false);
        isFetchingRef.current = false; // Reset fetching flag
      }
    };

    fetchAreaRevenueData();
  }, [
    filters.dateRange?.from,
    filters.dateRange?.to,
    filters.selectedProvinces,
    filters.selectedDistricts,
    filters.selectedAreas,
    filters.selectedStations,
    filters.aggregation,
  ]);

  const isShowingStations = filters?.selectedAreas?.length === 1;

  if (loading) {
    return (
      <div className="w-full h-[550px] rounded-lg bg-background p-6">
        <div className="h-6 w-1/3 rounded-md bg-gray-300 mb-4 animate-pulse" />
        <div className="flex justify-center items-center h-[240px] gap-2 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-full animate-pulse"
              style={{
                width: 60,
                height: 60,
                backgroundColor: "#ddd",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[550px] text-red-500">
        <div className="text-center">
          <p>Error loading area revenue data</p>
          <p className="text-sm mt-1">{error.message || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[550px] text-muted-foreground">
        <div className="text-center">
          <p>No data available for selected filters</p>
          <p className="text-sm mt-1">
            Try adjusting your date range or location filters
          </p>
        </div>
      </div>
    );
  }

  let chartData = [];

  if (isShowingStations) {
    const totalRevenue = data.reduce(
      (sum, d) => sum + (d.REVENUE ?? d.TOTAL_REVENUE ?? 0),
      0
    );

    chartData = data.map((d, i) => ({
      name: d.STATION || "Unknown Station",
      value:
        totalRevenue > 0
          ? Math.round(
              ((d.REVENUE ?? d.TOTAL_REVENUE ?? 0) / totalRevenue) * 100
            )
          : 0,
      revenue: d.REVENUE ?? d.TOTAL_REVENUE ?? 0,
      utilization: d.UTILIZATION ? Math.round(d.UTILIZATION * 10) / 10 : null,
      trips: d.TRIPS ?? null,
      color: colors[i % colors.length],
    }));
  } else {
    // Group by area
    const grouped = new Map<
      string,
      { revenue: number; utilization: number; trips: number; count: number }
    >();

    data.forEach((d) => {
      const key = d.AREA;
      if (!grouped.has(key)) {
        grouped.set(key, {
          revenue: d.TOTAL_REVENUE ?? d.REVENUE ?? 0,
          utilization: d.UTILIZATION ?? 0,
          trips: d.TRIPS ?? 0,
          count: 1,
        });
      } else {
        const entry = grouped.get(key)!;
        entry.revenue += d.TOTAL_REVENUE ?? d.REVENUE ?? 0;
        entry.utilization = (entry.utilization + (d.UTILIZATION ?? 0)) / 2;
        entry.trips += d.TRIPS ?? 0;
        entry.count += 1;
      }
    });

    const totalRevenue = Array.from(grouped.values()).reduce(
      (sum, g) => sum + g.revenue,
      0
    );

    chartData = Array.from(grouped.entries()).map(
      ([name, { revenue, utilization, trips, count }], i) => ({
        name,
        value:
          totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
        revenue,
        utilization: Math.round(utilization * 10) / 10,
        trips,
        stations: count,
        color: colors[i % colors.length],
      })
    );
  }

  return (
    <ResponsiveContainer width="100%" height={600}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={180}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-3 shadow-md">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="font-medium">{d.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {d.value}% of total revenue
                    </div>
                    <div className="text-sm font-medium">
                      Revenue: Rs. {d.revenue.toLocaleString()}
                    </div>
                    {isShowingStations ? (
                      <>
                        {d.utilization !== null && (
                          <div className="text-sm text-muted-foreground">
                            Utilization: {d.utilization}%
                          </div>
                        )}
                        {d.trips !== null && (
                          <div className="text-sm text-muted-foreground">
                            Records: {d.trips.toLocaleString()}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground">
                          Avg Utilization: {d.utilization}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Records: {d.trips?.toLocaleString() ?? "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Stations: {d.stations}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          content={({ payload }) => (
            <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent pr-2 mt-4 flex justify-center">
              <div className="flex flex-wrap gap-4 justify-center max-w-full">
                {payload?.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span
                      className="text-sm text-muted-foreground truncate max-w-[120px]"
                      title={entry.value?.toString()}
                    >
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
