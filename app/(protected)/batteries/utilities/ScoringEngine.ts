// ============================================================================
// ANOMALY DETECTION ENGINE
// ============================================================================

/**
 * Calculate battery health score based on detected anomalies
 * @param anomalies - Array of detected anomalies with impact scores
 * @returns Health score from 0-100 (higher is better)
 *
 * Scoring Algorithm:
 * - Starts at 100 (perfect health)
 * - Each anomaly reduces score by its impact value
 * - Critical anomalies: 30-40 points impact
 * - Warning anomalies: 10-20 points impact
 * - Info anomalies: 3-5 points impact
 * - Minimum score is 0 (cannot go negative)
 *
 * Score Interpretation:
 * - 80-100: Healthy (green)
 * - 60-79: Fair condition (yellow)
 * - 40-59: Poor condition (orange)
 * - 0-39: Critical condition (red)
 */
const calculateHealthScore = (anomalies: Anomaly[]): number => {
  const totalImpact = anomalies.reduce((sum, a) => sum + a.impact, 0);
  const score = Math.max(0, 100 - totalImpact);
  return Math.round(score);
};

/**
 * Detect anomalies in battery telemetry data
 * @param battery - Battery telemetry data (without anomalies and healthScore)
 * @returns Array of detected anomalies with severity, category, and recommendations
 */
const detectAnomalies = (
  battery: Omit<BatteryTelemetry, "anomalies" | "healthScore">
): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  // 1. CRITICAL: BMS Communication Error
  if (battery.batteryError) {
    anomalies.push({
      type: "critical",
      category: "error",
      message: `BMS Communication Error: ${battery.batteryError}`,
      impact: 40,
      recommendation:
        "Immediate technical inspection required. Check BMS wiring and module functionality.",
    });
  }

  // 2. CRITICAL: Extended Offline (>48 hours)
  if (battery.offlineDuration > 48) {
    anomalies.push({
      type: "critical",
      category: "signal",
      message: `BMS offline for ${Math.floor(
        battery.offlineDuration / 24
      )} days`,
      impact: 35,
      recommendation:
        "Critical connectivity issue. Verify power supply, antenna connection, and SIM card status.",
    });
  }

  // 3. CRITICAL: Very Low SOH (<65%)
  if (battery.batSOH < 65) {
    anomalies.push({
      type: "critical",
      category: "health",
      message: `Critical battery degradation: ${battery.batSOH}% SOH`,
      impact: 30,
      recommendation:
        "Battery replacement required immediately. Performance and safety compromised.",
    });
  }

  // 4. WARNING: Offline (24-48 hours)
  if (battery.offlineDuration >= 24 && battery.offlineDuration <= 48) {
    anomalies.push({
      type: "warning",
      category: "signal",
      message: `No signal for ${battery.offlineDuration} hours`,
      impact: 20,
      recommendation:
        "Check vehicle location and network coverage. Schedule maintenance if pattern continues.",
    });
  }

  // 5. WARNING: Low SOH (65-75%)
  if (battery.batSOH >= 65 && battery.batSOH < 75) {
    anomalies.push({
      type: "warning",
      category: "health",
      message: `Battery degradation detected: ${battery.batSOH}% SOH`,
      impact: 20,
      recommendation:
        "Plan replacement within 1-2 months. Monitor closely for performance issues.",
    });
  }

  // 6. WARNING: Moderate SOH (75-85%)
  if (battery.batSOH >= 75 && battery.batSOH < 85) {
    anomalies.push({
      type: "warning",
      category: "health",
      message: `Moderate battery wear: ${battery.batSOH}% SOH`,
      impact: 10,
      recommendation:
        "Continue monitoring. Consider replacement planning in 3-6 months.",
    });
  }

  // 7. WARNING: High Cycle Count (>400)
  if (battery.batCycleCount > 400) {
    anomalies.push({
      type: "warning",
      category: "usage",
      message: `High usage: ${battery.batCycleCount} charge cycles`,
      impact: 15,
      recommendation:
        "Battery approaching end of life. Plan proactive replacement.",
    });
  }

  // 8. WARNING: Excessive Distance per Cycle (>50km average)
  if (battery.avgDistancePerCycle > 50) {
    anomalies.push({
      type: "warning",
      category: "usage",
      message: `Heavy usage pattern: ${battery.avgDistancePerCycle.toFixed(
        1
      )} km/cycle average`,
      impact: 10,
      recommendation:
        "Monitor for accelerated degradation. Verify charging practices.",
    });
  }

  // 9. INFO: Recent Signal Loss (12-24 hours)
  if (battery.hoursSinceLastPulse >= 12 && battery.hoursSinceLastPulse < 24) {
    anomalies.push({
      type: "info",
      category: "signal",
      message: `Signal delayed: ${battery.hoursSinceLastPulse} hours since last pulse`,
      impact: 5,
      recommendation:
        "Monitor signal stability. May be temporary connectivity issue.",
    });
  }

  // 10. INFO: Low Distance Usage
  if (battery.avgDistancePerCycle < 15 && battery.batCycleCount > 50) {
    anomalies.push({
      type: "info",
      category: "usage",
      message: `Low usage pattern: ${battery.avgDistancePerCycle.toFixed(
        1
      )} km/cycle average`,
      impact: 3,
      recommendation:
        "Vehicle may be underutilized or used for short trips only.",
    });
  }

  return anomalies;
};

export default { calculateHealthScore, detectAnomalies };