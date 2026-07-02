import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SnowflakeConnectionManager from "@/lib/snowflake";
import crypto from "crypto";
import { getRedis } from "@/lib/redis";

// -------------------- Types --------------------

interface QueryLogEntry {
  queryHash:   string;
  shortHash:   string;
  sql:         string;
  username:    string;
  email:       string;
  cacheStatus: "HIT" | "MISS" | "REVALIDATED" | "DEDUP";
  rowCount:    number;
  duration:    number;
  timestamp:   Date;
  dataSize?:   number;
}

interface QueryStats {
  queryHash:             string;
  shortHash:             string;
  sql:                   string;
  totalHits:             number;
  totalMisses:           number;
  totalExecutions:       number;
  avgDuration:           number;
  avgRowCount:           number;
  lastExecuted:          string | null;
  lastCacheHit:          string | null;
  firstSeen:             string;
  cacheHitRate:          number;
  preWarmScore:          number;
  dailyHitHistory:       { [date: string]: number };
  consecutiveDaysNoHits: number;
  isPersistent:          boolean;
}

interface CacheMetadata {
  lastVerified:      string;
  dataHash:          string;
  verificationCount: number;
  lastDataChange:    string | null;
  dataChangeCount:   number;
}

// -------------------- Query Normalization --------------------

const DYNAMIC_DATE_FUNCTIONS = [
  "current_date", "current_timestamp", "current_time",
  "localtime", "localtimestamp", "now(", "curdate(",
  "curtime(", "sysdate(", "utc_date", "utc_time",
  "utc_timestamp", "getdate(", "getutcdate(",
  "sysdatetime(", "sysutcdatetime(",
];

function hasDynamicDates(sql: string): boolean {
  const lower = sql.toLowerCase();
  return DYNAMIC_DATE_FUNCTIONS.some(fn => lower.includes(fn));
}

function normalizeSQL(sql: string): string {
  let n = sql.trim().toLowerCase().replace(/\s+/g, " ");
  n = n.replace(/--[^\n]*/g, "");
  n = n.replace(/\/\*[\s\S]*?\*\//g, "");
  n = n.replace(/current_date\s*\(\s*\)/gi,      "current_date()");
  n = n.replace(/current_timestamp\s*\(\s*\)/gi, "current_timestamp()");
  n = n.replace(/now\s*\(\s*\)/gi,               "now()");
  n = n.replace(/interval\s+['"]?\d+['"]?/gi,    "interval __N__");
  return n.trim();
}

function generateQueryHash(sql: string): string {
  return crypto.createHash("sha256").update(normalizeSQL(sql)).digest("hex");
}

function generateCacheKey(queryHash: string, sql: string, forceDynamic?: boolean): string {
  if (hasDynamicDates(sql) || forceDynamic) {
    const today = new Date().toISOString().slice(0, 10);
    return `cache:${queryHash}:${today}`;
  }
  return `cache:${queryHash}`;
}

function generateDataHash(data: any[]): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function getCacheStrategy(sql: string, forceDynamic?: boolean): {
  type: "static" | "daily" | "hourly";
  ttl:  number | null;
} {
  if (forceDynamic) return { type: "daily", ttl: 86400 };

  const lower       = sql.toLowerCase();
  const hasTimeFunc = ["current_timestamp", "current_time", "now(", "getdate(", "sysdatetime("]
    .some(fn => lower.includes(fn));

  if (hasTimeFunc)          return { type: "hourly", ttl: 3600  };
  if (hasDynamicDates(sql)) return { type: "daily",  ttl: 86400 };

  return { type: "static", ttl: null };
}

// -------------------- Dedup Lock --------------------

/**
 * Acquire a short-lived lock so only ONE request executes a given SQL
 * against Snowflake on a cache miss. All other concurrent requests for
 * the same SQL wait and pick up the result from cache once it's written.
 */
async function acquireMissLock(cacheKey: string): Promise<boolean> {
  const redis    = await getRedis();
  const lockKey  = `lock:miss:${cacheKey}`;
  // 60s TTL — more than enough for any Snowflake query; auto-releases if the
  // process crashes before we can manually delete it.
  const acquired = await redis.set(lockKey, Date.now().toString(), { NX: true, EX: 60 });
  return acquired === "OK";
}

async function releaseMissLock(cacheKey: string): Promise<void> {
  const redis = await getRedis();
  await redis.del(`lock:miss:${cacheKey}`);
}

/**
 * Poll Redis until the cache key is populated (by the request that won the
 * lock) or the timeout is reached. Returns the cached data or null.
 */
async function waitForCache(cacheKey: string, timeoutMs = 25_000): Promise<any[] | null> {
  const pollInterval = 150; // ms between polls
  const deadline     = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, pollInterval));
    const data = await readFromCache(cacheKey);
    if (data !== null) return data;
  }

  return null;
}

