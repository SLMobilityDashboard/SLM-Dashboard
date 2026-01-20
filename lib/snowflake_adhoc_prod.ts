// lib/snowflake_adhoc_prod.ts
import snowflake from 'snowflake-sdk';

interface ConnectionState {
  connection: snowflake.Connection;
  isConnecting: boolean;
  isConnected: boolean;
  lastUsed: number;
  lastQueryTime: number;
}

class SnowflakeConnectionManager {
  private static connections: Map<string, ConnectionState> = new Map();
  private static readonly CONNECTION_TIMEOUT = 10 * 1000;
  private static readonly CLEANUP_INTERVAL = 30 * 1000;
  private static readonly CONNECTION_TIMEOUT_MS = 60000; // 60 seconds

  private static initializeCleanup() {
    if (!(global as any).snowflakeCleanupInitialized) {
      setInterval(() => {
        this.cleanupStaleConnections();
      }, this.CLEANUP_INTERVAL);
      (global as any).snowflakeCleanupInitialized = true;
      console.log('[Snowflake] Cleanup interval initialized');
    }
  }

  private static normalizeUsername(username?: string): string {
    if (!username) {
      const envUsername = process.env.SNOWFLAKE_USERNAME;
      if (!envUsername) {
        throw new Error('No Snowflake username provided and SNOWFLAKE_USERNAME environment variable is not set');
      }
      return envUsername.toLowerCase();
    }
    return username.toLowerCase();
  }

  private static cleanupStaleConnections(): void {
    const now = Date.now();
    const connectionsToClean: string[] = [];
    
    for (const [username, state] of this.connections.entries()) {
      const timeSinceLastQuery = now - state.lastQueryTime;
      
      if (timeSinceLastQuery > this.CONNECTION_TIMEOUT) {
        console.log(`[Snowflake] Marking stale connection for cleanup: ${username} (inactive for ${(timeSinceLastQuery / 1000).toFixed(1)}s)`);
        connectionsToClean.push(username);
      }
    }
    
    for (const username of connectionsToClean) {
      if (this.connections.has(username)) {
        this.disconnect(username).catch(err => {
          console.error(`[Snowflake] Error cleaning up stale connection for ${username}:`, err.message);
        });
      }
    }
  }

  private static isConnectionTerminated(connection: snowflake.Connection): boolean {
    try {
      const state = (connection as any)._state;
      return state === 'TERMINATED' || state === 'DESTROYED' || state === 'DISCONNECTED';
    } catch (error) {
      return true;
    }
  }

