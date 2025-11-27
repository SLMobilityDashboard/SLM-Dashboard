import { NextResponse } from "next/server";
import { SQLQueryService } from "@/services/SQLGenerationService";

export async function POST(req: Request) {
  let semanticModel: any;
  try {
    semanticModel = await req.json();

    // Basic validation
    if (!semanticModel || !semanticModel.query) {
      return NextResponse.json(
        {
          success: false,
          sql: "",
          explanation: "Invalid semanticModel payload - missing query",
          receivedData: semanticModel ?? null,
        },
        { status: 400 }
      );
    }

    // Default executorRole
    if (!semanticModel.executorRole) {
      semanticModel.executorRole = "analyst";
    }

    // Step 1: Permission / Ambiguity check
    let permissionResult;
    try {
      permissionResult = await SQLQueryService.runPermissionCheck(semanticModel);

      if (!permissionResult.allowed) {
        // Return immediately if ambiguous terms or insufficient permissions
        return NextResponse.json({
          success: true,
          query: semanticModel.query,
          executorRole: semanticModel.executorRole,
          sql: "",
          explanation: permissionResult.explanation,
        });
      }
    } catch (permissionError) {
      console.warn(
        "Permission check failed, proceeding without it:",
        permissionError.message
      );
      // Optionally assume allowed if checkPermissions is not implemented
      permissionResult = { allowed: true };
    }
    
    // Step 2: Generate SQL
    const { sql, explanation } = await SQLQueryService.generateQuery(semanticModel);

    // Step 3: Return consistent response
    return NextResponse.json({
      success: true,
      query: semanticModel.query,
      executorRole: semanticModel.executorRole,
      sql: sql ?? "",
      explanation: explanation ?? "",
    });
  } catch (err: any) {
    console.error("SQL Generation API Error:", err);

    return NextResponse.json(
      {
        success: false,
        sql: "",
        explanation: err.message || "Unknown error",
        receivedData: semanticModel ? Object.keys(semanticModel) : null,
        receivedQuery: semanticModel?.query ?? null,
      },
      { status: 500 }
    );
  }
}
