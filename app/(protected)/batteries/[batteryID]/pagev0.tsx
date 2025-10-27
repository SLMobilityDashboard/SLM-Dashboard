"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  ComposedChart,
} from "recharts";
import {
  Battery,
  Activity,
  ThermometerSun,
  Zap,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Gauge,
  RefreshCw,
  ArrowLeft,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Droplet,
  Flame,
  Shield,
  BarChart3,
  Package,
  Calendar,
  Timer,
  Percent,
  Waves,
  CircuitBoard,
  FileText,
  Zap as Lightning,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface CellVoltage {
  cellId: number;
  voltage: number;
  deviation: number;
  status: "normal" | "warning" | "critical";
}

interface ChargingSession {
  date: string;
  chargeDuration: number;
  energyAdded: number;
  startSOC: number;
  endSOC: number;
  avgChargingCurrent: number;
  peakTemp: number;
  efficiency: number;
}

interface DischargingSession {
  date: string;
  dischargeDuration: number;
  energyUsed: number;
  startSOC: number;
  endSOC: number;
  avgDischargeCurrent: number;
  peakTemp: number;
  depthOfDischarge: number;
}

interface BatteryDetail {
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

interface DecisionMetrics {
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

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

const generateBatteryDetail = (bmsId: string): BatteryDetail => {
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

// ============================================================================
// DECISION METRICS CALCULATOR
// ============================================================================

const calculateDecisionMetrics = (battery: BatteryDetail): DecisionMetrics => {
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getStatusColor = (status: string) => {
  switch (status) {
    case "online":
      return "text-green-400 bg-green-500/10 border-green-500/20";
    case "offline":
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    case "stale":
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    case "error":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
};

const getCellStatusColor = (status: string) => {
  switch (status) {
    case "normal":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-500";
    case "critical":
      return "bg-red-500";
    default:
      return "bg-slate-500";
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "text-red-400 bg-red-500/10";
    case "high":
      return "text-orange-400 bg-orange-500/10";
    case "medium":
      return "text-yellow-400 bg-yellow-500/10";
    case "low":
      return "text-blue-400 bg-blue-500/10";
    default:
      return "text-slate-400 bg-slate-500/10";
  }
};

const getRecommendationColor = (rec: string) => {
  switch (rec) {
    case "excellent":
      return "text-green-400 bg-green-500/10 border-green-500/20";
    case "good":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "monitor":
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    case "service_soon":
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    case "replace":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    case "immediate_action":
      return "text-red-500 bg-red-500/20 border-red-500/30";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
};

const getRecommendationLabel = (rec: string) => {
  switch (rec) {
    case "excellent":
      return "Excellent Condition";
    case "good":
      return "Good Condition";
    case "monitor":
      return "Monitor Closely";
    case "service_soon":
      return "Service Soon";
    case "replace":
      return "Replace Recommended";
    case "immediate_action":
      return "Immediate Action Required";
    default:
      return "Unknown";
  }
};

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case "none":
      return "text-green-400 bg-green-500/10";
    case "low":
      return "text-blue-400 bg-blue-500/10";
    case "medium":
      return "text-yellow-400 bg-yellow-500/10";
    case "high":
      return "text-orange-400 bg-orange-500/10";
    case "critical":
      return "text-red-400 bg-red-500/10";
    default:
      return "text-slate-400 bg-slate-500/10";
  }
};

const formatNumber = (num: number) =>
  new Intl.NumberFormat("en-US").format(Math.floor(num));

// ============================================================================
// SCORE CARD COMPONENT
// ============================================================================

const ScoreCard = ({ label, score, icon: Icon, color, subtitle }: any) => (
  <Card className="bg-slate-900/50 border-slate-700/50">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${color}`} />
          <div>
            <span className="text-slate-300 font-medium block">{label}</span>
            {subtitle && (
              <span className="text-slate-500 text-xs">{subtitle}</span>
            )}
          </div>
        </div>
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color.replace("text-", "bg-")}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </CardContent>
  </Card>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BatteryDetailAnalytics = () => {
  const [battery, setBattery] = useState<BatteryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setTimeout(() => {
      setBattery(generateBatteryDetail("BMS-BAT-0001"));
      setLoading(false);
    }, 500);
  }, []);

  const decisionMetrics = useMemo(() => {
    if (!battery) return null;
    return calculateDecisionMetrics(battery);
  }, [battery]);

  if (loading || !battery || !decisionMetrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-cyan-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading battery analytics...</span>
        </div>
      </div>
    );
  }

  const radarData = [
    { metric: "Health", value: decisionMetrics.healthScore },
    { metric: "Performance", value: decisionMetrics.performanceScore },
    { metric: "Safety", value: decisionMetrics.safetyScore },
    { metric: "Longevity", value: decisionMetrics.longevityScore },
    { metric: "Efficiency", value: battery.coulombicEfficiency },
  ];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899"];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">
                {battery.bmsId}
              </h1>
              <p className="text-slate-400">
                Advanced Battery Analytics & Decision Intelligence
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Critical Alerts */}
        {decisionMetrics.recommendation === "immediate_action" && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="text-red-400 font-bold text-lg">
                    IMMEDIATE ACTION REQUIRED
                  </h3>
                  <p className="text-slate-300 text-sm">
                    This battery requires immediate attention. Safety risk
                    detected.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="h-4 w-4 text-cyan-400" />
                <p className="text-slate-400 text-xs">State of Health</p>
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {battery.batSOH}%
              </p>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-cyan-500"
                  style={{ width: `${battery.batSOH}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Battery className="h-4 w-4 text-green-400" />
                <p className="text-slate-400 text-xs">State of Charge</p>
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {battery.batSOC}%
              </p>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${battery.batSOC}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-400" />
                <p className="text-slate-400 text-xs">Capacity</p>
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {battery.currentCapacity.toFixed(1)}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                of {battery.nominalCapacity}Ah
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 text-purple-400" />
                <p className="text-slate-400 text-xs">Cycle Count</p>
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {battery.batCycleCount}
              </p>
              <p className="text-slate-500 text-xs mt-1">of ~600 expected</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CircuitBoard className="h-4 w-4 text-yellow-400" />
                <p className="text-slate-400 text-xs">Cell Balance</p>
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {battery.cellImbalance}
              </p>
              <p
                className={`text-xs mt-1 ${
                  battery.cellImbalance > 100
                    ? "text-red-400"
                    : "text-slate-500"
                }`}
              >
                {battery.cellImbalance > 100 ? "High imbalance" : "mV delta"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ThermometerSun className="h-4 w-4 text-orange-400" />
                <p className="text-slate-400 text-xs">Temperature</p>
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {battery.batTemp.toFixed(1)}°C
              </p>
              <p
                className={`text-xs mt-1 ${
                  battery.batTemp > 40 ? "text-red-400" : "text-slate-500"
                }`}
              >
                {battery.batTemp > 40 ? "High temp" : "Normal"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Decision Support Panel */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <AlertCircle className="h-5 w-5 text-cyan-400" />
              Executive Decision Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Scores and Metrics */}
              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm mb-2">
                    Overall Health Score
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-bold text-cyan-400">
                      {decisionMetrics.overallScore}
                    </div>
                    <div className="flex-1">
                      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                          style={{ width: `${decisionMetrics.overallScore}%` }}
                        />
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        Confidence: {decisionMetrics.confidenceLevel}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-400 text-sm mb-2">
                      Recommendation
                    </p>
                    <Badge
                      className={`${getRecommendationColor(
                        decisionMetrics.recommendation
                      )} text-sm px-3 py-1`}
                    >
                      {getRecommendationLabel(decisionMetrics.recommendation)}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-slate-400 text-sm mb-2">
                      Replacement Urgency
                    </p>
                    <Badge
                      className={`${getUrgencyColor(
                        decisionMetrics.replacementUrgency
                      )} text-sm px-3 py-1`}
                    >
                      {decisionMetrics.replacementUrgency.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">
                      Remaining Life
                    </p>
                    <p className="text-xl font-bold text-slate-100">
                      {decisionMetrics.estimatedRemainingLife} months
                    </p>
                    <p className="text-slate-500 text-xs">
                      {decisionMetrics.estimatedRemainingCycles} cycles
                    </p>
                  </div>

                  <div className="p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">Failure Risk</p>
                    <p className="text-xl font-bold text-slate-100">
                      {decisionMetrics.predictedFailureRisk}%
                    </p>
                    <p className="text-slate-500 text-xs">Next 6 months</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/50 rounded">
                  <p className="text-slate-400 text-xs mb-2">Cost Analysis</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Replacement Cost:</span>
                      <span className="text-slate-100 font-medium">
                        ${decisionMetrics.costOfReplacement}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">
                        Delayed Replacement:
                      </span>
                      <span className="text-orange-400 font-medium">
                        ${decisionMetrics.costOfDelayedReplacement.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t border-slate-700">
                      <span className="text-slate-300">Potential Loss:</span>
                      <span className="text-red-400 font-bold">
                        $
                        {(
                          decisionMetrics.costOfDelayedReplacement -
                          decisionMetrics.costOfReplacement
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Radar Chart */}
              <div>
                <p className="text-slate-400 text-sm mb-2">
                  Performance Metrics
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#475569" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: "#94a3b8" }}
                    />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke="#06b6d4"
                      fill="#06b6d4"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="pt-4 border-t border-slate-700">
              <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                Recommended Actions ({decisionMetrics.recommendedActions.length}
                )
              </h3>
              <div className="space-y-2">
                {decisionMetrics.recommendedActions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-slate-800/50 rounded"
                  >
                    <Badge
                      className={getSeverityColor(action.priority)}
                      variant="outline"
                    >
                      {action.priority}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-slate-200 font-medium text-sm">
                        {action.action}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {action.expectedImpact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Factors and Strengths */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700">
              <div>
                <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  Risk Factors ({decisionMetrics.riskFactors.length})
                </h3>
                {decisionMetrics.riskFactors.length > 0 ? (
                  <div className="space-y-2">
                    {decisionMetrics.riskFactors.map((risk, index) => (
                      <div key={index} className="p-3 bg-slate-800/50 rounded">
                        <div className="flex items-start gap-2 mb-1">
                          <Badge
                            className={getSeverityColor(risk.severity)}
                            variant="outline"
                          >
                            {risk.severity}
                          </Badge>
                          <p className="text-slate-200 text-sm font-medium flex-1">
                            {risk.factor}
                          </p>
                        </div>
                        <p className="text-slate-400 text-xs ml-2">
                          {risk.impact}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">
                    No risk factors identified
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Strengths ({decisionMetrics.strengths.length})
                </h3>
                {decisionMetrics.strengths.length > 0 ? (
                  <div className="space-y-2">
                    {decisionMetrics.strengths.map((strength, index) => (
                      <div key={index} className="p-3 bg-slate-800/50 rounded">
                        <p className="text-slate-200 text-sm font-medium mb-1">
                          {strength.strength}
                        </p>
                        <p className="text-slate-400 text-xs">
                          {strength.benefit}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">
                    No strengths identified
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard
            label="Health Score"
            score={decisionMetrics.healthScore}
            icon={Activity}
            color="text-green-400"
            subtitle="Capacity & SOH"
          />
          <ScoreCard
            label="Performance Score"
            score={decisionMetrics.performanceScore}
            icon={Gauge}
            color="text-blue-400"
            subtitle="Efficiency & Power"
          />
          <ScoreCard
            label="Safety Score"
            score={decisionMetrics.safetyScore}
            icon={Shield}
            color="text-purple-400"
            subtitle="Thermal & Balance"
          />
          <ScoreCard
            label="Longevity Score"
            score={decisionMetrics.longevityScore}
            icon={Timer}
            color="text-cyan-400"
            subtitle="Age & Usage"
          />
        </div>

        {/* Detailed Analytics Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="bg-slate-900/50 border border-slate-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cells">Cell Analysis</TabsTrigger>
            <TabsTrigger value="capacity">Capacity & SOH</TabsTrigger>
            <TabsTrigger value="thermal">Thermal Management</TabsTrigger>
            <TabsTrigger value="charging">Charging Analysis</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="lifecycle">Lifecycle & Usage</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Battery Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">BMS ID</span>
                    <span className="text-slate-200 font-medium">
                      {battery.bmsId}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Manufacturer</span>
                    <span className="text-slate-200 font-medium">
                      {battery.batteryManufacturer}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Model</span>
                    <span className="text-slate-200 font-medium">
                      {battery.batteryModel}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Manufacture Date</span>
                    <span className="text-slate-200 font-medium">
                      {battery.manufactureDate.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">First Usage Date</span>
                    <span className="text-slate-200 font-medium">
                      {battery.firstUsageDate.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Age</span>
                    <span className="text-slate-200 font-medium">
                      {battery.ageInDays} days
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Status</span>
                    <Badge className={getStatusColor(battery.status)}>
                      {battery.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Current Measurements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Pack Voltage</span>
                    <span className="text-slate-200 font-medium">
                      {battery.batVolt.toFixed(2)}V
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Current</span>
                    <span className="text-slate-200 font-medium">
                      {battery.batCurrent.toFixed(2)}A
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Temperature</span>
                    <span className="text-slate-200 font-medium">
                      {battery.batTemp.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Internal Resistance</span>
                    <span className="text-slate-200 font-medium">
                      {battery.internalResistance.toFixed(1)}mΩ
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Coulombic Efficiency</span>
                    <span className="text-slate-200 font-medium">
                      {battery.coulombicEfficiency.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Total Charge</span>
                    <span className="text-slate-200 font-medium">
                      {battery.totalChargeAh.toFixed(0)}Ah
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Total Discharge</span>
                    <span className="text-slate-200 font-medium">
                      {battery.totalDischargeAh.toFixed(0)}Ah
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SOC and Temperature Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Percent className="h-5 w-5 text-green-400" />
                    State of Charge Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={battery.stateOfChargeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="range"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fill: "#94a3b8" }}
                        label={{
                          value: "Hours",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#94a3b8",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                      />
                      <Bar dataKey="hours" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">Analysis</p>
                    <p className="text-slate-200 text-sm">
                      Battery spends most time (34%) in the 60-80% SOC range,
                      which is optimal for longevity.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <ThermometerSun className="h-5 w-5 text-orange-400" />
                    Temperature Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={battery.temperatureDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="range"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fill: "#94a3b8" }}
                        label={{
                          value: "Hours",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#94a3b8",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                      />
                      <Bar dataKey="hours" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">Analysis</p>
                    <p className="text-slate-200 text-sm">
                      {battery.temperatureDistribution[3].percentage > 15
                        ? "Elevated temperature exposure detected. Consider improving cooling."
                        : "Temperature distribution is within optimal range."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cell Analysis Tab */}
          <TabsContent value="cells" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <CircuitBoard className="h-5 w-5 text-cyan-400" />
                  Individual Cell Voltages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                  {battery.cellVoltages.map((cell) => (
                    <div
                      key={cell.cellId}
                      className="p-3 bg-slate-800/50 rounded border border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-xs">
                          Cell {cell.cellId}
                        </span>
                        <div
                          className={`w-2 h-2 rounded-full ${getCellStatusColor(
                            cell.status
                          )}`}
                        />
                      </div>
                      <p className="text-slate-100 font-bold text-lg">
                        {cell.voltage.toFixed(3)}V
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          Math.abs(cell.deviation) > 50
                            ? "text-orange-400"
                            : "text-slate-500"
                        }`}
                      >
                        {cell.deviation > 0 ? "+" : ""}
                        {cell.deviation}mV
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-sm mb-2">
                      Maximum Cell Voltage
                    </p>
                    <p className="text-2xl font-bold text-slate-100">
                      {battery.maxCellVoltage.toFixed(3)}V
                    </p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-sm mb-2">
                      Minimum Cell Voltage
                    </p>
                    <p className="text-2xl font-bold text-slate-100">
                      {battery.minCellVoltage.toFixed(3)}V
                    </p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-sm mb-2">
                      Cell Imbalance
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        battery.cellImbalance > 100
                          ? "text-red-400"
                          : "text-slate-100"
                      }`}
                    >
                      {battery.cellImbalance}mV
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Waves className="h-5 w-5 text-blue-400" />
                  Cell Balance History (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={battery.cellBalanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8" }}
                      label={{
                        value: "Imbalance (mV)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#94a3b8",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                      labelStyle={{ color: "#94a3b8" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="imbalance"
                      stroke="#3b82f6"
                      name="Avg Imbalance"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxDev"
                      stroke="#ef4444"
                      name="Max Deviation"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-slate-800/50 rounded">
                  <p className="text-slate-400 text-xs mb-1">Trend Analysis</p>
                  <p className="text-slate-200 text-sm">
                    {battery.cellBalanceHistory[
                      battery.cellBalanceHistory.length - 1
                    ].imbalance > battery.cellBalanceHistory[0].imbalance
                      ? "Cell imbalance is increasing. Balancing procedure recommended."
                      : "Cell balance is stable or improving."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Capacity & SOH Tab */}
          <TabsContent value="capacity" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-yellow-400" />
                    State of Health Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={battery.sohHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: "#94a3b8" }}
                        label={{
                          value: "SOH (%)",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#94a3b8",
                        }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: "#94a3b8" }}
                        label={{
                          value: "Capacity (Ah)",
                          angle: 90,
                          position: "insideRight",
                          fill: "#94a3b8",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                      />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="soh"
                        fill="#eab308"
                        stroke="#eab308"
                        fillOpacity={0.3}
                        name="SOH %"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="capacity"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        name="Capacity (Ah)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-400" />
                    Capacity Fade Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={battery.capacityHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                      />
                      <YAxis tick={{ fill: "#94a3b8" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="capacity"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                        name="Capacity (Ah)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Capacity Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-sm mb-2">
                      Nominal Capacity
                    </p>
                    <p className="text-2xl font-bold text-slate-100">
                      {battery.nominalCapacity}Ah
                    </p>
                    <p className="text-slate-500 text-xs mt-1">Factory rated</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-sm mb-2">
                      Current Capacity
                    </p>
                    <p className="text-2xl font-bold text-slate-100">
                      {battery.currentCapacity.toFixed(2)}Ah
                    </p>
                    <p className="text-slate-500 text-xs mt-1">Measured</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-sm mb-2">Capacity Fade</p>
                    <p
                      className={`text-2xl font-bold ${
                        battery.capacityFade > 20
                          ? "text-red-400"
                          : "text-slate-100"
                      }`}
                    >
                      {battery.capacityFade.toFixed(2)}%
                    </p>
                    <p className="text-slate-500 text-xs mt-1">Total loss</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-sm mb-2">Fade Rate</p>
                    <p className="text-2xl font-bold text-slate-100">
                      {(
                        (battery.capacityFade / battery.ageInDays) *
                        30
                      ).toFixed(3)}
                      %
                    </p>
                    <p className="text-slate-500 text-xs mt-1">Per month</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Lightning className="h-5 w-5 text-purple-400" />
                  Internal Resistance Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={battery.resistanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8" }}
                      label={{
                        value: "Resistance (mΩ)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#94a3b8",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                      labelStyle={{ color: "#94a3b8" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="resistance"
                      stroke="#a855f7"
                      fill="#a855f7"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">
                      Current Resistance
                    </p>
                    <p className="text-xl font-bold text-slate-100">
                      {battery.internalResistance.toFixed(1)}mΩ
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">
                      Resistance Increase
                    </p>
                    <p
                      className={`text-xl font-bold ${
                        battery.resistanceIncrease > 30
                          ? "text-orange-400"
                          : "text-slate-100"
                      }`}
                    >
                      {battery.resistanceIncrease.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">
                      Expected at EOL
                    </p>
                    <p className="text-xl font-bold text-slate-100">
                      {(battery.internalResistance * 1.5).toFixed(1)}mΩ
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Thermal Management Tab */}
          <TabsContent value="thermal" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <ThermometerSun className="h-5 w-5 text-orange-400" />
                  Temperature Sensors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {battery.tempSensors.map((sensor, index) => (
                    <div key={index} className="p-4 bg-slate-800/50 rounded">
                      <p className="text-slate-400 text-xs mb-2">
                        {sensor.location}
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          sensor.temp > 40 ? "text-red-400" : "text-slate-100"
                        }`}
                      >
                        {sensor.temp}°C
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          sensor.temp > 40 ? "text-red-400" : "text-slate-500"
                        }`}
                      >
                        {sensor.temp > 40 ? "High temp" : "Normal"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-red-400" />
                    Temperature History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={battery.tempHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                      />
                      <YAxis
                        tick={{ fill: "#94a3b8" }}
                        label={{
                          value: "Temperature (°C)",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#94a3b8",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="temp"
                        stroke="#f97316"
                        name="Battery Temp"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="ambient"
                        stroke="#06b6d4"
                        name="Ambient Temp"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Thermal Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">
                          Current Temperature
                        </span>
                        <span
                          className={`text-2xl font-bold ${
                            battery.batTemp > 40
                              ? "text-red-400"
                              : "text-slate-100"
                          }`}
                        >
                          {battery.batTemp.toFixed(1)}°C
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">
                          Average Operating Temp
                        </span>
                        <span className="text-xl font-bold text-slate-100">
                          {battery.avgOperatingTemp.toFixed(1)}°C
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">
                          Max Recorded Temp
                        </span>
                        <span
                          className={`text-xl font-bold ${
                            battery.maxRecordedTemp > 50
                              ? "text-red-400"
                              : "text-orange-400"
                          }`}
                        >
                          {battery.maxRecordedTemp.toFixed(1)}°C
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">
                          Min Recorded Temp
                        </span>
                        <span className="text-xl font-bold text-slate-100">
                          {battery.minRecordedTemp.toFixed(1)}°C
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Over-Temp Events</span>
                        <span
                          className={`text-xl font-bold ${
                            battery.overTempEvents > 5
                              ? "text-red-400"
                              : "text-slate-100"
                          }`}
                        >
                          {battery.overTempEvents}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">
                          Under-Temp Events
                        </span>
                        <span className="text-xl font-bold text-slate-100">
                          {battery.underTempEvents}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Charging Analysis Tab */}
          <TabsContent value="charging" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    Charging Rate Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={battery.chargingRateDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ rate, percentage }) => `${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {battery.chargingRateDistribution.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {battery.chargingRateDistribution.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-slate-800/50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="text-slate-200 text-sm">
                            {item.rate}
                          </span>
                        </div>
                        <span className="text-slate-100 font-medium">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                    Cycle Depth Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={battery.cycleDepthDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="depth"
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                      />
                      <YAxis tick={{ fill: "#94a3b8" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                      />
                      <Bar dataKey="count" fill="#a855f7" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">Analysis</p>
                    <p className="text-slate-200 text-sm">
                      {battery.deepDischargeCount > battery.batCycleCount * 0.25
                        ? "High number of deep discharge cycles detected. This accelerates aging."
                        : "Good distribution of cycle depths. Shallow cycles extend lifespan."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Recent Charging Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-2 text-slate-400 text-sm">
                          Date
                        </th>
                        <th className="text-left py-3 px-2 text-slate-400 text-sm">
                          Duration
                        </th>
                        <th className="text-left py-3 px-2 text-slate-400 text-sm">
                          Energy
                        </th>
                        <th className="text-left py-3 px-2 text-slate-400 text-sm">
                          SOC Range
                        </th>
                        <th className="text-left py-3 px-2 text-slate-400 text-sm">
                          Avg Current
                        </th>
                        <th className="text-left py-3 px-2 text-slate-400 text-sm">
                          Peak Temp
                        </th>
                        <th className="text-left py-3 px-2 text-slate-400 text-sm">
                          DoD
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {battery.dischargingSessions
                        .slice(0, 10)
                        .map((session, index) => (
                          <tr key={index} className="border-b border-slate-800">
                            <td className="py-3 px-2 text-slate-200 text-sm">
                              {session.date}
                            </td>
                            <td className="py-3 px-2 text-slate-200 text-sm">
                              {session.dischargeDuration}h
                            </td>
                            <td className="py-3 px-2 text-slate-200 text-sm">
                              {session.energyUsed}Ah
                            </td>
                            <td className="py-3 px-2 text-slate-200 text-sm">
                              {session.startSOC}% → {session.endSOC}%
                            </td>
                            <td className="py-3 px-2 text-slate-200 text-sm">
                              {session.avgDischargeCurrent}A
                            </td>
                            <td
                              className={`py-3 px-2 text-sm ${
                                session.peakTemp > 40
                                  ? "text-orange-400"
                                  : "text-slate-200"
                              }`}
                            >
                              {session.peakTemp}°C
                            </td>
                            <td
                              className={`py-3 px-2 text-sm ${
                                session.depthOfDischarge > 80
                                  ? "text-red-400"
                                  : "text-slate-200"
                              }`}
                            >
                              {session.depthOfDischarge}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-400" />
                  Coulombic & Energy Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={battery.efficiencyHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                    />
                    <YAxis
                      domain={[90, 100]}
                      tick={{ fill: "#94a3b8" }}
                      label={{
                        value: "Efficiency (%)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#94a3b8",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                      labelStyle={{ color: "#94a3b8" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="coulombic"
                      stroke="#10b981"
                      name="Coulombic Efficiency"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="#3b82f6"
                      name="Energy Efficiency"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-sm mb-2">
                      Current Coulombic Efficiency
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        battery.coulombicEfficiency < 95
                          ? "text-orange-400"
                          : "text-slate-100"
                      }`}
                    >
                      {battery.coulombicEfficiency.toFixed(2)}%
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      {battery.coulombicEfficiency >= 98
                        ? "Excellent"
                        : battery.coulombicEfficiency >= 95
                        ? "Good"
                        : "Needs attention"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-sm mb-2">
                      Energy Efficiency
                    </p>
                    <p className="text-2xl font-bold text-slate-100">
                      {
                        battery.efficiencyHistory[
                          battery.efficiencyHistory.length - 1
                        ].energy
                      }
                      %
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      Round-trip efficiency
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    Voltage & Current Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={battery.voltageHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: "#94a3b8" }}
                        label={{
                          value: "Voltage (V)",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#94a3b8",
                        }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: "#94a3b8" }}
                        label={{
                          value: "Current (A)",
                          angle: 90,
                          position: "insideRight",
                          fill: "#94a3b8",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="voltage"
                        stroke="#eab308"
                        name="Voltage"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="current"
                        stroke="#06b6d4"
                        name="Current"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <span className="text-slate-400">
                        Current Charge Rate
                      </span>
                      <span className="text-slate-200 font-medium">
                        {battery.chargeRate}C
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <span className="text-slate-400">
                        Current Discharge Rate
                      </span>
                      <span className="text-slate-200 font-medium">
                        {battery.dischargeRate}C
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <span className="text-slate-400">Max Charge Rate</span>
                      <span className="text-slate-200 font-medium">
                        {battery.maxChargeRate}C
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <span className="text-slate-400">Max Discharge Rate</span>
                      <span className="text-slate-200 font-medium">
                        {battery.maxDischargeRate}C
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <span className="text-slate-400">
                        Total Energy Charged
                      </span>
                      <span className="text-slate-200 font-medium">
                        {battery.totalChargeAh.toFixed(0)}Ah
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400">
                        Total Energy Discharged
                      </span>
                      <span className="text-slate-200 font-medium">
                        {battery.totalDischargeAh.toFixed(0)}Ah
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Lifecycle & Usage Tab */}
          <TabsContent value="lifecycle" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-blue-400" />
                  Cycle Count Progression
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={battery.cycleHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8" }}
                      label={{
                        value: "Cycles",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#94a3b8",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                      labelStyle={{ color: "#94a3b8" }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="cycles"
                      fill="#3b82f6"
                      stroke="#3b82f6"
                      fillOpacity={0.3}
                      name="Total Cycles"
                    />
                    <Line
                      type="monotone"
                      dataKey="deepCycles"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Deep Cycles"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">Total Cycles</p>
                    <p className="text-xl font-bold text-slate-100">
                      {battery.batCycleCount}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">Deep Cycles</p>
                    <p className="text-xl font-bold text-slate-100">
                      {battery.deepDischargeCount}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">
                      Shallow Cycles
                    </p>
                    <p className="text-xl font-bold text-slate-100">
                      {battery.shallowCycleCount}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-400 text-xs mb-1">Fast Charges</p>
                    <p className="text-xl font-bold text-slate-100">
                      {battery.fastChargeCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-400" />
                    Battery Age & Lifecycle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded">
                      <p className="text-slate-400 text-sm mb-2">Battery Age</p>
                      <p className="text-2xl font-bold text-slate-100">
                        {battery.ageInDays} days
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        {Math.floor(battery.ageInDays / 30)} months since first
                        use
                      </p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded">
                      <p className="text-slate-400 text-sm mb-2">
                        Cycles per Day
                      </p>
                      <p className="text-2xl font-bold text-slate-100">
                        {(battery.batCycleCount / battery.ageInDays).toFixed(2)}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        Average usage rate
                      </p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded">
                      <p className="text-slate-400 text-sm mb-2">
                        Expected Lifespan
                      </p>
                      <p className="text-2xl font-bold text-slate-100">
                        {Math.floor(
                          600 / (battery.batCycleCount / battery.ageInDays)
                        )}{" "}
                        days
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        Based on 600 cycle limit
                      </p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded">
                      <p className="text-slate-400 text-sm mb-2">
                        Lifecycle Progress
                      </p>
                      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{
                            width: `${(battery.batCycleCount / 600) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-slate-500 text-xs mt-2">
                        {((battery.batCycleCount / 600) * 100).toFixed(1)}% of
                        expected lifecycle
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-400" />
                    Error History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {battery.errorHistory.length > 0 ? (
                    <div className="space-y-3">
                      {battery.errorHistory.map((error, index) => (
                        <div
                          key={index}
                          className="p-3 bg-slate-800/50 rounded border-l-4 border-orange-500"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              className={getSeverityColor(error.severity)}
                              variant="outline"
                            >
                              {error.severity}
                            </Badge>
                            <span className="text-slate-400 text-xs">
                              {error.date}
                            </span>
                          </div>
                          <p className="text-slate-200 text-sm">
                            {error.error}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-green-400 font-medium">
                          No Error History
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm mt-2">
                        Battery has operated without errors
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100">Usage Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded text-center">
                    <div className="text-3xl font-bold text-cyan-400 mb-2">
                      {battery.batCycleCount}
                    </div>
                    <p className="text-slate-400 text-sm">Total Cycles</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {((battery.batCycleCount / 600) * 100).toFixed(1)}% of
                      lifecycle
                    </p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      {battery.fastChargeCount}
                    </div>
                    <p className="text-slate-400 text-sm">Fast Charges</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {(
                        (battery.fastChargeCount / battery.batCycleCount) *
                        100
                      ).toFixed(1)}
                      % of charges
                    </p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">
                      {battery.deepDischargeCount}
                    </div>
                    <p className="text-slate-400 text-sm">Deep Discharges</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {(
                        (battery.deepDischargeCount / battery.batCycleCount) *
                        100
                      ).toFixed(1)}
                      % of cycles
                    </p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      {battery.thermalEvents}
                    </div>
                    <p className="text-slate-400 text-sm">Thermal Events</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {battery.overTempEvents} over-temp
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BatteryDetailAnalytics;
