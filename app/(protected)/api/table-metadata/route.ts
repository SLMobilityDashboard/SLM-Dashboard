// /api/table-metadata/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  comment?: string;
  position: number;
}

interface TableInfo {
  name: string;
  database: string;
  schema: string;
  rows?: number;
  columns?: ColumnInfo[];
  tableType?: string;
  comment?: string;
  created?: Date;
  modified?: Date;
}

interface TableMetadataRequest {
  connectionId?: string;
  database?: string;
  schema?: string;
  tableName?: string;
  includeColumns?: boolean;
  includeSystemTables?: boolean;
  searchQuery?: string;
}

interface TableMetadataResponse {
  success: boolean;
  data?: {
    tables: TableInfo[];
    totalCount: number;
    databases: string[];
    schemas: string[];
  };
  error?: string;
}

// Helper function to execute SQL queries
async function executeSQLQuery(sql: string): Promise<any> {
  const response = await fetch(`http://localhost:3000/api/RunSQLQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, username: 'HANSIKA' }), // Use session username here
  });

  if (!response.ok) {
    throw new Error(`SQL query failed: ${response.statusText}`);
  }

  const json = await response.json();
  
  if (!json.success || !json.result || !Array.isArray(json.result.rows)) {
    throw new Error('Invalid SQL response structure');
  }

  return json.result.rows;
}

// Fetch tables from custom metadata table
async function fetchTablesFromMetadata(filters: TableMetadataRequest): Promise<TableInfo[]> {
  let whereClause = '';
  const conditions: string[] = [];

  if (filters.database) {
    conditions.push(`DATABASE_NAME = '${filters.database.toUpperCase()}'`);
  }
  
  if (filters.schema) {
    conditions.push(`SCHEMA_NAME = '${filters.schema.toUpperCase()}'`);
  }
  
  if (filters.tableName) {
    conditions.push(`TABLE_NAME = '${filters.tableName.toUpperCase()}'`);
  }

  if (filters.searchQuery) {
    const searchTerm = filters.searchQuery.toLowerCase();
    conditions.push(`(
      LOWER(DATABASE_NAME) LIKE '%${searchTerm}%' OR
      LOWER(SCHEMA_NAME) LIKE '%${searchTerm}%' OR
      LOWER(TABLE_NAME) LIKE '%${searchTerm}%' OR
      LOWER(COMMENT) LIKE '%${searchTerm}%' OR
      LOWER(COLUMNS) LIKE '%${searchTerm}%'
    )`);
  }

  if (!filters.includeSystemTables) {
    conditions.push(`TABLE_TYPE NOT IN ('SYSTEM TABLE', 'SYSTEM VIEW')`);
  }

  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  const sql = `
    SELECT 
      DATABASE_NAME,
      SCHEMA_NAME,
      TABLE_NAME,
      TABLE_TYPE,
      COMMENT,
      COLUMNS,
      CREATED,
      LAST_ALTERED
    FROM ADHOC.METADATA.META_DATA
    ${whereClause}
    ORDER BY DATABASE_NAME, SCHEMA_NAME, TABLE_NAME
  `;

  try {
    const rows = await executeSQLQuery(sql);

    return rows.map((row: any) => {
      // Parse column info if available
      let columns: ColumnInfo[] = [];
      if (row.COLUMNS && filters.includeColumns) {
        try {
          const columnsData = typeof row.COLUMNS === 'string' 
            ? JSON.parse(row.COLUMNS) 
            : row.COLUMNS;
          
          columns = columnsData.map((col: any, index: number) => ({
            name: col.name || col.COLUMN_NAME,
            type: col.type || col.DATA_TYPE,
            nullable: col.nullable !== false && col.IS_NULLABLE !== 'NO',
            default: col.default || col.COLUMN_DEFAULT,
            comment: col.comment || col.COMMENT,
            position: col.position || col.ORDINAL_POSITION || index + 1,
          }));
        } catch (parseError) {
          console.warn(`Failed to parse columns for table ${row.TABLE_NAME}:`, parseError);
        }
      }

      return {
        name: row.TABLE_NAME,
        database: row.DATABASE_NAME,
        schema: row.SCHEMA_NAME,
        tableType: row.TABLE_TYPE,
        comment: row.COMMENT,
        rows: 0,
        columns: columns,
        created: row.CREATED ? new Date(row.CREATED) : undefined,
        modified: row.LAST_ALTERED ? new Date(row.LAST_ALTERED) : undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching from metadata table:', error);
    throw error;
  }
}

// Fetch table columns directly from Snowflake INFORMATION_SCHEMA
async function fetchTableColumns(database: string, schema: string, tableName: string): Promise<ColumnInfo[]> {
  const sql = `
    SELECT 
      COLUMN_NAME,
      DATA_TYPE,
      IS_NULLABLE,
      COLUMN_DEFAULT,
      COMMENT,
      ORDINAL_POSITION
    FROM ${database}.INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = '${schema.toUpperCase()}' 
      AND TABLE_NAME = '${tableName.toUpperCase()}'
      AND TABLE_CATALOG = '${database.toUpperCase()}'
    ORDER BY ORDINAL_POSITION
  `;

  try {
    const rows = await executeSQLQuery(sql);

    return rows.map((row: any) => ({
      name: row.COLUMN_NAME,
      type: row.DATA_TYPE,
      nullable: row.IS_NULLABLE === 'YES',
      default: row.COLUMN_DEFAULT,
      comment: row.COMMENT,
      position: row.ORDINAL_POSITION,
    }));
  } catch (error) {
    console.error(`Error fetching columns for table ${database}.${schema}.${tableName}:`, error);
    return [];
  }
}

// Fallback: fetch tables from INFORMATION_SCHEMA
async function fetchTablesFromInformationSchema(filters: TableMetadataRequest): Promise<TableInfo[]> {
  const database = filters.database || 'ADHOC';
  const schema = filters.schema || 'PUBLIC';

  let whereClause = `WHERE TABLE_CATALOG = '${database.toUpperCase()}' AND TABLE_SCHEMA = '${schema.toUpperCase()}'`;

  if (filters.tableName) {
    whereClause += ` AND TABLE_NAME = '${filters.tableName.toUpperCase()}'`;
  }

  if (filters.searchQuery) {
    const searchTerm = filters.searchQuery.toLowerCase();
    whereClause += ` AND (
      LOWER(TABLE_NAME) LIKE '%${searchTerm}%' OR
      LOWER(COMMENT) LIKE '%${searchTerm}%'
    )`;
  }

  if (!filters.includeSystemTables) {
    whereClause += ` AND TABLE_TYPE NOT IN ('SYSTEM TABLE', 'SYSTEM VIEW')`;
  }

  const sql = `
    SELECT 
      TABLE_NAME,
      TABLE_TYPE,
      COMMENT,
      CREATED,
      LAST_ALTERED
    FROM ${database}.INFORMATION_SCHEMA.TABLES
    ${whereClause}
    ORDER BY TABLE_NAME
  `;

  try {
    const rows = await executeSQLQuery(sql);

    const tables: TableInfo[] = [];

    for (const row of rows) {
      let columns: ColumnInfo[] = [];
      
      if (filters.includeColumns) {
        columns = await fetchTableColumns(database, schema, row.TABLE_NAME);
      }

      tables.push({
        name: row.TABLE_NAME,
        database: database,
        schema: schema,
        tableType: row.TABLE_TYPE || 'TABLE',
        comment: row.COMMENT,
        rows: 0, // Row count not available in INFORMATION_SCHEMA
        columns: columns,
        created: row.CREATED ? new Date(row.CREATED) : undefined,
        modified: row.LAST_ALTERED ? new Date(row.LAST_ALTERED) : undefined,
      });
    }

    return tables;
  } catch (error) {
    console.error('Error fetching from INFORMATION_SCHEMA:', error);
    return [];
  }
}

// GET: Fetch table metadata
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: TableMetadataRequest = {
      connectionId: searchParams.get('connectionId') || undefined,
      database: searchParams.get('database') || undefined,
      schema: searchParams.get('schema') || undefined,
      tableName: searchParams.get('tableName') || undefined,
      includeColumns: searchParams.get('includeColumns') === 'true',
      includeSystemTables: searchParams.get('includeSystemTables') === 'true',
      searchQuery: searchParams.get('search') || undefined,
    };

    let tables: TableInfo[] = [];

    // Try fetching from metadata table first
    try {
      tables = await fetchTablesFromMetadata(filters);
    } catch (metadataError) {
      console.warn('Metadata table query failed, falling back to INFORMATION_SCHEMA:', metadataError);
      
      // Fallback to INFORMATION_SCHEMA
      tables = await fetchTablesFromInformationSchema(filters);
    }

    // Extract unique databases and schemas
    const databases = [...new Set(tables.map(t => t.database))];
    const schemas = [...new Set(tables.map(t => `${t.database}.${t.schema}`))];

    const response: TableMetadataResponse = {
      success: true,
      data: {
        tables,
        totalCount: tables.length,
        databases,
        schemas,
      },
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Table metadata API error:', error);
    
    const response: TableMetadataResponse = {
      success: false,
      error: error.message || 'Failed to fetch table metadata',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST: Fetch specific table details (including fresh columns)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { database, schema, tableName, forceRefresh } = body;

    if (!database || !schema || !tableName) {
      return NextResponse.json({
        success: false,
        error: 'Database, schema, and tableName are required',
      }, { status: 400 });
    }

    // Get table info from metadata if available
    let tableInfo: TableInfo | undefined;

    if (!forceRefresh) {
      try {
        const tables = await fetchTablesFromMetadata({
          database,
          schema,
          tableName,
          includeColumns: true,
        });
        tableInfo = tables[0];
      } catch (error) {
        console.warn('Failed to fetch from metadata, will use INFORMATION_SCHEMA');
      }
    }

    // If not found in metadata or force refresh, get from INFORMATION_SCHEMA
    if (!tableInfo || forceRefresh) {
      const tables = await fetchTablesFromInformationSchema({
        database,
        schema,
        tableName,
        includeColumns: true,
      });
      tableInfo = tables[0];
    }

    if (!tableInfo) {
      return NextResponse.json({
        success: false,
        error: 'Table not found',
      }, { status: 404 });
    }

    const response: TableMetadataResponse = {
      success: true,
      data: {
        tables: [tableInfo],
        totalCount: 1,
        databases: [tableInfo.database],
        schemas: [`${tableInfo.database}.${tableInfo.schema}`],
      },
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Table details API error:', error);
    
    const response: TableMetadataResponse = {
      success: false,
      error: error.message || 'Failed to fetch table details',
    };

    return NextResponse.json(response, { status: 500 });
  }
}