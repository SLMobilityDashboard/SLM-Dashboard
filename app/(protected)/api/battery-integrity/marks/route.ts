// app/api/battery-integrity/marks/route.ts
//
// Persists investigation status for flagged battery-mismatch swaps.
// Stored as a single Redis hash (`battery-marks`) keyed by TRNXID, so a
// mark set by one reviewer is immediately visible to everyone else who
// opens the Battery Integrity page — same "shared state via Redis" idea
// as the query cache in /api/query, just a hash instead of per-key blobs.
//
// NOTE: this route was previously at /api/battery-marks — renamed for
// clarity, but the underlying Redis key name is left unchanged so existing
// marks aren't orphaned.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getRedis } from "@/lib/redis";

const REDIS_KEY = "battery-marks";

export type MismatchStatus = "open" | "investigating" | "resolved" | "confirmed_theft";

interface MarkEntry {
  status: MismatchStatus;
  note: string | null;
  markedBy: string;
  markedAt: string;
}

// -------------------- GET: fetch all marks --------------------

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const redis = await getRedis();
    const raw = await redis.hGetAll(REDIS_KEY);

    const marks: Record<string, MarkEntry> = {};
    for (const [trnxid, value] of Object.entries(raw)) {
      try {
        marks[trnxid] = JSON.parse(value);
      } catch {
        // skip a corrupted entry rather than fail the whole response
      }
    }

    return NextResponse.json({ marks });
  } catch (err: any) {
    console.error("[battery-integrity/marks] GET failed:", err);
    return NextResponse.json({ error: "Failed to load marks" }, { status: 500 });
  }
}

// -------------------- POST: upsert a single mark --------------------

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trnxid, status, note } = await req.json();

    if (!trnxid || typeof trnxid !== "string") {
      return NextResponse.json({ error: "Missing trnxid" }, { status: 400 });
    }

    const validStatuses: MismatchStatus[] = ["open", "investigating", "resolved", "confirmed_theft"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Prefer an actual display name over the Cognito username/email, so the
    // UI shows "Marked by <Person Name>" rather than a login handle. Mirrors
    // the session.user shape set in authOptions (name, givenName, middleName,
    // username, email). Computed server-side from the session — never trust
    // a markedBy value from the request body.
    const user = session.user as any;
    const fullName = [user?.givenName, user?.middleName].filter(Boolean).join(" ").trim();
    const username = user?.name || fullName || user?.username || user?.email || "unknown";
    const redis = await getRedis();

    // "open" means "back to unflagged" — clear the entry instead of storing it,
    // so the hash only ever holds rows that actually have something to show.
    if (status === "open") {
      await redis.hDel(REDIS_KEY, trnxid);
      return NextResponse.json({ ok: true, trnxid, cleared: true });
    }

    const entry: MarkEntry = {
      status,
      note: note?.trim() || null,
      markedBy: username,
      markedAt: new Date().toISOString(),
    };

    await redis.hSet(REDIS_KEY, trnxid, JSON.stringify(entry));

    return NextResponse.json({ ok: true, trnxid, entry });
  } catch (err: any) {
    console.error("[battery-integrity/marks] POST failed:", err);
    return NextResponse.json({ error: "Failed to save mark" }, { status: 500 });
  }
}