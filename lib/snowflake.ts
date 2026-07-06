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
  // NEW: allows callers to pass a role derived from the user's own Cognito
  // groups/permissions instead of always using the global SNOWFLAKE_ROLE env
  // var. Falls back to SNOWFLAKE_ROLE if not provided, so existing callers
  // keep working unchanged.
  snowflakeRole?:   string;
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
    role?: string,
  ): Record<string, unknown> {
    if (!process.env.SNOWFLAKE_ACCOUNT) {
      throw new Error('SNOWFLAKE_ACCOUNT env var is not set');
    }

    const opts: Record<string, unknown> = {
      account:        process.env.SNOWFLAKE_ACCOUNT,  // e.g. "BQSPVDD-GP91871"
      username:       cognitoUsername,                 // cognito:username claim — used as-is
      authenticator:  'OAUTH',
      token:          Token,
      warehouse:      process.env.SNOWFLAKE_WAREHOUSE, // optional: specify a default warehouse
      loginTimeout:   this.LOGIN_TIMEOUT_MS,
      requestTimeout: this.REQUEST_TIMEOUT_MS,
    };

    // Only force a role if one was explicitly passed. Otherwise leave it
    // unset so Snowflake's EXTERNAL_OAUTH_ANY_ROLE_MODE resolves the user's
    // actual granted/default role automatically — avoids hardcoding a role
    // (e.g. SYSADMIN) the user may not actually have.
    if (role) {
      opts.role = role;
    }

    return opts;
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
   *                          Optionally pass `snowflakeRole` to use a role specific
   *                          to this user rather than the global SNOWFLAKE_ROLE default.
   */
  public static async executeQuery(
    sql: string,
    cognitoUsername: string,
    options: ExecuteQueryOptions = {},
  ): Promise<QueryResult> {
    const { Token, addAuditComment = true, snowflakeRole } = options;

    if (!Token) {
      throw new Error('Cognito Token (idToken or accessToken) is required for Snowflake query');
    }

    if (!cognitoUsername) {
      throw new Error('cognitoUsername is required — pass session.user.username from NextAuth');
    }

    // IMPORTANT: we no longer default to SNOWFLAKE_ROLE automatically.
    // That env var previously forced every user onto one hardcoded role
    // (e.g. SYSADMIN) regardless of what they actually have granted,
    // which caused 390186 errors for users without that specific role.
    // Now: pass `snowflakeRole` explicitly if you know a user needs a
    // specific role; otherwise leave it unset and let Snowflake's
    // EXTERNAL_OAUTH_ANY_ROLE_MODE resolve the user's real default role.
    const requestedRole = snowflakeRole; // undefined unless explicitly passed

    const finalSql = addAuditComment
      ? `-- User: ${cognitoUsername}\n${sql}`
      : sql;

    console.log(`📊 Executing query as Snowflake user: ${cognitoUsername}`);
    console.log(`🔑 Role: ${requestedRole ?? '(auto-resolved by Snowflake)'}`);

    const connectionOptions = this.buildConnectionOptions(cognitoUsername, Token, requestedRole);
    const connection = snowflake.createConnection(connectionOptions as any);

    try {
      await this.connect(connection);
    } catch (err: any) {
      // Surface a clearer message for the common "role not granted" case
      // (Snowflake error code 390186) instead of the raw SDK error.
      if (err?.code === '390186' || /not granted to this user/i.test(err?.message ?? '')) {
        throw new Error(
          `Snowflake role '${requestedRole}' is not granted to user '${cognitoUsername}'. ` +
          `Either grant the role in Snowflake (GRANT ROLE ${requestedRole} TO USER ${cognitoUsername};) ` +
          `or omit snowflakeRole to let Snowflake auto-resolve the user's actual role.`,
        );
      }
      throw err;
    }

    // Log which role Snowflake actually activated — useful when role was
    // auto-resolved, since we don't know it in advance in that case.
    let activeRole = requestedRole ?? '(unknown)';
    try {
      const roleResult = await this.runQuery(connection, 'SELECT CURRENT_ROLE() AS ROLE');
      activeRole = roleResult.rows?.[0]?.ROLE ?? activeRole;
    } catch {
      // Non-fatal — just means we won't have a friendly role name in logs/errors below.
    }

    console.log(`✅ Connected to Snowflake as: ${cognitoUsername} (active role: ${activeRole})`);

    // Explicitly activate the warehouse instead of relying on the user's
    // DEFAULT_WAREHOUSE, which Snowflake only auto-activates if the *role*
    // active in this session also has USAGE granted on it. If that grant
    // is missing, connect() succeeds but queries fail with 000606
    // "No active warehouse selected" — this makes the failure explicit
    // and actionable instead of silent.
    const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
    if (warehouse) {
      try {
        await this.runQuery(connection, `USE WAREHOUSE ${warehouse}`);
      } catch (err: any) {
        await this.destroy(connection);
        throw new Error(
          `Failed to activate warehouse '${warehouse}' for role '${activeRole}'. ` +
          `Likely missing grant — run: GRANT USAGE ON WAREHOUSE ${warehouse} TO ROLE ${activeRole}; ` +
          `Original error: ${err?.message ?? err}`,
        );
      }
    }

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