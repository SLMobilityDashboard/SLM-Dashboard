export interface CellVoltage {
  cellId: number;
  voltage: number;
  deviation: number;
  status: "normal" | "warning" | "critical";
}

export interface ChargingSession {
  date: string;
  chargeDuration: number;
  energyAdded: number;
  startSOC: number;
  endSOC: number;
  avgChargingCurrent: number;
  peakTemp: number;
  efficiency: number;
}

export interface DischargingSession {
  date: string;
  dischargeDuration: number;
  energyUsed: number;
  startSOC: number;
  endSOC: number;
  avgDischargeCurrent: number;
  peakTemp: number;
  depthOfDischarge: number;
}

export interface BatteryDetail {
  bmsId: string;
  batteryManufacturer: string;
  batteryModel: string;
  manufactureDate: Date;
  firstUsageDate: Date;
  ageInDays: number;
  nominalCapacity: number;
  currentCapacity: number;
  capacityFade: number;
  batSOH: number;
  batSOC: number;
  batVolt: number;
  batCurrent: number;
  batTemp: number;
  batCycleCount: number;
  totalChargeAh: number;
  totalDischargeAh: number;
  coulombicEfficiency: number;
  internalResistance: number;
  resistanceIncrease: number;
  cellVoltages: CellVoltage[];
  cellImbalance: number;
  minCellVoltage: number;
  maxCellVoltage: number;
  avgCellVoltage: number;
  tempSensors: Array<{ location: string; temp: number }>;
  maxRecordedTemp: number;
  minRecordedTemp: number;
  avgOperatingTemp: number;
  thermalEvents: number;
  overTempEvents: number;
  underTempEvents: number;
  chargeRate: number;
  dischargeRate: number;
  maxChargeRate: number;
  maxDischargeRate: number;
  fastChargeCount: number;
  deepDischargeCount: number;
  shallowCycleCount: number;
  batteryError: string;
  errorHistory: Array<{ date: string; error: string; severity: string }>;
  lastUpdate: Date;
  dataAge: number;
  status: "online" | "offline" | "error" | "stale";

  // Historical data
  sohHistory: Array<{ date: string; soh: number; capacity: number }>;
  capacityHistory: Array<{ date: string; capacity: number; fade: number }>;
  resistanceHistory: Array<{ date: string; resistance: number }>;
  tempHistory: Array<{ date: string; temp: number; ambient: number }>;
  voltageHistory: Array<{ date: string; voltage: number; current: number }>;
  cycleHistory: Array<{ date: string; cycles: number; deepCycles: number }>;
  chargingSessions: ChargingSession[];
  dischargingSessions: DischargingSession[];
  cellBalanceHistory: Array<{
    date: string;
    imbalance: number;
    maxDev: number;
  }>;
  efficiencyHistory: Array<{ date: string; coulombic: number; energy: number }>;
  stateOfChargeDistribution: Array<{
    range: string;
    hours: number;
    percentage: number;
  }>;
  temperatureDistribution: Array<{
    range: string;
    hours: number;
    percentage: number;
  }>;
  chargingRateDistribution: Array<{
    rate: string;
    count: number;
    percentage: number;
  }>;
  cycleDepthDistribution: Array<{
    depth: string;
    count: number;
    percentage: number;
  }>;
}

export interface DecisionMetrics {
  overallScore: number;
  healthScore: number;
  performanceScore: number;
  safetyScore: number;
  longevityScore: number;
  recommendation:
    | "excellent"
    | "good"
    | "monitor"
    | "service_soon"
    | "replace"
    | "immediate_action";
  replacementUrgency: "none" | "low" | "medium" | "high" | "critical";
  riskFactors: Array<{
    factor: string;
    severity: "low" | "medium" | "high" | "critical";
    impact: string;
  }>;
  strengths: Array<{ strength: string; benefit: string }>;
  estimatedRemainingLife: number;
  estimatedRemainingCycles: number;
  confidenceLevel: number;
  nextMaintenanceDate: Date;
  predictedFailureRisk: number;
  costOfReplacement: number;
  costOfDelayedReplacement: number;
  recommendedActions: Array<{
    action: string;
    priority: string;
    expectedImpact: string;
  }>;
}