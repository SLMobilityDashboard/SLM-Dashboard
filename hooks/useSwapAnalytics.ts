"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SwapFilters } from "@/components/swap/swap-filters";
import {
  computeScore,
  classify,
  classifyDayPattern,
  computeRolling3,
} from "@/lib/swap-scoring";
import type { Segment, DayPattern } from "@/lib/swap-scoring";

// Re-export types so consumers only need one import
export type { Segment, DayPattern } from "@/lib/swap-scoring";

// ============================================================================
// TYPES
// ============================================================================

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
  trendConfidence: "high" | "low";
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
  firstActiveIdx: number;
  activeMonths: number;
  dowProfile: number[];  // [mon, tue, wed, thu, fri, sat, sun]
  wdRatio: number;       // weekday swaps / total  (0–1)
  dayPattern: DayPattern;
}

export interface SwapAnalyticsKpi {
  totalCustomers: number;
  avgHealthScore: number;
  trendingUp: number;
  atRisk: number;
  totalSwaps: number;
  fleetMonthly: { month: string; swaps: number; rolling3: number | null }[];
  segmentCounts: Record<Segment, number>;
  dowFleet: number[];                          // [mon…sun] fleet-level totals
  dayPatternCounts: Record<DayPattern, number>;
}

interface UseSwapAnalyticsReturn {
  customers: CustomerSwapData[];
  kpi: SwapAnalyticsKpi | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ── Raw DB row shapes ─────────────────────────────────────────────────────────

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

interface RawDowRow {
  CUSTOMER_ID: string;
  DOW: number | string;  // Snowflake DAYOFWEEK: 0 = Sun … 6 = Sat
  SWAP_COUNT: number | string;
}

// ── Internal month aggregation shape ─────────────────────────────────────────

interface MonthEntry {
  label: string;
  index: number;
  swaps: number;
  avgOldBat: number;
  avgNewBat: number;
  successSwaps: number;
  revenue: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SEGMENT_COLORS: Record<Segment, string> = {
  Champion:     "#3B6D11",
  Rising:       "#185FA5",
  "Re-engaged": "#7F77DD",
  Steady:       "#5F5E5A",
  Cooling:      "#854F0B",
  "At risk":    "#A32D2D",
  New:          "#993556",
};

export const SEGMENT_BG: Record<Segment, string> = {
  Champion:     "bg-green-100 text-green-800",
  Rising:       "bg-blue-100 text-blue-800",
  "Re-engaged": "bg-purple-100 text-purple-800",
  Steady:       "bg-gray-100 text-gray-700",
  Cooling:      "bg-amber-100 text-amber-800",
  "At risk":    "bg-red-100 text-red-800",
  New:          "bg-pink-100 text-pink-800",
};

export const OFFERS: Record<Segment, string> = {
  Champion:     "Priority swap lane + free quarterly battery check",
  Rising:       "10% off next 15 swaps — keep the momentum",
  "Re-engaged": "Welcome back: 3 free swaps to rebuild the habit",
  Steady:       "Loyalty reward: 1 free swap per 20",
  Cooling:      "Re-engagement: 3 free swaps this month",
  "At risk":    "Win-back: 5 free swaps + personal call",
  New:          "Welcome pack: first 5 swaps at 50% off",
};

export const DAY_PATTERN_COLORS: Record<DayPattern, string> = {
  "Fleet operator":  "#185FA5",
  "Weekend warrior": "#854F0B",
  Balanced:          "#3B6D11",
  Sporadic:          "#888780",
};

export const DAY_PATTERN_BG: Record<DayPattern, string> = {
  "Fleet operator":  "bg-blue-100 text-blue-800",
  "Weekend warrior": "bg-amber-100 text-amber-800",
  Balanced:          "bg-green-100 text-green-800",
  Sporadic:          "bg-gray-100 text-gray-700",
};

const ALL_SEGMENTS: Segment[] = [
  "Champion",
  "Rising",
  "Re-engaged",
  "Steady",
  "Cooling",
  "At risk",
  "New",
];

const ALL_DAY_PATTERNS: DayPattern[] = [
  "Fleet operator",
  "Weekend warrior",
  "Balanced",
  "Sporadic",
];

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
  const fromMs =
    filters.dateRange?.from instanceof Date
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

// Snowflake DAYOFWEEK: 0 = Sunday, 1 = Monday … 6 = Saturday
function buildDowQuery(filters: SwapFilters): string {
  return `
SELECT
  CUSTOMER_ID,
  DAYOFWEEK(TO_TIMESTAMP(TRANSACTION_TIME / 1000)) AS DOW,
  COUNT(*) AS SWAP_COUNT
FROM DB_DUMP.PUBLIC.SWAP_OVERALL
WHERE ${buildWhere(filters)}
GROUP BY CUSTOMER_ID, DOW
ORDER BY CUSTOMER_ID, DOW
  `.trim();
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
    from:     f.dateRange?.from instanceof Date ? f.dateRange.from.getTime() : null,
    to:       f.dateRange?.to   instanceof Date ? f.dateRange.to.getTime()   : null,
    areas:    [...(f.selectedAreas    ?? [])].sort(),
    stations: [...(f.selectedStations ?? [])].sort(),
  });
}

