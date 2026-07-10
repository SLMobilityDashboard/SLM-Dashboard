// lib/battery-integrity-queries.ts

export type MismatchStatus = "open" | "investigating" | "resolved" | "confirmed_theft";

export interface BatteryMismatchRow {
  TRNXID: string;
  CUSTOMER_ID: string;
  STATION_ID: string | null;
  STATION_NAME: string | null;
  CREATED_EPOCH: number;
  EXPECTED_BID: string;
  RETURNED_BID: string;
  PREV_STATION_NAME: string | null;
  PREV_CREATED_EPOCH: number | null;
  SURNAME: string | null;
  OTHER_NAMES: string | null;
  MOBILE: number | null;
  IS_BLOCKED: number;
}

// Custody mismatch: the battery a customer returns this swap (OLDCABINET_BID)
// should equal the battery they were issued at their immediately preceding
// swap (NEWCABINET_BID from the prior row for that CUSTOMER_ID). LAG() over
// CREATED_EPOCH per customer gets us that "expected" battery id; anything
// that doesn't match RETURNED_BID is a flagged custody mismatch.
//
// NOTE: null/blank BID filters reinstated after debugging confirmed genuine
// mismatches were being found. Rows with a blank/NULL OLDCABINET_BID or
// NEWCABINET_BID represent an incomplete/failed swap (no battery physically
// recorded as returned or issued) — not a custody mismatch — so they're
// excluded here rather than shown as a flagged "empty" mismatch.
//
// STATUS filter is intentionally left out (confirmed decision — do not
// reintroduce WHERE STATUS = '<value>' without discussion). Because of that,
// retried/incomplete attempts (e.g. STATUS = 'PROCESSING') can appear in the
// source data multiple times for the same logical swap — same CUSTOMER_ID,
// same OLDCABINET_BID/NEWCABINET_BID pair, seconds/minutes apart, each with
// a distinct TRNXID. Left unhandled, LAG() would treat each retry as its own
// transaction and compare retries against each other, producing FALSE
// mismatches.
//
// The `dedup` CTE below collapses retries using a TIME-WINDOWED match: only
// rows for the same customer + exact (returned, issued) BID pair that fall
// within the same RETRY_WINDOW_SECONDS bucket are treated as one logical
// attempt (only the latest, rn = 1, is kept). This is deliberately narrower
// than a plain customer+BID-pair dedup — an earlier version keyed on
// customer+BID-pair with no time bound, which could also collapse two
// genuinely separate, real swap events that happened to reuse the same
// battery pair weeks/months apart, silently dropping a row from the LAG()
// chain and causing a real mismatch to go undetected on a later row.
// RETRY_WINDOW_SECONDS = 1800 (30 min) is a placeholder — confirm against
// how far apart real retry attempts actually land in your data before
// trusting this in production; too wide a window reintroduces the false-
// negative risk described above, too narrow lets genuine retries slip
// through as separate rows again.
//
// LIMITATION: this dedup only catches EXACT-duplicate retries (identical
// BID pair repeated) within the window. If a retry sequence issues a
// genuinely different battery on a later attempt, this won't collapse it,
// and STATUS (or a retry-linking field, if one exists) would be needed to
// know which attempt actually completed.
//
// ASSUMPTIONS STILL TO CONFIRM AGAINST YOUR SCHEMA:
//   1. OLDCABINET_BID = battery physically handed back by the customer,
//      NEWCABINET_BID = battery issued to the customer, in this transaction.
//      If your schema means the opposite, swap them below.
//   2. BID values are compared with TRIM(UPPER(...)) so incidental casing
//      or whitespace differences between OLDCABINET_BID and NEWCABINET_BID
//      don't produce false mismatches (or hide real ones).
export const BATTERY_MISMATCH_SQL = `
WITH dedup AS (
  SELECT
    TRNXID,
    CUSTOMER_ID,
    STATION_ID,
    CREATED_EPOCH,
    TRIM(UPPER(OLDCABINET_BID)) AS RETURNED_BID,
    TRIM(UPPER(NEWCABINET_BID)) AS ISSUED_BID,
    ROW_NUMBER() OVER (
      PARTITION BY CUSTOMER_ID,
                   TRIM(UPPER(OLDCABINET_BID)),
                   TRIM(UPPER(NEWCABINET_BID)),
                   FLOOR(CREATED_EPOCH / 1800000)  -- 30-minute retry bucket (ms)
      ORDER BY CREATED_EPOCH DESC
    ) AS rn
  FROM SOURCE_DATA.DYNAMO_DB.FACT_TRANSACTION
  WHERE CUSTOMER_ID IS NOT NULL
    AND OLDCABINET_BID IS NOT NULL
    AND NEWCABINET_BID IS NOT NULL
    AND TRIM(OLDCABINET_BID) <> ''
    AND TRIM(NEWCABINET_BID) <> ''
),
swaps AS (
  SELECT
    TRNXID,
    CUSTOMER_ID,
    STATION_ID,
    CREATED_EPOCH,
    RETURNED_BID,
    ISSUED_BID,
    LAG(ISSUED_BID) OVER (
      PARTITION BY CUSTOMER_ID ORDER BY CREATED_EPOCH
    ) AS EXPECTED_BID,
    LAG(STATION_ID) OVER (
      PARTITION BY CUSTOMER_ID ORDER BY CREATED_EPOCH
    ) AS PREV_STATION_ID,
    LAG(CREATED_EPOCH) OVER (
      PARTITION BY CUSTOMER_ID ORDER BY CREATED_EPOCH
    ) AS PREV_CREATED_EPOCH
  FROM dedup
  WHERE rn = 1
)
SELECT
  s.TRNXID,
  s.CUSTOMER_ID,
  s.STATION_ID,
  st.NAME  AS STATION_NAME,
  s.CREATED_EPOCH,
  s.EXPECTED_BID,
  s.RETURNED_BID,
  pst.NAME AS PREV_STATION_NAME,
  s.PREV_CREATED_EPOCH,
  c.SURNAME,
  c.OTHER_NAMES,
  c.MOBILE,
  c.IS_BLOCKED
FROM swaps s
JOIN SOURCE_DATA.MASTER_DATA.CUSTOMER c
  ON c.CUSTOMER_ID = s.CUSTOMER_ID
LEFT JOIN SOURCE_DATA.MASTER_DATA.SWAPPING_STATION st
  ON st.STATION_ID = s.STATION_ID
LEFT JOIN SOURCE_DATA.MASTER_DATA.SWAPPING_STATION pst
  ON pst.STATION_ID = s.PREV_STATION_ID
WHERE s.EXPECTED_BID IS NOT NULL
  AND s.EXPECTED_BID <> s.RETURNED_BID
ORDER BY s.CREATED_EPOCH DESC
`;

// -------------------- Formatting helpers (used by the panel) --------------------

export function formatEpoch(epoch: number | null | undefined): string {
  if (!epoch) return "—";
  const ms = epoch > 1e12 ? epoch : epoch * 1000; // handle sec vs ms epochs
  return new Date(ms).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function customerDisplayName(row: BatteryMismatchRow): string {
  const name = [row.OTHER_NAMES, row.SURNAME].filter(Boolean).join(" ").trim();
  return name || row.CUSTOMER_ID;
}

export function formatMobile(mobile: number | string | null | undefined): string {
  if (!mobile) return "—";
  const s = String(mobile);
  return s.length === 9 ? `0${s}` : s; // adjust to your actual local format
}

export function shortBid(bid: string | null | undefined): string {
  if (!bid) return "—";
  return bid.length > 10 ? `${bid.slice(0, 4)}…${bid.slice(-4)}` : bid;
}