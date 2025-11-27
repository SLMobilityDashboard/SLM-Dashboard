"use client";

import { useState, useMemo } from "react";

// Sample customer segments data with detailed information
export const SAMPLE_SEGMENTS = [
  {
    name: "Power Riders",
    count: 125,
    avgSwaps: 14,
    avgHomeCharges: 2,
    avgRevenue: 1840,
    customers: Array.from({ length: 125 }, (_, i) => ({
      id: `PR${i + 1}`,
      avgSwaps: 12 + Math.random() * 6,
      avgHomeCharges: 1 + Math.random() * 3,
      avgTotalRevenue: 1600 + Math.random() * 480,
    })),
  },
  {
    name: "Steady Riders",
    count: 200,
    avgSwaps: 8,
    avgHomeCharges: 4,
    avgRevenue: 1280,
    customers: Array.from({ length: 200 }, (_, i) => ({
      id: `SR${i + 1}`,
      avgSwaps: 6 + Math.random() * 4,
      avgHomeCharges: 3 + Math.random() * 2,
      avgTotalRevenue: 1100 + Math.random() * 360,
    })),
  },
  {
    name: "Casual Commuters",
    count: 300,
    avgSwaps: 4,
    avgHomeCharges: 2,
    avgRevenue: 640,
    customers: Array.from({ length: 300 }, (_, i) => ({
      id: `CC${i + 1}`,
      avgSwaps: 3 + Math.random() * 2,
      avgHomeCharges: 1 + Math.random() * 2,
      avgTotalRevenue: 500 + Math.random() * 280,
    })),
  },
  {
    name: "Home Energizers",
    count: 150,
    avgSwaps: 2,
    avgHomeCharges: 10,
    avgRevenue: 1040,
    customers: Array.from({ length: 150 }, (_, i) => ({
      id: `HE${i + 1}`,
      avgSwaps: 1 + Math.random() * 2,
      avgHomeCharges: 8 + Math.random() * 4,
      avgTotalRevenue: 900 + Math.random() * 280,
    })),
  },
];

// Pricing constants
export const PRICE_PER_SWAP = 250;
export const PRICE_PER_HOME_CHARGE = 150;
export const COST_PER_SWAP = 200;
export const COST_PER_HOME_CHARGE = 50;

// Calculate baseline for a segment
export const calculateBaseline = (segment) => {
  console.log("Calculating baseline for segment:", segment);
  if (
    !segment ||
    segment.count === undefined ||
    segment.count === null ||
    segment.count === 0
  ) {
    return {
      segment: segment?.name || "Unknown",
      customerCount: 0,
      weeklyRevenue: 0,
      annualRevenue: 0,
      annualSwapCosts: 0,
      annualHomeCosts: 0,
      annualCosts: 0,
      profit: 0,
      margin: 0,
      profitPerCustomer: 0,
      weeklyProfitPerCustomer: 0,
      revenuePerCustomer: 0,
      costPerCustomer: 0,
    };
  }

  const avgSwaps = isNaN(segment.avgSwaps) ? 0 : Number(segment.avgSwaps);
  const avgHomeCharges = isNaN(segment.avgHomeCharges)
    ? 0
    : Number(segment.avgHomeCharges);
  const count = isNaN(segment.count) ? 0 : Number(segment.count);

  const weeklyRevenue =
    avgSwaps * PRICE_PER_SWAP + avgHomeCharges * PRICE_PER_HOME_CHARGE;
  const annualRevenue = weeklyRevenue * count * 52;

  const annualSwapCosts = count * avgSwaps * COST_PER_SWAP * 52;
  const annualHomeCosts = count * avgHomeCharges * COST_PER_HOME_CHARGE * 52;
  const annualCosts = annualSwapCosts + annualHomeCosts;

  const profit = annualRevenue - annualCosts;
  const margin = annualRevenue > 0 ? (profit / annualRevenue) * 100 : 0;
  const profitPerCustomer = count > 0 ? profit / count : 0;
  const weeklyProfitPerCustomer = profitPerCustomer / 52;

  return {
    segment: segment.name,
    customerCount: count,
    weeklyRevenue: isNaN(weeklyRevenue) ? 0 : weeklyRevenue,
    annualRevenue: isNaN(annualRevenue) ? 0 : annualRevenue,
    annualSwapCosts: isNaN(annualSwapCosts) ? 0 : annualSwapCosts,
    annualHomeCosts: isNaN(annualHomeCosts) ? 0 : annualHomeCosts,
    annualCosts: isNaN(annualCosts) ? 0 : annualCosts,
    profit: isNaN(profit) ? 0 : profit,
    margin: isNaN(margin) ? 0 : margin,
    profitPerCustomer: isNaN(profitPerCustomer) ? 0 : profitPerCustomer,
    weeklyProfitPerCustomer: isNaN(weeklyProfitPerCustomer)
      ? 0
      : weeklyProfitPerCustomer,
    revenuePerCustomer: count > 0 ? annualRevenue / count : 0,
    costPerCustomer: count > 0 ? annualCosts / count : 0,
  };
};

