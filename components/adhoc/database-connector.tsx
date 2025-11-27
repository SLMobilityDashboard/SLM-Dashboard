"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ConnectionDialog } from "./connection-dialog";
import {
  Database,
  Plus,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Clock,
  Table,
  Columns,
  ChevronDown,
  ChevronRight,
  Info,
  Search,
  X,
  Filter,
} from "lucide-react";

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

interface TableInfo {
  name: string;
  database: string;
  schema: string;
  rows?: number;
  columns?: ColumnInfo[];
  tableType?: string;
  comment?: string;
}

interface DatabaseConnection {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected";
  lastConnected: Date;
  tables: TableInfo[];
  config: Record<string, string>;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface DatabaseConnectorProps {
  onConnectionSelect: (connection: DatabaseConnection | null) => void;
  selectedConnection: DatabaseConnection | null;
}

// Enhanced Cache manager class with unified caching
class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  set(key: string, data: any, ttlMs: number = this.ONE_DAY_MS): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttlMs,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // Get full connection data with tables
  getConnectionWithTables(connectionId: string): DatabaseConnection | null {
    return this.get(`connection_full_${connectionId}`);
  }

  // Set full connection data with tables
  setConnectionWithTables(
    connectionId: string,
    connection: DatabaseConnection,
    ttlMs: number = this.ONE_DAY_MS
  ): void {
    this.set(`connection_full_${connectionId}`, connection, ttlMs);
  }

  // Get all connections metadata (without full table data)
  getConnectionsMetadata(): DatabaseConnection[] | null {
    return this.get("connections_metadata");
  }

  // Set all connections metadata
  setConnectionsMetadata(
    connections: DatabaseConnection[],
    ttlMs: number = this.ONE_DAY_MS
  ): void {
    this.set("connections_metadata", connections, ttlMs);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.clear();
      return;
    }

    // Remove entries matching pattern
    for (const [key] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Invalidate specific connection
  invalidateConnection(connectionId: string): void {
    this.invalidate(`connection_full_${connectionId}`);
    // Also invalidate connections metadata since it contains this connection
    this.invalidate("connections_metadata");
  }

  getStats(): {
    size: number;
    entries: Array<{
      key: string;
      timestamp: number;
      expiresAt: number;
      expired: boolean;
    }>;
  } {
    const now = Date.now();
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        expired: now > entry.expiresAt,
      })),
    };
  }
}

// Global cache instance
const cacheManager = new CacheManager();