  public static async getConnection(requestedUsername?: string): Promise<snowflake.Connection> {
    this.initializeCleanup();
    
    const snowflakeUsername = this.normalizeUsername(requestedUsername);
    let state = this.connections.get(snowflakeUsername);

    if (state && this.isConnectionTerminated(state.connection)) {
      console.log(`[Snowflake] Connection terminated for ${snowflakeUsername}, will create new one`);
      this.connections.delete(snowflakeUsername);
      state = undefined;
    }

    if (!state) {
      console.log(`🔌 Creating Snowflake connection for user: ${snowflakeUsername}`);
      if (requestedUsername) {
        console.log(`[Snowflake] Requested by app user: ${requestedUsername}`);
      }

      // Validate environment variables
      const account = process.env.SNOWFLAKE_ACCOUNT;
      const username = process.env.SNOWFLAKE_USERNAME;
      const privateKeyRaw = process.env.SNOWFLAKE_PRIVATE_KEY;
      const warehouse = process.env.SNOWFLAKE_WAREHOUSE || 'ADHOC';
      const database = process.env.SNOWFLAKE_DATABASE || 'ADHOC';
      const schema = process.env.SNOWFLAKE_SCHEMA || 'PUBLIC';
      const role = process.env.SNOWFLAKE_ROLE || 'ACCOUNTADMIN';

      if (!account) {
        throw new Error('SNOWFLAKE_ACCOUNT environment variable is not set');
      }
      if (!username) {
        throw new Error('SNOWFLAKE_USERNAME environment variable is not set');
      }
      if (!privateKeyRaw) {
        throw new Error('SNOWFLAKE_PRIVATE_KEY environment variable is not set');
      }

      // Process private key - replace literal \n with actual newlines
      const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

      console.log(`[Snowflake] Connection config:`, {
        account,
        username,
        warehouse,
        database,
        schema,
        role,
        authenticator: 'SNOWFLAKE_JWT',
        hasPrivateKey: !!privateKey,
        privateKeyLength: privateKey.length
      });

      const connection = snowflake.createConnection({
        account: account,
        username: username,
        privateKey: privateKey,
        authenticator: 'SNOWFLAKE_JWT', // THIS IS THE KEY!
        warehouse: warehouse,
        database: database,
        schema: schema,
        role: role,
        timeout: this.CONNECTION_TIMEOUT_MS,
        application: 'SLM_Dashboard',
        clientSessionKeepAlive: true,
        clientSessionKeepAliveHeartbeatFrequency: 3600,
      });

      state = {
        connection,
        isConnecting: false,
        isConnected: false,
        lastUsed: Date.now(),
        lastQueryTime: Date.now(),
      };

      this.connections.set(snowflakeUsername, state);
      console.log(`[Snowflake] Connection object created for ${snowflakeUsername}`);
    } else {
      state.lastUsed = Date.now();
      console.log(`[Snowflake] Reusing existing connection for Snowflake user: ${snowflakeUsername}`);
    }

    return state.connection;
  }

  public static async connect(requestedUsername?: string): Promise<void> {
    const snowflakeUsername = this.normalizeUsername(requestedUsername);
    let state = this.connections.get(snowflakeUsername);

    if (state && this.isConnectionTerminated(state.connection)) {
      console.log(`[Snowflake] Connection terminated for ${snowflakeUsername}, creating new connection`);
      this.connections.delete(snowflakeUsername);
      state = undefined;
    }

    const connection = await this.getConnection(requestedUsername);
    state = this.connections.get(snowflakeUsername)!;

    if (state.isConnected) {
      console.log(`[Snowflake] Already connected for user: ${snowflakeUsername}`);
      return;
    }

    if (state.isConnecting) {
      console.log(`[Snowflake] Connection already in progress for user: ${snowflakeUsername}...`);
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout after 30 seconds'));
        }, 30000);

