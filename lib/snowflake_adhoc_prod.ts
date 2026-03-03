// lib/snowflake_adhoc_prod.ts
import snowflake, { Connection, Statement } from 'snowflake-sdk';

interface QueryResult {
  columns: string[];
  rows: any[];
  executionTime: number;
  rowCount: number;
}

/**
 * SnowflakeConnectionManager - Pool-based connection manager with per-user authentication
 * For ADHOC warehouse/database queries with JWT refresh support
 */
class SnowflakeConnectionManager {
  private static connectionPool: Map<string, Connection> = new Map();
  private static connectingUsers: Set<string> = new Set();
  private static connectedUsers: Map<string, number> = new Map(); // Store connection creation time
  private static connectionLocks: Map<string, Promise<Connection>> = new Map();
  
  // Connection timeout settings
  private static readonly CONNECTION_TIMEOUT_MS = 60000; // 60 seconds
  private static readonly REQUEST_TIMEOUT_MS = 300000; // 5 minutes for query execution
  private static readonly MAX_IDLE_TIME_MS = 300000; // 5 minutes
  
  // ✅ JWT SPECIFIC SETTINGS
  private static readonly JWT_REFRESH_THRESHOLD_MS = 55 * 60 * 1000; // Refresh after 55 minutes (JWT expires in 60 min)
  private static readonly MAX_CONNECTION_AGE_MS = 50 * 60 * 1000; // Max connection age 50 minutes
  private static lastUsedTime: Map<string, number> = new Map();
  private static connectionCreationTime: Map<string, number> = new Map();

  /**
   * Map app username to Snowflake username
   */
  private static mapToSnowflakeUsername(appUsername?: string): string {
    if (!appUsername) {
      return process.env.SNOWFLAKE_USERNAME || 'DEFAULT_USER';
    }

    const usernameMap: Record<string, string> = {
      'safnas': 'SAFNAS',
      'safnas@slmobility.com': 'SAFNAS',
      'hansika': 'HANSIKAAIT',
      'Hansikaait': 'HANSIKAAIT',
      'hansika@slmobility.com': 'HANSIKAAIT',
      'Oshani': 'OSHANIQA',
      'oshaniqa': 'OSHANIQA',
      'oshani@slmobility.com': 'OSHANIQA',
      'rasika@slmobility.com': 'RASIKA',
      'rasika': 'RASIKA',
      'rasikafac': 'RASIKA',
      'zainab': 'ZAINAB',
      'zainabqanew': 'ZAINAB',
      'zainab@slmobility.com': 'ZAINAB',
      'Zainab Jiffry': 'ZAINAB',
      'nayanaka': 'NAYANAKA',
      'nayanaka buddhi': 'NAYANAKA',
      'nayanakabuddhi@gmail.com': 'NAYANAKA',
      'fedinusha': 'DINUSHA',
      'mafazfec': 'MAFAZ',
      'mafaz': 'MAFAZ',
      'mafaz@slmobility.com': 'MAFAZ',
      'zaidFaiz': 'ZAID',
      'zaid@slmobility.com': 'ZAID',
      'janakaudara': 'JANAKA',
      'udara@slmobility.com': 'JANAKA',
      'aitadmin': 'janaka',
      'janaka@ascensionit.com.au': 'JANAKA',
      'dinusha@slmobility.com': 'DINUSHA',
      'dinusha jayakody': 'DINUSHA',
      'dinusha': 'DINUSHA',
      'Rifkhansiddeek': 'RIFKHAN',
      'rifkhan@slmobility.com': 'RIFKHAN',
      'authenticated-user': process.env.SNOWFLAKE_USERNAME || 'DEFAULT_USER',
      'authenticated user': process.env.SNOWFLAKE_USERNAME || 'DEFAULT_USER',
    };

    const normalizedUsername = appUsername.toLowerCase();
    const mapped = usernameMap[normalizedUsername] || 
                   usernameMap[appUsername] || 
                   process.env.SNOWFLAKE_USERNAME;

    console.log(`🔍 [ADHOC] Username mapping: "${appUsername}" → "${mapped}"`);
    return mapped || process.env.SNOWFLAKE_USERNAME!;
  }

