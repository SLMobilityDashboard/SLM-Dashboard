import { TableDescription } from "../models/TableDescription.js";
import SnowflakeConnectionManager from "@/lib/snowflake_adhoc_prod";

export default class TableSelectorUtils {
  /**
   * Fetch table descriptions dynamically from Snowflake metadata.
   * Calls Snowflake directly — no HTTP round-trip, no auth issues.
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

    // ✅ Call Snowflake directly — no fetch, no cookie issues
    // Uses JWT fallback with SNOWFLAKE_USERNAME from .env
    const result = await SnowflakeConnectionManager.executeQuery(
      sql,
      undefined,  // no user — uses env default
      false,      // no audit comment needed for system queries
      undefined   // no oauth token — uses JWT service account
    );

    const rows = result.rows;

    if (!rows || !Array.isArray(rows)) {
      console.error("Invalid metadata response format:", rows);
      throw new Error("Invalid metadata response: expected array of rows");
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
            ? columnsRaw.split(",").map((c: string) => c.trim())
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
   * Get unique table categories
   */
  static getTableCategories(tables: TableDescription[]): string[] {
    const categories = new Set<string>();
    tables.forEach(table => {
      const parts = table.tableName.split('_');
      if (parts.length > 1) {
        categories.add(parts[0]);
      }
    });
    return Array.from(categories).sort();
  }
}