function totalMonthsInRange(filters: SwapFilters): number {
  if (!filters.dateRange?.from || !filters.dateRange?.to) return 12;
  const diff =
    (filters.dateRange.to.getFullYear() - filters.dateRange.from.getFullYear()) * 12 +
    (filters.dateRange.to.getMonth() - filters.dateRange.from.getMonth()) +
    1;
  return Math.min(12, Math.max(1, diff));
}

/**
 * Snowflake DAYOFWEEK → internal Mon-first index
 * Snowflake: 0=Sun, 1=Mon … 6=Sat
 * Internal:  0=Mon … 4=Fri, 5=Sat, 6=Sun
 */
function snowflakeDowToIndex(dow: number): number {
  return dow === 0 ? 6 : dow - 1;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useSwapAnalytics(filters: SwapFilters): UseSwapAnalyticsReturn {
  const [customers, setCustomers] = useState<CustomerSwapData[]>([]);
  const [kpi, setKpi]             = useState<SwapAnalyticsKpi | null>(null);
  const [loading, setLoading]     = useState(() => hasDateRange(filters));
  const [error, setError]         = useState<string | null>(null);

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

      // ── Fetch all data in parallel ─────────────────────────────────────────
      const [monthlyRows, enrichmentRows, dowRows] = await Promise.all([
        runQuery<RawMonthlyRow>(buildMonthlyQuery(f), ctrl.signal),
        runQuery<RawEnrichmentRow>(buildEnrichmentQuery(f), ctrl.signal),
        runQuery<RawDowRow>(buildDowQuery(f), ctrl.signal),
      ]);

      // ── Enrichment map: customerId → { station, location, name } ──────────
      const enrichMap = new Map<string, { station: string; location: string; name: string }>();
      for (const r of enrichmentRows) {
        enrichMap.set(r.CUSTOMER_ID, {
          station:  r.PRIMARY_STATION  ?? "",
          location: r.PRIMARY_LOCATION ?? "",
          name:     r.CUSTOMER_NAME    ?? "",
        });
      }

      // ── DOW map: customerId → [mon, tue, wed, thu, fri, sat, sun] ─────────
      const dowMap = new Map<string, number[]>();
      for (const r of dowRows) {
        const id  = r.CUSTOMER_ID;
        const idx = snowflakeDowToIndex(toNum(r.DOW));
        if (!dowMap.has(id)) dowMap.set(id, Array(7).fill(0));
        dowMap.get(id)![idx] += toNum(r.SWAP_COUNT);
      }

      // ── Monthly aggregation: customerId → { name, months[] } ─────────────
      const customerMap = new Map<string, { name: string; months: MonthEntry[] }>();
      for (const row of monthlyRows) {
        const id = row.CUSTOMER_ID;
        if (!customerMap.has(id)) customerMap.set(id, { name: row.CUSTOMER_NAME, months: [] });
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

      // Build ordered month label array from all data
      const labelMap = new Map<number, string>();
      for (const { months } of customerMap.values()) {
        for (const m of months) labelMap.set(m.index, m.label);
      }
      const monthLabels: string[] = Array.from({ length: numMonths }, (_, i) =>
        labelMap.get(i + 1) ?? ""
      );

      // ── Score and classify each customer ──────────────────────────────────
      const fleetByMonth: number[] = Array(numMonths).fill(0);
      const dowFleet: number[]     = Array(7).fill(0);
      const scored: CustomerSwapData[] = [];

      for (const [id, { name, months }] of customerMap.entries()) {
        const history: number[] = Array(numMonths).fill(0);
        let totalRevenue  = 0;
        let totalSuccess  = 0;
        let totalSwapsRaw = 0;
        let sumOldBat     = 0;
        let sumNewBat     = 0;
        let batMonths     = 0;

        for (const m of months) {
          const idx = m.index - 1;
          if (idx >= 0 && idx < numMonths) {
            history[idx]      = m.swaps;
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

        // ── Scoring (from swap-scoring.ts) ───────────────────────────────────
        // Guard: ensure history is a valid array before scoring
        if (!Array.isArray(history) || history.length === 0) continue;

        const scoreResult = computeScore(history, numMonths);
        const {
          score, avg, avg3, peak, trend, trendConfidence,
          consistency, cv, firstActiveIdx, activeMonths,
        } = scoreResult;

        if (firstActiveIdx === -1) continue;

        // classify() now takes (scoreResult, history) — updated signature
        const segment = classify(scoreResult, history);

        // ── Day-of-week pattern (from swap-scoring.ts) ───────────────────────
        const dowProfile = dowMap.get(id) ?? Array(7).fill(0);
        const dowTotal   = dowProfile.reduce((a, b) => a + b, 0);
        const weekday    = dowProfile.slice(0, 5).reduce((a, b) => a + b, 0);
        const wdRatio    = dowTotal > 0 ? weekday / dowTotal : 0;
        const dayPattern = classifyDayPattern(dowProfile, dowTotal);

        dowProfile.forEach((v, i) => { dowFleet[i] += v; });

        const enrich       = enrichMap.get(id);
        const customerName = name || enrich?.name || id;

        scored.push({
          customerId:   id,
          customerName,
          score,
          segment,
          total:        history.reduce((a, b) => a + b, 0),
          avg,
          avg3,
          peak,
          trend,
          trendConfidence,
          consistency,
          cv,
          history,
          monthLabels,
          avgBatteryImprovement:
            batMonths > 0 ? Math.round(((sumNewBat - sumOldBat) / batMonths) * 10) / 10 : 0,
          avgOldBatPercent:
            batMonths > 0 ? Math.round((sumOldBat / batMonths) * 10) / 10 : 0,
          successRate:
            totalSwapsRaw > 0 ? Math.round((totalSuccess / totalSwapsRaw) * 100) : 0,
          totalRevenue:    Math.round(totalRevenue),
          primaryStation:  enrich?.station  ?? "",
          primaryLocation: enrich?.location ?? "",
          firstActiveIdx,
          activeMonths,
          dowProfile,
          wdRatio,
          dayPattern,
        });
      }

      // ── KPI aggregation ───────────────────────────────────────────────────
      // FIX #5: Use computeRolling3() for a consistent window.
      // Months 0 and 1 return null instead of misleading partial averages.
      const rolling3Values = computeRolling3(fleetByMonth);
      const fleetMonthly = fleetByMonth.map((swaps, i) => ({
        month:    monthLabels[i] ?? `M${i + 1}`,
        swaps,
        rolling3: rolling3Values[i],
      }));

      const segmentCounts = Object.fromEntries(
        ALL_SEGMENTS.map((s) => [s, scored.filter((c) => c.segment === s).length])
      ) as Record<Segment, number>;

      const dayPatternCounts = Object.fromEntries(
        ALL_DAY_PATTERNS.map((p) => [p, scored.filter((c) => c.dayPattern === p).length])
      ) as Record<DayPattern, number>;

      const avgHealthScore = scored.length
        ? Math.round(scored.reduce((a, c) => a + c.score, 0) / scored.length)
        : 0;

      setCustomers(scored);
      setKpi({
        totalCustomers: scored.length,
        avgHealthScore,
        trendingUp:  scored.filter((c) => c.trend >= 15).length,
        atRisk:      scored.filter((c) => c.segment === "At risk").length,
        totalSwaps:  scored.reduce((a, c) => a + c.total, 0),
        fleetMonthly,
        segmentCounts,
        dowFleet,
        dayPatternCounts,
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

  // Re-run whenever filters meaningfully change
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

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const refetch = useCallback(() => {
    if (!hasDateRange(filters)) return;
    lastFilterKey.current = null;
    process(filters);
  }, [filters, process]);

  return { customers, kpi, loading, error, refetch };
}