// utils/batteryHealthScore.ts

/**
 * Battery Health Score Calculation Utilities
 * Centralized logic for calculating battery health scores and detecting anomalies
 */

export interface Anomaly {
  type: "critical" | "warning" | "info";
  category: "signal" | "health" | "usage" | "error" | "data";
  message: string;
  impact: number;
  recommendation: string;
}

interface HealthScoreParams {
  batSOH: number | null;
  batteryError: string | null;
  batCycleCount?: number | null;
  cellVoltages?: number[] | null;
  telemetryStatus?: "current" | "stale" | "no_data" | string;
  telemetryAgeHours?: number | null;
  avgDistancePerCycle?: number | null;
  hoursSinceLastPulse?: number;
  offlineDuration?: number;
  dataSource?: "tbox" | "bss" | "historical";
}

interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  healthScore: number;
}

// ============================================================================
// TIME CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate time metrics from last pulse time
 */
export const calculateTimeMetrics = (lastPulseTime: Date | string): {
  hoursSinceLastPulse: number;
  isOnline: boolean;
  offlineDuration: number;
} => {
  const lastPulse = typeof lastPulseTime === 'string' ? new Date(lastPulseTime) : lastPulseTime;
  const now = new Date();
  const hoursSinceLastPulse = Math.floor(
    (now.getTime() - lastPulse.getTime()) / (1000 * 60 * 60)
  );

  const isOnline = hoursSinceLastPulse < 24;
  const offlineDuration = Math.max(0, hoursSinceLastPulse - 24);

  return {
    hoursSinceLastPulse,
    isOnline,
    offlineDuration,
  };
};

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * Detect battery anomalies based on comprehensive parameters
 */
