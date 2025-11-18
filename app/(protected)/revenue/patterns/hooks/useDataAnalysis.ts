
"use client";

import React, { useState, useEffect } from "react";
import {
  Battery,
  BarChart3,
  TrendingUp,
  Target,
  AlertCircle,
  MapPin,
  Users,
  DollarSign,
  Activity,
  Home,
  Zap,
  Search,
  Filter,
  X,
  Download,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// ============================================================================
// DATA ANALYSIS HOOK
// ============================================================================
export const useDataAnalysis = () => {
  const [data, setData] = useState([]);
  const [customerSegments, setCustomerSegments] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [scatterData, setScatterData] = useState([]);
  const [stationAnalysis, setStationAnalysis] = useState([]);
  const [eda, setEda] = useState(null);

  const processSnowflakeData = (rawData) => {
    const processedData = rawData.map((row) => ({
      tboxId: row.TBOXID,
      customerId: row.CUSTOMER_ID,
      fullname: row.FULL_NAME,
      sixMonthStart: row.SIX_MONTH_START,
      avgSwaps: parseFloat(row.AVG_OF_SWAPS_PER_WEEK) || 0,
      avgHomeCharges: parseFloat(row.AVG_OF_HOMECHARGINGS_PER_WEEK) || 0,
      frequentStations: row.FREQUENT_SWIPING_STATIONS || "",
      avgDistance: parseFloat(row.AVG_DISTANCE_PER_WEEK) || 0,
      avgSwapRevenue: parseFloat(row.AVG_SWAPS_REVENUE_PER_WEEK) || 0,
      avgHomeChargeRevenue: parseFloat(row.AVG_HOMECHARGING_REVENUE_PER_WEEK) || 0,
      avgTotalRevenue: parseFloat(row.AVG_TOTAL_REVENUE_PER_WEEK) || 0,
    }));

    console.log("Processed data:", processedData.length, "customers");
    setData(processedData);
    performAnalysis(processedData);
  };

  const getCustomerSegment = (customer) => {
    if (customer.avgSwaps >= 5) return "Power Riders";
    if (customer.avgSwaps >= 2) return "Steady Riders";
    if (customer.avgHomeCharges > customer.avgSwaps) return "Home Energizers";
    return "Casual Commuters";
  };

  const segmentCustomers = (customerData) => {
    const segments = {
      heavy: {
        name: "Power Riders",
        customers: [],
        color: "hsl(var(--chart-1))",
        minSwaps: 5,
      },
      moderate: {
        name: "Steady Riders",
        customers: [],
        color: "hsl(var(--chart-2))",
        minSwaps: 2,
      },
      light: {
        name: "Casual Commuters",
        customers: [],
        color: "hsl(var(--chart-3))",
        minSwaps: 0,
      },
      homeChargers: {
        name: "Home Energizers",
        customers: [],
        color: "hsl(var(--chart-4))",
        minSwaps: 0,
      },
    };

    customerData.forEach((customer) => {
      if (customer.avgSwaps >= 5) {
        segments.heavy.customers.push(customer);
      } else if (customer.avgSwaps >= 2) {
        segments.moderate.customers.push(customer);
      } else if (customer.avgHomeCharges > customer.avgSwaps) {
        segments.homeChargers.customers.push(customer);
      } else {
        segments.light.customers.push(customer);
      }
    });

    return Object.values(segments).map((seg) => ({
      ...seg,
      count: seg.customers.length,
      avgRevenue:
        seg.customers.reduce((sum, c) => sum + c.avgTotalRevenue, 0) /
        (seg.customers.length || 1),
      totalRevenue: seg.customers.reduce((sum, c) => sum + c.avgTotalRevenue, 0),
      avgSwaps:
        seg.customers.reduce((sum, c) => sum + c.avgSwaps, 0) /
        (seg.customers.length || 1),
    }));
  };

  const analyzeStations = (customerData) => {
    const stationMap = new Map();
    
    customerData.forEach((customer) => {
      if (customer.frequentStations) {
        const stations = customer.frequentStations
          .split(',')
          .map(s => s.trim())
          .filter(s => s && s.toUpperCase() !== 'HOME_CHARGING'); // Filter out HOME_CHARGING
        
        stations.forEach(station => {
          if (!stationMap.has(station)) {
            stationMap.set(station, {
              stationName: station,
              customers: [],
              totalSwaps: 0,
              totalRevenue: 0,
            });
          }
          
          const stationData = stationMap.get(station);
          // Check if customer is already added to avoid duplicates
          const existingCustomer = stationData.customers.find(
            c => c.customerId === customer.customerId
          );
          
          if (!existingCustomer) {
            stationData.customers.push({
              name: customer.fullname,
              customerId: customer.customerId,
              swaps: customer.avgSwaps,
              revenue: customer.avgSwapRevenue,
              segment: getCustomerSegment(customer),
            });
            stationData.totalSwaps += customer.avgSwaps;
            stationData.totalRevenue += customer.avgSwapRevenue;
          }
        });
      }
    });

    const stationAnalysisData = Array.from(stationMap.values())
      .map(station => ({
        ...station,
        customerCount: station.customers.length,
        avgSwapsPerCustomer: station.totalSwaps / station.customers.length,
        avgRevenuePerCustomer: station.totalRevenue / station.customers.length,
      }))
      .sort((a, b) => b.customerCount - a.customerCount);

    setStationAnalysis(stationAnalysisData);
  };

  const performEDA = (customerData) => {
    const totalCustomers = customerData.length;
    const totalRevenue = customerData.reduce((sum, c) => sum + c.avgTotalRevenue, 0);
    const totalSwaps = customerData.reduce((sum, c) => sum + c.avgSwaps, 0);

    const swapUsers = customerData.filter((c) => c.avgSwaps > 0);
    const homeChargers = customerData.filter((c) => c.avgHomeCharges > 0);
    const inactiveUsers = customerData.filter(
      (c) => c.avgSwaps === 0 && c.avgHomeCharges === 0
    );

    const avgRevenuePerSwap = totalSwaps > 0 ? totalRevenue / totalSwaps : 0;

    const revenueDistribution = [
      { range: "0-500", count: customerData.filter((c) => c.avgTotalRevenue < 500).length },
      { range: "500-1000", count: customerData.filter((c) => c.avgTotalRevenue >= 500 && c.avgTotalRevenue < 1000).length },
      { range: "1000-2000", count: customerData.filter((c) => c.avgTotalRevenue >= 1000 && c.avgTotalRevenue < 2000).length },
      { range: "2000+", count: customerData.filter((c) => c.avgTotalRevenue >= 2000).length },
    ];

    const swapDistribution = [
      { range: "0", count: customerData.filter((c) => c.avgSwaps === 0).length },
      { range: "0-2", count: customerData.filter((c) => c.avgSwaps > 0 && c.avgSwaps < 2).length },
      { range: "2-5", count: customerData.filter((c) => c.avgSwaps >= 2 && c.avgSwaps < 5).length },
      { range: "5-10", count: customerData.filter((c) => c.avgSwaps >= 5 && c.avgSwaps < 10).length },
      { range: "10+", count: customerData.filter((c) => c.avgSwaps >= 10).length },
    ];

    const opportunityAnalysis = {
      lowEngagement: customerData.filter((c) => c.avgSwaps < 2 && c.avgTotalRevenue < 500).length,
      highPotential: customerData.filter((c) => c.avgSwaps >= 3 && c.avgSwaps < 7).length,
      premiumCandidates: customerData.filter((c) => c.avgSwaps >= 7).length,
      homeChargeDominant: customerData.filter((c) => c.avgHomeCharges > c.avgSwaps * 2).length,
    };

    setEda({
      totalCustomers,
      totalRevenue,
      totalSwaps,
      avgRevenuePerSwap,
      swapUsers: swapUsers.length,
      homeChargers: homeChargers.length,
      inactiveUsers: inactiveUsers.length,
      revenueDistribution,
      swapDistribution,
      opportunityAnalysis,
    });
  };

  const createScatterPlots = (customerData) => {
    const scatter = customerData.map((c) => ({
      avgSwaps: c.avgSwaps,
      avgRevenue: c.avgTotalRevenue,
      avgHomeCharges: c.avgHomeCharges,
      avgDistance: c.avgDistance,
      revenuePerSwap: c.avgSwaps > 0 ? c.avgTotalRevenue / c.avgSwaps : 0,
      name: c.fullname,
      tboxId: c.tboxId,
      segment: getCustomerSegment(c),
    }));
    setScatterData(scatter);
  };

  const calculateChurnScore = (customer) => {
    let score = 0;
    if (customer.avgSwaps < 1) score += 0.3;
    if (customer.avgTotalRevenue < 500) score += 0.3;
    if (customer.avgHomeCharges > customer.avgSwaps * 2) score += 0.2;
    if (customer.avgDistance === 0) score += 0.2;
    return Math.min(score, 1);
  };

  const calculateRevenueUpside = (customer) => {
    if (customer.avgSwaps >= 5) return customer.avgTotalRevenue * 0.42;
    if (customer.avgSwaps >= 2) return customer.avgTotalRevenue * 0.28;
    return customer.avgTotalRevenue * 0.15;
  };

  const recommendPackage = (customer) => {
    if (customer.avgSwaps >= 5) return "Unlimited Pro";
    if (customer.avgSwaps >= 2) return "Power User";
    if (customer.avgHomeCharges > customer.avgSwaps) return "Home Hybrid";
    return "Basic Flex";
  };

  const performMLPredictions = (customerData) => {
    if (customerData.length < 2) return;

    const churnPredictions = customerData.map((customer) => {
      const churnScore = calculateChurnScore(customer);
      const revenueUpside = calculateRevenueUpside(customer);

      return {
        customerId: customer.customerId,
        name: customer.fullname,
        churnRisk: churnScore,
        currentRevenue: customer.avgTotalRevenue,
        potentialRevenue: customer.avgTotalRevenue + revenueUpside,
        recommendedPackage: recommendPackage(customer),
        priority: churnScore > 0.6 ? "High" : churnScore > 0.3 ? "Medium" : "Low",
        currentSwaps: customer.avgSwaps,
        segment: getCustomerSegment(customer),
        frequentStations: customer.frequentStations,
      };
    });

    setPredictions(churnPredictions);
  };

  const performAnalysis = (customerData) => {
    const segments = segmentCustomers(customerData);
    setCustomerSegments(segments);
    performMLPredictions(customerData);
    createScatterPlots(customerData);
    performEDA(customerData);
    analyzeStations(customerData);
  };

  return {
    data,
    customerSegments,
    predictions,
    scatterData,
    stationAnalysis,
    eda,
    processSnowflakeData,
    getCustomerSegment,
  };
};