import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import SnowflakeConnectionManager from "@/lib/snowflake_adhoc_prod";

export async function POST(request: NextRequest) {
  let displayUsername = 'anonymous';

  try {
    const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json(
        { error: "SQL query is required" },
        { status: 400 }
      );
    }

    // ✅ Extract Cognito token directly from NextAuth JWT
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const cognitoAccessToken = token?.cognitoAccessToken as string | undefined;

    // ✅ Determine display username for logging
    // If OAuth token present, username will be extracted from it inside executeQuery
    // If not, fall back to session info or env default
    displayUsername = cognitoAccessToken
      ? 'token-user' // will be resolved inside executeQuery from the token
      : (token?.name as string) || (token?.email as string) || process.env.SNOWFLAKE_USERNAME || 'system';

    console.log(`[RunSQLQuery] Executing SQL — auth: ${cognitoAccessToken ? 'OAUTH' : 'JWT'}`);

    const result = await SnowflakeConnectionManager.executeQuery(
      sql,
      displayUsername,
      true,
      cognitoAccessToken // ✅ pass token through — no username mapping needed
    );

    const status = await SnowflakeConnectionManager.getConnectionStatus(
      displayUsername,
      cognitoAccessToken
    );

    return NextResponse.json({
      success: true,
      result,
      executedBy: status.snowflakeUser,
      authMethod: cognitoAccessToken ? 'OAUTH' : 'JWT',
    });

  } catch (error: any) {
    console.error(`[RunSQLQuery] Query failed for ${displayUsername}:`, error);

    if (error.message?.includes('Authentication required') || error.message?.includes('Invalid OAuth token')) {
      return NextResponse.json(
        { error: "Authentication required", details: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Query execution failed", details: error.message || error.toString() },
      { status: 500 }
    );
  }
}