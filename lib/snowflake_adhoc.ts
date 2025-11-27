// lib/snowflake_adhoc.ts
import snowflake from 'snowflake-sdk';

interface ConnectionState {
  connection: snowflake.Connection;
  isConnecting: boolean;
  isConnected: boolean;
}

class SnowflakeConnectionManager {
  private static connections: Map<string, ConnectionState> = new Map();

  /**
   * Get Snowflake username with fallback logic
   */
  private static getSnowflakeUsername(requestedUsername?: string): string {
    // Priority: requested username -> environment default -> fallback
    if (requestedUsername) {
      // You might want to map application usernames to Snowflake usernames here
      return this.mapToSnowflakeUsername(requestedUsername);
    }
    
    const envUsername = process.env.SNOWFLAKE_USERNAME;
    if (envUsername) {
      return envUsername;
    }
    
    throw new Error('No Snowflake username provided and SNOWFLAKE_USERNAME environment variable is not set');
  }

  /**
   * Map application username to Snowflake username
   * You can customize this logic based on your user mapping needs
   */
  private static mapToSnowflakeUsername(appUsername: string): string {
    // Example mapping logic - customize as needed
    const usernameMap: Record<string, string> = {
      // Add your username mappings here
      // 'app-user@company.com': 'SNOWFLAKE_USER',
    };
    
    return usernameMap[appUsername] || appUsername.split('@')[0].toUpperCase();
  }

  /**
   * Get or create a Snowflake connection
   */
  public static async getConnection(requestedUsername?: string): Promise<snowflake.Connection> {
    const snowflakeUsername = this.getSnowflakeUsername(requestedUsername);
    
    let state = this.connections.get(snowflakeUsername);

    if (!state) {
      console.log(`[Snowflake] Initializing new connection for user: ${snowflakeUsername}`);
      if (requestedUsername) {
        console.log(`[Snowflake] Requested by app user: ${requestedUsername}`);
      }

      const privateKey = process.env.SNOWFLAKE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!privateKey) {
        throw new Error('SNOWFLAKE_PRIVATE_KEY environment variable is not set');
      }

      if (!process.env.SNOWFLAKE_ACCOUNT) {
        throw new Error('SNOWFLAKE_ACCOUNT environment variable is not set');
      }

      const connection = snowflake.createConnection({
        account: process.env.SNOWFLAKE_ACCOUNT,
        username: snowflakeUsername,
        privateKey: privateKey,
        warehouse: 'ADHOC',
        database: 'ADHOC',
        schema: 'PUBLIC',
        role: 'ACCOUNTADMIN',
        authenticator: 'SNOWFLAKE_JWT',
      });

      state = {
        connection,
        isConnecting: false,
        isConnected: false,
      };

      this.connections.set(snowflakeUsername, state);
      console.log(`[Snowflake] Connection object created for ${snowflakeUsername}`);
    } else {
      console.log(`[Snowflake] Reusing existing connection for Snowflake user: ${snowflakeUsername}`);
    }

    return state.connection;
  }

  /**
   * Connect to Snowflake
   */
  public static async connect(requestedUsername?: string): Promise<void> {
    const snowflakeUsername = this.getSnowflakeUsername(requestedUsername);
    const state = this.connections.get(snowflakeUsername);

    if (state?.isConnected) {
      console.log(`[Snowflake] Already connected for user: ${snowflakeUsername}`);
      return;
    }

    if (state?.isConnecting) {
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

    const connection = await this.getConnection(requestedUsername);
    const connectionState = this.connections.get(snowflakeUsername)!;
    connectionState.isConnecting = true;

    console.log(`[Snowflake] Connecting for user: ${snowflakeUsername}...`);

    await new Promise<void>((resolve, reject) => {
      connection.connect((err) => {
        connectionState.isConnecting = false;
        if (err) {
          connectionState.isConnected = false;
          console.error(`[Snowflake] ❌ Failed to connect for ${snowflakeUsername}:`, err.message);
          return reject(err);
        }

        connectionState.isConnected = true;
        console.log(`[Snowflake] ✅ Connection established for ${snowflakeUsername}`);
        resolve();
      });
    });
  }

  /**
   * Execute a query with optional username
   */
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
    await this.connect(requestedUsername);
    const connection = await this.getConnection(requestedUsername);
    const snowflakeUsername = this.getSnowflakeUsername(requestedUsername);

    // Add audit comment
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
          if (err) {
            console.error("[Snowflake] Query execution error:", err.message);
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
  }

  /**
   * Get connection status
   */
  public static async getConnectionStatus(requestedUsername?: string): Promise<{
    isConnected: boolean;
    isConnecting: boolean;
    username: string;
    snowflakeUser: string;
    appUser?: string;
  }> {
    const snowflakeUsername = this.getSnowflakeUsername(requestedUsername);
    const state = this.connections.get(snowflakeUsername);

    return {
      isConnected: state?.isConnected || false,
      isConnecting: state?.isConnecting || false,
      username: requestedUsername || 'system',
      snowflakeUser: snowflakeUsername,
      appUser: requestedUsername,
    };
  }

  /**
   * Disconnect a specific Snowflake connection
   */
  public static async disconnect(requestedUsername?: string): Promise<void> {
    const snowflakeUsername = this.getSnowflakeUsername(requestedUsername);
    const state = this.connections.get(snowflakeUsername);
    
    if (state?.connection && state.isConnected) {
      return new Promise<void>((resolve, reject) => {
        state.connection.destroy((err) => {
          if (err) {
            console.error(`[Snowflake] Error disconnecting ${snowflakeUsername}:`, err.message);
            reject(err);
          } else {
            console.log(`[Snowflake] Disconnected ${snowflakeUsername}`);
            this.connections.delete(snowflakeUsername);
            resolve();
          }
        });
      });
    }
  }

  /**
   * Clean up all connections
   */
  public static async disconnectAll(): Promise<void> {
    console.log(`[Snowflake] Disconnecting all ${this.connections.size} connections...`);
    
    const disconnectPromises = Array.from(this.connections.entries()).map(([username, state]) =>
      new Promise<void>((resolve) => {
        if (state.connection && state.isConnected) {
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
}

export default SnowflakeConnectionManager;