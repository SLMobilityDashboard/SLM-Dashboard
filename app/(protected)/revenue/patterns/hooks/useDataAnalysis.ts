"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { Upload, Battery } from "lucide-react";

// ============================================================================
// COMPONENT 1: DATA MANAGEMENT & ANALYSIS ENGINE
// ============================================================================
export const useDataAnalysis = () => {
  const [data, setData] = useState([]);
  const [customerSegments, setCustomerSegments] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [scatterData, setScatterData] = useState([]);
  const [eda, setEda] = useState(null);

  const processCSV = (file) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const processedData = results.data.map((row) => ({
          customerId: row.CUSTOMER_ID,
          fullname: row.FULLNAME,
          imei: row.TBOX_IMEI_NO,
          avgSwaps: parseFloat(row.AVG_SWAPS_PER_WEEK) || 0,
          avgSwapRevenue: parseFloat(row.AVG_SWAP_REVENUE_PER_WEEK) || 0,
          avgHomeCharges: parseFloat(row.AVG_HOME_CHARGES_PER_WEEK) || 0,
          avgHomeChargeRevenue:
            parseFloat(row.AVG_HOME_CHARGE_REVENUE_PER_WEEK) || 0,
          avgTotalRevenue: parseFloat(row.AVG_TOTAL_REVENUE_PER_WEEK) || 0,
          avgDistance: parseFloat(row.AVG_DISTANCE_PER_WEEK) || 0,
        }));
        setData(processedData);
        performAnalysis(processedData);
      },
    });
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
      totalRevenue: seg.customers.reduce(
        (sum, c) => sum + c.avgTotalRevenue,
        0
      ),
      avgSwaps:
        seg.customers.reduce((sum, c) => sum + c.avgSwaps, 0) /
        (seg.customers.length || 1),
    }));
  };

  const performEDA = (customerData) => {
    const totalCustomers = customerData.length;
    const totalRevenue = customerData.reduce(
      (sum, c) => sum + c.avgTotalRevenue,
      0
    );
    const totalSwaps = customerData.reduce((sum, c) => sum + c.avgSwaps, 0);

    const swapUsers = customerData.filter((c) => c.avgSwaps > 0);
    const homeChargers = customerData.filter((c) => c.avgHomeCharges > 0);
    const inactiveUsers = customerData.filter(
      (c) => c.avgSwaps === 0 && c.avgHomeCharges === 0
    );

    const avgRevenuePerSwap = totalSwaps > 0 ? totalRevenue / totalSwaps : 0;

    const revenueDistribution = [
      {
        range: "0-500",
        count: customerData.filter((c) => c.avgTotalRevenue < 500).length,
      },
      {
        range: "500-1000",
        count: customerData.filter(
          (c) => c.avgTotalRevenue >= 500 && c.avgTotalRevenue < 1000
        ).length,
      },
      {
        range: "1000-2000",
        count: customerData.filter(
          (c) => c.avgTotalRevenue >= 1000 && c.avgTotalRevenue < 2000
        ).length,
      },
      {
        range: "2000+",
        count: customerData.filter((c) => c.avgTotalRevenue >= 2000).length,
      },
    ];

    const swapDistribution = [
      {
        range: "0",
        count: customerData.filter((c) => c.avgSwaps === 0).length,
      },
      {
        range: "0-2",
        count: customerData.filter((c) => c.avgSwaps > 0 && c.avgSwaps < 2)
          .length,
      },
      {
        range: "2-5",
        count: customerData.filter((c) => c.avgSwaps >= 2 && c.avgSwaps < 5)
          .length,
      },
      {
        range: "5-10",
        count: customerData.filter((c) => c.avgSwaps >= 5 && c.avgSwaps < 10)
          .length,
      },
      {
        range: "10+",
        count: customerData.filter((c) => c.avgSwaps >= 10).length,
      },
    ];

    const opportunityAnalysis = {
      lowEngagement: customerData.filter(
        (c) => c.avgSwaps < 2 && c.avgTotalRevenue < 500
      ).length,
      highPotential: customerData.filter(
        (c) => c.avgSwaps >= 3 && c.avgSwaps < 7
      ).length,
      premiumCandidates: customerData.filter((c) => c.avgSwaps >= 7).length,
      homeChargeDominant: customerData.filter(
        (c) => c.avgHomeCharges > c.avgSwaps * 2
      ).length,
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
      imei: c.imei,
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
        priority:
          churnScore > 0.6 ? "High" : churnScore > 0.3 ? "Medium" : "Low",
        currentSwaps: customer.avgSwaps,
        segment: getCustomerSegment(customer),
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
  };

  return {
    data,
    customerSegments,
    predictions,
    scatterData,
    eda,
    processCSV,
    getCustomerSegment,
  };
};
