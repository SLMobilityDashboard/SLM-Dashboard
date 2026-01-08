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
    CURRENT_VALUE: number;  // Changed from CURRENT
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
  filters: BatteryFilters = { timeRange: 50 }
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
      
      const response = await fetch("/api/testquery", {
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
      // Calculate timestamp in JavaScript to avoid Snowflake EXTRACT(EPOCH) syntax issues
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

    if (!filters.includeIdleData) {
      conditions.push(`NOT (MOTORRPM <= 20 AND THROTTLEPERCENT <= 50 AND ABS(BATCURRENT) <= 20)`);
    }

    return conditions;
  }, [filters]);

  const buildBSSFilterConditions = useCallback(() => {
    const conditions: string[] = [];

    if (filters.startTimestamp && filters.endTimestamp) {
      conditions.push(`CT >= ${filters.startTimestamp}`);
      conditions.push(`CT <= ${filters.endTimestamp}`);
    } else if (filters.timeRange) {
      // Calculate timestamp in JavaScript to avoid Snowflake EXTRACT(EPOCH) syntax issues
      const hoursAgo = Math.floor(Date.now() / 1000) - (filters.timeRange * 3600);
      conditions.push(`CT >= ${hoursAgo}`);
    }

    return conditions;
  }, [filters]);

  const queries = useMemo(() => {
    const filterConditions = buildFilterConditions();
    const bssFilterConditions = buildBSSFilterConditions();
    
    const cleanedBmsId = bmsId
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
      .trim()
      .toUpperCase();
    
    const whereClause = `WHERE UPPER(TRIM(REGEXP_REPLACE(
      COALESCE(BMSID, ''), 
      '[\\x00-\\x1F\\x7F-\\x9F]', '', 1, 0, 'c'
    ))) = '${cleanedBmsId}' AND ${filterConditions.join(' AND ')}`;

    const bssWhereClause = `WHERE UPPER(TRIM(REGEXP_REPLACE(
      COALESCE(BID, ''), 
      '[\\x00-\\x1F\\x7F-\\x9F]', '', 1, 0, 'c'
    ))) = '${cleanedBmsId}' AND ${bssFilterConditions.join(' AND ')}`;

    return {
      debugBmsIds: `
        SELECT DISTINCT 
          BMSID,
          TBOXID,
          COUNT(*) as RECORD_COUNT,
          MIN(CTIME) as FIRST_SEEN,
          MAX(CTIME) as LAST_SEEN
        FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
        WHERE ${filterConditions.join(' AND ')}
        GROUP BY BMSID, TBOXID
        ORDER BY RECORD_COUNT DESC
        LIMIT 50
      `,
      
      batteryTelemetry: `
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
      `,

      bssChargeData: `
        SELECT 
          DEVICE_ID,
          _CABINET_NO as CABINET_NO,
          NO as SLOT_NO,
          CT as CTIME,
          COALESCE(KWH, BATTERY) as CHARGE_LEVEL,
          CELL_TEMP as TEMP,
          V as VOLTAGE,
          I as CURRENT_VALUE,  -- Changed from CURRENT to CURRENT_VALUE
          S as CHARGER_STATUS
        FROM SOURCE_DATA.BSS_DATA.BSS_CABINET_STATUS
        ${bssWhereClause}
          AND IS_BATTERY = '1'
          AND (KWH IS NOT NULL OR BATTERY IS NOT NULL)
        ORDER BY CT ASC
      `,

      bssChargingSessions: `
        WITH charging_sessions AS (
          SELECT 
            DEVICE_ID,
            BID,
            _CABINET_NO as CABINET_NO,
            NO as SLOT_NO,
            CT,
            COALESCE(KWH, BATTERY) as CHARGE_LEVEL,
            CELL_TEMP as TEMP,
            V as VOLTAGE,
            I as CURRENT_VALUE,  -- Changed from CURRENT to CURRENT_VALUE
            S as CHARGER_STATUS,
            LAG(CT) OVER (PARTITION BY DEVICE_ID, _CABINET_NO, NO ORDER BY CT) as PREV_CT,
            LAG(COALESCE(KWH, BATTERY)) OVER (PARTITION BY DEVICE_ID, _CABINET_NO, NO ORDER BY CT) as PREV_CHARGE,
            LAG(S) OVER (PARTITION BY DEVICE_ID, _CABINET_NO, NO ORDER BY CT) as PREV_STATUS
          FROM SOURCE_DATA.BSS_DATA.BSS_CABINET_STATUS
          ${bssWhereClause}
            AND IS_BATTERY = '1'
            AND (KWH IS NOT NULL OR BATTERY IS NOT NULL)
        ),
        session_boundaries AS (
          SELECT
            *,
            CASE 
              WHEN PREV_CT IS NULL OR (CT - PREV_CT) > 3600 THEN 1
              WHEN (CHARGER_STATUS IN ('charging', 'charged')) AND 
                  (PREV_STATUS NOT IN ('charging', 'charged') OR PREV_STATUS IS NULL) THEN 1
              WHEN CHARGE_LEVEL > PREV_CHARGE + 5 THEN 1
              ELSE 0
            END as IS_SESSION_START
          FROM charging_sessions
        ),
        sessions_with_id AS (
          SELECT
            *,
            SUM(IS_SESSION_START) OVER (PARTITION BY DEVICE_ID, CABINET_NO, SLOT_NO ORDER BY CT) as SESSION_ID
          FROM session_boundaries
        )
        SELECT
          DEVICE_ID,
          CABINET_NO,
          SLOT_NO,
          MIN(CT) as STARTTIME,
          MAX(CT) as ENDTIME,
          ROUND((MAX(CT) - MIN(CT)) / 3600.0, 2) as DURATION,
          MIN(CHARGE_LEVEL) as STARTCHARGE,
          MAX(CHARGE_LEVEL) as ENDCHARGE,
          (MAX(CHARGE_LEVEL) - MIN(CHARGE_LEVEL)) as CHARGE_GAINED,
          ROUND(AVG(NULLIF(TEMP, 0)), 1) as AVGTEMP,
          ROUND(AVG(NULLIF(VOLTAGE, 0)), 1) as AVGVOLTAGE,
          ROUND(AVG(ABS(NULLIF(CURRENT_VALUE, 0))), 1) as AVGCURRENT,  -- Updated here too
          ROUND(MAX(NULLIF(TEMP, 0)), 1) as MAXTEMP,
          MAX(CHARGER_STATUS) as CHARGER_STATUS,
          MAX(BID) as BID
        FROM sessions_with_id
        GROUP BY DEVICE_ID, CABINET_NO, SLOT_NO, SESSION_ID
        HAVING (MAX(CT) - MIN(CT)) >= 300
          AND (MAX(CHARGE_LEVEL) - MIN(CHARGE_LEVEL)) > 1
        ORDER BY STARTTIME DESC
        LIMIT 100
      `,
            
      bssDebugQuery: `
        SELECT 
          COUNT(*) as TOTAL_BSS_RECORDS,
          COUNT(DISTINCT BID) as UNIQUE_BIDS,
          COUNT(DISTINCT DEVICE_ID) as UNIQUE_DEVICES,
          COUNT(CASE WHEN IS_BATTERY = 'Y' THEN 1 END) as BATTERY_PRESENT_RECORDS,
          COUNT(CASE WHEN KWH IS NOT NULL THEN 1 END) as KWH_NOT_NULL,
          COUNT(CASE WHEN BATTERY IS NOT NULL THEN 1 END) as BATTERY_NOT_NULL,
          MIN(CT) as EARLIEST_TIME,
          MAX(CT) as LATEST_TIME
        FROM SOURCE_DATA.BSS_DATA.BSS_CABINET_STATUS
        WHERE ${bssFilterConditions.join(' AND ')}
      `,
      
      bssSampleBIDs: `
        SELECT DISTINCT 
          BID,
          DEVICE_ID,
          COUNT(*) as RECORD_COUNT,
          MIN(CT) as FIRST_SEEN,
          MAX(CT) as LAST_SEEN
        FROM SOURCE_DATA.BSS_DATA.BSS_CABINET_STATUS
        WHERE ${bssFilterConditions.join(' AND ')}
          AND BID IS NOT NULL
          AND IS_BATTERY = 'Y'
        GROUP BY BID, DEVICE_ID
        ORDER BY RECORD_COUNT DESC
        LIMIT 20
      `,

      vehicleSwapDetection: `
        SELECT 
          CTIME as TIMESTAMP,
          LAG(TBOXID) OVER (ORDER BY CTIME) as OLDTBOXID,
          TBOXID as NEWTBOXID,
          LAG(BATSOH) OVER (ORDER BY CTIME) as OLDSOH,
          BATSOH as NEWSOH,
          (BATPERCENT - LAG(BATPERCENT) OVER (ORDER BY CTIME)) as CHARGECHANGE
        FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
        ${whereClause}
        QUALIFY TBOXID != LAG(TBOXID) OVER (ORDER BY CTIME)
          AND LAG(TBOXID) OVER (ORDER BY CTIME) IS NOT NULL
          AND TBOXID IS NOT NULL
          AND LENGTH(TBOXID) > 3
          AND LENGTH(LAG(TBOXID) OVER (ORDER BY CTIME)) > 3
          AND (CTIME - LAG(CTIME) OVER (ORDER BY CTIME)) >= 30
        ORDER BY CTIME DESC
        LIMIT 100
      `,

      vehicleSessionAnalysis: `
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
      `,

      systemDiagnostics: `
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
        ),
        vehicle_performance AS (
          SELECT
            TBOXID,
            AVG(BATSOH) as AVG_SOH,
            AVG(BATTEMP) as AVG_TEMP,
            SUM(CASE WHEN BATTERY_ERROR IS NOT NULL AND BATTERY_ERROR != '' THEN 1 ELSE 0 END) as ERROR_COUNT,
            COUNT(*) as READINGS_COUNT
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          ${whereClause}
          GROUP BY TBOXID
          HAVING COUNT(*) > 10 AND LENGTH(TBOXID) > 3
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
               ELSE 0 END as BATTERY_EFFICIENCY,
          LISTAGG(
            CASE WHEN vp.AVG_SOH >= 90 AND (vp.ERROR_COUNT * 100.0 / vp.READINGS_COUNT) < 5 
                 THEN vp.TBOXID END, ','
          ) WITHIN GROUP (ORDER BY vp.AVG_SOH DESC) as PREFERRED_VEHICLES,
          LISTAGG(
            CASE WHEN vp.AVG_SOH < 85 OR (vp.ERROR_COUNT * 100.0 / vp.READINGS_COUNT) > 10 OR vp.AVG_TEMP > 450
                 THEN vp.TBOXID END, ','
          ) WITHIN GROUP (ORDER BY vp.AVG_SOH ASC) as PROBLEMATIC_VEHICLES
        FROM vehicle_stats vs
        CROSS JOIN vehicle_performance vp
        GROUP BY vs.TOTAL_VEHICLES, vs.AVG_SOH, vs.AVG_TEMP, vs.CRITICAL_EVENTS, 
                 vs.VOLTAGE_ANOMALIES, vs.TOTAL_READINGS, vs.DISTANCE_COVERED, 
                 vs.CHARGE_CONSUMED, vs.ACTIVE_DAYS
      `
    };
  }, [bmsId, buildFilterConditions, buildBSSFilterConditions]);
  
  const loadData = useCallback(async () => {
    if (!bmsId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      let tableStats;
      try {
        const tableCheckQuery = `
          SELECT COUNT(*) as TOTAL_RECORDS,
                 COUNT(DISTINCT BMSID) as UNIQUE_BMS,
                 COUNT(DISTINCT TBOXID) as UNIQUE_TBOX,
                 MIN(CTIME) as EARLIEST_TIME,
                 MAX(CTIME) as LATEST_TIME
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
        `;
        tableStats = await fetchSnowflakeData(tableCheckQuery, "tableCheck");
      } catch (tableError) {
        console.error('Table check failed:', tableError);
      }
      
      
      try {
        const debugResult = await fetchSnowflakeData(queries.debugBmsIds, "debugBmsIds");
        
        setDebugInfo(prev => ({
          ...prev,
          tableStats: tableStats?.[0],
          availableBmsIds: debugResult,
          searchingFor: bmsId,
        }));
        
        if (debugResult.length === 0) {
          throw new Error(`No data found in time range. Table has ${tableStats?.[0]?.TOTAL_RECORDS || 0} total records, but none match the current filters.`);
        }
      } catch (debugError) {
        setError(`Debug check failed: ${debugError instanceof Error ? debugError.message : String(debugError)}`);
      }
      
      let telemetryResult;
      try {
        telemetryResult = await fetchSnowflakeData(queries.batteryTelemetry, "batteryTelemetry");
        
        if (!telemetryResult || telemetryResult.length === 0) {
    
          
          const simplifiedQuery = `
            SELECT
              BATTEMP, BATVOLT, BATCELLDIFFMAX, BATCYCLECOUNT, BATSOH, BATPERCENT,
              BATCURRENT, COALESCE(BATTERY_ERROR, '') as BATTERY_ERROR, CTIME,
              MOTORRPM, TBOXID, BMSID,
              COALESCE(TOTAL_DISTANCE_KM, 0) as TOTAL_DISTANCE_KM,
              COALESCE(STATE, 'UNKNOWN') as STATE, THROTTLEPERCENT
            FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
            WHERE ${buildFilterConditions().join(' AND ')}
            ORDER BY CTIME DESC
            LIMIT 100
          `;
          
          telemetryResult = await fetchSnowflakeData(simplifiedQuery, "simplifiedTelemetry");
          
          if (telemetryResult && telemetryResult.length > 0) {
            const availableBmsIds = [...new Set(telemetryResult.map((r: any) => r.BMSID).filter(Boolean))];
            const availableTboxIds = [...new Set(telemetryResult.map((r: any) => r.TBOXID))];
            
            setError(`BMSID "${bmsId}" not found. Available BMSID values: ${availableBmsIds.join(', ') || 'None found'}. Available TBoxes: ${availableTboxIds.join(', ')}`);
          } else {
            throw new Error('No data found even without BMSID filter. Check time range and filter conditions.');
          }
        }
      } catch (telemetryError: any) {
        throw new Error(`Failed to fetch telemetry data: ${telemetryError.message}`);
      }
      
      const normalizedTelemetry = normalizeUnits(telemetryResult || []);
      setBatteryData(normalizedTelemetry);
      
      // Fetch BSS charge data
      let bssData: BSSChargeData[] = [];
      try {
        console.log('Fetching BSS charge data...', queries.bssChargeData);
        const bssResult = await fetchSnowflakeData(queries.bssChargeData, "bssChargeData");
        bssData = (bssResult || []).map((entry: any) => ({
          DEVICE_ID: entry.DEVICE_ID,
          CABINET_NO: safeNumber(entry.CABINET_NO),
          SLOT_NO: safeNumber(entry.SLOT_NO),
          CTIME: safeNumber(entry.CTIME),
          CHARGE_LEVEL: safeNumber(entry.CHARGE_LEVEL),
          TEMP: safeNumber(entry.TEMP),
          VOLTAGE: safeNumber(entry.VOLTAGE),
          CURRENT_VALUE: safeNumber(entry.CURRENT_VALUE),
          CHARGER_STATUS: entry.CHARGER_STATUS || 'unknown',
        }));
        setBssChargeData(bssData);
      } catch (bssError) {
        console.warn('BSS charge data query failed, continuing without BSS data:', bssError);
        setBssChargeData([]);
      } 
      
      // Fetch BSS charging sessions
      let chargingSessions: BSSChargingSession[] = [];
      try {
        console.log('Fetching BSS charging sessions...', queries.bssChargingSessions);
        const bssResult = await fetchSnowflakeData(queries.bssChargingSessions, "bssChargingSessions");
        chargingSessions = (bssResult || []).map((session: any) => ({
          DEVICE_ID: session.DEVICE_ID,
          CABINET_NO: safeNumber(session.CABINET_NO),
          SLOT_NO: safeNumber(session.SLOT_NO),
          STARTTIME: safeNumber(session.STARTTIME),
          ENDTIME: safeNumber(session.ENDTIME),
          DURATION: safeNumber(session.DURATION),
          STARTCHARGE: safeNumber(session.STARTCHARGE),
          ENDCHARGE: safeNumber(session.ENDCHARGE),
          CHARGE_GAINED: safeNumber(session.CHARGE_GAINED),
          AVGTEMP: safeNumber(session.AVGTEMP),
          AVGVOLTAGE: safeNumber(session.AVGVOLTAGE),
          AVGCURRENT: safeNumber(session.AVGCURRENT),
          MAXTEMP: safeNumber(session.MAXTEMP),
          CHARGER_STATUS: session.CHARGER_STATUS || 'unknown',
        }));

        
        setBssChargingSessions(chargingSessions);
      } catch (bssError) {
        console.warn('BSS charging session query failed, continuing without BSS data:', bssError);
        setBssChargingSessions([]);
      }
      
      let consolidatedSwaps: VehicleSwapEvent[] = [];
      try {
        const swapResult = await fetchSnowflakeData(queries.vehicleSwapDetection, "vehicleSwapDetection");
        const rawSwaps = swapResult || [];
        consolidatedSwaps = consolidateRapidSwaps(rawSwaps, 10);
        setVehicleSwaps(consolidatedSwaps);
      } catch (swapError) {
        setVehicleSwaps([]);
      }
      
      let normalizedSessions: VehicleSession[] = [];
      try {
        const sessionResult = await fetchSnowflakeData(queries.vehicleSessionAnalysis, "vehicleSessionAnalysis");
        normalizedSessions = normalizeSessionUnits(sessionResult || []);
        setVehicleSessions(normalizedSessions);
      } catch (sessionError) {
        setVehicleSessions([]);
      }
      
      try {
        const diagnosticResult = await fetchSnowflakeData(queries.systemDiagnostics, "systemDiagnostics");
        const rawDiagnostics = diagnosticResult?.[0];
        
        if (rawDiagnostics) {
          const processedDiagnostics: DiagnosticMetrics = {
            totalVehicles: safeNumber(rawDiagnostics.TOTAL_VEHICLES),
            totalSwaps: consolidatedSwaps.length,
            avgSessionDuration: normalizedSessions.length > 0 ? 
              normalizedSessions.reduce((sum, s) => sum + safeNumber(s.DURATION), 0) / normalizedSessions.length : 0,
            preferredVehicles: rawDiagnostics.PREFERRED_VEHICLES ? 
              rawDiagnostics.PREFERRED_VEHICLES.split(',').filter(Boolean) : [],
            problematicVehicles: rawDiagnostics.PROBLEMATIC_VEHICLES ? 
              rawDiagnostics.PROBLEMATIC_VEHICLES.split(',').filter(Boolean) : [],
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
            totalChargingSessions: chargingSessions.length,
            avgChargingDuration: chargingSessions.length > 0 ?
              chargingSessions.reduce((sum, s) => sum + s.DURATION, 0) / chargingSessions.length : 0,
            totalChargeGained: chargingSessions.reduce((sum, s) => sum + s.CHARGE_GAINED, 0),
          };
          setDiagnostics(processedDiagnostics);
        }
      } catch (diagnosticError) {
        setDiagnostics(null);
      }
      
      setDebugInfo({
        telemetryCount: normalizedTelemetry.length,
        consolidatedSwapCount: consolidatedSwaps.length,
        sessionCount: normalizedSessions.length,
        chargingSessionCount: chargingSessions.length,
        timeRange: filters.timeRange,
        startTimestamp: filters.startTimestamp,
        endTimestamp: filters.endTimestamp,
        uniqueVehicles: [...new Set(normalizedTelemetry.map(d => d.TBOXID))].length,
        dataDateRange: filters.startTimestamp && filters.endTimestamp ? {
          from: new Date(filters.startTimestamp * 1000).toISOString(),
          to: new Date(filters.endTimestamp * 1000).toISOString()
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
  }, [queries, fetchSnowflakeData, filters, bmsId, normalizeUnits, normalizeSessionUnits, buildFilterConditions]);

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