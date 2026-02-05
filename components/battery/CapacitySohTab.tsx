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
  Truck,
  Building2,
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

interface BSSSession {
  SESSION_ID: number;
  STATION_ID: string;
  STATION_NAME: string;
  CABINET_NO: number;
  BMSID: string;
  START_TIME: string;
  END_TIME: string;
}

interface ProcessedBatterySession {
  sessionId: number | null;
  tboxId: number | null;
  bmsId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  date: string;
  hour: number;
  dayOfWeek: string;
  isUnavailable: boolean;
  sessionType: "TBOX" | "BSS" | "UNAVAILABLE";
  stationName?: string;
  cabinetNo?: number;
  deviceId?: string;
}

interface DailySummary {
  date: string;
  activeHours: number;
  unavailableHours: number;
  bssHours: number;
  tboxHours: number;
  totalSessions: number;
  uniqueTBoxes: number;
  tboxBreakdown: Record<string, number>;
  bssBreakdown: Record<string, number>;
  totalHours: number;
}

// -------------------- Color Generation --------------------
function generateUnifiedColorMap(
  tboxIds: number[],
  stationNames: string[]
): {
  tboxColorMap: Record<number, string>;
  stationColorMap: Record<string, string>;
  unifiedColorMap: Record<string | number, string>;
} {
  // Unified color bank - mix of warm and cool tones
  const unifiedColors = [
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#f97316", // Orange
    "#84cc16", // Lime
    "#06b6d4", // Cyan
    "#ec4899", // Pink
    "#6366f1", // Indigo
    "#14b8a6", // Teal
    "#eab308", // Yellow
    "#dc2626", // Red-600
    "#9333ea", // Purple-600
    "#0891b2", // Cyan-600
    "#22d3ee", // Bright Cyan
    "#0ea5e9", // Sky-500
    "#a855f7", // Purple-500
    "#d946ef", // Fuchsia-500
    "#f472b6", // Pink-400
    "#06d6a0", // Emerald-400
    "#0d9488", // Teal-600
    "#3b0764", // Violet-900
    "#f43f5e", // Rose-500
    "#8b5a2b", // Brown
    "#374151", // Gray-700
    "#1e40af", // Blue-700
    "#047857", // Emerald-700
    "#b45309", // Amber-700
    "#7e22ce", // Purple-700
    "#0f766e", // Teal-700
    "#be185d", // Pink-700
    "#4338ca", // Indigo-700
  ];

  const tboxColorMap: Record<number, string> = {};
  const stationColorMap: Record<string, string> = {};
  const unifiedColorMap: Record<string | number, string> = {};

  let colorIndex = 0;

  // Assign colors to TBox IDs
  tboxIds.forEach((tboxId) => {
    const color = unifiedColors[colorIndex % unifiedColors.length];
    tboxColorMap[tboxId] = color;
    unifiedColorMap[tboxId] = color;
    colorIndex++;
  });

  // Assign colors to Station Names
  stationNames.forEach((stationName) => {
    const color = unifiedColors[colorIndex % unifiedColors.length];
    stationColorMap[stationName] = color;
    unifiedColorMap[stationName] = color;
    colorIndex++;
  });

  return { tboxColorMap, stationColorMap, unifiedColorMap };
}

// Helper functions for dynamic patterns
const createTBoxPattern = (color: string) => {
  const patternId = `tbox-pattern-${color.replace("#", "")}`;
  return (
    <pattern
      id={patternId}
      key={patternId}
      patternUnits="userSpaceOnUse"
      width="8"
      height="8"
      patternTransform="rotate(45)"
    >
      <rect width="8" height="8" fill={color} />
      <line
        x1="0"
        y1="0"
        x2="8"
        y2="8"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="2"
      />
    </pattern>
  );
};

const createBSSPattern = (color: string) => {
  const patternId = `bss-pattern-${color.replace("#", "")}`;
  return (
    <pattern
      id={patternId}
      key={patternId}
      patternUnits="userSpaceOnUse"
      width="10"
      height="10"
    >
      <rect width="10" height="10" fill={color} />
      <line
        x1="0"
        y1="0"
        x2="10"
        y2="10"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        opacity="0.8"
      />
      <line
        x1="10"
        y1="0"
        x2="0"
        y2="10"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        opacity="0.8"
      />
    </pattern>
  );
};

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

