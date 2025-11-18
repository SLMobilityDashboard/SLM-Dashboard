import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Zap,
  MapPin,
  Clock,
  TrendingUp,
  Battery,
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Tooltip, useTooltip, defaultStyles } from "@visx/tooltip";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar as RechartsBar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { ParentSize } from "@visx/responsive";

// -------------------- Skeleton Components --------------------
export const ChartSkeleton = () => (
  <div className="h-[300px] w-full bg-slate-800/50 animate-pulse rounded-lg flex items-center justify-center">
    <div className="text-slate-400">Loading chart data...</div>
  </div>
);

export const MetricSkeleton = () => (
  <div className="h-24 bg-slate-800/50 animate-pulse rounded-lg" />
);

// -------------------- Data Interfaces --------------------
interface TBoxBMSSession {
  SESSION_ID: number | null;
  TBOXID: number;
  BMSID: string;
  START_TIME: string;
  END_TIME: string;
  DURATION: string;
}

interface ProcessedSwapData {
  sessionId: number | null;
  tboxId: number;
  bmsId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  date: string;
  hour: number;
  dayOfWeek: string;
  isUnavailable: boolean;
}

interface DailySummary {
  date: string;
  activeHours: number;
  unavailableHours: number;
  totalSessions: number;
  uniqueBMS: number;
  bmsBreakdown: Record<string, number>;
  totalHours: number;
}

// -------------------- Color Generation --------------------
function generateBMSColorMap(bmsIds: string[]): Record<string, string> {
  const colors = [
    "#10b981",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
    "#14b8a6",
    "#eab308",
    "#dc2626",
    "#9333ea",
    "#0891b2",
    "#65a30d",
    "#ea580c",
    "#be185d",
    "#7c3aed",
    "#0f766e",
  ];

  const colorMap: Record<string, string> = {};
  colorMap["UNAVAILABLE"] = "#FFFFFF";
  colorMap["UNCOVERED"] = "#6b7280";
  colorMap["NO_BMS"] = "#6b7280";

  bmsIds.forEach((bmsId, index) => {
    colorMap[bmsId] = colors[index % colors.length];
  });

  return colorMap;
}

