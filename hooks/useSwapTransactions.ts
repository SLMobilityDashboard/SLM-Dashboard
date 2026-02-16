"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface SwapFilters {
  dateRange?: { from?: Date; to?: Date };
  selectedAreas: string[];
  selectedStations: string[];
  selectedCustomers: string[];  // ✅ Changed from customerId
  paymentMethods: string[];
}

export interface SwapTransaction {
  MODEL: string;
  STATUS: string;
  CUSTOMER_ID: string;
  CUSTOMER_NAME: string;
  PAYMENT_ID: string;
  PAYMENT_METHOD: string;
  PAYMENT_TYPE: string;
  PAYMENT_STATUS: string;
  AMOUNT: number;
  PAYMENT_TIME: number;
  TRANSACTION_TIME: number;
  LOCATION_NAME: string;
  STATION_NAME: string;
  OLDCABINET_NO: number;
  OLDCABINET_BID: string;
  OLDBID_BATPERCENT: number;
  OLDCABINET_DOOR: number;
  OLDCABINET_CHARGER_ONLINE: number;
  OLDCABINET_BATTERY_STATUS: number;
  OLDCABINET_CELL_TEMP: number;
  OLDCABINET_IS_BATTERY: number;
  OLDCABINET_I: number;
  OLDCABINET_S: number;
  OLDCABINET_V: number;
  OLDCABINET_SINGLE_VOL: string;
  NEWCABINET_NO: number;
  NEWCABINET_BID: string;
  NEWBID_BATPERCENT: number;
  NEWCABINET_DOOR: number;
  NEWCABINET_CHARGER_ONLINE: number;
  NEWCABINET_BATTERY_STATUS: number;
  NEWCABINET_CELL_TEMP: number;
  NEWCABINET_IS_BATTERY: number;
  NEWCABINET_I: number;
  NEWCABINET_S: number;
  NEWCABINET_V: number;
  NEWCABINET_SINGLE_VOL: string;
}

interface RawSwapRow {
  MODEL?: string | null;
  STATUS?: string | null;
  CUSTOMER_ID?: string | null;
  CUSTOMER_NAME?: string | null;
  PAYMENT_ID?: string | null;
  PAYMENT_METHOD?: string | null;
  PAYMENT_TYPE?: string | null;
  PAYMENT_STATUS?: string | null;
  AMOUNT?: number | string | null;
  PAYMENT_TIME?: number | string | null;
  TRANSACTION_TIME?: number | string | null;
  LOCATION_NAME?: string | null;
  STATION_NAME?: string | null;
  OLDCABINET_NO?: number | string | null;
  OLDCABINET_BID?: string | null;
  OLDBID_BATPERCENT?: number | string | null;
  OLDCABINET_DOOR?: number | string | null;
  OLDCABINET_CHARGER_ONLINE?: number | string | null;
  OLDCABINET_BATTERY_STATUS?: number | string | null;
  OLDCABINET_CELL_TEMP?: number | string | null;
  OLDCABINET_IS_BATTERY?: number | string | null;
  OLDCABINET_I?: number | string | null;
  OLDCABINET_S?: number | string | null;
  OLDCABINET_V?: number | string | null;
  OLDCABINET_SINGLE_VOL?: string | null;
  NEWCABINET_NO?: number | string | null;
  NEWCABINET_BID?: string | null;
  NEWBID_BATPERCENT?: number | string | null;
  NEWCABINET_DOOR?: number | string | null;
  NEWCABINET_CHARGER_ONLINE?: number | string | null;
  NEWCABINET_BATTERY_STATUS?: number | string | null;
  NEWCABINET_CELL_TEMP?: number | string | null;
  NEWCABINET_IS_BATTERY?: number | string | null;
  NEWCABINET_I?: number | string | null;
  NEWCABINET_S?: number | string | null;
  NEWCABINET_V?: number | string | null;
  NEWCABINET_SINGLE_VOL?: string | null;
}

export interface SwapKpiMetrics {
  totalSwaps: number;
  successfulSwaps: number;
  totalRevenue: number;
  avgSwapValue: number;
  successRate: number;
  uniqueCabinets: number;
  uniqueStations: number;
  uniqueBatteries: number;
  avgBatteryImprovement: number;
}

