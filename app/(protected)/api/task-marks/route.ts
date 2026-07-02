import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getRedis } from "@/lib/redis";

// task-marks:index -> sorted set, member = LOG_ID, score = markedAt (ms).
//   Used for fast "which rows are marked" lookups and for the daily prune.
// task-mark:{logId} -> individual JSON key {logId, markedBy, markedByUsername,
//   markedAt}, EX 14 days. This is the source of truth for *who* marked a
//   row; Redis expires it on its own, the index just mirrors its lifetime.
const INDEX_KEY = "task-marks:index";
const MARK_KEY = (logId: number | string) => `task-mark:${logId}`;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

interface TaskMark {
  logId: number;
  markedBy: string;
  markedByUsername: string;
  markedAt: string;
}

async function pruneStaleMarks(redis: Awaited<ReturnType<typeof getRedis>>) {
  const cutoff = Date.now() - MAX_AGE_MS;
  await redis.zRemRangeByScore(INDEX_KEY, 0, cutoff);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const redis = await getRedis();
    await pruneStaleMarks(redis);

    const memberIds = await redis.zRange(INDEX_KEY, 0, -1);
    if (memberIds.length === 0) {
      return NextResponse.json({ marked: [] });
    }

    const rawValues = await redis.mGet(memberIds.map((id: string) => MARK_KEY(id)));

    const marks: TaskMark[] = [];
    const expiredIds: string[] = [];

    memberIds.forEach((id: string, i: number) => {
      const raw = rawValues[i];
      if (raw) {
        try {
          marks.push(JSON.parse(raw) as TaskMark);
        } catch {
          expiredIds.push(id);
        }
      } else {
        // Individual key already expired via its own TTL — self-heal the
        // index so it doesn't keep reporting a mark with no detail behind it.
        expiredIds.push(id);
      }
    });

    if (expiredIds.length > 0) {
      await redis.zRem(INDEX_KEY, expiredIds);
    }

    return NextResponse.json({ marked: marks });
  } catch (err: any) {
    console.error("Failed to read task marks:", err.message);
    return NextResponse.json({ error: "Failed to read marks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const logId = body?.logId;
  const marked = body?.marked;

  if (logId === undefined || logId === null || typeof marked !== "boolean") {
    return NextResponse.json(
      { error: "logId and marked (boolean) are required" },
      { status: 400 }
    );
  }

  const cognitoUsername = (session.user as any).username ?? session.user.email ?? "unknown";
  const displayName = session.user.name ?? cognitoUsername;

  try {
    const redis = await getRedis();
    await pruneStaleMarks(redis);

    if (marked) {
      const mark: TaskMark = {
        logId,
        markedBy: displayName,
        markedByUsername: cognitoUsername,
        markedAt: new Date().toISOString(),
      };
      await redis.set(MARK_KEY(logId), JSON.stringify(mark), { EX: MAX_AGE_SECONDS });
      await redis.zAdd(INDEX_KEY, { score: Date.now(), value: String(logId) });
      return NextResponse.json({ ok: true, mark });
    } else {
      await redis.del(MARK_KEY(logId));
      await redis.zRem(INDEX_KEY, String(logId));
      return NextResponse.json({ ok: true, logId, marked: false });
    }
  } catch (err: any) {
    console.error("Failed to save task mark:", err.message);
    return NextResponse.json({ error: "Failed to save mark" }, { status: 500 });
  }
}