// -------------------- Revalidation --------------------

async function acquireRevalidationLock(cacheKey: string): Promise<boolean> {
  const redis    = await getRedis();
  const lockKey  = `lock:revalidate:${cacheKey}`;
  const acquired = await redis.set(lockKey, Date.now().toString(), { NX: true, EX: 300 });
  return acquired === "OK";
}

async function releaseRevalidationLock(cacheKey: string): Promise<void> {
  const redis = await getRedis();
  await redis.del(`lock:revalidate:${cacheKey}`);
}

async function needsRevalidation(cacheKey: string, isPersistent: boolean): Promise<boolean> {
  if (!isPersistent) return false;

  const redis    = await getRedis();
  const metaData = await redis.get(`${cacheKey}:meta`);
  if (!metaData) return true;

  const meta                  = JSON.parse(metaData) as CacheMetadata;
  const daysSinceVerification =
    (Date.now() - new Date(meta.lastVerified).getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceVerification >= 7;
}

async function performRevalidation(
  cacheKey:        string,
  shortHash:       string,
  sql:             string,
  cognitoUsername: string,
  Token:           string,
): Promise<{ dataChanged: boolean; newData?: any[]; error?: string }> {
  console.log(`[REVALIDATE] [${shortHash}] Checking for data changes...`);

  const redis   = await getRedis();
  const metaKey = `${cacheKey}:meta`;

  try {
    const result = await SnowflakeConnectionManager.executeQuery(sql, cognitoUsername, { Token });

    const freshData     = result.rows;
    const freshDataHash = generateDataHash(freshData);

    const existingMetaData = await redis.get(metaKey);
    const existingMeta     = existingMetaData
      ? (JSON.parse(existingMetaData) as CacheMetadata)
      : null;

    const dataChanged = !existingMeta || existingMeta.dataHash !== freshDataHash;
    const cachedData  = await redis.get(cacheKey);
    const cacheTTL    = cachedData ? await redis.ttl(cacheKey) : null;

    const newMeta: CacheMetadata = {
      lastVerified:      new Date().toISOString(),
      dataHash:          freshDataHash,
      verificationCount: (existingMeta?.verificationCount || 0) + 1,
      lastDataChange:    dataChanged
        ? new Date().toISOString()
        : existingMeta?.lastDataChange || null,
      dataChangeCount:   (existingMeta?.dataChangeCount || 0) + (dataChanged ? 1 : 0),
    };

    if (cacheTTL && cacheTTL > 0) {
      await redis.set(metaKey, JSON.stringify(newMeta), { EX: cacheTTL });
    } else {
      await redis.set(metaKey, JSON.stringify(newMeta));
    }

    if (dataChanged) {
      console.log(`[REVALIDATE] [${shortHash}] Data changed (#${newMeta.dataChangeCount})`);
      return { dataChanged: true, newData: freshData };
    }

    console.log(`[REVALIDATE] [${shortHash}] Unchanged (check #${newMeta.verificationCount})`);
    return { dataChanged: false };

  } catch (error: any) {
    console.error(`[REVALIDATE] [${shortHash}] Failed:`, error.message);
    return { dataChanged: false, error: error.message };
  }
}

// -------------------- Analytics --------------------

async function logQueryAnalytics(entry: QueryLogEntry): Promise<void> {
  const redis = await getRedis();

  try {
    const today  = new Date().toISOString().slice(0, 10);
    const logKey = `query:log:${entry.shortHash}:${Date.now()}`;
    await redis.set(logKey, JSON.stringify(entry), { EX: 604800 });

    const statsKey      = `query:stats:${entry.queryHash}`;
    const existingStats = await redis.get(statsKey);

    let stats: QueryStats = existingStats ? JSON.parse(existingStats) : {
      queryHash:             entry.queryHash,
      shortHash:             entry.shortHash,
      sql:                   entry.sql,
      totalHits:             0,
      totalMisses:           0,
      totalExecutions:       0,
      avgDuration:           0,
      avgRowCount:           0,
      lastExecuted:          null,
      lastCacheHit:          null,
      firstSeen:             new Date().toISOString(),
      cacheHitRate:          0,
      preWarmScore:          0,
      dailyHitHistory:       {},
      consecutiveDaysNoHits: 0,
      isPersistent:          false,
    };

    stats.totalExecutions++;

    if (entry.cacheStatus === "HIT" || entry.cacheStatus === "REVALIDATED" || entry.cacheStatus === "DEDUP") {
      stats.totalHits++;
      stats.lastCacheHit           = entry.timestamp.toISOString();
      stats.dailyHitHistory[today] = (stats.dailyHitHistory[today] || 0) + 1;
    } else {
      stats.totalMisses++;
    }

    stats.avgDuration =
      ((stats.avgDuration * (stats.totalExecutions - 1)) + entry.duration) /
      stats.totalExecutions;
    stats.avgRowCount =
      ((stats.avgRowCount * (stats.totalExecutions - 1)) + entry.rowCount) /
      stats.totalExecutions;
    stats.lastExecuted = entry.timestamp.toISOString();
    stats.cacheHitRate = (stats.totalHits / stats.totalExecutions) * 100;

    cleanOldHistory(stats, 14);
    stats.consecutiveDaysNoHits = calculateConsecutiveDaysNoHits(stats, today);
    stats                       = applyDecayAndCalculateScore(stats);
    stats.isPersistent          = shouldBePersistent(stats);

    await redis.set(statsKey, JSON.stringify(stats));
    await redis.zAdd("query:prewarm:candidates", {
      score: stats.preWarmScore,
      value: entry.queryHash,
    });

    console.log(
      `[${entry.shortHash}] [${entry.username}] ${entry.cacheStatus} | ` +
      `Score: ${stats.preWarmScore.toFixed(2)} | ` +
      `Persistent: ${stats.isPersistent} | ` +
      `No-hit: ${stats.consecutiveDaysNoHits}d`
    );

  } catch (error) {
    console.error("Failed to log analytics:", error);
  }
}

function cleanOldHistory(stats: QueryStats, keepDays: number): void {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  Object.keys(stats.dailyHitHistory).forEach(date => {
    if (date < cutoffStr) delete stats.dailyHitHistory[date];
  });
}

function calculateConsecutiveDaysNoHits(stats: QueryStats, today: string): number {
  if (!stats.lastCacheHit) return stats.totalExecutions > 0 ? 1 : 0;

  const lastHitDate = new Date(stats.lastCacheHit).toISOString().slice(0, 10);
  if (lastHitDate === today) return 0;

  return Math.max(
    0,
    Math.floor(
      (new Date(today).getTime() - new Date(lastHitDate).getTime()) / 86400000
    )
  );
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
  );
}

