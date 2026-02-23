// api/snowflake/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import SnowflakeNotificationManager from "@/lib/snowflake_notification";
import crypto from "crypto";
import { getRedis } from "@/lib/redis";

function extractTableNames(sql: string): string[] {
  const normalizedSql = sql.trim().toLowerCase();
  const tableNames: string[] = [];
  const patterns = [/(?:from|join|update|into|delete\s+from)\s+([a-z0-9_\.]+)/gi];

  patterns.forEach(pattern => {
    const matches = normalizedSql.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) tableNames.push(match[1].toLowerCase());
    }
  });

  return [...new Set(tableNames)];
}

async function generateQueryHash(sql: string, userId?: string): Promise<string> {
  const normalizedSql = sql.trim().toLowerCase().replace(/\s+/g, " ");
  const tableNames = extractTableNames(sql);
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

async function writeToCache(hash: string, data: any[]): Promise<void> {
  const redis = await getRedis();
  const info = await redis.info("memory");
  const usedMemoryMatch = info.match(/used_memory:(\d+)/);
  const usedMemory = usedMemoryMatch ? parseInt(usedMemoryMatch[1]) : 0;
  const dataSize = Buffer.byteLength(JSON.stringify(data), "utf-8");
  const maxMemory = 30 * 1024 * 1024;
  const reserve = 5 * 1024 * 1024;

  if (usedMemory + dataSize > maxMemory - reserve) {
    console.warn(`⚠️ Skipping cache for ${hash}: not enough memory`);
    return;
  }

  await redis.set(hash, JSON.stringify(data), { EX: 3600 });
  console.log(`💾 Cached [${hash.substring(0, 8)}] - ${data.length} rows`);
}

async function readFromCache(hash: string): Promise<any[] | null> {
  const redis = await getRedis();
  const data = await redis.get(hash);
  return data ? JSON.parse(data) : null;
}

function shouldBypassCache(sql: string): boolean {
  const normalizedSql = sql.trim().toLowerCase();
  const writeOps = ['update', 'insert', 'delete', 'merge', 'truncate', 'create', 'alter', 'drop'];
  return writeOps.some(op => normalizedSql.startsWith(op));
}

function isWriteOperation(sql: string): boolean {
  return shouldBypassCache(sql);
}

async function invalidateTableCache(tableNames: string[]): Promise<void> {
  if (tableNames.length === 0) return;
  const redis = await getRedis();

  try {
    for (const table of tableNames) {
      const versionKey = `table_version:${table}`;
      const current = await redis.get(versionKey);
      const newVersion = current ? parseInt(current) + 1 : 1;
      await redis.set(versionKey, newVersion.toString());
      console.log(`🔄 Table version ${table}: ${current || 0} → ${newVersion}`);
    }
    console.log(`✅ Cache invalidated for: ${tableNames.join(', ')}`);
  } catch (error) {
    console.error('❌ Failed to invalidate cache:', error);
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ✅ Auth guard
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Extract Cognito token — no hardcoded mapping
  const cognitoAccessToken = token.cognitoAccessToken as string | undefined;
  const authMethod = cognitoAccessToken ? 'OAUTH' : 'JWT';

  try {
    const { sql, noCache } = await req.json();

    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "Missing or invalid SQL" }, { status: 400 });
    }

    console.log(`📝 Notification query — user: ${token.sub || 'anonymous'} [${authMethod}]`);

    const bypassCache = noCache === true || shouldBypassCache(sql);
    const isWrite = isWriteOperation(sql);

    if (isWrite) {
      const tableNames = extractTableNames(sql);
      await invalidateTableCache(tableNames);
    }

    const queryHash = await generateQueryHash(sql, token.sub);
    const shortHash = queryHash.substring(0, 8);

    // 1️⃣ Check cache
    if (!bypassCache) {
      const cachedData = await readFromCache(queryHash);
      if (cachedData) {
        const duration = Date.now() - startTime;
        console.log(`🟢 CACHE HIT [${shortHash}] - ${cachedData.length} rows - ${duration}ms`);
        return NextResponse.json(cachedData, {
          status: 200,
          headers: { "X-Cache-Status": "HIT", "X-Cache-Hash": queryHash },
        });
      }
    } else {
      console.log(`⚠️ CACHE BYPASSED [${shortHash}]`);
    }

    // 2️⃣ Execute — pass OAuth token directly, no username mapping
    console.log(`🔴 CACHE MISS [${shortHash}] - Executing Snowflake [${authMethod}]`);
    const result = await SnowflakeNotificationManager.executeQuery(
      sql,
      undefined,           // ✅ no hardcoded username
      true,
      cognitoAccessToken   // ✅ token passed directly
    );

    let rows = result.rows;

    if (isWrite) {
      const affectedRows =
        rows?.[0]?.['number of rows updated'] ||
        rows?.[0]?.['number of rows deleted'] ||
        rows?.[0]?.['number of rows inserted'] ||
        'N/A';

      rows = [{ success: true, rowsAffected: affectedRows, message: 'Operation completed successfully' }];
    }

    // 3️⃣ Cache result
    if (!bypassCache && !isWrite && rows.length > 0) {
      await writeToCache(queryHash, rows);
    }

    const totalDuration = Date.now() - startTime;

    if (isWrite) {
      console.log(`✅ WRITE COMPLETE [${shortHash}] [${authMethod}] - ${rows[0]?.rowsAffected || 0} rows affected - ${totalDuration}ms`);
    } else {
      console.log(`✅ QUERY COMPLETE [${shortHash}] [${authMethod}] - ${rows.length} rows - ${totalDuration}ms`);
    }

    return NextResponse.json(rows, {
      status: 200,
      headers: {
        "X-Cache-Status": bypassCache ? "BYPASS" : "MISS",
        "X-Cache-Hash": queryHash,
        "X-Query-Duration": `${totalDuration}ms`,
        "X-Is-Write": isWrite ? "true" : "false",
        "X-Auth-Method": authMethod,
      },
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ QUERY ERROR - Duration: ${duration}ms`, err);

    return NextResponse.json(
      {
        error: "Query execution failed",
        message: err.message || "Unknown error",
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}