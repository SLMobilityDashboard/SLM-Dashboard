import { NextRequest, NextResponse } from "next/server";
import SnowflakeConnectionManager from "@/lib/snowflake-test";
import crypto from "crypto";
import { getRedis } from "@/lib/redis";

// -------------------- Types --------------------
interface QueryLogEntry {
  queryHash: string;
  shortHash: string;
  sql: string;
  userId?: string;
  cacheStatus: "HIT" | "MISS" | "REVALIDATED";
  rowCount: number;
  duration: number;
  timestamp: Date;
  dataSize?: number;
}

interface QueryStats {
  queryHash: string;
  shortHash: string;
  sql: string;
  totalHits: number;
  totalMisses: number;
  totalExecutions: number;
  avgDuration: number;
  avgRowCount: number;
  lastExecuted: string | null;
  lastCacheHit: string | null;
  firstSeen: string;
  cacheHitRate: number;
  preWarmScore: number;
  dailyHitHistory: { [date: string]: number };
  consecutiveDaysNoHits: number;
  isPersistent: boolean;
}

interface CacheMetadata {
  lastVerified: string;
  dataHash: string;
  verificationCount: number;
  lastDataChange: string | null;
  dataChangeCount: number;
}

// -------------------- Query Normalization --------------------
const DYNAMIC_DATE_FUNCTIONS = [
  'current_date', 'current_timestamp', 'current_time',
  'localtime', 'localtimestamp', 'now(', 'curdate(',
  'curtime(', 'sysdate(', 'utc_date', 'utc_time',
  'utc_timestamp', 'getdate(', 'getutcdate(',
  'sysdatetime(', 'sysutcdatetime(',
];

function hasDynamicDates(sql: string): boolean {
  const lower = sql.toLowerCase();
  return DYNAMIC_DATE_FUNCTIONS.some(func => lower.includes(func));
}

