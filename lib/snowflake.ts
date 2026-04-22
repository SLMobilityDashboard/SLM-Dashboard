import snowflake, { Connection, Statement } from 'snowflake-sdk';

interface QueryResult {
  columns: string[];
  rows: any[];
  executionTime: number;
  rowCount: number;
}

/**
 * SnowflakeConnectionManager - Pool-based connection manager with JWT refresh
 */
class SnowflakeConnectionManager {
  private static connectionPool: Map<string, Connection> = new Map();
  private static connectingUsers: Set<string> = new Set();
  private static connectedUsers: Map<string, number> = new Map(); // Store connection creation time
  private static connectionLocks: Map<string, Promise<Connection>> = new Map();
  
  // ✅ INCREASED TIMEOUT SETTINGS
  private static readonly CONNECTION_TIMEOUT_MS = 180000; // 3 minutes
  private static readonly REQUEST_TIMEOUT_MS = 600000; // 10 minutes for query execution
  private static readonly LOGIN_TIMEOUT_MS = 120000; // 2 minutes for login
  private static readonly MAX_IDLE_TIME_MS = 300000; // 5 minutes - auto-close idle connections
  
  // ✅ JWT SPECIFIC SETTINGS
  private static readonly JWT_REFRESH_THRESHOLD_MS = 55 * 60 * 1000; // Refresh after 55 minutes (JWT typically expires in 1 hour)
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
      'Ashan': 'ASHANSLM',
      'ashanslm': 'ASHANSLM',
      'ashan@slmobility.com': 'ASHANSLM',
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

