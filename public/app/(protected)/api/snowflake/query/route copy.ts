import { runQuery } from "../../../gps/batch-analysis/Services/SnowflakeClientWith2FA";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    // console.log("📥 Received query:", query);

    const results = await runQuery(query);

    // console.log("📤 Query results received:", results.length, "rows");
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("❌ API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