function normalizeSQL(sql: string): string {
  let normalized = sql.trim().toLowerCase().replace(/\s+/g, " ");
  normalized = normalized.replace(/--[^\n]*/g, ''); // Remove comments
  normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
  normalized = normalized.replace(/current_date\s*\(\s*\)/gi, 'current_date()');
  normalized = normalized.replace(/current_timestamp\s*\(\s*\)/gi, 'current_timestamp()');
  normalized = normalized.replace(/now\s*\(\s*\)/gi, 'now()');
  normalized = normalized.replace(/interval\s+['"]?\d+['"]?/gi, 'interval __N__');
  return normalized.trim();
}

function generateQueryHash(sql: string, userId?: string): string {
  const normalizedSql = normalizeSQL(sql);
  const queryString = userId ? `${userId}:${normalizedSql}` : normalizedSql;
  return crypto.createHash("sha256").update(queryString).digest("hex");
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
  type: 'static' | 'daily' | 'hourly';
  ttl: number | null;
} {
  if (forceDynamic) {
    return { type: 'daily', ttl: 86400 };
  }
  
  const lower = sql.toLowerCase();
  const hasTimeFunc = ['current_timestamp', 'current_time', 'now(', 'getdate(', 'sysdatetime(']
    .some(func => lower.includes(func));
  
  if (hasTimeFunc) {
    return { type: 'hourly', ttl: 3600 };
  }
  
  if (hasDynamicDates(sql)) {
    return { type: 'daily', ttl: 86400 };
  }
  
  return { type: 'static', ttl: null };
}

// -------------------- Revalidation Logic --------------------
async function acquireRevalidationLock(cacheKey: string): Promise<boolean> {
  const redis = await getRedis();
  const lockKey = `lock:revalidate:${cacheKey}`;
  const lockValue = Date.now().toString();
  
  // Try to acquire lock with 5 minute expiration
  const acquired = await redis.set(lockKey, lockValue, { NX: true, EX: 300 });
  return acquired === 'OK';
}

async function releaseRevalidationLock(cacheKey: string): Promise<void> {
  const redis = await getRedis();
  const lockKey = `lock:revalidate:${cacheKey}`;
  await redis.del(lockKey);
}

async function needsRevalidation(
  cacheKey: string, 
  isPersistent: boolean
): Promise<boolean> {
  if (!isPersistent) return false;
  
  const redis = await getRedis();
  const metaKey = `${cacheKey}:meta`;
  const metaData = await redis.get(metaKey);
  
  if (!metaData) return true;
  
  const meta: CacheMetadata = JSON.parse(metaData);
  const lastVerified = new Date(meta.lastVerified);
  const daysSinceVerification = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceVerification >= 7;
}

async function performRevalidation(
  cacheKey: string,
  shortHash: string,
  sql: string,
  connection: any
): Promise<{ dataChanged: boolean; newData?: any[]; error?: string }> {
  console.log(`[REVALIDATE] [${shortHash}] Checking for data changes...`);
  
  const redis = await getRedis();
  const metaKey = `${cacheKey}:meta`;
  
  try {
    // Execute query to get fresh data
    const freshData = await new Promise<any[]>((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        complete: (err: any, _stmt: any, rows: any) => {
          if (err) return reject(err);
          resolve(rows || []);
        },
      });
    });
    
    const freshDataHash = generateDataHash(freshData);
    const existingMetaData = await redis.get(metaKey);
    const existingMeta: CacheMetadata | null = existingMetaData 
      ? JSON.parse(existingMetaData) 
      : null;
    
    const dataChanged = !existingMeta || existingMeta.dataHash !== freshDataHash;
    
    // Update metadata with TTL matching cache
    const cachedData = await redis.get(cacheKey);
    const cacheTTL = cachedData ? await redis.ttl(cacheKey) : null;
    
    const newMeta: CacheMetadata = {
      lastVerified: new Date().toISOString(),
      dataHash: freshDataHash,
      verificationCount: (existingMeta?.verificationCount || 0) + 1,
      lastDataChange: dataChanged ? new Date().toISOString() : existingMeta?.lastDataChange || null,
      dataChangeCount: (existingMeta?.dataChangeCount || 0) + (dataChanged ? 1 : 0),
    };
    
    if (cacheTTL && cacheTTL > 0) {
      await redis.set(metaKey, JSON.stringify(newMeta), { EX: cacheTTL });
    } else {
      await redis.set(metaKey, JSON.stringify(newMeta));
    }
    
    if (dataChanged) {
      console.log(`[REVALIDATE] [${shortHash}] Data changed (change #${newMeta.dataChangeCount})`);
      return { dataChanged: true, newData: freshData };
    } else {
      console.log(`[REVALIDATE] [${shortHash}] Data unchanged (check #${newMeta.verificationCount})`);
      return { dataChanged: false };
    }
  } catch (error: any) {
    console.error(`[REVALIDATE] [${shortHash}] Failed:`, error.message);
    return { dataChanged: false, error: error.message };
  }
}

// -------------------- Analytics Logger --------------------
async function logQueryAnalytics(entry: QueryLogEntry): Promise<void> {
  const redis = await getRedis();
  
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    // Log entry with 7 day expiration
    const logKey = `query:log:${entry.shortHash}:${Date.now()}`;
    await redis.set(logKey, JSON.stringify(entry), { EX: 604800 });

    const statsKey = `query:stats:${entry.queryHash}`;
    const existingStats = await redis.get(statsKey);
    
    let stats: QueryStats = existingStats ? JSON.parse(existingStats) : {
      queryHash: entry.queryHash,
      shortHash: entry.shortHash,
      sql: entry.sql,
      totalHits: 0,
      totalMisses: 0,
      totalExecutions: 0,
      avgDuration: 0,
      avgRowCount: 0,
      lastExecuted: null,
      lastCacheHit: null,
      firstSeen: new Date().toISOString(),
      cacheHitRate: 0,
      preWarmScore: 0,
      dailyHitHistory: {},
      consecutiveDaysNoHits: 0,
      isPersistent: false,
    };
    
    // Update execution counts
    stats.totalExecutions++;
    if (entry.cacheStatus === "HIT" || entry.cacheStatus === "REVALIDATED") {
      stats.totalHits++;
      stats.lastCacheHit = entry.timestamp.toISOString();
      
      if (!stats.dailyHitHistory[today]) {
        stats.dailyHitHistory[today] = 0;
      }
      stats.dailyHitHistory[today]++;
    } else {
      stats.totalMisses++;
    }
    
    // Update averages
    stats.avgDuration = ((stats.avgDuration * (stats.totalExecutions - 1)) + entry.duration) / stats.totalExecutions;
    stats.avgRowCount = ((stats.avgRowCount * (stats.totalExecutions - 1)) + entry.rowCount) / stats.totalExecutions;
    stats.lastExecuted = entry.timestamp.toISOString();
    stats.cacheHitRate = (stats.totalHits / stats.totalExecutions) * 100;
    
    // Clean history to last 14 days only
    cleanOldHistory(stats, 14);
    
    // Calculate consecutive days without hits
    stats.consecutiveDaysNoHits = calculateConsecutiveDaysNoHits(stats, today);
    
    // Calculate score and persistence
    stats = applyDecayAndCalculateScore(stats);
    stats.isPersistent = shouldBePersistent(stats);
    
    await redis.set(statsKey, JSON.stringify(stats));
    
    // Update sorted set for candidates
    await redis.zAdd('query:prewarm:candidates', {
      score: stats.preWarmScore,
      value: entry.queryHash
    });
    
    const statusLabel = entry.cacheStatus === 'REVALIDATED' ? 'REVALIDATED' : entry.cacheStatus;
    console.log(`[${entry.shortHash}] ${statusLabel} | Score: ${stats.preWarmScore.toFixed(2)} | Persistent: ${stats.isPersistent} | No-hit: ${stats.consecutiveDaysNoHits}d`);
    
  } catch (error) {
    console.error("Failed to log analytics:", error);
  }
}

