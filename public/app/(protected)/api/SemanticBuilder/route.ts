import { NextResponse } from "next/server";
import { SemanticBuilderService } from "@/services/SemanticBuilderService";
import { SemanticBuilderUtils } from "@/utils/SemanticBuilderUtils";

export async function POST(req: Request) {
  try {
    const { query, selectedTables, executorRole, reasoning } = await req.json();

    if (!query || !selectedTables || !executorRole || !reasoning) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: query, selectedTables, executorRole, or reasoning",
        },
        { status: 400 }
      );
    }

    const organizationContext = await SemanticBuilderUtils.getOrganizationCatalog();

    const semanticModel = await SemanticBuilderService.buildSemanticModel(
      selectedTables,
      organizationContext
    );

    // console.log("Semantic model built successfully:", semanticModel);

    return NextResponse.json({
      success: true,
      query,
      selectedTables,
      executorRole,
      reasoning,
      semanticModel,
    });
  } catch (error: any) {
    console.error("Semantic model build failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Semantic model build failed.",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
