import { useState, useEffect, useMemo, useCallback } from "react";

// Core interfaces for battery diagnostics (battery-centric view)
interface TboxData {
  BATTEMP: number;
  BATVOLT: number;
  BATCELLDIFFMAX: number;
  BATCYCLECOUNT: number;
  BATSOH: number;
  BATPERCENT: number;
  BATCURRENT: number;
  BATTERY_ERROR: string;
  CTIME: number;
  MOTORRPM: number;
  TBOXID: string;
  TOTAL_DISTANCE_KM: number;
  STATE: string;
  THROTTLEPERCENT: number;
}

interface VehicleSwapEvent {
  TIMESTAMP: number;
  OLDTBOXID: string;
  NEWTBOXID: string;
  OLDSOH: number;
  NEWSOH: number;
  CHARGECHANGE: number;
}

interface VehicleSession {
  TBOXID: string;
  STARTTIME: number;
  ENDTIME: number;
  DURATION: number;
  AVGSOH: number;
  AVGTEMP: number;
  AVGVOLTAGE: number;
  STARTCHARGE: number;
  ENDCHARGE: number;
  CHARGECONSUMED: number;
  DISTANCECOVERED: number;
  AVGCURRENT: number;
  MAXTEMP: number;
  MINVOLTAGE: number;
  CYCLECOUNT: number;
  ERROREVENTS: number;
}

interface BSSChargeData {
  DEVICE_ID: string;
  CABINET_NO: number;
  SLOT_NO: number;
  CTIME: number;
  CHARGE_LEVEL: number;
  TEMP: number;
  VOLTAGE: number;
  CURRENT_VALUE: number;
  CHARGER_STATUS: string;
}

interface BSSChargingSession {
  DEVICE_ID: string;
  CABINET_NO: number;
  SLOT_NO: number;
  STARTTIME: number;
  ENDTIME: number;
  DURATION: number;
  STARTCHARGE: number;
  ENDCHARGE: number;
  CHARGE_GAINED: number;
  AVGTEMP: number;
  AVGVOLTAGE: number;
  AVGCURRENT: number;
  MAXTEMP: number;
  CHARGER_STATUS: string;
}

interface DiagnosticMetrics {
  totalVehicles: number;
  totalSwaps: number;
  avgSessionDuration: number;
  preferredVehicles: string[];
  problematicVehicles: string[];
  swapFrequency: number;
  batteryEfficiency: number;
  thermalPerformance: string;
  voltageStability: string;
  overallHealth: string;
  totalChargingSessions?: number;
  avgChargingDuration?: number;
  totalChargeGained?: number;
}

interface BatteryFilters {
  timeRange?: number;
  startTimestamp?: number;
  endTimestamp?: number;
  includeIdleData?: boolean;
  minBatteryTemp?: number;
  maxBatteryTemp?: number;
  minSOH?: number;
}

// Helper function to safely convert values to numbers
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