function cleanOldHistory(stats: QueryStats, keepDays: number): void {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - keepDays);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);
  
  Object.keys(stats.dailyHitHistory).forEach(date => {
    if (date < cutoffStr) {
      delete stats.dailyHitHistory[date];
    }
  });
}

function calculateConsecutiveDaysNoHits(stats: QueryStats, today: string): number {
  if (!stats.lastCacheHit) {
    return stats.totalExecutions > 0 ? 1 : 0;
  }
  
  const lastHitDate = new Date(stats.lastCacheHit).toISOString().slice(0, 10);
  
  // Reset counter if there was activity today
  if (lastHitDate === today) {
    return 0;
  }
  
  // Calculate days since last hit
  const daysSinceLastHit = Math.floor(
    (new Date(today).getTime() - new Date(lastHitDate).getTime()) / 86400000
  );
  
  return Math.max(0, daysSinceLastHit);
}

function shouldBePersistent(stats: QueryStats): boolean {
  // Don't persist if no activity for a week
  if (stats.consecutiveDaysNoHits >= 7) {
    return false;
  }
  
  const last7Days = getLast7Days();
  const dailyHitHistory = stats.dailyHitHistory || {};
  const activeDays = last7Days.filter(date => (dailyHitHistory[date] || 0) > 0);
  
  if (activeDays.length < 3) {
    return false;
  }
  
  const totalHitsLast7Days = activeDays.reduce((sum, date) => sum + (dailyHitHistory[date] || 0), 0);
  const avgHitsPerActiveDay = totalHitsLast7Days / activeDays.length;
  
  // Need consistent usage pattern
  return avgHitsPerActiveDay >= 2;
}

