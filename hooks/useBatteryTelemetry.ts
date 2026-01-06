// hooks/useBatteryTelemetry.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { calculateHealthScoreWithAnomalies } from "@/utils/batteryHealthScore";

// ============================================================================
// TYPES
// ============================================================================

interface Anomaly {
  type: "critical" | "warning" | "info";
  category: "signal" | "health" | "usage" | "error" | "data";
  message: string;
  impact: number;
  recommendation: string;
}

interface RawBatteryData {
  bmsId: string;
  tboxId: string;
  batVolt: number | null;
  batCurrent: number | null;
  batTemp: number | null;
  batSOH: number | null;
  batCycleCount: number | null;
  batteryError: string;
  lastPulseTime: string;
  totalDistanceTraveled: number;
  avgDistancePerCycle: number;
  dataIngestionTime: string;
  status: "online" | "offline" | "error" | "bss";
  telemetryStatus: "current" | "stale" | "no_data";
  telemetryAgeHours: number | null;
  dataSource: "tbox" | "bss" | "historical";
  lastTelemetryTime: string | null;
  bssSingleVol: string | null;  // NEW: Cell voltages array from BSS
  bssVoltageTimestamp: string | null;  // NEW: When the voltage data was captured
}

interface BatteryTelemetry {
  bmsId: string;
  tboxId: string;
  batVolt: number | null;
  batCurrent: number | null;
  batTemp: number | null;
  batSOH: number | null;
  batCycleCount: number | null;
  batteryError: string;
  lastPulseTime: Date;
  hoursSinceLastPulse: number;
  isOnline: boolean;
  offlineDuration: number;
  totalDistanceTraveled: number;
  avgDistancePerCycle: number;
  dataIngestionTime: Date;
  status: "online" | "offline" | "error" | "bss";
  telemetryStatus: "current" | "stale" | "no_data";
  telemetryAgeHours: number | null;
  dataSource: "tbox" | "bss" | "historical";
  lastTelemetryTime: Date | null;
  bssSingleVol: string | null;  // NEW: Cell voltages array from BSS
  bssVoltageTimestamp: Date | null;  // NEW: When the voltage data was captured
  cellVoltages: number[] | null;  // NEW: Parsed cell voltages
  anomalies: Anomaly[];
  healthScore: number;
}

interface CacheData {
  rawData: RawBatteryData[];
  timestamp: number;
}

interface UseBatteryTelemetryReturn {
  batteries: BatteryTelemetry[];
  loading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
  processingTime: number | null;
  fromCache: boolean;
  lastUpdated: number | null;
}

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;
const CACHE_KEY = 'battery_telemetry_cache_v3'; // Updated version for BSS voltage data

// ============================================================================
// CACHE UTILITIES
// ============================================================================

