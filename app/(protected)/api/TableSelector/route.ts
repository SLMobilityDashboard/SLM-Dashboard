import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { TableSelectorService } from "@/services/TableSelectorService";
import TableSelectorUtils from "@/utils/TableSelectorUtils";

export async function POST(req: Request) {
  // ✅ Auth guard — ensure user is signed in
  const token = await getToken({
    req: req as any,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized: Please sign in" },
      { status: 401 }
    );
  }

  try {
    const { query } = await req.json();

    // ✅ Now calls Snowflake directly — no internal fetch, no auth issues
    const tableDescriptions = await TableSelectorUtils.fetchTableDescriptions();

    const { selectedTables, reasoning } =
      await TableSelectorService.selectRelevantTables(query, tableDescriptions);

    return NextResponse.json({
      query,
      selectedTables,
      reasoning,
      executorRole: "analyst",
    });
  } catch (error: any) {
    console.error("Table selection failed:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}