function getLast7Days(): string[] {
  const days: string[] = [];
  const now = Date.now();
  for (let i = 0; i < 7; i++) {
    const date = new Date(now - (i * 86400000));
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

function applyDecayAndCalculateScore(stats: QueryStats): QueryStats {
  const { totalExecutions, avgDuration, avgRowCount, totalHits, consecutiveDaysNoHits } = stats;
  
  const last7Days = getLast7Days();
  const dailyHitHistory = stats.dailyHitHistory || {};
  const recentHits = last7Days.reduce((sum, date) => sum + (dailyHitHistory[date] || 0), 0);
  const activeDaysLast7 = last7Days.filter(date => (dailyHitHistory[date] || 0) > 0).length;
  
  // Scoring components (sum to 1.0)
  const frequencyScore = Math.min(totalExecutions / 100, 1) * 0.2;
  const durationScore = Math.min(avgDuration / 5000, 1) * 0.15;
  const dataSizeScore = Math.min(avgRowCount / 100000, 1) * 0.1;
  const hitScore = Math.min(totalHits / 50, 1) * 0.2;
  const recentActivityScore = Math.min(recentHits / 20, 1) * 0.25;
  const consistencyScore = (activeDaysLast7 / 7) * 0.1;
  
  // Apply decay for inactivity
  let decayMultiplier = 1.0;
  if (consecutiveDaysNoHits > 0) {
    decayMultiplier = Math.pow(0.75, consecutiveDaysNoHits);
  }
  
  const baseScore = (
    frequencyScore + 
    durationScore + 
    dataSizeScore + 
    hitScore + 
    recentActivityScore +
    consistencyScore
  ) * 100;
  
  // Cap at 100
  stats.preWarmScore = Math.min(100, Math.max(0, baseScore * decayMultiplier));
  
  return stats;
}

// -------------------- Cache Helpers --------------------
async function readFromCache(cacheKey: string): Promise<any[] | null> {
  const redis = await getRedis();
  const data = await redis.get(cacheKey);
  return data ? JSON.parse(data) : null;
}

async function writeToCache(
  cacheKey: string, 
  data: any[], 
  shortHash: string, 
  options: { strategy: { type: string; ttl: number | null }; stats?: QueryStats; isRevalidation?: boolean }
): Promise<void> {
  const redis = await getRedis();
  const dataSize = Buffer.byteLength(JSON.stringify(data), "utf-8");

  try {
    const { strategy, stats, isRevalidation = false } = options;
    
    if (strategy.type === 'static' && stats?.isPersistent) {
      await redis.set(cacheKey, JSON.stringify(data));
      
      // Initialize/update metadata
      if (!isRevalidation) {
        const metaKey = `${cacheKey}:meta`;
        const meta: CacheMetadata = {
          lastVerified: new Date().toISOString(),
          dataHash: generateDataHash(data),
          verificationCount: 0,
          lastDataChange: new Date().toISOString(),
          dataChangeCount: 0,
        };
        await redis.set(metaKey, JSON.stringify(meta));
      }
      
      const action = isRevalidation ? "Refreshed" : "Cached";
      console.log(`${action} [${shortHash}] PERSISTENT - ${data.length} rows (${(dataSize / 1024 / 1024).toFixed(1)}MB)`);
    } else if (strategy.ttl) {
      await redis.set(cacheKey, JSON.stringify(data), { EX: strategy.ttl });
      
      // Add metadata with matching TTL
      const metaKey = `${cacheKey}:meta`;
      const meta: CacheMetadata = {
        lastVerified: new Date().toISOString(),
        dataHash: generateDataHash(data),
        verificationCount: 0,
        lastDataChange: new Date().toISOString(),
        dataChangeCount: 0,
      };
      await redis.set(metaKey, JSON.stringify(meta), { EX: strategy.ttl });
      
      const hours = Math.floor(strategy.ttl / 3600);
      console.log(`Cached [${shortHash}] for ${hours}h (${strategy.type}) - ${data.length} rows (${(dataSize / 1024 / 1024).toFixed(1)}MB)`);
    } else {
      await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 });
      console.log(`Cached [${shortHash}] for 24h - ${data.length} rows (${(dataSize / 1024 / 1024).toFixed(1)}MB)`);
    }
  } catch (error: any) {
    console.error(`Cache write failed for [${shortHash}]:`, error.message);
  }
}

