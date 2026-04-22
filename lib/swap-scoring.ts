// ============================================================================
// swap-scoring.ts
// Plug-and-play scoring engine for swap analytics.
//
// USAGE:
//   import { computeScore, classify, classifyDayPattern } from "./swap-scoring";
//
//   const result = computeScore(history, numMonths);
//   const segment = classify(result, history);
//   const dayPattern = classifyDayPattern(dowProfile, total);
// ============================================================================

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

export type TrendConfidence = "high" | "low";

export type DayPattern =
  | "Fleet operator"
  | "Weekend warrior"
  | "Balanced"
  | "Sporadic";

export interface TrendResult {
  slope: number;
  confidence: TrendConfidence;
}

export interface ScoreResult {
  score: number;
  avg: number;       // FIX #1: uses activeMonths as denominator, not numMonths
  avg3: number;
  peak: number;
  trend: number;
  trendConfidence: TrendConfidence;
  consistency: number;
  cv: number;        // FIX #2: context-aware — blends gap ratio for established customers only
  firstActiveIdx: number;
  activeMonths: number;
  isNew: boolean;    // true when firstActiveIdx >= midpoint of the period
}

// ============================================================================
// CONFIGURATION
// Centralised constants — change these to tune the scoring model.
// ============================================================================

export const SCORING_CONFIG = {
  // --- Spike softening ---
  SPIKE_THRESHOLD_MULTIPLIER: 3,    // value > median × this → considered a spike
  SPIKE_CAP_MULTIPLIER: 2,          // spikes are capped at median × this

  // --- Trend weights ---
  RECENT_MONTHS_WINDOW: 3,          // last N months get extra weight
  RECENT_MONTHS_WEIGHT: 2,          // weight for recent months
  OLDER_MONTHS_WEIGHT: 1,           // weight for older months

  // --- Confidence threshold ---
  // FIX #3: raised from 4 → 6. Too few data points make trend lines unreliable.
  MIN_ACTIVE_FOR_HIGH_CONFIDENCE: 6,

  // --- Volume benchmark ---
  VOLUME_BENCHMARK: 25,             // avg monthly volume considered "full marks"

  // --- Consistency decay ---
  TRAILING_SILENCE_DECAY_RATE: 0.4, // how much trailing silence penalises consistency (0–1)

  // --- Stability: gap blending (FIX #2) ---
  // Controls how much mid-range gaps penalise stability for established customers.
  // New customers are always exempt regardless of this value.
  // 0 = ignore gaps entirely, 1 = full gap penalty
  GAP_BLEND_WEIGHT: 0.35,

  // Minimum activeSpan (months) before a customer is considered "established"
  // Below this, gap blending is skipped — not enough history to judge gaps fairly.
  ESTABLISHED_SPAN_THRESHOLD: 6,

  // --- Score weights ---
  SCORE_WEIGHTS: {
    volume:      30,
    trend:       25,
    consistency: 25,
    stability:   20,
  },

  // --- Trend points cap when confidence is low ---
  LOW_CONFIDENCE_TREND_CAP: 15,

  // --- Segment thresholds ---
  CHAMPION_MIN_SCORE: 75,
  CHAMPION_MAX_TREND_DROP: -5,
  RISING_TREND_THRESHOLD_HIGH_CONFIDENCE: 15,
  RISING_TREND_THRESHOLD_LOW_CONFIDENCE:  25,
  RISING_MIN_CONSISTENCY: 50,
  AT_RISK_MAX_TREND: -30,
  COOLING_MAX_TREND: -10,
  COOLING_MAX_SCORE: 60,
  AT_RISK_MAX_CONSISTENCY: 40,

  // --- Segment hysteresis (FIX #4) ---
  // Existing Champions get a grace buffer before losing the title.
  // Entry threshold:  score >= CHAMPION_MIN_SCORE (75)
  // Exit threshold:   score >= CHAMPION_MIN_SCORE - CHAMPION_HYSTERESIS (70)
  CHAMPION_HYSTERESIS: 5,

  // --- Re-engaged detection ---
  MIN_GAP_FOR_REENGAGED: 3,         // longest mid-range gap must be ≥ N months of zeros

  // --- Rolling average (FIX #5) ---
  // Minimum window before emitting a rolling3 value.
  // Months before this return null instead of misleading partial averages.
  ROLLING3_MIN_WINDOW: 3,

  // --- Day-pattern thresholds ---
  FLEET_OPERATOR_MIN_WEEKDAY_RATIO: 0.70,
  WEEKEND_WARRIOR_MAX_WEEKDAY_RATIO: 0.40,
  MIN_SWAPS_FOR_PATTERN: 5,
} as const;

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Returns the length of the longest consecutive run of zeros in an array.
 *
 * Example:
 *   longestConsecutiveZeros([5, 0, 0, 0, 3, 0, 2]) → 3
 */
