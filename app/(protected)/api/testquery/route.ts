import { NextRequest, NextResponse } from "next/server";
import snowflake from "snowflake-sdk";

// [connections.my_example_connection]
// account = "IJJJEQK-OQ82434"
// user = "USMAAN"
// authenticator = "externalbrowser"
// role = "SYSADMIN"
// warehouse = "COMPUTE_WH"
// database = "SOURCE_DATA"
// schema = "DYNAMO_DB"

// -------------------- Snowflake Connection --------------------
function createConnection() {
  return snowflake.createConnection({
    account: "IJJJEQK-OQ82434",
    username: "USMAAN",
    password: "@Snowflake33340",
    warehouse: "test",
    database: "SOURCE_DATA",
    schema: "DYNAMO_DB",
    role: "SYSADMIN",
  });
}

// -------------------- API Handler --------------------
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { sql } = await req.json();
    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "Missing or invalid SQL" }, { status: 400 });
    }

    console.log(`🔵 Executing Snowflake query...`);

    const connection = createConnection();

    // Connect first
    await new Promise<void>((resolve, reject) => {
      connection.connect((err) => {
        if (err) {
          console.error("❌ Unable to connect to Snowflake:", err);
          return reject(err);
        }
        resolve();
      });
    });

    // Execute query
    const rows = await new Promise<any[]>((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        complete: (err, _stmt, rows) => {
          if (err) {
            console.error("❌ Query execution failed:", err);
            return reject(err);
          }
          resolve(rows || []);
        },
      });
    });

    // Close connection after query
    connection.destroy((err) => {
      if (err) console.warn("⚠️ Error closing Snowflake connection:", err);
    });

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
    return NextResponse.json([{ error: "Snowflake query failed" }], { status: 500 });
  }
}
