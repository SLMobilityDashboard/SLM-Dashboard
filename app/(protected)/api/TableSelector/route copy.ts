import { NextResponse } from "next/server";
import { TableSelectorService } from "@/services/TableSelectorService"
import { TableSelectorUtils } from "@/utils/TableSelectorUtils";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    const tableDescriptions = TableSelectorUtils.createSampleTableDescriptions();

    const { selectedTables, reasoning } =
      await TableSelectorService.selectRelevantTables(query, tableDescriptions);

    const logOutput = TableSelectorUtils.logSelectionResults(
      query,
      selectedTables,
      tableDescriptions.map((desc) => desc.table)
    );

    return NextResponse.json({
      query,
      selectedTables,
      reasoning,
      "executorRole": "analyst"
    });
  } catch (error: any) {
    console.error("Table selection failed:", error);
    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
