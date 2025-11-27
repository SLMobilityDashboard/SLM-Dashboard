"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { Upload, Battery } from "lucide-react";
import { useDataAnalysis } from "./hooks/useDataAnalysis";
import { OverviewDashboard } from "./components/OverviewDashboard";
import { PatternAnalysis } from "./components/PatternAnalysis";
import { CustomerInsights } from "./components/CustomerInsights";

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
const BatterySwapAnalytics = () => {
  const [activeTab, setActiveTab] = useState("upload");
  const {
    data,
    customerSegments,
    predictions,
    scatterData,
    eda,
    processCSV,
    getCustomerSegment,
  } = useDataAnalysis();

  const {
    Upload,
    BarChart3,
    TrendingUp,
    Target,
    Lightbulb,
    Battery,
  } = require("lucide-react");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      processCSV(file);
      setActiveTab("eda");
    }
  };

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
            { id: "upload", label: "Upload", icon: Upload },
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

      {activeTab === "upload" && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 pt-0">
            <div className="flex flex-col items-center justify-center py-16">
              <Upload className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-semibold leading-none tracking-tight mb-2">
                Upload Customer Data
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Upload your CSV file to start the analysis
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full max-w-md text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

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
