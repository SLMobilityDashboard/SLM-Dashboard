import snowflake, { Connection, Statement } from 'snowflake-sdk';

interface QueryResult {
  columns: string[];
  rows: any[];
  executionTime: number;
  rowCount: number;
}

/**
 * SnowflakeConnectionManager - Pool-based connection manager
 * 
 * KEY FEATURES:
 * ✅ Increased timeouts (10min query, 3min connection)
 * ✅ Automatic idle connection cleanup (closes after 5min idle)
 * ✅ Connection reuse for performance
 * ✅ Per-user authentication tracking
 */
class SnowflakeConnectionManager {
  private static connectionPool: Map<string, Connection> = new Map();
  private static connectingUsers: Set<string> = new Set();
  private static connectedUsers: Set<string> = new Set();
  
  // ✅ INCREASED TIMEOUT SETTINGS
  private static readonly CONNECTION_TIMEOUT_MS = 180000; // 3 minutes (was 30s)
  private static readonly REQUEST_TIMEOUT_MS = 600000; // 10 minutes for query execution (was 30s)
  private static readonly LOGIN_TIMEOUT_MS = 120000; // 2 minutes for login
  private static readonly MAX_IDLE_TIME_MS = 300000; // 5 minutes - auto-close idle connections
  private static lastUsedTime: Map<string, number> = new Map();

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
      'hansika': 'HANSIKA',
      'Hansikaait': 'HANSIKA',
      'hansika@slmobility.com': 'HANSIKA',
      'Oshani': 'OSHANI',
      'oshaniqa': 'OSHANI',
      'oshani@slmobility.com': 'OSHANI',
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

    console.log(`🔌 Creating connection for: ${snowflakeUsername}`);
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
        STATEMENT_TIMEOUT_IN_SECONDS: 3600,  // 1 hour (overrides warehouse default)
        STATEMENT_QUEUED_TIMEOUT_IN_SECONDS: 0,  // No queue timeout
      }
    });
  }

  /**
   * Get or create connection
   */
  private static async getConnection(username?: string): Promise<Connection> {
    const snowflakeUsername = this.mapToSnowflakeUsername(username);
    const connectionKey = snowflakeUsername;

    // ✅ Clean up idle connections
    this.cleanupIdleConnections();

    // Reuse existing connection
    if (this.connectionPool.has(connectionKey) && this.connectedUsers.has(connectionKey)) {
      console.log(`♻️  Reusing connection for: ${snowflakeUsername}`);
      this.lastUsedTime.set(connectionKey, Date.now());
      return this.connectionPool.get(connectionKey)!;
    }

    // Wait if connecting
    if (this.connectingUsers.has(connectionKey)) {
      console.log(`⏳ Waiting for connection: ${snowflakeUsername}`);
      await this.waitForConnection(connectionKey);
      return this.connectionPool.get(connectionKey)!;
    }

    // Create new connection
    this.connectingUsers.add(connectionKey);
    const connection = this.createConnection(username);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Connection timeout (3min) for: ${snowflakeUsername}`));
        }, this.CONNECTION_TIMEOUT_MS);

        connection.connect((err) => {
          clearTimeout(timeoutId);
          this.connectingUsers.delete(connectionKey);

          if (err) {
            console.error(`❌ Connection failed for ${snowflakeUsername}:`, err.message, `(code: ${err.code})`);
            return reject(err);
          }

          this.connectedUsers.add(connectionKey);
          this.connectionPool.set(connectionKey, connection);
          this.lastUsedTime.set(connectionKey, Date.now());
          console.log(`✅ Connected: ${snowflakeUsername}`);
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
   * ✅ AUTO-CLEANUP: Close connections idle for 5+ minutes
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
        timeout: this.REQUEST_TIMEOUT_MS, // ✅ 10 minute query timeout
        complete: (execErr: any, stmt: Statement, rows: any[]) => {
          const duration = Date.now() - startTime;
          
          if (execErr) {
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
  } {
    const now = Date.now();
    const idleConnections = Array.from(this.lastUsedTime.entries()).map(([user, lastUsed]) => ({
      user,
      idleSeconds: Math.round((now - lastUsed) / 1000)
    }));

    return {
      activeConnections: this.connectedUsers.size,
      connectingUsers: this.connectingUsers.size,
      pooledUsers: Array.from(this.connectedUsers),
      idleConnections,
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
    this.lastUsedTime.clear();
    
    console.log('✅ All connections closed');
  }
}

export default SnowflakeConnectionManager;