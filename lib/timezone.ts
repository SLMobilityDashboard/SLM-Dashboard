// Shared timestamp formatting so every route that returns "lastRefreshed"
// displays it the same way. Timestamps are always STORED in Redis as raw
// UTC ISO strings — that never changes, since date-math (throttling,
// comparisons) needs to stay unambiguous. This file only controls how
// timestamps are DISPLAYED in API responses.

export const DISPLAY_TIMEZONE = "Asia/Colombo"; // UTC+5:30 — change if wrong

export function toLocalDisplay(isoUtc: string | null): string | null {
  if (!isoUtc) return null;
  return new Date(isoUtc).toLocaleString("en-US", {
    timeZone: DISPLAY_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "medium",
  });
}