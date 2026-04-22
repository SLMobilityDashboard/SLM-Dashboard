// app/(protected)/api/TableSelector/route.ts
import { NextResponse } from "next/server";
import { TableSelectorService } from "@/services/TableSelectorService";
import TableSelectorUtils from "@/utils/TableSelectorUtils";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    // ✅ Pass the request object to maintain authentication context
    const tableDescriptions = await TableSelectorUtils.fetchTableDescriptionsWithRequest(req);

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
    
    // Handle specific error types
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: "Authentication failed. Please sign in again." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}