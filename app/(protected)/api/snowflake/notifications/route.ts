// app/(protected)/api/snowflake/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import SnowflakeNotificationManager from "@/lib/snowflake_notification"; // ✅ Correct import
import crypto from "crypto";
import { getRedis } from "@/lib/redis";

// -------------------- Cache Helpers --------------------
// Helper to extract table names from SQL
function extractTableNames(sql: string): string[] {
  const normalizedSql = sql.trim().toLowerCase();
  const tableNames: string[] = [];
  
  // Match patterns like "FROM table" or "UPDATE table" or "INTO table"
  const patterns = [
    /(?:from|join|update|into|delete\s+from)\s+([a-z0-9_\.]+)/gi,
  ];
  
  patterns.forEach(pattern => {
    const matches = normalizedSql.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        tableNames.push(match[1].toLowerCase());
      }
    }
  });
  
  return [...new Set(tableNames)]; // Remove duplicates
}

// Generate cache key with table versioning for freshness
async function generateQueryHash(sql: string, userId?: string): Promise<string> {
  const normalizedSql = sql.trim().toLowerCase().replace(/\s+/g, " ");
  const tableNames = extractTableNames(sql);
  
  // Get version for each table involved
  const redis = await getRedis();
  const tableVersions = await Promise.all(
    tableNames.map(async (table) => {
      const version = await redis.get(`table_version:${table}`) || '0';
      return `${table}:${version}`;
    })
  );
  
  const queryString = userId 
    ? `${userId}:${normalizedSql}:${tableVersions.join('|')}` 
    : `${normalizedSql}:${tableVersions.join('|')}`;
  
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
    console.warn(`⚠️ Skipping cache for ${hash}: not enough memory`);
    return;
  }

  await redis.set(hash, JSON.stringify(data), { EX: 3600 }); // 1 hour TTL
  console.log(`💾 Cached result [${hash.substring(0, 8)}] - ${data.length} rows`);
}

async function readFromCache(hash: string): Promise<any[] | null> {
  const redis = await getRedis();
  const data = await redis.get(hash);
  return data ? JSON.parse(data) : null;
}

// Helper to check if query should bypass cache
function shouldBypassCache(sql: string): boolean {
  const normalizedSql = sql.trim().toLowerCase();
  
  // Bypass cache for write operations
  const writeOperations = ['update', 'insert', 'delete', 'merge', 'truncate', 'create', 'alter', 'drop'];
  for (const op of writeOperations) {
    if (normalizedSql.startsWith(op)) {
      return true;
    }
  }
  
  return false;
}

// Helper to check if query is a write operation
function isWriteOperation(sql: string): boolean {
  return shouldBypassCache(sql);
}

// Increment table version to invalidate all caches for that table
async function invalidateTableCache(tableNames: string[]): Promise<void> {
  if (tableNames.length === 0) return;
  
  const redis = await getRedis();
  
  try {
    // Increment version for each table
    for (const table of tableNames) {
      const versionKey = `table_version:${table}`;
      const currentVersion = await redis.get(versionKey);
      const newVersion = currentVersion ? parseInt(currentVersion) + 1 : 1;
      await redis.set(versionKey, newVersion.toString());
      console.log(`🔄 Incremented version for table ${table}: ${currentVersion || 0} → ${newVersion}`);
    }
    
    console.log(`✅ Invalidated cache for tables: ${tableNames.join(', ')}`);
  } catch (error) {
    console.error('❌ Failed to invalidate cache:', error);
    // Don't throw - cache invalidation failure shouldn't break the query
  }
}

