"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Award,
  Target,
  Activity,
  Globe,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { RegionSalesChart } from "@/components/sales/SalesByRegions";
import { GrowthRateChart } from "@/components/sales/GrowthRateChart";
import RegionalPerformanceCards from "@/components/sales/RegionalPerformanceCards";
import RegionalInsights from "@/components/sales/RegionalInsights";
import { RegionalSalesTrend } from "@/components/sales/RegionalSalesTrend";
import RegionalSalesFilters from "@/components/sales/sales-region-filters";

interface RegionalData {
  city: string;
  region: string;
  totalSales: number;
  totalRevenue: number;
  averagePrice: number;
  marketShare: number;
  growthRate: number;
  subscriptionRate: number;
  averageDiscount: number;
  topModel: Record<string, number>;
  customerTypes: {
    individual: number;
    fleet: number;
  };
  rank: number;
}

interface RegionalSalesData {
  regionalSales: RegionalData[];
  topPerformingRegion: RegionalData;
  totalRegions: number;
  regionGrowthTrends: Array<{
    city: string;
    growthRate: number;
    marketShare: number;
  }>;
}

const COLORS = [
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
  "#84CC16",
];

export default function RegionalSalesPage() {
  const [data, setData] = useState<RegionalSalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/sales/regional");
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching regional sales:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Activity className="h-12 w-12 animate-spin text-cyan-400 mx-auto" />
            <p className="text-lg text-slate-400">
              Loading regional analytics...
            </p>
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
            <Globe className="h-12 w-12 text-slate-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-slate-300 mb-2">
                Failed to load data
              </h2>
              <p className="text-slate-400 mb-4">
                Unable to fetch regional analytics
              </p>
              <Button
                onClick={() => window.location.reload()}
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-LK").format(num);
  };

  const filteredData =
    selectedRegion === "all"
      ? data.regionalSales
      : data.regionalSales.filter((region) => region.region === selectedRegion);

  const regions = [...new Set(data.regionalSales.map((item) => item.region))];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
          <Globe className="h-4 w-4 text-cyan-400 mr-2" />
          <span className="text-cyan-400 text-sm font-medium">
            Regional Analytics
          </span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Regional Sales Analysis
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Geographic performance insights and market penetration analysis across
          all regions
        </p>
        {/* <div className="flex justify-center gap-2 mt-6 flex-wrap">
          <Button
            variant={selectedRegion === "all" ? "default" : "outline"}
            onClick={() => setSelectedRegion("all")}
            className={
              selectedRegion === "all"
                ? "bg-cyan-600 hover:bg-cyan-700"
                : "border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
            }
          >
            All Regions
          </Button>
          {regions.map((region) => (
            <Button
              key={region}
              variant={selectedRegion === region ? "default" : "outline"}
              onClick={() => setSelectedRegion(region)}
              className={
                selectedRegion === region
                  ? "bg-cyan-600 hover:bg-cyan-700"
                  : "border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
              }
            >
              {region}
            </Button>
          ))}
        </div> */}
        <RegionalSalesFilters />
      </div>

      {/* Top Performing Region Card */}
      <Card className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-cyan-500/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Top Performing Region
              </CardTitle>
              <CardDescription className="text-slate-300">
                Highest revenue generating city
              </CardDescription>
            </div>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              Rank #{data.topPerformingRegion.rank}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-white">
                {data.topPerformingRegion.city}
              </div>
              <div className="text-slate-400">
                {data.topPerformingRegion.region} Region
              </div>
            </div>
            <div>
              <div className="text-xl font-semibold text-emerald-400">
                {formatCurrency(data.topPerformingRegion.totalRevenue)}
              </div>
              <div className="text-slate-400">Total Revenue</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-cyan-400">
                {formatNumber(data.topPerformingRegion.totalSales)}
              </div>
              <div className="text-slate-400">Units Sold</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-purple-400">
                {data.topPerformingRegion.marketShare.toFixed(1)}%
              </div>
              <div className="text-slate-400">Market Share</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <RegionalSalesTrend data={filteredData} formatNumber={formatNumber} />

      {/* Market Share and Growth Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RegionSalesChart data={filteredData} />
        <GrowthRateChart
          data={filteredData.map((r) => ({
            city: r.city,
            growthRate: r.growthRate,
          }))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RegionalPerformanceCards
          filteredData={filteredData}
          formatNumber={formatNumber}
          formatCurrency={formatCurrency}
        />
        <RegionalInsights data={filteredData} />
      </div>
    </div>
  );
}