// -------------------- API Handler --------------------
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { sql, userId, forceDynamic } = await req.json();
    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "Missing or invalid SQL" }, { status: 400 });
    }

    const queryHash = generateQueryHash(sql, userId);
    const cacheKey = generateCacheKey(queryHash, sql, forceDynamic);
    const shortHash = queryHash.substring(0, 8);
    const strategy = getCacheStrategy(sql, forceDynamic);

    const redis = await getRedis();
    const statsKey = `query:stats:${queryHash}`;
    const statsData = await redis.get(statsKey);
    const stats = statsData ? JSON.parse(statsData) as QueryStats : undefined;
    const isPersistent = stats?.isPersistent || false;

    const cachedData = await readFromCache(cacheKey);
    
    if (cachedData) {
      // Check if revalidation needed for persistent queries
      const shouldRevalidate = await needsRevalidation(cacheKey, isPersistent);
      
      if (shouldRevalidate) {
        const lockAcquired = await acquireRevalidationLock(cacheKey);
        
        if (lockAcquired) {
          const duration = Date.now() - startTime;
          console.log(`🟡   [CACHE HIT] [${shortHash}] [PERSISTENT] - Revalidating in background - ${cachedData.length} rows - ${duration}ms`);
          
          // Return cached data immediately, revalidate in background
          (async () => {
            try {
              await SnowflakeConnectionManager.connect();
              const connection = SnowflakeConnectionManager.getConnection();
              
              const revalidationResult = await performRevalidation(
                cacheKey,
                shortHash,
                sql,
                connection
              );
              
              if (revalidationResult.dataChanged && revalidationResult.newData) {
                await writeToCache(cacheKey, revalidationResult.newData, shortHash, { 
                  strategy, 
                  stats, 
                  isRevalidation: true 
                });
              }
            } catch (error) {
              console.error(`Background revalidation failed for [${shortHash}]:`, error);
            } finally {
              await releaseRevalidationLock(cacheKey);
            }
          })();
          
          await logQueryAnalytics({
            queryHash,
            shortHash,
            sql,
            userId,
            cacheStatus: "REVALIDATED",
            rowCount: cachedData.length,
            duration,
            timestamp: new Date(),
            dataSize: Buffer.byteLength(JSON.stringify(cachedData), "utf-8")
          });
          
          return NextResponse.json(cachedData, {
            status: 200,
            headers: { 
              "X-Cache-Status": "HIT-REVALIDATING",
              "X-Cache-Hash": queryHash,
              "X-Cache-Type": strategy.type,
              "X-Persistent": "true",
              "X-Revalidation": "background"
            },
          });
        }
      }
      
      // Standard cache hit
      const duration = Date.now() - startTime;
      const persistentLabel = isPersistent ? " [PERSISTENT]" : "";
      console.log(`🟢 [CACHE HIT] [${shortHash}] (${strategy.type})${persistentLabel} - ${cachedData.length} rows - ${duration}ms`);
      console.log(`Query: ${sql}`);
      await logQueryAnalytics({
        queryHash,
        shortHash,
        sql,
        userId,
        cacheStatus: "HIT",
        rowCount: cachedData.length,
        duration,
        timestamp: new Date(),
        dataSize: Buffer.byteLength(JSON.stringify(cachedData), "utf-8")
      });
      
      return NextResponse.json(cachedData, {
        status: 200,
        headers: { 
          "X-Cache-Status": "HIT", 
          "X-Cache-Hash": queryHash,
          "X-Cache-Type": strategy.type,
          "X-Persistent": isPersistent ? "true" : "false"
        },
      });
    }

    // Cache miss - execute query
    console.log(`🔴 [CACHE MISS] [${shortHash}] (${strategy.type}) - Executing Snowflake`);
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

    // Cache empty results with shorter TTL (1 hour)
    if (!rows || rows.length === 0) {
      const emptyResult: any[] = [];
      await redis.set(cacheKey, JSON.stringify(emptyResult), { EX: 3600 });
      console.log(`[EMPTY RESULT] [${shortHash}] - Cached for 1h`);
      
      const duration = Date.now() - startTime;
      await logQueryAnalytics({
        queryHash,
        shortHash,
        sql,
        userId,
        cacheStatus: "MISS",
        rowCount: 0,
        duration,
        timestamp: new Date(),
        dataSize: 0
      });
      
      return NextResponse.json(emptyResult, {
        status: 200,
        headers: { 
          "X-Cache-Status": "MISS",
          "X-Cache-Hash": queryHash,
          "X-Cache-Type": "hourly",
          "X-Row-Count": "0"
        },
      });
    }

    await writeToCache(cacheKey, rows, shortHash, { strategy, stats });

    const totalDuration = Date.now() - startTime;
    console.log(`✅ [QUERY COMPLETE] [${shortHash}] - ${rows.length} rows - ${totalDuration}ms`);

    const dataSize = Buffer.byteLength(JSON.stringify(rows), "utf-8");
    await logQueryAnalytics({
      queryHash,
      shortHash,
      sql,
      userId,
      cacheStatus: "MISS",
      rowCount: rows.length,
      duration: totalDuration,
      timestamp: new Date(),
      dataSize
    });

    return NextResponse.json(rows, {
      status: 200,
      headers: { 
        "X-Cache-Status": "MISS", 
        "X-Cache-Hash": queryHash,
        "X-Cache-Type": strategy.type,
        "X-Row-Count": rows.length.toString(),
        "X-Query-Duration": totalDuration.toString()
      },
    });
  } catch (err: any) {
    console.error(`❌ [ERROR] Duration: ${Date.now() - startTime}ms`, err);
    return NextResponse.json(
      { error: "Query execution failed", details: err.message }, 
      { status: 500 }
    );
  }
}