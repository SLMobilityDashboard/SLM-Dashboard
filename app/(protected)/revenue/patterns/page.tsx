"use client";

import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { Battery, BarChart3, TrendingUp, Target } from "lucide-react";
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
  const {
    data,
    customerSegments,
    predictions,
    scatterData,
    eda,
    processCSV,
    getCustomerSegment,
  } = useDataAnalysis();

  // Auto-load CSV on component mount
  useEffect(() => {
    const loadCSV = async () => {
      try {
        const response = await fetch("/UsagePtrn.csv");
        if (!response.ok) {
          throw new Error(`Failed to load CSV: ${response.status}`);
        }
        const csvText = await response.text();

        // Parse CSV with proper configuration
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          complete: (results) => {
            console.log("CSV Parsed:", results.data.length, "rows");
            console.log("Sample row:", results.data[0]);

            // Create a file object from the parsed data
            const blob = new Blob([csvText], { type: "text/csv" });
            const file = new File([blob], "UsagePtrn.csv", {
              type: "text/csv",
            });
            processCSV(file);
            setIsLoading(false);
          },
          error: (error) => {
            console.error("CSV Parse Error:", error);
            setIsLoading(false);
          },
        });
      } catch (error) {
        console.error("Error loading CSV:", error);
        alert(
          "Failed to load UsagePtrn.csv. Please ensure the file is in the public folder."
        );
        setIsLoading(false);
      }
    };
    loadCSV();
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
            Processing UsagePtrn.csv
          </p>
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
              Customer behavior analysis and insights
            </p>
          </div>
          <Badge variant="secondary" className="hidden sm:flex">
            <Battery className="w-3 h-3 mr-1" /> Analytics
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
