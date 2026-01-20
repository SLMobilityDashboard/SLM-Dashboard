// app/api/RunSQLQuery/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SnowflakeConnectionManager from "@/lib/snowflake_adhoc_prod";

export async function POST(request: NextRequest) {
  let finalUsername: string = "system";
  
  try {
    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("[RunSQLQuery] Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { sql, username: requestedUsername } = requestBody;

    // Validate SQL query
    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      return NextResponse.json(
        { error: "SQL query is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Get username with fallbacks
    if (requestedUsername) {
      finalUsername = requestedUsername;
    } else {
      try {
        const session = await getServerSession(authOptions);
        finalUsername = session?.user?.email || session?.user?.name || process.env.SNOWFLAKE_USERNAME || "system";
      } catch (sessionError) {
        console.warn("[RunSQLQuery] Failed to get session, using fallback username:", sessionError);
        finalUsername = process.env.SNOWFLAKE_USERNAME || "system";
      }
    }
    
    console.log(`[RunSQLQuery] User ${finalUsername} executing SQL query`);
    console.log(`[RunSQLQuery] SQL: ${sql.substring(0, 100)}...`);

    // Execute the query with timeout
    const result = await Promise.race([
      SnowflakeConnectionManager.executeQuery(sql, finalUsername),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query execution timeout')), 120000) // 2 minute timeout
      )
    ]);
    
    const status = await SnowflakeConnectionManager.getConnectionStatus();

    return NextResponse.json({ 
      success: true, 
      result,
      executedBy: finalUsername,
      snowflakeUser: status.username
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
  } catch (error: any) {
    console.error(`[RunSQLQuery] Query execution failed:`, {
      user: finalUsername,
      error: error.message,
      stack: error.stack
    });
    
    // Determine error type and appropriate status code
    let statusCode = 500;
    let errorMessage = "Query execution failed";
    let errorDetails = error.message || error.toString();

    // Handle specific error types
    if (error.message?.includes('Authentication required')) {
      statusCode = 401;
      errorMessage = "Authentication required";
    } else if (error.message?.includes('timeout')) {
      statusCode = 504;
      errorMessage = "Query execution timeout";
    } else if (error.message?.includes('syntax') || error.message?.includes('SQL')) {
      statusCode = 400;
      errorMessage = "Invalid SQL query";
    } else if (error.message?.includes('permission') || error.message?.includes('access')) {
      statusCode = 403;
      errorMessage = "Permission denied";
    }

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage, 
        details: errorDetails,
        executedBy: finalUsername
      },
      { 
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}