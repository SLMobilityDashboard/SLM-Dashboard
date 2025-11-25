"use client";

import React, { useState, useEffect } from "react";
import {
  Battery,
  BarChart3,
  TrendingUp,
  Target,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { useDataAnalysis } from "./hooks/useDataAnalysis";
import { OverviewDashboard } from "./components/OverviewDashboard";
import { PatternAnalysis } from "./components/PatternAnalysis";
import { StationAnalysis } from "./components/StationAnalysis";
import { CustomerInsights } from "./components/CustomerInsights";

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
const BatterySwapAnalytics = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const {
    data,
    customerSegments,
    predictions,
    scatterData,
    stationAnalysis,
    eda,
    processSnowflakeData,
    getCustomerSegment,
  } = useDataAnalysis();

  useEffect(() => {
    const loadDataFromSnowflake = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/snowflake/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sql: `
              SELECT 
                TBOXID,
                CUSTOMER_ID,
                FULL_NAME,
                SIX_MONTH_START,
                AVG_OF_SWAPS_PER_WEEK,
                AVG_OF_HOMECHARGINGS_PER_WEEK,
                FREQUENT_SWIPING_STATIONS,
                AVG_DISTANCE_PER_WEEK,
                AVG_SWAPS_REVENUE_PER_WEEK,
                AVG_HOMECHARGING_REVENUE_PER_WEEK,
                AVG_TOTAL_REVENUE_PER_WEEK
              FROM REPORT_DB.GPS_DASHBOARD.VEHICLE_6MONTH_AVERAGE_WEEKLY
              WHERE AVG_OF_SWAPS_PER_WEEK IS NOT NULL
              ORDER BY AVG_TOTAL_REVENUE_PER_WEEK DESC
            `,
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

  const Badge = ({ children, variant = "default" }) => {
    const variants = {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
    };
    return (
      <div
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]}`}
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
    <div className="flex-1 space-y-6 min-h-screen">
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
          <Badge variant="secondary">
            <Battery className="w-3 h-3 mr-1" /> Live Data
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between overflow-x-auto">
        <div className="flex-1 inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "stations", label: "Stations", icon: MapPin },
            { id: "patterns", label: "Patterns", icon: TrendingUp },
            { id: "insights", label: "Insights", icon: Target },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
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

      {activeTab === "overview" && (
        <OverviewDashboard eda={eda} customerSegments={customerSegments} />
      )}
      {activeTab === "stations" && (
        <StationAnalysis
          stationAnalysis={stationAnalysis}
          getCustomerSegment={getCustomerSegment}
        />
      )}
      {activeTab === "patterns" && (
        <PatternAnalysis
          scatterData={scatterData}
          customerSegments={customerSegments}
          getCustomerSegment={getCustomerSegment}
        />
      )}
      {activeTab === "insights" && (
        <CustomerInsights predictions={predictions} />
      )}
    </div>
  );
};

export default BatterySwapAnalytics;
