import { useState, useEffect } from "react";

export interface StationRecord {
  STATION_ID: string;
  STATION_NAME: string;
  LATITUDE: number;
  LONGITUDE: number;
  TOTAL_SWAPS: number;
  LAST_SWAP_DATE: string | null;
  // extras you might want later
  LOCATION_NAME: string;
  VENDOR_COMPANY_NAME: string | null;
  STATION_ACTIVE: number;
}

export interface UseStationListResult {
  stations: StationRecord[];
  loading: boolean;
  error: string | null;
}

const STATION_QUERY = `
  WITH swap_stats AS (
    SELECT
      STATION_NAME AS STATION_ID,
      COUNT(*)     AS TOTAL_SWAPS,
      MAX(PAID_AT) AS LAST_SWAP_DATE
    FROM SOURCE_DATA.DYNAMO_DB.FACT_PAYMENT
    WHERE PAYMENT_TYPE  = 'BATTERY_SWAP'
      AND STATION_NAME IS NOT NULL
    GROUP BY STATION_NAME
  )
  SELECT
    ss.STATION_ID,
    ss.STATION_NAME,
    ss.LATITUDE,
    ss.LONGITUDE,
    ss.LOCATION_NAME,
    ss.STATION_ACTIVE,
    v.NAME  AS VENDOR_COMPANY_NAME,
    COALESCE(swap.TOTAL_SWAPS, 0) AS TOTAL_SWAPS,
    swap.LAST_SWAP_DATE
  FROM REPORT_DB.BSS_ANALYTICS.VW_SWAPPING_STATION_LOCATION ss
  LEFT JOIN SOURCE_DATA.MASTER_DATA.VENDOR v
    ON ss.VENDOR_ID = v.VENDOR_ID
   AND v.DELETED = 0
  LEFT JOIN swap_stats swap
    ON (ss.STATION_NAME = swap.STATION_ID OR ss.STATION_ID = swap.STATION_ID)
  WHERE ss.STATION_DELETED = 0
    AND ss.LATITUDE  IS NOT NULL
    AND ss.LONGITUDE IS NOT NULL
    AND UPPER(TRIM(STATION_NAME)) != 'MOCKSTATION'
  ORDER BY TOTAL_SWAPS DESC, ss.STATION_ID;
`;

export function useStationList(): UseStationListResult {
  const [stations, setStations] = useState<StationRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch_() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/query", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ sql: STATION_QUERY }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const rows: StationRecord[] = await res.json();

        if (!cancelled) {
          setStations(
            rows.filter(
              (r) =>
                r.LATITUDE  != null &&
                r.LONGITUDE != null &&
                !isNaN(Number(r.LATITUDE)) &&
                !isNaN(Number(r.LONGITUDE))
            )
          );
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch_();
    return () => { cancelled = true; };
  }, []);

  return { stations, loading, error };
}