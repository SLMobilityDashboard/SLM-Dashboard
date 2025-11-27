import { NextRequest, NextResponse } from "next/server";
import SnowflakeConnectionManager from "@/lib/snowflake";
import crypto from "crypto";
import { getRedis } from "@/lib/redis";

// -------------------- Cache Helpers --------------------
// Include date in key to automatically expire daily
function generateQueryHash(sql: string, userId?: string): string {
  const normalizedSql = sql.trim().toLowerCase().replace(/\s+/g, " ");
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const queryString = userId
    ? `${userId}:${normalizedSql}:${today}`
    : `${normalizedSql}:${today}`;
  return crypto.createHash("sha256").update(queryString).digest("hex");
}

// Write cache with 5MB reserved
async function writeToCache(hash: string, data: any[]): Promise<void> {
  const redis = await getRedis();

  // Redis memory check
  const info = await redis.info("memory");
  const usedMemoryMatch = info.match(/used_memory:(\d+)/);
  const usedMemory = usedMemoryMatch ? parseInt(usedMemoryMatch[1]) : 0;

  const dataSize = Buffer.byteLength(JSON.stringify(data), "utf-8");
  const maxMemory = 30 * 1024 * 1024; // 30MB plan
  const reserve = 5 * 1024 * 1024;    // 5MB reserve

  if (usedMemory + dataSize > maxMemory - reserve) {
    console.warn(`Skipping cache for ${hash}: not enough memory`);
    return;
  }

  await redis.set(hash, JSON.stringify(data), { EX: 86400 }); // 24h TTL
}

async function readFromCache(hash: string): Promise<any[] | null> {
  const redis = await getRedis();
  const data = await redis.get(hash);
  return data ? JSON.parse(data) : null;
}

// -------------------- API Handler --------------------
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { sql, userId } = await req.json();
    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "Missing or invalid SQL" }, { status: 400 });
    }

    const queryHash = generateQueryHash(sql, userId);
    const shortHash = queryHash.substring(0, 8);

    // 1️⃣ Check Redis cache
    const cachedData = await readFromCache(queryHash);
    if (cachedData) {
      const duration = Date.now() - startTime;
      console.log(`🟢 CACHE HIT [${shortHash}] - ${cachedData.length} rows - ${duration}ms`);
      return NextResponse.json(cachedData, {
        status: 200,
        headers: { "X-Cache-Status": "HIT", "X-Cache-Hash": queryHash },
      });
    }

    // 2️⃣ Cache miss → query Snowflake
    console.log(`🔴 CACHE MISS [${shortHash}] - Executing Snowflake`);
    await SnowflakeConnectionManager.connect();
    const connection = SnowflakeConnectionManager.getConnection();

    const rows = await new Promise<any[]>((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        complete: (err, _stmt, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        },
      });
    });

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No records found" }, { status: 404 });
    }

    // 3️⃣ Cache the result
    await writeToCache(queryHash, rows);

    const totalDuration = Date.now() - startTime;
    console.log(`✅ QUERY COMPLETE [${shortHash}] - ${rows.length} rows - ${totalDuration}ms`);

    return NextResponse.json(rows, {
      status: 200,
      headers: { "X-Cache-Status": "MISS", "X-Cache-Hash": queryHash },
    });
  } catch (err: any) {
    console.error(`❌ QUERY ERROR - Duration: ${Date.now() - startTime}ms`, err);
    return NextResponse.json([{ error: "snowflake connection failed" }], { status: 500 });
  }
}
