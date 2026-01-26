// app/api/RunSQLQuery/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SnowflakeConnectionManager from "@/lib/snowflake_adhoc_prod";

export async function POST(request: NextRequest) {
  let finalUsername: string = "unknown";
  
  try {
    // Add error handling for JSON parsing
    let sql: string;
    let requestedUsername: string | undefined;
    
    try {
      const body = await request.json();
      sql = body.sql;
      requestedUsername = body.username;
    } catch (parseError) {
      console.error('[RunSQLQuery] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: "Invalid request body", details: "Failed to parse JSON" },
        { status: 400 }
      );
    }

    if (!sql) {
      return NextResponse.json(
        { error: "SQL query is required" },
        { status: 400 }
      );
    }

    // Get username with fallbacks: requested username -> session user -> environment default -> "system"
    if (requestedUsername) {
      // Use the username passed from frontend
      finalUsername = requestedUsername;
    } else {
      // Try to get from session
      const session = await getServerSession(authOptions);
      finalUsername = session?.user?.email || session?.user?.name || process.env.SNOWFLAKE_USERNAME || "system";
    }
    
    console.log(`[RunSQLQuery] User ${finalUsername} executing SQL query`);

    // Execute the query with the determined username
    const result = await SnowflakeConnectionManager.executeQuery(sql, finalUsername);
    const status = await SnowflakeConnectionManager.getConnectionStatus();

    return NextResponse.json({ 
      success: true, 
      result,
      executedBy: finalUsername,
      snowflakeUser: status.username
    });
  } catch (error: any) {
    console.error(`[RunSQLQuery] Query execution failed for user ${finalUsername}:`, error);
    
    // Handle authentication errors specifically
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json(
        { error: "Authentication required", details: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: "Query execution failed", 
        details: error.message || error.toString() 
      },
      { status: 500 }
    );
  }
}