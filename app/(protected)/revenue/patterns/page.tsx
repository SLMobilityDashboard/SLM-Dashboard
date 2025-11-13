"use client";

import React, { useState, useEffect } from "react";
import {
  Battery,
  BarChart3,
  TrendingUp,
  Target,
  AlertCircle,
} from "lucide-react";
import { useDataAnalysis } from "./hooks/useDataAnalysis";
import { OverviewDashboard } from "./components/OverviewDashboard";
import { PatternAnalysis } from "./components/PatternAnalysis";
import { CustomerInsights } from "./components/CustomerInsights";

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
const BatterySwapAnalytics = () => {
  const [activeTab, setActiveTab] = useState("eda");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const {
    data,
    customerSegments,
    predictions,
    scatterData,
    eda,
    processSnowflakeData,
    getCustomerSegment,
  } = useDataAnalysis();

  // Auto-load data from Snowflake on component mount
  useEffect(() => {
    const loadDataFromSnowflake = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Query Snowflake via your API endpoint
        const response = await fetch("/api/snowflake/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sql: `
              SELECT 
                CUSTOMER_ID,
                FULLNAME,
                TBOX_IMEI_NO,
                AVG_SWAPS_PER_WEEK,
                AVG_SWAP_REVENUE_PER_WEEK,
                AVG_HOME_CHARGES_PER_WEEK,
                AVG_HOME_CHARGE_REVENUE_PER_WEEK,
                AVG_TOTAL_REVENUE_PER_WEEK,
                AVG_DISTANCE_PER_WEEK
              FROM YOUR_DATABASE.YOUR_SCHEMA.USAGE_PATTERN_TABLE
              WHERE AVG_SWAPS_PER_WEEK IS NOT NULL
              ORDER BY AVG_TOTAL_REVENUE_PER_WEEK DESC
            `,
            userId: "analytics-dashboard",
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to load data: ${response.status} ${response.statusText}`
          );
        }

        const jsonData = await response.json();

        if (!jsonData || jsonData.length === 0) {
          throw new Error("No data returned from Snowflake");
        }

        console.log("Snowflake Data Loaded:", jsonData.length, "rows");
        console.log("Sample row:", jsonData[0]);
        console.log("Cache Status:", response.headers.get("X-Cache-Status"));
        console.log("Cache Type:", response.headers.get("X-Cache-Type"));
        console.log("Persistent:", response.headers.get("X-Persistent"));

        processSnowflakeData(jsonData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading data from Snowflake:", error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    loadDataFromSnowflake();
  }, []);

  const Badge = ({ children, variant = "default", className = "" }) => {
    const variants = {
      default: "bg-primary text-primary-foreground hover:bg-primary/80",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/80",
      outline:
        "text-foreground border border-input bg-background hover:bg-accent",
    };
    return (
      <div
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}
      >
        {children}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-screen">
        <div className="text-center">
          <Battery className="w-16 h-16 text-muted-foreground mb-4 mx-auto animate-pulse" />
          <h3 className="text-xl font-semibold mb-2">Loading Analytics...</h3>
          <p className="text-sm text-muted-foreground">
            Fetching data from Snowflake
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mb-4 mx-auto" />
          <h3 className="text-xl font-semibold mb-2">Failed to Load Data</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Battery Swap Analytics
            </h1>
            <p className="text-muted-foreground">
              Customer behavior analysis and insights from Snowflake
            </p>
          </div>
          <Badge variant="secondary" className="hidden sm:flex">
            <Battery className="w-3 h-3 mr-1" /> Live Data
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between overflow-x-auto">
        <div className="flex-1 inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          {[
            { id: "eda", label: "Overview", icon: BarChart3 },
            { id: "patterns", label: "Patterns", icon: TrendingUp },
            { id: "predictions", label: "Insights", icon: Target },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-background/50"
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "eda" && (
        <OverviewDashboard eda={eda} customerSegments={customerSegments} />
      )}

      {activeTab === "patterns" && (
        <PatternAnalysis
          scatterData={scatterData}
          customerSegments={customerSegments}
          getCustomerSegment={getCustomerSegment}
        />
      )}

      {activeTab === "predictions" && (
        <CustomerInsights predictions={predictions} />
      )}
    </div>
  );
};

export default BatterySwapAnalytics;
