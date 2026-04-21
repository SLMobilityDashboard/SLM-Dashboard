"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SwapFilters } from "@/components/swap/swap-filters";

// ============================================================================
// TYPES
// ============================================================================

export type Segment = "Champion" | "Rising" | "Steady" | "Cooling" | "At risk" | "New";

export interface CustomerSwapData {
  customerId: string;
  customerName: string;
  score: number;
  segment: Segment;
  total: number;
  avg: number;
  avg3: number;
  peak: number;
  trend: number;
  consistency: number;
  cv: number;
  history: number[];
  monthLabels: string[];
  avgBatteryImprovement: number;
  avgOldBatPercent: number;
  successRate: number;
  totalRevenue: number;
  primaryStation: string;
  primaryLocation: string;
}

export interface SwapAnalyticsKpi {
  totalCustomers: number;
  avgHealthScore: number;
  trendingUp: number;
  atRisk: number;
  totalSwaps: number;
  fleetMonthly: { month: string; swaps: number; rolling3: number | null }[];
  segmentCounts: Record<Segment, number>;
}

interface RawMonthlyRow {
  CUSTOMER_ID: string;
  CUSTOMER_NAME: string;
  MONTH_LABEL: string;
  MONTH_INDEX: number | string;
  SWAP_COUNT: number | string;
  AVG_OLD_BAT: number | string;
  AVG_NEW_BAT: number | string;
  SUCCESS_SWAPS: number | string;
  TOTAL_REVENUE: number | string;
}

interface RawEnrichmentRow {
  CUSTOMER_ID: string;
  CUSTOMER_NAME: string;
  PRIMARY_STATION: string;
  PRIMARY_LOCATION: string;
}

