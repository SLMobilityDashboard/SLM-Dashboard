// Central place for the SQL this page runs. Every query goes through the
// existing /api/query endpoint via useWarehouseQuery, so caching/auth/dedup
// are already handled — these strings are the only Snowflake-specific bit.

export const TASKS_SQL = `
  SELECT
    LOG_ID, QUERY_ID, TASK_NAME, SCHEDULED_TIME, START_TIME, END_TIME,
    STATUS, MESSAGE, WAREHOUSE_NAME, EXECUTION_TIME_SECONDS,
    CREDITS_USED, ERROR_MESSAGE, PROCESSED_AT, IS_READ, COMMENT
  FROM SOURCE_DATA.LOGS.TASK_EXECUTION_LOG
  WHERE SCHEDULED_TIME >= DATEADD(day, -2, CURRENT_TIMESTAMP())
  ORDER BY SCHEDULED_TIME DESC
  LIMIT 500
`;

export const PIPES_SQL = `
  SELECT
    PIPE_NAME, EXECUTION_STATE, PENDING_FILE_COUNT, LAST_INGESTED_AT,
    LAST_INGESTED_FILE_PATH, PIPE_ID, START_TIME, END_TIME,
    CREDITS_USED, BYTES_INSERTED, FILES_INSERTED, BYTES_BILLED,
    CURRENT_TIMESTAMP() AS _AS_OF
  FROM SOURCE_DATA.LOGS.PIPE_LOG
`;

export const COSTS_SQL = `
  SELECT
    USAGE_DATE, WAREHOUSE_ID, WAREHOUSE_NAME, TOTAL_CREDITS_USED,
    CURRENT_TIMESTAMP() AS _AS_OF
  FROM SOURCE_DATA.LOGS.WAREHOUSE_COST
  ORDER BY USAGE_DATE DESC, WAREHOUSE_NAME
`;

// -------------------- Types --------------------

export interface TaskExecutionRow {
  LOG_ID: number;
  QUERY_ID: string | null;
  TASK_NAME: string;
  SCHEDULED_TIME: string | null;
  START_TIME: string | null;
  END_TIME: string | null;
  STATUS: string;
  MESSAGE: string | null;
  WAREHOUSE_NAME: string | null;
  EXECUTION_TIME_SECONDS: number | null;
  CREDITS_USED: number | null;
  ERROR_MESSAGE: string | null;
  PROCESSED_AT: string | null;
  IS_READ: boolean;
  COMMENT: string | null;
}

export interface PipeLogRow {
  PIPE_NAME: string;
  EXECUTION_STATE: string | null;
  PENDING_FILE_COUNT: number | null;
  LAST_INGESTED_AT: string | null;
  LAST_INGESTED_FILE_PATH: string | null;
  PIPE_ID: string;
  START_TIME: string | null;
  END_TIME: string | null;
  CREDITS_USED: number | null;
  BYTES_INSERTED: number | null;
  FILES_INSERTED: number | null;
  BYTES_BILLED: number | null;
  _AS_OF: string;
}

export interface WarehouseCostRow {
  USAGE_DATE: string;
  WAREHOUSE_ID: string;
  WAREHOUSE_NAME: string;
  TOTAL_CREDITS_USED: number;
  _AS_OF: string;
}

// -------------------- Status helpers --------------------

export type TaskStatusGroup = "success" | "failed" | "running" | "skipped" | "other";

export function normalizeTaskStatus(status: string | null | undefined): TaskStatusGroup {
  const s = (status ?? "").toUpperCase();
  if (["SUCCESS", "SUCCEEDED", "COMPLETE", "COMPLETED"].includes(s)) return "success";
  if (["FAILED", "FAILURE", "ERROR"].includes(s)) return "failed";
  if (["RUNNING", "IN_PROGRESS", "EXECUTING", "SCHEDULED"].includes(s)) return "running";
  if (["SKIPPED", "CANCELLED", "CANCELED"].includes(s)) return "skipped";
  return "other";
}

export function isPipeHealthy(state: string | null | undefined): boolean {
  return (state ?? "").toUpperCase() === "RUNNING";
}

// -------------------- Formatting helpers --------------------

export function formatCredits(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 2 : 0)} ${units[i]}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function minutesAgo(value: string | null | undefined): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((Date.now() - d.getTime()) / 60000);
}