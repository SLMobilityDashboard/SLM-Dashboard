// app/api/RunSQLQuery/route.ts  (Next.js 13+ app router example)

import { type NextRequest, NextResponse } from "next/server";
import snowflake from "snowflake-sdk";
import fs from "fs";

// Load your private key PEM string once (adjust path)
const privateKey = process.env.SNOWFLAKE_PRIVATE_KEY?.replace(/\\n/g, '\n');

export async function POST(request: NextRequest) {
  try {
    const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json(
        { error: "SQL query is required" },
        { status: 400 }
      );
    }

    // console.log("Executing SQL:", sql);
    
    // Hardcoded Snowflake config
    const config = {
      account: process.env.SNOWFLAKE_ACCOUNT,
        username: process.env.SNOWFLAKE_USERNAME,
        privateKey: privateKey,
      warehouse: "ADHOC",
      database: "ADHOC",
      schema: "PUBLIC",
      role: "ACCOUNTADMIN",
      authenticator: "SNOWFLAKE_JWT",
    };

    // Execute SQL query on Snowflake
    const result = await executeSnowflakeQuery(config, sql);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Query execution failed:", error);
    return NextResponse.json(
      { error: "Query execution failed", details: error.message || error.toString() },
      { status: 500 }
    );
  }
}

async function executeSnowflakeQuery(config: any, sql: string) {
  const connection = snowflake.createConnection({
    account: config.account,
    username: config.username,
    privateKey: config.privateKey,
    warehouse: config.warehouse,
    database: config.database,
    schema: config.schema,
    role: config.role,
    authenticator: config.authenticator,
  });

  // Connect to Snowflake
  await new Promise<void>((resolve, reject) => {
    connection.connect((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Execute query and return results
  return new Promise<{
    columns: string[];
    rows: any[];
    executionTime: number;
    rowCount: number;
  }>((resolve, reject) => {
    const startTime = Date.now();

    connection.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        connection.destroy();

        if (err) {
          reject(err);
        } else {
          const columns = stmt.getColumns().map((col) => col.getName());
          resolve({
            columns,
            rows,
            executionTime: (Date.now() - startTime) / 1000,
            rowCount: rows.length,
          });
        }
      },
    });
  });
}