    console.log(`🔍 Username mapping: "${appUsername}" → "${mapped}"`);
    return mapped || process.env.SNOWFLAKE_USERNAME!;
  }

  /**
   * Create connection with INCREASED TIMEOUTS
   */
  private static createConnection(username?: string): Connection {
    const snowflakeUsername = this.mapToSnowflakeUsername(username);
    const privateKey = process.env.SNOWFLAKE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!privateKey) throw new Error('SNOWFLAKE_PRIVATE_KEY not set');
    if (!process.env.SNOWFLAKE_ACCOUNT) throw new Error('SNOWFLAKE_ACCOUNT not set');

    console.log(`🔌 Creating new connection for: ${snowflakeUsername}`);
    console.log(`⏱️  Timeouts: Connection=3min, Query=10min, Warehouse=1hour`);

    return snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: snowflakeUsername,
      privateKey: privateKey,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'AIDASHBOARD',
      database: 'DB_DUMP',
      schema: 'PUBLIC',
      role: 'SYSADMIN',
      authenticator: 'SNOWFLAKE_JWT',
      
      // ✅ SDK timeouts
      timeout: this.CONNECTION_TIMEOUT_MS,
      loginTimeout: this.LOGIN_TIMEOUT_MS,
      requestTimeout: this.REQUEST_TIMEOUT_MS,
      
      // ✅ Keep alive
      clientSessionKeepAlive: true,
      clientSessionKeepAliveHeartbeatFrequency: 3600,
      
      // ✅ CRITICAL: Set Snowflake warehouse timeout in session
      sessionParameters: {
        STATEMENT_TIMEOUT_IN_SECONDS: 3600,  // 1 hour
        STATEMENT_QUEUED_TIMEOUT_IN_SECONDS: 0,  // No queue timeout
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
      console.log(`⚠️ Connection for ${connectionKey} is ${Math.round(age/1000/60)} minutes old, needs refresh`);
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
            console.log(`❌ Connection validation failed for ${connectionKey}:`, err.message);
            resolve(false);
          } else {
            console.log(`✅ Connection validation passed for ${connectionKey}`);
            resolve(true);
          }
        }
      });
    });
  }

  /**
   * Get or create connection with JWT refresh logic
   */
  private static async getConnection(username?: string): Promise<Connection> {
    const snowflakeUsername = this.mapToSnowflakeUsername(username);
    const connectionKey = snowflakeUsername;

    // ✅ Clean up idle connections
    this.cleanupIdleConnections();

    // ✅ Check if we have a connection in progress
    if (this.connectionLocks.has(connectionKey)) {
      console.log(`⏳ Waiting for existing connection attempt: ${snowflakeUsername}`);
      return this.connectionLocks.get(connectionKey)!;
    }

    // ✅ Check if existing connection needs refresh
    const existingConnection = this.connectionPool.get(connectionKey);
    if (existingConnection && this.connectedUsers.has(connectionKey)) {
      if (this.needsRefresh(connectionKey)) {
        console.log(`🔄 Refreshing connection for ${snowflakeUsername} (JWT expiration)`);
        
        // Create refresh promise
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
          console.log(`🔄 Connection invalid, refreshing for ${snowflakeUsername}`);
          const refreshPromise = this.refreshConnection(connectionKey, username);
          this.connectionLocks.set(connectionKey, refreshPromise);
          
          try {
            const newConnection = await refreshPromise;
            return newConnection;
          } finally {
            this.connectionLocks.delete(connectionKey);
          }
        }
        
        console.log(`♻️  Reusing connection for: ${snowflakeUsername}`);
        this.lastUsedTime.set(connectionKey, Date.now());
        return existingConnection;
      }
    }

    // ✅ Create new connection
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
    console.log(`🔄 Refreshing connection for: ${connectionKey}`);
    
    // Close old connection
    const oldConnection = this.connectionPool.get(connectionKey);
    if (oldConnection) {
      try {
        await new Promise<void>((resolve) => {
          oldConnection.destroy((err) => {
            if (err) console.error(`Error closing old connection for ${connectionKey}:`, err);
            else console.log(`✅ Closed old connection: ${connectionKey}`);
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
    console.log(`🔌 Creating new connection for: ${connectionKey}`);
    
    if (this.connectingUsers.has(connectionKey)) {
      console.log(`⏳ Connection already in progress for: ${connectionKey}`);
      await this.waitForConnection(connectionKey);
      return this.connectionPool.get(connectionKey)!;
    }
    
    this.connectingUsers.add(connectionKey);
    const connection = this.createConnection(username);

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

          const creationTime = Date.now();
          this.connectedUsers.set(connectionKey, creationTime);
          this.connectionPool.set(connectionKey, connection);
          this.connectionCreationTime.set(connectionKey, creationTime);
          this.lastUsedTime.set(connectionKey, creationTime);
          console.log(`✅ Connected: ${connectionKey} (JWT will expire in 60 minutes)`);
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
   * Wait for in-progress connection
   */
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

  /**
   * Auto-cleanup: Close connections idle for 5+ minutes
   */
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

    // Also check for connections older than max age
    for (const [key, creationTime] of this.connectionCreationTime.entries()) {
      const age = now - creationTime;
      if (age > this.MAX_CONNECTION_AGE_MS) {
        console.log(`🧹 Closing old connection (${Math.round(age/1000/60)} minutes old): ${key}`);
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
          if (err) console.error(`Error destroying ${key}:`, err);
          else console.log(`✅ Closed: ${key}`);
        });
      } catch (error) {
        console.error(`Error destroying ${key}:`, error);
      }
    }
    this.connectionPool.delete(key);
    this.connectedUsers.delete(key);
    this.connectionCreationTime.delete(key);
    this.lastUsedTime.delete(key);
  }

  /**
   * Execute query with 10-minute timeout
   */
  public static async executeQuery(
    sql: string,
    requestedUsername?: string,
    addAuditComment: boolean = true
  ): Promise<QueryResult> {
    const snowflakeUsername = this.mapToSnowflakeUsername(requestedUsername);
    const auditComment = addAuditComment 
      ? `-- Executed by: ${requestedUsername || 'anonymous'} (SF user: ${snowflakeUsername})\n`
      : '';
    const finalSql = `${auditComment}${sql}`;
    
    console.log(`📊 Executing query for: ${requestedUsername || 'anon'} → ${snowflakeUsername}`);
    console.log(`⏱️  Max query time: 10 minutes`);
    
    const connection = await this.getConnection(requestedUsername);

    return new Promise<QueryResult>((resolve, reject) => {
      const startTime = Date.now();

      connection.execute({
        sqlText: finalSql,
        timeout: this.REQUEST_TIMEOUT_MS,
        complete: (execErr: any, stmt: Statement, rows: any[]) => {
          const duration = Date.now() - startTime;
          
          if (execErr) {
            // Check if error is JWT related
            if (execErr.code === '390144' || execErr.message?.includes('JWT')) {
              console.log(`🔄 JWT error detected, invalidating connection for ${snowflakeUsername}`);
              this.closeConnection(snowflakeUsername);
            }
            
            console.error(`❌ Query failed for ${snowflakeUsername}:`, execErr.message);
            console.error(`Code: ${execErr.code}, Duration: ${duration}ms`);
            return reject(execErr);
          }

          const columns = stmt.getColumns()?.map((col) => col.getName()) || [];
          const executionTime = duration / 1000;

          console.log(`✅ Query complete for ${snowflakeUsername}: ${rows.length} rows in ${executionTime.toFixed(2)}s`);
          
          // ✅ Update last used time (keeps connection alive)
          this.lastUsedTime.set(snowflakeUsername, Date.now());
          
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
   * Get pool stats
   */
  public static getPoolStats(): {
    activeConnections: number;
    connectingUsers: number;
    pooledUsers: string[];
    idleConnections: { user: string; idleSeconds: number }[];
    connectionAges: { user: string; ageMinutes: number }[];
  } {
    const now = Date.now();
    const idleConnections = Array.from(this.lastUsedTime.entries()).map(([user, lastUsed]) => ({
      user,
      idleSeconds: Math.round((now - lastUsed) / 1000)
    }));

    const connectionAges = Array.from(this.connectionCreationTime.entries()).map(([user, created]) => ({
      user,
      ageMinutes: Math.round((now - created) / 1000 / 60)
    }));

    return {
      activeConnections: this.connectedUsers.size,
      connectingUsers: this.connectingUsers.size,
      pooledUsers: Array.from(this.connectedUsers.keys()),
      idleConnections,
      connectionAges,
    };
  }

  /**
   * Close all connections (shutdown)
   */
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
    this.connectionCreationTime.clear();
    this.lastUsedTime.clear();
    this.connectionLocks.clear();
    
    console.log('✅ All connections closed');
  }
}

export default SnowflakeConnectionManager;