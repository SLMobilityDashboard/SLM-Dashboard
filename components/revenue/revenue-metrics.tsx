import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  MapPin,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";
import { RevenueFilters } from "./revenue-filters";

interface RevenueMetricsProps {
  filters: RevenueFilters;
}

interface RevenueData {
  ACTIVE_STATIONS: number;
  AVG_NET_REVENUE_PER_PERIOD: number;
  "TOTAL REVENUE": number;
  "previous segment ACTIVE_STATIONS": number;
  "previous segment AVG_NET_REVENUE_PER_PERIOD": number;
  "previous segment TOTAL REVENUE": number;
  UTILIZATION_RATE: number;
  "previous segment UTILIZATION_RATE"?: number;
  data: Array<{
    PERIOD: string;
    NET_REVENUE: number;
  }>;
}

export function RevenueMetrics({ filters }: RevenueMetricsProps) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const prevFiltersRef = useRef<string>("");
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fetchRevenueData = async () => {
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

        const addOneDay = (date: Date) => {
          const newDate = new Date(date);
          newDate.setDate(newDate.getDate() + 1);
          return newDate;
        };

        const geographicFilters = buildGeographicFilters();

        // Get aggregation format - simplified for Snowflake compatibility
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

        const aggregationFormat = getAggregationFormat();

        // Step 1: Get or create personal best records for each station
        const personalBestQuery = `
          WITH current_aggregated AS (
            SELECT 
              rs.STATIONNAME,
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
            GROUP BY rs.STATIONNAME, ${aggregationFormat}
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
            ca.STATIONNAME,
            ca.PERIOD,
            ca.PERIOD_REVENUE,
            COALESCE(hb.HISTORICAL_BEST, ca.PERIOD_REVENUE) as PERSONAL_BEST,
            CASE 
              WHEN COALESCE(hb.HISTORICAL_BEST, ca.PERIOD_REVENUE) = 0 THEN 100
              ELSE LEAST(100, (ca.PERIOD_REVENUE / COALESCE(hb.HISTORICAL_BEST, ca.PERIOD_REVENUE)) * 100)
            END as UTILIZATION_RATE,
            CASE 
              WHEN ca.PERIOD_REVENUE > COALESCE(hb.HISTORICAL_BEST, 0) THEN ca.PERIOD_REVENUE
              ELSE COALESCE(hb.HISTORICAL_BEST, ca.PERIOD_REVENUE)
            END as NEW_PERSONAL_BEST
          FROM current_aggregated ca
          LEFT JOIN historical_best hb ON ca.STATIONNAME = hb.STATIONNAME
        `;

        // Step 2: Calculate main metrics with proper utilization
        const mainQuery = `
          WITH utilization_data AS (
            ${personalBestQuery}
          ),
          metrics AS (
            SELECT 
              COUNT(DISTINCT STATIONNAME) as ACTIVE_STATIONS,
              SUM(PERIOD_REVENUE) / NULLIF(COUNT(DISTINCT PERIOD), 0) as AVG_NET_REVENUE_PER_PERIOD,
              SUM(PERIOD_REVENUE) as "TOTAL REVENUE",
              AVG(UTILIZATION_RATE) as UTILIZATION_RATE
            FROM utilization_data
          )
          SELECT * FROM metrics
        `;

        console.log("Main Query:", mainQuery);

        // Previous period query with same utilization logic
        const daysDiff = getDaysDifference(
          filters.dateRange.from,
          filters.dateRange.to
        );
        const previousFromDate = new Date(filters.dateRange.from);
        previousFromDate.setDate(previousFromDate.getDate() - daysDiff);

        const previousQuery = `
          WITH prev_aggregated AS (
            SELECT 
              rs.STATIONNAME,
              ${aggregationFormat} as PERIOD,
              SUM(rs.GROSS_REVENUE) as PERIOD_REVENUE
            FROM DB_DUMP.PUBLIC.MY_REVENUESUMMARY rs
            LEFT JOIN SOURCE_DATA.MASTER_DATA.AREA_DISTRICT_PROVICE_LOOKUP adp 
              ON rs.LOCATIONNAME = adp.AREA_NAME
            WHERE rs.DATE >= '${previousFromDate.toISOString().split("T")[0]}'
              AND rs.DATE < '${
                filters.dateRange.from.toISOString().split("T")[0]
              }'
              AND rs.GROSS_REVENUE > 0
              ${geographicFilters}
            GROUP BY rs.STATIONNAME, ${aggregationFormat}
          ),
          prev_historical_best AS (
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
              WHERE DATE < '${previousFromDate.toISOString().split("T")[0]}'
                AND GROSS_REVENUE > 0
              GROUP BY STATIONNAME, ${aggregationFormat}
            ) period_sum ON rs.STATIONNAME = period_sum.STATIONNAME
            WHERE rs.GROSS_REVENUE > 0
              ${geographicFilters}
            GROUP BY rs.STATIONNAME
          ),
          prev_utilization_data AS (
            SELECT 
              pa.STATIONNAME,
              pa.PERIOD,
              pa.PERIOD_REVENUE,
              COALESCE(phb.HISTORICAL_BEST, pa.PERIOD_REVENUE) as PERSONAL_BEST,
              CASE 
                WHEN COALESCE(phb.HISTORICAL_BEST, pa.PERIOD_REVENUE) = 0 THEN 100
                ELSE LEAST(100, (pa.PERIOD_REVENUE / COALESCE(phb.HISTORICAL_BEST, pa.PERIOD_REVENUE)) * 100)
              END as UTILIZATION_RATE
            FROM prev_aggregated pa
            LEFT JOIN prev_historical_best phb ON pa.STATIONNAME = phb.STATIONNAME
          )
          SELECT 
            COUNT(DISTINCT STATIONNAME) as "previous segment ACTIVE_STATIONS",
            AVG(PERIOD_REVENUE) as "previous segment AVG_NET_REVENUE_PER_PERIOD",
            SUM(PERIOD_REVENUE) as "previous segment TOTAL REVENUE",
            AVG(UTILIZATION_RATE) as "previous segment UTILIZATION_RATE"
          FROM prev_utilization_data
        `;

        // Execute both queries
        const [currentResponse, previousResponse] = await Promise.all([
          fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sql: mainQuery }),
          }),
          fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sql: previousQuery }),
          }),
        ]);

        if (!currentResponse.ok) {
          throw new Error(
            `Failed to fetch revenue data: ${currentResponse.status}`
          );
        }

        const currentData = await currentResponse.json();
        console.log("Current Data:", currentData);
        let previousData = null;

        if (previousResponse.ok) {
          previousData = await previousResponse.json();
        }

        // Merge current and previous data
        const mergedData = {
          ...currentData[0],
          ...(previousData && previousData[0]
            ? previousData[0]
            : {
                "previous segment ACTIVE_STATIONS": 0,
                "previous segment AVG_NET_REVENUE_PER_PERIOD": 0,
                "previous segment TOTAL REVENUE": 0,
                "previous segment UTILIZATION_RATE": 0,
              }),
        };

        setData(mergedData);

        // Update the previous filters reference after successful fetch
        prevFiltersRef.current = currentFiltersString;
      } catch (err: any) {
        console.error("Error fetching revenue metrics:", err);
        setError(err);
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchRevenueData();
  }, [filters]);

  // Show loading state
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

  // Show error state
  if (error) {
    return (
      <Card className="col-span-4">
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-center">
            <p className="text-muted-foreground">Error loading metrics data</p>
            <p className="text-sm text-red-500 mt-1">
              {error.message || "Unknown error"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state
  if (!data) {
    return (
      <Card className="col-span-4">
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              No data available for the selected filters
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your date range or location filters
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = data["TOTAL REVENUE"];
  const prevTotalRevenue = data["previous segment TOTAL REVENUE"];
  const totalRevenueTrend =
    prevTotalRevenue && prevTotalRevenue !== 0
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
      : null;
  const isTotalRevUp = totalRevenueTrend != null && totalRevenueTrend >= 0;

  const avgRevenue = data.AVG_NET_REVENUE_PER_PERIOD;
  const prevAvgRevenue = data["previous segment AVG_NET_REVENUE_PER_PERIOD"];
  const avgRevenueTrend =
    prevAvgRevenue && prevAvgRevenue !== 0
      ? ((avgRevenue - prevAvgRevenue) / prevAvgRevenue) * 100
      : null;
  const isAvgRevUp = avgRevenueTrend != null && avgRevenueTrend >= 0;

  const activeStations = data.ACTIVE_STATIONS;
  const prevActiveStations = data["previous segment ACTIVE_STATIONS"];
  const stationTrend =
    prevActiveStations && prevActiveStations !== 0
      ? ((activeStations - prevActiveStations) / prevActiveStations) * 100
      : null;
  const isStationUp = stationTrend != null && stationTrend >= 0;

  const utilizationRate = data.UTILIZATION_RATE;
  const prevUtilization = data["previous segment UTILIZATION_RATE"];
  const utilizationTrend =
    typeof prevUtilization === "number" && prevUtilization !== 0
      ? ((utilizationRate - prevUtilization) / prevUtilization) * 100
      : null;
  const isUtilizationUp = utilizationTrend != null && utilizationTrend >= 0;

  const formatPercent = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null || isNaN(value)) {
      return "No data available";
    }

    return `Rs. ${value.toLocaleString()}`;
  };

  // Generate subtitle based on active filters
  const getFilterSubtitle = () => {
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

    return parts.length > 0 ? `${parts.join(", ")}` : "All locations";
  };

  const metrics = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      prev: `Prev: ${formatCurrency(prevTotalRevenue)}`,
      icon: DollarSign,
      change:
        totalRevenueTrend != null ? formatPercent(totalRevenueTrend) : "N/A",
      isIncrease: isTotalRevUp,
    },
    {
      title: "Avg Revenue per Period",
      value: formatCurrency(avgRevenue),
      prev: `Prev: ${formatCurrency(prevAvgRevenue)}`,
      icon: TrendingUp,
      change: avgRevenueTrend != null ? formatPercent(avgRevenueTrend) : "N/A",
      isIncrease: isAvgRevUp,
    },
    {
      title: "Active BSS Stations",
      value: `${activeStations.toLocaleString()}`,
      prev: `Prev: ${prevActiveStations.toLocaleString()}`,
      icon: MapPin,
      change: stationTrend != null ? formatPercent(stationTrend) : "N/A",
      isIncrease: isStationUp,
    },
    {
      title: "Station Utilization Rate",
      value: `${utilizationRate.toFixed(1)}%`,
      prev:
        prevUtilization != null
          ? `Prev: ${prevUtilization.toFixed(1)}%`
          : "N/A",
      icon: TrendingDown,
      change:
        utilizationTrend != null ? formatPercent(utilizationTrend) : "N/A",
      isIncrease: isUtilizationUp,
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
            <div className="mt-2 text-xs text-muted-foreground/80">
              {getFilterSubtitle()}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
