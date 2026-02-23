import snowflake, { Connection, Statement } from 'snowflake-sdk';

interface QueryResult {
  columns: string[];
  rows: any[];
  executionTime: number;
  rowCount: number;
}

class SnowflakeConnectionManager {
  private static connectionPool: Map<string, Connection> = new Map();
  private static connectingUsers: Set<string> = new Set();
  private static connectedUsers: Set<string> = new Set();

  private static readonly CONNECTION_TIMEOUT_MS = 180000;
  private static readonly REQUEST_TIMEOUT_MS = 600000;
  private static readonly LOGIN_TIMEOUT_MS = 120000;
  private static readonly MAX_IDLE_TIME_MS = 300000;
  private static lastUsedTime: Map<string, number> = new Map();

  // ✅ Extract username directly from Cognito JWT — no hardcoded map
  private static getUsernameFromToken(oauthToken: string): string {
    try {
      const payload = JSON.parse(
        Buffer.from(oauthToken.split('.')[1], 'base64url').toString()
      );
      const username = payload['username'] || payload['cognito:username'];
      if (!username) throw new Error('No username claim found in token');
      console.log(`🔍 Username from token: "${username}"`);
      return username;
    } catch (err) {
      console.error('Failed to extract username from token:', err);
      throw new Error('Invalid OAuth token — cannot extract username');
    }
  }

