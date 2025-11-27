// lib/snowflake/user-connection-manager.ts
import snowflake from 'snowflake-sdk';

interface UserSnowflakeConfig {
  username: string;
  privateKey?: string;
  password?: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  role?: string;
}

class UserSnowflakeConnectionManager {
  private static connections: Map<string, snowflake.Connection> = new Map();
  private static connectingUsers: Set<string> = new Set();
  private static connectedUsers: Set<string> = new Set();

  /**
   * Get or create a connection for a specific user
   */
  public static getConnection(username: string, config: UserSnowflakeConfig): snowflake.Connection {
    if (!this.connections.has(username)) {
      console.log(`[Snowflake] Initializing new connection for user: ${username}`);

      const privateKey = config.privateKey?.replace(/\\n/g, '\n');

      const connectionConfig: any = {
        account: process.env.SNOWFLAKE_ACCOUNT,
        username: username, // Use the logged-in user's username
        warehouse: config.warehouse || process.env.SNOWFLAKE_WAREHOUSE || 'AIDASHBOARD',
        database: config.database || 'DB_DUMP',
        schema: config.schema || 'PUBLIC',
        role: config.role || 'SYSADMIN',
      };

      // Use private key auth if available, otherwise password
      if (privateKey) {
        connectionConfig.privateKey = privateKey;
        connectionConfig.authenticator = 'SNOWFLAKE_JWT';
      } else if (config.password) {
        connectionConfig.password = config.password;
        connectionConfig.authenticator = 'SNOWFLAKE';
      } else {
        throw new Error('Either privateKey or password must be provided');
      }

      const connection = snowflake.createConnection(connectionConfig);
      this.connections.set(username, connection);

      console.log(`[Snowflake] Connection object created for user: ${username}`);
    } else {
      console.log(`[Snowflake] Reusing existing connection for user: ${username}`);
    }

    return this.connections.get(username)!;
  }

  /**
   * Connect to Snowflake for a specific user
   */
  public static async connect(username: string, config: UserSnowflakeConfig): Promise<void> {
    if (this.connectedUsers.has(username)) {
      console.log(`[Snowflake] User ${username} already connected.`);
      return;
    }

    if (this.connectingUsers.has(username)) {
      console.log(`[Snowflake] Connection for ${username} already in progress...`);
      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
          if (this.connectedUsers.has(username)) {
            clearInterval(interval);
            resolve();
          }
          if (!this.connectingUsers.has(username)) {
            clearInterval(interval);
            reject(new Error(`Connection failed for user ${username} while waiting.`));
          }
        }, 100);
      });
      return;
    }

    this.connectingUsers.add(username);
    const connection = this.getConnection(username, config);

    console.log(`[Snowflake] Connecting user: ${username}...`);

    await new Promise<void>((resolve, reject) => {
      connection.connect((err) => {
        this.connectingUsers.delete(username);
        if (err) {
          this.connectedUsers.delete(username);
          console.error(`[Snowflake] ❌ Failed to connect user ${username}:`, err.message);
          return reject(err);
        }

        this.connectedUsers.add(username);
        console.log(`[Snowflake] ✅ Connection established for user: ${username}`);
        resolve();
      });
    });
  }

  /**
   * Disconnect a specific user
   */
  public static async disconnect(username: string): Promise<void> {
    const connection = this.connections.get(username);
    if (connection) {
      await new Promise<void>((resolve) => {
        connection.destroy((err) => {
          if (err) {
            console.error(`[Snowflake] Error disconnecting user ${username}:`, err);
          } else {
            console.log(`[Snowflake] User ${username} disconnected.`);
          }
          this.connections.delete(username);
          this.connectedUsers.delete(username);
          resolve();
        });
      });
    }
  }

  /**
   * Disconnect all users
   */
  public static async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(
      (username) => this.disconnect(username)
    );
    await Promise.all(disconnectPromises);
  }
}

export default UserSnowflakeConnectionManager;