export function longestConsecutiveZeros(arr: number[]): number {
  let max = 0;
  let cur = 0;
  for (const v of arr) {
    if (v === 0) {
      cur++;
      max = Math.max(max, cur);
    } else {
      cur = 0;
    }
  }
  return max;
}

/**
 * Computes a proper 3-month rolling average for a fleet monthly series.
 *
 * FIX #5: Returns null for months that don't yet have a full window,
 * instead of the old inconsistent behaviour:
 *   old → month 0 = raw value, month 1 = 2-month avg, month 2+ = proper rolling
 *   new → month 0 = null,      month 1 = null,         month 2+ = proper rolling
 */
export function computeRolling3(values: number[]): (number | null)[] {
  const { ROLLING3_MIN_WINDOW } = SCORING_CONFIG;
  return values.map((_, i) => {
    if (i < ROLLING3_MIN_WINDOW - 1) return null;
    const window = values.slice(i - ROLLING3_MIN_WINDOW + 1, i + 1);
    return Math.round(window.reduce((a, b) => a + b, 0) / ROLLING3_MIN_WINDOW);
  });
}

// ============================================================================
// TREND
// ============================================================================

/**
 * Calculates a weighted linear trend over the active portion of a history array.
 *
 * - Spikes are softened so one outlier month doesn't dominate.
 * - Recent months are weighted more heavily.
 * - The slope is normalised as % of the weighted average, making it
 *   comparable across customers regardless of volume.
 * - FIX #3: Confidence requires 6 active months (raised from 4).
 *
 * @param history        Full monthly history array (zeros allowed)
 * @param firstActiveIdx Index of first non-zero entry
 */
export function weightedLinearTrend(
  history: number[],
  firstActiveIdx: number
): TrendResult {
  const {
    SPIKE_THRESHOLD_MULTIPLIER,
    SPIKE_CAP_MULTIPLIER,
    RECENT_MONTHS_WINDOW,
    RECENT_MONTHS_WEIGHT,
    OLDER_MONTHS_WEIGHT,
    MIN_ACTIVE_FOR_HIGH_CONFIDENCE,
  } = SCORING_CONFIG;

  const active = history.slice(firstActiveIdx);
  const n = active.length;

  if (n < 2) return { slope: 0, confidence: "low" };

  // Median of non-zero values for spike detection
  const nonZeroSorted = [...active].filter((v) => v > 0).sort((a, b) => a - b);
  const median =
    nonZeroSorted.length > 0
      ? nonZeroSorted[Math.floor(nonZeroSorted.length / 2)]
      : 0;

  // Soften spikes
  const softened = active.map((v) =>
    median > 0 && v > median * SPIKE_THRESHOLD_MULTIPLIER
      ? median * SPIKE_CAP_MULTIPLIER
      : v
  );

  // Weight recent months more heavily
  const weights = softened.map((_, i) =>
    i >= n - RECENT_MONTHS_WINDOW ? RECENT_MONTHS_WEIGHT : OLDER_MONTHS_WEIGHT
  );

  // Weighted least-squares regression
  const sumW   = weights.reduce((a, b) => a + b, 0);
  const sumWX  = weights.reduce((a, w, i) => a + w * i, 0);
  const sumWY  = weights.reduce((a, w, i) => a + w * softened[i], 0);
  const sumWXY = weights.reduce((a, w, i) => a + w * i * softened[i], 0);
  const sumWX2 = weights.reduce((a, w, i) => a + w * i * i, 0);

  const denom = sumW * sumWX2 - sumWX * sumWX;
  if (denom === 0) return { slope: 0, confidence: "low" };

  const slope = (sumW * sumWXY - sumWX * sumWY) / denom;
  const avgY  = sumWY / sumW;

  const normalisedSlope = avgY > 0 ? (slope / avgY) * 100 : 0;
  const activeCount = active.filter((v) => v > 0).length;

  return {
    slope: Math.round(normalisedSlope * 10) / 10,
    confidence: activeCount >= MIN_ACTIVE_FOR_HIGH_CONFIDENCE ? "high" : "low",
  };
}