function processCombinedSessionData(
  tboxData: TBoxBMSSession[],
  bssData: BSSSession[]
): ProcessedBatterySession[] {
  const processedSessions: ProcessedBatterySession[] = [];

  const parseSriLankaTime = (dateString: string) => {
    const date = new Date(dateString);
    if (!dateString.endsWith("Z") && dateString.indexOf("+") === -1) {
      const sriLankaOffset = 5.5 * 60 * 60 * 1000;
      const utcTime = new Date(date.getTime() - sriLankaOffset);
      return utcTime;
    }
    return date;
  };

  // First, create a timeline of all events
  const allEvents: Array<{
    time: Date;
    type: "START" | "END";
    sessionType: "TBOX" | "BSS";
    session: TBoxBMSSession | BSSSession;
    originalIndex: number;
  }> = [];

  // Add TBox events
  tboxData
    .filter((session) => session.START_TIME && session.END_TIME)
    .forEach((session, index) => {
      const startTime = parseSriLankaTime(session.START_TIME);
      const endTime = parseSriLankaTime(session.END_TIME);

      allEvents.push({
        time: startTime,
        type: "START",
        sessionType: "TBOX",
        session,
        originalIndex: index,
      });

      allEvents.push({
        time: endTime,
        type: "END",
        sessionType: "TBOX",
        session,
        originalIndex: index,
      });
    });

  // Add BSS events
  bssData
    .filter((session) => session.START_TIME && session.END_TIME)
    .forEach((session, index) => {
      const startTime = parseSriLankaTime(session.START_TIME);
      const endTime = parseSriLankaTime(session.END_TIME);

      allEvents.push({
        time: startTime,
        type: "START",
        sessionType: "BSS",
        session,
        originalIndex: index + tboxData.length,
      });

      allEvents.push({
        time: endTime,
        type: "END",
        sessionType: "BSS",
        session,
        originalIndex: index + tboxData.length,
      });
    });

  // Sort events by time
  allEvents.sort((a, b) => a.time.getTime() - b.time.getTime());

  // Process overlapping sessions
  let currentTBox: TBoxBMSSession | null = null;
  let currentBSS: BSSSession | null = null;
  let lastTime: Date | null = null;

  for (const event of allEvents) {
    if (lastTime && lastTime < event.time) {
      // There's a gap - process it
      if (!currentTBox && !currentBSS) {
        // Unavailable period
        processUnavailablePeriod(lastTime, event.time);
      } else if (currentTBox && !currentBSS) {
        // Only TBox active
        processTBoxPeriod(currentTBox, lastTime, event.time);
      } else if (!currentTBox && currentBSS) {
        // Only BSS active
        processBSSPeriod(currentBSS, lastTime, event.time);
      } else if (currentTBox && currentBSS) {
        // Both active - BSS takes precedence for visualization
        processBSSPeriod(currentBSS, lastTime, event.time);
      }
    }

    // Update current sessions
    if (event.type === "START") {
      if (event.sessionType === "TBOX") {
        currentTBox = event.session as TBoxBMSSession;
      } else {
        currentBSS = event.session as BSSSession;
      }
    } else {
      if (event.sessionType === "TBOX") {
        currentTBox = null;
      } else {
        currentBSS = null;
      }
    }

    lastTime = event.time;
  }

  // Helper functions
  function processUnavailablePeriod(start: Date, end: Date) {
    let currentStart = new Date(start);

    while (currentStart < end) {
      const sriLankaOffset = 5.5 * 60 * 60 * 1000;
      const currentStartSL = new Date(currentStart.getTime() + sriLankaOffset);
      const nextMidnightSL = new Date(currentStartSL);
      nextMidnightSL.setHours(24, 0, 0, 0);
      const nextMidnightUTC = new Date(
        nextMidnightSL.getTime() - sriLankaOffset
      );
      const segmentEnd = new Date(
        Math.min(nextMidnightUTC.getTime(), end.getTime())
      );
      const segmentDurationMinutes = Math.max(
        0,
        (segmentEnd.getTime() - currentStart.getTime()) / (1000 * 60)
      );

      if (segmentDurationMinutes > 0) {
        const year = currentStartSL.getFullYear();
        const month = String(currentStartSL.getMonth() + 1).padStart(2, "0");
        const day = String(currentStartSL.getDate()).padStart(2, "0");
        const date = `${year}-${month}-${day}`;

        processedSessions.push({
          sessionId: null,
          tboxId: null,
          bmsId: "UNAVAILABLE",
          startTime: new Date(currentStart),
          endTime: new Date(segmentEnd),
          durationMinutes: segmentDurationMinutes,
          date,
          hour: currentStartSL.getHours(),
          dayOfWeek: currentStartSL.toLocaleDateString("en-US", {
            weekday: "long",
          }),
          isUnavailable: true,
          sessionType: "UNAVAILABLE",
        });
      }

      currentStart = new Date(nextMidnightUTC);
    }
  }

  function processTBoxPeriod(session: TBoxBMSSession, start: Date, end: Date) {
    const isUnavailable =
      session.BMSID === "UNAVAILABLE" || session.SESSION_ID === null;
    let currentStart = new Date(start);

    while (currentStart < end) {
      const sriLankaOffset = 5.5 * 60 * 60 * 1000;
      const currentStartSL = new Date(currentStart.getTime() + sriLankaOffset);
      const nextMidnightSL = new Date(currentStartSL);
      nextMidnightSL.setHours(24, 0, 0, 0);
      const nextMidnightUTC = new Date(
        nextMidnightSL.getTime() - sriLankaOffset
      );
      const segmentEnd = new Date(
        Math.min(nextMidnightUTC.getTime(), end.getTime())
      );
      const segmentDurationMinutes = Math.max(
        0,
        (segmentEnd.getTime() - currentStart.getTime()) / (1000 * 60)
      );

      if (segmentDurationMinutes > 0) {
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
          sessionType: isUnavailable ? "UNAVAILABLE" : "TBOX",
        });
      }

      currentStart = new Date(nextMidnightUTC);
    }
  }

  function processBSSPeriod(session: BSSSession, start: Date, end: Date) {
    let currentStart = new Date(start);

    while (currentStart < end) {
      const sriLankaOffset = 5.5 * 60 * 60 * 1000;
      const currentStartSL = new Date(currentStart.getTime() + sriLankaOffset);
      const nextMidnightSL = new Date(currentStartSL);
      nextMidnightSL.setHours(24, 0, 0, 0);
      const nextMidnightUTC = new Date(
        nextMidnightSL.getTime() - sriLankaOffset
      );
      const segmentEnd = new Date(
        Math.min(nextMidnightUTC.getTime(), end.getTime())
      );
      const segmentDurationMinutes = Math.max(
        0,
        (segmentEnd.getTime() - currentStart.getTime()) / (1000 * 60)
      );

      if (segmentDurationMinutes > 0) {
        const year = currentStartSL.getFullYear();
        const month = String(currentStartSL.getMonth() + 1).padStart(2, "0");
        const day = String(currentStartSL.getDate()).padStart(2, "0");
        const date = `${year}-${month}-${day}`;

        processedSessions.push({
          sessionId: session.SESSION_ID,
          tboxId: null,
          bmsId: session.BMSID,
          startTime: new Date(currentStart),
          endTime: new Date(segmentEnd),
          durationMinutes: segmentDurationMinutes,
          date,
          hour: currentStartSL.getHours(),
          dayOfWeek: currentStartSL.toLocaleDateString("en-US", {
            weekday: "long",
          }),
          isUnavailable: false,
          sessionType: "BSS",
          stationName: session.STATION_NAME,
          cabinetNo: session.CABINET_NO,
          deviceId: session.STATION_ID,
        });
      }

      currentStart = new Date(nextMidnightUTC);
    }
  }

  // Fill any remaining gaps at the end
  if (lastTime) {
    const endDate = new Date();
    if (lastTime < endDate) {
      processUnavailablePeriod(lastTime, endDate);
    }
  }

  return processedSessions.sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );
}

