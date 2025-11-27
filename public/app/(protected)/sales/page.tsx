"use client";

import { useState, useEffect } from "react";
import { Activity, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesFilters } from "@/components/sales/sales-filters";
import { SalesOverview } from "@/types/sales";
import { KPICards } from "@/components/sales/KPICards";
import { SalesCharts } from "@/components/sales/SalesCharts";
import { RecentSalesTable } from "@/components/sales/RecentSalesTable";

export default function SalesOverviewPage() {
  const [data, setData] = useState<SalesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/sales/overview");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching sales overview:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Activity className="h-12 w-12 animate-spin text-cyan-400 mx-auto" />
            <p className="text-lg text-slate-400">Loading sales analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <BarChart3 className="h-12 w-12 text-slate-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-slate-300 mb-2">
                Failed to load data
              </h2>
              <p className="text-slate-400 mb-4">
                Unable to fetch sales analytics
              </p>
              <Button
                onClick={fetchData}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
          <BarChart3 className="h-4 w-4 text-cyan-400 mr-2" />
          <span className="text-cyan-400 text-sm font-medium">
            Sales Analytics
          </span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Sales Overview Dashboard
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Comprehensive sales performance insights with real-time analytics and
          trend analysis
        </p>
      </div>
      <SalesFilters />
      <KPICards kpis={data.kpis} />
      <SalesCharts
        monthlySales={data.monthlySales}
        modelSales={data.modelSales}
      />
      <RecentSalesTable recentSales={data.recentSales} />
    </div>
  );
}