// -------------------- API Handler --------------------
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { sql, userId, noCache } = await req.json();
    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "Missing or invalid SQL" }, { status: 400 });
    }

    console.log(`📝 Request received - User: ${userId || 'anonymous'}`);

    // Determine if we should use cache
    const bypassCache = noCache === true || shouldBypassCache(sql);
    const isWrite = isWriteOperation(sql);

    // If this is a write operation, invalidate related cache entries FIRST
    if (isWrite) {
      const tableNames = extractTableNames(sql);
      await invalidateTableCache(tableNames);
    }

    // Generate query hash (will include new table versions if write occurred)
    const queryHash = await generateQueryHash(sql, userId);
    const shortHash = queryHash.substring(0, 8);

    // 1️⃣ Check Redis cache (unless bypassed)
    if (!bypassCache) {
      const cachedData = await readFromCache(queryHash);
      if (cachedData) {
        const duration = Date.now() - startTime;
        console.log(`🟢 CACHE HIT [${shortHash}] - User: ${userId || 'anonymous'} - ${cachedData.length} rows - ${duration}ms`);
        return NextResponse.json(cachedData, {
          status: 200,
          headers: { "X-Cache-Status": "HIT", "X-Cache-Hash": queryHash },
        });
      }
    } else {
      console.log(`⚠️ CACHE BYPASSED [${shortHash}] - ${noCache ? 'Explicit noCache flag' : 'Write operation detected'}`);
    }

    // 2️⃣ Cache miss or bypassed → query Snowflake with userId using SnowflakeNotificationManager
    console.log(`🔴 CACHE MISS [${shortHash}] - Executing Snowflake query for user: ${userId || 'anonymous'}...`);
    
    // Pass userId to both connect and getConnection
    await SnowflakeNotificationManager.connect(userId);
    const connection = await SnowflakeNotificationManager.getConnection(userId);

    const rows = await new Promise<any[]>((resolve, reject) => {
      // Add audit comment with userId
      const auditComment = userId ? `-- Executed by: ${userId}\n` : '';
      const finalSql = `${auditComment}${sql}`;

      connection.execute({
        sqlText: finalSql,
        complete: (err, stmt, rows) => {
          if (err) return reject(err);
          
          // For write operations, Snowflake returns statement info, not rows
          // Check if this is a write operation and return success indicator
          if (isWrite) {
            // For write operations, the number of affected rows might be in the first row
            const affectedRows = rows && rows.length > 0 && rows[0]?.['number of rows updated'] 
              ? rows[0]['number of rows updated']
              : rows && rows.length > 0 && rows[0]?.['number of rows deleted']
              ? rows[0]['number of rows deleted']
              : rows && rows.length > 0 && rows[0]?.['number of rows inserted']
              ? rows[0]['number of rows inserted']
              : 'N/A';
            
            resolve([{ 
              success: true, 
              rowsAffected: affectedRows,
              message: 'Operation completed successfully'
            }]);
          } else {
            // For SELECT queries, return the rows (or empty array if none)
            resolve(rows || []);
          }
        },
      });
    });

    // 3️⃣ Cache the result (only if not bypassed and it's a SELECT query)
    if (!bypassCache && !isWrite && rows.length > 0) {
      await writeToCache(queryHash, rows);
    }

    const totalDuration = Date.now() - startTime;
    
    if (isWrite) {
      console.log(`✅ WRITE COMPLETE [${shortHash}] - User: ${userId || 'anonymous'} - ${rows[0]?.rowsAffected || 0} rows affected - ${totalDuration}ms`);
    } else {
      console.log(`✅ QUERY COMPLETE [${shortHash}] - User: ${userId || 'anonymous'} - ${rows.length} rows - ${totalDuration}ms`);
    }

    return NextResponse.json(rows, {
      status: 200,
      headers: { 
        "X-Cache-Status": bypassCache ? "BYPASS" : "MISS", 
        "X-Cache-Hash": queryHash,
        "X-Query-Duration": `${totalDuration}ms`,
        "X-Is-Write": isWrite ? "true" : "false",
        "X-User": userId || 'anonymous'
      },
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ QUERY ERROR - Duration: ${duration}ms`, err);
    
    // Return more detailed error information
    return NextResponse.json(
      { 
        error: "Query execution failed",
        message: err.message || "Unknown error",
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }, 
      { status: 500 }
    );
  }
}