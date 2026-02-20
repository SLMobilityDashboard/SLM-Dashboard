import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function DELETE(
  req: NextRequest,
  context: { params: { key: string } }
) {
  try {
    const redis = await getRedis();

    // Get the user input key pattern
    const { key } = context.params;
    const decodedKey = decodeURIComponent(key);

    // Redis only supports glob-style patterns, not full regex
    // Convert regex-like input to Redis glob pattern if needed
    // Example: "69f9fd33.*" will match all keys starting with 69f9fd33
    const pattern = `*${decodedKey}*`;

    // Get all matching keys
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No keys found matching pattern: ${decodedKey}`,
        keysDeleted: 0,
      });
    }

    // Delete all matching keys
    const deleted = await redis.del(...keys);

    return NextResponse.json({
      success: true,
      message: `Cleared ${deleted} keys matching pattern: ${decodedKey}`,
      keysDeleted: deleted,
    });
  } catch (err: any) {
    console.error("❌ DELETE /api/redis-clear/[key] failed:", err);

    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete keys" },
      { status: 500 }
    );
  }
}
