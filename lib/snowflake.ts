import snowflake, { Connection, Statement } from 'snowflake-sdk';

interface QueryResult {
  columns:       string[];
  rows:          any[];
  executionTime: number;
  rowCount:      number;
}

interface ExecuteQueryOptions {
  Token?:           string;
  addAuditComment?: boolean;
}

class SnowflakeConnectionManager {
  private static readonly REQUEST_TIMEOUT_MS = 600_000;
  private static readonly LOGIN_TIMEOUT_MS   = 120_000;

  /**
   * Build minimal connection options using the cognito:username claim
   * and the raw Cognito token (id_token or access_token).
   *
   * IMPORTANT: `username` must be the `cognito:username` claim value from
   * the JWT — NOT the email address, and NOT uppercased.
   */
  private static buildConnectionOptions(
    cognitoUsername: string,
    Token: string,
  ): Record<string, unknown> {
    if (!process.env.SNOWFLAKE_ACCOUNT) {
      throw new Error('SNOWFLAKE_ACCOUNT env var is not set');
    }
    if (!process.env.SNOWFLAKE_ROLE) {
      throw new Error('SNOWFLAKE_ROLE env var is not set — must be a role the Snowflake user is granted');
    }

    return {
      account:        process.env.SNOWFLAKE_ACCOUNT,  // e.g. "BQSPVDD-GP91871"
      username:       cognitoUsername,                 // cognito:username claim — used as-is
      authenticator:  'OAUTH',
      token:          Token,
      role:           process.env.SNOWFLAKE_ROLE,      // e.g. "QA_ENGINEER"
      warehouse:      process.env.SNOWFLAKE_WAREHOUSE, // optional: specify a default warehouse
      loginTimeout:   this.LOGIN_TIMEOUT_MS,
      requestTimeout: this.REQUEST_TIMEOUT_MS,
    };
  }

  private static connect(connection: Connection): Promise<void> {
    return new Promise((resolve, reject) => {
      connection.connect((err) => (err ? reject(err) : resolve()));
    });
  }

  private static destroy(connection: Connection): Promise<void> {
    return new Promise((resolve) => connection.destroy(() => resolve()));
  }

  private static runQuery(
    connection: Connection,
    sql: string,
  ): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      connection.execute({
        sqlText: sql,
        timeout: this.REQUEST_TIMEOUT_MS,
        complete: (err: any, stmt: Statement, rows: any[]) => {
          const duration = Date.now() - startTime;

          if (err) return reject(err);

          resolve({
            columns:       stmt.getColumns()?.map((c: any) => c.getName()) ?? [],
            rows:          rows ?? [],
            executionTime: duration / 1000,
            rowCount:      rows?.length ?? 0,
          });
        },
      });
    });
  }

  /**
   * Execute a SQL query against Snowflake using OAuth token relay.
   *
   * @param sql             - The SQL to execute.
   * @param cognitoUsername - The `cognito:username` claim from the session
   *                          (session.user.username in NextAuth).
   * @param options         - Must include a valid `Token` (id_token or access_token).
   */
  public static async executeQuery(
    sql: string,
    cognitoUsername: string,
    options: ExecuteQueryOptions = {},
  ): Promise<QueryResult> {
    const { Token, addAuditComment = true } = options;

    if (!Token) {
      throw new Error('Cognito Token (idToken or accessToken) is required for Snowflake query');
    }

    if (!cognitoUsername) {
      throw new Error('cognitoUsername is required — pass session.user.username from NextAuth');
    }

    const finalSql = addAuditComment
      ? `-- User: ${cognitoUsername}\n${sql}`
      : sql;

    console.log(`📊 Executing query as Snowflake user: ${cognitoUsername}`);
    console.log(`🔑 Role: ${process.env.SNOWFLAKE_ROLE}`);

    const connectionOptions = this.buildConnectionOptions(cognitoUsername, Token);
    const connection = snowflake.createConnection(connectionOptions as any);

    await this.connect(connection);
    console.log(`✅ Connected to Snowflake as: ${cognitoUsername}`);

    try {
      const result = await this.runQuery(connection, finalSql);
      console.log(
        `✅ Query done [${cognitoUsername}]: ${result.rowCount} rows in ${result.executionTime.toFixed(2)}s`,
      );
      return result;
    } finally {
      await this.destroy(connection);
    }
  }
}

export default SnowflakeConnectionManager;