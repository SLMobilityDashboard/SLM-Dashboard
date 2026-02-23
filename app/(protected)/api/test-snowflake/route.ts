import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import snowflake from "snowflake-sdk";

export async function POST(request: NextRequest) {
  // ✅ Auth guard — only logged-in Cognito users can test connections
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      account,
      username,
      password,
      warehouse,
      database,
      schema,
    } = await request.json();

    if (!account || !username || !password || !warehouse || !database || !schema) {
      return NextResponse.json(
        { error: "Missing required Snowflake credentials" },
        { status: 400 }
      );
    }

    const connection = snowflake.createConnection({
      account,
      username,
      password,
      warehouse,
      database,
      schema,
    });

    // Connect to Snowflake
    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) reject(err);
        else resolve(conn);
      });
    });

    // Verify connection is alive
    const testQuery = `SELECT CURRENT_TIMESTAMP() AS now;`;
    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: testQuery,
        complete: (err) => {
          if (err) reject(err);
          else resolve(true);
        },
      });
    });

    // Get tables in the schema
    const tables = await new Promise<any[]>((resolve, reject) => {
      connection.execute({
        sqlText: `SHOW TABLES IN SCHEMA "${database}"."${schema}"`,
        complete: (err, stmt, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      });
    });

    // Get row counts for each table
    const tableData: { name: string; rows: number }[] = [];
    for (const table of tables) {
      const tableName = table.name;
      try {
        const rows: any[] = await new Promise((resolve, reject) => {
          connection.execute({
            sqlText: `SELECT COUNT(*) AS count FROM "${database}"."${schema}"."${tableName}"`,
            complete: (err, stmt, rows) => {
              if (err) reject(err);
              else resolve(rows);
            },
          });
        });
        tableData.push({ name: tableName, rows: rows[0]["COUNT"] });
      } catch (e) {
        tableData.push({ name: tableName, rows: 0 });
      }
    }

    connection.destroy((err) => {
      if (err) console.error("Error destroying test connection:", err);
    });

    return NextResponse.json({
      success: true,
      tables: tableData,
    });

  } catch (error: any) {
    console.error("Snowflake connection test failed:", error);
    return NextResponse.json(
      { error: "Failed to connect to Snowflake", details: error.message || error.toString() },
      { status: 500 }
    );
  }
}