function shouldBePersistent(stats: QueryStats): boolean {
  if (stats.consecutiveDaysNoHits >= 7) return false;

  const last7Days  = getLast7Days();
  const activeDays = last7Days.filter(d => (stats.dailyHitHistory[d] || 0) > 0);
  if (activeDays.length < 3) return false;

  const totalHits        = activeDays.reduce((s, d) => s + (stats.dailyHitHistory[d] || 0), 0);
  const avgHitsPerActive = totalHits / activeDays.length;
  return avgHitsPerActive >= 2;
}

function applyDecayAndCalculateScore(stats: QueryStats): QueryStats {
  const last7Days       = getLast7Days();
  const recentHits      = last7Days.reduce((s, d) => s + (stats.dailyHitHistory[d] || 0), 0);
  const activeDaysLast7 = last7Days.filter(d => (stats.dailyHitHistory[d] || 0) > 0).length;

  const baseScore = (
    Math.min(stats.totalExecutions / 100,    1) * 0.20 +
    Math.min(stats.avgDuration     / 5000,   1) * 0.15 +
    Math.min(stats.avgRowCount     / 100000, 1) * 0.10 +
    Math.min(stats.totalHits       / 50,     1) * 0.20 +
    Math.min(recentHits            / 20,     1) * 0.25 +
    (activeDaysLast7 / 7)                        * 0.10
  ) * 100;

  const decayMultiplier = stats.consecutiveDaysNoHits > 0
    ? Math.pow(0.75, stats.consecutiveDaysNoHits)
    : 1.0;

  stats.preWarmScore = Math.min(100, Math.max(0, baseScore * decayMultiplier));
  return stats;
}