function getBatteryAnalytics(data: ProcessedBatterySession[]) {
  if (data.length === 0) return null;

  const allTBoxIds = [
    ...new Set(
      data.filter((d) => d.sessionType === "TBOX").map((d) => d.tboxId!)
    ),
  ].sort((a, b) => a - b);

  const allStations = [
    ...new Set(
      data.filter((d) => d.sessionType === "BSS").map((d) => d.stationName!)
    ),
  ].sort();

  const { tboxColorMap, stationColorMap, unifiedColorMap } =
    generateUnifiedColorMap(allTBoxIds, allStations);

  const UNAVAILABLE_COLOR = "#FFFFFF";
  const BSS_BASE_COLOR = "#22d3ee";

  const allDates = [...new Set(data.map((d) => d.date))].sort();
  const startDate = allDates[0];
  const endDate = allDates[allDates.length - 1];
  const allDatesInRange = getDatesInRange(startDate, endDate);

  const dailySummaries: DailySummary[] = [];

  allDatesInRange.forEach((date) => {
    const daySessions = data
      .filter((d) => d.date === date)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Initialize 24-hour coverage
    const hourCoverage = Array(24).fill(null); // null = uncovered

    // Mark each hour with what type of session it has
    daySessions.forEach((session) => {
      const startHour = Math.floor(session.startTime.getUTCHours() + 5.5) % 24;
      const endHour = Math.floor(session.endTime.getUTCHours() + 5.5) % 24;
      const durationHours = session.durationMinutes / 60;

      // Simplified: mark the main hour of the session
      const mainHour = Math.floor(startHour + durationHours / 2) % 24;
      hourCoverage[mainHour] = session;
    });

    // Calculate coverage
    const coveredHours = hourCoverage.filter((h) => h !== null).length;
    const uncoveredHours = 24 - coveredHours;

    const sessionMinutes: { [key: string]: number } = {};
    const bssSessionMinutes: { [key: string]: number } = {};
    let totalSessionMinutes = 0;

    daySessions.forEach((session) => {
      const sessionDuration = session.durationMinutes;

      if (sessionDuration > 0) {
        totalSessionMinutes += sessionDuration;

        if (session.sessionType === "BSS") {
          const stationKey = `BSS_${session.stationName}`;
          bssSessionMinutes[stationKey] =
            (bssSessionMinutes[stationKey] || 0) + sessionDuration;
          sessionMinutes[stationKey] =
            (sessionMinutes[stationKey] || 0) + sessionDuration;
        } else if (session.sessionType === "UNAVAILABLE") {
          sessionMinutes["UNAVAILABLE"] =
            (sessionMinutes["UNAVAILABLE"] || 0) + sessionDuration;
        } else {
          const tboxKey = `TBOX_${session.tboxId}`;
          sessionMinutes[tboxKey] =
            (sessionMinutes[tboxKey] || 0) + sessionDuration;
        }
      }
    });

    // Add uncovered time as unavailable
    if (uncoveredHours > 0) {
      sessionMinutes["UNAVAILABLE"] =
        (sessionMinutes["UNAVAILABLE"] || 0) + uncoveredHours * 60;
    }

    // Ensure total is exactly 24 hours
    const totalMinutes = Object.values(sessionMinutes).reduce(
      (sum, mins) => sum + mins,
      0
    );

    const expectedMinutes = 24 * 60;
    if (Math.abs(totalMinutes - expectedMinutes) > 1) {
      const scaleFactor = expectedMinutes / totalMinutes;
      Object.keys(sessionMinutes).forEach((key) => {
        sessionMinutes[key] = Math.round(sessionMinutes[key] * scaleFactor);
      });
    }

    const tboxBreakdown: Record<string, number> = {};
    const bssBreakdown: Record<string, number> = {};

    Object.entries(sessionMinutes).forEach(([key, minutes]) => {
      if (key.startsWith("BSS_")) {
        bssBreakdown[key] = minutes / 60;
      } else if (key.startsWith("TBOX_")) {
        tboxBreakdown[key] = minutes / 60;
      } else {
        tboxBreakdown[key] = minutes / 60;
      }
    });

    const bssHours = Object.values(bssBreakdown).reduce(
      (sum, hours) => sum + hours,
      0
    );
    const tboxHours = Object.entries(tboxBreakdown)
      .filter(([key]) => key !== "UNAVAILABLE")
      .reduce((sum, [, hours]) => sum + hours, 0);
    const unavailableHours = tboxBreakdown["UNAVAILABLE"] || 0;

    dailySummaries.push({
      date,
      activeHours: tboxHours + bssHours,
      unavailableHours,
      bssHours,
      tboxHours,
      totalSessions: daySessions.length,
      uniqueTBoxes: new Set(
        daySessions.filter((d) => d.sessionType === "TBOX").map((d) => d.tboxId)
      ).size,
      tboxBreakdown,
      bssBreakdown,
      totalHours: 24,
    });
  });

  const tboxSessions = data.filter((d) => d.sessionType === "TBOX");
  const bssSessions = data.filter((d) => d.sessionType === "BSS");

  const totalSessions = data.filter((d) => !d.isUnavailable).length;

  const avgDuration =
    totalSessions > 0
      ? data
          .filter((d) => !d.isUnavailable)
          .reduce((sum, d) => sum + d.durationMinutes, 0) / totalSessions
      : 0;

  const uniqueTBoxes = allTBoxIds.length;
  const uniqueStations = allStations.length;

  const totalUncoveredHours = dailySummaries.reduce(
    (sum, day) => sum + (day.tboxBreakdown["UNAVAILABLE"] || 0),
    0
  );

  const totalBSSHours = dailySummaries.reduce(
    (sum, day) => sum + day.bssHours,
    0
  );
  const totalTBoxHours = dailySummaries.reduce(
    (sum, day) => sum + day.tboxHours,
    0
  );

  const statusDistribution = {
    "In Vehicle": totalTBoxHours,
    "In BSS": totalBSSHours,
    Unavailable: totalUncoveredHours,
  };

  const operationalEfficiency = dailySummaries.map((day) => ({
    date: day.date,
    uptime: ((day.tboxHours + day.bssHours) / 24) * 100,
    downtime: (day.unavailableHours / 24) * 100,
    bssTime: (day.bssHours / 24) * 100,
    tboxTime: (day.tboxHours / 24) * 100,
  }));

  return {
    totalSessions,
    avgDuration,
    uniqueTBoxes,
    uniqueStations,
    dailySummaries,
    tboxColorMap,
    stationColorMap,
    unifiedColorMap,
    uniqueTBoxIds: allTBoxIds,
    uniqueStationNames: allStations,
    unavailableColor: UNAVAILABLE_COLOR,
    bssBaseColor: BSS_BASE_COLOR,
    operationalEfficiency,
    statusDistribution: Object.entries(statusDistribution).map(
      ([status, hours]) => ({
        status,
        hours: Number(hours.toFixed(2)),
      })
    ),
    totalBSSHours,
    totalTBoxHours,
    bssSessions: bssSessions.length,
    tboxSessions: tboxSessions.length,
  };
}