// Calculate customer satisfaction
export const calculateCustomerSatisfaction = (strategy, segment) => {
  if (!segment || segment.count === 0) {
    return {
      overall: 0,
      valueScore: 0,
      flexibilityScore: 0,
      affordabilityScore: 0,
      convenienceScore: 0,
      interestLevel: "Very Low",
      sweetSpotScore: 0,
    };
  }

  let valueScore = 0;
  let flexibilityScore = 0;
  let affordabilityScore = 0;
  let convenienceScore = 0;

  const currentAvgRevenue = segment.avgRevenue;

  let effectiveWeeklyPrice = strategy.price;
  if (strategy.includeBikeLease) {
    const weeklyLeasePayment = (strategy.monthlyLeasePayment * 12) / 52;
    effectiveWeeklyPrice += weeklyLeasePayment;
  }

  const pricePerSwap =
    strategy.swapLimit > 0
      ? effectiveWeeklyPrice / strategy.swapLimit
      : effectiveWeeklyPrice;
  const currentPricePerSwap =
    segment.avgSwaps > 0 ? currentAvgRevenue / segment.avgSwaps : 0;

  // Value Score
  if (strategy.includeBikeLease) {
    valueScore += 15;
    if (strategy.freeSwapsDuration > 0) valueScore += 10;
  }
  if (pricePerSwap < currentPricePerSwap * 0.7) valueScore += 25;
  else if (pricePerSwap < currentPricePerSwap * 0.9) valueScore += 20;
  else if (pricePerSwap <= currentPricePerSwap) valueScore += 15;
  else if (pricePerSwap <= currentPricePerSwap * 1.2) valueScore += 10;
  else valueScore += 5;

  valueScore = Math.min(25, valueScore);

  // Flexibility Score
  if (strategy.packageType.includes("unlimited")) {
    flexibilityScore += 25;
  } else if (strategy.packageType === "combo") {
    flexibilityScore += 20;
  } else if (strategy.swapLimit >= segment.avgSwaps * 1.5) {
    flexibilityScore += 18;
  } else if (strategy.swapLimit >= segment.avgSwaps) {
    flexibilityScore += 15;
  } else {
    flexibilityScore += 8;
  }
  if (strategy.includeBikeLease) flexibilityScore += 5;
  flexibilityScore = Math.min(25, flexibilityScore);

  // Affordability Score
  const affordabilityRatio = effectiveWeeklyPrice / currentAvgRevenue;
  if (affordabilityRatio < 0.8) affordabilityScore += 25;
  else if (affordabilityRatio < 1.0) affordabilityScore += 20;
  else if (affordabilityRatio < 1.2) affordabilityScore += 15;
  else if (affordabilityRatio < 1.5) affordabilityScore += 10;
  else affordabilityScore += 5;

  // Convenience Score
  if (strategy.packageType === "unlimited-both") convenienceScore += 25;
  else if (strategy.packageType === "combo") convenienceScore += 20;
  else if (strategy.packageType.includes("unlimited")) convenienceScore += 18;
  else if (segment.avgHomeCharges > 0 && strategy.packageType === "home")
    convenienceScore += 15;
  else if (segment.avgSwaps > 0 && strategy.packageType === "swaps")
    convenienceScore += 15;
  else convenienceScore += 8;
  if (strategy.includeBikeLease) convenienceScore += 10;
  convenienceScore = Math.min(25, convenienceScore);

  const overall = Math.min(
    100,
    Math.round(
      valueScore + flexibilityScore + affordabilityScore + convenienceScore
    )
  );

  let interestLevel = "Very Low";
  if (overall >= 85) interestLevel = "Very High";
  else if (overall >= 75) interestLevel = "High";
  else if (overall >= 60) interestLevel = "Moderate";
  else if (overall >= 45) interestLevel = "Low";

  const profitMargin = strategy.profitMargin || 0;
  const sweetSpotScore = Math.round(
    overall * 0.6 + Math.min(profitMargin, 50) * 0.4
  );

  return {
    overall,
    valueScore,
    flexibilityScore,
    affordabilityScore,
    convenienceScore,
    interestLevel,
    sweetSpotScore,
  };
};