        const interval = setInterval(() => {
          const currentState = this.connections.get(snowflakeUsername);
          if (currentState?.isConnected) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve();
          }
          if (!currentState?.isConnecting) {
            clearInterval(interval);
            clearTimeout(timeout);
            reject(new Error('Connection failed while waiting.'));
          }
        }, 100);
      });
      return;
    }

    state.isConnecting = true;
    console.log(`[Snowflake] Connecting for user: ${snowflakeUsername}...`);

    await new Promise<void>((resolve, reject) => {
      connection.connect((err) => {
        state!.isConnecting = false;
        if (err) {
          state!.isConnected = false;
          console.error(`[Snowflake] ❌ Failed to connect for ${snowflakeUsername}:`, err.message);
          console.error(`[Snowflake] Error details:`, {
            code: err.code,
            sqlState: err.sqlState,
            message: err.message
          });
          
          this.connections.delete(snowflakeUsername);
          return reject(err);
        }

        state!.isConnected = true;
        state!.lastUsed = Date.now();
        console.log(`[Snowflake] ✅ Connection established for ${snowflakeUsername}`);
        resolve();
      });
    });
  }

  public static async executeQuery(
    sql: string,
    requestedUsername?: string,
    addAuditComment: boolean = true
  ): Promise<{
    columns: string[];
    rows: any[];
    executionTime: number;
    rowCount: number;
  }> {
    const snowflakeUsername = this.normalizeUsername(requestedUsername);
    
    try {
      await this.connect(requestedUsername);
      const connection = await this.getConnection(requestedUsername);
      const state = this.connections.get(snowflakeUsername)!;

      let finalSql = sql;
      if (addAuditComment) {
        const auditUser = requestedUsername || snowflakeUsername;
        finalSql = `-- Executed by: ${auditUser}\n${sql}`;
      }

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
              console.error("[Snowflake] Query execution error:", err.message);
              
              if (err.code === 405503 || err.message.includes('terminated') || err.message.includes('Cannot connect')) {
                console.log(`[Snowflake] Removing terminated connection: ${snowflakeUsername}`);
                this.connections.delete(snowflakeUsername);
              }
              
              reject(err);
            } else {
              const columns = stmt.getColumns().map((col: any) => col.getName());
              const executionTime = (Date.now() - startTime) / 1000;
              
              console.log(`[Snowflake] Query completed in ${executionTime}s, returned ${rows.length} rows`);
              if (requestedUsername) {
                console.log(`[Snowflake] Executed by app user: ${requestedUsername}`);
              }
              
              resolve({
                columns,
                rows,
                executionTime,
                rowCount: rows.length,
              });
            }
          },
        });
      });
    } catch (error: any) {
      this.connections.delete(snowflakeUsername);
      throw error;
    }
  }

  public static async getConnectionStatus(requestedUsername?: string): Promise<{
    isConnected: boolean;
    isConnecting: boolean;
    username: string;
    snowflakeUser: string;
    appUser?: string;
    lastUsed: number;
    lastQueryTime: number;
    timeSinceLastQuery: number;
  }> {
    const snowflakeUsername = this.normalizeUsername(requestedUsername);
    const state = this.connections.get(snowflakeUsername);
    const now = Date.now();

    return {
      isConnected: state?.isConnected || false,
      isConnecting: state?.isConnecting || false,
      username: requestedUsername || 'system',
      snowflakeUser: snowflakeUsername,
      appUser: requestedUsername,
      lastUsed: state?.lastUsed || 0,
      lastQueryTime: state?.lastQueryTime || 0,
      timeSinceLastQuery: state ? now - state.lastQueryTime : 0,
    };
  }

  public static async disconnect(requestedUsername?: string): Promise<void> {
    const snowflakeUsername = this.normalizeUsername(requestedUsername);
    const state = this.connections.get(snowflakeUsername);
    
    if (!state) {
      console.log(`[Snowflake] No connection found for ${snowflakeUsername}`);
      return;
    }
    
    if (state.connection) {
      return new Promise<void>((resolve, reject) => {
        state.connection.destroy((err) => {
          this.connections.delete(snowflakeUsername);
          if (err) {
            console.error(`[Snowflake] Error disconnecting ${snowflakeUsername}:`, err.message);
            reject(err);
          } else {
            console.log(`[Snowflake] ✅ Disconnected ${snowflakeUsername}`);
            resolve();
          }
        });
      });
    } else {
      this.connections.delete(snowflakeUsername);
      console.log(`[Snowflake] Removed connection entry for ${snowflakeUsername}`);
    }
  }

  public static async disconnectAll(): Promise<void> {
    console.log(`[Snowflake] Disconnecting all ${this.connections.size} connections...`);
    
    const disconnectPromises = Array.from(this.connections.entries()).map(([username, state]) =>
      new Promise<void>((resolve) => {
        if (state.connection) {
          state.connection.destroy((err) => {
            if (err) {
              console.error(`[Snowflake] Error disconnecting ${username}:`, err.message);
            } else {
              console.log(`[Snowflake] Disconnected ${username}`);
            }
            resolve();
          });
        } else {
          resolve();
        }
      })
    );

    await Promise.allSettled(disconnectPromises);
    this.connections.clear();
    console.log('[Snowflake] All connections closed.');
  }

  public static getPoolStats() {
    const now = Date.now();
    const connections = Array.from(this.connections.entries()).map(([username, state]) => ({
      snowflakeUser: username,
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

  public static manualCleanup(): void {
    console.log('[Snowflake] Manual cleanup triggered');
    this.cleanupStaleConnections();
  }
}

export default SnowflakeConnectionManager;