const saveToCache = (rawData: RawBatteryData[]): void => {
  try {
    const cacheData: CacheData = {
      rawData,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log(`💾 Saved ${rawData.length} raw records to cache`);
  } catch (error) {
    console.warn('Failed to save to cache:', error);
  }
};

const loadFromCache = (): CacheData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cacheData: CacheData = JSON.parse(cached);
    const cacheAge = Date.now() - cacheData.timestamp;
    const isValid = cacheAge < CACHE_DURATION_MS;
    
    if (isValid) {
      console.log(`📂 Loaded ${cacheData.rawData.length} raw records from cache (${Math.round(cacheAge / 1000 / 60)} minutes old)`);
      return cacheData;
    } else {
      console.log(`🗑️  Cache expired (${Math.round(cacheAge / 1000 / 60 / 60)} hours old)`);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.warn('Failed to load from cache:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

const clearCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🧹 Cache cleared');
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
};

// ============================================================================
// TIME CALCULATION UTILITIES
// ============================================================================

const calculateTimeMetrics = (lastPulseTime: Date): {
  hoursSinceLastPulse: number;
  isOnline: boolean;
  offlineDuration: number;
} => {
  const now = new Date();
  const hoursSinceLastPulse = Math.floor((now.getTime() - lastPulseTime.getTime()) / (1000 * 60 * 60));
  
  const isOnline = hoursSinceLastPulse < 24;
  const offlineDuration = Math.max(0, hoursSinceLastPulse - 24);
  
  return {
    hoursSinceLastPulse,
    isOnline,
    offlineDuration,
  };
};

// ============================================================================
// CELL VOLTAGE PARSING UTILITY
// ============================================================================

const parseCellVoltages = (singleVolStr: string | null): number[] | null => {
  if (!singleVolStr || singleVolStr.trim() === '') {
    return null;
  }
  
  try {
    // First try parsing as JSON array (e.g., "[3.33,3.33,3.33]")
    const parsed = JSON.parse(singleVolStr);
    if (Array.isArray(parsed)) {
      const values = parsed.map(v => typeof v === 'number' ? v : parseFloat(v)).filter(v => !isNaN(v));
      return values.length > 0 ? values : null;
    }
  } catch (error) {
    // Not JSON, that's okay - will try CSV parsing below
  }
  
  try {
    // Try parsing as comma-separated values (e.g., "3.33,3.33,3.33")
    const values = singleVolStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    if (values.length > 0) {
      console.log(`✅ Parsed ${values.length} cell voltages from CSV string`);
      return values;
    }
  } catch (error) {
    console.warn('Failed to parse cell voltages:', singleVolStr, error);
  }
  
  return null;
};

// ============================================================================
// UPDATED SNOWFLAKE QUERY WITH BSS VOLTAGE DATA
// ============================================================================

const SNOWFLAKE_QUERY = `
WITH master_bms AS (
    SELECT DISTINCT
        TRIM(BMS_ID) AS BMSID
    FROM SOURCE_DATA.MASTER_DATA.BATTERY
    WHERE BMS_ID IS NOT NULL
      AND TRIM(BMS_ID) <> ''
      AND BMS_ID NOT ILIKE '%TEST%'
),

/* Get LAST KNOWN telemetry per BMS (not just recent) */
last_known_telemetry AS (
    SELECT 
        TRIM(BMSID) AS BMSID,
        TRIM(TBOXID) AS TBOXID,
        BATVOLT,
        BATCURRENT,
        BATTEMP,
        BATSOH,
        BATCYCLECOUNT,
        BATTERY_ERROR,
        _PROCESSED_AT
    FROM SOURCE_DATA.VEHICLE_DATA.TBOX_MESSAGE_DATA
    WHERE BMSID IS NOT NULL
      AND TRIM(BMSID) <> ''
      AND BMSID NOT ILIKE '%TEST%'
      AND TBOXID IS NOT NULL
      AND TRIM(TBOXID) <> ''
      AND TBOXID NOT ILIKE '%TEST%'
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY TRIM(BMSID)
        ORDER BY _PROCESSED_AT DESC
    ) = 1
),

/* FIX #1: Group distance by BMSID only, regardless of TBOX */
distance_metrics AS (
    SELECT 
        TRIM(BMSID) AS BMSID,
        SUM(DISTANCE_KM) AS total_distance_traveled,
        MAX(GPS_DATE) AS last_gps_date
    FROM REPORT_DB.GPS_DASHBOARD.VEHICLE_DAILY_DISTANCE
    WHERE GPS_DATE > '2020-01-01'
      AND BMSID IS NOT NULL
      AND TRIM(BMSID) <> ''
      AND BMSID NOT ILIKE '%TEST%'
      AND DISTANCE_KM > 0
    GROUP BY TRIM(BMSID)
),

/* Get most recent BSS location */
bss_latest AS (
    SELECT 
        TRIM(BID) AS BMSID,
        _CABINET_NO,
        DEVICE_ID,
        to_timestamp(CT) as CT,
        ROW_NUMBER() OVER (
            PARTITION BY TRIM(BID)
            ORDER BY to_timestamp(CT) DESC
        ) as rn
    FROM (
        SELECT BID, _CABINET_NO, DEVICE_ID, CT
        FROM SOURCE_DATA.BSS_DATA.BSS_CHANGE_STATUS
        WHERE BID IS NOT NULL AND BID NOT ILIKE '%TEST%'
        
        UNION ALL
        
        SELECT BID, _CABINET_NO, DEVICE_ID, CT
        FROM SOURCE_DATA.BSS_DATA.BSS_CABINET_STATUS
        WHERE BID IS NOT NULL AND BID NOT ILIKE '%TEST%'
    )
),

bss_fallback AS (
    SELECT * FROM bss_latest WHERE rn = 1
),

/* FIX #2: Get voltage data - will be used as fallback when battery is in TBOX */
bss_voltage_data AS (
    SELECT 
        TRIM(BID) AS BMSID,
        SINGLE_VOL,
        _CABINET_NO,
        NO,
        DEVICE_ID,
        to_timestamp(CT) as CT,
        ROW_NUMBER() OVER (
            PARTITION BY TRIM(BID)
            ORDER BY to_timestamp(CT) DESC
        ) as rn
    FROM SOURCE_DATA.BSS_DATA.BSS_CABINET_STATUS
    WHERE BID IS NOT NULL 
      AND TRIM(BID) <> ''
      AND BID NOT ILIKE '%TEST%'
      AND SINGLE_VOL IS NOT NULL
      AND TRIM(SINGLE_VOL) <> ''
      AND (IS_BATTERY = '1' OR IS_BATTERY = 1)
),

bss_voltage_latest AS (
    SELECT 
        BMSID, 
        SINGLE_VOL, 
        CT,
        _CABINET_NO,
        NO,
        DEVICE_ID
    FROM bss_voltage_data 
    WHERE rn = 1
),

station_lookup AS (
    SELECT 
        STATION_ID,
        NAME
    FROM SOURCE_DATA.MASTER_DATA.SWAPPING_STATION
)

SELECT 
    mb.BMSID AS "bmsId",

    -- Determine location: TBOX (if recent) or BSS station
    CASE
        WHEN lt.TBOXID IS NOT NULL AND DATEDIFF(hour, lt._PROCESSED_AT, CURRENT_TIMESTAMP()) < 48
        THEN lt.TBOXID
        WHEN bf._CABINET_NO IS NOT NULL
        THEN COALESCE(sl.NAME, 'Unknown Station') || '-Cabinet-' || bf._CABINET_NO
        ELSE COALESCE(lt.TBOXID, 'Unknown')
    END AS "tboxId",

    -- Telemetry data (may be null for BSS batteries with no history)
    CASE WHEN lt.BATVOLT IS NOT NULL THEN lt.BATVOLT / 100.0 ELSE NULL END AS "batVolt",
    lt.BATCURRENT AS "batCurrent",
    CASE WHEN lt.BATTEMP IS NOT NULL THEN lt.BATTEMP / 10.0 ELSE NULL END AS "batTemp",
    lt.BATSOH AS "batSOH",
    lt.BATCYCLECOUNT AS "batCycleCount",
    COALESCE(lt.BATTERY_ERROR, '') AS "batteryError",

    -- Store last known telemetry timestamp separately
    lt._PROCESSED_AT AS "lastTelemetryTime",

    -- Last pulse is most recent: telemetry OR BSS
    COALESCE(lt._PROCESSED_AT, bf.CT) AS "lastPulseTime",

    COALESCE(dm.total_distance_traveled, 0) AS "totalDistanceTraveled",
    
    CASE 
        WHEN lt.BATCYCLECOUNT > 0
        THEN COALESCE(dm.total_distance_traveled, 0) / lt.BATCYCLECOUNT
        ELSE 0
    END AS "avgDistancePerCycle",

    CASE 
        WHEN HOUR(CURRENT_TIMESTAMP()) < 1 
        THEN DATEADD(hour, 1, DATEADD(day, -1, DATE_TRUNC('day', CURRENT_TIMESTAMP())))
        ELSE DATEADD(hour, 1, DATE_TRUNC('day', CURRENT_TIMESTAMP()))
    END AS "dataIngestionTime",

    -- FIX #2: Always show BSS voltage data (whether battery is in TBOX or BSS)
    bv.SINGLE_VOL AS "bssSingleVol",
    bv.CT AS "bssVoltageTimestamp",

    -- Determine telemetry status
    CASE
        WHEN lt._PROCESSED_AT IS NULL THEN 'no_data'
        WHEN DATEDIFF(hour, lt._PROCESSED_AT, CURRENT_TIMESTAMP()) > 48 THEN 'stale'
        ELSE 'current'
    END AS "telemetryStatus",

    CASE
        WHEN lt._PROCESSED_AT IS NOT NULL
        THEN ROUND(DATEDIFF(minute, lt._PROCESSED_AT, CURRENT_TIMESTAMP()) / 60.0, 2)
        ELSE NULL
    END AS "telemetryAgeHours",

    -- Determine data source
    CASE
        WHEN lt.TBOXID IS NOT NULL AND DATEDIFF(hour, lt._PROCESSED_AT, CURRENT_TIMESTAMP()) < 48
        THEN 'tbox'
        WHEN bf.CT IS NOT NULL AND DATEDIFF(hour, bf.CT, CURRENT_TIMESTAMP()) < 48
        THEN 'bss'
        WHEN lt._PROCESSED_AT IS NOT NULL
        THEN 'historical'
        ELSE 'bss'
    END AS "dataSource",

    -- Status based on location and errors
    CASE
        WHEN lt.BATTERY_ERROR IS NOT NULL AND lt.BATTERY_ERROR <> '' THEN 'error'
        WHEN bf.CT IS NOT NULL AND DATEDIFF(hour, bf.CT, CURRENT_TIMESTAMP()) < 48 THEN 'bss'
        WHEN lt._PROCESSED_AT IS NOT NULL AND DATEDIFF(hour, lt._PROCESSED_AT, CURRENT_TIMESTAMP()) < 24 THEN 'online'
        ELSE 'offline'
    END AS "status"

FROM master_bms mb
LEFT JOIN last_known_telemetry lt
    ON mb.BMSID = lt.BMSID
LEFT JOIN distance_metrics dm
    ON mb.BMSID = dm.BMSID
LEFT JOIN bss_fallback bf
    ON mb.BMSID = bf.BMSID
LEFT JOIN bss_voltage_latest bv
    ON mb.BMSID = bv.BMSID
LEFT JOIN station_lookup sl
    ON bf.DEVICE_ID = sl.STATION_ID

WHERE mb.BMSID NOT ILIKE '%TEST%'
  AND (lt.BMSID IS NULL OR lt.BMSID NOT ILIKE '%TEST%')

QUALIFY ROW_NUMBER() OVER (
    PARTITION BY mb.BMSID
    ORDER BY 
        CASE 
            WHEN lt._PROCESSED_AT IS NOT NULL AND DATEDIFF(hour, lt._PROCESSED_AT, CURRENT_TIMESTAMP()) < 24 THEN 1
            WHEN bf.CT IS NOT NULL AND DATEDIFF(hour, bf.CT, CURRENT_TIMESTAMP()) < 48 THEN 2
            WHEN lt._PROCESSED_AT IS NOT NULL THEN 3
            WHEN bf.CT IS NOT NULL THEN 4
            ELSE 5
        END,
        COALESCE(lt._PROCESSED_AT, bf.CT) DESC NULLS LAST
) = 1`;

// ============================================================================
// IMPROVED ANOMALY DETECTION WITH BSS/STALE DATA HANDLING
// ============================================================================

const detectAnomalies = (
  battery: Omit<BatteryTelemetry, "anomalies" | "healthScore">,
  hoursSinceLastPulse: number,
  offlineDuration: number
): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  const { 
    batteryError, 
    batSOH, 
    batCycleCount, 
    avgDistancePerCycle,
    telemetryStatus,
    telemetryAgeHours,
    dataSource,
    cellVoltages,
  } = battery;

  // ============================================================================
  // DATA QUALITY ANOMALIES
  // ============================================================================

  if (telemetryStatus === "no_data") {
    anomalies.push({
      type: "warning",
      category: "data",
      message: "No telemetry data available",
      impact: 5,
      recommendation:
        "Battery has never reported telemetry data. May be new, in storage, or have communication issues.",
    });
  }

  // if (telemetryStatus === "stale" && telemetryAgeHours) {
  //   const daysOld = Math.floor(telemetryAgeHours / 24);
  //   anomalies.push({
  //     type: "info",
  //     category: "data",
  //     message: `Telemetry data is ${daysOld} days old`,
  //     impact: 2,
  //     recommendation:
  //       dataSource === "bss" 
  //         ? `Battery currently in BSS. Last vehicle telemetry from ${daysOld} days ago.`
  //         : `Using historical data. Battery may be offline or in BSS.`,
  //   });
  // }

  // ============================================================================
  // CELL VOLTAGE ANOMALIES (NEW)
  // ============================================================================

  if (cellVoltages && cellVoltages.length > 0) {
    const minVoltage = Math.min(...cellVoltages);
    const maxVoltage = Math.max(...cellVoltages);
    const voltageSpread = maxVoltage - minVoltage;
    const avgVoltage = cellVoltages.reduce((a, b) => a + b, 0) / cellVoltages.length;

    // Critical voltage imbalance
    if (voltageSpread > 0.3) {
      anomalies.push({
        type: "critical",
        category: "health",
        message: `Severe cell imbalance: ${voltageSpread.toFixed(3)}V spread (${minVoltage.toFixed(2)}V - ${maxVoltage.toFixed(2)}V)`,
        impact: 18,
        recommendation:
          "Critical cell imbalance detected. Battery requires immediate inspection and potential cell replacement.",
      });
    } else if (voltageSpread > 0.15) {
      // Warning voltage imbalance
      anomalies.push({
        type: "warning",
        category: "health",
        message: `Cell imbalance detected: ${voltageSpread.toFixed(3)}V spread (${minVoltage.toFixed(2)}V - ${maxVoltage.toFixed(2)}V)`,
        impact: 10,
        recommendation:
          "Moderate cell imbalance. Monitor closely and consider battery balancing or replacement.",
      });
    }

    // Low cell voltage
    if (minVoltage < 2.5) {
      anomalies.push({
        type: "critical",
        category: "health",
        message: `Critical low cell voltage: ${minVoltage.toFixed(2)}V`,
        impact: 20,
        recommendation:
          "Dangerously low cell voltage. Risk of deep discharge damage. Charge immediately.",
      });
    } else if (minVoltage < 3.0) {
      anomalies.push({
        type: "warning",
        category: "health",
        message: `Low cell voltage: ${minVoltage.toFixed(2)}V`,
        impact: 12,
        recommendation:
          "Cell voltage approaching minimum safe level. Charge battery soon.",
      });
    }

    // High cell voltage
    if (maxVoltage > 4.25) {
      anomalies.push({
        type: "critical",
        category: "health",
        message: `Critical high cell voltage: ${maxVoltage.toFixed(2)}V`,
        impact: 18,
        recommendation:
          "Dangerously high cell voltage. Risk of overcharge damage. Stop charging immediately.",
      });
    } else if (maxVoltage > 4.20) {
      anomalies.push({
        type: "warning",
        category: "health",
        message: `High cell voltage: ${maxVoltage.toFixed(2)}V`,
        impact: 10,
        recommendation:
          "Cell voltage approaching maximum safe level. Monitor charging system.",
      });
    }
  }

  // Skip remaining health checks if no telemetry data
  if (telemetryStatus === "no_data" || batSOH === null) {
    return anomalies;
  }

  // ============================================================================
  // CRITICAL ANOMALIES
  // ============================================================================

  if (batteryError && batteryError.trim() !== '' && batteryError.trim() !== 'No Error') {
    anomalies.push({
      type: "critical",
      category: "error",
      message: `BMS Communication Error: ${batteryError}`,
      impact: 25,
      recommendation:
        "Immediate technical inspection required. Check BMS wiring, connections, and module functionality.",
    });
  }

  if (offlineDuration > 168) {
    anomalies.push({
      type: "critical",
      category: "signal",
      message: `BMS offline for ${Math.floor(offlineDuration / 24)} days`,
      impact: 20,
      recommendation:
        "Critical connectivity issue lasting over a week. Check if vehicle is operational, verify GPS/SIM status.",
    });
  }

  if (batSOH < 60) {
    anomalies.push({
      type: "critical",
      category: "health",
      message: `Critical battery degradation: ${batSOH}% SOH`,
      impact: 20,
      recommendation:
        "Battery replacement required immediately. Safety and performance severely compromised.",
    });
  }

  // ============================================================================
  // WARNING ANOMALIES
  // ============================================================================
  
  if (offlineDuration >= 48 && offlineDuration <= 168) {
    anomalies.push({
      type: "warning",
      category: "signal",
      message: `No signal for ${Math.floor(offlineDuration / 24)} days`,
      impact: 12,
      recommendation:
        "Extended connectivity issue. Check vehicle location, network coverage, and schedule maintenance.",
    });
  }

  if (batSOH >= 60 && batSOH < 70) {
    anomalies.push({
      type: "warning",
      category: "health",
      message: `Significant battery degradation: ${batSOH}% SOH`,
      impact: 12,
      recommendation:
        "Plan replacement within 1 month. Monitor closely for performance issues and reduced range.",
    });
  }

  if (batSOH >= 70 && batSOH < 80) {
    anomalies.push({
      type: "warning",
      category: "health",
      message: `Moderate battery wear: ${batSOH}% SOH`,
      impact: 8,
      recommendation:
        "Continue monitoring. Consider replacement planning in 3-6 months.",
    });
  }

  if (batCycleCount && batCycleCount > 500) {
    anomalies.push({
      type: "warning",
      category: "usage",
      message: `High usage: ${batCycleCount} charge cycles`,
      impact: 10,
      recommendation:
        "Battery approaching end of life. Plan proactive replacement.",
    });
  }

  if (avgDistancePerCycle > 60) {
    anomalies.push({
      type: "warning",
      category: "usage",
      message: `Heavy usage pattern: ${avgDistancePerCycle.toFixed(1)} km/cycle average`,
      impact: 8,
      recommendation:
        "Monitor for accelerated degradation. Ensure proper charging practices and thermal management.",
    });
  }

  if (batCycleCount && batCycleCount > 800) {
    anomalies.push({
      type: "warning",
      category: "usage",
      message: `Very high usage: ${batCycleCount} charge cycles (beyond design life)`,
      impact: 15,
      recommendation:
        "Battery beyond expected lifecycle. Immediate replacement recommended.",
    });
  }

  // ============================================================================
  // INFO ANOMALIES
  // ============================================================================

  if (hoursSinceLastPulse >= 24 && hoursSinceLastPulse < 48) {
    anomalies.push({
      type: "info",
      category: "signal",
      message: `Signal delayed: ${Math.floor(hoursSinceLastPulse / 24)} days`,
      impact: 3,
      recommendation:
        "Monitor signal stability. May be temporary connectivity issue.",
    });
  }

  if (avgDistancePerCycle < 10 && batCycleCount && batCycleCount > 20) {
    anomalies.push({
      type: "info",
      category: "usage",
      message: `Low usage pattern: ${avgDistancePerCycle.toFixed(1)} km/cycle average`,
      impact: 2,
      recommendation:
        "Vehicle may be underutilized. Consider optimizing deployment.",
    });
  }

  if (batSOH >= 80 && batSOH < 85) {
    anomalies.push({
      type: "info",
      category: "health",
      message: `Fair battery health: ${batSOH}% SOH`,
      impact: 3,
      recommendation:
        "Battery performing adequately. Continue regular monitoring.",
    });
  }

  if (hoursSinceLastPulse >= 12 && hoursSinceLastPulse < 24) {
    anomalies.push({
      type: "info",
      category: "signal",
      message: `Slight signal delay: ${hoursSinceLastPulse} hours since last pulse`,
      impact: 1,
      recommendation:
        "Minor connectivity delay. Usually resolves automatically.",
    });
  }

  return anomalies;
};

// ============================================================================
// HEALTH SCORE CALCULATION
// ============================================================================

const calculateHealthScore = (anomalies: Anomaly[], telemetryStatus: string): number => {
  // If no telemetry data, return null score indicator
  if (telemetryStatus === "no_data") {
    return 0; // Special case: no data available
  }

  if (anomalies.length === 0) {
    return 95;
  }

  let totalImpact = 0;
  const typeCounts = { critical: 0, warning: 0, info: 0 };
  
  anomalies.forEach(anomaly => {
    typeCounts[anomaly.type]++;
    
    let multiplier = 1.0;
    if (typeCounts[anomaly.type] > 1) {
      multiplier = 0.7;
    }
    
    totalImpact += anomaly.impact * multiplier;
  });

  const maxImpact = 75;
  const effectiveImpact = Math.min(totalImpact, maxImpact);
  const baseScore = 100 - effectiveImpact;
  
  let finalScore;
  if (baseScore >= 80) {
    finalScore = baseScore;
  } else if (baseScore >= 60) {
    finalScore = 60 + (baseScore - 60) * 0.9;
  } else if (baseScore >= 40) {
    finalScore = 40 + (baseScore - 40) * 0.8;
  } else {
    finalScore = 25 + (baseScore - 25) * 0.6;
  }
  
  finalScore = Math.max(25, Math.min(95, Math.round(finalScore)));
  
  return finalScore;
};

// ============================================================================
// DATA PROCESSING
// ============================================================================

const processBatteryData = (rawData: RawBatteryData[]): BatteryTelemetry[] => {
  const startTime = performance.now();
  const result = new Array(rawData.length);
  
  for (let i = 0; i < rawData.length; i++) {
    const raw = rawData[i];
    
    const lastPulseTime = new Date(raw.lastPulseTime);
    const dataIngestionTime = new Date(raw.dataIngestionTime);
    const lastTelemetryTime = raw.lastTelemetryTime ? new Date(raw.lastTelemetryTime) : null;
    const bssVoltageTimestamp = raw.bssVoltageTimestamp ? new Date(raw.bssVoltageTimestamp) : null;
    
    // Parse cell voltages
    const cellVoltages = parseCellVoltages(raw.bssSingleVol);
    
    const timeMetrics = calculateTimeMetrics(lastPulseTime);
    
    let finalStatus = raw.status;
    if (finalStatus === 'error') {
      // Keep error status
    } else if (finalStatus === 'bss') {
      // Keep BSS status
    } else {
      finalStatus = timeMetrics.isOnline ? 'online' : 'offline';
    }

    const batteryBase: Omit<BatteryTelemetry, "anomalies" | "healthScore"> = {
      bmsId: raw.bmsId,
      tboxId: raw.tboxId,
      batVolt: raw.batVolt,
      batCurrent: raw.batCurrent,
      batTemp: raw.batTemp,
      batSOH: raw.batSOH,
      batCycleCount: raw.batCycleCount,
      batteryError: raw.batteryError,
      lastPulseTime,
      hoursSinceLastPulse: timeMetrics.hoursSinceLastPulse,
      isOnline: timeMetrics.isOnline,
      offlineDuration: timeMetrics.offlineDuration,
      totalDistanceTraveled: raw.totalDistanceTraveled,
      avgDistancePerCycle: raw.avgDistancePerCycle,
      dataIngestionTime,
      status: finalStatus,
      telemetryStatus: raw.telemetryStatus,
      telemetryAgeHours: raw.telemetryAgeHours,
      dataSource: raw.dataSource,
      lastTelemetryTime,
      bssSingleVol: raw.bssSingleVol,
      bssVoltageTimestamp,
      cellVoltages,
    };

    // Detect anomalies (keep existing anomaly detection)
    const anomalies = detectAnomalies(
      batteryBase,
      timeMetrics.hoursSinceLastPulse,
      timeMetrics.offlineDuration
    );
    
    // Use the centralized health score utility
    const healthScore = calculateHealthScoreWithAnomalies(anomalies, raw.telemetryStatus);

    result[i] = {
      ...batteryBase,
      anomalies,
      healthScore,
    };
  }
  
  const endTime = performance.now();
  console.log(`⚡ Processed ${rawData.length} batteries in ${(endTime - startTime).toFixed(2)}ms`);
  
  return result;
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useBatteryTelemetry = (): UseBatteryTelemetryReturn => {
  const [batteries, setBatteries] = useState<BatteryTelemetry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  const isFetchingRef = useRef<boolean>(false);

  const fetchAndProcessData = useCallback(async (forceRefresh = false) => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    setProcessingTime(null);
    setFromCache(false);

    try {
      let rawData: RawBatteryData[] = [];

      if (!forceRefresh) {
        const cachedData = loadFromCache();
        if (cachedData) {
          console.log(`📊 Using cached raw data (${cachedData.rawData.length} records)`);
          rawData = cachedData.rawData;
          setFromCache(true);
          setLastUpdated(cachedData.timestamp);
        }
      }

      if (forceRefresh || rawData.length === 0) {
        console.log(forceRefresh ? "🔄 Force refreshing data..." : "🔵 Fetching fresh data...");
        
        const fetchStartTime = performance.now();
        const response = await fetch("/api/testquery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sql: SNOWFLAKE_QUERY,
          }),
        });

        const fetchEndTime = performance.now();
        const fetchTime = fetchEndTime - fetchStartTime;
        console.log(`⏱️  Data fetched in ${fetchTime.toFixed(2)}ms`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        rawData = await response.json();
        console.log(`📊 Received ${rawData.length} BMS records`);
        
        if (!forceRefresh) {
          saveToCache(rawData);
        }
        
        setFromCache(false);
        setLastUpdated(Date.now());
      }

      console.log(`🔧 Processing data with fresh anomaly detection...`);
      const processStartTime = performance.now();
      const processedBatteries = processBatteryData(rawData);
      const processEndTime = performance.now();
      const processTime = processEndTime - processStartTime;
      
      setProcessingTime(processTime);
      console.log(`✅ Processed ${processedBatteries.length} batteries in ${processTime.toFixed(2)}ms`);

      setBatteries(processedBatteries);
      
      const totalTime = processEndTime - (fromCache ? processStartTime : processStartTime);
      console.log(`🎯 Total operation time: ${totalTime.toFixed(2)}ms (${fromCache ? 'cache' : 'fresh'})`);

    } catch (err: any) {
      console.error("❌ Failed to fetch/process BMS data:", err);
      setError(err.message || "Failed to load battery telemetry data");
      
      if (!forceRefresh) {
        const cachedData = loadFromCache();
        if (cachedData) {
          console.log(`🔄 Falling back to cached data due to error`);
          const processedBatteries = processBatteryData(cachedData.rawData);
          setBatteries(processedBatteries);
          setFromCache(true);
          setLastUpdated(cachedData.timestamp);
          setError(null);
        }
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [fromCache]);

  useEffect(() => {
    fetchAndProcessData(false);
  }, [fetchAndProcessData]);

  // Initial fetch on mount
  useEffect(() => {
    fetchAndProcessData(false);
  }, [fetchAndProcessData]);

  // Auto-refresh time-sensitive data every 5 minutes
  useEffect(() => {
    if (!loading && batteries.length > 0) {
      const interval = setInterval(() => {
        // Re-process batteries with fresh time calculations
        console.log("🔄 Refreshing time-sensitive metrics...");
        const processedBatteries = processBatteryData(
          batteries.map(b => ({
            bmsId: b.bmsId,
            tboxId: b.tboxId,
            batVolt: b.batVolt,
            batCurrent: b.batCurrent,
            batTemp: b.batTemp,
            batSOH: b.batSOH,
            batCycleCount: b.batCycleCount,
            batteryError: b.batteryError,
            lastPulseTime: b.lastPulseTime.toISOString(),
            totalDistanceTraveled: b.totalDistanceTraveled,
            avgDistancePerCycle: b.avgDistancePerCycle,
            dataIngestionTime: b.dataIngestionTime.toISOString(),
            status: b.status,
            telemetryStatus: b.telemetryStatus,
            telemetryAgeHours: b.telemetryAgeHours,
            dataSource: b.dataSource,
            lastTelemetryTime: b.lastTelemetryTime?.toISOString() || null,
            bssSingleVol: b.bssSingleVol,
            bssVoltageTimestamp: b.bssVoltageTimestamp?.toISOString() || null,
          }))
        );
        setBatteries(processedBatteries);
      }, 5 * 60 * 1000); // Every 5 minutes

      return () => clearInterval(interval);
    }
  }, [loading, batteries]);

  const refetch = useCallback(async (force = false) => {
    if (force) {
      clearCache(); // Clear cache if forcing refresh
    }
    await fetchAndProcessData(force);
  }, [fetchAndProcessData]);

  return {
    batteries,
    loading,
    error,
    refetch,
    processingTime,
    fromCache,
    lastUpdated,
  };
};

export type { BatteryTelemetry, Anomaly };