// Calculate package scenario with baseline comparison
export const calculateStrategy = (strategy, segments) => {
  console.log("Calculating strategy:", strategy);
  const segment = segments.find((s) => s.name === strategy.targetSegment);
  if (!segment) return null;

  const baseline = calculateBaseline(segment);
  const adoptionRate = strategy.adoptionRate / 100;
  const utilizationRate = strategy.utilizationRate / 100;
  const adopters = Math.round(segment.count * adoptionRate);
  const nonAdopters = segment.count - adopters;

  if (adopters === 0) return null;

  // Package adopters calculations
  let avgSwapsUsed = 0;
  let avgHomeChargesUsed = 0;

  if (
    strategy.packageType === "unlimited-swaps" ||
    strategy.packageType === "unlimited-both"
  ) {
    // For unlimited, assume they increase usage by 50% over current average
    avgSwapsUsed = segment.avgSwaps * 1.5 * utilizationRate;
  } else if (
    strategy.packageType === "swaps" ||
    strategy.packageType === "combo"
  ) {
    // For limited packages, they use up to the limit based on utilization rate
    // This is the CORRECT way: the limit defines the max, utilization is % of that limit
    avgSwapsUsed = strategy.swapLimit * utilizationRate;
  }

  if (
    strategy.packageType === "unlimited-home" ||
    strategy.packageType === "unlimited-both"
  ) {
    avgHomeChargesUsed = segment.avgHomeCharges * 1.5 * utilizationRate;
  } else if (
    strategy.packageType === "home" ||
    strategy.packageType === "combo"
  ) {
    avgHomeChargesUsed = strategy.homeChargeLimit * utilizationRate;
  }

  // Revenue calculations
  const weeklyServiceRevenue = adopters * strategy.price;
  const annualServiceRevenue = weeklyServiceRevenue * 52;

  let bikeLeaseRevenue = 0;
  let bikeLeaseCost = 0;
  if (strategy.includeBikeLease) {
    bikeLeaseRevenue += adopters * strategy.bikeDownPayment;
    bikeLeaseRevenue +=
      adopters * strategy.monthlyLeasePayment * strategy.leaseDurationMonths;
    bikeLeaseCost = adopters * strategy.costPerBike;
  }

  const packageAdopterRevenue = annualServiceRevenue + bikeLeaseRevenue;

  // Non-adopters continue on baseline
  const nonAdopterWeeklyRevenue = baseline.weeklyRevenue;
  const nonAdopterAnnualRevenue = nonAdopterWeeklyRevenue * nonAdopters * 52;

  const totalRevenue = packageAdopterRevenue + nonAdopterAnnualRevenue;

  // Cost calculations
  const weeksInPeriod = strategy.includeBikeLease
    ? strategy.leaseDurationMonths * 4.33
    : 52;

  let swapCost = adopters * avgSwapsUsed * strategy.costPerSwap * weeksInPeriod;
  let homeChargeCost =
    adopters * avgHomeChargesUsed * strategy.costPerHomeCharge * weeksInPeriod;

  if (strategy.freeSwapsDuration > 0) {
    const freeWeeks = strategy.freeSwapsDuration * 4.33;
    const freeSwapCost =
      adopters * avgSwapsUsed * strategy.costPerSwap * freeWeeks;
    swapCost += freeSwapCost;
  }

  const packageAdopterCosts = swapCost + homeChargeCost + bikeLeaseCost;

  // Non-adopters costs
  const nonAdopterSwapCosts =
    nonAdopters * segment.avgSwaps * COST_PER_SWAP * 52;
  const nonAdopterHomeCosts =
    nonAdopters * segment.avgHomeCharges * COST_PER_HOME_CHARGE * 52;
  const nonAdopterCosts = nonAdopterSwapCosts + nonAdopterHomeCosts;

  const totalCost = packageAdopterCosts + nonAdopterCosts;
  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Comparison to baseline
  const profitChange = netProfit - baseline.profit;
  const profitChangePercent =
    baseline.profit > 0 ? (profitChange / baseline.profit) * 100 : 0;
  const revenueChange = totalRevenue - baseline.annualRevenue;
  const revenueChangePercent =
    baseline.annualRevenue > 0
      ? (revenueChange / baseline.annualRevenue) * 100
      : 0;
  const costChange = totalCost - baseline.annualCosts;
  const costChangePercent =
    baseline.annualCosts > 0 ? (costChange / baseline.annualCosts) * 100 : 0;

  const isProfitable = netProfit > baseline.profit;
  const meetsThreshold = netProfit >= baseline.profit * 0.95;

  const result = {
    ...strategy,
    adopters,
    nonAdopters,
    avgSwapsUsed,
    avgHomeChargesUsed,

    // Revenue breakdown
    weeklyServiceRevenue,
    annualServiceRevenue,
    bikeLeaseRevenue,
    packageAdopterRevenue,
    nonAdopterAnnualRevenue,
    totalRevenue,

    // Cost breakdown
    swapCost,
    homeChargeCost,
    bikeLeaseCost,
    packageAdopterCosts,
    nonAdopterCosts,
    totalCost,

    // Profitability
    netProfit,
    profitMargin,
    revenuePerCustomer: totalRevenue / segment.count,
    costPerCustomer: totalCost / segment.count,
    profitPerCustomer: netProfit / segment.count,

    // Baseline comparison
    baseline,
    profitChange,
    profitChangePercent,
    revenueChange,
    revenueChangePercent,
    costChange,
    costChangePercent,
    isProfitable,
    meetsThreshold,

    // Decision metrics
    verdict: isProfitable ? "PROFITABLE" : "UNPROFITABLE",
    recommendation: isProfitable
      ? "✅ This package improves profitability"
      : "❌ This package reduces profitability - adjust pricing or costs",
  };

  result.satisfaction = calculateCustomerSatisfaction(result, segment);
  return result;
};