// Custom Tooltip Component for Visx Stacked Chart
const CustomVisxStackedTooltip = ({
  tooltipData,
  tooltipTop,
  tooltipLeft,
  unifiedColorMap,
  unavailableColor,
}: any) => {
  if (!tooltipData) return null;

  const { session, dayData } = tooltipData;

  let sessionColor: string;
  let sessionLabel: string;
  let sessionIcon: React.ReactNode;

  if (session.sessionType === "BSS") {
    sessionColor = unifiedColorMap[session.stationName!] || "#22d3ee";
    sessionLabel = session.stationName || "BSS";
    sessionIcon = <Building2 className="w-4 h-4" />;
  } else if (session.isUnavailable) {
    sessionColor = unavailableColor;
    sessionLabel = "Not Attached";
    sessionIcon = <AlertCircle className="w-4 h-4" />;
  } else {
    sessionColor = unifiedColorMap[session.tboxId!] || "#64748b";
    sessionLabel = `TBox ${session.tboxId}`;
    sessionIcon = <Truck className="w-4 h-4" />;
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
        <div style={{ fontSize: "16px", fontWeight: "600", color: "#f8fafc" }}>
          {formatDate(dayData.date)}
        </div>
      </div>

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
              style={{ fontWeight: "600", fontSize: "14px", color: "#f8fafc" }}
            >
              {sessionLabel}
            </span>
            <span style={{ marginLeft: "auto", color: "#94a3b8" }}>
              {session.sessionType === "BSS"
                ? "🏢"
                : session.sessionType === "TBOX"
                ? "🚛"
                : "⚠️"}
            </span>
          </div>

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

            {session.sessionType === "BSS" && (
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
                      fontSize: "11px",
                      color: "#94a3b8",
                      fontWeight: "500",
                    }}
                  >
                    Cabinet
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#cbd5e1",
                      fontWeight: "500",
                    }}
                  >
                    #{session.cabinetNo}
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
                    Device ID
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#cbd5e1",
                      fontFamily: "monospace",
                    }}
                  >
                    {session.deviceId}
                  </span>
                </div>
              </>
            )}

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
            style={{ fontSize: "14px", fontWeight: "600", color: "#f8fafc" }}
          >
            24.0h total
          </span>
          <span
            style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}
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