// -------------------- Cache Helpers --------------------

async function readFromCache(cacheKey: string): Promise<any[] | null> {
  const redis = await getRedis();
  const data  = await redis.get(cacheKey);
  return data ? JSON.parse(data) : null;
}

async function writeToCache(
  cacheKey:  string,
  data:      any[],
  shortHash: string,
  options:   { strategy: { type: string; ttl: number | null }; stats?: QueryStats; isRevalidation?: boolean }
): Promise<void> {
  const redis                                       = await getRedis();
  const dataSize                                    = Buffer.byteLength(JSON.stringify(data), "utf-8");
  const { strategy, stats, isRevalidation = false } = options;

  const newMeta: CacheMetadata = {
    lastVerified:      new Date().toISOString(),
    dataHash:          generateDataHash(data),
    verificationCount: 0,
    lastDataChange:    new Date().toISOString(),
    dataChangeCount:   0,
  };

  try {
    if (strategy.type === "static" && stats?.isPersistent) {
      await redis.set(cacheKey, JSON.stringify(data));
      if (!isRevalidation) {
        await redis.set(`${cacheKey}:meta`, JSON.stringify(newMeta));
      }
      console.log(
        `${isRevalidation ? "Refreshed" : "Cached"} [${shortHash}] PERSISTENT — ` +
        `${data.length} rows (${(dataSize / 1024 / 1024).toFixed(1)}MB)`
      );

    } else if (strategy.ttl) {
      await redis.set(cacheKey,           JSON.stringify(data),    { EX: strategy.ttl });
      await redis.set(`${cacheKey}:meta`, JSON.stringify(newMeta), { EX: strategy.ttl });
      console.log(
        `Cached [${shortHash}] for ${Math.floor(strategy.ttl / 3600)}h ` +
        `(${strategy.type}) — ${data.length} rows (${(dataSize / 1024 / 1024).toFixed(1)}MB)`
      );

    } else {
      await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 });
      console.log(
        `Cached [${shortHash}] for 24h — ${data.length} rows (${(dataSize / 1024 / 1024).toFixed(1)}MB)`
      );
    }
  } catch (error: any) {
    console.error(`Cache write failed for [${shortHash}]:`, error.message);
  }
}