export function DatabaseConnector({
  onConnectionSelect,
  selectedConnection,
}: DatabaseConnectorProps) {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(
    new Set()
  );
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(
    new Set()
  );

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<
    "all" | "table" | "column" | "database" | "schema"
  >("all");

  // SQL Query state
  const [sqlQuery, setSqlQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isQueryRunning, setIsQueryRunning] = useState(false);

  // Cache refresh state
  const [lastCacheRefresh, setLastCacheRefresh] = useState<Date | null>(null);

  // Default Snowflake connection (tables will be replaced dynamically)
  const defaultSnowflakeConnection: DatabaseConnection = {
    id: "default_snowflake",
    name: "SLM Warehouse",
    type: "snowflake",
    status: "connected",
    lastConnected: new Date(),
    tables: [],
    config: {
      account:
        process.env.NEXT_PUBLIC_SNOWFLAKE_ACCOUNT ||
        "default-account.snowflakecomputing.com",
      warehouse: "ADHOC",
      database: "ADHOC",
      schema: "PUBLIC",
      role: "SYSADMIN",
    },
  };

  useEffect(() => {
    loadConnections();
  }, []);

  // Search and filter logic
  const filteredTables = useMemo(() => {
    if (!selectedConnection || !searchQuery.trim()) {
      return selectedConnection?.tables || [];
    }

    const query = searchQuery.toLowerCase();

    return selectedConnection.tables.filter((table) => {
      // Search in table name
      if (searchType === "all" || searchType === "table") {
        if (table.name.toLowerCase().includes(query)) return true;
      }

      // Search in database name
      if (searchType === "all" || searchType === "database") {
        if (table.database.toLowerCase().includes(query)) return true;
      }

      // Search in schema name
      if (searchType === "all" || searchType === "schema") {
        if (table.schema.toLowerCase().includes(query)) return true;
      }

      // Search in table comment
      if (searchType === "all" || searchType === "table") {
        if (table.comment?.toLowerCase().includes(query)) return true;
      }

      // Search in column names and types
      if (searchType === "all" || searchType === "column") {
        if (table.columns && table.columns.length > 0) {
          return table.columns.some(
            (column) =>
              column.name.toLowerCase().includes(query) ||
              column.type.toLowerCase().includes(query)
          );
        }
      }

      return false;
    });
  }, [selectedConnection, searchQuery, searchType]);

  // Auto-expand search results
  useEffect(() => {
    if (searchQuery.trim() && filteredTables.length > 0) {
      const newExpandedDatabases = new Set(expandedDatabases);
      const newExpandedSchemas = new Set(expandedSchemas);
      const newExpandedTables = new Set(expandedTables);

      filteredTables.forEach((table) => {
        newExpandedDatabases.add(table.database);
        newExpandedSchemas.add(`${table.database}.${table.schema}`);

        // If searching for columns, expand the tables too
        if (searchType === "all" || searchType === "column") {
          newExpandedTables.add(
            `${table.database}.${table.schema}.${table.name}`
          );
        }
      });

      setExpandedDatabases(newExpandedDatabases);
      setExpandedSchemas(newExpandedSchemas);
      setExpandedTables(newExpandedTables);
    }
  }, [searchQuery, filteredTables, searchType]);

  // Unified function to fetch complete connection data with tables and columns
  const fetchCompleteConnectionData = async (
    conn: DatabaseConnection
  ): Promise<DatabaseConnection> => {
    if (conn.type !== "snowflake") return conn;

    // Check cache first
    const cachedConnection = cacheManager.getConnectionWithTables(conn.id);
    if (cachedConnection) {
      console.log(`Using cached complete data for connection ${conn.name}`);
      return cachedConnection;
    }

    // Query your custom metadata table for all data in one request
    const sql = `
      SELECT 
        DATABASE_NAME,
        SCHEMA_NAME,
        TABLE_NAME,
        TABLE_TYPE,
        COMMENT,
        COLUMNS
      FROM ADHOC.METADATA.META_DATA
      ORDER BY DATABASE_NAME, SCHEMA_NAME, TABLE_NAME
    `;

    try {
      console.log(`Fetching complete data for connection ${conn.name}`);
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
        credentials: "include", // ✅ Include session cookies
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch complete data: ${response.status} ${response.statusText}`
        );
      }

      const json = await response.json();

      // Handle the response structure from /api/query endpoint
      // The /api/query endpoint returns the data directly, not wrapped in result.rows
      if (!Array.isArray(json)) {
        console.error("Invalid response structure from /api/query:", json);
        throw new Error("Invalid response structure from query API");
      }

      const tables: TableInfo[] = json.map((row: any) => {
        // Parse columns if they exist in the metadata
        let columns: ColumnInfo[] = [];
        if (row.COLUMNS) {
          try {
            const columnsData =
              typeof row.COLUMNS === "string"
                ? JSON.parse(row.COLUMNS)
                : row.COLUMNS;
            columns = columnsData.map((col: any) => ({
              name: col.name || col.COLUMN_NAME,
              type: col.type || col.DATA_TYPE,
              nullable: col.nullable !== false && col.IS_NULLABLE !== "NO",
              default: col.default || col.COLUMN_DEFAULT,
            }));
          } catch (parseError) {
            console.warn(
              `Failed to parse columns for table ${row.TABLE_NAME}:`,
              parseError
            );
            columns = [];
          }
        }

        return {
          name: row.TABLE_NAME,
          database: row.DATABASE_NAME,
          schema: row.SCHEMA_NAME,
          tableType: row.TABLE_TYPE,
          comment: row.COMMENT,
          rows: 0,
          columns: columns, // Pre-loaded columns
        };
      });

      const completeConnection: DatabaseConnection = {
        ...conn,
        tables,
        lastConnected: new Date(),
      };

      // Cache the complete connection data
      cacheManager.setConnectionWithTables(conn.id, completeConnection);
      setLastCacheRefresh(new Date());
      console.log(
        `Cached complete data for connection ${conn.name} with ${tables.length} tables`
      );

      return completeConnection;
    } catch (err) {
      console.error("Error fetching complete connection data:", err);

      // Fallback: try to get tables from a specific database/schema using INFORMATION_SCHEMA
      try {
        const schema = conn.config.schema || "PUBLIC";
        const database = conn.config.database || "ADHOC";

        const fallbackSql = `
          SELECT 
            TABLE_NAME,
            TABLE_TYPE,
            COMMENT
          FROM ${database}.INFORMATION_SCHEMA.TABLES
          WHERE TABLE_SCHEMA = '${schema.toUpperCase()}'
            AND TABLE_CATALOG = '${database.toUpperCase()}'
          ORDER BY TABLE_NAME
        `;

        const response = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql: fallbackSql }),
          credentials: "include", // ✅ Include session cookies
        });

        if (response.ok) {
          const json = await response.json();
          if (Array.isArray(json)) {
            const fallbackTables = json.map((row: any) => ({
              name: row.TABLE_NAME,
              database: database,
              schema: schema,
              rows: 0,
              tableType: row.TABLE_TYPE || "TABLE",
              comment: row.COMMENT,
              columns: [], // Will be fetched on demand
            }));

            const fallbackConnection: DatabaseConnection = {
              ...conn,
              tables: fallbackTables,
              lastConnected: new Date(),
            };

            // Cache fallback data
            cacheManager.setConnectionWithTables(conn.id, fallbackConnection);
            console.log(
              `Cached fallback data for connection ${conn.name} with ${fallbackTables.length} tables`
            );

            return fallbackConnection;
          }
        }
      } catch (fallbackErr) {
        console.error("Fallback query also failed:", fallbackErr);
      }

      return { ...conn, tables: [], lastConnected: new Date() };
    }
  };

  // Fetch table columns on demand if they weren't pre-loaded
  const fetchTableColumnsOnDemand = async (
    conn: DatabaseConnection,
    table: TableInfo
  ): Promise<ColumnInfo[]> => {
    if (
      conn.type !== "snowflake" ||
      !table.columns ||
      table.columns.length > 0
    ) {
      return table.columns || [];
    }

    // Fallback method to get columns from INFORMATION_SCHEMA
    const sql = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COMMENT
      FROM ${table.database}.INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${table.schema.toUpperCase()}' 
        AND TABLE_NAME = '${table.name.toUpperCase()}'
        AND TABLE_CATALOG = '${table.database.toUpperCase()}'
      ORDER BY ORDINAL_POSITION
    `;

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
        credentials: "include", // ✅ Include session cookies
      });

      if (!response.ok) {
        return [];
      }

      const json = await response.json();

      if (!Array.isArray(json)) {
        return [];
      }

      const columns = json.map((row: any) => ({
        name: row.COLUMN_NAME,
        type: row.DATA_TYPE,
        nullable: row.IS_NULLABLE === "YES",
        default: row.COLUMN_DEFAULT,
      }));

      return columns;
    } catch (err) {
      console.error("Error fetching columns on demand:", err);
      return [];
    }
  };

  const loadConnections = async (forceRefresh: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Clear cache if force refresh
      if (forceRefresh) {
        cacheManager.clear();
        console.log("Cache cleared due to force refresh");
      }

      // Try to get connections metadata from cache first
      let connectionsMetadata = cacheManager.getConnectionsMetadata();

      if (!connectionsMetadata || forceRefresh) {
        // Fetch fresh connections metadata from API
        const response = await fetch("/api/connections", {
          credentials: "include", // ✅ Include session cookies
        });
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        connectionsMetadata = Array.isArray(data) ? data : [];

        // Cache the connections metadata
        cacheManager.setConnectionsMetadata(connectionsMetadata);
        console.log(
          `Cached ${connectionsMetadata.length} connections metadata`
        );
      } else {
        console.log("Using cached connections metadata");
      }

      // Add default Snowflake connection if missing
      const hasDefault = connectionsMetadata.some(
        (c) => c.id === defaultSnowflakeConnection.id
      );
      if (!hasDefault) {
        connectionsMetadata.unshift(defaultSnowflakeConnection);
      }

      // For each connection, get complete data (either from cache or fetch fresh)
      const enrichedConnections = await Promise.all(
        connectionsMetadata.map(async (conn) => {
          const connectionWithDate = {
            ...conn,
            lastConnected: new Date(conn.lastConnected),
          };

          // Get complete connection data with tables
          if (conn.type === "snowflake") {
            return await fetchCompleteConnectionData(connectionWithDate);
          }

          return connectionWithDate;
        })
      );

      setConnections(enrichedConnections);

      // If we have a selected connection, update it with fresh data
      if (selectedConnection) {
        const updatedSelected = enrichedConnections.find(
          (conn) => conn.id === selectedConnection.id
        );
        if (updatedSelected) {
          onConnectionSelect(updatedSelected);
        }
      } else if (enrichedConnections.length > 0) {
        onConnectionSelect(enrichedConnections[0]);
      }
    } catch (error) {
      console.error("Error loading connections:", error);
      setError("Failed to load connections. Please try again.");

      // Fallback to default snowflake without tables
      setConnections([defaultSnowflakeConnection]);
      if (!selectedConnection) {
        onConnectionSelect(defaultSnowflakeConnection);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Force refresh function
  const handleForceRefresh = () => {
    loadConnections(true);
  };

  // Handle database expand/collapse
  const handleDatabaseExpand = (database: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (expandedDatabases.has(database)) {
      newExpanded.delete(database);
      // Also collapse all schemas in this database
      const newExpandedSchemas = new Set(expandedSchemas);
      Array.from(expandedSchemas).forEach((schemaKey) => {
        if (schemaKey.startsWith(`${database}.`)) {
          newExpandedSchemas.delete(schemaKey);
        }
      });
      setExpandedSchemas(newExpandedSchemas);
    } else {
      newExpanded.add(database);
    }
    setExpandedDatabases(newExpanded);
  };

  // Handle schema expand/collapse
  const handleSchemaExpand = (schemaKey: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (expandedSchemas.has(schemaKey)) {
      newExpanded.delete(schemaKey);
      // Also collapse all tables in this schema
      const newExpandedTables = new Set(expandedTables);
      Array.from(expandedTables).forEach((tableKey) => {
        if (tableKey.startsWith(`${schemaKey}.`)) {
          newExpandedTables.delete(tableKey);
        }
      });
      setExpandedTables(newExpandedTables);
    } else {
      newExpanded.add(schemaKey);
    }
    setExpandedSchemas(newExpanded);
  };

  // Load table columns when a table is expanded (only if not already loaded)
  const handleTableExpand = async (tableKey: string) => {
    const newExpanded = new Set(expandedTables);

    if (expandedTables.has(tableKey)) {
      newExpanded.delete(tableKey);
    } else {
      newExpanded.add(tableKey);

      // Load columns on demand if not already loaded
      if (selectedConnection && selectedConnection.type === "snowflake") {
        const tableIndex = selectedConnection.tables.findIndex(
          (t) => `${t.database}.${t.schema}.${t.name}` === tableKey
        );
        if (
          tableIndex !== -1 &&
          (!selectedConnection.tables[tableIndex].columns ||
            selectedConnection.tables[tableIndex].columns?.length === 0)
        ) {
          const table = selectedConnection.tables[tableIndex];
          const columns = await fetchTableColumnsOnDemand(
            selectedConnection,
            table
          );

          if (columns.length > 0) {
            // Update the connection with the new column data
            const updatedTables = [...selectedConnection.tables];
            updatedTables[tableIndex] = {
              ...updatedTables[tableIndex],
              columns,
            };

            const updatedConnection = {
              ...selectedConnection,
              tables: updatedTables,
            };

            // Update cache with new column data
            cacheManager.setConnectionWithTables(
              selectedConnection.id,
              updatedConnection
            );
            onConnectionSelect(updatedConnection);
          }
        }
      }
    }

    setExpandedTables(newExpanded);
  };

  // Run SQL query via backend API
  const runQuery = async () => {
    if (!sqlQuery.trim()) {
      setQueryError("Please enter a SQL query.");
      return;
    }
    setQueryError(null);
    setIsQueryRunning(true);
    setQueryResult(null);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlQuery }),
        credentials: "include", // ✅ Include session cookies
      });
      const json = await response.json();

      if (!response.ok) {
        setQueryError(json.error || "Query failed");
      } else {
        setQueryResult(json);
      }
    } catch (err: any) {
      setQueryError(err.message || "Query failed");
    } finally {
      setIsQueryRunning(false);
    }
  };

  const handleConnectionDelete = async (connectionId: string) => {
    try {
      await fetch(`/api/connections?id=${connectionId}`, {
        method: "DELETE",
        credentials: "include", // ✅ Include session cookies
      });

      // Invalidate cache for this specific connection
      cacheManager.invalidateConnection(connectionId);
    } catch (error) {
      console.error("Error deleting connection:", error);
    }

    setConnections((prev) => prev.filter((conn) => conn.id !== connectionId));

    if (selectedConnection?.id === connectionId) {
      const remaining = connections.filter((conn) => conn.id !== connectionId);
      onConnectionSelect(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case "snowflake":
        return "❄️";
      case "csv":
        return "📄";
      case "postgres":
        return "🐘";
      case "mysql":
        return "🐬";
      default:
        return "🗄️";
    }
  };

  const formatLastConnected = (date: Date | string) => {
    const parsedDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - parsedDate.getTime();

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute(s) ago`;
    if (diffHours < 24) return `${diffHours} hour(s) ago`;
    return `${diffDays} day(s) ago`;
  };

  // Group tables by database for better organization
  const groupTablesByDatabase = (tables: TableInfo[]) => {
    const grouped: Record<string, Record<string, TableInfo[]>> = {};

    tables.forEach((table) => {
      if (!grouped[table.database]) {
        grouped[table.database] = {};
      }
      if (!grouped[table.database][table.schema]) {
        grouped[table.database][table.schema] = [];
      }
      grouped[table.database][table.schema].push(table);
    });

    return grouped;
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Expand/Collapse all
  const expandAllResults = () => {
    const newExpandedDatabases = new Set<string>();
    const newExpandedSchemas = new Set<string>();
    const newExpandedTables = new Set<string>();

    filteredTables.forEach((table) => {
      newExpandedDatabases.add(table.database);
      newExpandedSchemas.add(`${table.database}.${table.schema}`);
      newExpandedTables.add(`${table.database}.${table.schema}.${table.name}`);
    });

    setExpandedDatabases(newExpandedDatabases);
    setExpandedSchemas(newExpandedSchemas);
    setExpandedTables(newExpandedTables);
  };

  const collapseAll = () => {
    setExpandedDatabases(new Set());
    setExpandedSchemas(new Set());
    setExpandedTables(new Set());
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-cyan-400 mr-3" />
            <span className="text-slate-300">Loading connections...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Database Connections
          </h3>
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-400">
              Connect to your data sources to start analyzing
            </p>
            {lastCacheRefresh && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                <span>
                  Cache updated: {formatLastConnected(lastCacheRefresh)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleForceRefresh}
            variant="outline"
            size="sm"
            className="text-slate-400 border-slate-600 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Cache
          </Button>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </Button>
        </div>
      </div>

      {/* Cache Status */}
      {(() => {
        const stats = cacheManager.getStats();
        return stats.size > 0 ? (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-400">
              Cache active: {stats.size} entries stored. Complete connection
              data cached for improved performance.
            </AlertDescription>
          </Alert>
        ) : null;
      })()}

      {/* Error Alert */}
      {error && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Connections Grid */}
      {connections.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <Database className="h-12 w-12 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-medium text-white mb-2">
              No Connections Found
            </h3>
            <p className="text-slate-400 mb-4">
              Add your first database connection to get started with data
              analysis
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((connection) => (
            <Card
              key={connection.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedConnection?.id === connection.id
                  ? "bg-cyan-900/30 border-cyan-500/50 ring-1 ring-cyan-500/30"
                  : "bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 hover:border-slate-600"
              }`}
              onClick={() => onConnectionSelect(connection)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getConnectionIcon(connection.type)}
                    </div>
                    <div>
                      <CardTitle className="text-white text-sm">
                        {connection.name}
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-xs">
                        {connection.type.toUpperCase()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        connection.status === "connected"
                          ? "text-green-400 border-green-400/30"
                          : "text-red-400 border-red-400/30"
                      }
                    >
                      {connection.status === "connected" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {connection.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnectionDelete(connection.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Connection Details */}
                  <div className="text-xs text-slate-400">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        Last connected:{" "}
                        {formatLastConnected(connection.lastConnected)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Table className="h-3 w-3" />
                      <span>{connection.tables.length} tables available</span>
                    </div>
                  </div>

                  {/* Tables Preview with Database info */}
                  {connection.tables.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-slate-300">
                        Recent Tables:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {connection.tables.slice(0, 2).map((table, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs text-slate-400 border-slate-600"
                            title={`${table.database}.${table.schema}.${table.name}`}
                          >
                            {table.database !== "ADHOC"
                              ? `${table.database}.`
                              : ""}
                            {table.name}
                          </Badge>
                        ))}
                        {connection.tables.length > 2 && (
                          <Badge
                            variant="outline"
                            className="text-xs text-slate-400 border-slate-600"
                          >
                            +{connection.tables.length - 2} more
                          </Badge>
                        )}
                      </div>

                      {/* Show unique databases/schemas */}
                      <div className="text-xs text-slate-500">
                        {(() => {
                          const databases = [
                            ...new Set(
                              connection.tables.map((t) => t.database)
                            ),
                          ];
                          const schemas = [
                            ...new Set(
                              connection.tables.map(
                                (t) => `${t.database}.${t.schema}`
                              )
                            ),
                          ];
                          return `${databases.length} database(s), ${schemas.length} schema(s)`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Connection Details */}
      {selectedConnection && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {getConnectionIcon(selectedConnection.type)}
                </div>
                <div>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    {selectedConnection.name}
                    <Badge
                      variant="outline"
                      className={
                        selectedConnection.status === "connected"
                          ? "text-green-400 border-green-400/30"
                          : "text-red-400 border-red-400/30"
                      }
                    >
                      {selectedConnection.status === "connected" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {selectedConnection.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {selectedConnection.type.toUpperCase()} • Last connected{" "}
                    {formatLastConnected(selectedConnection.lastConnected)}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Connection Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">
                  Databases:{" "}
                  <span className="text-white">
                    {
                      [
                        ...new Set(
                          selectedConnection.tables.map((t) => t.database)
                        ),
                      ].length
                    }
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Table className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">
                  Schemas:{" "}
                  <span className="text-white">
                    {
                      [
                        ...new Set(
                          selectedConnection.tables.map(
                            (t) => `${t.database}.${t.schema}`
                          )
                        ),
                      ].length
                    }
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">
                  Tables:{" "}
                  <span className="text-white">
                    {selectedConnection.tables.length}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">
                  Total Rows:{" "}
                  <span className="text-white">
                    {selectedConnection.tables
                      .reduce((sum, t) => sum + (t.rows || 0), 0)
                      .toLocaleString()}
                  </span>
                </span>
              </div>
            </div>

            {/* Search Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Database Schema
                </h4>
                <div className="flex items-center gap-2">
                  {searchQuery && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={expandAllResults}
                        className="text-xs h-7 text-slate-400 border-slate-600 hover:text-white"
                      >
                        Expand All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={collapseAll}
                        className="text-xs h-7 text-slate-400 border-slate-600 hover:text-white"
                      >
                        Collapse All
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search tables, columns, databases, schemas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-cyan-500"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Search Type Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <div className="flex gap-1">
                    {[
                      { value: "all", label: "All" },
                      { value: "database", label: "DB" },
                      { value: "schema", label: "Schema" },
                      { value: "table", label: "Table" },
                      { value: "column", label: "Column" },
                    ].map((type) => (
                      <Button
                        key={type.value}
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchType(type.value as any)}
                        className={`text-xs h-7 ${
                          searchType === type.value
                            ? "bg-cyan-600 border-cyan-500 text-white"
                            : "text-slate-400 border-slate-600 hover:text-white"
                        }`}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search Results Info */}
              {searchQuery && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Info className="h-4 w-4" />
                  <span>
                    Found {filteredTables.length} table
                    {filteredTables.length !== 1 ? "s" : ""}
                    {searchType !== "all" && ` in ${searchType} search`}
                    {filteredTables.length > 0 && (
                      <span className="ml-2 text-cyan-400">
                        •{" "}
                        {
                          [...new Set(filteredTables.map((t) => t.database))]
                            .length
                        }{" "}
                        database(s),{" "}
                        {
                          [
                            ...new Set(
                              filteredTables.map(
                                (t) => `${t.database}.${t.schema}`
                              )
                            ),
                          ].length
                        }{" "}
                        schema(s)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Tables organized by Database and Schema */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Table className="h-4 w-4" />
                {searchQuery
                  ? `Search Results (${filteredTables.length} tables)`
                  : "Available Tables (Organized by Database & Schema)"}
              </h4>

              {filteredTables.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/30 rounded-lg border border-slate-700/50">
                  <div className="flex flex-col items-center">
                    {searchQuery ? (
                      <>
                        <Search className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-slate-500 text-sm">
                          No results found for "{searchQuery}"
                        </p>
                        <p className="text-slate-600 text-xs mt-1">
                          Try different keywords or change the search type
                        </p>
                      </>
                    ) : (
                      <>
                        <Table className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-slate-500 text-sm">
                          No tables available
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                  {Object.entries(groupTablesByDatabase(filteredTables)).map(
                    ([database, schemaGroups]) => (
                      <div
                        key={database}
                        className="bg-slate-900/50 rounded-lg border border-slate-700/50"
                      >
                        {/* Database Header */}
                        <div className="p-3 border-b border-slate-700/50 bg-slate-800/50">
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => handleDatabaseExpand(database)}
                          >
                            <div className="flex items-center gap-2">
                              {expandedDatabases.has(database) ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                              <Database className="h-4 w-4 text-cyan-400" />
                              <h5 className="text-white font-medium text-sm">
                                {database}
                              </h5>
                              <Badge
                                variant="outline"
                                className="text-xs text-slate-400 border-slate-600"
                              >
                                {Object.values(schemaGroups).reduce(
                                  (sum, tables) => sum + tables.length,
                                  0
                                )}{" "}
                                tables
                              </Badge>
                              {searchQuery && (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-yellow-400 border-yellow-400/30"
                                >
                                  Search Match
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              {Object.keys(schemaGroups).length} schema
                              {Object.keys(schemaGroups).length !== 1
                                ? "s"
                                : ""}
                            </div>
                          </div>
                        </div>

                        {/* Schemas - only show if database is expanded */}
                        {expandedDatabases.has(database) && (
                          <>
                            {Object.entries(schemaGroups).map(
                              ([schema, tables]) => {
                                const schemaKey = `${database}.${schema}`;
                                return (
                                  <div
                                    key={schemaKey}
                                    className="border-b border-slate-700/50 last:border-b-0"
                                  >
                                    {/* Schema Header */}
                                    <div className="p-3 bg-slate-800/30">
                                      <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() =>
                                          handleSchemaExpand(schemaKey)
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          {expandedSchemas.has(schemaKey) ? (
                                            <ChevronDown className="h-3 w-3 text-slate-400 ml-4" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3 text-slate-400 ml-4" />
                                          )}
                                          <Columns className="h-3 w-3 text-slate-400" />
                                          <h6 className="text-slate-300 font-medium text-sm">
                                            {schema}
                                          </h6>
                                          <Badge
                                            variant="outline"
                                            className="text-xs text-slate-400 border-slate-600"
                                          >
                                            {tables.length} tables
                                          </Badge>
                                          {searchQuery &&
                                            tables.some((table) =>
                                              table.schema
                                                .toLowerCase()
                                                .includes(
                                                  searchQuery.toLowerCase()
                                                )
                                            ) && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs text-yellow-400 border-yellow-400/30"
                                              >
                                                Search Match
                                              </Badge>
                                            )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Tables in this schema - only show if schema is expanded */}
                                    {expandedSchemas.has(schemaKey) && (
                                      <div className="space-y-1 p-2">
                                        {tables.map((table) => {
                                          const tableKey = `${table.database}.${table.schema}.${table.name}`;
                                          const hasColumnMatch =
                                            searchQuery &&
                                            (searchType === "all" ||
                                              searchType === "column") &&
                                            table.columns?.some(
                                              (col) =>
                                                col.name
                                                  .toLowerCase()
                                                  .includes(
                                                    searchQuery.toLowerCase()
                                                  ) ||
                                                col.type
                                                  .toLowerCase()
                                                  .includes(
                                                    searchQuery.toLowerCase()
                                                  )
                                            );
                                          const hasTableMatch =
                                            searchQuery &&
                                            (table.name
                                              .toLowerCase()
                                              .includes(
                                                searchQuery.toLowerCase()
                                              ) ||
                                              table.comment
                                                ?.toLowerCase()
                                                .includes(
                                                  searchQuery.toLowerCase()
                                                ));

                                          return (
                                            <div
                                              key={tableKey}
                                              className="bg-slate-800/30 rounded border border-slate-700/30"
                                            >
                                              {/* Table Header */}
                                              <div
                                                className="p-3 cursor-pointer hover:bg-slate-700/50 transition-colors"
                                                onClick={() =>
                                                  handleTableExpand(tableKey)
                                                }
                                              >
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 text-slate-400 flex-shrink-0">
                                                      {expandedTables.has(
                                                        tableKey
                                                      ) ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                      ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                      )}
                                                      <Table className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                      <div className="flex items-center gap-2">
                                                        <h5 className="text-white font-medium text-sm">
                                                          {table.name}
                                                        </h5>
                                                        {(hasTableMatch ||
                                                          hasColumnMatch) && (
                                                          <Badge
                                                            variant="outline"
                                                            className="text-xs text-yellow-400 border-yellow-400/30"
                                                          >
                                                            {hasColumnMatch
                                                              ? "Column Match"
                                                              : "Table Match"}
                                                          </Badge>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                                    {table.tableType && (
                                                      <Badge
                                                        variant="outline"
                                                        className="text-xs text-slate-400 border-slate-600"
                                                      >
                                                        {table.tableType}
                                                      </Badge>
                                                    )}
                                                    {table.columns &&
                                                      table.columns.length >
                                                        0 && (
                                                        <Badge
                                                          variant="outline"
                                                          className="text-xs text-blue-400 border-blue-400/30"
                                                        >
                                                          {table.columns.length}{" "}
                                                          cols
                                                        </Badge>
                                                      )}
                                                  </div>
                                                </div>
                                                {table.comment && (
                                                  <div className="mt-2 ml-10">
                                                    <p className="text-slate-400 text-xs leading-relaxed">
                                                      {table.comment}
                                                    </p>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Table Columns - only show if table is expanded */}
                                              {expandedTables.has(tableKey) && (
                                                <div className="border-t border-slate-700/50 p-4">
                                                  <div className="flex items-center gap-2 mb-3">
                                                    <Columns className="h-4 w-4 text-slate-400" />
                                                    <span className="text-slate-300 text-sm font-medium">
                                                      Columns (
                                                      {table.columns?.length ||
                                                        0}
                                                      )
                                                    </span>
                                                    <Badge
                                                      variant="outline"
                                                      className="text-xs text-blue-400 border-blue-400/30"
                                                    >
                                                      {table.database}.
                                                      {table.schema}
                                                    </Badge>
                                                  </div>

                                                  {table.columns &&
                                                  table.columns.length > 0 ? (
                                                    <div className="grid grid-cols-1 gap-2">
                                                      {table.columns.map(
                                                        (column, index) => {
                                                          const columnMatch =
                                                            searchQuery &&
                                                            (searchType ===
                                                              "all" ||
                                                              searchType ===
                                                                "column") &&
                                                            (column.name
                                                              .toLowerCase()
                                                              .includes(
                                                                searchQuery.toLowerCase()
                                                              ) ||
                                                              column.type
                                                                .toLowerCase()
                                                                .includes(
                                                                  searchQuery.toLowerCase()
                                                                ));

                                                          return (
                                                            <div
                                                              key={index}
                                                              className={`flex items-center justify-between p-2 rounded border ${
                                                                columnMatch
                                                                  ? "bg-yellow-500/10 border-yellow-400/30"
                                                                  : "bg-slate-700/50 border-slate-600/30"
                                                              }`}
                                                            >
                                                              <div className="flex items-center gap-2">
                                                                <span className="text-slate-300 text-sm font-mono">
                                                                  {column.name}
                                                                </span>
                                                                <Badge
                                                                  variant="outline"
                                                                  className="text-xs text-slate-400 border-slate-600 font-mono"
                                                                >
                                                                  {column.type}
                                                                </Badge>
                                                                {columnMatch && (
                                                                  <Badge
                                                                    variant="outline"
                                                                    className="text-xs text-yellow-400 border-yellow-400/30"
                                                                  >
                                                                    Match
                                                                  </Badge>
                                                                )}
                                                              </div>
                                                              <div className="flex items-center gap-1">
                                                                {!column.nullable && (
                                                                  <Badge
                                                                    variant="outline"
                                                                    className="text-xs text-orange-400 border-orange-400/30"
                                                                  >
                                                                    NOT NULL
                                                                  </Badge>
                                                                )}
                                                                {column.default && (
                                                                  <Badge
                                                                    variant="outline"
                                                                    className="text-xs text-blue-400 border-blue-400/30"
                                                                  >
                                                                    DEFAULT
                                                                  </Badge>
                                                                )}
                                                              </div>
                                                            </div>
                                                          );
                                                        }
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div className="text-center py-4">
                                                      <RefreshCw className="h-4 w-4 animate-spin text-slate-400 mx-auto mb-2" />
                                                      <p className="text-slate-500 text-sm">
                                                        Loading columns...
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            )}
                          </>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Dialog for adding new connections */}
      <ConnectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConnectionAdded={async () => {
          setIsDialogOpen(false);
          await loadConnections();
        }}
      />
    </div>
  );
}
