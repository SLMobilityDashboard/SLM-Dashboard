"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SwapFilters } from "@/components/swap/swap-filters";

// ============================================================================
// TYPES
// ============================================================================

export type Segment =
  | "Champion"
  | "Rising"
  | "Re-engaged"
  | "Steady"
  | "Cooling"
  | "At risk"
  | "New";

export type DayPattern =
  | "Fleet operator"
  | "Weekend warrior"
  | "Balanced"
  | "Sporadic";

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
  // ── NEW: day-of-week fields ──────────────────────────────────────────────
  dowProfile: number[];   // [mon, tue, wed, thu, fri, sat, sun]
  wdRatio: number;        // weekday swaps / total  (0–1)
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
  // ── NEW ──────────────────────────────────────────────────────────────────
  dowFleet: number[];                         // [mon…sun] fleet-level totals
  dayPatternCounts: Record<DayPattern, number>;
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

// ── NEW ──────────────────────────────────────────────────────────────────────
interface RawDowRow {
  CUSTOMER_ID: string;
  DOW: number | string;   // 0 = Sun … 6 = Sat (Snowflake DAYOFWEEK)
  SWAP_COUNT: number | string;
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

// ── NEW: DOW query ────────────────────────────────────────────────────────────
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
// SCORING LOGIC
// ============================================================================

function totalMonthsInRange(filters: SwapFilters): number {
  if (!filters.dateRange?.from || !filters.dateRange?.to) return 12;
  const diff =
    (filters.dateRange.to.getFullYear() - filters.dateRange.from.getFullYear()) * 12 +
    (filters.dateRange.to.getMonth() - filters.dateRange.from.getMonth()) +
    1;
  return Math.min(12, Math.max(1, diff));
}

function weightedLinearTrend(
  history: number[],
  firstActiveIdx: number
): { slope: number; confidence: "high" | "low" } {
  const active = history.slice(firstActiveIdx);
  const n = active.length;

  if (n < 2) return { slope: 0, confidence: "low" };

  const nonZeroSorted = [...active].filter((v) => v > 0).sort((a, b) => a - b);
  const median =
    nonZeroSorted.length > 0
      ? nonZeroSorted[Math.floor(nonZeroSorted.length / 2)]
      : 0;

  const softened = active.map((v) =>
    median > 0 && v > median * 3 ? median * 2 : v
  );

  const weights = softened.map((_, i) => (i >= n - 3 ? 2 : 1));

  const sumW   = weights.reduce((a, b) => a + b, 0);
  const sumWX  = weights.reduce((a, w, i) => a + w * i, 0);
  const sumWY  = weights.reduce((a, w, i) => a + w * softened[i], 0);
  const sumWXY = weights.reduce((a, w, i) => a + w * i * softened[i], 0);
  const sumWX2 = weights.reduce((a, w, i) => a + w * i * i, 0);

  const denom = sumW * sumWX2 - sumWX * sumWX;
  if (denom === 0) return { slope: 0, confidence: "low" };

  const slope  = (sumW * sumWXY - sumWX * sumWY) / denom;
  const avgY   = sumWY / sumW;

  const normalisedSlope = avgY > 0 ? (slope / avgY) * 100 : 0;
  const activeCount = active.filter((v) => v > 0).length;

  return {
    slope: Math.round(normalisedSlope * 10) / 10,
    confidence: activeCount >= 4 ? "high" : "low",
  };
}

function computeScore(
  history: number[],
  numMonths: number
): {
  score: number;
  avg: number;
  avg3: number;
  peak: number;
  trend: number;
  trendConfidence: "high" | "low";
  consistency: number;
  cv: number;
  firstActiveIdx: number;
  activeMonths: number;
} {
  const firstActiveIdx = history.findIndex((v) => v > 0);
  const lastActiveIdx = [...history]
    .map((v, i) => (v > 0 ? i : -1))
    .filter((i) => i >= 0)
    .pop() ?? -1;

  if (firstActiveIdx === -1) {
    return {
      score: 0, avg: 0, avg3: 0, peak: 0, trend: 0,
      trendConfidence: "low", consistency: 0, cv: 1,
      firstActiveIdx: -1, activeMonths: 0,
    };
  }

  const activeMonths = history.filter((v) => v > 0).length;
  const avg  = history.reduce((a, b) => a + b, 0) / numMonths;
  const peak = Math.max(...history, 0);

  const recent3 = history.slice(-3).filter((v) => v > 0);
  const avg3 = recent3.length
    ? Math.round((recent3.reduce((a, b) => a + b, 0) / recent3.length) * 10) / 10
    : 0;

  const { slope: trend, confidence: trendConfidence } = weightedLinearTrend(
    history,
    firstActiveIdx
  );

  const activeSpan = lastActiveIdx - firstActiveIdx + 1;
  const baseConsistency =
    activeSpan > 0 ? (activeMonths / activeSpan) * 100 : 0;

  let trailingSilence = 0;
  for (let i = history.length - 1; i >= firstActiveIdx; i--) {
    if (history[i] === 0) trailingSilence++;
    else break;
  }
  const decayFactor = Math.max(0, 1 - (trailingSilence / activeSpan) * 0.4);
  const consistency = Math.round(baseConsistency * decayFactor);

  const nonZeroVals = history.filter((v) => v > 0);
  const nonZeroAvg  =
    nonZeroVals.length > 0
      ? nonZeroVals.reduce((a, b) => a + b, 0) / nonZeroVals.length
      : 0;
  const variance =
    nonZeroVals.length > 0
      ? nonZeroVals.reduce((a, b) => a + Math.pow(b - nonZeroAvg, 2), 0) /
        nonZeroVals.length
      : 0;
  const cv = nonZeroAvg > 0 ? Math.sqrt(variance) / nonZeroAvg : 1;

  const volumePts      = Math.min(30, Math.round((avg / 25) * 30));
  const consistencyPts = Math.min(25, Math.round((consistency / 100) * 25));
  const stabilityPts   = Math.min(20, Math.round(Math.max(0, 1 - cv) * 20));
  const rawTrendPts    = Math.min(25, Math.max(0, Math.round(((trend + 50) / 100) * 25)));
  const trendPts       = trendConfidence === "low" ? Math.min(15, rawTrendPts) : rawTrendPts;

  const score = Math.min(100, Math.max(0, volumePts + trendPts + consistencyPts + stabilityPts));

  return {
    score,
    avg:   Math.round(avg * 10) / 10,
    avg3,
    peak,
    trend,
    trendConfidence,
    consistency,
    cv,
    firstActiveIdx,
    activeMonths,
  };
}

function longestConsecutiveZeros(arr: number[]): number {
  let max = 0, cur = 0;
  for (const v of arr) {
    if (v === 0) { cur++; max = Math.max(max, cur); }
    else cur = 0;
  }
  return max;
}

function classify(
  score: number,
  trend: number,
  trendConfidence: "high" | "low",
  consistency: number,
  history: number[],
  firstActiveIdx: number
): Segment {
  const n = history.length;
  if (firstActiveIdx === -1) return "At risk";

  const hasRecent = history.slice(-2).some((v) => v > 0);
  const midpoint  = Math.floor(n / 2);
  const hadEarly  = firstActiveIdx < midpoint;

  if (firstActiveIdx >= midpoint && hasRecent) return "New";

  if (hadEarly && hasRecent) {
    const midHistory = history.slice(firstActiveIdx + 1, -2);
    const longestGap = longestConsecutiveZeros(midHistory);
    const wasQuietMidRange = !history.slice(midpoint, -2).some((v) => v > 0);
    if (longestGap >= 3 && wasQuietMidRange) return "Re-engaged";
  }

  if (score >= 75 && trend >= -5) return "Champion";

  const risingThreshold = trendConfidence === "high" ? 15 : 25;
  if (trend >= risingThreshold && consistency >= 50) return "Rising";

  if (!hasRecent && consistency < 40) return "At risk";
  if (trend <= -30 && trendConfidence === "high") return "At risk";
  if (trend <= -10 && score < 60) return "Cooling";

  return "Steady";
}

// ── NEW: day-pattern classifier ───────────────────────────────────────────────
/**
 * Classify a customer's swap behaviour by day-of-week preference.
 *
 * @param dowProfile  [mon, tue, wed, thu, fri, sat, sun]  (index 0 = Mon)
 * @param total       total swaps across all days
 */
function classifyDayPattern(dowProfile: number[], total: number): DayPattern {
  if (total < 5) return "Sporadic";
  const weekday = dowProfile.slice(0, 5).reduce((a, b) => a + b, 0);
  const wdRatio = weekday / total;
  if (wdRatio >= 0.70) return "Fleet operator";
  if (wdRatio <= 0.40) return "Weekend warrior";
  return "Balanced";
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

// ── DOW index mapping ─────────────────────────────────────────────────────────
// Snowflake: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
// Internal:  index 0=Mon … 4=Fri, 5=Sat, 6=Sun
function snowflakeDowToIndex(dow: number): number {
  // Sun(0)→6, Mon(1)→0, Tue(2)→1, Wed(3)→2, Thu(4)→3, Fri(5)→4, Sat(6)→5
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

      // Run all three queries in parallel
      const [monthlyRows, enrichmentRows, dowRows] = await Promise.all([
        runQuery<RawMonthlyRow>(buildMonthlyQuery(f), ctrl.signal),
        runQuery<RawEnrichmentRow>(buildEnrichmentQuery(f), ctrl.signal),
        runQuery<RawDowRow>(buildDowQuery(f), ctrl.signal),
      ]);

      // ── Enrichment map ─────────────────────────────────────────────────────
      const enrichMap = new Map<string, { station: string; location: string; name: string }>();
      for (const r of enrichmentRows) {
        enrichMap.set(r.CUSTOMER_ID, {
          station:  r.PRIMARY_STATION  ?? "",
          location: r.PRIMARY_LOCATION ?? "",
          name:     r.CUSTOMER_NAME    ?? "",
        });
      }

      // ── DOW map: customerId → [mon,tue,wed,thu,fri,sat,sun] ───────────────
      const dowMap = new Map<string, number[]>();
      for (const r of dowRows) {
        const id  = r.CUSTOMER_ID;
        const idx = snowflakeDowToIndex(toNum(r.DOW));
        if (!dowMap.has(id)) dowMap.set(id, Array(7).fill(0));
        dowMap.get(id)![idx] += toNum(r.SWAP_COUNT);
      }

      // ── Monthly aggregation ────────────────────────────────────────────────
      type MonthEntry = {
        label: string; index: number; swaps: number;
        avgOldBat: number; avgNewBat: number;
        successSwaps: number; revenue: number;
      };
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

      const labelMap = new Map<number, string>();
      for (const { months } of customerMap.values()) {
        for (const m of months) labelMap.set(m.index, m.label);
      }
      const monthLabels: string[] = Array.from({ length: numMonths }, (_, i) =>
        labelMap.get(i + 1) ?? ""
      );

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

        const { score, avg, avg3, peak, trend, trendConfidence, consistency, cv, firstActiveIdx, activeMonths } =
          computeScore(history, numMonths);

        if (firstActiveIdx === -1) continue;

        const segment = classify(score, trend, trendConfidence, consistency, history, firstActiveIdx);

        // ── DOW / day-pattern ────────────────────────────────────────────────
        const dowProfile = dowMap.get(id) ?? Array(7).fill(0);
        const dowTotal   = dowProfile.reduce((a, b) => a + b, 0);
        const weekday    = dowProfile.slice(0, 5).reduce((a, b) => a + b, 0);
        const wdRatio    = dowTotal > 0 ? weekday / dowTotal : 0;
        const dayPattern = classifyDayPattern(dowProfile, dowTotal);

        // Accumulate fleet DOW totals
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
          // ── new ──
          dowProfile,
          wdRatio,
          dayPattern,
        });
      }

      const fleetMonthly = fleetByMonth.map((swaps, i) => ({
        month: monthLabels[i] ?? `M${i + 1}`,
        swaps,
        rolling3:
          i === 0 ? fleetByMonth[0]
          : i === 1 ? Math.round((fleetByMonth[0] + fleetByMonth[1]) / 2)
          : Math.round((fleetByMonth[i] + fleetByMonth[i - 1] + fleetByMonth[i - 2]) / 3),
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