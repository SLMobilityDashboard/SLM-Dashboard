// app/(protected)/api/testquery/route.ts

import { NextRequest, NextResponse } from "next/server";
import snowflake from "snowflake-sdk";

// -------------------- Snowflake Connection --------------------
function createConnection() {
  return snowflake.createConnection({
    account: "ADWKJGR-IHB51446",           // ✅ Using the working account
    username: "USMAAN",
    password: "@Snowflake33340",           // ✅ Using password auth (not JWT)
    warehouse: "COMPUTE_WH",
    database: "SOURCE_DATA",               // ✅ Changed from SOURCE_DATA_NEW (doesn't exist)
    schema: "DYNAMO_DB",                   // ✅ Changed to match FACT_PAYMENT location
    role: "ACCOUNTADMIN",
    authenticator: "SNOWFLAKE",            // ✅ Using password authenticator
  });
}

// -------------------- Helper: Execute Query --------------------
async function executeQuery(
  connection: any, 
  sqlText: string, 
  options: { multiStatement?: boolean } = {}
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      ...options,
      complete: (err: any, _stmt: any, rows: any) => {
        if (err) return reject(err);
        resolve(rows || []);
      },
    });
  });
}

// -------------------- API Handler --------------------
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let connection: any = null;

  try {
    const { sql } = await req.json();
    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "Missing or invalid SQL" }, { status: 400 });
    }

    console.log(`🔵 Executing Snowflake query...`);

    connection = createConnection();

    // 1. Connect
    await new Promise<void>((resolve, reject) => {
      connection.connect((err: any) => {
        if (err) {
          console.error("❌ Unable to connect to Snowflake:", err);
          return reject(err);
        }
        console.log("✅ Connected to Snowflake");
        resolve();
      });
    });

    // 2. Set warehouse (CRITICAL - must be done first)
    console.log("🔧 Setting warehouse...");
    await executeQuery(connection, "USE WAREHOUSE COMPUTE_WH");
    console.log("✅ Warehouse set");
    
    // 3. Set database
    console.log("🔧 Setting database...");
    await executeQuery(connection, "USE DATABASE SOURCE_DATA");
    console.log("✅ Database set");
    
    // 4. Set schema
    console.log("🔧 Setting schema...");
    await executeQuery(connection, "USE SCHEMA DYNAMO_DB");
    console.log("✅ Schema set");

    // 5. Execute main query
    console.log("🔍 Executing main query...");
    const rows = await executeQuery(connection, sql);

    const duration = Date.now() - startTime;
    console.log(`✅ QUERY COMPLETE - ${rows.length} rows - ${duration}ms`);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No records found" }, { status: 404 });
    }

    return NextResponse.json(rows, {
      status: 200,
      headers: {
        "X-Row-Count": rows.length.toString(),
        "X-Query-Duration": duration.toString(),
      },
    });

  } catch (err: any) {
    console.error(`❌ QUERY ERROR - Duration: ${Date.now() - startTime}ms`, err);
    return NextResponse.json(
      { error: err.message || "Snowflake query failed" }, 
      { status: 500 }
    );
  } finally {
    // Always close connection
    if (connection) {
      connection.destroy((err: any) => {
        if (err) console.warn("⚠️ Error closing Snowflake connection:", err);
        else console.log("🔌 Connection closed");
      });
    }
  }
}