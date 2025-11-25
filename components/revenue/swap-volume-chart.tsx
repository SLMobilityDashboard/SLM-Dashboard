"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, MapPin } from "lucide-react";

// ================= TYPES =================
interface Filters {
  aggregation: string;
  customerSegments: string[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  selectedProvinces: string[];
  selectedDistricts: string[];
  selectedAreas: string[];
  selectedStations: string[];
}

interface SwapSummaryRow {
  LOCATION: string;
  STATIONNAME: string;
  TOTAL_SWAPS: number;
  TOTAL_REVENUE: number;
  AVG_REVENUE_PER_SWAP: number;
  AVG_EFFICIENCY: number;
}

interface Area {
  area: string;
  swaps: number;
  revenue: number;
  avgPerSwap: number;
  efficiency: number;
  percentage?: string | number;
  location?: string;
  key: string;
}

interface Category {
  category: string;
  areas: Area[];
  color: string;
}

// ================= HOOK =================
function useEnhancedSwaps(filters: Filters | null) {
  const [areawiseData, setAreawiseData] = useState<SwapSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const prevFiltersRef = useRef<string>("");

  useEffect(() => {
    if (!filters) return;

    const currentFiltersString = JSON.stringify(filters);

    if (prevFiltersRef.current === currentFiltersString) {
      console.log("Filters unchanged, skipping fetch");
      return;
    }

    prevFiltersRef.current = currentFiltersString;

    const fetchAreawiseData = async () => {
      if (!filters?.dateRange?.from || !filters?.dateRange?.to) return;

      setLoading(true);
      setError(null);

      try {
        const buildGeographicFilters = () => {
          const conditions: string[] = [];

          if (filters.selectedProvinces?.length) {
            const provinces = filters.selectedProvinces
              .map((p) => `'${p.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`adp.PROVICE_NAME IN (${provinces})`);
          }

          if (filters.selectedDistricts?.length) {
            const districts = filters.selectedDistricts
              .map((d) => `'${d.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`adp.DISTRICT_NAME IN (${districts})`);
          }

          if (filters.selectedAreas?.length) {
            const areas = filters.selectedAreas
              .map((a) => `'${a.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`ss.LOCATIONNAME IN (${areas})`);
          }

          if (filters.selectedStations?.length) {
            const stations = filters.selectedStations
              .map((s) => `'${s.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`ss.STATIONNAME IN (${stations})`);
          }

          return conditions.length ? `AND ${conditions.join(" AND ")}` : "";
        };

        const addOneDay = (date: Date) => {
          const newDate = new Date(date);
          newDate.setDate(newDate.getDate() + 1);
          return newDate;
        };

        const geographicFilters = buildGeographicFilters();
        const fromDate = addOneDay(filters.dateRange.from)
          .toISOString()
          .split("T")[0];
        const toDate = addOneDay(filters.dateRange.to)
          .toISOString()
          .split("T")[0];

        const areawiseQuery = `
          SELECT 
            ss.LOCATIONNAME as LOCATION,
            ss.STATIONNAME,
            SUM(ss.TOTAL_SWAPS) as TOTAL_SWAPS,
            SUM(ss.TOTAL_REVENUE) as TOTAL_REVENUE,
            SUM(ss.TOTAL_REVENUE) / NULLIF(SUM(ss.TOTAL_SWAPS), 0) as AVG_REVENUE_PER_SWAP,
            AVG(ss.EFFICIENCY) as AVG_EFFICIENCY
          FROM DB_DUMP.PUBLIC.SWAP_SUMMARY ss
          LEFT JOIN SOURCE_DATA.MASTER_DATA.AREA_DISTRICT_PROVICE_LOOKUP adp 
            ON ss.LOCATIONNAME = adp.AREA_NAME
          WHERE ss.DATE >= '${fromDate}'
            AND ss.DATE <= '${toDate}'
            AND ss.TOTAL_SWAPS > 0
            ${geographicFilters}
          GROUP BY ss.LOCATIONNAME, ss.STATIONNAME
          ORDER BY TOTAL_SWAPS DESC
        `;

        console.log("Optimized Areawise Query:", areawiseQuery);

        const response = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql: areawiseQuery }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch areawise data: ${response.status}`);
        }

        const result: SwapSummaryRow[] = await response.json();
        setAreawiseData(result || []);
      } catch (err: any) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchAreawiseData();
  }, [filters]);

  return { areawiseData, loading, error };
}

// ================= HELPERS =================
function groupByCategory(areawiseData: SwapSummaryRow[]): Category[] {
  const categoriesMap = new Map<string, Category>();

  areawiseData.forEach((item) => {
    const location = item.LOCATION || "Unknown Location";

    if (!categoriesMap.has(location)) {
      categoriesMap.set(location, {
        category: location,
        areas: [],
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
      });
    }

    categoriesMap.get(location)!.areas.push({
      area: item.STATIONNAME || "Unknown Station",
      swaps: item.TOTAL_SWAPS || 0,
      revenue: item.TOTAL_REVENUE || 0,
      avgPerSwap: item.AVG_REVENUE_PER_SWAP || 0,
      efficiency: item.AVG_EFFICIENCY || 0,
      key: `${location}-${item.STATIONNAME}`,
    });
  });

  // calculate percentages and sort
  for (const category of categoriesMap.values()) {
    const totalSwaps = category.areas.reduce((sum, a) => sum + a.swaps, 0);
    category.areas = category.areas
      .map((area) => ({
        ...area,
        percentage: totalSwaps
          ? ((area.swaps / totalSwaps) * 100).toFixed(1)
          : 0,
      }))
      .sort((a, b) => b.swaps - a.swaps);
  }

  const allAreas: Area[] = areawiseData.map((item) => ({
    area: item.STATIONNAME || "Unknown Station",
    location: item.LOCATION || "Unknown Location",
    swaps: item.TOTAL_SWAPS || 0,
    revenue: item.TOTAL_REVENUE || 0,
    avgPerSwap: item.AVG_REVENUE_PER_SWAP || 0,
    efficiency: item.AVG_EFFICIENCY || 0,
    key: item.STATIONNAME || "unknown",
  }));

  const totalSwapsAll = allAreas.reduce((sum, a) => sum + a.swaps, 0);

  const allStationsCategory: Category = {
    category: "All Stations",
    areas: allAreas
      .map((area) => ({
        ...area,
        percentage: totalSwapsAll
          ? ((area.swaps / totalSwapsAll) * 100).toFixed(1)
          : 0,
      }))
      .sort((a, b) => b.swaps - a.swaps),
    color: "#8884d8",
  };

  return [allStationsCategory, ...Array.from(categoriesMap.values())];
}

// ================= COMPONENT =================
export default function AreaSwapsChart({
  filters,
}: {
  filters: Filters | null;
}) {
  const { areawiseData, loading, error } = useEnhancedSwaps(filters);

  const categories = useMemo(() => {
    if (!areawiseData.length) return [];
    return groupByCategory(areawiseData);
  }, [areawiseData]);

  const [selectedCategoryIndex] = useState(0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mx-auto" />
        <Card className="p-4">
          <div className="h-[250px] bg-gray-100 rounded animate-pulse" />
        </Card>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Unable to load area swap data
            </p>
            <p className="text-xs text-red-500 mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!categories.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No area data available for selected filters
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const category = categories[selectedCategoryIndex];

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[500px]">
        <div className="space-y-4 pr-4">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={category.areas}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={130}
                  paddingAngle={1}
                  dataKey="swaps"
                >
                  {category.areas.map((entry, index) => (
                    <Cell
                      key={`${category.category}-${entry.area}`}
                      fill={`hsl(${(index * 45 + 20) % 360}, 65%, 60%)`}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as Area;
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-sm">
                          <div className="grid gap-2">
                            <div className="font-medium">{data.area}</div>
                            {data.location && data.location !== data.area && (
                              <div className="text-xs text-muted-foreground">
                                {data.location}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-[0.65rem] uppercase text-muted-foreground">
                                  Swaps
                                </span>
                                <div className="font-bold">
                                  {data.swaps?.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-[0.65rem] uppercase text-muted-foreground">
                                  Share
                                </span>
                                <div className="font-bold">
                                  {data.percentage}%
                                </div>
                              </div>
                              <div>
                                <span className="text-[0.65rem] uppercase text-muted-foreground">
                                  Revenue
                                </span>
                                <div className="font-bold">
                                  Rs. {data.revenue?.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-[0.65rem] uppercase text-muted-foreground">
                                  Avg/Swap
                                </span>
                                <div className="font-bold">
                                  Rs. {data.avgPerSwap?.toFixed(2)}
                                </div>
                              </div>
                              <div className="col-span-2">
                                <span className="text-[0.65rem] uppercase text-muted-foreground">
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
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              <div className="text-sm font-semibold mb-2">
                Station Performance ({category.areas.length} stations) and{" "}
                {category.areas
                  .reduce((s, a) => s + a.swaps, 0)
                  .toLocaleString()}{" "}
                swaps
              </div>
              <ScrollArea className="h-[160px]">
                <div className="space-y-2 pr-4">
                  {category.areas.map((area, index) => (
                    <div
                      key={area.key}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: `hsl(${
                              (index * 45 + 20) % 360
                            }, 65%, 60%)`,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {area.area}
                          </div>
                          {area.location && area.location !== area.area && (
                            <div className="text-xs text-muted-foreground truncate">
                              {area.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold">
                          {area.swaps?.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {area.percentage}% • Rs. {area.avgPerSwap?.toFixed(0)}
                          /swap
                        </div>
                        <div className="text-xs text-green-600">
                          {area.efficiency?.toFixed(1)}% efficiency
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