// Main data hook
export const useStrategyData = (customerSegments) => {
  const segments = useMemo(() => {
    if (!customerSegments || customerSegments.length === 0) {
      return SAMPLE_SEGMENTS;
    }
    console.log("Using provided customer segments:", customerSegments);

    // Transform the actual customer data to match expected format
    return customerSegments.map((segment) => {
      const customers = segment.customers || [];
      const count = segment.count || customers.length || 0;

      // Calculate average home charges from customer data if not provided
      let avgHomeCharges = 0;
      if (customers.length > 0) {
        const totalHomeCharges = customers.reduce(
          (sum, c) => sum + (c.avgHomeCharges || 0),
          0
        );
        avgHomeCharges = totalHomeCharges / customers.length;
      }

      return {
        name: segment.name,
        count: count,
        avgSwaps: segment.avgSwaps || 0,
        avgHomeCharges: segment.avgHomeCharges || avgHomeCharges,
        avgRevenue: segment.avgRevenue || 0,
        customers: customers,
        color: segment.color,
        minSwaps: segment.minSwaps,
        totalRevenue: segment.totalRevenue,
      };
    });
  }, [customerSegments]);

  const [strategies, setStrategies] = useState([]);
  const [activeView, setActiveView] = useState("baseline");
  const [expandedStrategy, setExpandedStrategy] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(
    segments[0]?.name || "Power Riders"
  );

  const [currentStrategy, setCurrentStrategy] = useState({
    name: "Premium Bike Package",
    targetSegment: segments[0]?.name || "Power Riders",
    packageType: "unlimited-swaps",
    swapLimit: 10,
    homeChargeLimit: 5,
    price: 900,
    adoptionRate: 50,
    utilizationRate: 85,
    costPerSwap: COST_PER_SWAP,
    costPerHomeCharge: COST_PER_HOME_CHARGE,
    includeBikeLease: true,
    bikeDownPayment: 60000,
    monthlyLeasePayment: 55000,
    leaseDurationMonths: 12,
    freeSwapsDuration: 3,
    costPerBike: 70000,
  });

  // Calculate all baselines
  const allBaselines = useMemo(() => {
    return segments.map((seg) => calculateBaseline(seg));
  }, [segments]);

  const selectedSegmentData = segments.find((s) => s.name === selectedSegment);
  const selectedBaseline = calculateBaseline(selectedSegmentData);

  const addStrategy = () => {
    if (!currentStrategy.name || currentStrategy.name.trim() === "") {
      alert("Please enter a strategy name");
      return;
    }

    if (currentStrategy.includeBikeLease && currentStrategy.costPerBike <= 0) {
      alert("Please enter a valid cost per bike");
      return;
    }

    try {
      const result = calculateStrategy(currentStrategy, segments);
      if (result) {
        setStrategies([...strategies, result]);
        setActiveView("comparison");
      } else {
        alert("Error calculating strategy. Please check your inputs.");
      }
    } catch (error) {
      console.error("Error adding strategy:", error);
      alert("An error occurred while adding the strategy.");
    }
  };

  const removeStrategy = (index) => {
    setStrategies(strategies.filter((_, i) => i !== index));
  };

  const resetAll = () => {
    setStrategies([]);
    setActiveView("baseline");
  };

  return {
    // State
    segments,
    strategies,
    activeView,
    expandedStrategy,
    selectedSegment,
    currentStrategy,
    allBaselines,
    selectedSegmentData,
    selectedBaseline,

    // Actions
    setActiveView,
    setExpandedStrategy,
    setSelectedSegment,
    setCurrentStrategy,
    addStrategy,
    removeStrategy,
    resetAll,
  };
};