interface UseSwapAnalyticsReturn {
  customers: CustomerSwapData[];
  kpi: SwapAnalyticsKpi | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SEGMENT_COLORS: Record<Segment, string> = {
  Champion: "#3B6D11",
  Rising:   "#185FA5",
  Steady:   "#5F5E5A",
  Cooling:  "#854F0B",
  "At risk":"#A32D2D",
  New:      "#993556",
};

export const SEGMENT_BG: Record<Segment, string> = {
  Champion: "bg-green-100 text-green-800",
  Rising:   "bg-blue-100 text-blue-800",
  Steady:   "bg-gray-100 text-gray-700",
  Cooling:  "bg-amber-100 text-amber-800",
  "At risk":"bg-red-100 text-red-800",
  New:      "bg-pink-100 text-pink-800",
};

export const OFFERS: Record<Segment, string> = {
  Champion:  "Priority swap lane + free quarterly battery check",
  Rising:    "10% off next 15 swaps — keep the momentum",
  Steady:    "Loyalty reward: 1 free swap per 20",
  Cooling:   "Re-engagement: 3 free swaps this month",
  "At risk": "Win-back: 5 free swaps + personal call",
  New:       "Welcome pack: first 5 swaps at 50% off",
};

const ALL_SEGMENTS: Segment[] = ["Champion", "Rising", "Steady", "Cooling", "At risk", "New"];

// ============================================================================
// SQL BUILDERS
// ============================================================================

function buildWhere(filters: SwapFilters): string {
  const parts: string[] = ["1=1"];

  if (filters.dateRange?.from instanceof Date) {
    parts.push(`TRANSACTION_TIME >= ${filters.dateRange.from.getTime()}`);
  }
  if (filters.dateRange?.to instanceof Date) {
    const end = new Date(filters.dateRange.to);
    end.setHours(23, 59, 59, 999);
    parts.push(`TRANSACTION_TIME <= ${end.getTime()}`);
  }
  if (filters.selectedAreas?.length) {
    const areas = filters.selectedAreas
      .map((a) => `LOCATION_NAME LIKE '%${a.replace(/'/g, "''")}%'`)
      .join(" OR ");
    parts.push(`(${areas})`);
  }
  if (filters.selectedStations?.length) {
    const stations = filters.selectedStations
      .map((s) => `STATION_NAME LIKE '%${s.replace(/'/g, "''")}%'`)
      .join(" OR ");
    parts.push(`(${stations})`);
  }

  return parts.join("\n    AND ");
}

function buildMonthlyQuery(filters: SwapFilters): string {
  // ✅ FIX: never fall back to 0 — use "to" date or now() to avoid
  // DATEDIFF producing huge month indexes that drop rows via BETWEEN 1 AND 12
  const fromMs = filters.dateRange?.from instanceof Date
    ? filters.dateRange.from.getTime()
    : filters.dateRange?.to instanceof Date
      ? filters.dateRange.to.getTime()
      : Date.now();

  return `
WITH base AS (
  SELECT
    CUSTOMER_ID                                                               AS CUSTOMER_ID,
    COALESCE(NULLIF(TRIM(CUSTOMER_NAME), ''), CUSTOMER_ID)                   AS CUSTOMER_NAME,
    TO_TIMESTAMP(TRANSACTION_TIME / 1000)                                    AS TS,
    DATE_TRUNC('month', TO_TIMESTAMP(TRANSACTION_TIME / 1000))               AS MONTH_START,
    PAYMENT_STATUS,
    AMOUNT,
    OLDBID_BATPERCENT,
    NEWBID_BATPERCENT
  FROM DB_DUMP.PUBLIC.SWAP_OVERALL
  WHERE ${buildWhere(filters)}
),
monthly AS (
  SELECT
    CUSTOMER_ID,
    CUSTOMER_NAME,
    MONTH_START,
    TO_VARCHAR(MONTH_START, 'Mon YYYY')                                      AS MONTH_LABEL,
    DATEDIFF('month',
      DATE_TRUNC('month', TO_TIMESTAMP(${fromMs} / 1000)),
      MONTH_START
    ) + 1                                                                     AS MONTH_INDEX,
    COUNT(*)                                                                  AS SWAP_COUNT,
    AVG(OLDBID_BATPERCENT::FLOAT)                                            AS AVG_OLD_BAT,
    AVG(NEWBID_BATPERCENT::FLOAT)                                            AS AVG_NEW_BAT,
    SUM(CASE WHEN PAYMENT_STATUS = 'PAID' THEN 1 ELSE 0 END)                 AS SUCCESS_SWAPS,
    COALESCE(SUM(AMOUNT), 0)                                                  AS TOTAL_REVENUE
  FROM base
  GROUP BY CUSTOMER_ID, CUSTOMER_NAME, MONTH_START
)
SELECT
  CUSTOMER_ID,
  CUSTOMER_NAME,
  MONTH_LABEL,
  MONTH_INDEX,
  SWAP_COUNT,
  COALESCE(AVG_OLD_BAT, 0)  AS AVG_OLD_BAT,
  COALESCE(AVG_NEW_BAT, 0)  AS AVG_NEW_BAT,
  SUCCESS_SWAPS,
  TOTAL_REVENUE
FROM monthly
WHERE MONTH_INDEX BETWEEN 1 AND 12
ORDER BY CUSTOMER_ID, MONTH_INDEX ASC
  `.trim();
}

function buildEnrichmentQuery(filters: SwapFilters): string {
  return `
WITH ranked AS (
  SELECT
    CUSTOMER_ID                                                               AS CUSTOMER_ID,
    COALESCE(NULLIF(TRIM(CUSTOMER_NAME), ''), CUSTOMER_ID)                   AS CUSTOMER_NAME,
    STATION_NAME,
    LOCATION_NAME,
    COUNT(*) AS CNT,
    ROW_NUMBER() OVER (
      PARTITION BY CUSTOMER_ID
      ORDER BY COUNT(*) DESC
    ) AS RN
  FROM DB_DUMP.PUBLIC.SWAP_OVERALL
  WHERE ${buildWhere(filters)}
    AND STATION_NAME IS NOT NULL
    AND STATION_NAME != ''
  GROUP BY CUSTOMER_ID, CUSTOMER_NAME, STATION_NAME, LOCATION_NAME
)
SELECT
  CUSTOMER_ID,
  CUSTOMER_NAME,
  STATION_NAME   AS PRIMARY_STATION,
  LOCATION_NAME  AS PRIMARY_LOCATION
FROM ranked
WHERE RN = 1
  `.trim();
}

// ============================================================================
// SCORING LOGIC
// ============================================================================

function totalMonthsInRange(filters: SwapFilters): number {
  if (!filters.dateRange?.from || !filters.dateRange?.to) return 12;
  const diff =
    (filters.dateRange.to.getFullYear() - filters.dateRange.from.getFullYear()) * 12 +
    (filters.dateRange.to.getMonth() - filters.dateRange.from.getMonth()) + 1;
  return Math.min(12, Math.max(1, diff));
}

function computeScore(history: number[]): {
  score: number;
  avg: number;
  avg3: number;
  peak: number;
  trend: number;
  consistency: number;
  cv: number;
} {
  const n = history.length;
  const total = history.reduce((a, b) => a + b, 0);
  const avg = n > 0 ? total / n : 0;
  const peak = Math.max(...history, 0);

  // ✅ FIX: filter zeros consistently in BOTH early and recent windows
  // Previously early3 filtered zeros but recent3 did not — this caused
  // artificially high trends for customers who were inactive early on,
  // and under-penalized customers who went quiet recently.
  const recent3 = history.slice(-3).filter((v) => v > 0);
  const early3  = history.slice(0, 3).filter((v) => v > 0);

  const avg3 = recent3.length
    ? Math.round((recent3.reduce((a, b) => a + b, 0) / recent3.length) * 10) / 10
    : 0;

  const avgEarly = early3.length
    ? early3.reduce((a, b) => a + b, 0) / early3.length
    : 0;

  const trend =
    avgEarly > 0
      ? Math.round(((avg3 - avgEarly) / avgEarly) * 100)
      : avg3 > 0 ? 100 : 0;

  const nonZero = history.filter((v) => v > 0).length;
  const consistency = Math.round((nonZero / n) * 100);

  const variance = history.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / n;
  const cv = avg > 0 ? Math.sqrt(variance) / avg : 1;

  const volumePts      = Math.min(30, Math.round((avg / 25) * 30));
  const trendPts       = Math.min(25, Math.round(((trend + 50) / 150) * 25));
  const consistencyPts = Math.min(25, Math.round((consistency / 100) * 25));
  const stabilityPts   = Math.min(20, Math.round(Math.max(0, 1 - cv) * 20));
  const score = Math.min(100, Math.max(0, volumePts + trendPts + consistencyPts + stabilityPts));

  return { score, avg, avg3, peak, trend, consistency, cv };
}

function classify(
  score: number,
  trend: number,
  consistency: number,
  history: number[]
): Segment {
  const hasRecent = history.slice(-2).some((v) => v > 0);
  const isNew = history.slice(0, 4).every((v) => v === 0) && hasRecent;
  if (isNew) return "New";
  if (score >= 75 && trend >= -10) return "Champion";
  if (trend >= 20 && consistency >= 60) return "Rising";
  if (trend <= -25 || (!hasRecent && consistency < 40)) return "At risk";
  if (trend <= -10 && score < 60) return "Cooling";
  return "Steady";
}

// ============================================================================
// UTILITIES
// ============================================================================

async function runQuery<T>(sql: string, signal: AbortSignal): Promise<T[]> {
  const res = await fetch("/api/query", {
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
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T[]>;
}

function toNum(v: number | string | null | undefined, fb = 0): number {
  if (v === null || v === undefined) return fb;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? fb : n;
}

function hasDateRange(f: SwapFilters): boolean {
  return f.dateRange?.from instanceof Date && f.dateRange?.to instanceof Date;
}

function filtersKey(f: SwapFilters): string {
  return JSON.stringify({
    from: f.dateRange?.from instanceof Date ? f.dateRange.from.getTime() : null,
    to:   f.dateRange?.to   instanceof Date ? f.dateRange.to.getTime()   : null,
    areas:    [...(f.selectedAreas    ?? [])].sort(),
    stations: [...(f.selectedStations ?? [])].sort(),
  });
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useSwapAnalytics(filters: SwapFilters): UseSwapAnalyticsReturn {
  const [customers, setCustomers] = useState<CustomerSwapData[]>([]);
  const [kpi, setKpi]             = useState<SwapAnalyticsKpi | null>(null);

  const [loading, setLoading] = useState(() => hasDateRange(filters));
  const [error, setError]     = useState<string | null>(null);

  const abortRef      = useRef<AbortController | null>(null);
  const lastFilterKey = useRef<string | null>(null);

  const process = useCallback(async (f: SwapFilters) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const numMonths = totalMonthsInRange(f);

      const [monthlyRows, enrichmentRows] = await Promise.all([
        runQuery<RawMonthlyRow>(buildMonthlyQuery(f), ctrl.signal),
        runQuery<RawEnrichmentRow>(buildEnrichmentQuery(f), ctrl.signal),
      ]);

      const enrichMap = new Map<string, { station: string; location: string; name: string }>();
      for (const r of enrichmentRows) {
        enrichMap.set(r.CUSTOMER_ID, {
          station:  r.PRIMARY_STATION  ?? "",
          location: r.PRIMARY_LOCATION ?? "",
          name:     r.CUSTOMER_NAME    ?? "",
        });
      }

      type MonthEntry = {
        label: string;
        index: number;
        swaps: number;
        avgOldBat: number;
        avgNewBat: number;
        successSwaps: number;
        revenue: number;
      };

      const customerMap = new Map<string, { name: string; months: MonthEntry[] }>();

      for (const row of monthlyRows) {
        const id = row.CUSTOMER_ID;
        if (!customerMap.has(id)) {
          customerMap.set(id, { name: row.CUSTOMER_NAME, months: [] });
        }
        customerMap.get(id)!.months.push({
          label:        row.MONTH_LABEL,
          index:        toNum(row.MONTH_INDEX),
          swaps:        toNum(row.SWAP_COUNT),
          avgOldBat:    toNum(row.AVG_OLD_BAT),
          avgNewBat:    toNum(row.AVG_NEW_BAT),
          successSwaps: toNum(row.SUCCESS_SWAPS),
          revenue:      toNum(row.TOTAL_REVENUE),
        });
      }

      const labelMap = new Map<number, string>();
      for (const { months } of customerMap.values()) {
        for (const m of months) labelMap.set(m.index, m.label);
      }
      const monthLabels: string[] = Array.from({ length: numMonths }, (_, i) => {
        return labelMap.get(i + 1) ?? "";
      });

      const fleetByMonth: number[] = Array(numMonths).fill(0);
      const scored: CustomerSwapData[] = [];

      for (const [id, { name, months }] of customerMap.entries()) {
        const history = Array(numMonths).fill(0);
        let totalRevenue  = 0;
        let totalSuccess  = 0;
        let totalSwapsRaw = 0;
        let sumOldBat     = 0;
        let sumNewBat     = 0;
        let batMonths     = 0;

        for (const m of months) {
          const idx = m.index - 1;
          if (idx >= 0 && idx < numMonths) {
            history[idx] = m.swaps;
            fleetByMonth[idx] += m.swaps;
          }
          totalRevenue  += m.revenue;
          totalSuccess  += m.successSwaps;
          totalSwapsRaw += m.swaps;
          if (m.avgOldBat > 0 && m.avgNewBat > 0) {
            sumOldBat += m.avgOldBat;
            sumNewBat += m.avgNewBat;
            batMonths++;
          }
        }

        const { score, avg, avg3, peak, trend, consistency, cv } = computeScore(history);
        const segment = classify(score, trend, consistency, history);
        const enrich  = enrichMap.get(id);

        // Prefer name from monthly query; fall back to enrichment name, then raw id
        const customerName = name || enrich?.name || id;

        scored.push({
          customerId:   id,
          customerName,
          score,
          segment,
          total:        history.reduce((a, b) => a + b, 0),
          avg:          Math.round(avg * 10) / 10,
          avg3,
          peak,
          trend,
          consistency,
          cv,
          history,
          monthLabels,
          avgBatteryImprovement:
            batMonths > 0
              ? Math.round(((sumNewBat - sumOldBat) / batMonths) * 10) / 10
              : 0,
          avgOldBatPercent:
            batMonths > 0
              ? Math.round((sumOldBat / batMonths) * 10) / 10
              : 0,
          successRate:
            totalSwapsRaw > 0
              ? Math.round((totalSuccess / totalSwapsRaw) * 100)
              : 0,
          totalRevenue:   Math.round(totalRevenue),
          primaryStation: enrich?.station  ?? "",
          primaryLocation:enrich?.location ?? "",
        });
      }

      const fleetMonthly = fleetByMonth.map((swaps, i) => ({
        month: monthLabels[i] ?? `M${i + 1}`,
        swaps,
        rolling3:
          i === 0
            ? fleetByMonth[0]
            : i === 1
              ? Math.round((fleetByMonth[0] + fleetByMonth[1]) / 2)
              : Math.round(
                  (fleetByMonth[i] + fleetByMonth[i - 1] + fleetByMonth[i - 2]) / 3
                ),
      }));

      const segmentCounts = Object.fromEntries(
        ALL_SEGMENTS.map((s) => [s, scored.filter((c) => c.segment === s).length])
      ) as Record<Segment, number>;

      const avgHealthScore = scored.length
        ? Math.round(scored.reduce((a, c) => a + c.score, 0) / scored.length)
        : 0;

      setCustomers(scored);
      setKpi({
        totalCustomers: scored.length,
        avgHealthScore,
        trendingUp:  scored.filter((c) => c.trend >= 20).length,
        atRisk:      scored.filter((c) => c.segment === "At risk").length,
        totalSwaps:  scored.reduce((a, c) => a + c.total, 0),
        fleetMonthly,
        segmentCounts,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Failed to load swap analytics";
      console.error("❌ useSwapAnalytics:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const key = filtersKey(filters);
    if (key === lastFilterKey.current) return;
    lastFilterKey.current = key;

    if (!hasDateRange(filters)) {
      setCustomers([]);
      setKpi(null);
      setLoading(false);
      return;
    }

    process(filters);
  }, [filtersKey(filters), filters, process]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const refetch = useCallback(() => {
    if (!hasDateRange(filters)) return;
    lastFilterKey.current = null;
    process(filters);
  }, [filters, process]);

  return { customers, kpi, loading, error, refetch };
}