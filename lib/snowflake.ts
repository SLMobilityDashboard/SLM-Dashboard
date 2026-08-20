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
  snowflakeRole?:   string;
  // `snowflakeRole` comes from the ID token's `scp` claim
  // (session:role:<ROLE>), injected by the Cognito Pre Token Generation
  // Lambda. When present, it is passed explicitly as the Snowflake
  // connection's `role`. Snowflake still validates that this role is
  // listed in the token's `scp` claim (EXTERNAL_OAUTH_ANY_ROLE_MODE=DISABLE
  // on the security integration) — this option just makes the *choice* of
  // role explicit instead of implicitly falling back to DEFAULT_ROLE.
  //
  // If `snowflakeRole` is omitted, we fall back to the old behavior:
  // Snowflake activates the DEFAULT_ROLE configured on the Snowflake user
  // object, and scp still has to permit it.
}

class SnowflakeConnectionManager {
  private static readonly REQUEST_TIMEOUT_MS = 600_000;
  private static readonly LOGIN_TIMEOUT_MS   = 120_000;

  /**
   * Build connection options using the cognito:username claim, the raw
   * Cognito token (id_token), and optionally an explicit role.
   *
   * IMPORTANT: `username` must be the `cognito:username` claim value from
   * the JWT — NOT the email address, and NOT uppercased.
   *
   * `role` is only set when `snowflakeRole` is provided. If omitted,
   * Snowflake falls back to the DEFAULT_ROLE configured on the Snowflake
   * user object for cognitoUsername.
   */
  private static buildConnectionOptions(
    cognitoUsername: string,
    Token: string,
    snowflakeRole?: string,
  ): Record<string, unknown> {
    if (!process.env.SNOWFLAKE_ACCOUNT) {
      throw new Error('SNOWFLAKE_ACCOUNT env var is not set');
    }

    return {
      account:        process.env.SNOWFLAKE_ACCOUNT,
      username:       cognitoUsername,
      authenticator:  'OAUTH',
      token:          Token,
      warehouse:      process.env.SNOWFLAKE_WAREHOUSE,
      ...(snowflakeRole ? { role: snowflakeRole } : {}),
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
   * Role resolution:
   * - If `options.snowflakeRole` is provided (from the token's scp claim),
   *   it is passed explicitly as the connection's `role`.
   * - Otherwise, Snowflake activates the DEFAULT_ROLE configured on the
   *   Snowflake user object.
   * - Either way, Snowflake's EXTERNAL_OAUTH_ANY_ROLE_MODE=DISABLE setting
   *   requires the resolved role to be listed in the token's scp claim, or
   *   the connection fails with error 390317.
   *
   * @param sql             - The SQL to execute.
   * @param cognitoUsername - The `cognito:username` claim from the session
   *                          (session.user.username in NextAuth).
   * @param options         - Must include a valid `Token` (Cognito ID token).
   *                          May include `snowflakeRole`.
   */
  public static async executeQuery(
    sql: string,
    cognitoUsername: string,
    options: ExecuteQueryOptions = {},
  ): Promise<QueryResult> {
    const { Token, addAuditComment = true, snowflakeRole } = options;

    if (!Token) {
      throw new Error('Cognito Token (ID token) is required for Snowflake query');
    }

    if (!cognitoUsername) {
      throw new Error('cognitoUsername is required — pass session.user.username from NextAuth');
    }

    const finalSql = addAuditComment
      ? `-- User: ${cognitoUsername}\n${sql}`
      : sql;

    console.log(`📊 Executing query as Snowflake user: ${cognitoUsername}`);
    console.log(
      snowflakeRole
        ? `🔑 Role requested (from token scp claim): ${snowflakeRole}`
        : `🔑 Role: (none in token — falling back to DEFAULT_ROLE)`
    );

    const connectionOptions = this.buildConnectionOptions(cognitoUsername, Token, snowflakeRole);
    const connection = snowflake.createConnection(connectionOptions as any);

    try {
      await this.connect(connection);
    } catch (err: any) {
      // Surface a clearer message for the common "role not granted / not
      // permitted by OAuth token" cases instead of the raw SDK error.
      if (err?.code === '390186' || /not granted to this user/i.test(err?.message ?? '')) {
        throw new Error(
          `Snowflake connection failed for user '${cognitoUsername}' — likely no DEFAULT_ROLE ` +
          `is set on the Snowflake user, or the configured DEFAULT_ROLE isn't actually granted. ` +
          `Check: ALTER USER ${cognitoUsername} SET DEFAULT_ROLE = <role>; ` +
          `and confirm the role is granted: GRANT ROLE <role> TO USER ${cognitoUsername};`,
        );
      }
      if (err?.code === '390317' || /not listed in the Access Token/i.test(err?.message ?? '')) {
        throw new Error(
          `Snowflake connection failed for user '${cognitoUsername}' — the role ` +
          `${snowflakeRole ? `'${snowflakeRole}'` : `(DEFAULT_ROLE)`} is not present in the ` +
          `OAuth token's 'scp' claim. Check the Cognito Pre Token Generation Lambda is injecting ` +
          `'session:role:<ROLE>' into the ID token for this user, and that it matches a role ` +
          `actually granted to them in Snowflake.`,
        );
      }
      throw err;
    }

    // Log which role Snowflake actually activated.
    let activeRole = '(unknown)';
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
        `✅ Query done [${cognitoUsername}/${activeRole}]: ${result.rowCount} rows in ${result.executionTime.toFixed(2)}s`,
      );
      return result;
    } finally {
      await this.destroy(connection);
    }
  }
}

export default SnowflakeConnectionManager;