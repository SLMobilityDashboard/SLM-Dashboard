import { 
  BatteryDetail, 
  DecisionMetrics, 
  CellVoltage, 
  ChargingSession, 
  DischargingSession 
} from "./types";

export const generateBatteryDetail = (bmsId: string): BatteryDetail => {
  const ageInDays = Math.floor(200 + Math.random() * 400);
  const manufactureDate = new Date(
    Date.now() - (ageInDays + 30) * 24 * 60 * 60 * 1000
  );
  const firstUsageDate = new Date(Date.now() - ageInDays * 24 * 60 * 60 * 1000);
  const lastUpdate = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
  const dataAge = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);

  const batCycleCount = Math.floor(150 + Math.random() * 350);
  const nominalCapacity = 30;
  const capacityFade = Math.min(
    30,
    (batCycleCount / 600) * 25 + Math.random() * 5
  );
  const currentCapacity = nominalCapacity * (1 - capacityFade / 100);
  const batSOH = Math.floor(100 - capacityFade);
  const batSOC = Math.floor(20 + Math.random() * 60);

  const cellCount = 15;
  const avgCellVoltage = 3.2 + Math.random() * 0.8;
  const cellVoltages: CellVoltage[] = Array.from(
    { length: cellCount },
    (_, i) => {
      const deviation = (Math.random() - 0.5) * 0.15;
      const voltage = avgCellVoltage + deviation;
      return {
        cellId: i + 1,
        voltage: Number(voltage.toFixed(3)),
        deviation: Number((deviation * 1000).toFixed(1)),
        status:
          Math.abs(deviation) > 0.08
            ? "critical"
            : Math.abs(deviation) > 0.05
            ? "warning"
            : "normal",
      };
    }
  );

  const maxCellVoltage = Math.max(...cellVoltages.map((c) => c.voltage));
  const minCellVoltage = Math.min(...cellVoltages.map((c) => c.voltage));
  const cellImbalance = Number(
    ((maxCellVoltage - minCellVoltage) * 1000).toFixed(1)
  );

  const batTemp = 25 + Math.random() * 15;
  const tempSensors = [
    {
      location: "Cell Group 1-5",
      temp: Number((batTemp + (Math.random() - 0.5) * 3).toFixed(1)),
    },
    {
      location: "Cell Group 6-10",
      temp: Number((batTemp + (Math.random() - 0.5) * 3).toFixed(1)),
    },
    {
      location: "Cell Group 11-15",
      temp: Number((batTemp + (Math.random() - 0.5) * 3).toFixed(1)),
    },
    {
      location: "BMS Controller",
      temp: Number((batTemp + (Math.random() - 0.5) * 5).toFixed(1)),
    },
  ];

  const totalChargeAh = batCycleCount * nominalCapacity * 1.05;
  const totalDischargeAh = batCycleCount * nominalCapacity;
  const coulombicEfficiency = (totalDischargeAh / totalChargeAh) * 100;

  const baseResistance = 50;
  const internalResistance =
    baseResistance + (batCycleCount / 600) * 30 + Math.random() * 10;
  const resistanceIncrease =
    ((internalResistance - baseResistance) / baseResistance) * 100;

  const fastChargeCount = Math.floor(batCycleCount * 0.3);
  const deepDischargeCount = Math.floor(batCycleCount * 0.15);
  const shallowCycleCount = batCycleCount - deepDischargeCount;

  const sohHistory = Array.from({ length: 30 }, (_, i) => {
    const daysAgo = 29 - i;
    const cyclesAgo = Math.floor(
      batCycleCount - (daysAgo / ageInDays) * batCycleCount
    );
    const fadeAgo = Math.min(30, (cyclesAgo / 600) * 25);
    const soh = 100 - fadeAgo;
    const capacity = nominalCapacity * (soh / 100);
    return {
      date: new Date(
        Date.now() - daysAgo * 24 * 60 * 60 * 1000
      ).toLocaleDateString(),
      soh: Number(soh.toFixed(1)),
      capacity: Number(capacity.toFixed(2)),
    };
  });

  const capacityHistory = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(
      Date.now() - (29 - i) * 24 * 60 * 60 * 1000
    ).toLocaleDateString(),
    capacity: Number((nominalCapacity * (1 - i * 0.001)).toFixed(2)),
    fade: Number((i * 0.1).toFixed(2)),
  }));

  const resistanceHistory = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(
      Date.now() - (29 - i) * 24 * 60 * 60 * 1000
    ).toLocaleDateString(),
    resistance: Number(
      (baseResistance + i * 1.2 + Math.random() * 3).toFixed(1)
    ),
  }));

  const tempHistory = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(
      Date.now() - (29 - i) * 24 * 60 * 60 * 1000
    ).toLocaleDateString(),
    temp: Number((25 + Math.random() * 15).toFixed(1)),
    ambient: Number((20 + Math.random() * 10).toFixed(1)),
  }));

  const voltageHistory = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(
      Date.now() - (29 - i) * 24 * 60 * 60 * 1000
    ).toLocaleDateString(),
    voltage: Number((48 + Math.random() * 10).toFixed(2)),
    current: Number(((Math.random() - 0.5) * 20).toFixed(2)),
  }));

  const cycleHistory = Array.from({ length: 30 }, (_, i) => {
    const cycles = Math.floor(batCycleCount - (29 - i) * 2);
    return {
      date: new Date(
        Date.now() - (29 - i) * 24 * 60 * 60 * 1000
      ).toLocaleDateString(),
      cycles: cycles,
      deepCycles: Math.floor(cycles * 0.15),
    };
  });

  const chargingSessions: ChargingSession[] = Array.from(
    { length: 20 },
    (_, i) => ({
      date: new Date(
        Date.now() - (19 - i) * 36 * 60 * 60 * 1000
      ).toLocaleDateString(),
      chargeDuration: Number((1 + Math.random() * 3).toFixed(1)),
      energyAdded: Number((15 + Math.random() * 10).toFixed(2)),
      startSOC: Math.floor(10 + Math.random() * 30),
      endSOC: Math.floor(80 + Math.random() * 20),
      avgChargingCurrent: Number((10 + Math.random() * 15).toFixed(2)),
      peakTemp: Number((30 + Math.random() * 10).toFixed(1)),
      efficiency: Number((92 + Math.random() * 6).toFixed(1)),
    })
  );

  const dischargingSessions: DischargingSession[] = Array.from(
    { length: 20 },
    (_, i) => ({
      date: new Date(
        Date.now() - (19 - i) * 36 * 60 * 60 * 1000
      ).toLocaleDateString(),
      dischargeDuration: Number((2 + Math.random() * 4).toFixed(1)),
      energyUsed: Number((10 + Math.random() * 15).toFixed(2)),
      startSOC: Math.floor(80 + Math.random() * 20),
      endSOC: Math.floor(15 + Math.random() * 25),
      avgDischargeCurrent: Number((8 + Math.random() * 12).toFixed(2)),
      peakTemp: Number((28 + Math.random() * 12).toFixed(1)),
      depthOfDischarge: Number((50 + Math.random() * 35).toFixed(1)),
    })
  );

  const cellBalanceHistory = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(
      Date.now() - (29 - i) * 24 * 60 * 60 * 1000
    ).toLocaleDateString(),
    imbalance: Number((20 + Math.random() * 80 + i * 1.5).toFixed(1)),
    maxDev: Number((10 + Math.random() * 40 + i * 0.8).toFixed(1)),
  }));

  const efficiencyHistory = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(
      Date.now() - (29 - i) * 24 * 60 * 60 * 1000
    ).toLocaleDateString(),
    coulombic: Number((98 - i * 0.05 + Math.random()).toFixed(2)),
    energy: Number((95 - i * 0.08 + Math.random()).toFixed(2)),
  }));

  const stateOfChargeDistribution = [
    { range: "0-20%", hours: 45, percentage: 6 },
    { range: "20-40%", hours: 120, percentage: 17 },
    { range: "40-60%", hours: 210, percentage: 29 },
    { range: "60-80%", hours: 245, percentage: 34 },
    { range: "80-100%", hours: 100, percentage: 14 },
  ];

  const temperatureDistribution = [
    { range: "<15°C", hours: 30, percentage: 4 },
    { range: "15-25°C", hours: 280, percentage: 39 },
    { range: "25-35°C", hours: 310, percentage: 43 },
    { range: "35-45°C", hours: 90, percentage: 13 },
    { range: ">45°C", hours: 10, percentage: 1 },
  ];

  const chargingRateDistribution = [
    { rate: "Slow (0-0.5C)", count: 180, percentage: 60 },
    { rate: "Normal (0.5-1C)", count: 90, percentage: 30 },
    { rate: "Fast (1-2C)", count: 25, percentage: 8 },
    { rate: "Ultra-Fast (>2C)", count: 5, percentage: 2 },
  ];

  const cycleDepthDistribution = [
    {
      depth: "Shallow (<30%)",
      count: Math.floor(batCycleCount * 0.4),
      percentage: 40,
    },
    {
      depth: "Medium (30-60%)",
      count: Math.floor(batCycleCount * 0.35),
      percentage: 35,
    },
    {
      depth: "Deep (60-80%)",
      count: Math.floor(batCycleCount * 0.15),
      percentage: 15,
    },
    {
      depth: "Very Deep (>80%)",
      count: Math.floor(batCycleCount * 0.1),
      percentage: 10,
    },
  ];

  const errorHistory = [
    {
      date: "2024-10-15",
      error: "Over-temperature warning",
      severity: "medium",
    },
    { date: "2024-10-01", error: "Cell imbalance detected", severity: "low" },
  ];

  return {
    bmsId,
    batteryManufacturer: "PowerCell Industries",
    batteryModel: "PC-LFP-48V-30Ah",
    manufactureDate,
    firstUsageDate,
    ageInDays,
    nominalCapacity,
    currentCapacity: Number(currentCapacity.toFixed(2)),
    capacityFade: Number(capacityFade.toFixed(2)),
    batSOH,
    batSOC,
    batVolt: Number((cellCount * avgCellVoltage).toFixed(2)),
    batCurrent: Number(((Math.random() - 0.5) * 20).toFixed(2)),
    batTemp: Number(batTemp.toFixed(1)),
    batCycleCount,
    totalChargeAh: Number(totalChargeAh.toFixed(2)),
    totalDischargeAh: Number(totalDischargeAh.toFixed(2)),
    coulombicEfficiency: Number(coulombicEfficiency.toFixed(2)),
    internalResistance: Number(internalResistance.toFixed(1)),
    resistanceIncrease: Number(resistanceIncrease.toFixed(2)),
    cellVoltages,
    cellImbalance,
    minCellVoltage: Number(minCellVoltage.toFixed(3)),
    maxCellVoltage: Number(maxCellVoltage.toFixed(3)),
    avgCellVoltage: Number(avgCellVoltage.toFixed(3)),
    tempSensors,
    maxRecordedTemp: Number((batTemp + 15 + Math.random() * 10).toFixed(1)),
    minRecordedTemp: Number((batTemp - 10 - Math.random() * 5).toFixed(1)),
    avgOperatingTemp: Number((batTemp - 2 + Math.random() * 4).toFixed(1)),
    thermalEvents: Math.floor(Math.random() * 5),
    overTempEvents: Math.floor(Math.random() * 3),
    underTempEvents: Math.floor(Math.random() * 2),
    chargeRate: Number((0.3 + Math.random() * 0.7).toFixed(2)),
    dischargeRate: Number((0.4 + Math.random() * 0.6).toFixed(2)),
    maxChargeRate: 2.0,
    maxDischargeRate: 3.0,
    fastChargeCount,
    deepDischargeCount,
    shallowCycleCount,
    batteryError: Math.random() > 0.85 ? "Cell imbalance detected" : "",
    errorHistory,
    lastUpdate,
    dataAge,
    status:
      Math.random() > 0.9
        ? "error"
        : dataAge > 1440
        ? "stale"
        : dataAge < 30
        ? "online"
        : "offline",
    sohHistory,
    capacityHistory,
    resistanceHistory,
    tempHistory,
    voltageHistory,
    cycleHistory,
    chargingSessions,
    dischargingSessions,
    cellBalanceHistory,
    efficiencyHistory,
    stateOfChargeDistribution,
    temperatureDistribution,
    chargingRateDistribution,
    cycleDepthDistribution,
  };
};

