import { useEffect, useState } from "react";
import { RevenueFilters } from "@/components/revenue/revenue-filters";

export interface RevenueByAreaData {
  AREA: string;
  STATION?: string;
  TOTAL_REVENUE: number;
  UTILIZATION?: number;
  TRIPS?: number;
}

const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

// Format date as YYYY-MM-DD in local time (no timezone shift)
const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const useRevenueByArea = (filters?: RevenueFilters) => {
  const [data, setData] = useState<RevenueByAreaData[] | null>(null);
  const [Arealoading, setArealoading] = useState(false);

  // Extract normalized date strings to avoid timezone shifts in dependency
  const fromDate = filters?.dateRange?.from && isValidDate(filters.dateRange.from)
    ? formatDateLocal(filters.dateRange.from)
    : undefined;

  const toDate = filters?.dateRange?.to && isValidDate(filters.dateRange.to)
    ? formatDateLocal(filters.dateRange.to)
    : undefined;

  const selectedAreas = filters?.selectedAreas ?? [];
  const selectedStations = filters?.selectedStations ?? [];

  useEffect(() => {
    if (!fromDate || !toDate) {
      console.warn("❌ Skipping fetch: Missing or invalid dateRange", filters);
      return;
    }

    const fetchRevenueData = async () => {
      setArealoading(true);

      const areasList = selectedAreas.length
        ? `'${selectedAreas.join("','")}'`
        : null;

      const stationsList = selectedStations.length
        ? `'${selectedStations.join("','")}'`
        : null;

      const sql = `
        SELECT
          LOCATIONNAME AS AREA,
          STATIONNAME AS STATION,
          SUM(TOTAL_REVENUE) AS TOTAL_REVENUE
        FROM DB_DUMP.PUBLIC.MY_REVENUESUMMARY
        WHERE DATE BETWEEN '${fromDate}' AND '${toDate}'
          ${areasList ? `AND AREA IN (${areasList})` : ""}
          ${stationsList ? `AND STATION IN (${stationsList})` : ""}
        GROUP BY AREA, STATION
        ORDER BY AREA
      `;
      // console.log("Fetching revenue data with SQL:", sql);
      try {
        const response = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql }),
        });

        const result = await response.json();

        if (Array.isArray(result)) {
          setData(result);
        } else {
          console.warn("⚠️ Unexpected result format:", result);
          setData(null);
        }
      } catch (error) {
        console.error("❌ Error fetching revenue data:", error);
        setData(null);
      } finally {
        setArealoading(false);
      }
    };

    fetchRevenueData();
  }, [
    fromDate,
    toDate,
    JSON.stringify(selectedAreas),
    JSON.stringify(selectedStations),
  ]);

  return { data, Arealoading };
};
