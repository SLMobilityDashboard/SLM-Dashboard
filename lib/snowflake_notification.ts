import snowflake from 'snowflake-sdk';

interface ConnectionState {
  connection: snowflake.Connection;
  isConnecting: boolean;
  isConnected: boolean;
  lastUsed: number;
  lastQueryTime: number;
}

class SnowflakeNotificationManager {
  private static connections: Map<string, ConnectionState> = new Map();
  private static readonly CONNECTION_TIMEOUT = 10 * 1000;
  private static readonly CLEANUP_INTERVAL = 30 * 1000;

  private static initializeCleanup() {
    if (!(global as any).snowflakeNotificationCleanupInitialized) {
      setInterval(() => {
        if (this.connections.size > 0) {
          this.cleanupStaleConnections();
        }
      }, this.CLEANUP_INTERVAL);
      (global as any).snowflakeNotificationCleanupInitialized = true;
      console.log('[Snowflake-Notification] Cleanup interval initialized');
    }
  }

  // ✅ Extract username from Cognito JWT token
  private static getUsernameFromToken(oauthToken: string): string {
    try {
      const payload = JSON.parse(
        Buffer.from(oauthToken.split('.')[1], 'base64url').toString()
      );
      const username = payload['username'] || payload['cognito:username'];
      if (!username) throw new Error('No username claim found in token');
      console.log(`[Snowflake-Notification] 🔍 Username from token: "${username}"`);
      return username;
    } catch (err) {
      console.error('[Snowflake-Notification] Failed to extract username from token:', err);
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

  // ✅ Build connection key — factors in token expiry for OAuth
  private static buildConnectionKey(username: string, oauthToken?: string): string {
    if (oauthToken) {
      const expiryHour = this.getTokenExpiryHour(oauthToken);
      return `${username}:oauth:${expiryHour}`;
    }
    return username;
  }

  // ✅ Resolve display username — from token if OAuth, else env default
  private static resolveUsername(
    requestedUsername?: string,
    oauthToken?: string
  ): string {
    // OAuth users come from Cognito token
    if (oauthToken) {
      return this.getUsernameFromToken(oauthToken);
    }

    const usernameMap: Record<string, string> = {
      'safnas': 'SAFNAS',
      'safnas@slmobility.com': 'SAFNAS',

      'hansika': 'HANSIKAAIT',
      'hansikaait': 'HANSIKAAIT',
      'hansika@slmobility.com': 'HANSIKAAIT',

      'oshani': 'OSHANIQA',
      'oshaniqa': 'OSHANIQA',
      'oshani@slmobility.com': 'OSHANIQA',

      'usmaan': 'USMAANRIFKHAN',
      'usmaanrifkhan': 'USMAANRIFKHAN',
      'usmaanit': 'USMAANRIFKHAN',
      'usmaanit@slmobility.com': 'USMAANRIFKHAN',

      'ashan': 'ASHANSLM',
      'ashanslm': 'ASHANSLM',
      'ashan@slmobility.com': 'ASHANSLM',

      'madhushi': 'MADHUSHI',
      'madhushimarketing': 'MADHUSHI',
      'madhushi@lencar.lk': 'MADHUSHI',

      'suneth': 'SUNETH',
      'sunethmarketing': 'SUNETH',
      'suneth@slmobility.com': 'SUNETH',

      'mithun': 'MITHUN',
      'mithunlencar': 'MITHUN',
      'mithun@lencar.lk': 'MITHUN',

      'rasika': 'RASIKA',
      'rasikafac': 'RASIKA',
      'rasika@slmobility.com': 'RASIKA',

      'zainab': 'ZAINAB',
      'zainabqanew': 'ZAINAB',
      'zainab@slmobility.com': 'ZAINAB',

      'nayanaka': 'NAYANAKA',
      'nayanaka buddhi': 'NAYANAKA',
      'nayanakabuddhi@gmail.com': 'NAYANAKA',

      'dinusha': 'DINUSHA',
      'dinusha jayakody': 'DINUSHA',
      'dinusha@slmobility.com': 'DINUSHA',

      'mafaz': 'MAFAZ',
      'mafazfec': 'MAFAZ',
      'mafaz@slmobility.com': 'MAFAZ',

      'zaid': 'ZAID',
      'zaidfaiz': 'ZAID',
      'zaid@slmobility.com': 'ZAID',

      'janaka': 'JANAKA',
      'janakaudara': 'JANAKA',
      'udara@slmobility.com': 'JANAKA',

      'aitadmin': 'JANAKAAIT',
      'janakaait': 'JANAKAAIT',
      'janaka@ascensionit.com.au': 'JANAKAAIT',

      'rifkhan': 'RIFKHAN',
      'rifkhansiddeek': 'RIFKHAN',
      'rifkhan@slmobility.com': 'RIFKHAN'
    };

    if (requestedUsername) {
      const normalized = requestedUsername.trim().toLowerCase();

      const mappedUsername =
        usernameMap[normalized] ||
        usernameMap[requestedUsername] ||
        requestedUsername.toUpperCase();

      console.log(
        `[Snowflake-Notification] 🔄 User Mapping: "${requestedUsername}" -> "${mappedUsername}"`
      );

      return mappedUsername;
    }

    const envUsername = process.env.SNOWFLAKE_USERNAME;

    if (!envUsername) {
      throw new Error(
        'No username provided and SNOWFLAKE_USERNAME is not set'
      );
    }

    return envUsername;
  }

  private static cleanupStaleConnections(): void {
    const now = Date.now();
    const connectionsToClean: string[] = [];

    for (const [key, state] of this.connections.entries()) {
      const timeSinceLastQuery = now - state.lastQueryTime;
      if (timeSinceLastQuery > this.CONNECTION_TIMEOUT) {
        console.log(`[Snowflake-Notification] Marking stale: ${key} (inactive ${(timeSinceLastQuery / 1000).toFixed(1)}s)`);
        connectionsToClean.push(key);
      }
    }

    for (const key of connectionsToClean) {
      if (this.connections.has(key)) {
        this.disconnectByKey(key).catch(err => {
          console.error(`[Snowflake-Notification] Error cleaning up ${key}:`, err.message);
        });
      }
    }
  }

  private static isConnectionTerminated(connection: snowflake.Connection): boolean {
    try {
      const state = (connection as any)._state;
      return state === 'TERMINATED' || state === 'DESTROYED' || state === 'DISCONNECTED';
    } catch {
      return true;
    }
  }

  // ✅ Create connection — OAuth path or JWT fallback, no hardcoded mapping
  private static createSnowflakeConnection(username: string, oauthToken?: string): snowflake.Connection {
    if (!process.env.SNOWFLAKE_ACCOUNT) throw new Error('SNOWFLAKE_ACCOUNT not set');

    // ✅ OAUTH PATH — username from token, no private key
    if (oauthToken) {
      console.log(`[Snowflake-Notification] 🔐 Creating OAUTH connection for: ${username}`);
      return snowflake.createConnection({
        account:       process.env.SNOWFLAKE_ACCOUNT,
        username:      username,
        authenticator: 'oauth',
        token:         oauthToken,
        warehouse:     process.env.SNOWFLAKE_NOTIFICATION_WAREHOUSE || 'LOG_WH',
        database:      process.env.SNOWFLAKE_NOTIFICATION_DATABASE  || 'ADHOC',
        schema:        process.env.SNOWFLAKE_NOTIFICATION_SCHEMA    || 'PUBLIC',
        role:          process.env.SNOWFLAKE_NOTIFICATION_ROLE      || 'ACCOUNTADMIN',
      });
    }

    // ✅ JWT FALLBACK — service account, no hardcoded mapping
    const privateKey = process.env.SNOWFLAKE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!privateKey) throw new Error('SNOWFLAKE_PRIVATE_KEY not set');

    console.log(`[Snowflake-Notification] 🔑 Creating JWT connection for: ${username}`);
    return snowflake.createConnection({
      account:       process.env.SNOWFLAKE_ACCOUNT,
      username:      username,
      authenticator: 'SNOWFLAKE_JWT',
      privateKey,
      warehouse:     process.env.SNOWFLAKE_NOTIFICATION_WAREHOUSE || 'LOG_WH',
      database:      process.env.SNOWFLAKE_NOTIFICATION_DATABASE  || 'ADHOC',
      schema:        process.env.SNOWFLAKE_NOTIFICATION_SCHEMA    || 'PUBLIC',
      role:          process.env.SNOWFLAKE_NOTIFICATION_ROLE      || 'ACCOUNTADMIN',
      clientSessionKeepAlive: true,
      clientSessionKeepAliveHeartbeatFrequency: 3600,
    });
  }

  public static async getConnection(requestedUsername?: string, oauthToken?: string): Promise<snowflake.Connection> {
    this.initializeCleanup();

    const username = this.resolveUsername(requestedUsername, oauthToken);
    const connectionKey = this.buildConnectionKey(username, oauthToken);
    let state = this.connections.get(connectionKey);

    if (state && this.isConnectionTerminated(state.connection)) {
      console.log(`[Snowflake-Notification] Connection terminated for ${connectionKey}, will recreate`);
      this.connections.delete(connectionKey);
      state = undefined;
    }

    if (!state) {
      console.log(`[Snowflake-Notification] Initializing new connection for: ${connectionKey}`);
      const connection = this.createSnowflakeConnection(username, oauthToken);

      state = {
        connection,
        isConnecting: false,
        isConnected: false,
        lastUsed: Date.now(),
        lastQueryTime: Date.now(),
      };

      this.connections.set(connectionKey, state);
    } else {
      state.lastUsed = Date.now();
      console.log(`[Snowflake-Notification] Reusing connection for: ${connectionKey}`);
    }

    return state.connection;
  }

  public static async connect(requestedUsername?: string, oauthToken?: string): Promise<void> {
    const username = this.resolveUsername(requestedUsername, oauthToken);
    const connectionKey = this.buildConnectionKey(username, oauthToken);
    let state = this.connections.get(connectionKey);

    if (state && this.isConnectionTerminated(state.connection)) {
      console.log(`[Snowflake-Notification] Connection terminated for ${connectionKey}, recreating`);
      this.connections.delete(connectionKey);
      state = undefined;
    }

    const connection = await this.getConnection(requestedUsername, oauthToken);
    state = this.connections.get(connectionKey)!;

    if (state.isConnected) {
      console.log(`[Snowflake-Notification] Already connected: ${connectionKey}`);
      return;
    }

    if (state.isConnecting) {
      console.log(`[Snowflake-Notification] Connection in progress: ${connectionKey}`);
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout after 30s')), 30000);
        const interval = setInterval(() => {
          const current = this.connections.get(connectionKey);
          if (current?.isConnected) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve();
          }
          if (!current?.isConnecting) {
            clearInterval(interval);
            clearTimeout(timeout);
            reject(new Error('Connection failed while waiting'));
          }
        }, 100);
      });
      return;
    }

    state.isConnecting = true;
    console.log(`[Snowflake-Notification] Connecting: ${connectionKey}...`);

    await new Promise<void>((resolve, reject) => {
      connection.connect((err) => {
        state!.isConnecting = false;
        if (err) {
          state!.isConnected = false;
          console.error(`[Snowflake-Notification] ❌ Failed to connect ${connectionKey}:`, err.message);
          this.connections.delete(connectionKey);
          return reject(err);
        }
        state!.isConnected = true;
        state!.lastUsed = Date.now();
        console.log(`[Snowflake-Notification] ✅ Connected: ${connectionKey}`);
        resolve();
      });
    });
  }

  public static async executeQuery(
    sql: string,
    requestedUsername?: string,
    addAuditComment: boolean = true,
    oauthToken?: string // ✅ ADDED
  ): Promise<{
    columns: string[];
    rows: any[];
    executionTime: number;
    rowCount: number;
  }> {
    const username = this.resolveUsername(requestedUsername, oauthToken);
    const connectionKey = this.buildConnectionKey(username, oauthToken);
    const authMethod = oauthToken ? 'OAUTH' : 'JWT';

    try {
      await this.connect(requestedUsername, oauthToken);
      const connection = await this.getConnection(requestedUsername, oauthToken);
      const state = this.connections.get(connectionKey)!;

      const auditComment = addAuditComment
        ? `-- Executed by: ${username} [${authMethod}]\n`
        : '';
      const finalSql = `${auditComment}${sql}`;

      return new Promise((resolve, reject) => {
        const startTime = Date.now();

        connection.execute({
          sqlText: finalSql,
          complete: (err: any, stmt: any, rows: any[]) => {
            if (state) {
              state.lastQueryTime = Date.now();
              state.lastUsed = Date.now();
            }

            if (err) {
              console.error(`[Snowflake-Notification] ❌ Query failed for ${connectionKey}:`, err.message);

              if (err.code === 405503 || err.message?.includes('terminated') || err.message?.includes('Cannot connect')) {
                console.log(`[Snowflake-Notification] Removing terminated connection: ${connectionKey}`);
                this.connections.delete(connectionKey);
              }

              reject(err);
            } else {
              const columns = stmt.getColumns().map((col: any) => col.getName());
              const executionTime = (Date.now() - startTime) / 1000;

              console.log(`[Snowflake-Notification] ✅ Query complete for ${connectionKey} [${authMethod}]: ${rows.length} rows in ${executionTime.toFixed(2)}s`);

              resolve({ columns, rows, executionTime, rowCount: rows.length });
            }
          },
        });
      });
    } catch (error: any) {
      this.connections.delete(connectionKey);
      throw error;
    }
  }

  public static async getConnectionStatus(requestedUsername?: string, oauthToken?: string) {
    const username = this.resolveUsername(requestedUsername, oauthToken);
    const connectionKey = this.buildConnectionKey(username, oauthToken);
    const state = this.connections.get(connectionKey);
    const now = Date.now();

    return {
      isConnected: state?.isConnected || false,
      isConnecting: state?.isConnecting || false,
      username: requestedUsername || 'system',
      snowflakeUser: username,
      authMethod: oauthToken ? 'OAUTH' : 'JWT',
      lastUsed: state?.lastUsed || 0,
      lastQueryTime: state?.lastQueryTime || 0,
      timeSinceLastQuery: state ? now - state.lastQueryTime : 0,
    };
  }

  private static async disconnectByKey(connectionKey: string): Promise<void> {
    const state = this.connections.get(connectionKey);
    if (!state) return;

    return new Promise<void>((resolve) => {
      state.connection.destroy((err) => {
        this.connections.delete(connectionKey);
        if (err) console.error(`[Snowflake-Notification] Error disconnecting ${connectionKey}:`, err.message);
        else console.log(`[Snowflake-Notification] ✅ Disconnected: ${connectionKey}`);
        resolve();
      });
    });
  }

  public static async disconnect(requestedUsername?: string, oauthToken?: string): Promise<void> {
    const username = this.resolveUsername(requestedUsername, oauthToken);
    const connectionKey = this.buildConnectionKey(username, oauthToken);
    await this.disconnectByKey(connectionKey);
  }

  public static async disconnectAll(): Promise<void> {
    console.log(`[Snowflake-Notification] Disconnecting all ${this.connections.size} connections...`);

    const promises = Array.from(this.connections.entries()).map(([key, state]) =>
      new Promise<void>((resolve) => {
        state.connection.destroy((err) => {
          if (err) console.error(`[Snowflake-Notification] Error disconnecting ${key}:`, err.message);
          else console.log(`[Snowflake-Notification] Disconnected: ${key}`);
          resolve();
        });
      })
    );

    await Promise.allSettled(promises);
    this.connections.clear();
    console.log('[Snowflake-Notification] All connections closed.');
  }

  public static getPoolStats() {
    const now = Date.now();
    const connections = Array.from(this.connections.entries()).map(([key, state]) => ({
      connectionKey: key,
      isConnected: state.isConnected,
      isConnecting: state.isConnecting,
      lastUsed: state.lastUsed,
      lastQueryTime: state.lastQueryTime,
      timeSinceLastQuery: now - state.lastQueryTime,
    }));

    return {
      totalConnections: connections.length,
      activeConnections: connections.filter(c => c.isConnected).length,
      connections,
    };
  }
  // 

  public static manualCleanup(): void {
    console.log('[Snowflake-Notification] Manual cleanup triggered');
    this.cleanupStaleConnections();
  }
}

export default SnowflakeNotificationManager;