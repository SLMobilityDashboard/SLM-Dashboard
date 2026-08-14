import snowflake, { Connection, Statement } from 'snowflake-sdk';
import fs from 'fs';

interface QueryResult {
  columns:       string[];
  rows:          any[];
  executionTime: number;
  rowCount:      number;
}

interface ServiceQueryOptions {
  addAuditComment?: boolean;
}

/**
 * Runs queries as a dedicated Snowflake SERVICE user, authenticated via
 * RSA key-pair (SNOWFLAKE_JWT) instead of a human's OAuth token.
 *
 * This is intentionally a separate class from SnowflakeConnectionManager
 * (the OAuth/per-user one) — there is no session, no cognitoUsername, and
 * no per-request identity here. It always connects as the same fixed
 * service user, scoped to whatever role/grants that user has in
 * Snowflake (e.g. SELECT on a single view, nothing else).
 *
 * Required env vars:
 *   SNOWFLAKE_ACCOUNT                    - same account as the OAuth manager
 *   SNOWFLAKE_WAREHOUSE                  - same warehouse, or a dedicated one
 *   SNOWFLAKE_SERVICE_USERNAME           - e.g. SCOOTER_API_SVC
 *   SNOWFLAKE_SERVICE_ROLE               - e.g. SCOOTER_API_READER
 *   SNOWFLAKE_PRIVATE_KEY                - PEM private key contents
 *                                          (with literal \n for newlines), OR
 *   SNOWFLAKE_PRIVATE_KEY_PATH           - path to a .p8 key file on disk
 *   SNOWFLAKE_PRIVATE_KEY_PASSPHRASE     - only if the key is encrypted
 */
class SnowflakeServiceConnectionManager {
  private static readonly REQUEST_TIMEOUT_MS = 600_000;
  private static readonly LOGIN_TIMEOUT_MS   = 120_000;

  private static getPrivateKey(): string {
    if (process.env.SNOWFLAKE_PRIVATE_KEY) {
      // Env vars can't hold real newlines cleanly — keys are usually stored
      // with literal "\n" sequences and unescaped here.
      return process.env.SNOWFLAKE_PRIVATE_KEY.replace(/\\n/g, '\n');
    }

    if (process.env.SNOWFLAKE_PRIVATE_KEY_PATH) {
      return fs.readFileSync(process.env.SNOWFLAKE_PRIVATE_KEY_PATH, 'utf8');
    }

    throw new Error(
      'Set SNOWFLAKE_PRIVATE_KEY (PEM contents) or ' +
      'SNOWFLAKE_PRIVATE_KEY_PATH (path to .p8 file)',
    );
  }

  private static buildConnectionOptions(): Record<string, unknown> {
    if (!process.env.SNOWFLAKE_ACCOUNT) {
      throw new Error('SNOWFLAKE_ACCOUNT env var is not set');
    }
    if (!process.env.SNOWFLAKE_SERVICE_USERNAME) {
      throw new Error('SNOWFLAKE_SERVICE_USERNAME env var is not set');
    }

    const opts: Record<string, unknown> = {
      account:        process.env.SNOWFLAKE_ACCOUNT,
      username:       process.env.SNOWFLAKE_SERVICE_USERNAME,
      authenticator:  'SNOWFLAKE_JWT',
      privateKey:     this.getPrivateKey(),
      warehouse:      process.env.SNOWFLAKE_WAREHOUSE,
      loginTimeout:   this.LOGIN_TIMEOUT_MS,
      requestTimeout: this.REQUEST_TIMEOUT_MS,
    };

    if (process.env.SNOWFLAKE_SERVICE_ROLE) {
      opts.role = process.env.SNOWFLAKE_SERVICE_ROLE;
    }

    if (process.env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE) {
      opts.privateKeyPass = process.env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE;
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
   * Execute a SQL query as the fixed service user (RSA key-pair auth).
   * No per-user identity involved — use this only for backend jobs
   * (cron/refresh endpoints), never for anything acting on a human's
   * behalf. For that, use SnowflakeConnectionManager (OAuth) instead.
   */
  public static async executeQuery(
    sql: string,
    options: ServiceQueryOptions = {},
  ): Promise<QueryResult> {
    const { addAuditComment = true } = options;

    const serviceUser = process.env.SNOWFLAKE_SERVICE_USERNAME;
    const finalSql = addAuditComment
      ? `-- Service query (RSA key-pair auth) as ${serviceUser}\n${sql}`
      : sql;

    console.log(`📊 Executing service query as Snowflake user: ${serviceUser}`);

    const connectionOptions = this.buildConnectionOptions();
    const connection = snowflake.createConnection(connectionOptions as any);

    try {
      await this.connect(connection);
    } catch (err: any) {
      if (err?.code === '390186' || /not granted to this user/i.test(err?.message ?? '')) {
        throw new Error(
          `Snowflake role '${process.env.SNOWFLAKE_SERVICE_ROLE}' is not granted to ` +
          `service user '${serviceUser}'. Run: GRANT ROLE ${process.env.SNOWFLAKE_SERVICE_ROLE} ` +
          `TO USER ${serviceUser};`,
        );
      }
      throw err;
    }

    console.log(`✅ Connected to Snowflake as service user: ${serviceUser}`);

    // Explicitly activate the warehouse — same reasoning as the OAuth
    // manager: relying on DEFAULT_WAREHOUSE silently fails if the active
    // role lacks USAGE on it.
    const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
    if (warehouse) {
      try {
        await this.runQuery(connection, `USE WAREHOUSE ${warehouse}`);
      } catch (err: any) {
        await this.destroy(connection);
        throw new Error(
          `Failed to activate warehouse '${warehouse}' for service user '${serviceUser}'. ` +
          `Likely missing grant — run: GRANT USAGE ON WAREHOUSE ${warehouse} TO ROLE ` +
          `${process.env.SNOWFLAKE_SERVICE_ROLE}; Original error: ${err?.message ?? err}`,
        );
      }
    }

    try {
      const result = await this.runQuery(connection, finalSql);
      console.log(
        `✅ Service query done [${serviceUser}]: ${result.rowCount} rows in ${result.executionTime.toFixed(2)}s`,
      );
      return result;
    } finally {
      await this.destroy(connection);
    }
  }
}

export default SnowflakeServiceConnectionManager;