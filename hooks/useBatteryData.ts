import { useState, useEffect, useMemo, useCallback } from "react";

// Core interfaces for battery diagnostics
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
  BMS_ID: string;
  TOTAL_DISTANCE_KM: number;
  STATE: string;
  THROTTLEPERCENT: number;
}

interface BatterySwapEvent {
  TIMESTAMP: number;
  OLDBMSID: string;
  NEWBMSID: string;
  OLDSOH: number;
  NEWSOH: number;
  CHARGECHANGE: number;
}

interface BatterySession {
  BMSID: string;
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
  totalBatteries: number;
  totalSwaps: number;
  avgSessionDuration: number;
  preferredBatteries: string[];
  problematicBatteries: string[];
  swapFrequency: number;
  batteryEfficiency: number;
  thermalPerformance: string;
  voltageStability: string;
  overallHealth: string;
}

interface BatteryFilters {
  timeRange: number; // hours
  includeIdleData?: boolean;
  minBatteryTemp?: number;
  maxBatteryTemp?: number;
  minSOH?: number;
}

// Utility function to clean BMS IDs
function cleanBmsId(bmsId: string): string {
  if (!bmsId || typeof bmsId !== 'string') return '';
  
  return bmsId
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

// Check if two BMS IDs are essentially the same after cleaning
function areSameBattery(bmsId1: string, bmsId2: string): boolean {
  const clean1 = cleanBmsId(bmsId1);
  const clean2 = cleanBmsId(bmsId2);
  
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
function consolidateRapidSwaps(swaps: BatterySwapEvent[], timeWindowMinutes: number = 10): BatterySwapEvent[] {
  if (swaps.length === 0) return [];
  
  const consolidated: BatterySwapEvent[] = [];
  const timeWindowSeconds = timeWindowMinutes * 60;
  
  const sortedSwaps = [...swaps].sort((a, b) => b.TIMESTAMP - a.TIMESTAMP);
  
  let i = 0;
  while (i < sortedSwaps.length) {
    const currentSwap = sortedSwaps[i];
    const swapGroup: BatterySwapEvent[] = [currentSwap];
    
    let j = i + 1;
    while (j < sortedSwaps.length) {
      const nextSwap = sortedSwaps[j];
      const timeDiff = currentSwap.TIMESTAMP - nextSwap.TIMESTAMP;
      
      if (timeDiff <= timeWindowSeconds) {
        const sameOldNew = (areSameBattery(currentSwap.OLDBMSID, nextSwap.OLDBMSID) && 
                           areSameBattery(currentSwap.NEWBMSID, nextSwap.NEWBMSID));
        const sameNewOld = (areSameBattery(currentSwap.OLDBMSID, nextSwap.NEWBMSID) && 
                           areSameBattery(currentSwap.NEWBMSID, nextSwap.OLDBMSID));
        
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
      
      const consolidatedSwap: BatterySwapEvent = {
        TIMESTAMP: lastSwap.TIMESTAMP,
        OLDBMSID: cleanBmsId(firstSwap.OLDBMSID),
        NEWBMSID: cleanBmsId(lastSwap.NEWBMSID),
        OLDSOH: firstSwap.OLDSOH,
        NEWSOH: lastSwap.NEWSOH,
        CHARGECHANGE: swapGroup.reduce((sum, swap) => sum + swap.CHARGECHANGE, 0),
      };
      
      if (!areSameBattery(consolidatedSwap.OLDBMSID, consolidatedSwap.NEWBMSID)) {
        consolidated.push(consolidatedSwap);
      }
    } else {
      const cleanedSwap = {
        ...currentSwap,
        OLDBMSID: cleanBmsId(currentSwap.OLDBMSID),
        NEWBMSID: cleanBmsId(currentSwap.NEWBMSID)
      };
      
      if (!areSameBattery(cleanedSwap.OLDBMSID, cleanedSwap.NEWBMSID)) {
        consolidated.push(cleanedSwap);
      }
    }
    
    i++;
  }
  
  return consolidated.sort((a, b) => b.TIMESTAMP - a.TIMESTAMP);
}

function useBatteryData(
  tboxId: string,
  filters: BatteryFilters = { timeRange: 168 }
) {
  const [batteryData, setBatteryData] = useState<TboxData[]>([]);
  const [batterySwaps, setBatterySwaps] = useState<BatterySwapEvent[]>([]);
  const [batterySessions, setBatterySessions] = useState<BatterySession[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [lastDataTimestamp, setLastDataTimestamp] = useState<number | null>(null);

  const fetchSnowflakeData = useCallback(async (query: string, queryName?: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/query`, {
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

  // First, get the most recent data timestamp for this tbox
  const fetchLastDataTimestamp = useCallback(async () => {
    const query = `
      SELECT MAX(CTIME) as LAST_DATA_TIME
      FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
      WHERE TBOXID = '${tboxId}'
    `;
    
    try {
      const result = await fetchSnowflakeData(query, "lastDataTimestamp");
      if (result && result.length > 0 && result[0].LAST_DATA_TIME) {
        const lastTime = result[0].LAST_DATA_TIME;
        setLastDataTimestamp(lastTime);
        return lastTime;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch last data timestamp:", error);
      return null;
    }
  }, [tboxId, fetchSnowflakeData]);

  const buildFilterConditions = useCallback((lastTimestamp: number | null) => {
    const conditions: string[] = [];

    // Time range filter based on last available data
    if (lastTimestamp) {
      const startTimestamp = lastTimestamp - (filters.timeRange * 3600);
      conditions.push(`CTIME >= ${startTimestamp}`);
      conditions.push(`CTIME <= ${lastTimestamp}`);
    } else {
      conditions.push(`CTIME >= EXTRACT(EPOCH FROM CURRENT_TIMESTAMP - INTERVAL '${filters.timeRange} HOURS')`);
    }

    // Optional filters
    if (filters.minBatteryTemp) {
      conditions.push(`BATTEMP >= ${filters.minBatteryTemp}`);
    }

    if (filters.maxBatteryTemp) {
      conditions.push(`BATTEMP <= ${filters.maxBatteryTemp}`);
    }

    if (filters.minSOH) {
      conditions.push(`BATSOH >= ${filters.minSOH}`);
    }

    // Exclude idle data if requested
    if (!filters.includeIdleData) {
      conditions.push(`NOT (MOTORRPM <= 20 AND THROTTLEPERCENT <= 50 AND ABS(BATCURRENT) <= 20)`);
    }

    return conditions;
  }, [filters]);

  const queries = useMemo(() => {
    const filterConditions = buildFilterConditions(lastDataTimestamp);
    const whereClause = `WHERE TBOXID = '${tboxId}' AND ${filterConditions.join(' AND ')}`;

    return {
      // OPTIMIZED: Only fetch essential columns for telemetry
      batteryTelemetry: `
        SELECT
          BATTEMP,
          BATVOLT,
          COALESCE(
            NULLIF(BATCELLDIFFMAX, 0),
            CASE 
              WHEN BATVOLT IS NOT NULL AND BATVOLT > 0 THEN 
                ABS(BATVOLT - 52.0) * 10.0
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
          CASE 
            WHEN BMSID IS NOT NULL AND BMSID != '' THEN 
              UPPER(TRIM(REGEXP_REPLACE(BMSID, '[\\x00-\\x1F\\x7F-\\x9F]', '')))
            WHEN TBOX_ID IS NOT NULL THEN CONCAT('BMS_', RIGHT(TBOX_ID, 2))
            ELSE CONCAT('BMS_', SUBSTRING(TBOXID, LENGTH(TBOXID)-1, 2))
          END as BMS_ID,
          COALESCE(TOTAL_DISTANCE_KM, 0) as TOTAL_DISTANCE_KM,
          COALESCE(STATE, 'UNKNOWN') as STATE,
          THROTTLEPERCENT
        FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
        ${whereClause}
        ORDER BY CTIME ASC
      `,

      // OPTIMIZED: Only fetch columns needed for swap detection
      batterySwapDetection: `
        WITH cleaned_data AS (
          SELECT
            CTIME,
            UPPER(TRIM(REGEXP_REPLACE(
              COALESCE(BMSID, CONCAT('BMS_', SUBSTRING(TBOXID, LENGTH(TBOXID)-1, 2))), 
              '[\\x00-\\x1F\\x7F-\\x9F]', ''
            ))) as current_bms,
            BATSOH,
            BATPERCENT,
            ROW_NUMBER() OVER (ORDER BY CTIME) as row_num
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          ${whereClause}
        ),
        battery_changes AS (
          SELECT
            CTIME,
            current_bms,
            LAG(current_bms, 1) OVER (ORDER BY CTIME) as previous_bms,
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
            previous_bms as OLDBMSID,
            current_bms as NEWBMSID,
            COALESCE(previous_soh, 0) as OLDSOH,
            COALESCE(BATSOH, 0) as NEWSOH,
            COALESCE((BATPERCENT - previous_charge), 0) as CHARGECHANGE,
            (CTIME - previous_time) as time_gap
          FROM battery_changes
          WHERE current_bms != previous_bms
            AND current_bms IS NOT NULL
            AND previous_bms IS NOT NULL
            AND previous_bms != ''
            AND current_bms != ''
            AND (CTIME - previous_time) >= 30
            AND LENGTH(current_bms) > 5
            AND LENGTH(previous_bms) > 5
        )
        SELECT 
          TIMESTAMP,
          OLDBMSID,
          NEWBMSID,
          OLDSOH,
          NEWSOH,
          CHARGECHANGE
        FROM potential_swaps
        ORDER BY TIMESTAMP DESC
        LIMIT 100
      `,

      // OPTIMIZED: Only fetch columns needed for session analysis
      batterySessionAnalysis: `
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
              UPPER(TRIM(REGEXP_REPLACE(
                COALESCE(BMSID, CONCAT('BMS_', SUBSTRING(TBOXID, LENGTH(TBOXID)-1, 2))), 
                '[\\x00-\\x1F\\x7F-\\x9F]', ''
              ))) as bms_id
            FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
            ${whereClause}
        ),
        bms_changes AS (
            SELECT *,
            LAG(bms_id, 1, 'DIFFERENT') OVER (ORDER BY CTIME) as prev_bms_id
            FROM cleaned_base_data
        ),
        session_groups AS (
            SELECT *,
            SUM(CASE WHEN bms_id != prev_bms_id THEN 1 ELSE 0 END) 
                OVER (ORDER BY CTIME) as session_group
            FROM bms_changes
        ),
        battery_sessions AS (
            SELECT
            bms_id,
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
            GROUP BY bms_id, session_group
        )
        SELECT
            bms_id as BMSID,
            session_start as STARTTIME,
            session_end as ENDTIME,
            ROUND((session_end - session_start) / 3600.0, 2) as DURATION,
            ROUND(avg_soh, 1) as AVGSOH,
            ROUND(avg_temp, 1) as AVGTEMP,
            ROUND(avg_voltage, 2) as AVGVOLTAGE,
            ROUND(max_charge, 1) as STARTCHARGE,
            ROUND(min_charge, 1) as ENDCHARGE,
            ROUND(max_charge - min_charge, 1) as CHARGECONSUMED,
            ROUND(COALESCE(end_distance - start_distance, 0), 2) as DISTANCECOVERED,
            ROUND(avg_current, 1) as AVGCURRENT,
            ROUND(max_temp, 1) as MAXTEMP,
            ROUND(min_voltage, 2) as MINVOLTAGE,
            cycle_count as CYCLECOUNT,
            error_events as ERROREVENTS
        FROM battery_sessions
        WHERE (session_end - session_start) > 360
          AND bms_id != ''
          AND LENGTH(bms_id) > 5
        ORDER BY session_start DESC
        LIMIT 100
        `,

      // OPTIMIZED: Only fetch aggregated metrics for diagnostics
      systemDiagnostics: `
        WITH cleaned_battery_stats AS (
          SELECT
            COUNT(DISTINCT UPPER(TRIM(REGEXP_REPLACE(
              COALESCE(BMSID, CONCAT('BMS_', SUBSTRING(TBOXID, LENGTH(TBOXID)-1, 2))), 
              '[\\x00-\\x1F\\x7F-\\x9F]', ''
            )))) as total_batteries,
            AVG(BATSOH) as avg_soh,
            AVG(BATTEMP) as avg_temp,
            COUNT(*) as total_readings,
            SUM(CASE WHEN BATTERY_ERROR IS NOT NULL AND BATTERY_ERROR != '' 
                     OR BATTEMP > 65
                THEN 1 ELSE 0 END) as critical_events,
            SUM(CASE WHEN BATVOLT < 44 OR BATVOLT > 54 THEN 1 ELSE 0 END) as voltage_anomalies,
            MAX(TOTAL_DISTANCE_KM) - MIN(TOTAL_DISTANCE_KM) as distance_covered,
            (MAX(BATPERCENT) - MIN(BATPERCENT)) as charge_consumed,
            COUNT(DISTINCT DATE_TRUNC('day', TO_TIMESTAMP(CTIME))) as active_days
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          ${whereClause}
        ),
        cleaned_battery_performance AS (
          SELECT
            UPPER(TRIM(REGEXP_REPLACE(
              COALESCE(BMSID, CONCAT('BMS_', SUBSTRING(TBOXID, LENGTH(TBOXID)-1, 2))), 
              '[\\x00-\\x1F\\x7F-\\x9F]', ''
            ))) as bms_id,
            AVG(BATSOH) as avg_soh,
            AVG(BATTEMP) as avg_temp,
            SUM(CASE WHEN BATTERY_ERROR IS NOT NULL AND BATTERY_ERROR != '' THEN 1 ELSE 0 END) as error_count,
            COUNT(*) as readings_count
          FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
          ${whereClause}
          GROUP BY UPPER(TRIM(REGEXP_REPLACE(
            COALESCE(BMSID, CONCAT('BMS_', SUBSTRING(TBOXID, LENGTH(TBOXID)-1, 2))), 
            '[\\x00-\\x1F\\x7F-\\x9F]', ''
          )))
          HAVING COUNT(*) > 10 AND LENGTH(bms_id) > 5
        )
        SELECT
          bs.total_batteries as TOTAL_BATTERIES,
          bs.avg_soh as AVG_SOH,
          bs.avg_temp as AVG_TEMP,
          bs.critical_events as CRITICAL_EVENTS,
          bs.voltage_anomalies as VOLTAGE_ANOMALIES,
          bs.total_readings as TOTAL_READINGS,
          bs.distance_covered as DISTANCE_COVERED,
          bs.charge_consumed as CHARGE_CONSUMED,
          bs.active_days as ACTIVE_DAYS,
          CASE WHEN bs.charge_consumed > 0 
               THEN ROUND(bs.distance_covered / bs.charge_consumed, 2)
               ELSE 0 END as BATTERY_EFFICIENCY,
          LISTAGG(
            CASE WHEN bp.avg_soh >= 90 AND (bp.error_count * 100.0 / bp.readings_count) < 5 
                 THEN bp.bms_id END, ','
          ) WITHIN GROUP (ORDER BY bp.avg_soh DESC) as PREFERRED_BATTERIES,
          LISTAGG(
            CASE WHEN bp.avg_soh < 85 OR (bp.error_count * 100.0 / bp.readings_count) > 10 OR bp.avg_temp > 45
                 THEN bp.bms_id END, ','
          ) WITHIN GROUP (ORDER BY bp.avg_soh ASC) as PROBLEMATIC_BATTERIES
        FROM cleaned_battery_stats bs
        CROSS JOIN cleaned_battery_performance bp
        GROUP BY bs.total_batteries, bs.avg_soh, bs.avg_temp, bs.critical_events, 
                 bs.voltage_anomalies, bs.total_readings, bs.distance_covered, 
                 bs.charge_consumed, bs.active_days
      `
    };
  }, [tboxId, buildFilterConditions, lastDataTimestamp]);

  const loadData = useCallback(async () => {
    // Only set loading if we actually have a tboxId to fetch
    if (!tboxId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      // First, fetch the last data timestamp
      const lastTime = await fetchLastDataTimestamp();
      
      // Fetch main telemetry data
      const telemetryResult = await fetchSnowflakeData(queries.batteryTelemetry, "batteryTelemetry");
      setBatteryData(telemetryResult || []);
      
      // Fetch and process battery swaps
      const swapResult = await fetchSnowflakeData(queries.batterySwapDetection, "batterySwapDetection");
      const rawSwaps = swapResult || [];
      
      // Apply client-side consolidation for rapid swaps
      const consolidatedSwaps = consolidateRapidSwaps(rawSwaps, 10);
      setBatterySwaps(consolidatedSwaps);
      
      // Fetch battery sessions
      const sessionResult = await fetchSnowflakeData(queries.batterySessionAnalysis, "batterySessionAnalysis");
      setBatterySessions(sessionResult || []);
      
      // Fetch system diagnostics
      const diagnosticResult = await fetchSnowflakeData(queries.systemDiagnostics, "systemDiagnostics");
      const rawDiagnostics = diagnosticResult?.[0];
      
      if (rawDiagnostics) {
        const safeNumber = (value: any, defaultValue: number = 0): number => {
          const num = Number(value);
          return isNaN(num) ? defaultValue : num;
        };

        const processedDiagnostics: DiagnosticMetrics = {
          totalBatteries: safeNumber(rawDiagnostics.TOTAL_BATTERIES),
          totalSwaps: consolidatedSwaps.length,
          avgSessionDuration: sessionResult?.length > 0 ? 
            sessionResult.reduce((sum: number, s: any) => sum + safeNumber(s.DURATION), 0) / sessionResult.length : 0,
          preferredBatteries: rawDiagnostics.PREFERRED_BATTERIES ? 
            rawDiagnostics.PREFERRED_BATTERIES.split(',').filter(Boolean) : [],
          problematicBatteries: rawDiagnostics.PROBLEMATIC_BATTERIES ? 
            rawDiagnostics.PROBLEMATIC_BATTERIES.split(',').filter(Boolean) : [],
          swapFrequency: consolidatedSwaps.length / Math.max(1, safeNumber(rawDiagnostics.ACTIVE_DAYS, 1)),
          batteryEfficiency: safeNumber(rawDiagnostics.BATTERY_EFFICIENCY),
          thermalPerformance: (() => {
            const temp = safeNumber(rawDiagnostics.AVG_TEMP);
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
        telemetryCount: telemetryResult?.length || 0,
        rawSwapCount: rawSwaps.length,
        consolidatedSwapCount: consolidatedSwaps.length,
        sessionCount: sessionResult?.length || 0,
        diagnosticsFound: !!rawDiagnostics,
        timeRange: filters.timeRange,
        uniqueBatteries: [...new Set(telemetryResult?.map((d: any) => d.BMS_ID) || [])].length,
        swapsConsolidated: rawSwaps.length - consolidatedSwaps.length,
        lastDataTimestamp: lastTime,
        dataDateRange: lastTime ? {
          from: new Date((lastTime - (filters.timeRange * 3600)) * 1000).toISOString(),
          to: new Date(lastTime * 1000).toISOString()
        } : null
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load battery data";
      console.error("Battery data loading error:", error);
      setError(errorMessage);
      setBatteryData([]);
      setBatterySwaps([]);
      setBatterySessions([]);
      setDiagnostics(null);
    } finally {
      setLoading(false);
    }
  }, [queries, fetchSnowflakeData, filters.timeRange, fetchLastDataTimestamp, tboxId]);

  useEffect(() => {
    if (tboxId) {
      loadData();
    } else {
      // Reset state when no tboxId
      setLoading(false);
      setBatteryData([]);
      setBatterySwaps([]);
      setBatterySessions([]);
      setDiagnostics(null);
      setError(null);
      setDebugInfo(null);
    }
  }, [loadData, tboxId]);

  return {
    batteryData,
    batterySwaps,
    batterySessions,
    diagnostics,
    loading,
    error,
    debugInfo,
    lastDataTimestamp,
    refetch: loadData,
  };
}

export type {
  TboxData,
  BatterySwapEvent,
  BatterySession,
  DiagnosticMetrics,
  BatteryFilters
};

export default useBatteryData;