  /**
   * Create connection for specific user
   */
  private static createConnection(username?: string): Connection {
    const snowflakeUsername = this.mapToSnowflakeUsername(username);
    const privateKey = process.env.SNOWFLAKE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!privateKey) {
      throw new Error('SNOWFLAKE_PRIVATE_KEY environment variable is not set');
    }
    if (!process.env.SNOWFLAKE_ACCOUNT) {
      throw new Error('SNOWFLAKE_ACCOUNT environment variable is not set');
    }

    console.log(`🔌 [ADHOC] Creating Snowflake connection for user: ${snowflakeUsername}`);

    return snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: snowflakeUsername,
      privateKey: privateKey,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'ADHOC',
      database: process.env.SNOWFLAKE_DATABASE || 'ADHOC',
      schema: process.env.SNOWFLAKE_SCHEMA || 'PUBLIC',
      role: process.env.SNOWFLAKE_ROLE || 'ACCOUNTADMIN',
      authenticator: 'SNOWFLAKE_JWT',
      timeout: this.CONNECTION_TIMEOUT_MS,
      application: 'SLM_Dashboard_AdHoc',
      clientSessionKeepAlive: true,
      clientSessionKeepAliveHeartbeatFrequency: 3600,
      sessionParameters: {
        STATEMENT_TIMEOUT_IN_SECONDS: 3600,  // 1 hour
        STATEMENT_QUEUED_TIMEOUT_IN_SECONDS: 0,
      }
    });
  }

  /**
   * Check if connection needs refresh (JWT expiration)
   */
  private static needsRefresh(connectionKey: string): boolean {
    const creationTime = this.connectionCreationTime.get(connectionKey);
    if (!creationTime) return true;
    
    const age = Date.now() - creationTime;
    const needsRefresh = age > this.JWT_REFRESH_THRESHOLD_MS;
    
    if (needsRefresh) {
      console.log(`⚠️ [ADHOC] Connection for ${connectionKey} is ${Math.round(age/1000/60)} minutes old, needs refresh`);
    }
    
    return needsRefresh;
  }

  /**
   * Validate connection with simple query
   */
  private static async validateConnection(connection: Connection, connectionKey: string): Promise<boolean> {
    return new Promise((resolve) => {
      connection.execute({
        sqlText: 'SELECT 1',
        complete: (err: any) => {
          if (err) {
            console.log(`❌ [ADHOC] Connection validation failed for ${connectionKey}:`, err.message);
            resolve(false);
          } else {
            console.log(`✅ [ADHOC] Connection validation passed for ${connectionKey}`);
            resolve(true);
          }
        }
      });
    });
  }

  /**
   * Get or create connection for specific user with JWT refresh
   */
  private static async getConnection(username?: string): Promise<Connection> {
    const snowflakeUsername = this.mapToSnowflakeUsername(username);
    const connectionKey = snowflakeUsername;

    // Clean up idle connections periodically
    this.cleanupIdleConnections();

    // Check if there's an existing connection attempt
    if (this.connectionLocks.has(connectionKey)) {
      console.log(`⏳ [ADHOC] Waiting for existing connection attempt: ${snowflakeUsername}`);
      return this.connectionLocks.get(connectionKey)!;
    }

    // Check if existing connection needs refresh
    const existingConnection = this.connectionPool.get(connectionKey);
    if (existingConnection && this.connectedUsers.has(connectionKey)) {
      if (this.needsRefresh(connectionKey)) {
        console.log(`🔄 [ADHOC] Refreshing connection for ${snowflakeUsername} (JWT expiration)`);
        
        const refreshPromise = this.refreshConnection(connectionKey, username);
        this.connectionLocks.set(connectionKey, refreshPromise);
        
        try {
          const newConnection = await refreshPromise;
          return newConnection;
        } finally {
          this.connectionLocks.delete(connectionKey);
        }
      } else {
        // Validate connection before reuse
        const isValid = await this.validateConnection(existingConnection, connectionKey);
        if (!isValid) {
          console.log(`🔄 [ADHOC] Connection invalid, refreshing for ${snowflakeUsername}`);
          const refreshPromise = this.refreshConnection(connectionKey, username);
          this.connectionLocks.set(connectionKey, refreshPromise);
          
          try {
            const newConnection = await refreshPromise;
            return newConnection;
          } finally {
            this.connectionLocks.delete(connectionKey);
          }
        }
        
        console.log(`♻️  [ADHOC] Reusing connection for user: ${snowflakeUsername}`);
        this.lastUsedTime.set(connectionKey, Date.now());
        return existingConnection;
      }
    }

    // Create new connection
    const connectionPromise = this.createNewConnection(connectionKey, username);
    this.connectionLocks.set(connectionKey, connectionPromise);
    
    try {
      const connection = await connectionPromise;
      return connection;
    } finally {
      this.connectionLocks.delete(connectionKey);
    }
  }

  /**
   * Refresh existing connection
   */
  private static async refreshConnection(
    connectionKey: string, 
    username?: string
  ): Promise<Connection> {
    console.log(`🔄 [ADHOC] Refreshing connection for: ${connectionKey}`);
    
    // Close old connection
    const oldConnection = this.connectionPool.get(connectionKey);
    if (oldConnection) {
      try {
        await new Promise<void>((resolve) => {
          oldConnection.destroy((err) => {
            if (err) console.error(`Error closing old connection for ${connectionKey}:`, err);
            else console.log(`✅ [ADHOC] Closed old connection: ${connectionKey}`);
            resolve();
          });
        });
      } catch (error) {
        console.error(`Error during old connection cleanup:`, error);
      }
    }
    
    // Remove old entries
    this.connectionPool.delete(connectionKey);
    this.connectedUsers.delete(connectionKey);
    this.connectionCreationTime.delete(connectionKey);
    this.lastUsedTime.delete(connectionKey);
    
    // Create new connection
    return this.createNewConnection(connectionKey, username);
  }

  /**
   * Create new connection
   */
  private static async createNewConnection(
    connectionKey: string,
    username?: string
  ): Promise<Connection> {
    console.log(`🔌 [ADHOC] Creating new connection for: ${connectionKey}`);
    
    if (this.connectingUsers.has(connectionKey)) {
      console.log(`⏳ [ADHOC] Connection already in progress for: ${connectionKey}`);
      await this.waitForConnection(connectionKey);
      return this.connectionPool.get(connectionKey)!;
    }
    
    this.connectingUsers.add(connectionKey);
    const connection = this.createConnection(username);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Connection timeout for user: ${connectionKey}`));
        }, this.CONNECTION_TIMEOUT_MS);

        connection.connect((err) => {
          clearTimeout(timeoutId);
          this.connectingUsers.delete(connectionKey);

          if (err) {
            console.error(`❌ [ADHOC] Failed to connect for user ${connectionKey}:`, err.message);
            console.error(`[ADHOC] Error details:`, {
              code: err.code,
              sqlState: err.sqlState,
              message: err.message
            });
            return reject(err);
          }

          const creationTime = Date.now();
          this.connectedUsers.set(connectionKey, creationTime);
          this.connectionPool.set(connectionKey, connection);
          this.connectionCreationTime.set(connectionKey, creationTime);
          this.lastUsedTime.set(connectionKey, creationTime);
          console.log(`✅ [ADHOC] Connection established for user: ${connectionKey} (JWT expires in 60 minutes)`);
          resolve();
        });
      });

      return connection;
    } catch (error) {
      this.connectingUsers.delete(connectionKey);
      this.connectionPool.delete(connectionKey);
      this.connectedUsers.delete(connectionKey);
      this.connectionCreationTime.delete(connectionKey);
      throw error;
    }
  }

  /**
   * Wait for an in-progress connection
   */
  private static async waitForConnection(connectionKey: string): Promise<void> {
    const maxWaitTime = this.CONNECTION_TIMEOUT_MS;
    const startTime = Date.now();

    while (this.connectingUsers.has(connectionKey)) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error(`Timeout waiting for connection: ${connectionKey}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!this.connectedUsers.has(connectionKey)) {
      throw new Error(`Connection failed for: ${connectionKey}`);
    }
  }

  /**
   * Clean up idle connections
   */
  private static cleanupIdleConnections(): void {
    const now = Date.now();
    const connectionsToRemove: string[] = [];

    // Check idle connections
    for (const [key, lastUsed] of this.lastUsedTime.entries()) {
      if (now - lastUsed > this.MAX_IDLE_TIME_MS) {
        console.log(`🧹 [ADHOC] Cleaning up idle connection: ${key} (${Math.round((now - lastUsed)/1000)}s idle)`);
        connectionsToRemove.push(key);
      }
    }

    // Check connections older than max age
    for (const [key, creationTime] of this.connectionCreationTime.entries()) {
      const age = now - creationTime;
      if (age > this.MAX_CONNECTION_AGE_MS) {
        console.log(`🧹 [ADHOC] Cleaning up old connection: ${key} (${Math.round(age/1000/60)} minutes old)`);
        connectionsToRemove.push(key);
      }
    }

    for (const key of [...new Set(connectionsToRemove)]) {
      this.closeConnection(key);
    }
  }

  /**
   * Close specific connection
   */
  private static closeConnection(key: string): void {
    const connection = this.connectionPool.get(key);
    if (connection) {
      try {
        connection.destroy((err) => {
          if (err) console.error(`[ADHOC] Error destroying connection ${key}:`, err);
          else console.log(`✅ [ADHOC] Closed connection: ${key}`);
        });
      } catch (error) {
        console.error(`[ADHOC] Error destroying connection ${key}:`, error);
      }
    }
    this.connectionPool.delete(key);
    this.connectedUsers.delete(key);
    this.connectionCreationTime.delete(key);
    this.lastUsedTime.delete(key);
  }

  /**
   * Execute a SQL query with username context
   */
  public static async executeQuery(
    sql: string,
    requestedUsername?: string,
    addAuditComment: boolean = true
  ): Promise<QueryResult> {
    const snowflakeUsername = this.mapToSnowflakeUsername(requestedUsername);
    const auditComment = addAuditComment 
      ? `-- Executed by: ${requestedUsername || 'anonymous'} (Snowflake user: ${snowflakeUsername})\n`
      : '';
    const finalSql = `${auditComment}${sql}`;
    
    console.log(`📊 [ADHOC] Executing query for: ${requestedUsername || 'anonymous'} → ${snowflakeUsername}`);
    
    const connection = await this.getConnection(requestedUsername);

    return new Promise<QueryResult>((resolve, reject) => {
      const startTime = Date.now();

      connection.execute({
        sqlText: finalSql,
        timeout: this.REQUEST_TIMEOUT_MS,
        complete: (execErr: any, stmt: Statement, rows: any[]) => {
          if (execErr) {
            console.error(`❌ [ADHOC] Query execution failed for ${snowflakeUsername}:`, execErr.message);
            
            // If JWT or connection error, remove from pool
            if (execErr.code === '390144' || execErr.message?.includes('JWT token is invalid') || 
                execErr.code === '405503' || execErr.message?.includes('terminated')) {
              console.log(`🔄 [ADHOC] JWT/Connection error detected, invalidating connection for ${snowflakeUsername}`);
              const connectionKey = snowflakeUsername;
              this.closeConnection(connectionKey);
            }
            
            return reject(execErr);
          }

          const columns = stmt.getColumns()?.map((col) => col.getName()) || [];
          const executionTime = (Date.now() - startTime) / 1000;

          // Update last used time
          const connectionKey = snowflakeUsername;
          this.lastUsedTime.set(connectionKey, Date.now());

          console.log(`✅ [ADHOC] Query completed for ${snowflakeUsername}: ${rows.length} rows in ${executionTime.toFixed(2)}s`);
          
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

  /**
   * Get connection status for monitoring
   */
  public static async getConnectionStatus(requestedUsername?: string): Promise<{
    isConnected: boolean;
    isConnecting: boolean;
    username: string;
    snowflakeUser: string;
    appUser?: string;
    lastUsed: number;
    lastQueryTime: number;
    timeSinceLastQuery: number;
    connectionAgeMinutes?: number;
  }> {
    const snowflakeUsername = this.mapToSnowflakeUsername(requestedUsername);
    const connectionKey = snowflakeUsername;
    const now = Date.now();
    const lastUsed = this.lastUsedTime.get(connectionKey) || 0;
    const creationTime = this.connectionCreationTime.get(connectionKey);

    return {
      isConnected: this.connectedUsers.has(connectionKey),
      isConnecting: this.connectingUsers.has(connectionKey),
      username: requestedUsername || 'system',
      snowflakeUser: snowflakeUsername,
      appUser: requestedUsername,
      lastUsed: lastUsed,
      lastQueryTime: lastUsed,
      timeSinceLastQuery: lastUsed ? now - lastUsed : 0,
      connectionAgeMinutes: creationTime ? Math.round((now - creationTime) / 1000 / 60) : undefined,
    };
  }

  /**
   * Manually connect (for pre-warming connection)
   */
  public static async connect(requestedUsername?: string): Promise<void> {
    await this.getConnection(requestedUsername);
  }

  /**
   * Disconnect specific user
   */
  public static async disconnect(requestedUsername?: string): Promise<void> {
    const snowflakeUsername = this.mapToSnowflakeUsername(requestedUsername);
    const connectionKey = snowflakeUsername;
    
    const connection = this.connectionPool.get(connectionKey);
    if (!connection) {
      console.log(`[ADHOC] No connection found for ${snowflakeUsername}`);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      connection.destroy((err) => {
        this.connectionPool.delete(connectionKey);
        this.connectedUsers.delete(connectionKey);
        this.connectionCreationTime.delete(connectionKey);
        this.lastUsedTime.delete(connectionKey);
        
        if (err) {
          console.error(`[ADHOC] Error disconnecting ${snowflakeUsername}:`, err.message);
          reject(err);
        } else {
          console.log(`✅ [ADHOC] Disconnected ${snowflakeUsername}`);
          resolve();
        }
      });
    });
  }

  /**
   * Disconnect all connections
   */
  public static async disconnectAll(): Promise<void> {
    console.log(`[ADHOC] Disconnecting all ${this.connectionPool.size} connections...`);
    
    const disconnectPromises = Array.from(this.connectionPool.entries()).map(([key, connection]) =>
      new Promise<void>((resolve) => {
        connection.destroy((err) => {
          if (err) {
            console.error(`[ADHOC] Error disconnecting ${key}:`, err.message);
          } else {
            console.log(`[ADHOC] Disconnected ${key}`);
          }
          resolve();
        });
      })
    );

    await Promise.allSettled(disconnectPromises);
    
    this.connectionPool.clear();
    this.connectedUsers.clear();
    this.connectingUsers.clear();
    this.connectionCreationTime.clear();
    this.lastUsedTime.clear();
    this.connectionLocks.clear();
    
    console.log('[ADHOC] All connections closed.');
  }

  /**
   * Get connection pool stats for monitoring
   */
  public static getPoolStats(): {
    totalConnections: number;
    activeConnections: number;
    connections: Array<{
      snowflakeUser: string;
      isConnected: boolean;
      isConnecting: boolean;
      lastUsed: number;
      lastQueryTime: number;
      timeSinceLastQuery: number;
      ageMinutes: number;
    }>;
  } {
    const now = Date.now();
    const connections = Array.from(this.connectionPool.keys()).map(key => {
      const creationTime = this.connectionCreationTime.get(key) || 0;
      return {
        snowflakeUser: key,
        isConnected: this.connectedUsers.has(key),
        isConnecting: this.connectingUsers.has(key),
        lastUsed: this.lastUsedTime.get(key) || 0,
        lastQueryTime: this.lastUsedTime.get(key) || 0,
        timeSinceLastQuery: this.lastUsedTime.has(key) ? now - this.lastUsedTime.get(key)! : 0,
        ageMinutes: creationTime ? Math.round((now - creationTime) / 1000 / 60) : 0,
      };
    });

    return {
      totalConnections: this.connectionPool.size,
      activeConnections: this.connectedUsers.size,
      connections,
    };
  }

  /**
   * Manual cleanup trigger
   */
  public static manualCleanup(): void {
    console.log('[ADHOC] Manual cleanup triggered');
    this.cleanupIdleConnections();
  }
}

export default SnowflakeConnectionManager;