// Utility function to clean TBox IDs
function cleanTboxId(tboxId: string): string {
  if (!tboxId || typeof tboxId !== 'string') return '';
  
  return tboxId
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

// Check if two TBox IDs are essentially the same after cleaning
function areSameVehicle(tboxId1: string, tboxId2: string): boolean {
  const clean1 = cleanTboxId(tboxId1);
  const clean2 = cleanTboxId(tboxId2);
  
  if (clean1 === clean2) return true;
  
  if (clean1.length > 10 && clean2.length > 10) {
    const minLength = Math.min(clean1.length, clean2.length);
    if (minLength > 10) {
      return clean1.substring(0, minLength) === clean2.substring(0, minLength);
    }
  }
  
  return false;
}

// Consolidate rapid swaps within time window
function consolidateRapidSwaps(swaps: VehicleSwapEvent[], timeWindowMinutes: number = 10): VehicleSwapEvent[] {
  if (swaps.length === 0) return [];
  
  const consolidated: VehicleSwapEvent[] = [];
  const timeWindowSeconds = timeWindowMinutes * 60;
  
  const sortedSwaps = [...swaps].sort((a, b) => b.TIMESTAMP - a.TIMESTAMP);
  
  let i = 0;
  while (i < sortedSwaps.length) {
    const currentSwap = sortedSwaps[i];
    const swapGroup: VehicleSwapEvent[] = [currentSwap];
    
    let j = i + 1;
    while (j < sortedSwaps.length) {
      const nextSwap = sortedSwaps[j];
      const timeDiff = currentSwap.TIMESTAMP - nextSwap.TIMESTAMP;
      
      if (timeDiff <= timeWindowSeconds) {
        const sameOldNew = (areSameVehicle(currentSwap.OLDTBOXID, nextSwap.OLDTBOXID) && 
                           areSameVehicle(currentSwap.NEWTBOXID, nextSwap.NEWTBOXID));
        const sameNewOld = (areSameVehicle(currentSwap.OLDTBOXID, nextSwap.NEWTBOXID) && 
                           areSameVehicle(currentSwap.NEWTBOXID, nextSwap.OLDTBOXID));
        
        if (sameOldNew || sameNewOld) {
          swapGroup.push(nextSwap);
          sortedSwaps.splice(j, 1);
        } else {
          j++;
        }
      } else {
        break;
      }
    }
    
    if (swapGroup.length > 1) {
      const firstSwap = swapGroup[swapGroup.length - 1];
      const lastSwap = swapGroup[0];
      
      const consolidatedSwap: VehicleSwapEvent = {
        TIMESTAMP: lastSwap.TIMESTAMP,
        OLDTBOXID: cleanTboxId(firstSwap.OLDTBOXID),
        NEWTBOXID: cleanTboxId(lastSwap.NEWTBOXID),
        OLDSOH: firstSwap.OLDSOH,
        NEWSOH: lastSwap.NEWSOH,
        CHARGECHANGE: swapGroup.reduce((sum, swap) => sum + swap.CHARGECHANGE, 0),
      };
      
      if (!areSameVehicle(consolidatedSwap.OLDTBOXID, consolidatedSwap.NEWTBOXID)) {
        consolidated.push(consolidatedSwap);
      }
    } else {
      const cleanedSwap = {
        ...currentSwap,
        OLDTBOXID: cleanTboxId(currentSwap.OLDTBOXID),
        NEWTBOXID: cleanTboxId(currentSwap.NEWTBOXID)
      };
      
      if (!areSameVehicle(cleanedSwap.OLDTBOXID, cleanedSwap.NEWTBOXID)) {
        consolidated.push(cleanedSwap);
      }
    }
    
    i++;
  }
  
  return consolidated.sort((a, b) => b.TIMESTAMP - a.TIMESTAMP);
}

function useBatteryDataByBMS(
  bmsId: string,
  filters: BatteryFilters = { timeRange: 168 }
) {
  const [batteryData, setBatteryData] = useState<TboxData[]>([]);
  const [vehicleSwaps, setVehicleSwaps] = useState<VehicleSwapEvent[]>([]);
  const [vehicleSessions, setVehicleSessions] = useState<VehicleSession[]>([]);
  const [bssChargeData, setBssChargeData] = useState<BSSChargeData[]>([]);
  const [bssChargingSessions, setBssChargingSessions] = useState<BSSChargingSession[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const fetchSnowflakeData = useCallback(async (query: string, queryName?: string) => {
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: query,
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Snowflake API Error (${response.status}): ${JSON.stringify(result)}`);
      }

      const data = result.data || result.rows || result || [];
      return data;
    } catch (error) {
      console.error(`${queryName || 'Query'} failed:`, error);
      throw error;
    }
  }, []);

  const normalizeUnits = useCallback((data: any[]): TboxData[] => {
    return data.map(row => ({
      ...row,
      BATTEMP: safeNumber(row.BATTEMP) / 10,
      BATVOLT: safeNumber(row.BATVOLT) / 10,
      BATCELLDIFFMAX: safeNumber(row.BATCELLDIFFMAX) / 10,
      BATCURRENT: safeNumber(row.BATCURRENT),
      BATSOH: safeNumber(row.BATSOH),
      BATPERCENT: safeNumber(row.BATPERCENT),
      BATCYCLECOUNT: safeNumber(row.BATCYCLECOUNT),
      CTIME: safeNumber(row.CTIME),
      MOTORRPM: safeNumber(row.MOTORRPM),
      TOTAL_DISTANCE_KM: safeNumber(row.TOTAL_DISTANCE_KM),
      THROTTLEPERCENT: safeNumber(row.THROTTLEPERCENT),
      BATTERY_ERROR: row.BATTERY_ERROR || '',
      TBOXID: row.TBOXID || '',
      STATE: row.STATE || 'UNKNOWN',
    }));
  }, []);

  const normalizeSessionUnits = useCallback((sessions: any[]): VehicleSession[] => {
    return sessions.map(session => ({
      ...session,
      AVGTEMP: safeNumber(session.AVGTEMP) / 10,
      AVGVOLTAGE: safeNumber(session.AVGVOLTAGE) / 10,
      MAXTEMP: safeNumber(session.MAXTEMP) / 10,
      MINVOLTAGE: safeNumber(session.MINVOLTAGE) / 10,
      AVGCURRENT: safeNumber(session.AVGCURRENT),
      AVGSOH: safeNumber(session.AVGSOH),
      STARTCHARGE: safeNumber(session.STARTCHARGE),
      ENDCHARGE: safeNumber(session.ENDCHARGE),
      CHARGECONSUMED: safeNumber(session.CHARGECONSUMED),
      DISTANCECOVERED: safeNumber(session.DISTANCECOVERED),
      DURATION: safeNumber(session.DURATION),
      STARTTIME: safeNumber(session.STARTTIME),
      ENDTIME: safeNumber(session.ENDTIME),
      CYCLECOUNT: safeNumber(session.CYCLECOUNT),
      ERROREVENTS: safeNumber(session.ERROREVENTS),
      TBOXID: session.TBOXID || '',
    }));
  }, []);

  const buildFilterConditions = useCallback(() => {
    const conditions: string[] = [];

    if (filters.startTimestamp && filters.endTimestamp) {
      conditions.push(`CTIME >= ${filters.startTimestamp}`);
      conditions.push(`CTIME <= ${filters.endTimestamp}`);
    } else if (filters.timeRange) {
      const hoursAgo = Math.floor(Date.now() / 1000) - (filters.timeRange * 3600);
      conditions.push(`CTIME >= ${hoursAgo}`);
    }

    if (filters.minBatteryTemp) {
      conditions.push(`BATTEMP >= ${filters.minBatteryTemp * 10}`);
    }

    if (filters.maxBatteryTemp) {
      conditions.push(`BATTEMP <= ${filters.maxBatteryTemp * 10}`);
    }

    if (filters.minSOH) {
      conditions.push(`BATSOH >= ${filters.minSOH}`);
    }

    // if (!filters.includeIdleData) {
    //   conditions.push(`NOT (MOTORRPM <= 20 AND THROTTLEPERCENT <= 50 AND ABS(BATCURRENT) <= 20)`);
    // }

    return conditions;
  }, [filters]);

  const buildBSSFilterConditions = useCallback(() => {
    const conditions: string[] = [];

    if (filters.startTimestamp && filters.endTimestamp) {
      conditions.push(`CT >= ${filters.startTimestamp}`);
      conditions.push(`CT <= ${filters.endTimestamp}`);
    } else if (filters.timeRange) {
      const hoursAgo = Math.floor(Date.now() / 1000) - (filters.timeRange * 3600);
      conditions.push(`CT >= ${hoursAgo}`);
    }

    return conditions;
  }, [filters]);

  const loadData = useCallback(async () => {
    if (!bmsId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      const cleanId = bmsId.trim();
      
      // Step 1: Check if the TBOXID exists at all
      const existenceCheck = `
        SELECT 
          COUNT(*) as TOTAL_RECORDS,
          MIN(CTIME) as EARLIEST_TIME,
          MAX(CTIME) as LATEST_TIME,
          COUNT(DISTINCT DATE_TRUNC('day', TO_TIMESTAMP(CTIME))) as ACTIVE_DAYS
        FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
        WHERE TBOXID = '${cleanId}'
      `;
      
      const existenceResult = await fetchSnowflakeData(existenceCheck, "existenceCheck");
      
      if (!existenceResult || existenceResult.length === 0 || existenceResult[0].TOTAL_RECORDS === 0) {
        // TBOXID doesn't exist - show what does exist
        const sampleTboxQuery = `
          SELECT DISTINCT 
            TBOXID,
            COUNT(*) as RECORD_COUNT,
            MIN(CTIME) as FIRST_SEEN,
            MAX(CTIME) as LAST_SEEN
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          GROUP BY TBOXID
          ORDER BY RECORD_COUNT DESC
          LIMIT 10
        `;
        
        const sampleTbox = await fetchSnowflakeData(sampleTboxQuery, "sampleTbox");
        
        setError(`TBOXID "${cleanId}" not found in database. Available TBOXIDs: ${sampleTbox.map((r: any) => r.TBOXID).join(', ')}`);
        setLoading(false);
        return;
      }
      
      // Step 2: Check data with time filter
      const filterConditions = buildFilterConditions();
      const whereClause = `WHERE TBOXID = '${cleanId}' AND ${filterConditions.join(' AND ')}`;
      
      // Step 3: Fetch telemetry data
      const telemetryQuery = `
        SELECT
          BATTEMP,
          BATVOLT,
          COALESCE(
            NULLIF(BATCELLDIFFMAX, 0),
            CASE 
              WHEN BATVOLT IS NOT NULL AND BATVOLT > 0 THEN 
                ABS(BATVOLT - 520) * 10.0
              ELSE 0 
            END
          ) as BATCELLDIFFMAX,
          BATCYCLECOUNT,
          BATSOH,
          BATPERCENT,
          BATCURRENT,
          COALESCE(BATTERY_ERROR, '') as BATTERY_ERROR,
          CTIME,
          MOTORRPM,
          TBOXID,
          COALESCE(TOTAL_DISTANCE_KM, 0) as TOTAL_DISTANCE_KM,
          COALESCE(STATE, 'UNKNOWN') as STATE,
          THROTTLEPERCENT
        FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
        ${whereClause}
        ORDER BY CTIME ASC
      `;

      let telemetryResult = await fetchSnowflakeData(telemetryQuery, "batteryTelemetry");
      
      // If no data with idle filter, try without it
      if (!telemetryResult || telemetryResult.length === 0) {
        const noIdleConditions = filterConditions.filter(c => !c.includes('NOT (MOTORRPM'));
        const noIdleWhere = `WHERE TBOXID = '${cleanId}' AND ${noIdleConditions.join(' AND ')}`;
        
        const noIdleQuery = `
          SELECT
            BATTEMP,
            BATVOLT,
            COALESCE(NULLIF(BATCELLDIFFMAX, 0), CASE WHEN BATVOLT IS NOT NULL AND BATVOLT > 0 THEN ABS(BATVOLT - 520) * 10.0 ELSE 0 END) as BATCELLDIFFMAX,
            BATCYCLECOUNT,
            BATSOH,
            BATPERCENT,
            BATCURRENT,
            COALESCE(BATTERY_ERROR, '') as BATTERY_ERROR,
            CTIME,
            MOTORRPM,
            TBOXID,
            COALESCE(TOTAL_DISTANCE_KM, 0) as TOTAL_DISTANCE_KM,
            COALESCE(STATE, 'UNKNOWN') as STATE,
            THROTTLEPERCENT
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          ${noIdleWhere}
          ORDER BY CTIME ASC
        `;
        
        telemetryResult = await fetchSnowflakeData(noIdleQuery, "batteryTelemetryNoIdle");
        
        if (telemetryResult && telemetryResult.length > 0) {
          setDebugInfo(prev => ({
            ...prev,
            idleFilterRemoved: true,
            idleFilterRemovedMessage: "All data was being filtered out by idle condition. Removed idle filter."
          }));
        }
      }
      
      // If still no data, try a broader time range
      if (!telemetryResult || telemetryResult.length === 0) {
        const broadConditions = filterConditions.filter(c => !c.includes('CTIME >='));
        const broadWhere = `WHERE TBOXID = '${cleanId}' AND ${broadConditions.join(' AND ')}`;
        
        const broadQuery = `
          SELECT
            BATTEMP,
            BATVOLT,
            COALESCE(NULLIF(BATCELLDIFFMAX, 0), CASE WHEN BATVOLT IS NOT NULL AND BATVOLT > 0 THEN ABS(BATVOLT - 520) * 10.0 ELSE 0 END) as BATCELLDIFFMAX,
            BATCYCLECOUNT,
            BATSOH,
            BATPERCENT,
            BATCURRENT,
            COALESCE(BATTERY_ERROR, '') as BATTERY_ERROR,
            CTIME,
            MOTORRPM,
            TBOXID,
            COALESCE(TOTAL_DISTANCE_KM, 0) as TOTAL_DISTANCE_KM,
            COALESCE(STATE, 'UNKNOWN') as STATE,
            THROTTLEPERCENT
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          ${broadWhere}
          ORDER BY CTIME DESC
          LIMIT 1000
        `;
        
        telemetryResult = await fetchSnowflakeData(broadQuery, "batteryTelemetryBroad");
        
        if (telemetryResult && telemetryResult.length > 0) {
          setDebugInfo(prev => ({
            ...prev,
            timeRangeExpanded: true,
            timeRangeExpandedMessage: "No data in current time range. Expanded to all available data."
          }));
        }
      }
      
      if (!telemetryResult || telemetryResult.length === 0) {
        setError(`No data found for TBOXID "${cleanId}" with current filters.`);
        setLoading(false);
        return;
      }
      
      const normalizedTelemetry = normalizeUnits(telemetryResult);
      setBatteryData(normalizedTelemetry);
      
      // Step 4: Fetch swap detection data
      const swapConditions = buildFilterConditions();
      const swapWhere = `WHERE TBOXID = '${cleanId}' AND ${swapConditions.join(' AND ')}`;
      
      const swapQuery = `
        WITH cleaned_data AS (
          SELECT
            CTIME,
            TBOXID,
            BATSOH,
            BATPERCENT,
            LAG(TBOXID) OVER (ORDER BY CTIME) as prev_tbox,
            LAG(BATSOH) OVER (ORDER BY CTIME) as prev_soh,
            LAG(BATPERCENT) OVER (ORDER BY CTIME) as prev_charge,
            LAG(CTIME) OVER (ORDER BY CTIME) as prev_time,
            ROW_NUMBER() OVER (ORDER BY CTIME) as row_num
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          ${swapWhere}
        ),
        swaps AS (
          SELECT
            CTIME as TIMESTAMP,
            prev_tbox as OLDTBOXID,
            TBOXID as NEWTBOXID,
            COALESCE(prev_soh, 0) as OLDSOH,
            COALESCE(BATSOH, 0) as NEWSOH,
            COALESCE((BATPERCENT - prev_charge), 0) as CHARGECHANGE,
            (CTIME - prev_time) as time_gap
          FROM cleaned_data
          WHERE TBOXID != prev_tbox
            AND prev_tbox IS NOT NULL
            AND TBOXID IS NOT NULL
            AND prev_tbox != ''
            AND TBOXID != ''
            AND (CTIME - prev_time) >= 30
            AND LENGTH(TBOXID) > 3
            AND LENGTH(prev_tbox) > 3
        )
        SELECT 
          TIMESTAMP,
          OLDTBOXID,
          NEWTBOXID,
          OLDSOH,
          NEWSOH,
          CHARGECHANGE
        FROM swaps
        ORDER BY TIMESTAMP DESC
        LIMIT 100
      `;
      
      let swapResult = await fetchSnowflakeData(swapQuery, "vehicleSwapDetection");
      
      // If no swaps, try without idle filter
      if (!swapResult || swapResult.length === 0) {
        const noIdleSwapConditions = swapConditions.filter(c => !c.includes('NOT (MOTORRPM'));
        const noIdleSwapWhere = `WHERE TBOXID = '${cleanId}' AND ${noIdleSwapConditions.join(' AND ')}`;
        
        const noIdleSwapQuery = `
          WITH cleaned_data AS (
            SELECT
              CTIME,
              TBOXID,
              BATSOH,
              BATPERCENT,
              LAG(TBOXID) OVER (ORDER BY CTIME) as prev_tbox,
              LAG(BATSOH) OVER (ORDER BY CTIME) as prev_soh,
              LAG(BATPERCENT) OVER (ORDER BY CTIME) as prev_charge,
              LAG(CTIME) OVER (ORDER BY CTIME) as prev_time,
              ROW_NUMBER() OVER (ORDER BY CTIME) as row_num
            FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
            ${noIdleSwapWhere}
          ),
          swaps AS (
            SELECT
              CTIME as TIMESTAMP,
              prev_tbox as OLDTBOXID,
              TBOXID as NEWTBOXID,
              COALESCE(prev_soh, 0) as OLDSOH,
              COALESCE(BATSOH, 0) as NEWSOH,
              COALESCE((BATPERCENT - prev_charge), 0) as CHARGECHANGE,
              (CTIME - prev_time) as time_gap
            FROM cleaned_data
            WHERE TBOXID != prev_tbox
              AND prev_tbox IS NOT NULL
              AND TBOXID IS NOT NULL
              AND prev_tbox != ''
              AND TBOXID != ''
              AND (CTIME - prev_time) >= 30
              AND LENGTH(TBOXID) > 3
              AND LENGTH(prev_tbox) > 3
          )
          SELECT 
            TIMESTAMP,
            OLDTBOXID,
            NEWTBOXID,
            OLDSOH,
            NEWSOH,
            CHARGECHANGE
          FROM swaps
          ORDER BY TIMESTAMP DESC
          LIMIT 100
        `;
        
        swapResult = await fetchSnowflakeData(noIdleSwapQuery, "vehicleSwapNoIdle");
      }
      
      const consolidatedSwaps = consolidateRapidSwaps(swapResult || [], 10);
      setVehicleSwaps(consolidatedSwaps);
      
      // Step 5: Fetch vehicle sessions
      const sessionQuery = `
        SELECT
          TBOXID,
          MIN(CTIME) as STARTTIME,
          MAX(CTIME) as ENDTIME,
          ROUND((MAX(CTIME) - MIN(CTIME)) / 3600.0, 2) as DURATION,
          ROUND(AVG(BATSOH), 1) as AVGSOH,
          AVG(BATTEMP) as AVGTEMP,
          AVG(BATVOLT) as AVGVOLTAGE,
          ROUND(MAX(BATPERCENT), 1) as STARTCHARGE,
          ROUND(MIN(BATPERCENT), 1) as ENDCHARGE,
          ROUND(MAX(BATPERCENT) - MIN(BATPERCENT), 1) as CHARGECONSUMED,
          ROUND(MAX(TOTAL_DISTANCE_KM) - MIN(TOTAL_DISTANCE_KM), 2) as DISTANCECOVERED,
          ROUND(AVG(ABS(BATCURRENT)), 1) as AVGCURRENT,
          MAX(BATTEMP) as MAXTEMP,
          MIN(BATVOLT) as MINVOLTAGE,
          MAX(BATCYCLECOUNT) as CYCLECOUNT,
          SUM(CASE WHEN BATTERY_ERROR IS NOT NULL AND BATTERY_ERROR != '' THEN 1 ELSE 0 END) as ERROREVENTS
        FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
        ${whereClause}
        GROUP BY TBOXID
        HAVING (MAX(CTIME) - MIN(CTIME)) > 360 AND LENGTH(TBOXID) > 3
        ORDER BY STARTTIME DESC
        LIMIT 100
      `;
      
      const sessionResult = await fetchSnowflakeData(sessionQuery, "vehicleSessionAnalysis");
      const normalizedSessions = normalizeSessionUnits(sessionResult || []);
      setVehicleSessions(normalizedSessions);
      
      // Step 6: Fetch diagnostics
      const diagnosticQuery = `
        WITH vehicle_stats AS (
          SELECT
            COUNT(DISTINCT TBOXID) as TOTAL_VEHICLES,
            AVG(BATSOH) as AVG_SOH,
            AVG(BATTEMP) as AVG_TEMP,
            COUNT(*) as TOTAL_READINGS,
            SUM(CASE WHEN BATTERY_ERROR IS NOT NULL AND BATTERY_ERROR != '' OR BATTEMP > 650 THEN 1 ELSE 0 END) as CRITICAL_EVENTS,
            SUM(CASE WHEN BATVOLT < 440 OR BATVOLT > 540 THEN 1 ELSE 0 END) as VOLTAGE_ANOMALIES,
            MAX(TOTAL_DISTANCE_KM) - MIN(TOTAL_DISTANCE_KM) as DISTANCE_COVERED,
            MAX(BATPERCENT) - MIN(BATPERCENT) as CHARGE_CONSUMED,
            COUNT(DISTINCT DATE_TRUNC('day', TO_TIMESTAMP(CTIME))) as ACTIVE_DAYS
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          ${whereClause}
        )
        SELECT
          vs.TOTAL_VEHICLES,
          vs.AVG_SOH,
          vs.AVG_TEMP,
          vs.CRITICAL_EVENTS,
          vs.VOLTAGE_ANOMALIES,
          vs.TOTAL_READINGS,
          vs.DISTANCE_COVERED,
          vs.CHARGE_CONSUMED,
          vs.ACTIVE_DAYS,
          CASE WHEN vs.CHARGE_CONSUMED > 0 
               THEN ROUND(vs.DISTANCE_COVERED / vs.CHARGE_CONSUMED, 2)
               ELSE 0 END as BATTERY_EFFICIENCY
        FROM vehicle_stats vs
      `;
      
      let diagnosticResult = await fetchSnowflakeData(diagnosticQuery, "systemDiagnostics");
      const rawDiagnostics = diagnosticResult?.[0];
      
      if (rawDiagnostics) {
        const processedDiagnostics: DiagnosticMetrics = {
          totalVehicles: safeNumber(rawDiagnostics.TOTAL_VEHICLES),
          totalSwaps: consolidatedSwaps.length,
          avgSessionDuration: normalizedSessions.length > 0 ? 
            normalizedSessions.reduce((sum, s) => sum + safeNumber(s.DURATION), 0) / normalizedSessions.length : 0,
          preferredVehicles: [],
          problematicVehicles: [],
          swapFrequency: consolidatedSwaps.length / Math.max(1, safeNumber(rawDiagnostics.ACTIVE_DAYS, 1)),
          batteryEfficiency: safeNumber(rawDiagnostics.BATTERY_EFFICIENCY),
          thermalPerformance: (() => {
            const temp = safeNumber(rawDiagnostics.AVG_TEMP) / 10;
            return temp < 35 ? "Excellent" : 
                   temp < 45 ? "Good" : 
                   temp < 55 ? "Fair" : "Poor";
          })(),
          voltageStability: (() => {
            const anomalies = safeNumber(rawDiagnostics.VOLTAGE_ANOMALIES);
            const readings = safeNumber(rawDiagnostics.TOTAL_READINGS, 1);
            return (anomalies / readings) < 0.05 ? "Stable" : "Unstable";
          })(),
          overallHealth: (() => {
            const soh = safeNumber(rawDiagnostics.AVG_SOH);
            const criticalEvents = safeNumber(rawDiagnostics.CRITICAL_EVENTS);
            return soh > 90 && criticalEvents < 5 ? "Excellent" :
                   soh > 80 && criticalEvents < 15 ? "Good" :
                   soh > 70 ? "Fair" : "Poor";
          })(),
        };
        setDiagnostics(processedDiagnostics);
      }
      
      // Step 7: Set debug info
      setDebugInfo({
        telemetryCount: normalizedTelemetry.length,
        consolidatedSwapCount: consolidatedSwaps.length,
        sessionCount: normalizedSessions.length,
        timeRange: filters.timeRange,
        startTimestamp: filters.startTimestamp,
        endTimestamp: filters.endTimestamp,
        uniqueVehicles: [...new Set(normalizedTelemetry.map(d => d.TBOXID))].length,
        dataDateRange: normalizedTelemetry.length > 0 ? {
          from: new Date(normalizedTelemetry[0].CTIME * 1000).toISOString(),
          to: new Date(normalizedTelemetry[normalizedTelemetry.length - 1].CTIME * 1000).toISOString()
        } : null,
        sampleData: normalizedTelemetry[0]
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load battery data";
      setError(errorMessage);
      setBatteryData([]);
      setVehicleSwaps([]);
      setVehicleSessions([]);
      setBssChargingSessions([]);
      setDiagnostics(null);
    } finally {
      setLoading(false);
    }
  }, [fetchSnowflakeData, filters, bmsId, normalizeUnits, normalizeSessionUnits, buildFilterConditions]);

  useEffect(() => {
    if (bmsId) {
      loadData();
    } else {
      setLoading(false);
      setBatteryData([]);
      setVehicleSwaps([]);
      setVehicleSessions([]);
      setBssChargingSessions([]);
      setDiagnostics(null);
      setError(null);
      setDebugInfo(null);
    }
  }, [loadData, bmsId]);

  return {
    batteryData,
    vehicleSwaps,
    vehicleSessions,
    bssChargeData,
    bssChargingSessions,
    diagnostics,
    loading,
    error,
    debugInfo,
    refetch: loadData,
  };
}

export type {
  TboxData,
  VehicleSwapEvent,
  VehicleSession,
  BSSChargeData,
  BSSChargingSession,
  DiagnosticMetrics,
  BatteryFilters
};

export default useBatteryDataByBMS;