// utils/TableSelectorUtils.ts
import { TableDescription } from "../models/TableDescription.js";

export default class TableSelectorUtils {
  /**
   * Fetch table descriptions dynamically from Snowflake metadata
   * Handles both raw array responses and { result: { rows: [...] } } responses
   * 
   * IMPORTANT: This should be called from server-side code (Server Components, 
   * Server Actions, or API routes) to ensure authentication works properly.
   */
  static async fetchTableDescriptions(): Promise<TableDescription[]> {
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

    // Use relative URL for server-side calls, absolute for client-side
    const baseUrl = typeof window === 'undefined' 
      ? process.env.NEXTAUTH_URL || 'http://localhost:3000'
      : '';

    const response = await fetch(`${baseUrl}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-System-Request": "TableSelector", // Mark as system request
      },
      credentials: 'include', // Critical: Include cookies for authentication
      body: JSON.stringify({ 
        sql,
        systemUser: 'SYSTEM' // Pass system user identifier
      }),
    });

    if (!response.ok) {
      // Check for authentication errors
      if (response.status === 401) {
        throw new Error("Unauthorized: Please sign in to access table metadata");
      }
      
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `Failed to fetch tables: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const json = await response.json();

    // Handle both possible response formats
    const rows = json?.result?.rows || (Array.isArray(json) ? json : null);

    if (!rows || !Array.isArray(rows)) {
      console.error("Invalid metadata response format:", json);
      throw new Error("Invalid metadata response: expected array or result.rows");
    }

    return rows
      .map((row: any, index: number) => {
        const tableName = row.TABLE_NAME;
        const comment = row.COMMENT || "";
        const columnsRaw = row.COLUMNS;

        if (!tableName || typeof tableName !== "string") {
          console.warn(`Skipping invalid table at index ${index}`, row);
          return null;
        }

        const columns =
          typeof columnsRaw === "string"
            ? columnsRaw.split(",").map((c) => c.trim())
            : Array.isArray(columnsRaw)
            ? columnsRaw
            : [];

        return new TableDescription(tableName, comment, columns);
      })
      .filter(Boolean) as TableDescription[];
  }

  /**
   * Sample fallback table descriptions (hardcoded)
   * Use this for testing or as fallback when metadata service is unavailable
   */
  static createSampleTableDescriptions(): TableDescription[] {
    return [
      new TableDescription(
        "EMPLOYEES",
        "Employee details including department assignments",
        ["ID", "NAME", "DEPARTMENT", "HIRE_DATE", "SALARY"]
      ),
      new TableDescription(
        "DEPARTMENTS",
        "Department information and hierarchy",
        ["ID", "NAME", "MANAGER_ID", "LOCATION"]
      ),
      new TableDescription(
        "SALES",
        "Sales transaction records",
        ["ID", "EMPLOYEE_ID", "AMOUNT", "DATE", "PRODUCT"]
      ),
    ];
  }

  /**
   * Fetch tables with error handling and fallback
   * Returns sample data if fetch fails
   */
  static async fetchTablesWithFallback(): Promise<{
    tables: TableDescription[];
    source: 'metadata' | 'sample';
    error?: string;
  }> {
    try {
      const tables = await this.fetchTableDescriptions();
      return { tables, source: 'metadata' };
    } catch (error) {
      console.error("Failed to fetch table metadata:", error);
      return {
        tables: this.createSampleTableDescriptions(),
        source: 'sample',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log table selection results (for debugging)
   */
  static logSelectionResults(
    query: string,
    selectedTables: TableDescription[],
    allTables: TableDescription[]
  ) {
    console.log(`Query: ${query}`);
    console.log(`Selected ${selectedTables.length} of ${allTables.length} tables:`);
    selectedTables.forEach(table => {
      console.log(`  - ${table.tableName} (${table.columns.length} columns)`);
    });
  }

  /**
   * Filter tables by database/schema pattern
   */
  static filterTablesByPattern(
    tables: TableDescription[],
    pattern: string
  ): TableDescription[] {
    const lowerPattern = pattern.toLowerCase();
    return tables.filter(table => 
      table.tableName.toLowerCase().includes(lowerPattern) ||
      table.comment.toLowerCase().includes(lowerPattern) ||
      table.columns.some(col => col.toLowerCase().includes(lowerPattern))
    );
  }

  /**
   * Get unique table categories (useful for grouping)
   */
  static getTableCategories(tables: TableDescription[]): string[] {
    const categories = new Set<string>();
    tables.forEach(table => {
      // Extract category from table name (e.g., "SALES_" prefix)
      const parts = table.tableName.split('_');
      if (parts.length > 1) {
        categories.add(parts[0]);
      }
    });
    return Array.from(categories).sort();
  }
}