import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import SnowflakeServiceConnectionManager from "@/lib/snowflake-service";
import { toLocalDisplay } from "@/lib/timezone";

// This route is PROTECTED — it's the only thing that actually hits
// Snowflake and rewrites the cache. Call it manually (Postman/curl) or
// wire it up to a scheduled job if you eventually want it automatic.

const CACHE_KEY = "cache:scooter-total-distance-snowflake";
const META_KEY = `${CACHE_KEY}:meta`;

// Since your source data only updates once a day as a batch job, there's
// no point querying Snowflake more often than this.
const MIN_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

const SQL = `
  SELECT SUM(DISTANCE_KM) AS total_distance_km
  FROM REPORT_DB.GPS_DASHBOARD.VEHICLE_DISTANCE_PUBLIC
`;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-refresh-secret");
  if (!process.env.REFRESH_SECRET || secret !== process.env.REFRESH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = await getRedis();

  // ─── Throttle — skip Snowflake if refreshed within the last 12h ──────────
  const metaData = await redis.get(META_KEY);
  const meta = metaData ? JSON.parse(metaData) : null;

  if (meta?.lastRefreshed) {
    const elapsedMs = Date.now() - new Date(meta.lastRefreshed).getTime();

    if (elapsedMs < MIN_REFRESH_INTERVAL_MS) {
      const cached = await redis.get(CACHE_KEY);
      const totalDistanceKm = cached ? JSON.parse(cached).totalDistanceKm : null;

      return NextResponse.json({
        totalDistanceKm,
        lastRefreshed: toLocalDisplay(meta.lastRefreshed), // unchanged — still accurate
      });
    }
  }
  // ───────────────────────────────────────────────────────────────────────

  try {
    const result = await SnowflakeServiceConnectionManager.executeQuery(SQL);
    const totalDistanceKm = result.rows?.[0]?.TOTAL_DISTANCE_KM ?? 0;
    const nowUtc = new Date().toISOString();

    await redis.set(CACHE_KEY, JSON.stringify({ totalDistanceKm }));
    await redis.set(META_KEY, JSON.stringify({ lastRefreshed: nowUtc }));

    console.log(`[scooter-total-distance] Refreshed — ${totalDistanceKm} km`);

    return NextResponse.json({
      totalDistanceKm,
      lastRefreshed: toLocalDisplay(nowUtc), // real refresh just happened — correctly shows "now"
    });
  } catch (err: any) {
    console.error("[scooter-total-distance] refresh failed:", err);
    return NextResponse.json(
      { error: "Refresh failed", details: err.message },
      { status: 500 }
    );
  }
}