export interface UseSwapTransactionsReturn {
  swaps: SwapTransaction[];
  swapsLoading: boolean;
  swapsError: string | null;
  kpi: SwapKpiMetrics | null;
  kpiLoading: boolean;
  kpiError: string | null;
  currentPage: number;
  totalCount: number;
  totalPages: number;
  goToPage: (page: number) => void;
  refetch: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 200;

// ============================================================================
// SQL BUILDERS
// ============================================================================

function buildWhere(filters: SwapFilters): string {
  const p: string[] = [
    "1=1",
    // Data quality filters
    // "AMOUNT > 0",
    // "STATION_NAME IS NOT NULL AND STATION_NAME != ''",
    // "LOCATION_NAME IS NOT NULL AND LOCATION_NAME != ''",
    // "TRANSACTION_TIME > 946684800000",
  ];

  // Date range
  if (filters.dateRange?.from instanceof Date) {
    p.push(`TRANSACTION_TIME >= ${filters.dateRange.from.getTime()}`);
  }

  if (filters.dateRange?.to instanceof Date) {
    const end = new Date(filters.dateRange.to);
    end.setHours(23, 59, 59, 999);
    p.push(`TRANSACTION_TIME <= ${end.getTime()}`);
  }

  // Area filter (partial match)
  if (filters.selectedAreas?.length) {
    const areas = filters.selectedAreas
      .map((a) => `LOCATION_NAME LIKE '%${a.replace(/'/g, "''")}%'`)
      .join(" OR ");
    p.push(`(${areas})`);
  }

  // Station filter (partial match)
  if (filters.selectedStations?.length) {
    const stations = filters.selectedStations
      .map((s) => `STATION_NAME LIKE '%${s.replace(/'/g, "''")}%'`)
      .join(" OR ");
    p.push(`(${stations})`);
  }

  // Payment method filter
  if (filters.paymentMethods?.length) {
    const methods = filters.paymentMethods
      .map((m) => `'${m.replace(/'/g, "''")}'`)
      .join(",");
    p.push(`PAYMENT_METHOD IN (${methods})`);
  }

  // ✅ FIXED: Customer Names/IDs filter (handles both CUSTOMER_NAME and CUSTOMER_ID)
  if (filters.selectedCustomers?.length) {
    const customers = filters.selectedCustomers
      .map((c) => `COALESCE(NULLIF(CUSTOMER_NAME, ''), CUSTOMER_ID) = '${c.replace(/'/g, "''")}'`)
      .join(" OR ");
    p.push(`(${customers})`);
  }

  return p.join("\n AND ");
}

function buildCardsSQL(filters: SwapFilters, page: number): string {
  return `
SELECT 
  MODEL,
  STATUS,
  CUSTOMER_ID,
  CUSTOMER_NAME, 
  PAYMENT_ID,
  PAYMENT_METHOD,
  PAYMENT_TYPE,
  PAYMENT_STATUS,
  AMOUNT,
  PAYMENT_TIME,
  TRANSACTION_TIME,
  LOCATION_NAME,
  STATION_NAME,
  OLDCABINET_NO,
  OLDCABINET_BID,
  OLDBID_BATPERCENT,
  OLDCABINET_DOOR,
  OLDCABINET_CHARGER_ONLINE,
  OLDCABINET_BATTERY_STATUS,
  OLDCABINET_CELL_TEMP,
  OLDCABINET_IS_BATTERY,
  OLDCABINET_I,
  OLDCABINET_S,
  OLDCABINET_V,
  OLDCABINET_SINGLE_VOL,
  NEWCABINET_NO,
  NEWCABINET_BID,
  NEWBID_BATPERCENT,
  NEWCABINET_DOOR,
  NEWCABINET_CHARGER_ONLINE,
  NEWCABINET_BATTERY_STATUS,
  NEWCABINET_CELL_TEMP,
  NEWCABINET_IS_BATTERY,
  NEWCABINET_I,
  NEWCABINET_S,
  NEWCABINET_V,
  NEWCABINET_SINGLE_VOL
FROM DB_DUMP.PUBLIC.SWAP_OVERALL
WHERE ${buildWhere(filters)}
ORDER BY TRANSACTION_TIME DESC
LIMIT ${PAGE_SIZE}
OFFSET ${(page - 1) * PAGE_SIZE}
  `.trim();
}

function buildCountSQL(filters: SwapFilters): string {
  return `
SELECT COUNT(*) AS TOTAL
FROM DB_DUMP.PUBLIC.SWAP_OVERALL
WHERE ${buildWhere(filters)}
  `.trim();
}

function buildKpiSQL(filters: SwapFilters): string {
  return `
SELECT 
  COUNT(*) AS TOTAL_SWAPS,
  SUM(CASE WHEN PAYMENT_STATUS = 'PAID' THEN 1 ELSE 0 END) AS SUCCESSFUL_SWAPS,
  COALESCE(SUM(AMOUNT), 0) AS TOTAL_REVENUE,
  COALESCE(AVG(AMOUNT), 0) AS AVG_SWAP_VALUE,
  COALESCE(
    100.0 * SUM(CASE WHEN PAYMENT_STATUS = 'PAID' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
    0
  ) AS SUCCESS_RATE,
  COUNT(DISTINCT CASE WHEN OLDCABINET_NO > 0 THEN OLDCABINET_NO END) +
  COUNT(DISTINCT CASE WHEN NEWCABINET_NO > 0 THEN NEWCABINET_NO END) AS UNIQUE_CABINETS,
  COUNT(DISTINCT STATION_NAME) AS UNIQUE_STATIONS,
  COUNT(DISTINCT CASE WHEN OLDCABINET_BID != '' THEN OLDCABINET_BID END) +
  COUNT(DISTINCT CASE WHEN NEWCABINET_BID != '' THEN NEWCABINET_BID END) AS UNIQUE_BATTERIES,
  COALESCE(
    AVG(CASE 
      WHEN NEWBID_BATPERCENT > 0 AND OLDBID_BATPERCENT > 0 
      THEN CAST(NEWBID_BATPERCENT AS FLOAT) - CAST(OLDBID_BATPERCENT AS FLOAT)
      ELSE NULL
    END),
    0
  ) AS AVG_BATTERY_IMPROVEMENT
FROM DB_DUMP.PUBLIC.SWAP_OVERALL
WHERE ${buildWhere(filters)}
  `.trim();
}

// ============================================================================
// UTILITIES
// ============================================================================

async function runQuery<T>(sql: string, signal: AbortSignal): Promise<T[]> {
  const res = await fetch("/api/testquery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
    signal,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = (body as { error?: string })?.error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  return res.json() as Promise<T[]>;
}

function toNum(v: number | string | null | undefined, fb = 0): number {
  if (v === null || v === undefined) return fb;
  const n = typeof v === "number" ? v : parseFloat(v as string);
  return isNaN(n) ? fb : n;
}

function toStr(v: string | null | undefined, fb = ""): string {
  return v ?? fb;
}

function normaliseRow(raw: RawSwapRow): SwapTransaction | null {
  const amount = toNum(raw.AMOUNT);
  const stationName = toStr(raw.STATION_NAME);
  const locationName = toStr(raw.LOCATION_NAME);
  const transactionTime = toNum(raw.TRANSACTION_TIME);

  // if (amount <= 0 || !stationName || !locationName || transactionTime < 946684800000) {
  //   return null;
  // }

  return {
    MODEL: toStr(raw.MODEL),
    STATUS: toStr(raw.STATUS),
    CUSTOMER_ID: toStr(raw.CUSTOMER_ID),
    CUSTOMER_NAME: toStr(raw.CUSTOMER_NAME),
    PAYMENT_ID: toStr(raw.PAYMENT_ID),
    PAYMENT_METHOD: toStr(raw.PAYMENT_METHOD),
    PAYMENT_TYPE: toStr(raw.PAYMENT_TYPE),
    PAYMENT_STATUS: toStr(raw.PAYMENT_STATUS),
    AMOUNT: amount,
    PAYMENT_TIME: toNum(raw.PAYMENT_TIME),
    TRANSACTION_TIME: transactionTime,
    LOCATION_NAME: locationName,
    STATION_NAME: stationName,
    OLDCABINET_NO: toNum(raw.OLDCABINET_NO),
    OLDCABINET_BID: toStr(raw.OLDCABINET_BID),
    OLDBID_BATPERCENT: toNum(raw.OLDBID_BATPERCENT),
    OLDCABINET_DOOR: toNum(raw.OLDCABINET_DOOR),
    OLDCABINET_CHARGER_ONLINE: toNum(raw.OLDCABINET_CHARGER_ONLINE),
    OLDCABINET_BATTERY_STATUS: toNum(raw.OLDCABINET_BATTERY_STATUS),
    OLDCABINET_CELL_TEMP: toNum(raw.OLDCABINET_CELL_TEMP),
    OLDCABINET_IS_BATTERY: toNum(raw.OLDCABINET_IS_BATTERY),
    OLDCABINET_I: toNum(raw.OLDCABINET_I),
    OLDCABINET_S: toNum(raw.OLDCABINET_S),
    OLDCABINET_V: toNum(raw.OLDCABINET_V),
    OLDCABINET_SINGLE_VOL: toStr(raw.OLDCABINET_SINGLE_VOL),
    NEWCABINET_NO: toNum(raw.NEWCABINET_NO),
    NEWCABINET_BID: toStr(raw.NEWCABINET_BID),
    NEWBID_BATPERCENT: toNum(raw.NEWBID_BATPERCENT),
    NEWCABINET_DOOR: toNum(raw.NEWCABINET_DOOR),
    NEWCABINET_CHARGER_ONLINE: toNum(raw.NEWCABINET_CHARGER_ONLINE),
    NEWCABINET_BATTERY_STATUS: toNum(raw.NEWCABINET_BATTERY_STATUS),
    NEWCABINET_CELL_TEMP: toNum(raw.NEWCABINET_CELL_TEMP),
    NEWCABINET_IS_BATTERY: toNum(raw.NEWCABINET_IS_BATTERY),
    NEWCABINET_I: toNum(raw.NEWCABINET_I),
    NEWCABINET_S: toNum(raw.NEWCABINET_S),
    NEWCABINET_V: toNum(raw.NEWCABINET_V),
    NEWCABINET_SINGLE_VOL: toStr(raw.NEWCABINET_SINGLE_VOL),
  };
}

function hasDateRange(f: SwapFilters): boolean {
  return f.dateRange?.from instanceof Date && f.dateRange?.to instanceof Date;
}

function filtersKey(f: SwapFilters): string {
  return JSON.stringify({
    from: f.dateRange?.from instanceof Date ? f.dateRange.from.getTime() : null,
    to: f.dateRange?.to instanceof Date ? f.dateRange.to.getTime() : null,
    stations: [...(f.selectedStations ?? [])].sort(),
    areas: [...(f.selectedAreas ?? [])].sort(),
    customers: [...(f.selectedCustomers ?? [])].sort(),  // ✅ Changed
    methods: [...(f.paymentMethods ?? [])].sort(),
  });
}

// ============================================================================
// HOOK
// ============================================================================

export function useSwapTransactions(filters: SwapFilters): UseSwapTransactionsReturn {
  const [swaps, setSwaps] = useState<SwapTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [swapsLoading, setSwapsLoading] = useState(true);
  const [swapsError, setSwapsError] = useState<string | null>(null);

  const [kpi, setKpi] = useState<SwapKpiMetrics | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const cardsAbortRef = useRef<AbortController | null>(null);
  const kpiAbortRef = useRef<AbortController | null>(null);

  const lastFetchedFilterKey = useRef<string | null>(null);
  const lastFetchedPage = useRef(0);

  const fetchCards = useCallback(async (page: number, f: SwapFilters) => {
    console.log(`🔄 [fetchCards] Starting fetch for page ${page}`);

    cardsAbortRef.current?.abort();
    const ctrl = new AbortController();
    cardsAbortRef.current = ctrl;

    setSwapsLoading(true);
    setSwapsError(null);

    try {
      const t0 = performance.now();
      const sql = buildCardsSQL(f, page);
      console.log(`📋 [SQL Query]:\n${sql}`);

      const [rows, countRows] = await Promise.all([
        runQuery<RawSwapRow>(sql, ctrl.signal),
        runQuery<{ TOTAL: number | string }>(buildCountSQL(f), ctrl.signal),
      ]);

      const normalised = rows
        .map(normaliseRow)
        .filter((row): row is SwapTransaction => row !== null);

      const total = toNum(countRows[0]?.TOTAL ?? 0);

      console.log(
        `📄 Cards p${page}: ${normalised.length} valid rows / ${total} total (${(
          performance.now() - t0
        ).toFixed(0)}ms)`
      );

      setSwaps(normalised);
      setTotalCount(total);
      lastFetchedPage.current = page;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log(`⏸️ [fetchCards] Aborted`);
        return;
      }

      const msg =
        err instanceof Error ? err.message : "Failed to load swap transactions";
      console.error("❌ Cards fetch:", msg, err);
      setSwapsError(msg);
    } finally {
      setSwapsLoading(false);
    }
  }, []);

  const fetchKpi = useCallback(async (f: SwapFilters) => {
    console.log(`🔄 [fetchKpi] Starting KPI fetch`);

    kpiAbortRef.current?.abort();
    const ctrl = new AbortController();
    kpiAbortRef.current = ctrl;

    setKpiLoading(true);
    setKpiError(null);

    try {
      const t0 = performance.now();
      const sql = buildKpiSQL(f);
      console.log(`📋 [KPI SQL]:\n${sql}`);

      const rows = await runQuery<{
        TOTAL_SWAPS: number | string;
        SUCCESSFUL_SWAPS: number | string;
        TOTAL_REVENUE: number | string;
        AVG_SWAP_VALUE: number | string;
        SUCCESS_RATE: number | string;
        UNIQUE_CABINETS: number | string;
        UNIQUE_STATIONS: number | string;
        UNIQUE_BATTERIES: number | string;
        AVG_BATTERY_IMPROVEMENT: number | string;
      }>(sql, ctrl.signal);

      const row = rows[0];
      if (!row) throw new Error("Empty KPI response");

      const kpiData = {
        totalSwaps: toNum(row.TOTAL_SWAPS),
        successfulSwaps: toNum(row.SUCCESSFUL_SWAPS),
        totalRevenue: toNum(row.TOTAL_REVENUE),
        avgSwapValue: toNum(row.AVG_SWAP_VALUE),
        successRate: toNum(row.SUCCESS_RATE),
        uniqueCabinets: toNum(row.UNIQUE_CABINETS),
        uniqueStations: toNum(row.UNIQUE_STATIONS),
        uniqueBatteries: toNum(row.UNIQUE_BATTERIES),
        avgBatteryImprovement: toNum(row.AVG_BATTERY_IMPROVEMENT),
      };

      console.log(`📊 KPI fetched in ${(performance.now() - t0).toFixed(0)}ms:`, kpiData);
      setKpi(kpiData);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log(`⏸️ [fetchKpi] Aborted`);
        return;
      }

      const msg = err instanceof Error ? err.message : "Failed to load KPI metrics";
      console.error("❌ KPI fetch:", msg, err);
      setKpiError(msg);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  const currentFilterKey = filtersKey(filters);

  useEffect(() => {
    console.log(`🎯 [Filter Effect] Triggered`);

  if (lastFetchedFilterKey.current !== null &&
      currentFilterKey === lastFetchedFilterKey.current) {
    console.log(`⏭️ [Filter Effect] Keys match, skipping`);
    return;
  }

    console.log(`🔄 [Filter Effect] Keys differ, updating`);
    lastFetchedFilterKey.current = currentFilterKey;

    if (!hasDateRange(filters)) {
      console.log(`⚠️ [Filter Effect] No date range, clearing data`);
      setSwaps([]);
      setTotalCount(0);
      setKpi(null);
      setCurrentPage(1);
      lastFetchedPage.current = 0;
      setSwapsLoading(false);
      setKpiLoading(false);
      return;
    }

    console.log(`🚀 [Filter Effect] Fetching page 1 + KPI`);
    setCurrentPage(1);
    lastFetchedPage.current = 0;

    fetchCards(1, filters);
    fetchKpi(filters);
  }, [currentFilterKey, filters, fetchCards, fetchKpi]);

  useEffect(() => {
    console.log(
      `📄 [Page Effect] Triggered - page=${currentPage}, lastFetched=${lastFetchedPage.current}`
    );

    if (currentPage === lastFetchedPage.current) {
      console.log(`⏭️ [Page Effect] Page already fetched, skipping`);
      return;
    }

    if (!lastFetchedFilterKey.current) {
      console.log(`⏭️ [Page Effect] No filter key yet, skipping`);
      return;
    }

    if (!hasDateRange(filters)) {
      console.log(`⏭️ [Page Effect] No date range, skipping`);
      return;
    }

    console.log(`🚀 [Page Effect] Fetching page ${currentPage}`);
    fetchCards(currentPage, filters);
  }, [currentPage, filters, fetchCards]);

  useEffect(() => {
    return () => {
      console.log(`🧹 [Cleanup] Aborting pending requests`);
      cardsAbortRef.current?.abort();
      kpiAbortRef.current?.abort();
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, Math.ceil(totalCount / PAGE_SIZE)));
      console.log(`📍 [goToPage] Navigating to page ${clamped}`);
      setCurrentPage(clamped);
    },
    [totalCount]
  );

  const refetch = useCallback(() => {
    console.log(`🔄 [refetch] Manual refetch triggered`);

    if (!hasDateRange(filters)) {
      console.log(`⚠️ [refetch] No date range, skipping`);
      return;
    }

    lastFetchedFilterKey.current = "";
    lastFetchedPage.current = 0;
    setCurrentPage(1);

    fetchCards(1, filters);
    fetchKpi(filters);
  }, [filters, fetchCards, fetchKpi]);

  return {
    swaps,
    swapsLoading,
    swapsError,
    kpi,
    kpiLoading,
    kpiError,
    currentPage,
    totalCount,
    totalPages,
    goToPage,
    refetch,
  };
}