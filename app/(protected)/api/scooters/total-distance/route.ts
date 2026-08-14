import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { toLocalDisplay } from "@/lib/timezone";

// This route is intentionally PUBLIC — no auth check.
// It only ever reads from Redis, it never touches Snowflake,
// so it's cheap and safe to leave open.

const CACHE_KEY = "cache:scooter-total-distance";
const META_KEY = `${CACHE_KEY}:meta`;

export async function GET() {
  try {
    const redis = await getRedis();
    const cached = await redis.get(CACHE_KEY);

    if (!cached) {
      return NextResponse.json(
        { error: "No data yet. Trigger a refresh first." },
        { status: 503 }
      );
    }

    const metaData = await redis.get(META_KEY);
    const lastRefreshedUtc = metaData ? JSON.parse(metaData).lastRefreshed : null;

    const { totalDistanceKm } = JSON.parse(cached);

    return NextResponse.json(
      {
        totalDistanceKm,
        lastRefreshed: toLocalDisplay(lastRefreshedUtc),
      },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=3600" },
      }
    );
  } catch (err: any) {
    console.error("[scooter-total-distance] GET failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}