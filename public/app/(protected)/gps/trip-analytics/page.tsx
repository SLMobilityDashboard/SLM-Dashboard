"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DatePickerWithRange from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  MapPin,
  TrendingUp,
  Clock,
  Route,
  Zap,
  Users,
  Download,
  Filter,
  RefreshCw,
} from "lucide-react";
import CartoMap from "@/components/maps/carto-map";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/dashboard-layout";

export default function TripAnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("7d");
  const [region, setRegion] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Mock analytics data
  const analyticsData = {
    totalTrips: 45678,
    totalDistance: 567890,
    avgTripDistance: 12.4,
    avgTripDuration: 28,
    peakHours: "8-10 AM, 5-7 PM",
    mostPopularRoute: "Colombo Fort → Galle Face",
    batteryEfficiency: 78.5,
    carbonSaved: 234.5,
  };

  const tripPatterns = [
    { hour: "00", trips: 45, percentage: 2 },
    { hour: "01", trips: 23, percentage: 1 },
    { hour: "02", trips: 12, percentage: 0.5 },
    { hour: "03", trips: 8, percentage: 0.3 },
    { hour: "04", trips: 15, percentage: 0.7 },
    { hour: "05", trips: 89, percentage: 4 },
    { hour: "06", trips: 234, percentage: 10 },
    { hour: "07", trips: 456, percentage: 20 },
    { hour: "08", trips: 678, percentage: 30 },
    { hour: "09", trips: 567, percentage: 25 },
    { hour: "10", trips: 345, percentage: 15 },
    { hour: "11", trips: 234, percentage: 10 },
    { hour: "12", trips: 345, percentage: 15 },
    { hour: "13", trips: 234, percentage: 10 },
    { hour: "14", trips: 123, percentage: 5 },
    { hour: "15", trips: 234, percentage: 10 },
    { hour: "16", trips: 345, percentage: 15 },
    { hour: "17", trips: 567, percentage: 25 },
    { hour: "18", trips: 456, percentage: 20 },
    { hour: "19", trips: 234, percentage: 10 },
    { hour: "20", trips: 123, percentage: 5 },
    { hour: "21", trips: 89, percentage: 4 },
    { hour: "22", trips: 67, percentage: 3 },
    { hour: "23", trips: 45, percentage: 2 },
  ];

  const popularRoutes = [
    {
      id: 1,
      from: "Colombo Fort",
      to: "Galle Face",
      trips: 2345,
      avgDistance: 5.2,
      avgDuration: 18,
      efficiency: 85,
    },
    {
      id: 2,
      from: "Kandy Center",
      to: "Peradeniya",
      trips: 1876,
      avgDistance: 8.7,
      avgDuration: 25,
      efficiency: 78,
    },
    {
      id: 3,
      from: "Negombo Beach",
      to: "Airport",
      trips: 1654,
      avgDistance: 12.3,
      avgDuration: 35,
      efficiency: 72,
    },
    {
      id: 4,
      from: "Galle Fort",
      to: "Unawatuna",
      trips: 1432,
      avgDistance: 6.8,
      avgDuration: 22,
      efficiency: 82,
    },
    {
      id: 5,
      from: "Mount Lavinia",
      to: "Colombo City",
      trips: 1298,
      avgDistance: 15.6,
      avgDuration: 42,
      efficiency: 75,
    },
  ];

  const hotspotData = [
    {
      position: [6.9271, 79.8612] as [number, number],
      popup:
        "<strong>Colombo Fort Hub</strong><br>2,345 trips/day<br>Peak: 8-10 AM",
      color: "#ef4444",
      size: "large",
    },
    {
      position: [6.9218, 79.8478] as [number, number],
      popup: "<strong>Galle Face</strong><br>1,876 trips/day<br>Peak: 6-8 PM",
      color: "#f59e0b",
      size: "medium",
    },
    {
      position: [7.2906, 80.6337] as [number, number],
      popup: "<strong>Kandy Center</strong><br>1,654 trips/day<br>Peak: 7-9 AM",
      color: "#10b981",
      size: "medium",
    },
    {
      position: [6.0535, 80.221] as [number, number],
      popup: "<strong>Galle Fort</strong><br>1,432 trips/day<br>Peak: 5-7 PM",
      color: "#06b6d4",
      size: "small",
    },
    {
      position: [7.0873, 79.915] as [number, number],
      popup:
        "<strong>Negombo Beach</strong><br>1,298 trips/day<br>Peak: 9-11 AM",
      color: "#8b5cf6",
      size: "small",
    },
  ];

  const handleAnalysisRefresh = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Trip Analytics</h1>
          <p className="text-slate-400">
            Historical trip patterns and usage analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 bg-transparent"
            onClick={handleAnalysisRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 bg-transparent"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center">
            <Filter className="mr-2 h-5 w-5 text-cyan-500" />
            Analysis Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="colombo">Colombo</SelectItem>
                  <SelectItem value="kandy">Kandy</SelectItem>
                  <SelectItem value="galle">Galle</SelectItem>
                  <SelectItem value="negombo">Negombo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Custom Date Range</Label>
              <DatePickerWithRange className="bg-slate-800/50 border-slate-700 text-slate-300" />
            </div>
            <div className="flex items-end">
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Total Trips</p>
                <p className="text-2xl font-bold text-slate-100">
                  {analyticsData.totalTrips.toLocaleString()}
                </p>
              </div>
              <Route className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Total Distance</p>
                <p className="text-2xl font-bold text-green-400">
                  {(analyticsData.totalDistance / 1000).toFixed(0)}K km
                </p>
              </div>
              <MapPin className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Avg Distance</p>
                <p className="text-2xl font-bold text-blue-400">
                  {analyticsData.avgTripDistance} km
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Avg Duration</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {analyticsData.avgTripDuration}m
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Peak Hours</p>
                <p className="text-lg font-bold text-purple-400">
                  {analyticsData.peakHours}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Efficiency</p>
                <p className="text-2xl font-bold text-orange-400">
                  {analyticsData.batteryEfficiency}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">CO₂ Saved</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {analyticsData.carbonSaved}kg
                </p>
              </div>
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-4 bg-slate-800/50 p-1">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="patterns"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
          >
            Time Patterns
          </TabsTrigger>
          <TabsTrigger
            value="routes"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
          >
            Popular Routes
          </TabsTrigger>
          <TabsTrigger
            value="hotspots"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
          >
            Hotspots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Trip Distribution
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Daily trip volume over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-slate-400">
                  <BarChart3 className="h-16 w-16 opacity-50" />
                  <span className="ml-4">
                    Trip distribution chart would be rendered here
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Distance Analysis
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Trip distance distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-slate-400">
                  <TrendingUp className="h-16 w-16 opacity-50" />
                  <span className="ml-4">
                    Distance analysis chart would be rendered here
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Hourly Trip Patterns
              </CardTitle>
              <CardDescription className="text-slate-400">
                Trip frequency by hour of day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tripPatterns.map((pattern) => (
                  <div key={pattern.hour} className="flex items-center gap-4">
                    <div className="w-12 text-sm text-slate-400">
                      {pattern.hour}:00
                    </div>
                    <div className="flex-1">
                      <Progress
                        value={pattern.percentage}
                        className="h-2 bg-slate-800"
                      />
                    </div>
                    <div className="w-16 text-sm text-slate-300 text-right">
                      {pattern.trips}
                    </div>
                    <div className="w-12 text-xs text-slate-400 text-right">
                      {pattern.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Most Popular Routes
              </CardTitle>
              <CardDescription className="text-slate-400">
                Top routes by trip frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {popularRoutes.map((route, index) => (
                  <div
                    key={route.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600/20 text-cyan-400 font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-300 font-medium">
                          {route.from}
                        </span>
                        <Route className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-300 font-medium">
                          {route.to}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm text-slate-400">
                        <span>{route.trips.toLocaleString()} trips</span>
                        <span>{route.avgDistance} km avg</span>
                        <span>{route.avgDuration} min avg</span>
                        <span>{route.efficiency}% efficient</span>
                      </div>
                    </div>
                    <Badge
                      className={`${
                        route.efficiency > 80
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : route.efficiency > 75
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}
                    >
                      {route.efficiency}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hotspots" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Trip Hotspots Map
              </CardTitle>
              <CardDescription className="text-slate-400">
                High-frequency trip origins and destinations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <CartoMap
                center={[6.9278, 79.8612]}
                zoom={10}
                markers={hotspotData}
                height="500px"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
