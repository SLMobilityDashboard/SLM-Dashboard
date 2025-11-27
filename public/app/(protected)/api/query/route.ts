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

// Generate cleanup tracking key
function getCleanupKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `cleanup:${today}`;
}

// Cleanup old cache entries (yesterday and older)
async function cleanupOldCache(): Promise<void> {
  const redis = await getRedis();
  const cleanupKey = getCleanupKey();
  
  // Always check memory pressure, but respect daily cleanup flag for routine maintenance
  const { needsCleanup: memoryPressure } = await checkMemoryPressure();
  
  if (!memoryPressure) {
    // Check if routine cleanup already done today
    const cleanupDone = await redis.get(cleanupKey);
    if (cleanupDone) {
      return; // Already cleaned up today and no memory pressure
    }
  }

  const reason = memoryPressure ? "memory pressure" : "daily maintenance";
  console.log(`🧹 Starting cache cleanup (${reason})...`);
  const startTime = Date.now();

  try {
    let deletedCount = 0;
    let cursor = 0;

    // Use SCAN for better performance and to avoid blocking
    do {
      const result = await redis.scan(cursor, { MATCH: '*', COUNT: 50 });
      cursor = result.cursor;
      
      for (const key of result.keys) {
        // Skip cleanup tracking keys
        if (key.startsWith("cleanup:")) continue;
        
        const ttl = await redis.ttl(key);
        
        // More aggressive cleanup under memory pressure
        const threshold = memoryPressure ? 43200 : 82800; // 12h vs 23h
        
        if (ttl !== -1 && ttl < threshold) {
          await redis.del(key);
          deletedCount++;
          
          // Log progress every 20 deletions during memory pressure
          if (memoryPressure && deletedCount % 20 === 0) {
            console.log(`🧹 Cleaned ${deletedCount} entries so far...`);
          }
        }
      }
    } while (cursor !== 0);

    // Mark cleanup as done for today (only for routine cleanup)
    if (!memoryPressure) {
      await redis.set(cleanupKey, "1", { EX: 86400 });
    }

    const duration = Date.now() - startTime;
    console.log(`🧹 Cleanup complete (${reason}): deleted ${deletedCount} entries in ${duration}ms`);
    
  } catch (error) {
    console.error("❌ Cache cleanup failed:", error);
  }
}

