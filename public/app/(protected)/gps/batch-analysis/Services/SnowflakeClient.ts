import snowflake from "snowflake-sdk";

// Snowflake connection config using only username/password
const connectionConfig = {
  account: "JPCNHUS-SK19327",
  username: "USMAAN",
  password: "@Snowflake33340", // <-- replace with your actual password
  warehouse: "COMPUTE_WH",
  database: "REPORT_DB",
  schema: "GPS_DASHBOARD",
  role: "SYSADMIN",
};

export async function runQuery(query: string) {
  const connection = snowflake.createConnection(connectionConfig);

  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) return reject(err);

      connection.execute({
        sqlText: query,
        complete: (execErr, stmt, rows) => {
          if (execErr) reject(execErr);
          else resolve(rows);
        },
      });
    });
  });
}
