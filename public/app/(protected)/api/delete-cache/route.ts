import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import crypto from "crypto";

// Same hash generator
function generateQueryHash(sql: string, userId?: string): string {
  const normalizedSql = sql.trim().toLowerCase().replace(/\s+/g, " ");
  const today = new Date().toISOString().slice(0, 10);
  const queryString = userId
    ? `${userId}:${normalizedSql}:${today}`
    : `${normalizedSql}:${today}`;
  return crypto.createHash("sha256").update(queryString).digest("hex");
}

export async function DELETE(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // ignore if no JSON body
    }

    const { searchParams } = new URL(req.url);

    const sql = body.sql || searchParams.get("sql");
    const userId = body.userId || searchParams.get("userId");
    const hash = body.hash || searchParams.get("hash");

    // ✅ normalize "all" to boolean
    const all =
      body.all === true ||
      body.all === "true" ||
      searchParams.get("all")?.toLowerCase() === "true";

    const redis = await getRedis();

    // 🔥 Delete ALL cache
    if (all) {
      await redis.flushall();
      return NextResponse.json(
        { message: "All cache cleared successfully" },
        { status: 200 }
      );
    }

    let keyToDelete: string | null = null;

    if (hash) {
      keyToDelete = hash;
    } else if (sql) {
      keyToDelete = generateQueryHash(sql, userId || undefined);
    }

    if (!keyToDelete) {
      return NextResponse.json(
        { error: "Must provide either 'hash', 'sql', or set 'all': true" },
        { status: 400 }
      );
    }

    const deleted = await redis.del(keyToDelete);

    if (deleted === 0) {
      return NextResponse.json(
        { message: "Cache not found", key: keyToDelete },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Cache deleted successfully", key: keyToDelete },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ CACHE DELETE ERROR", err);
    return NextResponse.json(
      { error: "Failed to delete cache" },
      { status: 500 }
    );
  }
}


/*
=============================================
USAGE:

1️⃣ Delete by sql + userId
curl -X DELETE http://localhost:3000/api/delete-cache \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM users","userId":"123"}'

2️⃣ Delete by hash
curl -X DELETE http://localhost:3000/api/delete-cache \
  -H "Content-Type: application/json" \
  -d '{"hash":"abcdef1234567890"}'

3️⃣ Delete everything 🚀
curl -X DELETE http://localhost:3000/api/delete-cache \
  -H "Content-Type: application/json" \
  -d '{"all": true}'
=============================================
*/