// ============================================================================
// STABILITY (cv)
// ============================================================================

/**
 * Computes a context-aware stability coefficient (cv).
 *
 * FIX #2: The old cv only looked at non-zero months. This made a customer
 * with 1 active month and 11 zeros look perfectly stable. But blindly
 * including zeros penalises new customers unfairly.
 *
 * Context rules:
 *
 *   NEW customer (isNew = true):
 *     → cv on active months only. Zeros are expected. No gap penalty.
 *
 *   SHORT-SPAN customer (activeSpan < ESTABLISHED_SPAN_THRESHOLD):
 *     → cv on active months only. Not enough history to judge gaps fairly.
 *
 *   ESTABLISHED customer (activeSpan >= ESTABLISHED_SPAN_THRESHOLD):
 *     → cv blended with gap ratio. Mid-range silence IS instability.
 *       blendedCv = rawCv × (1 - GAP_BLEND_WEIGHT) + gapRatio × GAP_BLEND_WEIGHT
 *
 * @param history      Full monthly history
 * @param activeSpan   lastActiveIdx - firstActiveIdx + 1
 * @param activeMonths Count of non-zero months
 * @param isNew        Whether customer started in the second half of the period
 */
export function computeCv(
  history: number[],
  activeSpan: number,
  activeMonths: number,
  isNew: boolean
): number {
  const { GAP_BLEND_WEIGHT, ESTABLISHED_SPAN_THRESHOLD } = SCORING_CONFIG;

  const nonZeroVals = history.filter((v) => v > 0);
  if (nonZeroVals.length === 0) return 1;

  const nonZeroAvg = nonZeroVals.reduce((a, b) => a + b, 0) / nonZeroVals.length;
  const variance   =
    nonZeroVals.reduce((a, b) => a + Math.pow(b - nonZeroAvg, 2), 0) / nonZeroVals.length;
  const rawCv = nonZeroAvg > 0 ? Math.sqrt(variance) / nonZeroAvg : 1;

  // New or short-history customers: pure cv, no gap penalty
  if (isNew || activeSpan < ESTABLISHED_SPAN_THRESHOLD) return rawCv;

  // Established customers: blend in the gap ratio
  const gapRatio   = activeSpan > 0 ? (activeSpan - activeMonths) / activeSpan : 0;
  const blendedCv  = rawCv * (1 - GAP_BLEND_WEIGHT) + gapRatio * GAP_BLEND_WEIGHT;

  return Math.min(1, blendedCv);
}

// ============================================================================
// SCORE
// ============================================================================

/**
 * Computes a 0–100 health score for a customer based on their swap history.
 *
 * Score breakdown (configurable via SCORING_CONFIG.SCORE_WEIGHTS):
 *   - Volume      (30 pts): average monthly swaps vs. benchmark
 *   - Trend       (25 pts): growth/decline direction
 *   - Consistency (25 pts): regularity of swapping, with trailing-silence penalty
 *   - Stability   (20 pts): predictability of values (context-aware cv)
 *
 * Fixes applied vs legacy:
 *   #1 — avg denominator is activeMonths (not numMonths).
 *         A customer active for 3 of 12 months no longer looks 4× worse than they are.
 *   #2 — cv via computeCv() is context-aware (new customers exempt from gap penalty).
 *   #3 — trend confidence requires 6 active months (was 4).
 *
 * @param history    Monthly swap counts (zeros for inactive months)
 * @param numMonths  Total months in the date range being analysed
 */