// -------------------- Helpers --------------------
function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const sriLankaOffset = 5.5 * 60 * 60 * 1000;
  const dateSL = new Date(date.getTime() + sriLankaOffset);
  return dateSL.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  const sriLankaOffset = 5.5 * 60 * 60 * 1000;
  const dateSL = new Date(date.getTime() + sriLankaOffset);
  return dateSL.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number) {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds}s`;
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

function parseDuration(durationStr: string): number {
  const match = durationStr.match(/(\d+)\.?h\s*(\d+)\.?m/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }
  const simpleMatch = durationStr.match(/(\d+):(\d+):(\d+)/);
  if (simpleMatch) {
    const hours = parseInt(simpleMatch[1], 10);
    const minutes = parseInt(simpleMatch[2], 10);
    return hours * 60 + minutes;
  }
  return 0;
}

function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function processSwapData(rawData: TBoxBMSSession[]): ProcessedSwapData[] {
  const processedSessions: ProcessedSwapData[] = [];

  rawData
    .filter((session) => session.START_TIME && session.END_TIME)
    .forEach((session) => {
      const parseSriLankaTime = (dateString: string) => {
        const date = new Date(dateString);
        if (!dateString.endsWith("Z") && dateString.indexOf("+") === -1) {
          const sriLankaOffset = 5.5 * 60 * 60 * 1000;
          const utcTime = new Date(date.getTime() - sriLankaOffset);
          return utcTime;
        }
        return date;
      };

      const startTime = parseSriLankaTime(session.START_TIME);
      const endTime = parseSriLankaTime(session.END_TIME);
      const isUnavailable =
        session.BMSID === "UNAVAILABLE" || session.SESSION_ID === null;

      // Split sessions that cross day boundaries at every midnight
      let currentStart = new Date(startTime);

      while (currentStart < endTime) {
        // Convert current start to Sri Lanka time to determine the date
        const sriLankaOffset = 5.5 * 60 * 60 * 1000;
        const currentStartSL = new Date(
          currentStart.getTime() + sriLankaOffset
        );

        // Find the next midnight in Sri Lanka time
        const nextMidnightSL = new Date(currentStartSL);
        nextMidnightSL.setHours(24, 0, 0, 0); // This automatically rolls over to next day at 00:00:00

        // Convert next midnight back to UTC
        const nextMidnightUTC = new Date(
          nextMidnightSL.getTime() - sriLankaOffset
        );

        // The segment ends at either the next midnight or the session end, whichever is earlier
        const segmentEnd = new Date(
          Math.min(nextMidnightUTC.getTime(), endTime.getTime())
        );

        // Calculate duration for this segment
        const segmentDurationMinutes = Math.max(
          0,
          (segmentEnd.getTime() - currentStart.getTime()) / (1000 * 60)
        );

        // Only create a session segment if it has duration
        if (segmentDurationMinutes > 0) {
          // Format date for this segment (based on Sri Lanka time)
          const year = currentStartSL.getFullYear();
          const month = String(currentStartSL.getMonth() + 1).padStart(2, "0");
          const day = String(currentStartSL.getDate()).padStart(2, "0");
          const date = `${year}-${month}-${day}`;

          processedSessions.push({
            sessionId: session.SESSION_ID,
            tboxId: session.TBOXID,
            bmsId: session.BMSID,
            startTime: new Date(currentStart),
            endTime: new Date(segmentEnd),
            durationMinutes: segmentDurationMinutes,
            date,
            hour: currentStartSL.getHours(),
            dayOfWeek: currentStartSL.toLocaleDateString("en-US", {
              weekday: "long",
            }),
            isUnavailable,
          });
        }

        // Move to the next day boundary (or end if we've reached the session end)
        currentStart = new Date(nextMidnightUTC);
      }
    });

  return processedSessions.sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );
}

function getAnalytics(data: ProcessedSwapData[]) {
  if (data.length === 0) return null;

  const allBMSIds = [
    ...new Set(
      data
        .filter((d) => d.bmsId && d.bmsId !== "UNAVAILABLE")
        .map((d) => d.bmsId)
    ),
  ].sort();

  const bmsColorMap = generateBMSColorMap(allBMSIds);
  const UNAVAILABLE_COLOR = "#FFFFFF";
  const NULL_COLOR = "#6b7280";
  const UNCOVERED_COLOR = "#6b7280";

  const allDates = [...new Set(data.map((d) => d.date))].sort();
  const startDate = allDates[0];
  const endDate = allDates[allDates.length - 1];
  const allDatesInRange = getDatesInRange(startDate, endDate);

  const dailySummaries: DailySummary[] = [];

  allDatesInRange.forEach((date) => {
    const daySessions = data
      .filter((d) => d.date === date)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const sessionMinutes: { [key: string]: number } = {};
    let totalSessionMinutes = 0;

    // Process all sessions for this day
    daySessions.forEach((session) => {
      const sessionDuration = session.durationMinutes;

      if (sessionDuration > 0) {
        totalSessionMinutes += sessionDuration;

        let bmsKey: string;
        if (session.bmsId === "UNAVAILABLE") {
          bmsKey = "UNAVAILABLE";
        } else if (
          !session.bmsId ||
          session.bmsId === "null" ||
          session.sessionId === null
        ) {
          bmsKey = "NO_BMS";
        } else {
          bmsKey = session.bmsId;
        }

        sessionMinutes[bmsKey] =
          (sessionMinutes[bmsKey] || 0) + sessionDuration;
      }
    });

    const totalDayMinutes = 24 * 60;
    const uncoveredMinutes = Math.max(0, totalDayMinutes - totalSessionMinutes);

    // Add uncovered time as unavailable
    if (uncoveredMinutes > 0) {
      sessionMinutes["UNAVAILABLE"] =
        (sessionMinutes["UNAVAILABLE"] || 0) + uncoveredMinutes;
    }

    // Ensure we don't exceed 24 hours per day (safety check)
    const totalMinutes = Object.values(sessionMinutes).reduce(
      (sum, mins) => sum + mins,
      0
    );
    if (totalMinutes > totalDayMinutes) {
      console.warn(
        `Day ${date} has ${
          totalMinutes / 60
        } hours, which exceeds 24. Normalizing to 24 hours.`
      );

      // Normalize to exactly 24 hours by proportionally reducing all sessions
      const scaleFactor = totalDayMinutes / totalMinutes;
      Object.keys(sessionMinutes).forEach((key) => {
        sessionMinutes[key] = sessionMinutes[key] * scaleFactor;
      });
    }

    const bmsBreakdown: Record<string, number> = {};
    Object.entries(sessionMinutes).forEach(([bmsId, minutes]) => {
      bmsBreakdown[bmsId] = minutes / 60;
    });

    const activeHours = Object.entries(sessionMinutes)
      .filter(([bmsId]) => bmsId !== "UNAVAILABLE" && bmsId !== "NO_BMS")
      .reduce((sum, [, minutes]) => sum + minutes / 60, 0);

    const unavailableHours =
      (sessionMinutes["UNAVAILABLE"] || 0) / 60 +
      (sessionMinutes["NO_BMS"] || 0) / 60;

    dailySummaries.push({
      date,
      activeHours,
      unavailableHours,
      totalSessions: daySessions.filter((d) => !d.isUnavailable).length,
      uniqueBMS: new Set(
        daySessions
          .filter((d) => !d.isUnavailable && d.bmsId)
          .map((d) => d.bmsId)
      ).size,
      bmsBreakdown,
      totalHours: 24, // Always exactly 24 hours
    });
  });

  const activeSessions = data.filter((d) => !d.isUnavailable);
  const totalSessions = activeSessions.length;

  // Filter only valid battery records (exclude "NO_BMS" and "UNAVAILABLE")
  const avgDuration =
    activeSessions.length > 0
      ? activeSessions.reduce((sum, d) => sum + d.durationMinutes, 0) /
        activeSessions.length
      : 0;

  const uniqueTBoxes = new Set(data.map((d) => d.tboxId)).size;
  const uniqueBMS = allBMSIds.length;

  const hourlyActivity = activeSessions.reduce((acc, d) => {
    acc[d.hour] = (acc[d.hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const weeklyActivity = activeSessions.reduce((acc, d) => {
    acc[d.dayOfWeek] = (acc[d.dayOfWeek] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalUncoveredHours = dailySummaries.reduce(
    (sum, day) => sum + (day.bmsBreakdown["UNCOVERED"] || 0),
    0
  );

  const statusDistribution = {
    Active: data
      .filter((d) => !d.isUnavailable)
      .reduce((sum, d) => sum + d.durationMinutes / 60, 0),
    Unavailable:
      data
        .filter((d) => d.isUnavailable)
        .reduce((sum, d) => sum + d.durationMinutes / 60, 0) +
      totalUncoveredHours,
  };

  // Calculate operational efficiency metrics for business
  const operationalEfficiency = dailySummaries.map((day) => ({
    date: day.date,
    uptime: (day.activeHours / 24) * 100,
    downtime: (day.unavailableHours / 24) * 100,
    utilizationRate:
      day.totalSessions > 0 ? day.activeHours / day.totalSessions : 0,
  }));

  return {
    totalSessions,
    avgDuration,
    uniqueTBoxes,
    uniqueBMS,
    dailySummaries,
    bmsColorMap,
    uniqueBMSIds: allBMSIds,
    unavailableColor: UNAVAILABLE_COLOR,
    nullColor: NULL_COLOR,
    uncoveredColor: UNCOVERED_COLOR,
    operationalEfficiency,
    hourlyActivity: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyActivity[hour] || 0,
    })),
    weeklyActivity: Object.entries(weeklyActivity).map(([day, count]) => ({
      day,
      count,
    })),
    statusDistribution: Object.entries(statusDistribution).map(
      ([status, hours]) => ({
        status,
        hours: Number(hours.toFixed(2)),
      })
    ),
  };
}

// Custom Tooltip Component for Visx Stacked Chart
const CustomVisxStackedTooltip = ({
  tooltipData,
  tooltipTop,
  tooltipLeft,
  bmsColorMap,
  unavailableColor,
  nullColor,
}: any) => {
  if (!tooltipData) return null;

  const { session, dayData } = tooltipData;

  // Calculate total hours for the day
  const totalHours = dayData.sessions.reduce(
    (sum: number, s: any) => sum + s.durationMinutes / 60,
    0
  );

  // Get session color
  let sessionColor: string;
  let sessionLabel: string;

  if (session.bmsId === "UNAVAILABLE" || session.isUncovered) {
    sessionColor = unavailableColor;
    sessionLabel = "Unavailable";
  } else if (!session.bmsId || session.sessionId === null) {
    sessionColor = nullColor;
    sessionLabel = "No BMS";
  } else {
    sessionColor = bmsColorMap[session.bmsId] || "#64748b";
    sessionLabel = session.bmsId;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: tooltipTop - 10,
        left: tooltipLeft + 10,
        background: "rgba(15, 23, 42, 0.98)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(51, 65, 85, 0.6)",
        borderRadius: "12px",
        padding: "16px",
        color: "#f1f5f9",
        fontSize: "13px",
        minWidth: "280px",
        maxWidth: "350px",
        pointerEvents: "none",
        zIndex: 1000,
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
        transform: "translateY(-8px)",
      }}
    >
      {/* Header with date */}
      <div
        style={{
          borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
          paddingBottom: "12px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: "500",
            marginBottom: "4px",
          }}
        >
          Date
        </div>
        <div
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#f8fafc",
          }}
        >
          {formatDate(dayData.date)}
        </div>
      </div>

      {/* Session Details Section */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            fontSize: "10px",
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: "500",
            marginBottom: "8px",
          }}
        >
          Session Details
        </div>

        <div
          style={{
            padding: "12px",
            backgroundColor: "rgba(30, 41, 59, 0.5)",
            borderRadius: "8px",
            border: "1px solid rgba(51, 65, 85, 0.3)",
          }}
        >
          {/* BMS Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: sessionColor,
                flexShrink: 0,
                boxShadow: `0 0 0 2px ${sessionColor}20`,
              }}
            />
            <span
              style={{
                fontWeight: "600",
                fontSize: "14px",
                color: "#f8fafc",
              }}
            >
              {sessionLabel}
            </span>
          </div>

          {/* Session Metadata */}
          <div style={{ display: "grid", gap: "4px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontWeight: "500",
                }}
              >
                Session ID
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "#cbd5e1",
                  fontFamily: "monospace",
                  fontWeight: "500",
                }}
              >
                {session.sessionId || "N/A"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontWeight: "500",
                }}
              >
                Duration
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "#10b981",
                  fontWeight: "600",
                }}
              >
                {(session.durationMinutes / 60).toFixed(2)}h
              </span>
            </div>

            {session.startTime && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "4px",
                    borderTop: "1px solid rgba(51, 65, 85, 0.3)",
                    marginTop: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#94a3b8",
                      fontWeight: "500",
                    }}
                  >
                    Start
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#cbd5e1",
                      fontFamily: "monospace",
                    }}
                  >
                    {formatDateTime(session.startTime)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#94a3b8",
                      fontWeight: "500",
                    }}
                  >
                    End
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#cbd5e1",
                      fontFamily: "monospace",
                    }}
                  >
                    {formatDateTime(session.endTime)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Daily Summary Section */}
      <div
        style={{
          borderTop: "1px solid rgba(51, 65, 85, 0.4)",
          paddingTop: "12px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: "500",
            marginBottom: "6px",
          }}
        >
          Daily Summary
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#f8fafc",
            }}
          >
            24.0h total
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: "500",
            }}
          >
            {dayData.sessions.length} sessions
          </span>
        </div>
      </div>
    </div>
  );
};

// Pagination Component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
      <div className="text-sm text-slate-400">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`px-3 py-1 text-sm rounded ${
                currentPage === pageNum
                  ? "bg-cyan-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function BatterySwapAnalytics({ IMEI }: { IMEI: string }) {
  const [rawData, setRawData] = useState<TBoxBMSSession[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedSwapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } =
    useTooltip();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/query`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sql: `
              WITH ordered AS (
                SELECT 
                    SESSION_ID,
                    TBOXID,
                    BMSID,
                    START_TIME,
                    END_TIME,
                    LEAD(START_TIME) OVER (PARTITION BY TBOXID ORDER BY START_TIME) AS NEXT_START
                FROM REPORT_DB.GPS_DASHBOARD.TBOX_BMS_BRIDGE
                WHERE END_TIME IS NOT NULL
                  AND TBOXID = '${IMEI}'
                  AND START_TIME > '2025-07-29 00:00:00.000'
            ),
            gaps AS (
                SELECT 
                    TBOXID,
                    END_TIME AS GAP_START,
                    NEXT_START AS GAP_END
                FROM ordered
                WHERE NEXT_START IS NOT NULL 
                  AND DATEDIFF(minute, END_TIME, NEXT_START) > 10
            ),
            split_gaps AS (
                SELECT
                    TBOXID,
                    GAP_START,
                    GAP_END,
                    CASE 
                        WHEN DATE(GAP_START) = DATE(GAP_END) THEN 1
                        ELSE 2
                    END AS parts
                FROM gaps
            )
            SELECT 
                SESSION_ID,
                TBOXID,
                BMSID,
                START_TIME,
                END_TIME,
                LPAD(DATEDIFF(second, START_TIME, END_TIME) / 3600, 2, '0') || 'h ' ||
                LPAD(MOD(DATEDIFF(second, START_TIME, END_TIME) / 60, 60), 2, '0') || 'm' AS DURATION
            FROM ordered

            UNION ALL

            -- Gaps that stay within the same day
            SELECT 
                NULL AS SESSION_ID,
                TBOXID,
                'UNAVAILABLE' AS BMSID,
                GAP_START AS START_TIME,
                GAP_END AS END_TIME,
                LPAD(DATEDIFF(second, GAP_START, GAP_END) / 3600, 2, '0') || 'h ' ||
                LPAD(MOD(DATEDIFF(second, GAP_START, GAP_END) / 60, 60), 2, '0') || 'm' AS DURATION
            FROM split_gaps
            WHERE parts = 1

            UNION ALL

            -- First part of gaps that cross midnight (remainder of first day)
            SELECT 
                NULL AS SESSION_ID,
                TBOXID,
                'UNAVAILABLE' AS BMSID,
                GAP_START AS START_TIME,
                DATEADD(day, 1, DATE_TRUNC('day', GAP_START)) AS END_TIME,  -- Midnight of next day
                LPAD(DATEDIFF(second, GAP_START, DATEADD(day, 1, DATE_TRUNC('day', GAP_START))) / 3600, 2, '0') || 'h ' ||
                LPAD(MOD(DATEDIFF(second, GAP_START, DATEADD(day, 1, DATE_TRUNC('day', GAP_START))) / 60, 60), 2, '0') || 'm' AS DURATION
            FROM split_gaps
            WHERE parts = 2

            UNION ALL

            -- Second part of gaps that cross midnight (from 00:00:00 next day)
            SELECT 
                NULL AS SESSION_ID,
                TBOXID,
                'UNAVAILABLE' AS BMSID,
                DATEADD(day, 1, DATE_TRUNC('day', GAP_START)) AS START_TIME,  -- 00:00:00 next day
                GAP_END AS END_TIME,
                LPAD(DATEDIFF(second, DATEADD(day, 1, DATE_TRUNC('day', GAP_START)), GAP_END) / 3600, 2, '0') || 'h ' ||
                LPAD(MOD(DATEDIFF(second, DATEADD(day, 1, DATE_TRUNC('day', GAP_START)), GAP_END) / 60, 60), 2, '0') || 'm' AS DURATION
            FROM split_gaps
            WHERE parts = 2

            ORDER BY START_TIME
            LIMIT 1000
            `,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setRawData(data);
        const processed = processSwapData(data);
        setProcessedData(processed);
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on mount

  const analytics = getAnalytics(processedData);

  // Pagination calculations
  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageData = processedData.slice(startIndex, endIndex);

  // Create daily stacked data for Visx visualization
  const dailyStackedData = analytics
    ? analytics.dailySummaries.map((dailySummary) => {
        const daySessions = processedData
          .filter((session) => session.date === dailySummary.date)
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        return {
          date: dailySummary.date,
          sessions: daySessions,
          totalHours: daySessions.reduce(
            (sum, session) => sum + session.durationMinutes / 60,
            0
          ),
        };
      })
    : [];

  // Visx chart dimensions
  const width = 900;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 80, left: 60 };

  // Scales for Visx chart
  const xScale = scaleBand<string>({
    domain: dailyStackedData.map((d) => d.date),
    range: [margin.left, width - margin.right],
    padding: 0.3,
  });

  const maxTotalHours = Math.max(
    ...dailyStackedData.map((d) => d.totalHours),
    24
  );

  const yScale = scaleLinear({
    domain: [0, maxTotalHours],
    range: [height - margin.bottom, margin.top],
  });

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            Error Loading Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-300">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-8 text-center">
          <p className="text-slate-400">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-slate-400">Total Sessions</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {analytics.totalSessions}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Battery className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-400">BMS Units</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {analytics.uniqueBMS}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-sm text-slate-400">Avg Duration</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {formatDuration(analytics.avgDuration)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-slate-400">
                Signal Availability %
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {analytics.operationalEfficiency.length > 0
                ? Math.round(
                    analytics.operationalEfficiency.reduce(
                      (sum, day) => sum + day.uptime,
                      0
                    ) / analytics.operationalEfficiency.length
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Stacked Sessions Chart with Visx */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Daily Sessions Timeline Last 90 days (Chronologically Stacked)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Sessions stacked by day in chronological order within each day.
            Earliest sessions at bottom, latest at top. Black = Unavailable
            (BMSID='UNAVAILABLE'), Gray = No BMS. Each day now sums to exactly
            24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div style={{ position: "relative", height: 450, width: "100%" }}>
            <ParentSize>
              {({ width, height }) => {
                // Update scales to use dynamic width
                const dynamicXScale = scaleBand<string>({
                  domain: dailyStackedData.map((d) => d.date),
                  range: [margin.left, width - margin.right],
                  padding: 0.2,
                });

                const dynamicYScale = scaleLinear({
                  domain: [0, 24], // Fixed to 24 hours
                  range: [height - margin.bottom, margin.top],
                });

                return (
                  <svg width={width} height={height}>
                    {/* Grid Lines */}
                    <defs>
                      <pattern
                        id="grid"
                        width="100%"
                        height="40"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 0 40 L 100% 40"
                          fill="none"
                          stroke="#334155"
                          strokeWidth="0.5"
                          strokeOpacity="0.3"
                        />
                      </pattern>
                    </defs>

                    {/* Horizontal Grid Lines - Fixed at 4-hour intervals */}
                    {Array.from({ length: 7 }).map((_, i) => {
                      const y = dynamicYScale(i * 4);
                      return (
                        <line
                          key={i}
                          x1={margin.left}
                          x2={width - margin.right}
                          y1={y}
                          y2={y}
                          stroke="#334155"
                          strokeWidth={0.5}
                          strokeOpacity={0.3}
                          strokeDasharray="2,2"
                        />
                      );
                    })}

                    {/* Vertical Grid Lines */}
                    {dailyStackedData.map((dayData, index) => {
                      const x =
                        dynamicXScale(dayData.date) +
                        dynamicXScale.bandwidth() / 2;
                      return (
                        <line
                          key={index}
                          x1={x}
                          x2={x}
                          y1={margin.top}
                          y2={height - margin.bottom}
                          stroke="#334155"
                          strokeWidth={0.5}
                          strokeOpacity={0.2}
                          strokeDasharray="2,2"
                        />
                      );
                    })}

                    <AxisBottom
                      top={height - margin.bottom}
                      scale={dynamicXScale}
                      tickLabelProps={() => ({
                        fontSize: 11,
                        textAnchor: "end",
                        dy: -2,
                        dx: -8,
                        angle: -45,
                        fill: "#94a3b8",
                        fontWeight: 500,
                      })}
                      tickFormat={formatDate}
                      stroke="#475569"
                      tickStroke="#475569"
                    />
                    <AxisLeft
                      left={margin.left}
                      scale={dynamicYScale}
                      tickFormat={(v) => `${v}h`}
                      tickLabelProps={() => ({
                        fontSize: 11,
                        fill: "#94a3b8",
                        textAnchor: "end",
                        dx: -12,
                        dy: 3,
                        fontWeight: 500,
                      })}
                      stroke="#475569"
                      tickStroke="#475569"
                    />

                    {dailyStackedData.map((dayData) => {
                      let cumulativeHours = 0;
                      const barX = dynamicXScale(dayData.date);
                      const barWidth = dynamicXScale.bandwidth();

                      return (
                        <Group key={dayData.date} left={barX}>
                          {dayData.sessions.map((session, sessionIndex) => {
                            const sessionHours = session.durationMinutes / 60;
                            const barHeight =
                              dynamicYScale(0) - dynamicYScale(sessionHours);
                            const barY = dynamicYScale(
                              sessionHours + cumulativeHours
                            );

                            let sessionColor: string;
                            if (
                              session.bmsId === "UNAVAILABLE" ||
                              session.isUnavailable
                            ) {
                              sessionColor = analytics.unavailableColor;
                            } else if (
                              !session.bmsId ||
                              session.sessionId === null
                            ) {
                              sessionColor = analytics.nullColor;
                            } else {
                              sessionColor =
                                analytics.bmsColorMap[session.bmsId] ||
                                "#64748b";
                            }

                            cumulativeHours += sessionHours;

                            return (
                              <Bar
                                key={`${
                                  session.sessionId || "unavailable"
                                }-${sessionIndex}`}
                                x={0}
                                y={barY}
                                width={barWidth}
                                height={Math.max(0, barHeight)}
                                fill={sessionColor}
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth={0.5}
                                rx={1}
                                onMouseMove={(event) => {
                                  const svgRect =
                                    event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                  if (svgRect) {
                                    showTooltip({
                                      tooltipData: { session, dayData },
                                      tooltipLeft: event.clientX - svgRect.left,
                                      tooltipTop: event.clientY - svgRect.top,
                                    });
                                  }
                                }}
                                onMouseLeave={hideTooltip}
                                style={{
                                  cursor: "pointer",
                                  filter: "brightness(1.1)",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.filter =
                                    "brightness(1.3)";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.filter =
                                    "brightness(1.1)";
                                }}
                              />
                            );
                          })}
                        </Group>
                      );
                    })}

                    {/* Chart Title on Y-axis */}
                    <text
                      x={-height / 2}
                      y={15}
                      transform={`rotate(-90, 15, ${height / 2})`}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#64748b"
                      fontWeight="500"
                    >
                      Session Duration (Hours)
                    </text>

                    {/* Chart Title on X-axis */}
                    <text
                      x={width / 2}
                      y={height - 10}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#64748b"
                      fontWeight="500"
                    >
                      Date
                    </text>
                  </svg>
                );
              }}
            </ParentSize>

            {tooltipData && (
              <CustomVisxStackedTooltip
                tooltipData={tooltipData}
                tooltipTop={tooltipTop}
                tooltipLeft={tooltipLeft}
                bmsColorMap={analytics.bmsColorMap}
                unavailableColor={analytics.unavailableColor}
                nullColor={analytics.nullColor}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BMS Distribution */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Battery className="w-5 h-5 text-purple-400" />
              BMS Time Distribution
            </CardTitle>
            <CardDescription className="text-slate-400">
              Total hours by BMS unit, including unavailable periods and no-BMS
              sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 mt-16">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={(() => {
                    // Calculate total hours by BMS/status across all days
                    const bmsHours: Record<string, number> = {};

                    analytics.dailySummaries.forEach((day) => {
                      Object.entries(day.bmsBreakdown).forEach(
                        ([bmsId, hours]) => {
                          bmsHours[bmsId] = (bmsHours[bmsId] || 0) + hours;
                        }
                      );
                    });

                    // Convert to chart data with proper colors and labels
                    return Object.entries(bmsHours)
                      .map(([bmsId, hours]) => {
                        let color: string;
                        let displayName: string;

                        if (bmsId === "UNAVAILABLE") {
                          color = analytics.unavailableColor;
                          displayName = "Unavailable";
                        } else if (
                          bmsId === "NO_BMS" ||
                          bmsId === "UNCOVERED"
                        ) {
                          color = analytics.nullColor;
                          displayName = "No BMS";
                        } else {
                          color = analytics.bmsColorMap[bmsId] || "#64748b";
                          displayName = bmsId;
                        }

                        return {
                          name: displayName,
                          bmsId,
                          hours: Number(hours.toFixed(1)),
                          color,
                        };
                      })
                      .filter((item) => item.hours > 0);
                  })()}
                  cx="50%"
                  cy="50%"
                  outerRadius={170}
                  innerRadius={50}
                  paddingAngle={1}
                  dataKey="hours"
                  nameKey="name"
                >
                  {(() => {
                    const bmsHours: Record<string, number> = {};

                    analytics.dailySummaries.forEach((day) => {
                      Object.entries(day.bmsBreakdown).forEach(
                        ([bmsId, hours]) => {
                          bmsHours[bmsId] = (bmsHours[bmsId] || 0) + hours;
                        }
                      );
                    });

                    return Object.entries(bmsHours)
                      .map(([bmsId, hours]) => {
                        let color: string;

                        if (bmsId === "UNAVAILABLE") {
                          color = analytics.unavailableColor;
                        } else if (
                          bmsId === "NO_BMS" ||
                          bmsId === "UNCOVERED"
                        ) {
                          color = analytics.nullColor;
                        } else {
                          color = analytics.bmsColorMap[bmsId] || "#64748b";
                        }

                        return { bmsId, hours, color };
                      })
                      .filter((item) => item.hours > 0)
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ));
                  })()}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const totalHours = analytics.dailySummaries.reduce(
                        (sum, day) => sum + day.totalHours,
                        0
                      );
                      const percentage = (
                        (data.hours / totalHours) *
                        100
                      ).toFixed(1);

                      return (
                        <div className="rounded-lg border bg-slate-900/95 backdrop-blur-sm p-3 shadow-xl border-slate-700">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: data.color }}
                            />
                            <span className="font-medium text-slate-100">
                              {data.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 uppercase mb-1">
                            Total Hours
                          </div>
                          <div className="text-sm font-bold text-slate-200">
                            {data.hours}h ({percentage}%)
                          </div>
                          {data.bmsId !== "UNAVAILABLE" &&
                            data.bmsId !== "NO_BMS" && (
                              <div className="text-xs text-slate-400 mt-1">
                                BMS ID: {data.bmsId}
                              </div>
                            )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Operational Efficiency */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Daily Operational Efficiency
            </CardTitle>
            <CardDescription className="text-slate-400">
              System uptime percentage per day - key metric for business
              operations
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={analytics.operationalEfficiency}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

                <XAxis
                  dataKey="date"
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickFormatter={formatDate}
                />
                <YAxis
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-sm">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Date
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {formatDate(label)}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Signal Uptime
                              </span>
                              <span className="font-bold text-green-400">
                                {data.uptime.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Signal Downtime
                              </span>
                              <span className="font-bold text-red-400">
                                {data.downtime.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="uptime"
                  strokeWidth={2}
                  className="stroke-primary"
                  name="Signal Uptime"
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, className: "fill-primary" }}
                />
              </LineChart>
            </ResponsiveContainer>
            {/* 🔥 Summary badges under chart */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-800 px-3 py-2 text-center">
                <div className="text-xs text-slate-400 uppercase">
                  Avg Signal Uptime
                </div>
                <div className="text-lg font-bold text-green-400">
                  {(
                    analytics.operationalEfficiency.reduce(
                      (a, b) => a + b.uptime,
                      0
                    ) / analytics.operationalEfficiency.length
                  ).toFixed(1)}
                  %
                </div>
              </div>
              <div className="rounded-xl bg-slate-800 px-3 py-2 text-center">
                <div className="text-xs text-slate-400 uppercase">
                  Avg Signal Downtime
                </div>
                <div className="text-lg font-bold text-red-400">
                  {(
                    analytics.operationalEfficiency.reduce(
                      (a, b) => a + b.downtime,
                      0
                    ) / analytics.operationalEfficiency.length
                  ).toFixed(1)}
                  %
                </div>
              </div>
              <div className="rounded-xl bg-slate-800 px-3 py-2 text-center">
                <div className="text-xs text-slate-400 uppercase">Best Day</div>
                <div className="text-lg font-bold text-primary">
                  {
                    analytics.operationalEfficiency.reduce((max, d) =>
                      d.uptime > max.uptime ? d : max
                    ).date
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Details Table with Pagination */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <MapPin className="w-5 h-5 text-orange-400" />
            Session Details ({processedData.length} total sessions)
          </CardTitle>
          <CardDescription className="text-slate-400">
            All sessions including active BMS sessions and unavailable periods
            (properly split at day boundaries). Showing {rowsPerPage} per page.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/30">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Session ID
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    BMS ID
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Start Time
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    End Time
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Duration
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentPageData.map((session, index) => (
                  <tr
                    key={`${session.sessionId}-${index}`}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-200 font-mono text-xs">
                      {session.sessionId || "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      {session.bmsId === "UNAVAILABLE" ? (
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${analytics.unavailableColor}30`,
                            color: "#ff6b6b",
                            border: `1px solid ${analytics.unavailableColor}60`,
                          }}
                        >
                          NO SIGNAL
                        </span>
                      ) : session.sessionId === null ? (
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${analytics.nullColor}30`,
                            color: "#9ca3af",
                            border: `1px solid ${analytics.nullColor}60`,
                          }}
                        >
                          No BMS
                        </span>
                      ) : session.bmsId ? (
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${
                              analytics.bmsColorMap[session.bmsId] || "#64748b"
                            }20`,
                            color:
                              analytics.bmsColorMap[session.bmsId] || "#64748b",
                            border: `1px solid ${
                              analytics.bmsColorMap[session.bmsId] || "#64748b"
                            }40`,
                          }}
                        >
                          {session.bmsId}
                        </span>
                      ) : (
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${analytics.nullColor}30`,
                            color: "#9ca3af",
                            border: `1px solid ${analytics.nullColor}60`,
                          }}
                        >
                          No BMS
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                      {formatDateTime(session.startTime.toISOString())}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                      {formatDateTime(session.endTime.toISOString())}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">
                      {formatDuration(session.durationMinutes)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {session.isUnavailable ? (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-400 text-xs font-medium">
                              No Signal
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-green-400 text-xs font-medium">
                              Active
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Component */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
