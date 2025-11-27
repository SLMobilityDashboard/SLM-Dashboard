// app/api/RunSQLQuery/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SnowflakeConnectionManager from "@/lib/snowflake_adhoc";

export async function POST(request: NextRequest) {
  try {
    const { sql, username: requestedUsername } = await request.json();

    if (!sql) {
      return NextResponse.json(
        { error: "SQL query is required" },
        { status: 400 }
      );
    }

    // Get username with fallbacks: requested username -> session user -> environment default -> "system"
    let finalUsername: string;
    
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
    console.error("[RunSQLQuery] Query execution failed:", error);
    
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