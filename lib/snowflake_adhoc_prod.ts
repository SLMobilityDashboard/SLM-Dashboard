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

  private static readonly CONNECTION_TIMEOUT_MS = 60000;
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
      console.log(`🔍 [ADHOC] Username from token: "${username}"`);
      return username;
    } catch (err) {
      console.error('[ADHOC] Failed to extract username from token:', err);
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

    // ✅ OAUTH PATH — username from token, no private key
    if (oauthToken) {
      const snowflakeUsername = this.getUsernameFromToken(oauthToken);
      console.log(`🔐 [ADHOC] Creating OAUTH connection for: ${snowflakeUsername}`);

      return snowflake.createConnection({
        account:       process.env.SNOWFLAKE_ACCOUNT,
        username:      snowflakeUsername,
        authenticator: 'oauth',
        token:         oauthToken,
        warehouse:     process.env.SNOWFLAKE_ADHOC_WAREHOUSE || process.env.SNOWFLAKE_WAREHOUSE || 'ADHOC',
        database:      process.env.SNOWFLAKE_ADHOC_DATABASE  || process.env.SNOWFLAKE_DATABASE  || 'ADHOC',
        schema:        process.env.SNOWFLAKE_SCHEMA  || 'PUBLIC',
        role:          process.env.SNOWFLAKE_ROLE    || 'ACCOUNTADMIN',
        timeout:       this.CONNECTION_TIMEOUT_MS,
        application:   'SLM_Dashboard_AdHoc',
        clientSessionKeepAlive: true,
        clientSessionKeepAliveHeartbeatFrequency: 3600,
      });
    }

    // ✅ JWT FALLBACK — for system/service calls, uses env default, no hardcoded map
    const privateKey = process.env.SNOWFLAKE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!privateKey) throw new Error('SNOWFLAKE_PRIVATE_KEY not set');

    const snowflakeUsername = username || process.env.SNOWFLAKE_USERNAME || 'DEFAULT_USER';
    console.log(`🔑 [ADHOC] Creating JWT connection for: ${snowflakeUsername}`);

    return snowflake.createConnection({
      account:       process.env.SNOWFLAKE_ACCOUNT,
      username:      snowflakeUsername,
      authenticator: 'SNOWFLAKE_JWT',
      privateKey,
      warehouse:     process.env.SNOWFLAKE_ADHOC_WAREHOUSE || process.env.SNOWFLAKE_WAREHOUSE || 'ADHOC',
      database:      process.env.SNOWFLAKE_ADHOC_DATABASE  || process.env.SNOWFLAKE_DATABASE  || 'ADHOC',
      schema:        process.env.SNOWFLAKE_SCHEMA  || 'PUBLIC',
      role:          process.env.SNOWFLAKE_ROLE    || 'ACCOUNTADMIN',
      timeout:       this.CONNECTION_TIMEOUT_MS,
      application:   'SLM_Dashboard_AdHoc',
      clientSessionKeepAlive: true,
      clientSessionKeepAliveHeartbeatFrequency: 3600,
    });
  }

  private static async getConnection(username?: string, oauthToken?: string): Promise<Connection> {
    const snowflakeUsername = oauthToken
      ? this.getUsernameFromToken(oauthToken)
      : (username || process.env.SNOWFLAKE_USERNAME || 'DEFAULT_USER');

    const connectionKey = this.buildConnectionKey(snowflakeUsername, oauthToken);

    this.cleanupIdleConnections();

    if (this.connectionPool.has(connectionKey) && this.connectedUsers.has(connectionKey)) {
      console.log(`♻️  [ADHOC] Reusing connection for: ${connectionKey}`);
      this.lastUsedTime.set(connectionKey, Date.now());
      return this.connectionPool.get(connectionKey)!;
    }

    if (this.connectingUsers.has(connectionKey)) {
      console.log(`⏳ [ADHOC] Waiting for connection: ${connectionKey}`);
      await this.waitForConnection(connectionKey);
      return this.connectionPool.get(connectionKey)!;
    }

    this.connectingUsers.add(connectionKey);
    const connection = this.createConnection(username, oauthToken);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Connection timeout for: ${connectionKey}`));
        }, this.CONNECTION_TIMEOUT_MS);

        connection.connect((err) => {
          clearTimeout(timeoutId);
          this.connectingUsers.delete(connectionKey);

          if (err) {
            console.error(`❌ [ADHOC] Connection failed for ${connectionKey}:`, err.message);
            console.error(`[ADHOC] Error details:`, { code: err.code, sqlState: err.sqlState });
            return reject(err);
          }

          this.connectedUsers.add(connectionKey);
          this.connectionPool.set(connectionKey, connection);
          this.lastUsedTime.set(connectionKey, Date.now());
          console.log(`✅ [ADHOC] Connected: ${connectionKey}`);
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
      if (now - lastUsed > this.MAX_IDLE_TIME_MS) {
        console.log(`🧹 [ADHOC] Closing idle connection: ${key}`);
        connectionsToRemove.push(key);
      }
    }

    for (const key of connectionsToRemove) {
      const connection = this.connectionPool.get(key);
      if (connection) {
        try {
          connection.destroy((err) => {
            if (err) console.error(`[ADHOC] Error destroying ${key}:`, err);
            else console.log(`✅ [ADHOC] Closed: ${key}`);
          });
        } catch (error) {
          console.error(`[ADHOC] Error destroying ${key}:`, error);
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
    oauthToken?: string // ✅ ADDED
  ): Promise<QueryResult> {
    const displayUsername = oauthToken
      ? this.getUsernameFromToken(oauthToken)
      : (requestedUsername || process.env.SNOWFLAKE_USERNAME || 'anonymous');

    const authMethod = oauthToken ? 'OAUTH' : 'JWT';
    const auditComment = addAuditComment
      ? `-- Executed by: ${displayUsername} [${authMethod}]\n`
      : '';
    const finalSql = `${auditComment}${sql}`;

    console.log(`📊 [ADHOC] Executing query for: ${displayUsername} [${authMethod}]`);

    const connection = await this.getConnection(requestedUsername, oauthToken);

    return new Promise<QueryResult>((resolve, reject) => {
      const startTime = Date.now();

      connection.execute({
        sqlText: finalSql,
        complete: (execErr: any, stmt: Statement, rows: any[]) => {
          if (execErr) {
            console.error(`❌ [ADHOC] Query failed for ${displayUsername}:`, execErr.message);

            // Remove broken connection from pool
            if (
              execErr.code === '390144' ||
              execErr.message?.includes('JWT token is invalid') ||
              execErr.code === '405503' ||
              execErr.message?.includes('terminated')
            ) {
              const connectionKey = this.buildConnectionKey(displayUsername, oauthToken);
              console.log(`[ADHOC] Removing failed connection: ${connectionKey}`);
              this.connectionPool.delete(connectionKey);
              this.connectedUsers.delete(connectionKey);
              this.lastUsedTime.delete(connectionKey);
            }

            return reject(execErr);
          }

          const columns = stmt.getColumns()?.map((col) => col.getName()) || [];
          const executionTime = (Date.now() - startTime) / 1000;

          const connectionKey = this.buildConnectionKey(displayUsername, oauthToken);
          this.lastUsedTime.set(connectionKey, Date.now());

          console.log(`✅ [ADHOC] Query complete for ${displayUsername} [${authMethod}]: ${rows.length} rows in ${executionTime.toFixed(2)}s`);

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

  public static async getConnectionStatus(requestedUsername?: string, oauthToken?: string): Promise<{
    isConnected: boolean;
    isConnecting: boolean;
    username: string;
    snowflakeUser: string;
    lastUsed: number;
    timeSinceLastQuery: number;
  }> {
    const snowflakeUsername = oauthToken
      ? this.getUsernameFromToken(oauthToken)
      : (requestedUsername || process.env.SNOWFLAKE_USERNAME || 'DEFAULT_USER');

    const connectionKey = this.buildConnectionKey(snowflakeUsername, oauthToken);
    const now = Date.now();
    const lastUsed = this.lastUsedTime.get(connectionKey) || 0;

    return {
      isConnected: this.connectedUsers.has(connectionKey),
      isConnecting: this.connectingUsers.has(connectionKey),
      username: requestedUsername || 'system',
      snowflakeUser: snowflakeUsername,
      lastUsed,
      timeSinceLastQuery: lastUsed ? now - lastUsed : 0,
    };
  }

  public static async connect(requestedUsername?: string, oauthToken?: string): Promise<void> {
    await this.getConnection(requestedUsername, oauthToken);
  }

  public static async disconnect(requestedUsername?: string, oauthToken?: string): Promise<void> {
    const snowflakeUsername = oauthToken
      ? this.getUsernameFromToken(oauthToken)
      : (requestedUsername || process.env.SNOWFLAKE_USERNAME || 'DEFAULT_USER');

    const connectionKey = this.buildConnectionKey(snowflakeUsername, oauthToken);
    const connection = this.connectionPool.get(connectionKey);

    if (!connection) {
      console.log(`[ADHOC] No connection found for ${connectionKey}`);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      connection.destroy((err) => {
        this.connectionPool.delete(connectionKey);
        this.connectedUsers.delete(connectionKey);
        this.lastUsedTime.delete(connectionKey);

        if (err) {
          console.error(`[ADHOC] Error disconnecting ${connectionKey}:`, err.message);
          reject(err);
        } else {
          console.log(`✅ [ADHOC] Disconnected: ${connectionKey}`);
          resolve();
        }
      });
    });
  }

  public static async disconnectAll(): Promise<void> {
    console.log(`[ADHOC] Disconnecting all ${this.connectionPool.size} connections...`);

    const disconnectPromises = Array.from(this.connectionPool.entries()).map(([key, connection]) =>
      new Promise<void>((resolve) => {
        connection.destroy((err) => {
          if (err) console.error(`[ADHOC] Error disconnecting ${key}:`, err.message);
          else console.log(`[ADHOC] Disconnected: ${key}`);
          resolve();
        });
      })
    );

    await Promise.allSettled(disconnectPromises);

    this.connectionPool.clear();
    this.connectedUsers.clear();
    this.connectingUsers.clear();
    this.lastUsedTime.clear();

    console.log('[ADHOC] All connections closed.');
  }

  public static getPoolStats() {
    const now = Date.now();
    const connections = Array.from(this.connectionPool.keys()).map(key => ({
      snowflakeUser: key,
      isConnected: this.connectedUsers.has(key),
      isConnecting: this.connectingUsers.has(key),
      lastUsed: this.lastUsedTime.get(key) || 0,
      timeSinceLastQuery: this.lastUsedTime.has(key) ? now - this.lastUsedTime.get(key)! : 0,
    }));

    return {
      totalConnections: this.connectionPool.size,
      activeConnections: this.connectedUsers.size,
      connections,
    };
  }

  public static manualCleanup(): void {
    console.log('[ADHOC] Manual cleanup triggered');
    this.cleanupIdleConnections();
  }
}

export default SnowflakeConnectionManager;