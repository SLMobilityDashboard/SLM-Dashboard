# Code Explanation in Simple Language

## What Does This Code Do Overall?

It **scores a customer's swap activity (0–100)** based on their monthly history. Think of it like a **credit score, but for a customer's health** — the higher the score, the more valuable, consistent, and growing that customer is.

---

## Function 1: `weightedLinearTrend`

> **"Is this customer growing or shrinking?"**

### How It Works (Plain English)

1. **Grabs only the active period** — ignores everything before the first non-zero month
2. **Removes extreme spikes** — if any month is more than 3× the median, it gets capped at 2× the median (so one unusually busy month doesn't skew results)
3. **Gives extra weight to the last 3 months** (weight = 2 vs 1 for older months) — recent behaviour matters more
4. **Runs a weighted linear regression** to find the direction of change
5. **Normalises the slope as a %** of the average — so `+5` means "growing ~5% per month"
6. **Confidence = "high"** only if there are **6+ non-zero months** *(raised from 4 — too few data points make trend lines unreliable)*

### Formula

```
slope = (ΣW · ΣWXiYi − ΣWXi · ΣWYi) / (ΣW · ΣWXi² − (ΣWXi)²)

normalizedSlope = (slope / averageY) × 100
```

| Symbol | Meaning |
|--------|---------|
| `W` | Weight for each month |
| `X` | Month index (0, 1, 2...) |
| `Y` | Softened value for that month |

### Pros & Cons

| ✅ Pros | ❌ Cons |
|--------|--------|
| Recent months are prioritised (more realistic) | Only last 3 months get boosted — arbitrary cutoff |
| Spike softening prevents outlier distortion | Capping at 2× median may hide legitimate surges |
| Normalised slope is comparable across all customers | Doesn't account for seasonality |
| Confidence threshold now requires 6 months (more reliable) | Still limited without year-over-year data |

---

## Function 2: `computeCv` *(New — was previously inline)*

> **"How erratic is this customer — and is that their fault?"**

### The Problem with the Old Approach

Previously, stability (cv) was calculated **only on non-zero months**. This meant a customer active for just 1 month with 11 zeros looked perfectly stable — which was wrong.

But blindly including zeros would also be wrong — a **new customer** is *expected* to have zeros. They shouldn't be penalised for them.

### The Fix: Context-Aware Stability

The new `computeCv()` applies different logic depending on who the customer is:

| Customer Type | How Stability Is Calculated |
|---|---|
| **New** (started in 2nd half of period) | cv on active months only — zeros are expected, no penalty |
| **Short history** (span < 6 months) | cv on active months only — not enough data to judge gaps fairly |
| **Established** (span ≥ 6 months) | cv blended with gap ratio — mid-range silence IS instability |

### Formula (Established Customers)

```
gapRatio  = (activeSpan − activeMonths) / activeSpan
blendedCv = rawCv × (1 − 0.35) + gapRatio × 0.35
```

So an established customer who was active 3 out of 10 months will have their cv nudged upward — correctly reflecting that their gaps are a real pattern, not a timing issue.

### Pros & Cons

| ✅ Pros | ❌ Cons |
|--------|--------|
| New customers are never penalised for expected zeros | Gap blend weight (0.35) is still a tuneable constant |
| Established customers with scattered gaps are correctly flagged | Short-span threshold (6 months) may need tuning per business |
| Context-aware — same function, different behaviour by customer type | Trailing silence is handled by consistency, not here — separation of concerns is clean but requires understanding both |

---

## Function 3: `computeScore`

> **"Give this customer a score out of 100"**

### How It Works (Plain English)

It calculates **4 sub-scores** and adds them up:

| Component | Max Points | What It Measures |
|-----------|-----------|-----------------|
| **Volume** | 30 pts | Average monthly swaps vs. benchmark of 25 |
| **Trend** | 25 pts | Is the customer growing or declining? |
| **Consistency** | 25 pts | How regularly do they swap, with penalty for recent silence |
| **Stability** | 20 pts | How predictable are their numbers (context-aware) |

### The Formulas

```
volumePts      = min(30, round((avg / 25) × 30))
consistencyPts = min(25, round((consistency / 100) × 25))
stabilityPts   = min(20, round(max(0, 1 − cv) × 20))
trendPts       = min(25, max(0, round(((trend + 50) / 100) × 25)))

finalScore = min(100, max(0, volumePts + trendPts + consistencyPts + stabilityPts))
```

> If trend confidence is **"low"**, trend points are capped at **15** instead of 25.

### Key Fixes vs Old Version

| # | What Changed | Why |
|---|---|---|
| **Fix #1** | `avg` now divides by `activeMonths`, not `numMonths` | A customer active 3 of 12 months was scoring 4× lower than they deserved |
| **Fix #2** | `cv` now uses context-aware `computeCv()` | New customers were being penalised for expected zeros |
| **Fix #3** | Trend confidence requires 6 months (was 4) | 4 data points aren't enough to trust a trend line |

### Key Metrics Explained

| Metric | Meaning |
|--------|---------|
| `avg` | Average swaps per **active** month *(fixed)* |
| `avg3` | Average of the last 3 active months |
| `peak` | Highest single month ever |
| `consistency` | % of months active, with penalty for recent silence |
| `cv` | How volatile the values are — context-aware, lower = more stable |
| `isNew` | Whether the customer started in the second half of the period |

### Consistency Decay Logic

If the customer has gone quiet recently, their consistency score is penalised:

```
decayFactor  = max(0, 1 − (trailingSilence / activeSpan) × 0.4)
consistency  = baseConsistency × decayFactor
```

A customer that was great for 9 months but has been silent for 3 **loses points**.

### Pros & Cons

| ✅ Pros | ❌ Cons |
|--------|--------|
| Balanced — rewards volume, growth, consistency, and stability | Volume benchmark of 25 is still hardcoded |
| New customers no longer penalised for leading zeros | Seasonality is still not accounted for |
| Trend confidence raised to reduce noisy high-confidence labels | Score weights (30/25/25/20) are opinionated |
| Context-aware stability prevents unfair gap penalties | — |

---

## Function 4: `classify`

> **"What segment does this customer belong to?"**

### Segment Priority Order

```
New → Re-engaged → Champion → Rising → At risk → Cooling → Steady
```

### Fix #4: Champion Hysteresis

Previously, a customer sitting at score 75 (the Champion threshold) would flip in and out of Champion on a single swap — which creates confusing dashboards and noisy alerts.

The fix adds a **buffer zone**:

```
To ENTER Champion:  score ≥ 75
To STAY Champion:   score ≥ 70  (75 − hysteresis of 5)
```

Pass `wasChampion = true` from your previous period data to activate this grace buffer.

| ✅ Pros | ❌ Cons |
|--------|--------|
| Segments are stable — no flipping on single swaps | Requires tracking previous segment in the hook |
| Re-engaged detection handles comeback customers well | Re-engaged logic depends on mid-range silence, edge cases possible |
| `isNew` flag is shared from `computeScore` — no duplication | — |

---

## Function 5: `computeRolling3` *(New)*

> **"What's the 3-month rolling average for the fleet?"**

### Fix #5: Consistent Rolling Window

The old inline logic was inconsistent:
- Month 0 → returned the raw value (not a rolling avg at all)
- Month 1 → returned a 2-month average
- Month 2+ → returned a proper 3-month rolling average

The new function returns **`null`** for months 0 and 1, and a proper 3-month average from month 2 onward. Charts can handle `null` cleanly — misleading partial averages are worse than no value.

```
Input:  [10, 20, 30, 40, 50]
Output: [null, null, 20, 30, 40]
```

---

## Function 6: `longestConsecutiveZeros`

> **"What's the longest gap with no activity?"**

### How It Works

Scans the array and tracks the longest unbroken streak of `0` values. Used internally to detect **Re-engaged** customers (came back after a long gap).

```
Input:  [5, 0, 0, 0, 3, 0, 2]
Output: 3
```

| ✅ Pros | ❌ Cons |
|--------|--------|
| Simple and fast O(n) | Only finds the longest gap — not when it happened |
| Used for Re-engaged detection, not just reporting | Doesn't distinguish early gaps vs recent gaps |

---

## Summary

```
Final Score (0–100) = Volume  +  Trend  +  Consistency  +  Stability
                       (30)      (25)         (25)           (20)
```

| Score Range | Meaning |
|---|---|
| 75–100 | Champion territory — high volume, growing, consistent, stable |
| 50–74 | Healthy — one or two weak areas |
| 25–49 | Warning signs — declining, inconsistent, or low volume |
| 0–24 | At risk — little to no meaningful activity |

A **high score** means: high average volume per active month, growing trend, active most months, and predictable values.
A **low score** means: low volume, declining trend, lots of gaps, or very erratic numbers.