// -------------------- POST Handler --------------------

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const contentType = req.headers.get("content-type") ?? "";
    const text        = await req.text();

    if (!contentType.includes("application/json") || !text.trim()) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { sql, forceDynamic } = JSON.parse(text);

    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "Missing or invalid SQL" }, { status: 400 });
    }

    // ─── Auth ─────────────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cognitoUsername = (session.user as any).username;
    const email           = session.user.email ?? "";

    if (!cognitoUsername) {
      return NextResponse.json(
        { error: "cognito:username not found in session — check NextAuth jwt callback" },
        { status: 401 }
      );
    }

    const Token = (session as any).idToken ?? (session as any).accessToken ?? null;
    if (!Token) {
      return NextResponse.json({ error: "No Cognito token in session" }, { status: 401 });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const queryHash    = generateQueryHash(sql);
    const cacheKey     = generateCacheKey(queryHash, sql, forceDynamic);
    const shortHash    = queryHash.substring(0, 8);
    const strategy     = getCacheStrategy(sql, forceDynamic);

    // console.log(`[${shortHash}] [${cognitoUsername}] Processing query`);

    const redis        = await getRedis();
    const statsData    = await redis.get(`query:stats:${queryHash}`);
    const stats        = statsData ? (JSON.parse(statsData) as QueryStats) : undefined;
    const isPersistent = stats?.isPersistent || false;

    // ─── Cache HIT ────────────────────────────────────────────────────────────
    const cachedData = await readFromCache(cacheKey);

    if (cachedData) {
      const shouldRevalidate = await needsRevalidation(cacheKey, isPersistent);

      if (shouldRevalidate) {
        const lockAcquired = await acquireRevalidationLock(cacheKey);

        if (lockAcquired) {
          const duration = Date.now() - startTime;
          console.log(
            `🟡 [CACHE HIT] [${shortHash}] [${cognitoUsername}] [PERSISTENT] ` +
            `— Revalidating in background — ${cachedData.length} rows — ${duration}ms`
          );

          (async () => {
            try {
              const result = await performRevalidation(
                cacheKey, shortHash, sql, cognitoUsername, Token
              );
              if (result.dataChanged && result.newData) {
                await writeToCache(cacheKey, result.newData, shortHash, {
                  strategy, stats, isRevalidation: true,
                });
              }
            } catch (error) {
              console.error(`Background revalidation failed [${shortHash}]:`, error);
            } finally {
              await releaseRevalidationLock(cacheKey);
            }
          })();

          await logQueryAnalytics({
            queryHash, shortHash, sql,
            username:    cognitoUsername,
            email,
            cacheStatus: "REVALIDATED",
            rowCount:    cachedData.length,
            duration,
            timestamp:   new Date(),
            dataSize:    Buffer.byteLength(JSON.stringify(cachedData), "utf-8"),
          });

          return NextResponse.json(cachedData, {
            status: 200,
            headers: {
              "X-Cache-Status": "HIT-REVALIDATING",
              "X-Cache-Hash":   queryHash,
              "X-Cache-Type":   strategy.type,
              "X-Persistent":   "true",
              "X-Revalidation": "background",
              "X-User":         cognitoUsername,
            },
          });
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `🟢 [CACHE HIT] [${shortHash}] [${cognitoUsername}] (${strategy.type})` +
        `${isPersistent ? " [PERSISTENT]" : ""} — ${cachedData.length} rows — ${duration}ms`
      );

      await logQueryAnalytics({
        queryHash, shortHash, sql,
        username:    cognitoUsername,
        email,
        cacheStatus: "HIT",
        rowCount:    cachedData.length,
        duration,
        timestamp:   new Date(),
        dataSize:    Buffer.byteLength(JSON.stringify(cachedData), "utf-8"),
      });

      return NextResponse.json(cachedData, {
        status: 200,
        headers: {
          "X-Cache-Status": "HIT",
          "X-Cache-Hash":   queryHash,
          "X-Cache-Type":   strategy.type,
          "X-Persistent":   isPersistent ? "true" : "false",
          "X-User":         cognitoUsername,
        },
      });
    }

    // ─── Cache MISS — acquire dedup lock ──────────────────────────────────────
    // Prevents concurrent requests for the same uncached SQL from each
    // spawning a separate Snowflake query. Only the request that wins the
    // lock executes; all others wait and read from cache once it's written.
    const missLockAcquired = await acquireMissLock(cacheKey);

    if (!missLockAcquired) {
      // Another request is already running this exact query — wait for it
      // console.log(`⏳ [DEDUP] [${shortHash}] [${cognitoUsername}] Waiting for in-flight query...`);

      const dedupResult = await waitForCache(cacheKey);
      const duration    = Date.now() - startTime;

      if (dedupResult !== null) {
        console.log(
          // `✅ [DEDUP] [${shortHash}] [${cognitoUsername}] Got result from in-flight query — ` +
          `${dedupResult.length} rows — ${duration}ms`
        );

        await logQueryAnalytics({
          queryHash, shortHash, sql,
          username:    cognitoUsername,
          email,
          cacheStatus: "DEDUP",
          rowCount:    dedupResult.length,
          duration,
          timestamp:   new Date(),
          dataSize:    Buffer.byteLength(JSON.stringify(dedupResult), "utf-8"),
        });

        return NextResponse.json(dedupResult, {
          status: 200,
          headers: {
            "X-Cache-Status": "DEDUP",
            "X-Cache-Hash":   queryHash,
            "X-Cache-Type":   strategy.type,
            "X-User":         cognitoUsername,
          },
        });
      }

      // In-flight query failed or timed out — fall through and try ourselves
      console.warn(`⚠️  [DEDUP] [${shortHash}] Wait timed out — executing independently`);
    }

    // ─── Execute against Snowflake ────────────────────────────────────────────
    console.log(
      `🔴 [CACHE MISS] [${shortHash}] [${cognitoUsername}] (${strategy.type}) — Executing Snowflake`
    );

    try {
      const result = await SnowflakeConnectionManager.executeQuery(sql, cognitoUsername, { Token });
      const rows   = result.rows;

      if (!rows || rows.length === 0) {
        await redis.set(cacheKey, JSON.stringify([]), { EX: 3600 });
        console.log(`[EMPTY RESULT] [${shortHash}] [${cognitoUsername}] — Cached for 1h`);

        const duration = Date.now() - startTime;
        await logQueryAnalytics({
          queryHash, shortHash, sql,
          username:    cognitoUsername,
          email,
          cacheStatus: "MISS",
          rowCount:    0,
          duration,
          timestamp:   new Date(),
          dataSize:    0,
        });

        return NextResponse.json([], {
          status: 200,
          headers: {
            "X-Cache-Status": "MISS",
            "X-Cache-Hash":   queryHash,
            "X-Cache-Type":   "hourly",
            "X-Row-Count":    "0",
            "X-User":         cognitoUsername,
          },
        });
      }

      await writeToCache(cacheKey, rows, shortHash, { strategy, stats });

      const totalDuration = Date.now() - startTime;
      const dataSize      = Buffer.byteLength(JSON.stringify(rows), "utf-8");

      console.log(
        `✅ [QUERY COMPLETE] [${shortHash}] [${cognitoUsername}] — ${rows.length} rows — ${totalDuration}ms`
      );

      await logQueryAnalytics({
        queryHash, shortHash, sql,
        username:    cognitoUsername,
        email,
        cacheStatus: "MISS",
        rowCount:    rows.length,
        duration:    totalDuration,
        timestamp:   new Date(),
        dataSize,
      });

      return NextResponse.json(rows, {
        status: 200,
        headers: {
          "X-Cache-Status":   "MISS",
          "X-Cache-Hash":     queryHash,
          "X-Cache-Type":     strategy.type,
          "X-Row-Count":      rows.length.toString(),
          "X-Query-Duration": totalDuration.toString(),
          "X-User":           cognitoUsername,
        },
      });

    } finally {
      // Always release the lock — even if the query threw
      await releaseMissLock(cacheKey);
    }

  } catch (err: any) {
    console.error(`❌ [ERROR] Duration: ${Date.now() - startTime}ms`, err);
    return NextResponse.json(
      { error: "Query execution failed", details: err.message },
      { status: 500 }
    );
  }
}