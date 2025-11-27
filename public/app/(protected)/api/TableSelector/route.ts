import { NextResponse } from "next/server";
import { TableSelectorService } from "@/services/TableSelectorService";
import TableSelectorUtils from "@/utils/TableSelectorUtils";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    // ✅ fetch dynamic table descriptions
    const tableDescriptions = await TableSelectorUtils.fetchTableDescriptions();

    // console.log("Fetched table descriptions:", tableDescriptions);

    const { selectedTables, reasoning } =
      await TableSelectorService.selectRelevantTables(query, tableDescriptions);

    // TableSelectorUtils.logSelectionResults(
    //   query,
    //   selectedTables,
    //   tableDescriptions
    // );

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
