import snowflake from 'snowflake-sdk';
import fs from 'fs';

class SnowflakeConnectionManager {
  private static instance: snowflake.Connection | null = null;
  private static isConnecting = false;
  private static isConnected = false;


  public static getConnection(): snowflake.Connection {
    if (!this.instance) {
      console.log('[Snowflake] Initializing new connection instance...');

      this.instance = snowflake.createConnection({
        account: process.env.SNOWFLAKE_ACCOUNT_TEST,
        username: process.env.SNOWFLAKE_USERNAME_TEST,
        password: process.env.SNOWFLAKE_PASSWORD_TEST,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE_TEST,
        database: process.env.SNOWFLAKE_DATABASE_TEST,
        schema: process.env.SNOWFLAKE_SCHEMA_TEST,
        role: process.env.SNOWFLAKE_ROLE_TEST,
        authenticator: 'SNOWFLAKE', // ✅ required for password auth
      });

      console.log('[Snowflake] Connection object created.');
    } else {
      console.log('[Snowflake] Reusing existing Snowflake connection instance.');
    }

    return this.instance;
  }

  public static async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('[Snowflake] Already connected.');
      return;
    }

    if (this.isConnecting) {
      console.log('[Snowflake] Connection already in progress...');
      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
          if (this.isConnected) {
            clearInterval(interval);
            resolve();
          }
          if (!this.isConnecting) {
            clearInterval(interval);
            reject(new Error('Connection failed while waiting.'));
          }
        }, 100);
      });
      return;
    }

    this.isConnecting = true;
    const connection = this.getConnection();

    console.log('[Snowflake] Connecting...');

    await new Promise<void>((resolve, reject) => {
      connection.connect((err) => {
        this.isConnecting = false;
        if (err) {
          this.isConnected = false;
          console.error('[Snowflake] ❌ Failed to connect:', err.message);
          return reject(err);
        }

        this.isConnected = true;
        console.log('[Snowflake] ✅ Connection established.');
        resolve();
      });
    });
  }
}

export default SnowflakeConnectionManager;