// Aggressive cleanup to make space for large datasets
async function aggressiveCleanup(targetMemory: number, isLargeDataset: boolean): Promise<void> {
  const redis = await getRedis();
  console.log(`🧹 Starting aggressive cleanup (target: ${(targetMemory / 1024 / 1024).toFixed(1)}MB)...`);
  const startTime = Date.now();

  try {
    let deletedCount = 0;
    let { usedMemory } = await checkMemoryPressure();

    // Fallback: Use KEYS * if SCAN fails (less efficient but works)
    let allKeys: string[];
    try {
      allKeys = await redis.keys('*');
    } catch (keysError) {
      console.error("❌ Redis KEYS command failed:", keysError);
      return;
    }

    console.log(`🔍 Found ${allKeys.length} keys to evaluate`);

    for (const key of allKeys) {
      if (key.startsWith("cleanup:")) continue;
      
      const ttl = await redis.ttl(key);
      
      // More aggressive thresholds for large datasets
      let threshold = isLargeDataset ? 21600 : 43200; // 6h vs 12h
      
      // If still over target, be even more aggressive
      if (usedMemory > targetMemory) {
        threshold = isLargeDataset ? 43200 : 64800; // 12h vs 18h
      }
      
      if (ttl !== -1 && ttl < threshold) {
        await redis.del(key);
        deletedCount++;
        
        // Check memory periodically during cleanup
        if (deletedCount % 20 === 0) {
          ({ usedMemory } = await checkMemoryPressure());
          console.log(`🧹 Progress: deleted ${deletedCount} keys, ${(usedMemory / 1024 / 1024).toFixed(1)}MB used`);
          if (usedMemory <= targetMemory) {
            console.log(`🎯 Reached target memory: ${(usedMemory / 1024 / 1024).toFixed(1)}MB`);
            break;
          }
        }
      }
    }

    // Phase 2: If still over target, delete older entries more aggressively
    if (usedMemory > targetMemory && isLargeDataset) {
      console.log(`🧹 Phase 2: More aggressive cleanup needed...`);
      
      for (const key of allKeys) {
        if (key.startsWith("cleanup:")) continue;
        
        const ttl = await redis.ttl(key);
        
        // Delete anything with less than 20 hours TTL
        if (ttl !== -1 && ttl < 72000) {
          try {
            await redis.del(key);
            deletedCount++;
            
            if (deletedCount % 10 === 0) {
              ({ usedMemory } = await checkMemoryPressure());
              if (usedMemory <= targetMemory) {
                console.log(`🎯 Phase 2 target reached: ${(usedMemory / 1024 / 1024).toFixed(1)}MB`);
                break;
              }
            }
          } catch (delError) {
            console.warn(`⚠️ Failed to delete key ${key}:`, delError);
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    const finalMemory = (await checkMemoryPressure()).usedMemory;
    console.log(`🧹 Aggressive cleanup complete: deleted ${deletedCount} entries, ${(finalMemory / 1024 / 1024).toFixed(1)}MB used in ${duration}ms`);
    
  } catch (error) {
    console.error("❌ Aggressive cleanup failed:", error);
  }
}

// Write cache with 5MB reserved
async function writeToCache(hash: string, data: any[], shortHash: string): Promise<void> {
  const redis = await getRedis();

  const dataSize = Buffer.byteLength(JSON.stringify(data), "utf-8");
  const maxMemory = 30 * 1024 * 1024; // 30MB plan
  const reserve = 2 * 1024 * 1024;    // Reduced to 2MB reserve for large datasets

  console.log(`📊 Dataset info for [${shortHash}]: ${data.length} rows = ${(dataSize / 1024 / 1024).toFixed(1)}MB`);

  // Check current memory pressure
  let { usedMemory } = await checkMemoryPressure();

  // For very large datasets, be more aggressive about cleanup
  const isLargeDataset = dataSize > 3 * 1024 * 1024; // >3MB
  const targetMemoryAfterCleanup = maxMemory * (isLargeDataset ? 0.3 : 0.7); // Target 30% or 70% usage

  if (usedMemory + dataSize > maxMemory - reserve) {
    console.log(`🧹 Need space for [${shortHash}]: ${(dataSize / 1024 / 1024).toFixed(1)}MB data, ${(usedMemory / 1024 / 1024).toFixed(1)}MB currently used`);
    
    // Aggressive cleanup for large datasets
    await aggressiveCleanup(targetMemoryAfterCleanup, isLargeDataset);
    
    // Recheck memory after cleanup
    ({ usedMemory } = await checkMemoryPressure());
    
    if (usedMemory + dataSize > maxMemory - reserve) {
      console.warn(`⚠️  Still not enough space for [${shortHash}] after cleanup: ${(usedMemory / 1024 / 1024).toFixed(1)}MB + ${(dataSize / 1024 / 1024).toFixed(1)}MB > ${((maxMemory - reserve) / 1024 / 1024).toFixed(1)}MB limit`);
      return;
    }
  }

  try {
    await redis.set(hash, JSON.stringify(data), { EX: 86400 }); // 24h TTL
    console.log(`💾 Cached [${shortHash}] - ${data.length} rows (${(dataSize / 1024 / 1024).toFixed(1)}MB)${isLargeDataset ? ' [LARGE]' : ''}`);
  } catch (error: any) {
    if (error.message?.includes('OOM') || error.message?.includes('maxmemory')) {
      console.error(`🚨 OOM during cache write for [${shortHash}] - attempting emergency cleanup`);
      await aggressiveCleanup(targetMemoryAfterCleanup, true);
      
      // One retry attempt after emergency cleanup
      try {
        await redis.set(hash, JSON.stringify(data), { EX: 86400 });
        console.log(`💾 Cached [${shortHash}] after emergency cleanup - ${data.length} rows (${(dataSize / 1024 / 1024).toFixed(1)}MB)`);
      } catch (retryError) {
        console.error(`❌ Final cache attempt failed for [${shortHash}]`);
      }
    } else {
      console.error(`❌ Cache write failed for [${shortHash}]:`, error.message);
      throw error;
    }
  }
}

async function readFromCache(hash: string): Promise<any[] | null> {
  const redis = await getRedis();
  const data = await redis.get(hash);
  return data ? JSON.parse(data) : null;
}

// Check if we're under memory pressure
async function checkMemoryPressure(): Promise<{ needsCleanup: boolean; usedMemory: number }> {
  const redis = await getRedis();
  const info = await redis.info("memory");
  const usedMemoryMatch = info.match(/used_memory:(\d+)/);
  const usedMemory = usedMemoryMatch ? parseInt(usedMemoryMatch[1]) : 0;
  
  const maxMemory = 30 * 1024 * 1024; // 30MB
  const criticalThreshold = 0.8; // 80% usage
  
  return {
    needsCleanup: usedMemory > (maxMemory * criticalThreshold),
    usedMemory
  };
}

// -------------------- API Handler --------------------
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { sql, userId } = await req.json();
    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "Missing or invalid SQL" }, { status: 400 });
    }

    // 🧹 CRITICAL: Check memory pressure and run cleanup FIRST
    const { needsCleanup, usedMemory } = await checkMemoryPressure();
    
    if (needsCleanup) {
      console.log(`⚠️  Memory pressure detected: ${(usedMemory / 1024 / 1024).toFixed(1)}MB - Running immediate cleanup`);
      await cleanupOldCache(); // Synchronous cleanup when under pressure
    } else {
      // Non-blocking cleanup for daily maintenance
      cleanupOldCache().catch(err => 
        console.error("Background cleanup failed:", err)
      );
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
    await writeToCache(queryHash, rows, shortHash);

    const totalDuration = Date.now() - startTime;
    console.log(`✅ QUERY COMPLETE FROM SNOWFLAKE [${shortHash}] - ${rows.length} rows - ${totalDuration}ms${rows.length > 50000 ? ' (LARGE DATASET)' : ''}`);

    return NextResponse.json(rows, {
      status: 200,
      headers: { 
        "X-Cache-Status": "MISS", 
        "X-Cache-Hash": queryHash,
        "X-Row-Count": rows.length.toString(),
        "X-Query-Duration": totalDuration.toString()
      },
    });
  } catch (err: any) {
    console.error(`❌ QUERY ERROR - Duration: ${Date.now() - startTime}ms`, err);
    return NextResponse.json([{ error: "snowflake connection failed" }], { status: 500 });
  }
}