export default function CapacitySohTab({ BMSID }: { BMSID: string }) {
  const [tboxData, setTboxData] = useState<TBoxBMSSession[]>([]);
  const [bssData, setBssData] = useState<BSSSession[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedBatterySession[]>(
    []
  );
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

        // Fetch TBox sessions
        const tboxSql = `WITH last_date AS (
                SELECT MAX(START_TIME) as max_date
                FROM REPORT_DB.GPS_DASHBOARD.TBOX_BMS_BRIDGE
                WHERE BMSID = '${BMSID}'
                  AND END_TIME IS NOT NULL
            ),
            ordered AS (
                SELECT 
                    SESSION_ID,
                    TBOXID,
                    BMSID,
                    START_TIME,
                    END_TIME,
                    LEAD(START_TIME) OVER (PARTITION BY BMSID ORDER BY START_TIME) AS NEXT_START
                FROM REPORT_DB.GPS_DASHBOARD.TBOX_BMS_BRIDGE
                WHERE END_TIME IS NOT NULL
                  AND BMSID = '${BMSID}'
                  AND START_TIME >= DATEADD(day, -90, (SELECT max_date FROM last_date))
            ),
            gaps AS (
                SELECT 
                    BMSID,
                    TBOXID,
                    END_TIME AS GAP_START,
                    NEXT_START AS GAP_END
                FROM ordered
                WHERE NEXT_START IS NOT NULL 
                  AND DATEDIFF(minute, END_TIME, NEXT_START) > 10
            ),
            split_gaps AS (
                SELECT
                    BMSID,
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

            SELECT 
                NULL AS SESSION_ID,
                TBOXID,
                BMSID,
                GAP_START AS START_TIME,
                GAP_END AS END_TIME,
                LPAD(DATEDIFF(second, GAP_START, GAP_END) / 3600, 2, '0') || 'h ' ||
                LPAD(MOD(DATEDIFF(second, GAP_START, GAP_END) / 60, 60), 2, '0') || 'm' AS DURATION
            FROM split_gaps
            WHERE parts = 1

            UNION ALL

            SELECT 
                NULL AS SESSION_ID,
                TBOXID,
                BMSID,
                GAP_START AS START_TIME,
                DATEADD(day, 1, DATE_TRUNC('day', GAP_START)) AS END_TIME,
                LPAD(DATEDIFF(second, GAP_START, DATEADD(day, 1, DATE_TRUNC('day', GAP_START))) / 3600, 2, '0') || 'h ' ||
                LPAD(MOD(DATEDIFF(second, GAP_START, DATEADD(day, 1, DATE_TRUNC('day', GAP_START))) / 60, 60), 2, '0') || 'm' AS DURATION
            FROM split_gaps
            WHERE parts = 2

            UNION ALL

            SELECT 
                NULL AS SESSION_ID,
                TBOXID,
                BMSID,
                DATEADD(day, 1, DATE_TRUNC('day', GAP_START)) AS START_TIME,
                GAP_END AS END_TIME,
                LPAD(DATEDIFF(second, DATEADD(day, 1, DATE_TRUNC('day', GAP_START)), GAP_END) / 3600, 2, '0') || 'h ' ||
                LPAD(MOD(DATEDIFF(second, DATEADD(day, 1, DATE_TRUNC('day', GAP_START)), GAP_END) / 60, 60), 2, '0') || 'm' AS DURATION
            FROM split_gaps
            WHERE parts = 2

            ORDER BY START_TIME
            LIMIT 1000`;

        // Fetch BSS sessions - Fixed SQL query to match interface
        const bssSql = `WITH last_date AS (
                SELECT MAX(START_TIME) as max_date
                FROM REPORT_DB.BSS_ANALYTICS.BSS_CABINET_BID_BRIDGE
                WHERE BMSID = '${BMSID}'
                  AND END_TIME IS NOT NULL
            )
            SELECT 
                SESSION_ID,
                STATION_ID,
                STATION_NAME,
                CABINET_NO,
                BMSID,
                START_TIME,
                END_TIME
            FROM REPORT_DB.BSS_ANALYTICS.BSS_CABINET_BID_BRIDGE
            WHERE BMSID = '${BMSID}'
              AND END_TIME IS NOT NULL
              AND START_TIME >= DATEADD(day, -90, (SELECT max_date FROM last_date))
            ORDER BY START_TIME
            LIMIT 1000`;

        const [tboxResponse, bssResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sql: tboxSql }),
          }),
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sql: bssSql }),
          }),
        ]);

        if (!tboxResponse.ok || !bssResponse.ok) {
          throw new Error(
            `HTTP error! status: ${tboxResponse.status} / ${bssResponse.status}`
          );
        }

        const tboxData = await tboxResponse.json();
        const bssData = await bssResponse.json();

        if (tboxData.error) throw new Error(tboxData.error);
        if (bssData.error) throw new Error(bssData.error);

        setTboxData(tboxData);
        setBssData(bssData);

        const processed = processCombinedSessionData(tboxData, bssData);
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
  }, [BMSID]);

  const analytics = getBatteryAnalytics(processedData);

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
          totalHours: 24, // Always 24 hours
        };
      })
    : [];

  // Visx chart dimensions
  const margin = { top: 20, right: 20, bottom: 80, left: 60 };

  // Collect all unique colors needed for patterns
  const allUniqueColors = React.useMemo(() => {
    if (!analytics) return new Set<string>();

    const colors = new Set<string>();
    // Collect TBox colors
    analytics.uniqueTBoxIds.forEach((tboxId) => {
      colors.add(analytics.unifiedColorMap[tboxId]);
    });
    // Collect BSS station colors
    analytics.uniqueStationNames.forEach((stationName) => {
      colors.add(analytics.unifiedColorMap[stationName]);
    });
    return colors;
  }, [analytics]);

  // Render dynamic patterns for all unique colors
  const renderDynamicPatterns = () => {
    return Array.from(allUniqueColors).map((color) => (
      <React.Fragment key={color}>
        {createTBoxPattern(color)}
        {createBSSPattern(color)}
      </React.Fragment>
    ));
  };

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-slate-400">Total Sessions</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {analytics.totalSessions}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {analytics.tboxSessions} vehicle + {analytics.bssSessions} BSS
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-400">Vehicles Used</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {analytics.uniqueTBoxes}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {analytics.totalTBoxHours.toFixed(0)}h total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-slate-400">BSS Stations</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {analytics.uniqueStations}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {analytics.totalBSSHours.toFixed(0)}h total
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
              <span className="text-sm text-slate-400">Utilization %</span>
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
            Complete Battery Lifecycle - Last 90 Days
          </CardTitle>
          <CardDescription className="text-slate-400">
            Full battery journey showing vehicle usage (TBox) and BSS station
            storage. Each color represents different vehicles or BSS stations.
            White = Idle/Not tracked.
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div style={{ position: "relative", height: 450, width: "100%" }}>
            <ParentSize>
              {({ width, height }) => {
                const dynamicXScale = scaleBand<string>({
                  domain: dailyStackedData.map((d) => d.date),
                  range: [margin.left, width - margin.right],
                  padding: 0.2,
                });

                const dynamicYScale = scaleLinear({
                  domain: [0, 24],
                  range: [height - margin.bottom, margin.top],
                });

                return (
                  <svg width={width} height={height}>
                    {/* Pattern Definitions */}
                    <defs>
                      {/* Dynamic patterns for all unique colors */}
                      {renderDynamicPatterns()}

                      {/* Default pattern for unavailable */}
                      <pattern
                        id="unavailable-pattern"
                        patternUnits="userSpaceOnUse"
                        width="6"
                        height="6"
                      >
                        <rect width="6" height="6" fill="#FFFFFF" />
                        <line
                          x1="0"
                          y1="3"
                          x2="6"
                          y2="3"
                          stroke="rgba(0,0,0,0.1)"
                          strokeWidth="1"
                          strokeDasharray="1,2"
                        />
                      </pattern>
                    </defs>

                    {/* Horizontal Grid Lines */}
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

                      // Calculate total hours in sessions
                      const totalSessionHours = dayData.sessions.reduce(
                        (sum, session) => sum + session.durationMinutes / 60,
                        0
                      );

                      // Calculate unavailable hours to fill to 24
                      const unavailableHours = Math.max(
                        0,
                        24 - totalSessionHours
                      );

                      return (
                        <Group key={dayData.date} left={barX}>
                          {/* First, add unavailable background if needed */}
                          {unavailableHours > 0 && (
                            <Bar
                              x={0}
                              y={dynamicYScale(24)}
                              width={barWidth}
                              height={Math.max(
                                0,
                                dynamicYScale(0) -
                                  dynamicYScale(unavailableHours)
                              )}
                              fill="url(#unavailable-pattern)"
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth={1}
                              rx={1}
                            />
                          )}

                          {/* Then render all sessions on top */}
                          {dayData.sessions.map((session, sessionIndex) => {
                            const sessionHours = session.durationMinutes / 60;
                            const barHeight =
                              dynamicYScale(0) - dynamicYScale(sessionHours);
                            const barY = dynamicYScale(
                              sessionHours + cumulativeHours
                            );

                            let fillPattern: string;
                            let strokeColor: string;
                            let strokeWidth: number;

                            if (session.sessionType === "BSS") {
                              const color =
                                analytics.unifiedColorMap[
                                  session.stationName!
                                ] || "#22d3ee";
                              fillPattern = `url(#bss-pattern-${color.replace(
                                "#",
                                ""
                              )})`;
                              strokeColor = "#FFFFFF";
                              strokeWidth = 1.2;
                            } else if (session.isUnavailable) {
                              fillPattern = "url(#unavailable-pattern)";
                              strokeColor = "rgba(255,255,255,0.3)";
                              strokeWidth = 1;
                            } else {
                              const color =
                                analytics.unifiedColorMap[session.tboxId!] ||
                                "#3b82f6";
                              fillPattern = `url(#tbox-pattern-${color.replace(
                                "#",
                                ""
                              )})`;
                              strokeColor = "rgba(0,0,0,0.4)";
                              strokeWidth = 1.5;
                            }

                            cumulativeHours += sessionHours;

                            return (
                              <g
                                key={`${
                                  session.sessionId || "unavailable"
                                }-${sessionIndex}`}
                              >
                                <Bar
                                  x={0}
                                  y={barY}
                                  width={barWidth}
                                  height={Math.max(0, barHeight)}
                                  fill={fillPattern}
                                  stroke={strokeColor}
                                  strokeWidth={strokeWidth}
                                  rx={session.sessionType === "BSS" ? 0 : 1}
                                  onMouseMove={(event) => {
                                    const svgRect =
                                      event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                    if (svgRect) {
                                      showTooltip({
                                        tooltipData: { session, dayData },
                                        tooltipLeft:
                                          event.clientX - svgRect.left,
                                        tooltipTop: event.clientY - svgRect.top,
                                      });
                                    }
                                  }}
                                  onMouseLeave={hideTooltip}
                                  style={{
                                    cursor: "pointer",
                                    filter: session.isUnavailable
                                      ? "none"
                                      : "brightness(1.1)",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!session.isUnavailable) {
                                      e.currentTarget.style.filter =
                                        "brightness(1.3)";
                                      e.currentTarget.style.strokeWidth = "2px";
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    if (!session.isUnavailable) {
                                      e.currentTarget.style.filter =
                                        "brightness(1.1)";
                                      e.currentTarget.style.strokeWidth = `${strokeWidth}px`;
                                    }
                                  }}
                                />
                                {/* Add inner highlight for better visibility */}
                                {!session.isUnavailable && (
                                  <rect
                                    x="1"
                                    y={barY + 1}
                                    width={barWidth - 2}
                                    height={Math.max(0, barHeight - 2)}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth="0.5"
                                    rx={session.sessionType === "BSS" ? 0 : 0.5}
                                  />
                                )}
                              </g>
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
                      Usage Duration (Hours)
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
                unifiedColorMap={analytics.unifiedColorMap}
                unavailableColor={analytics.unavailableColor}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lifecycle Distribution Pie Chart */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Activity className="w-5 h-5 text-green-400" />
              Battery Lifecycle Distribution
            </CardTitle>
            <CardDescription className="text-slate-400">
              Time spent in vehicles, BSS stations, and idle
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 mt-16">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={analytics.statusDistribution.map((item) => ({
                    ...item,
                    color:
                      item.status === "In Vehicle"
                        ? "#10b981"
                        : item.status === "In BSS"
                        ? "#22d3ee"
                        : "#FFFFFF",
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={170}
                  innerRadius={50}
                  paddingAngle={1}
                  dataKey="hours"
                  nameKey="status"
                >
                  {analytics.statusDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.status === "In Vehicle"
                          ? "#10b981"
                          : entry.status === "In BSS"
                          ? "#22d3ee"
                          : "#FFFFFF"
                      }
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const totalHours = analytics.statusDistribution.reduce(
                        (sum, item) => sum + item.hours,
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
                              {data.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 uppercase mb-1">
                            Total Hours
                          </div>
                          <div className="text-sm font-bold text-slate-200">
                            {data.hours}h ({percentage}%)
                          </div>
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

        {/* Vehicle Distribution */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Truck className="w-5 h-5 text-purple-400" />
              Vehicle Usage Distribution
            </CardTitle>
            <CardDescription className="text-slate-400">
              Hours attached to each vehicle
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 mt-16">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={(() => {
                    const tboxHours: Record<string, number> = {};

                    analytics.dailySummaries.forEach((day) => {
                      Object.entries(day.tboxBreakdown).forEach(
                        ([tboxId, hours]) => {
                          if (tboxId !== "UNAVAILABLE") {
                            tboxHours[tboxId] =
                              (tboxHours[tboxId] || 0) + hours;
                          }
                        }
                      );
                    });

                    return Object.entries(tboxHours)
                      .map(([tboxId, hours]) => ({
                        name: `TBox ${tboxId.replace("TBOX_", "")}`,
                        tboxId,
                        hours: Number(hours.toFixed(1)),
                        color:
                          analytics.unifiedColorMap[
                            parseInt(tboxId.replace("TBOX_", ""))
                          ] || "#64748b",
                      }))
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
                    const tboxHours: Record<string, number> = {};

                    analytics.dailySummaries.forEach((day) => {
                      Object.entries(day.tboxBreakdown).forEach(
                        ([tboxId, hours]) => {
                          if (tboxId !== "UNAVAILABLE") {
                            tboxHours[tboxId] =
                              (tboxHours[tboxId] || 0) + hours;
                          }
                        }
                      );
                    });

                    return Object.entries(tboxHours)
                      .map(([tboxId, hours]) => ({
                        tboxId,
                        hours,
                        color:
                          analytics.unifiedColorMap[
                            parseInt(tboxId.replace("TBOX_", ""))
                          ] || "#64748b",
                      }))
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
                      const percentage = (
                        (data.hours / analytics.totalTBoxHours) *
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

        {/* Daily Battery Utilization */}
        <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Daily Utilization Breakdown
            </CardTitle>
            <CardDescription className="text-slate-400">
              Battery usage by location: vehicles (green), BSS stations (cyan),
              and idle time
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={analytics.operationalEfficiency}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-700"
                />

                <XAxis
                  dataKey="date"
                  className="text-xs fill-slate-400"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickFormatter={formatDate}
                />
                <YAxis
                  className="text-xs fill-slate-400"
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />

                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-slate-900 p-3 shadow-sm border-slate-700">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col col-span-2">
                              <span className="text-[0.70rem] uppercase text-slate-400">
                                Date
                              </span>
                              <span className="font-bold text-slate-200">
                                {formatDate(label)}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-slate-400">
                                In Vehicle
                              </span>
                              <span className="font-bold text-green-400">
                                {data.tboxTime.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-slate-400">
                                In BSS
                              </span>
                              <span className="font-bold text-cyan-400">
                                {data.bssTime.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-slate-400">
                                Total Active
                              </span>
                              <span className="font-bold text-blue-400">
                                {data.uptime.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-slate-400">
                                Idle
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
                  dataKey="tboxTime"
                  strokeWidth={2}
                  stroke="#10b981"
                  name="In Vehicle"
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: "#10b981" }}
                />
                <Line
                  type="monotone"
                  dataKey="bssTime"
                  strokeWidth={2}
                  stroke="#22d3ee"
                  name="In BSS"
                  dot={{ fill: "#22d3ee", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: "#22d3ee" }}
                />
                <Line
                  type="monotone"
                  dataKey="downtime"
                  strokeWidth={2}
                  stroke="#ef4444"
                  name="Idle"
                  dot={{ fill: "#ef4444", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: "#ef4444" }}
                />
              </LineChart>
            </ResponsiveContainer>
            {/* Summary badges under chart */}
            <div className="mt-4 grid grid-cols-4 gap-4">
              <div className="rounded-xl bg-slate-800 px-3 py-2 text-center">
                <div className="text-xs text-slate-400 uppercase">
                  Avg Vehicle Time
                </div>
                <div className="text-lg font-bold text-green-400">
                  {(
                    analytics.operationalEfficiency.reduce(
                      (a, b) => a + b.tboxTime,
                      0
                    ) / analytics.operationalEfficiency.length
                  ).toFixed(1)}
                  %
                </div>
              </div>
              <div className="rounded-xl bg-slate-800 px-3 py-2 text-center">
                <div className="text-xs text-slate-400 uppercase">
                  Avg BSS Time
                </div>
                <div className="text-lg font-bold text-cyan-400">
                  {(
                    analytics.operationalEfficiency.reduce(
                      (a, b) => a + b.bssTime,
                      0
                    ) / analytics.operationalEfficiency.length
                  ).toFixed(1)}
                  %
                </div>
              </div>
              <div className="rounded-xl bg-slate-800 px-3 py-2 text-center">
                <div className="text-xs text-slate-400 uppercase">
                  Avg Idle Time
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
                <div className="text-lg font-bold text-cyan-400">
                  {formatDate(
                    analytics.operationalEfficiency.reduce((max, d) =>
                      d.uptime > max.uptime ? d : max
                    ).date
                  )}
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
            Battery Attachment History ({processedData.length} total sessions)
          </CardTitle>
          <CardDescription className="text-slate-400">
            All sessions showing which vehicle this battery was attached to,
            including periods when not attached. Showing {rowsPerPage} per page.
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
                    Vehicle (TBox)
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
                      {session.isUnavailable ? (
                        <span
                          className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2"
                          style={{
                            backgroundColor: "rgba(255,255,255,0.1)",
                            color: "#ffffff",
                            border: "1px solid rgba(255,255,255,0.2)",
                          }}
                        >
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          NO SIGNAL
                        </span>
                      ) : session.sessionType === "BSS" ? (
                        <span
                          className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2"
                          style={{
                            backgroundColor: `${
                              analytics.unifiedColorMap[session.stationName!] ||
                              "#22d3ee"
                            }20`,
                            color:
                              analytics.unifiedColorMap[session.stationName!] ||
                              "#22d3ee",
                            border: `2px solid ${
                              analytics.unifiedColorMap[session.stationName!] ||
                              "#22d3ee"
                            }60`,
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                analytics.unifiedColorMap[
                                  session.stationName!
                                ] || "#22d3ee",
                            }}
                          />
                          🏢 {session.stationName}
                        </span>
                      ) : (
                        <span
                          className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2"
                          style={{
                            backgroundColor: `${
                              analytics.unifiedColorMap[session.tboxId!] ||
                              "#3b82f6"
                            }20`,
                            color:
                              analytics.unifiedColorMap[session.tboxId!] ||
                              "#3b82f6",
                            border: `2px solid ${
                              analytics.unifiedColorMap[session.tboxId!] ||
                              "#3b82f6"
                            }60`,
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                analytics.unifiedColorMap[session.tboxId!] ||
                                "#3b82f6",
                            }}
                          />
                          🚛 TBox {session.tboxId}
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
                              Not Attached
                            </span>
                          </div>
                        ) : session.sessionType === "BSS" ? (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                            <span className="text-cyan-400 text-xs font-medium">
                              BSS Station
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-green-400 text-xs font-medium">
                              Attached
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
