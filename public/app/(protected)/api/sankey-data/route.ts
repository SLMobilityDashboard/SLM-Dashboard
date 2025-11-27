import { NextRequest, NextResponse } from 'next/server';
import MongoDBManager from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const client = await MongoDBManager['getClient']();
    const db = client.db('adhoc_analysis');

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '1', 10);
    const skip = (page - 1) * limit;

    const total = await db.collection('permission_failures').countDocuments();

    const results = await db
      .collection('permission_failures')
      .find({})
      .sort({ timestamp: -1 }) // latest first
      .skip(skip)
      .limit(limit)
      .toArray();

    const sanitized = results
      .filter((doc) => doc.semanticModel)
      .map((doc) => {
        const semanticModel = doc.semanticModel;
        return {
          selectedTables: semanticModel.selectedTables,
          currentUserRoles: [semanticModel.executorRole],
          roles: ["admin", "manager", "analyst", "support", "hr"],
          queryName: semanticModel.query,
        };
      });

    return NextResponse.json({ data: sanitized, total });
  } catch (error) {
    console.error("Failed to fetch sankey data:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
