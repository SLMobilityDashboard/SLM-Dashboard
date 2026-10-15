// app/api/redis-clear/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

interface ClearResponse {
  success: boolean;
  message: string;
  keysDeleted?: number;
  error?: string;
}

// Clear entire cache
export async function DELETE(req: NextRequest) {
  try {
    const redis = await getRedis();

    // Get total keys before deletion
    const totalKeysBefore = await redis.dbSize();

    // Flush all keys from the current database
    await redis.flushDb();

    const response: ClearResponse = {
      success: true,
      message: 'All cache cleared successfully',
      keysDeleted: totalKeysBefore,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to clear cache',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Clear cache by pattern (using POST with body)
export async function POST(req: NextRequest) {
  try {
    const redis = await getRedis();
    const body = await req.json();
    const { pattern, clearAll } = body;

    // If clearAll flag is true, clear everything
    if (clearAll === true) {
      const totalKeysBefore = await redis.dbSize();
      await redis.flushDb();
      
      return NextResponse.json({
        success: true,
        message: 'All cache cleared successfully',
        keysDeleted: totalKeysBefore,
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    if (!pattern) {
      return NextResponse.json(
        {
          success: false,
          message: 'Pattern is required (or use clearAll: true)',
          error: 'Missing pattern parameter',
        },
        { status: 400 }
      );
    }

    // Get all keys matching the pattern
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No keys found matching pattern: ${pattern}`,
        keysDeleted: 0,
      });
    }

    // Delete all matching keys
    const deleted = await redis.del(...keys);

    const response: ClearResponse = {
      success: true,
      message: `Cleared ${deleted} keys matching pattern: ${pattern}`,
      keysDeleted: deleted,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to clear cache by pattern:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to clear cache by pattern',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// app/api/redis-clear/[key]/route.ts
// Clear specific cache key
// ============================================================================

// Place this in: app/api/redis-clear/[key]/route.ts
/*
import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

interface ClearResponse {
  success: boolean;
  message: string;
  keyDeleted?: string;
  error?: string;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const redis = await getRedis();
    const { key } = params;

    if (!key) {
      return NextResponse.json(
        {
          success: false,
          message: 'Key is required',
          error: 'Missing key parameter',
        },
        { status: 400 }
      );
    }

    // Check if key exists
    const exists = await redis.exists(key);

    if (exists === 0) {
      return NextResponse.json({
        success: true,
        message: `Key not found: ${key}`,
        keyDeleted: key,
      });
    }

    // Delete the specific key
    await redis.del(key);

    const response: ClearResponse = {
      success: true,
      message: `Cache key deleted: ${key}`,
      keyDeleted: key,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to delete cache key:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete cache key',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
*/