export const calculateDecisionMetrics = (battery: BatteryDetail): DecisionMetrics => {
  // Health Score (40%)
  let healthScore = battery.batSOH;
  if (battery.capacityFade > 20) healthScore -= 15;
  if (battery.cellImbalance > 100) healthScore -= 10;
  if (battery.batteryError) healthScore -= 15;
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Performance Score (30%)
  let performanceScore = 100;
  if (battery.coulombicEfficiency < 95) performanceScore -= 15;
  if (battery.resistanceIncrease > 30) performanceScore -= 20;
  if (battery.internalResistance > 80) performanceScore -= 15;
  performanceScore = Math.max(0, Math.min(100, performanceScore));

  // Safety Score (20%)
  let safetyScore = 100;
  if (battery.cellImbalance > 150) safetyScore -= 25;
  if (battery.overTempEvents > 5) safetyScore -= 20;
  if (battery.batTemp > 40) safetyScore -= 15;
  if (battery.maxRecordedTemp > 50) safetyScore -= 20;
  if (battery.deepDischargeCount > battery.batCycleCount * 0.3)
    safetyScore -= 10;
  safetyScore = Math.max(0, Math.min(100, safetyScore));

  // Longevity Score (10%)
  let longevityScore = 100;
  const cycleRatio = battery.batCycleCount / 600;
  longevityScore -= cycleRatio * 30;
  if (battery.fastChargeCount > battery.batCycleCount * 0.4)
    longevityScore -= 15;
  if (battery.ageInDays > 500) longevityScore -= 10;
  longevityScore = Math.max(0, Math.min(100, longevityScore));

  const overallScore = Math.floor(
    healthScore * 0.4 +
      performanceScore * 0.3 +
      safetyScore * 0.2 +
      longevityScore * 0.1
  );

  let recommendation: DecisionMetrics["recommendation"];
  if (overallScore >= 85 && safetyScore >= 80) recommendation = "excellent";
  else if (overallScore >= 70 && safetyScore >= 70) recommendation = "good";
  else if (overallScore >= 55 && safetyScore >= 60) recommendation = "monitor";
  else if (overallScore >= 40 && safetyScore >= 50)
    recommendation = "service_soon";
  else if (safetyScore < 50) recommendation = "immediate_action";
  else recommendation = "replace";

  let replacementUrgency: DecisionMetrics["replacementUrgency"];
  if (safetyScore < 50 || battery.cellImbalance > 200)
    replacementUrgency = "critical";
  else if (overallScore < 40 || battery.batSOH < 60)
    replacementUrgency = "high";
  else if (overallScore < 55 || battery.batSOH < 70)
    replacementUrgency = "medium";
  else if (overallScore < 70 || battery.batSOH < 80) replacementUrgency = "low";
  else replacementUrgency = "none";

  const riskFactors: DecisionMetrics["riskFactors"] = [];
  if (battery.batSOH < 70)
    riskFactors.push({
      factor: "Critical SOH Level (<70%)",
      severity: "critical",
      impact: "Reduced capacity affects operational range and reliability",
    });
  if (battery.batSOH < 80 && battery.batSOH >= 70)
    riskFactors.push({
      factor: "Low State of Health (70-80%)",
      severity: "high",
      impact: "Capacity degradation accelerating",
    });
  if (battery.cellImbalance > 150)
    riskFactors.push({
      factor: "Severe Cell Imbalance (>150mV)",
      severity: "critical",
      impact: "Risk of cell damage and thermal runaway",
    });
  if (battery.cellImbalance > 100 && battery.cellImbalance <= 150)
    riskFactors.push({
      factor: "High Cell Imbalance (100-150mV)",
      severity: "high",
      impact: "Accelerated degradation of weaker cells",
    });
  if (battery.resistanceIncrease > 40)
    riskFactors.push({
      factor: "High Internal Resistance Increase (>40%)",
      severity: "high",
      impact: "Reduced power delivery and increased heat generation",
    });
  if (battery.overTempEvents > 5)
    riskFactors.push({
      factor: "Frequent Over-Temperature Events",
      severity: "high",
      impact: "Accelerated aging and safety risk",
    });
  if (battery.deepDischargeCount > battery.batCycleCount * 0.25)
    riskFactors.push({
      factor: "Excessive Deep Discharge Cycles",
      severity: "medium",
      impact: "Reduced battery lifespan",
    });
  if (battery.fastChargeCount > battery.batCycleCount * 0.4)
    riskFactors.push({
      factor: "High Fast Charging Usage (>40%)",
      severity: "medium",
      impact: "Accelerated capacity fade",
    });
  if (battery.coulombicEfficiency < 95)
    riskFactors.push({
      factor: "Low Coulombic Efficiency (<95%)",
      severity: "medium",
      impact: "Energy losses and potential internal issues",
    });
  if (battery.capacityFade > 20)
    riskFactors.push({
      factor: "High Capacity Fade (>20%)",
      severity: "high",
      impact: "Significant performance degradation",
    });
  if (battery.ageInDays > 500)
    riskFactors.push({
      factor: "Advanced Battery Age (>500 days)",
      severity: "low",
      impact: "Natural aging effects",
    });

  const strengths: DecisionMetrics["strengths"] = [];
  if (battery.batSOH >= 90)
    strengths.push({
      strength: "Excellent State of Health (≥90%)",
      benefit: "Near-optimal capacity retention",
    });
  if (battery.cellImbalance < 50)
    strengths.push({
      strength: "Well-Balanced Cells (<50mV)",
      benefit: "Even aging and optimal performance",
    });
  if (battery.coulombicEfficiency >= 98)
    strengths.push({
      strength: "High Coulombic Efficiency (≥98%)",
      benefit: "Minimal energy losses",
    });
  if (battery.resistanceIncrease < 20)
    strengths.push({
      strength: "Low Resistance Increase (<20%)",
      benefit: "Maintained power delivery capability",
    });
  if (battery.overTempEvents === 0)
    strengths.push({
      strength: "No Over-Temperature Events",
      benefit: "Optimal thermal management",
    });
  if (battery.batCycleCount < 200)
    strengths.push({
      strength: "Low Cycle Count (<200)",
      benefit: "Significant remaining lifespan",
    });
  if (battery.avgOperatingTemp < 30 && battery.avgOperatingTemp > 15)
    strengths.push({
      strength: "Optimal Operating Temperature",
      benefit: "Ideal conditions for longevity",
    });
  if (battery.deepDischargeCount < battery.batCycleCount * 0.15)
    strengths.push({
      strength: "Minimal Deep Discharges",
      benefit: "Extended battery life",
    });

  const expectedLifeCycles = 600;
  const remainingCycles = Math.max(
    0,
    expectedLifeCycles - battery.batCycleCount
  );
  const avgCyclesPerDay = battery.batCycleCount / battery.ageInDays;
  const estimatedRemainingLife = Math.floor(
    remainingCycles / (avgCyclesPerDay * 30)
  );

  const confidenceLevel = Math.min(95, 70 + battery.ageInDays / 10);

  const nextMaintenanceDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  let predictedFailureRisk = 0;
  if (battery.cellImbalance > 150) predictedFailureRisk += 30;
  if (battery.batSOH < 70) predictedFailureRisk += 25;
  if (battery.overTempEvents > 5) predictedFailureRisk += 20;
  if (battery.resistanceIncrease > 40) predictedFailureRisk += 15;
  if (battery.deepDischargeCount > battery.batCycleCount * 0.3)
    predictedFailureRisk += 10;
  predictedFailureRisk = Math.min(100, predictedFailureRisk);

  const costOfReplacement = 350;
  const costOfDelayedReplacement =
    costOfReplacement * (1 + (predictedFailureRisk / 100) * 0.5);

  const recommendedActions: DecisionMetrics["recommendedActions"] = [];
  if (battery.cellImbalance > 100)
    recommendedActions.push({
      action: "Perform cell balancing procedure",
      priority: "high",
      expectedImpact: "Reduce imbalance by 30-50%",
    });
  if (battery.fastChargeCount > battery.batCycleCount * 0.4)
    recommendedActions.push({
      action: "Reduce fast charging frequency",
      priority: "medium",
      expectedImpact: "Slow capacity fade rate by 20%",
    });
  if (battery.overTempEvents > 3)
    recommendedActions.push({
      action: "Improve cooling system",
      priority: "high",
      expectedImpact: "Prevent thermal degradation",
    });
  if (battery.deepDischargeCount > battery.batCycleCount * 0.25)
    recommendedActions.push({
      action: "Implement SOC limits (20-80%)",
      priority: "medium",
      expectedImpact: "Extend lifespan by 15-25%",
    });
  if (battery.batSOH < 75)
    recommendedActions.push({
      action: "Schedule battery replacement within 2 months",
      priority: "critical",
      expectedImpact: "Prevent unexpected failure",
    });
  if (battery.coulombicEfficiency < 95)
    recommendedActions.push({
      action: "Investigate internal shorts or leakage",
      priority: "high",
      expectedImpact: "Identify potential safety issues",
    });

  return {
    overallScore,
    healthScore,
    performanceScore,
    safetyScore,
    longevityScore,
    recommendation,
    replacementUrgency,
    riskFactors,
    strengths,
    estimatedRemainingLife,
    estimatedRemainingCycles: remainingCycles,
    confidenceLevel,
    nextMaintenanceDate,
    predictedFailureRisk,
    costOfReplacement,
    costOfDelayedReplacement,
    recommendedActions,
  };
};