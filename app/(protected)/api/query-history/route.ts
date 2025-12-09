// app/api/query-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

// API route timeout configuration
export const maxDuration = 60; // 60 seconds for Vercel
export const dynamic = 'force-dynamic';

const client = new MongoClient(process.env.MONGODB_URI!, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
});

const dbName = "adhoc_analysis";

// Timeout constants
const TIMEOUTS = {
  CONNECTION: 10000,    // 10s for DB connection
  QUERY: 15000,         // 15s for DB queries  
  REQUEST: 45000,       // 45s for entire request
};

// Helper function to add timeout to any operation
function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${operation} timeout after ${ms}ms`)), ms)
  );
  
  return Promise.race([promise, timeout]);
}

export async function GET(req: NextRequest) {
  const requestStart = Date.now();
  
  // Wrap entire request with timeout
  const requestTimeout = new Promise<NextResponse>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), TIMEOUTS.REQUEST);
  });

  const handleRequest = async (): Promise<NextResponse> => {
    try {
      const connectionId = req.nextUrl.searchParams.get("connectionId");
      if (!connectionId) {
        return NextResponse.json({ 
          data: [],
          error: "Connection ID is required" 
        }, { status: 400 });
      }

      // Connect with timeout
      await withTimeout(client.connect(), TIMEOUTS.CONNECTION, 'Database connection');
      
      const db = client.db(dbName);
      const collection = db.collection("query_history");

      // Query with timeout
      const history = await withTimeout(
        collection.find({ connectionId }).sort({ timestamp: -1 }).limit(100).toArray(),
        TIMEOUTS.QUERY,
        'Database query'
      );

      console.log(`Fetched ${history.length} history items for connectionId: ${connectionId}`);

      const formatted = history.map((item) => ({
        ...item,
        _id: item._id.toString(),
      }));

      return NextResponse.json({
        data: formatted,
        success: true,
        executionTime: Date.now() - requestStart
      });

    } catch (error) {
      console.error('GET /api/query-history error:', error);
      
      if (error instanceof Error && error.message.includes('timeout')) {
        return NextResponse.json({ 
          data: [],
          error: "Operation timeout. Please try again.",
          code: "TIMEOUT_ERROR",
          success: false,
          executionTime: Date.now() - requestStart
        }, { status: 408 });
      }
      
      return NextResponse.json({ 
        data: [],
        error: "Internal server error",
        success: false,
        executionTime: Date.now() - requestStart
      }, { status: 500 });
    }
  };

  try {
    return await Promise.race([handleRequest(), requestTimeout]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      return NextResponse.json({
        data: [],
        error: "Request timeout after 45 seconds. Please try again.",
        code: "REQUEST_TIMEOUT",
        success: false,
        executionTime: Date.now() - requestStart
      }, { status: 408 });
    }
    
    // Fallback for any other errors
    return NextResponse.json({
      data: [],
      error: "Unexpected error occurred",
      success: false,
      executionTime: Date.now() - requestStart
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestStart = Date.now();
  
  // Wrap entire request with timeout
  const requestTimeout = new Promise<NextResponse>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), TIMEOUTS.REQUEST);
  });

  const handleRequest = async (): Promise<NextResponse> => {
    try {
      const body = await req.json();
      const timestamp = new Date(body.timestamp);
      const item = { ...body, timestamp };

      // Connect with timeout
      await withTimeout(client.connect(), TIMEOUTS.CONNECTION, 'Database connection');
      
      const db = client.db(dbName);
      const collection = db.collection("query_history");

      // Insert with timeout
      const result = await withTimeout(
        collection.insertOne(item),
        TIMEOUTS.QUERY,
        'Database insert'
      );

      return NextResponse.json({ 
        data: {
          ...item,
          _id: result.insertedId.toString(),
        },
        success: true,
        executionTime: Date.now() - requestStart
      }, { status: 201 });

    } catch (error) {
      console.error('POST /api/query-history error:', error);
      
      if (error instanceof Error && error.message.includes('timeout')) {
        return NextResponse.json({ 
          data: null,
          error: "Operation timeout. Please try again.",
          code: "TIMEOUT_ERROR",
          success: false,
          executionTime: Date.now() - requestStart
        }, { status: 408 });
      }
      
      return NextResponse.json({ 
        data: null,
        error: "Internal server error",
        success: false,
        executionTime: Date.now() - requestStart
      }, { status: 500 });
    }
  };

  try {
    return await Promise.race([handleRequest(), requestTimeout]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      return NextResponse.json({
        data: null,
        error: "Request timeout after 45 seconds. Please try again.",
        code: "REQUEST_TIMEOUT",
        success: false,
        executionTime: Date.now() - requestStart
      }, { status: 408 });
    }
    
    // Fallback for any other errors
    return NextResponse.json({
      data: null,
      error: "Unexpected error occurred",
      success: false,
      executionTime: Date.now() - requestStart
    }, { status: 500 });
  }
}