export function computeScore(history: number[], numMonths: number): ScoreResult {
  const {
    VOLUME_BENCHMARK,
    TRAILING_SILENCE_DECAY_RATE,
    SCORE_WEIGHTS,
    LOW_CONFIDENCE_TREND_CAP,
  } = SCORING_CONFIG;

  const firstActiveIdx = history.findIndex((v) => v > 0);
  const lastActiveIdx =
    [...history]
      .map((v, i) => (v > 0 ? i : -1))
      .filter((i) => i >= 0)
      .pop() ?? -1;

  if (firstActiveIdx === -1) {
    return {
      score: 0, avg: 0, avg3: 0, peak: 0, trend: 0,
      trendConfidence: "low", consistency: 0, cv: 1,
      firstActiveIdx: -1, activeMonths: 0, isNew: false,
    };
  }

  const activeMonths = history.filter((v) => v > 0).length;
  const midpoint     = Math.floor(numMonths / 2);
  const isNew        = firstActiveIdx >= midpoint;

  // FIX #1: Divide by activeMonths, not numMonths
  const totalSwaps = history.reduce((a, b) => a + b, 0);
  const avg        = totalSwaps / activeMonths;
  const peak       = Math.max(...history, 0);

  const recent3 = history.slice(-3).filter((v) => v > 0);
  const avg3    = recent3.length
    ? Math.round((recent3.reduce((a, b) => a + b, 0) / recent3.length) * 10) / 10
    : 0;

  // --- Trend ---
  const { slope: trend, confidence: trendConfidence } = weightedLinearTrend(
    history,
    firstActiveIdx
  );

  // --- Consistency (with trailing silence decay) ---
  const activeSpan = lastActiveIdx - firstActiveIdx + 1;
  const baseConsistency =
    activeSpan > 0 ? (activeMonths / activeSpan) * 100 : 0;

  let trailingSilence = 0;
  for (let i = history.length - 1; i >= firstActiveIdx; i--) {
    if (history[i] === 0) trailingSilence++;
    else break;
  }
  const decayFactor = Math.max(
    0,
    1 - (trailingSilence / activeSpan) * TRAILING_SILENCE_DECAY_RATE
  );
  const consistency = Math.round(baseConsistency * decayFactor);

  // FIX #2: Context-aware stability
  const cv = computeCv(history, activeSpan, activeMonths, isNew);

  // --- Sub-scores ---
  const volumePts      = Math.min(SCORE_WEIGHTS.volume,      Math.round((avg / VOLUME_BENCHMARK) * SCORE_WEIGHTS.volume));
  const consistencyPts = Math.min(SCORE_WEIGHTS.consistency, Math.round((consistency / 100) * SCORE_WEIGHTS.consistency));
  const stabilityPts   = Math.min(SCORE_WEIGHTS.stability,   Math.round(Math.max(0, 1 - cv) * SCORE_WEIGHTS.stability));
  const rawTrendPts    = Math.min(SCORE_WEIGHTS.trend, Math.max(0, Math.round(((trend + 50) / 100) * SCORE_WEIGHTS.trend)));
  const trendPts       = trendConfidence === "low"
    ? Math.min(LOW_CONFIDENCE_TREND_CAP, rawTrendPts)
    : rawTrendPts;

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
    isNew,
  };
}

// ============================================================================
// SEGMENT CLASSIFIER
// ============================================================================

/**
 * Maps a customer's computed metrics to a named segment.
 *
 * Segment priority order:
 *   New → Re-engaged → Champion → Rising → At risk → Cooling → Steady
 *
 * FIX #4: Champion has a hysteresis buffer.
 *   - To ENTER Champion: score >= 75
 *   - To STAY Champion:  score >= 70  (75 - CHAMPION_HYSTERESIS of 5)
 *   Pass wasChampion = true if this customer was Champion in the previous period.
 *
 * @param result       Output of computeScore()
 * @param history      Full monthly swap history
 * @param wasChampion  Whether this customer was Champion last period
 */