  private static getTokenExpiryHour(token: string): string {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString()
      );
      return String(Math.floor(payload.exp / 3600));
    } catch {
      return 'unknown';
    }
  }

  private static buildConnectionKey(snowflakeUsername: string, oauthToken?: string): string {
    if (oauthToken) {
      const expiryHour = this.getTokenExpiryHour(oauthToken);
      return `${snowflakeUsername}:oauth:${expiryHour}`;
    }
    return snowflakeUsername;
  }

  private static createConnection(username?: string, oauthToken?: string): Connection {
    if (!process.env.SNOWFLAKE_ACCOUNT) throw new Error('SNOWFLAKE_ACCOUNT not set');

    // ✅ OAUTH PATH — username extracted from token, no mapping, no private key
    if (oauthToken) {
      const snowflakeUsername = this.getUsernameFromToken(oauthToken);
      console.log(`🔐 Creating OAUTH connection for: ${snowflakeUsername}`);
      console.log(`⏱️  Timeouts: Connection=3min, Query=10min`);

      return snowflake.createConnection({
        account:       process.env.SNOWFLAKE_ACCOUNT,
        username:      snowflakeUsername,
        authenticator: 'oauth',
        token:         oauthToken,
        warehouse:     process.env.SNOWFLAKE_WAREHOUSE || 'AIDASHBOARD',
        database:      'DB_DUMP',
        schema:        'PUBLIC',
        role:          'SYSADMIN',
        timeout:        this.CONNECTION_TIMEOUT_MS,
        loginTimeout:   this.LOGIN_TIMEOUT_MS,
        requestTimeout: this.REQUEST_TIMEOUT_MS,
        clientSessionKeepAlive: true,
        clientSessionKeepAliveHeartbeatFrequency: 3600,
        sessionParameters: {
          STATEMENT_TIMEOUT_IN_SECONDS: 3600,
          STATEMENT_QUEUED_TIMEOUT_IN_SECONDS: 0,
        },
      });
    }

    // ✅ JWT FALLBACK PATH — for system/service calls without a user session
    // Uses SNOWFLAKE_USERNAME from env — no hardcoded map
    const privateKey = process.env.SNOWFLAKE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!privateKey) throw new Error('SNOWFLAKE_PRIVATE_KEY not set');

    const snowflakeUsername = username || process.env.SNOWFLAKE_USERNAME || 'DEFAULT_USER';
    console.log(`🔑 Creating JWT connection for: ${snowflakeUsername}`);
    console.log(`⏱️  Timeouts: Connection=3min, Query=10min`);

    return snowflake.createConnection({
      account:       process.env.SNOWFLAKE_ACCOUNT,
      username:      snowflakeUsername,
      authenticator: 'SNOWFLAKE_JWT',
      privateKey,
      warehouse:     process.env.SNOWFLAKE_WAREHOUSE || 'AIDASHBOARD',
      database:      'DB_DUMP',
      schema:        'PUBLIC',
      role:          'SYSADMIN',
      timeout:        this.CONNECTION_TIMEOUT_MS,
      loginTimeout:   this.LOGIN_TIMEOUT_MS,
      requestTimeout: this.REQUEST_TIMEOUT_MS,
      clientSessionKeepAlive: true,
      clientSessionKeepAliveHeartbeatFrequency: 3600,
      sessionParameters: {
        STATEMENT_TIMEOUT_IN_SECONDS: 3600,
        STATEMENT_QUEUED_TIMEOUT_IN_SECONDS: 0,
      },
    });
  }

  private static async getConnection(username?: string, oauthToken?: string): Promise<Connection> {
    // ✅ For OAuth, derive username from token; for JWT use passed username or env default
    const snowflakeUsername = oauthToken
      ? this.getUsernameFromToken(oauthToken)
      : (username || process.env.SNOWFLAKE_USERNAME || 'DEFAULT_USER');

    const connectionKey = this.buildConnectionKey(snowflakeUsername, oauthToken);

    this.cleanupIdleConnections();

    if (this.connectionPool.has(connectionKey) && this.connectedUsers.has(connectionKey)) {
      console.log(`♻️  Reusing connection for: ${connectionKey}`);
      this.lastUsedTime.set(connectionKey, Date.now());
      return this.connectionPool.get(connectionKey)!;
    }

    if (this.connectingUsers.has(connectionKey)) {
      console.log(`⏳ Waiting for connection: ${connectionKey}`);
      await this.waitForConnection(connectionKey);
      return this.connectionPool.get(connectionKey)!;
    }

    this.connectingUsers.add(connectionKey);
    const connection = this.createConnection(username, oauthToken);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Connection timeout (3min) for: ${connectionKey}`));
        }, this.CONNECTION_TIMEOUT_MS);

        connection.connect((err) => {
          clearTimeout(timeoutId);
          this.connectingUsers.delete(connectionKey);

          if (err) {
            console.error(`❌ Connection failed for ${connectionKey}:`, err.message, `(code: ${err.code})`);
            return reject(err);
          }

          this.connectedUsers.add(connectionKey);
          this.connectionPool.set(connectionKey, connection);
          this.lastUsedTime.set(connectionKey, Date.now());
          console.log(`✅ Connected: ${connectionKey}`);
          resolve();
        });
      });

      return connection;
    } catch (error) {
      this.connectingUsers.delete(connectionKey);
      this.connectionPool.delete(connectionKey);
      this.connectedUsers.delete(connectionKey);
      throw error;
    }
  }

  private static async waitForConnection(connectionKey: string): Promise<void> {
    const startTime = Date.now();

    while (this.connectingUsers.has(connectionKey)) {
      if (Date.now() - startTime > this.CONNECTION_TIMEOUT_MS) {
        throw new Error(`Timeout waiting for connection: ${connectionKey}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!this.connectedUsers.has(connectionKey)) {
      throw new Error(`Connection failed for: ${connectionKey}`);
    }
  }

  private static cleanupIdleConnections(): void {
    const now = Date.now();
    const connectionsToRemove: string[] = [];

    for (const [key, lastUsed] of this.lastUsedTime.entries()) {
      const idleTime = now - lastUsed;
      if (idleTime > this.MAX_IDLE_TIME_MS) {
        console.log(`🧹 Closing idle connection (${Math.round(idleTime / 1000)}s idle): ${key}`);
        connectionsToRemove.push(key);
      }
    }

    for (const key of connectionsToRemove) {
      const connection = this.connectionPool.get(key);
      if (connection) {
        try {
          connection.destroy((err) => {
            if (err) console.error(`Error destroying ${key}:`, err);
            else console.log(`✅ Closed: ${key}`);
          });
        } catch (error) {
          console.error(`Error destroying ${key}:`, error);
        }
      }
      this.connectionPool.delete(key);
      this.connectedUsers.delete(key);
      this.lastUsedTime.delete(key);
    }
  }

  public static async executeQuery(
    sql: string,
    requestedUsername?: string,
    addAuditComment: boolean = true,
    oauthToken?: string
  ): Promise<QueryResult> {
    // ✅ Display name for audit comment — from token if OAuth, else passed username
    const displayUsername = oauthToken
      ? this.getUsernameFromToken(oauthToken)
      : (requestedUsername || process.env.SNOWFLAKE_USERNAME || 'anonymous');

    const authMethod = oauthToken ? 'OAUTH' : 'JWT';
    const auditComment = addAuditComment
      ? `-- Executed by: ${displayUsername} [${authMethod}]\n`
      : '';
    const finalSql = `${auditComment}${sql}`;

    console.log(`📊 Executing query for: ${displayUsername} [${authMethod}]`);
    console.log(`⏱️  Max query time: 10 minutes`);

    const connection = await this.getConnection(requestedUsername, oauthToken);

    return new Promise<QueryResult>((resolve, reject) => {
      const startTime = Date.now();

      connection.execute({
        sqlText: finalSql,
        timeout: this.REQUEST_TIMEOUT_MS,
        complete: (execErr: any, stmt: Statement, rows: any[]) => {
          const duration = Date.now() - startTime;

          if (execErr) {
            console.error(`❌ Query failed for ${displayUsername} [${authMethod}]:`, execErr.message);
            console.error(`Code: ${execErr.code}, Duration: ${duration}ms`);
            return reject(execErr);
          }

          const columns = stmt.getColumns()?.map((col) => col.getName()) || [];
          const executionTime = duration / 1000;

          console.log(`✅ Query complete for ${displayUsername} [${authMethod}]: ${rows.length} rows in ${executionTime.toFixed(2)}s`);

          const connectionKey = this.buildConnectionKey(displayUsername, oauthToken);
          this.lastUsedTime.set(connectionKey, Date.now());

          resolve({
            columns,
            rows: rows || [],
            executionTime,
            rowCount: rows?.length || 0,
          });
        },
      });
    });
  }

  public static getPoolStats() {
    const now = Date.now();
    const idleConnections = Array.from(this.lastUsedTime.entries()).map(([user, lastUsed]) => ({
      user,
      idleSeconds: Math.round((now - lastUsed) / 1000)
    }));

    return {
      activeConnections: this.connectedUsers.size,
      connectingUsers:   this.connectingUsers.size,
      pooledUsers:       Array.from(this.connectedUsers),
      idleConnections,
    };
  }

  public static async closeAllConnections(): Promise<void> {
    console.log('🛑 Closing all connections...');

    const closePromises = Array.from(this.connectionPool.entries()).map(([key, connection]) => {
      return new Promise<void>((resolve) => {
        connection.destroy((err) => {
          if (err) console.error(`Error closing ${key}:`, err);
          else console.log(`✅ Closed: ${key}`);
          resolve();
        });
      });
    });

    await Promise.all(closePromises);

    this.connectionPool.clear();
    this.connectedUsers.clear();
    this.connectingUsers.clear();
    this.lastUsedTime.clear();

    console.log('✅ All connections closed');
  }
}

export default SnowflakeConnectionManager;