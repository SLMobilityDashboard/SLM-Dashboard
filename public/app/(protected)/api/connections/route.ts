import { NextRequest, NextResponse } from "next/server";
import MongoDBManager from "@/lib/mongodb"

// API route timeout configuration
export const maxDuration = 60; // 60 seconds for Vercel
export const dynamic = 'force-dynamic';

interface DatabaseConnection {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected";
  lastConnected: Date;
  tables: any[];
  config: Record<string, any>;
}

// Timeout constants
const TIMEOUTS = {
  DB_OPERATION: 10000,  // 10s for DB operations
  REQUEST: 15000,       // 15s for entire request
};

// Mock data for fallback
const getMockConnections = (): DatabaseConnection[] => [
  {
    id: "mock_snowflake_1",
    name: "Snowflake Production",
    type: "snowflake",
    status: "connected",
    lastConnected: new Date(),
    tables: [
      { name: "REVENUE_TRANSACTIONS", rows: 125000 },
      { name: "STATIONS", rows: 450 },
      { name: "BATTERY_SWAPS", rows: 89000 },
      { name: "BATTERY_HEALTH", rows: 2500 },
      { name: "USERS", rows: 15000 },
    ],
    config: {
      account: "demo-account.snowflakecomputing.com",
      database: "PRODUCTION_DB",
      warehouse: "COMPUTE_WH",
    },
  },
  {
    id: "mock_csv_1",
    name: "Revenue Data CSV",
    type: "csv",
    status: "connected",
    lastConnected: new Date(Date.now() - 3600000),
    tables: [{ name: "revenue_data", rows: 5000 }],
    config: {
      filename: "revenue_data.csv",
      size: "2.5MB",
    },
  },
];

// Helper function to add timeout to operations
function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${operation} timeout after ${ms}ms`)), ms)
  );
  
  return Promise.race([promise, timeout]);
}

// GET - Fetch all connections
export async function GET() {
  const requestStart = Date.now();

  // Request timeout wrapper
  const requestTimeout = new Promise<NextResponse>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), TIMEOUTS.REQUEST);
  });

  const handleRequest = async (): Promise<NextResponse> => {
    try {
      // Try to get connections with timeout
      const connections = await withTimeout(
        MongoDBManager.getConnections(),
        TIMEOUTS.DB_OPERATION,
        'Database fetch'
      );
      
      return NextResponse.json({
        data: connections,
        source: 'database',
        executionTime: Date.now() - requestStart
      });

    } catch (error) {
      console.error("Error fetching connections:", error);
      
      // Always return mock data on any error (including timeout)
      const mockConnections = getMockConnections();
      
      return NextResponse.json({
        data: mockConnections,
        source: 'mock_fallback',
        error: error instanceof Error && error.message.includes('timeout') ? 'Database timeout' : 'Database error',
        executionTime: Date.now() - requestStart
      });
    }
  };

  try {
    return await Promise.race([handleRequest(), requestTimeout]);
  } catch (error) {
    // Even if request timeout, still return mock data
    if (error instanceof Error && error.message === 'Request timeout') {
      const mockConnections = getMockConnections();
      
      return NextResponse.json({
        data: mockConnections,
        source: 'mock_fallback',
        error: 'Request timeout',
        executionTime: Date.now() - requestStart
      });
    }
    throw error;
  }
}

// POST - Create new connection
export async function POST(request: NextRequest) {
  const requestStart = Date.now();

  // Request timeout wrapper
  const requestTimeout = new Promise<NextResponse>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), TIMEOUTS.REQUEST);
  });

  const handleRequest = async (): Promise<NextResponse> => {
    try {
      const connection: DatabaseConnection = await request.json();
      
      // Validate required fields
      if (!connection.id || !connection.name || !connection.type) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      // Save connection with timeout
      await withTimeout(
        MongoDBManager.saveConnection(connection),
        TIMEOUTS.DB_OPERATION,
        'Database save'
      );

      return NextResponse.json({ 
        success: true, 
        connection,
        executionTime: Date.now() - requestStart
      });

    } catch (error) {
      console.error("Error saving connection:", error);
      
      if (error instanceof Error && error.message.includes('timeout')) {
        return NextResponse.json(
          { 
            error: "Database timeout. Connection may not have been saved.",
            code: "TIMEOUT_ERROR",
            executionTime: Date.now() - requestStart
          },
          { status: 408 }
        );
      }

      return NextResponse.json(
        { 
          error: "Failed to save connection",
          executionTime: Date.now() - requestStart
        },
        { status: 500 }
      );
    }
  };

  try {
    return await Promise.race([handleRequest(), requestTimeout]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      return NextResponse.json({
        error: "Request timeout. Connection may not have been saved.",
        code: "REQUEST_TIMEOUT",
        executionTime: Date.now() - requestStart
      }, { status: 408 });
    }
    throw error;
  }
}

// DELETE - Remove connection
export async function DELETE(request: NextRequest) {
  const requestStart = Date.now();

  // Request timeout wrapper
  const requestTimeout = new Promise<NextResponse>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), TIMEOUTS.REQUEST);
  });

  const handleRequest = async (): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const connectionId = searchParams.get("id");

      if (!connectionId) {
        return NextResponse.json(
          { error: "Connection ID is required" },
          { status: 400 }
        );
      }

      // Delete connection with timeout
      await withTimeout(
        MongoDBManager.deleteConnection(connectionId),
        TIMEOUTS.DB_OPERATION,
        'Database delete'
      );

      return NextResponse.json({ 
        success: true,
        executionTime: Date.now() - requestStart
      });

    } catch (error) {
      console.error("Error deleting connection:", error);
      
      if (error instanceof Error && error.message.includes('timeout')) {
        return NextResponse.json(
          { 
            error: "Database timeout. Connection may not have been deleted.",
            code: "TIMEOUT_ERROR",
            executionTime: Date.now() - requestStart
          },
          { status: 408 }
        );
      }

      return NextResponse.json(
        { 
          error: "Failed to delete connection",
          executionTime: Date.now() - requestStart
        },
        { status: 500 }
      );
    }
  };

  try {
    return await Promise.race([handleRequest(), requestTimeout]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      return NextResponse.json({
        error: "Request timeout. Connection may not have been deleted.",
        code: "REQUEST_TIMEOUT",
        executionTime: Date.now() - requestStart
      }, { status: 408 });
    }
    throw error;
  }
}