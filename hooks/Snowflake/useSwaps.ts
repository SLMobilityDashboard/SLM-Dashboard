import { useEffect, useState, useMemo } from "react";
import { ProfitFilters } from "./useProfit"; // Only import the filter type

// ✅ Define escapeSQL locally
const escapeSQL = (value: string) => value.replace(/'/g, "''");

// ⬇️ Updated type definitions to match your API response
interface SwapMetrics {
  DATE: string;
  LOCATION: string;
  STATIONNAME: string;
  TOTAL_SWAPS: number;
  TOTAL_REVENUE: number;
  AVERAGE_REVENUE_PER_SWAP: number;
  SWAP_EFFICIENCY: number;
}

interface SwapApiResponse {
  TOTAL_SWAPS: number;
  TOTAL_REVENUE: number;
  REVENUE_PER_SWAP: number;
  AVERAGE_SWAP_TIME: number | null;
  "previous segment TOTAL_SWAPS"?: number;
  "previous segment TOTAL_REVENUE"?: number;
  "previous segment REVENUE_PER_SWAP"?: number;
  "previous segment AVERAGE_SWAP_TIME"?: number | null;
  Areawisedata: SwapMetrics[];
  Datewisedata: SwapMetrics[];
}

// 📊 Additional derived data types
interface MonthlySwapData {
  month: string;
  averageEfficiency: number;
  averageRevenuePerSwap: number;
  totalSwaps: number;
  totalRevenue: number;
}

interface SwapComparison {
  current: {
    totalSwaps: number;
    totalRevenue: number;
    revenuePerSwap: number;
    averageSwapTime: number | null;
  };
  previous: {
    totalSwaps: number;
    totalRevenue: number;
    revenuePerSwap: number;
    averageSwapTime: number | null;
  };
  growth: {
    swapsGrowth: number;
    revenueGrowth: number;
    revenuePerSwapGrowth: number;
  };
}

export const useSwaps = (filters?: ProfitFilters) => {
  const [data, setData] = useState<SwapApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (
      !filters ||
      !filters.dateRange ||
      !(filters.dateRange.from instanceof Date) ||
      !(filters.dateRange.to instanceof Date)
    ) {
      console.warn("❌ Skipping swap fetch: Missing or invalid dateRange filters.");
      setLoading(false);
      return;
    }

    const fetchSwapData = async () => {
      setLoading(true);
      setData(null);
      setError(null);

      // console.log("🔄 Fetching swap data with date", filters.dateRange)

      const fromDate = filters.dateRange.from.toLocaleDateString('en-CA');
      const toDate = filters.dateRange.to.toLocaleDateString('en-CA');


      // 🔧 Improved SQL construction with better null handling
      const areasParam = filters.selectedAreas.length > 0
        ? `'${filters.selectedAreas.map(escapeSQL).join(",")}'`
        : "NULL";
      
      const stationsParam = filters.selectedStations.length > 0
        ? `'${filters.selectedStations.map(escapeSQL).join(",")}'`
        : "NULL";
      
      const aggregationParam = filters.aggregation
        ? `'${escapeSQL(filters.aggregation)}'`
        : "NULL";

      const sql = `
        CALL DB_DUMP.PUBLIC.GET_SWAP_METRICS_PROCEDURE(
          '${fromDate}'::DATE,
          '${toDate}'::DATE,
          ${areasParam},
          ${stationsParam},
          ${aggregationParam}
        )
      `;

      // console.log("🔄 Executing SQL (swaps):", sql);

      try {
        const response = await fetch("/api/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql }),
        });

        if (!response.ok) {
          const errorDetail = await response.text();
          throw new Error(`Swap fetch failed: ${response.statusText} — ${errorDetail}`);
        }

        const result = await response.json();
        // console.log("✅ Swap data result:", result[0]);

        if (
          Array.isArray(result) &&
          result.length > 0 &&
          result[0]?.GET_SWAP_METRICS_PROCEDURE
        ) {
          const payload = result[0].GET_SWAP_METRICS_PROCEDURE;
          
          // ✅ Enhanced validation with better error messages
          if (typeof payload.TOTAL_SWAPS !== "number") {
            throw new Error("Invalid response: TOTAL_SWAPS is not a number");
          }
          
          if (!Array.isArray(payload.Areawisedata) && !Array.isArray(payload.Datewisedata)) {
            throw new Error("Invalid response: Missing both Areawisedata and Datewisedata arrays");
          }
          
          setData(payload);
        } else {
          throw new Error("Invalid response structure: Missing GET_SWAP_METRICS_PROCEDURE");
        }
      } catch (e: any) {
        console.error("❌ Swap fetch error:", e);
        const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
        setError(new Error(errorMessage));
      } finally {
        setLoading(false);
      }
    };

    fetchSwapData();
  }, [filters]);

  // 📈 Enhanced monthly swap efficiency breakdown for charts using Datewisedata
  const monthlySwapEfficiency = useMemo((): MonthlySwapData[] => {
    if (!data?.Datewisedata?.length) return [];
    
    const grouped = data.Datewisedata.reduce((acc, cur) => {
      const date = new Date(cur.DATE);
      const monthYear = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          month: monthYear,
          totalSwaps: 0,
          totalRevenue: 0,
          totalEfficiency: 0,
          count: 0,
        };
      }
      
      acc[monthYear].totalSwaps += cur.TOTAL_SWAPS;
      acc[monthYear].totalRevenue += cur.TOTAL_REVENUE;
      acc[monthYear].totalEfficiency += cur.SWAP_EFFICIENCY;
      acc[monthYear].count++;
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map((entry: any) => ({
      month: entry.month,
      totalSwaps: entry.totalSwaps,
      totalRevenue: entry.totalRevenue,
      averageEfficiency: entry.totalEfficiency / entry.count,
      averageRevenuePerSwap: entry.totalSwaps > 0 ? entry.totalRevenue / entry.totalSwaps : 0,
    }));
  }, [data]);

  // 📊 Top performing stations by total swaps
  const topStationsBySwaps = useMemo(() => {
    if (!data?.Areawisedata?.length) return [];
    
    return [...data.Areawisedata]
      .sort((a, b) => b.TOTAL_SWAPS - a.TOTAL_SWAPS)
      .slice(0, 10)
      .map(station => ({
        stationName: station.STATIONNAME,
        location: station.LOCATION,
        totalSwaps: station.TOTAL_SWAPS,
        totalRevenue: station.TOTAL_REVENUE,
        efficiency: station.SWAP_EFFICIENCY,
      }));
  }, [data]);

  // 📈 Performance comparison with previous period
  const performanceComparison = useMemo((): SwapComparison | null => {
    if (!data) return null;

    const current = {
      totalSwaps: data.TOTAL_SWAPS,
      totalRevenue: data.TOTAL_REVENUE,
      revenuePerSwap: data.REVENUE_PER_SWAP,
      averageSwapTime: data.AVERAGE_SWAP_TIME,
    };

    const previous = {
      totalSwaps: data["previous segment TOTAL_SWAPS"] ?? 0,
      totalRevenue: data["previous segment TOTAL_REVENUE"] ?? 0,
      revenuePerSwap: data["previous segment REVENUE_PER_SWAP"] ?? 0,
      averageSwapTime: data["previous segment AVERAGE_SWAP_TIME"] ?? null,
    };

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const growth = {
      swapsGrowth: calculateGrowth(current.totalSwaps, previous.totalSwaps),
      revenueGrowth: calculateGrowth(current.totalRevenue, previous.totalRevenue),
      revenuePerSwapGrowth: calculateGrowth(current.revenuePerSwap, previous.revenuePerSwap),
    };

    return { current, previous, growth };
  }, [data]);

  // 📅 Date range summary for the current dataset
  const dateRangeSummary = useMemo(() => {
    if (!data?.Datewisedata?.length) return null;
    
    const dates = data.Datewisedata.map(d => new Date(d.DATE)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString(),
      totalDays,
      averageSwapsPerDay: data.TOTAL_SWAPS / totalDays,
      averageRevenuePerDay: data.TOTAL_REVENUE / totalDays,
    };
  }, [data]);

  return {
    // 🔄 Core data
    data,
    loading,
    error,
    
    // 📊 Primary metrics
    totalSwaps: data?.TOTAL_SWAPS ?? null,
    totalRevenue: data?.TOTAL_REVENUE ?? null,
    averageSwapTime: data?.AVERAGE_SWAP_TIME ?? null,
    revenuePerSwap: data?.REVENUE_PER_SWAP ?? null,
    
    // 📈 Derived analytics
    monthlySwapEfficiency,
    topStationsBySwaps,
    performanceComparison,
    dateRangeSummary,
    
    // 🗂️ Raw data arrays for custom processing
    areawiseData: data?.Areawisedata ?? [],
    datewiseData: data?.Datewisedata ?? [],
  };
};