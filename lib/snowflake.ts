import snowflake, { Connection, Statement } from 'snowflake-sdk';

interface QueryResult {
  columns: string[];
  rows: any[];
  executionTime: number;
  rowCount: number;
}

/**
 * SnowflakeConnectionManager - Pool-based connection manager with per-user authentication
 * 
 * OPTION 1: Connection Pool (Recommended)
 * Creates separate connections for each user to properly track query attribution
 */
class SnowflakeConnectionManager {
  private static connectionPool: Map<string, Connection> = new Map();
  private static connectingUsers: Set<string> = new Set();
  private static connectedUsers: Set<string> = new Set();
  
  // Connection timeout settings
  private static readonly CONNECTION_TIMEOUT_MS = 30000; // 30 seconds
  private static readonly MAX_IDLE_TIME_MS = 300000; // 5 minutes
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
      'hansika@slmobility.com': 'HANSIKA',
      'oshaniqa': 'OSHANI',
      'oshani@slmobility.com': 'OSHANI',
      'authenticated-user': process.env.SNOWFLAKE_USERNAME || 'DEFAULT_USER',
      'authenticated user': process.env.SNOWFLAKE_USERNAME || 'DEFAULT_USER',
      // Add other user mappings as needed
    };

    const normalizedUsername = appUsername.toLowerCase();
    const mapped = usernameMap[normalizedUsername] || 
                   usernameMap[appUsername] || 
                   process.env.SNOWFLAKE_USERNAME;

    console.log(`🔍 Username mapping: "${appUsername}" → "${mapped}"`);
    return mapped || process.env.SNOWFLAKE_USERNAME!;
  }

  /**
   * Create connection for specific user
   */
  private static createConnection(username?: string): Connection {
    const snowflakeUsername = this.mapToSnowflakeUsername(username);
    const privateKey = process.env.SNOWFLAKE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!privateKey) throw new Error('SNOWFLAKE_PRIVATE_KEY not set');
    if (!process.env.SNOWFLAKE_ACCOUNT) throw new Error('SNOWFLAKE_ACCOUNT not set');

    console.log(`🔌 Creating Snowflake connection for user: ${snowflakeUsername}`);

    return snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: snowflakeUsername,
      privateKey: privateKey,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'AIDASHBOARD',
      database: 'DB_DUMP',
      schema: 'PUBLIC',
      role: 'SYSADMIN',
      authenticator: 'SNOWFLAKE_JWT',
      timeout: this.CONNECTION_TIMEOUT_MS,
    });
  }

  /**
   * Get or create connection for specific user
   */
  private static async getConnection(username?: string): Promise<Connection> {
    const snowflakeUsername = this.mapToSnowflakeUsername(username);
    const connectionKey = snowflakeUsername;

    // Clean up idle connections periodically
    this.cleanupIdleConnections();

    // Check if connection exists and is valid
    if (this.connectionPool.has(connectionKey) && this.connectedUsers.has(connectionKey)) {
      console.log(`♻️  Reusing connection for user: ${snowflakeUsername}`);
      this.lastUsedTime.set(connectionKey, Date.now());
      return this.connectionPool.get(connectionKey)!;
    }

    // Wait if connection is in progress
    if (this.connectingUsers.has(connectionKey)) {
      console.log(`⏳ Waiting for existing connection attempt: ${snowflakeUsername}`);
      await this.waitForConnection(connectionKey);
      return this.connectionPool.get(connectionKey)!;
    }

    // Create new connection
    this.connectingUsers.add(connectionKey);
    const connection = this.createConnection(username);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Connection timeout for user: ${snowflakeUsername}`));
        }, this.CONNECTION_TIMEOUT_MS);

        connection.connect((err) => {
          clearTimeout(timeoutId);
          this.connectingUsers.delete(connectionKey);

          if (err) {
            console.error(`❌ Failed to connect for user ${snowflakeUsername}:`, err.message);
            return reject(err);
          }

          this.connectedUsers.add(connectionKey);
          this.connectionPool.set(connectionKey, connection);
          this.lastUsedTime.set(connectionKey, Date.now());
          console.log(`✅ Connection established for user: ${snowflakeUsername}`);
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

    for (const [key, lastUsed] of this.lastUsedTime.entries()) {
      if (now - lastUsed > this.MAX_IDLE_TIME_MS) {
        connectionsToRemove.push(key);
      }
    }

    for (const key of connectionsToRemove) {
      console.log(`🧹 Cleaning up idle connection: ${key}`);
      const connection = this.connectionPool.get(key);
      if (connection) {
        try {
          connection.destroy((err) => {
            if (err) console.error(`Error destroying connection ${key}:`, err);
          });
        } catch (error) {
          console.error(`Error destroying connection ${key}:`, error);
        }
      }
      this.connectionPool.delete(key);
      this.connectedUsers.delete(key);
      this.lastUsedTime.delete(key);
    }
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
    
    console.log(`📊 Executing query for: ${requestedUsername || 'anonymous'} → ${snowflakeUsername}`);
    
    const connection = await this.getConnection(requestedUsername);

    return new Promise<QueryResult>((resolve, reject) => {
      const startTime = Date.now();

      connection.execute({
        sqlText: finalSql,
        complete: (execErr: any, stmt: Statement, rows: any[]) => {
          if (execErr) {
            console.error(`❌ Query execution failed for ${snowflakeUsername}:`, execErr.message);
            return reject(execErr);
          }

          const columns = stmt.getColumns()?.map((col) => col.getName()) || [];
          const executionTime = (Date.now() - startTime) / 1000;

          console.log(`✅ Query completed for ${snowflakeUsername}: ${rows.length} rows in ${executionTime.toFixed(2)}s`);
          
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
   * Get connection pool stats for monitoring
   */
  public static getPoolStats(): {
    activeConnections: number;
    connectingUsers: number;
    pooledUsers: string[];
  } {
    return {
      activeConnections: this.connectedUsers.size,
      connectingUsers: this.connectingUsers.size,
      pooledUsers: Array.from(this.connectedUsers),
    };
  }

  /**
   * Close all connections (useful for cleanup/shutdown)
   */
  public static async closeAllConnections(): Promise<void> {
    console.log('🛑 Closing all connections...');
    
    const closePromises = Array.from(this.connectionPool.entries()).map(([key, connection]) => {
      return new Promise<void>((resolve) => {
        connection.destroy((err) => {
          if (err) console.error(`Error closing connection ${key}:`, err);
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