export const detectBatteryAnomalies = (params: HealthScoreParams): Anomaly[] => {
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
    hoursSinceLastPulse = 0,
    offlineDuration = 0,
  } = params;

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

  // ============================================================================
  // CELL VOLTAGE ANOMALIES
  // ============================================================================

  if (cellVoltages && cellVoltages.length > 0) {
    const minVoltage = Math.min(...cellVoltages);
    const maxVoltage = Math.max(...cellVoltages);
    const voltageSpread = maxVoltage - minVoltage;

    // Critical voltage imbalance
    if (voltageSpread > 0.3) {
      anomalies.push({
        type: "critical",
        category: "health",
        message: `Severe cell imbalance: ${voltageSpread.toFixed(3)}V spread (${minVoltage.toFixed(
          2
        )}V - ${maxVoltage.toFixed(2)}V)`,
        impact: 18,
        recommendation:
          "Critical cell imbalance detected. Battery requires immediate inspection and potential cell replacement.",
      });
    } else if (voltageSpread > 0.15) {
      anomalies.push({
        type: "warning",
        category: "health",
        message: `Cell imbalance detected: ${voltageSpread.toFixed(3)}V spread (${minVoltage.toFixed(
          2
        )}V - ${maxVoltage.toFixed(2)}V)`,
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
        recommendation: "Cell voltage approaching minimum safe level. Charge battery soon.",
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
    } else if (maxVoltage > 4.2) {
      anomalies.push({
        type: "warning",
        category: "health",
        message: `High cell voltage: ${maxVoltage.toFixed(2)}V`,
        impact: 10,
        recommendation: "Cell voltage approaching maximum safe level. Monitor charging system.",
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

  if (
    batteryError &&
    batteryError.trim() !== "" &&
    batteryError.trim() !== "No Error"
  ) {
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
      recommendation: "Continue monitoring. Consider replacement planning in 3-6 months.",
    });
  }

  if (batCycleCount && batCycleCount > 500) {
    anomalies.push({
      type: "warning",
      category: "usage",
      message: `High usage: ${batCycleCount} charge cycles`,
      impact: 10,
      recommendation: "Battery approaching end of life. Plan proactive replacement.",
    });
  }

  if (avgDistancePerCycle && avgDistancePerCycle > 60) {
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
      recommendation: "Battery beyond expected lifecycle. Immediate replacement recommended.",
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
      recommendation: "Monitor signal stability. May be temporary connectivity issue.",
    });
  }

  if (
    avgDistancePerCycle &&
    avgDistancePerCycle < 10 &&
    batCycleCount &&
    batCycleCount > 20
  ) {
    anomalies.push({
      type: "info",
      category: "usage",
      message: `Low usage pattern: ${avgDistancePerCycle.toFixed(1)} km/cycle average`,
      impact: 2,
      recommendation: "Vehicle may be underutilized. Consider optimizing deployment.",
    });
  }

  if (batSOH >= 80 && batSOH < 85) {
    anomalies.push({
      type: "info",
      category: "health",
      message: `Fair battery health: ${batSOH}% SOH`,
      impact: 3,
      recommendation: "Battery performing adequately. Continue regular monitoring.",
    });
  }

  if (hoursSinceLastPulse >= 12 && hoursSinceLastPulse < 24) {
    anomalies.push({
      type: "info",
      category: "signal",
      message: `Slight signal delay: ${hoursSinceLastPulse} hours since last pulse`,
      impact: 1,
      recommendation: "Minor connectivity delay. Usually resolves automatically.",
    });
  }

  return anomalies;
};

// ============================================================================
// HEALTH SCORE CALCULATION
// ============================================================================

/**
 * Calculate health score based on State of Health and battery errors
 * Simple calculation without anomaly detection
 */
export const calculateSimpleHealthScore = (
  soh: number | null,
  batteryError: string | null
): number => {
  if (soh === null || soh === undefined) {
    return 0;
  }

  let score = soh;

  if (batteryError && batteryError !== "null" && batteryError !== "") {
    try {
      const errors = JSON.parse(batteryError);
      if (Array.isArray(errors) && errors.length > 0) {
        const errorDeduction = Math.min(errors.length * 5, 25);
        score = Math.max(0, score - errorDeduction);
      }
    } catch {
      score = Math.max(0, score - 5);
    }
  }

  return Math.round(score);
};

/**
 * Calculate detailed health score with anomaly impact
 */
export const calculateHealthScoreWithAnomalies = (
  anomalies: Anomaly[],
  telemetryStatus?: string
): number => {
  if (telemetryStatus === "no_data") {
    return 0;
  }

  if (anomalies.length === 0) {
    return 95;
  }

  let totalImpact = 0;
  const typeCounts = { critical: 0, warning: 0, info: 0 };

  anomalies.forEach((anomaly) => {
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

/**
 * Calculate comprehensive health score and detect anomalies
 * Returns both anomalies and health score
 */
export const calculateComprehensiveHealth = (
  params: HealthScoreParams
): AnomalyDetectionResult => {
  // Detect anomalies
  const anomalies = detectBatteryAnomalies(params);

  // Calculate health score based on anomalies
  const healthScore = calculateHealthScoreWithAnomalies(
    anomalies,
    params.telemetryStatus
  );

  return {
    anomalies,
    healthScore,
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get health status category based on score
 */
export const getHealthStatus = (
  score: number
): "excellent" | "good" | "fair" | "poor" | "critical" | "unknown" => {
  if (score === 0) return "unknown";
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "fair";
  if (score >= 40) return "poor";
  return "critical";
};

/**
 * Get color class for health score display
 */
export const getHealthColor = (score: number): string => {
  if (score === 0) return "text-slate-500";
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
};

/**
 * Get background color class for health score badges
 */
export const getHealthBadgeColor = (score: number): string => {
  if (score === 0) return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  if (score >= 80)
    return "bg-green-500/10 text-green-400 border-green-500/20";
  if (score >= 60)
    return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
};

/**
 * Format health score for display
 */
export const formatHealthScore = (score: number): string => {
  if (score === 0) return "N/A";
  return score.toString();
};

/**
 * Get anomaly color based on type
 */
export const getAnomalyColor = (type: Anomaly["type"]): string => {
  switch (type) {
    case "critical":
      return "text-red-400";
    case "warning":
      return "text-yellow-400";
    case "info":
      return "text-blue-400";
    default:
      return "text-slate-400";
  }
};

/**
 * Get anomaly badge color based on type
 */
export const getAnomalyBadgeColor = (type: Anomaly["type"]): string => {
  switch (type) {
    case "critical":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "warning":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "info":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
};

/**
 * Get anomaly icon class based on category
 */
export const getAnomalyCategoryIcon = (category: Anomaly["category"]): string => {
  switch (category) {
    case "signal":
      return "Signal";
    case "health":
      return "Activity";
    case "usage":
      return "TrendingUp";
    case "error":
      return "AlertTriangle";
    case "data":
      return "Database";
    default:
      return "Info";
  }
};

/**
 * Parse cell voltages from string
 */
export const parseCellVoltages = (singleVolStr: string | null): number[] | null => {
  if (!singleVolStr || singleVolStr.trim() === "") {
    return null;
  }

  try {
    const parsed = JSON.parse(singleVolStr);
    if (Array.isArray(parsed)) {
      const values = parsed
        .map((v) => (typeof v === "number" ? v : parseFloat(v)))
        .filter((v) => !isNaN(v));
      return values.length > 0 ? values : null;
    }
  } catch {
    try {
      const values = singleVolStr
        .split(",")
        .map((v) => parseFloat(v.trim()))
        .filter((v) => !isNaN(v));
      if (values.length > 0) {
        return values;
      }
    } catch {
      return null;
    }
  }

  return null;
};