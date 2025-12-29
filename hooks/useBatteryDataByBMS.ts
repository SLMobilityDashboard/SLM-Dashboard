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
  const [diagnostics, setDiagnostics] = useState<DiagnosticMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const fetchSnowflakeData = useCallback(async (query: string, queryName?: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/testquery2FA`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: query,
          warehouse: process.env.SNOWFLAKE_WAREHOUSE || "AIDASHBOARD",
          database: process.env.SNOWFLAKE_DATABASE || "SOURCE_DATA",
          schema: process.env.SNOWFLAKE_SCHEMA || "VEHICLE_DATA",
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Snowflake API Error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log(`${queryName || 'Query'} result:`, result);
      
      return result.data || result.rows || result || [];
    } catch (error) {
      console.error(`${queryName || 'Query'} failed:`, error);
      throw error;
    }
  }, []);

  // Unit normalization function - converts raw sensor values to proper units
  const normalizeUnits = useCallback((data: any[]): TboxData[] => {
    return data.map(row => ({
      ...row,
      BATTEMP: safeNumber(row.BATTEMP) / 10,        // Convert to actual °C
      BATVOLT: safeNumber(row.BATVOLT) / 10,        // Convert to actual V
      BATCELLDIFFMAX: safeNumber(row.BATCELLDIFFMAX) / 10,  // Convert to actual mV
      BATCURRENT: safeNumber(row.BATCURRENT),       // Already in correct unit (A)
      BATSOH: safeNumber(row.BATSOH),               // Already in correct unit (%)
      BATPERCENT: safeNumber(row.BATPERCENT),       // Already in correct unit (%)
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

  // Normalize session data units
  const normalizeSessionUnits = useCallback((sessions: any[]): VehicleSession[] => {
    return sessions.map(session => ({
      ...session,
      AVGTEMP: safeNumber(session.AVGTEMP) / 10,      // Convert to actual °C
      AVGVOLTAGE: safeNumber(session.AVGVOLTAGE) / 10, // Convert to actual V
      MAXTEMP: safeNumber(session.MAXTEMP) / 10,       // Convert to actual °C
      MINVOLTAGE: safeNumber(session.MINVOLTAGE) / 10, // Convert to actual V
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
      conditions.push(`CTIME >= EXTRACT(EPOCH FROM CURRENT_TIMESTAMP - INTERVAL '${filters.timeRange} HOURS')`);
    }

    if (filters.minBatteryTemp) {
      conditions.push(`BATTEMP >= ${filters.minBatteryTemp * 10}`); // Convert to raw units for query
    }

    if (filters.maxBatteryTemp) {
      conditions.push(`BATTEMP <= ${filters.maxBatteryTemp * 10}`); // Convert to raw units for query
    }

    if (filters.minSOH) {
      conditions.push(`BATSOH >= ${filters.minSOH}`);
    }

    if (!filters.includeIdleData) {
      conditions.push(`NOT (MOTORRPM <= 20 AND THROTTLEPERCENT <= 50 AND ABS(BATCURRENT) <= 20)`);
    }

    return conditions;
  }, [filters]);

  const queries = useMemo(() => {
    const filterConditions = buildFilterConditions();
    
    const cleanedBmsId = bmsId
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
      .trim()
      .toUpperCase();
    
    // Debug query to check what BMSID values exist - try both table names
    const debugQuery = `
      SELECT DISTINCT 
        BMSID,
        TBOXID,
        COUNT(*) as record_count
      FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
      WHERE ${filterConditions.join(' AND ')}
      GROUP BY BMSID, TBOXID
      ORDER BY record_count DESC
      LIMIT 20
    `;
    
    console.log('Debug - Looking for BMSID:', cleanedBmsId);
    console.log('Debug - Filter conditions:', filterConditions);
    
    // Updated WHERE clause with better special character handling
    const whereClause = `WHERE UPPER(TRIM(REGEXP_REPLACE(
      COALESCE(BMSID, ''), 
      '[\\x00-\\x1F\\x7F-\\x9F]', '', 1, 0, 'c'
    ))) = '${cleanedBmsId}' AND ${filterConditions.join(' AND ')}`;

    return {
      // Debug query to see what BMSID values exist
      debugBmsIds: debugQuery,
      
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

      vehicleSwapDetection: `
        WITH cleaned_data AS (
          SELECT
            CTIME,
            TBOXID as current_tbox,
            BATSOH,
            BATPERCENT,
            ROW_NUMBER() OVER (ORDER BY CTIME) as row_num
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          ${whereClause}
        ),
        vehicle_changes AS (
          SELECT
            CTIME,
            current_tbox,
            LAG(current_tbox, 1) OVER (ORDER BY CTIME) as previous_tbox,
            BATSOH,
            LAG(BATSOH, 1) OVER (ORDER BY CTIME) as previous_soh,
            BATPERCENT,
            LAG(BATPERCENT, 1) OVER (ORDER BY CTIME) as previous_charge,
            LAG(CTIME, 1) OVER (ORDER BY CTIME) as previous_time
          FROM cleaned_data
        ),
        potential_swaps AS (
          SELECT
            CTIME as TIMESTAMP,
            previous_tbox as OLDTBOXID,
            current_tbox as NEWTBOXID,
            COALESCE(previous_soh, 0) as OLDSOH,
            COALESCE(BATSOH, 0) as NEWSOH,
            COALESCE((BATPERCENT - previous_charge), 0) as CHARGECHANGE,
            (CTIME - previous_time) as time_gap
          FROM vehicle_changes
          WHERE current_tbox != previous_tbox
            AND current_tbox IS NOT NULL
            AND previous_tbox IS NOT NULL
            AND previous_tbox != ''
            AND current_tbox != ''
            AND (CTIME - previous_time) >= 30
            AND LENGTH(current_tbox) > 3
            AND LENGTH(previous_tbox) > 3
        )
        SELECT 
          TIMESTAMP,
          OLDTBOXID,
          NEWTBOXID,
          OLDSOH,
          NEWSOH,
          CHARGECHANGE
        FROM potential_swaps
        ORDER BY TIMESTAMP DESC
        LIMIT 100
      `,

      vehicleSessionAnalysis: `
        WITH cleaned_base_data AS (
            SELECT 
              CTIME,
              BATSOH,
              BATTEMP,
              BATVOLT,
              BATPERCENT,
              BATCURRENT,
              BATCYCLECOUNT,
              TOTAL_DISTANCE_KM,
              BATTERY_ERROR,
              TBOXID as tbox_id
            FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
            ${whereClause}
        ),
        tbox_changes AS (
            SELECT *,
            LAG(tbox_id, 1, 'DIFFERENT') OVER (ORDER BY CTIME) as prev_tbox_id
            FROM cleaned_base_data
        ),
        session_groups AS (
            SELECT *,
            SUM(CASE WHEN tbox_id != prev_tbox_id THEN 1 ELSE 0 END) 
                OVER (ORDER BY CTIME) as session_group
            FROM tbox_changes
        ),
        vehicle_sessions AS (
            SELECT
            tbox_id,
            MIN(CTIME) as session_start,
            MAX(CTIME) as session_end,
            AVG(BATSOH) as avg_soh,
            AVG(BATTEMP) as avg_temp,
            AVG(BATVOLT) as avg_voltage,
            MIN(BATPERCENT) as min_charge,
            MAX(BATPERCENT) as max_charge,
            AVG(ABS(BATCURRENT)) as avg_current,
            MAX(BATTEMP) as max_temp,
            MIN(BATVOLT) as min_voltage,
            MAX(BATCYCLECOUNT) as cycle_count,
            MIN(TOTAL_DISTANCE_KM) as start_distance,
            MAX(TOTAL_DISTANCE_KM) as end_distance,
            SUM(CASE WHEN BATTERY_ERROR IS NOT NULL AND BATTERY_ERROR != '' 
                THEN 1 ELSE 0 END) as error_events
            FROM session_groups
            GROUP BY tbox_id, session_group
        )
        SELECT
            tbox_id as TBOXID,
            session_start as STARTTIME,
            session_end as ENDTIME,
            ROUND((session_end - session_start) / 3600.0, 2) as DURATION,
            ROUND(avg_soh, 1) as AVGSOH,
            avg_temp as AVGTEMP,
            avg_voltage as AVGVOLTAGE,
            ROUND(max_charge, 1) as STARTCHARGE,
            ROUND(min_charge, 1) as ENDCHARGE,
            ROUND(max_charge - min_charge, 1) as CHARGECONSUMED,
            ROUND(COALESCE(end_distance - start_distance, 0), 2) as DISTANCECOVERED,
            ROUND(avg_current, 1) as AVGCURRENT,
            max_temp as MAXTEMP,
            min_voltage as MINVOLTAGE,
            cycle_count as CYCLECOUNT,
            error_events as ERROREVENTS
        FROM vehicle_sessions
        WHERE (session_end - session_start) > 360
          AND tbox_id != ''
          AND LENGTH(tbox_id) > 3
        ORDER BY session_start DESC
        LIMIT 100
        `,

      systemDiagnostics: `
        WITH cleaned_vehicle_stats AS (
          SELECT
            COUNT(DISTINCT TBOXID) as total_vehicles,
            AVG(BATSOH) as avg_soh,
            AVG(BATTEMP) as avg_temp,
            COUNT(*) as total_readings,
            SUM(CASE WHEN BATTERY_ERROR IS NOT NULL AND BATTERY_ERROR != '' 
                     OR BATTEMP > 650
                THEN 1 ELSE 0 END) as critical_events,
            SUM(CASE WHEN BATVOLT < 440 OR BATVOLT > 540 THEN 1 ELSE 0 END) as voltage_anomalies,
            MAX(TOTAL_DISTANCE_KM) - MIN(TOTAL_DISTANCE_KM) as distance_covered,
            (MAX(BATPERCENT) - MIN(BATPERCENT)) as charge_consumed,
            COUNT(DISTINCT DATE_TRUNC('day', TO_TIMESTAMP(CTIME))) as active_days
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          ${whereClause}
        ),
        cleaned_vehicle_performance AS (
          SELECT
            TBOXID as tbox_id,
            AVG(BATSOH) as avg_soh,
            AVG(BATTEMP) as avg_temp,
            SUM(CASE WHEN BATTERY_ERROR IS NOT NULL AND BATTERY_ERROR != '' THEN 1 ELSE 0 END) as error_count,
            COUNT(*) as readings_count
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          ${whereClause}
          GROUP BY TBOXID
          HAVING COUNT(*) > 10 AND LENGTH(tbox_id) > 3
        )
        SELECT
          vs.total_vehicles as TOTAL_VEHICLES,
          vs.avg_soh as AVG_SOH,
          vs.avg_temp as AVG_TEMP,
          vs.critical_events as CRITICAL_EVENTS,
          vs.voltage_anomalies as VOLTAGE_ANOMALIES,
          vs.total_readings as TOTAL_READINGS,
          vs.distance_covered as DISTANCE_COVERED,
          vs.charge_consumed as CHARGE_CONSUMED,
          vs.active_days as ACTIVE_DAYS,
          CASE WHEN vs.charge_consumed > 0 
               THEN ROUND(vs.distance_covered / vs.charge_consumed, 2)
               ELSE 0 END as BATTERY_EFFICIENCY,
          LISTAGG(
            CASE WHEN vp.avg_soh >= 90 AND (vp.error_count * 100.0 / vp.readings_count) < 5 
                 THEN vp.tbox_id END, ','
          ) WITHIN GROUP (ORDER BY vp.avg_soh DESC) as PREFERRED_VEHICLES,
          LISTAGG(
            CASE WHEN vp.avg_soh < 85 OR (vp.error_count * 100.0 / vp.readings_count) > 10 OR vp.avg_temp > 450
                 THEN vp.tbox_id END, ','
          ) WITHIN GROUP (ORDER BY vp.avg_soh ASC) as PROBLEMATIC_VEHICLES
        FROM cleaned_vehicle_stats vs
        CROSS JOIN cleaned_vehicle_performance vp
        GROUP BY vs.total_vehicles, vs.avg_soh, vs.avg_temp, vs.critical_events, 
                 vs.voltage_anomalies, vs.total_readings, vs.distance_covered, 
                 vs.charge_consumed, vs.active_days
      `
    };
  }, [bmsId, buildFilterConditions]);

  const loadData = useCallback(async () => {
    if (!bmsId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      // First, run debug query to see what BMSID values exist
      console.log('Running debug query to check available BMSID values...');
      try {
        const debugResult = await fetchSnowflakeData(queries.debugBmsIds, "debugBmsIds");
        console.log('Available BMSID values in database:', debugResult);
        
        setDebugInfo({
          availableBmsIds: debugResult,
          searchingFor: bmsId,
        });
      } catch (debugError) {
        console.warn('Debug query failed, continuing with main query:', debugError);
      }
      
      // Fetch and normalize telemetry data
      let telemetryResult;
      try {
        telemetryResult = await fetchSnowflakeData(queries.batteryTelemetry, "batteryTelemetry");
      } catch (telemetryError: any) {
        // If the main query fails, try a simpler query without BMSID filtering
        console.warn('Main telemetry query failed, trying simplified query:', telemetryError);
        
        const simplifiedQuery = `
          SELECT
            BATTEMP, BATVOLT, BATCELLDIFFMAX, BATCYCLECOUNT, BATSOH, BATPERCENT,
            BATCURRENT, COALESCE(BATTERY_ERROR, '') as BATTERY_ERROR, CTIME,
            MOTORRPM, TBOXID, COALESCE(TOTAL_DISTANCE_KM, 0) as TOTAL_DISTANCE_KM,
            COALESCE(STATE, 'UNKNOWN') as STATE, THROTTLEPERCENT
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          WHERE ${buildFilterConditions().join(' AND ')}
          ORDER BY CTIME ASC
          LIMIT 1000
        `;
        
        telemetryResult = await fetchSnowflakeData(simplifiedQuery, "simplifiedTelemetry");
        
        if (telemetryResult && telemetryResult.length > 0) {
          setError(`Note: BMSID filtering not available. Showing all battery data for the selected time range. Available TBoxes: ${[...new Set(telemetryResult.map((r: any) => r.TBOXID))].join(', ')}`);
        }
      }
      
      const normalizedTelemetry = normalizeUnits(telemetryResult || []);
      setBatteryData(normalizedTelemetry);
      
      // Fetch and process vehicle swaps
      const swapResult = await fetchSnowflakeData(queries.vehicleSwapDetection, "vehicleSwapDetection");
      const rawSwaps = swapResult || [];
      const consolidatedSwaps = consolidateRapidSwaps(rawSwaps, 10);
      setVehicleSwaps(consolidatedSwaps);
      
      // Fetch and normalize vehicle sessions
      const sessionResult = await fetchSnowflakeData(queries.vehicleSessionAnalysis, "vehicleSessionAnalysis");
      const normalizedSessions = normalizeSessionUnits(sessionResult || []);
      setVehicleSessions(normalizedSessions);
      
      // Fetch system diagnostics
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
            const temp = safeNumber(rawDiagnostics.AVG_TEMP) / 10; // Convert to actual temp
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
          })()
        };
        setDiagnostics(processedDiagnostics);
      }
      
      setDebugInfo({
        telemetryCount: normalizedTelemetry.length,
        rawSwapCount: rawSwaps.length,
        consolidatedSwapCount: consolidatedSwaps.length,
        sessionCount: normalizedSessions.length,
        diagnosticsFound: !!rawDiagnostics,
        timeRange: filters.timeRange,
        startTimestamp: filters.startTimestamp,
        endTimestamp: filters.endTimestamp,
        uniqueVehicles: [...new Set(normalizedTelemetry.map(d => d.TBOXID))].length,
        swapsConsolidated: rawSwaps.length - consolidatedSwaps.length,
        dataDateRange: filters.startTimestamp && filters.endTimestamp ? {
          from: new Date(filters.startTimestamp * 1000).toISOString(),
          to: new Date(filters.endTimestamp * 1000).toISOString()
        } : null,
        sampleData: normalizedTelemetry[0] // For debugging unit conversion
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load battery data";
      console.error("Battery data loading error:", error);
      setError(errorMessage);
      setBatteryData([]);
      setVehicleSwaps([]);
      setVehicleSessions([]);
      setDiagnostics(null);
    } finally {
      setLoading(false);
    }
  }, [queries, fetchSnowflakeData, filters, bmsId, normalizeUnits, normalizeSessionUnits]);

  useEffect(() => {
    if (bmsId) {
      loadData();
    } else {
      setLoading(false);
      setBatteryData([]);
      setVehicleSwaps([]);
      setVehicleSessions([]);
      setDiagnostics(null);
      setError(null);
      setDebugInfo(null);
    }
  }, [loadData, bmsId]);

  return {
    batteryData,
    vehicleSwaps,
    vehicleSessions,
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
  DiagnosticMetrics,
  BatteryFilters
};

export default useBatteryDataByBMS;