export function classify(
  result: ScoreResult,
  history: number[],
  wasChampion = false
): Segment {
  const {
    CHAMPION_MIN_SCORE,
    CHAMPION_MAX_TREND_DROP,
    CHAMPION_HYSTERESIS,
    RISING_TREND_THRESHOLD_HIGH_CONFIDENCE,
    RISING_TREND_THRESHOLD_LOW_CONFIDENCE,
    RISING_MIN_CONSISTENCY,
    AT_RISK_MAX_TREND,
    COOLING_MAX_TREND,
    COOLING_MAX_SCORE,
    AT_RISK_MAX_CONSISTENCY,
    MIN_GAP_FOR_REENGAGED,
  } = SCORING_CONFIG;

  const { score, trend, trendConfidence, consistency, firstActiveIdx, isNew } = result;
  const n = history.length;

  if (firstActiveIdx === -1) return "At risk";

  const hasRecent = history.slice(-2).some((v) => v > 0);
  const midpoint  = Math.floor(n / 2);
  const hadEarly  = firstActiveIdx < midpoint;

  // New: started in second half of period and still active
  if (isNew && hasRecent) return "New";

  // Re-engaged: active early, went quiet mid-range, came back recently
  if (hadEarly && hasRecent) {
    const midHistory       = history.slice(firstActiveIdx + 1, -2);
    const longestGap       = longestConsecutiveZeros(midHistory);
    const wasQuietMidRange = !history.slice(midpoint, -2).some((v) => v > 0);
    if (longestGap >= MIN_GAP_FOR_REENGAGED && wasQuietMidRange) return "Re-engaged";
  }

  // FIX #4: Hysteresis — existing Champions get a grace buffer
  const championFloor = wasChampion
    ? CHAMPION_MIN_SCORE - CHAMPION_HYSTERESIS
    : CHAMPION_MIN_SCORE;
  if (score >= championFloor && trend >= CHAMPION_MAX_TREND_DROP) return "Champion";

  const risingThreshold = trendConfidence === "high"
    ? RISING_TREND_THRESHOLD_HIGH_CONFIDENCE
    : RISING_TREND_THRESHOLD_LOW_CONFIDENCE;
  if (trend >= risingThreshold && consistency >= RISING_MIN_CONSISTENCY) return "Rising";

  if (!hasRecent && consistency < AT_RISK_MAX_CONSISTENCY)      return "At risk";
  if (trend <= AT_RISK_MAX_TREND && trendConfidence === "high") return "At risk";
  if (trend <= COOLING_MAX_TREND && score < COOLING_MAX_SCORE)  return "Cooling";

  return "Steady";
}

// ============================================================================
// DAY-PATTERN CLASSIFIER
// ============================================================================

/**
 * Classifies a customer's swap behaviour by day-of-week preference.
 *
 * @param dowProfile  [mon, tue, wed, thu, fri, sat, sun]  (index 0 = Monday)
 * @param total       Total swaps across all days
 *
 * Thresholds (configurable in SCORING_CONFIG):
 *   ≥ 70% weekday  → Fleet operator
 *   ≤ 40% weekday  → Weekend warrior
 *   < 5 swaps      → Sporadic
 *   otherwise      → Balanced
 */
export function classifyDayPattern(dowProfile: number[], total: number): DayPattern {
  const {
    MIN_SWAPS_FOR_PATTERN,
    FLEET_OPERATOR_MIN_WEEKDAY_RATIO,
    WEEKEND_WARRIOR_MAX_WEEKDAY_RATIO,
  } = SCORING_CONFIG;

  if (total < MIN_SWAPS_FOR_PATTERN) return "Sporadic";

  const weekday = dowProfile.slice(0, 5).reduce((a, b) => a + b, 0);
  const wdRatio = weekday / total;

  if (wdRatio >= FLEET_OPERATOR_MIN_WEEKDAY_RATIO)  return "Fleet operator";
  if (wdRatio <= WEEKEND_WARRIOR_MAX_WEEKDAY_RATIO) return "Weekend warrior";
  return "Balanced";
}