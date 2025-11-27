"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Battery, Zap, MapPin, Activity } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";

// Import your existing chart components
import BatteryUsageChart from "@/components/analytics/battery-usage-chart";
import MotorPerformanceChart from "@/components/analytics/motor-performance-chart";
import StationUsageChart from "@/components/analytics/station-usage-chart";
import FleetOverviewChart from "@/components/analytics/fleet-overview-chart";

// --- NEW IMPORTS FOR PLACEHOLDER CHARTS ---
import BatteryHealthDistributionChart from "./plots/BatteryHealthDistributionChart";
import BatteryEfficiencyTrendsChart from "./plots/BatteryEfficiencyTrendsChart";
import MotorTemperatureTrendsChart from "./plots/MotorTemperatureTrendsChart";
import MotorMaintenancePredictionsChart from "./plots/MotorMaintenancePredictionsChart";
import ScooterMap from "./plots/ScooterMap";
import StationGeofencingMap from "@/components/maps/StationGeofencingMap";
import FleetHealthDistributionChart from "./plots/FleetHealthDistributionChart";
import FleetEnergyConsumptionChart from "./plots/FleetEnergyConsumptionChart";
// --- END NEW IMPORTS ---

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(2024, 1, 1), // Feb 1, 2024
    to: new Date(2024, 1, 28), // Feb 28, 2024
  });

  return (
    // <DashboardLayout> {/* Uncomment if you have a DashboardLayout wrapper */}
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Analytics Dashboard
          </h1>
          <p className="text-slate-400">
            Comprehensive analytics for your EV fleet
          </p>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          className="w-full md:w-auto"
        />
      </div>

      <Tabs defaultValue="battery" className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="battery" className="flex items-center gap-2">
            <Battery className="h-4 w-4" />
            <span className="hidden sm:inline">Battery</span>
          </TabsTrigger>
          <TabsTrigger value="motor" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Motor</span>
          </TabsTrigger>
          <TabsTrigger value="stations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Stations</span>
          </TabsTrigger>
          <TabsTrigger value="fleet" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Fleet</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="battery" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Total Usage
                </CardTitle>
                <CardDescription className="text-slate-400">
                  All batteries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">
                  2,847 kWh
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  +12.5% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Charge Cycles
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Average per battery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">187</div>
                <p className="text-sm text-slate-400 mt-1">
                  +5.2% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Efficiency
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Average across fleet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">92.7%</div>
                <p className="text-sm text-slate-400 mt-1">
                  +1.3% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Health Status
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Fleet average
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">Good</div>
                <p className="text-sm text-slate-400 mt-1">
                  3 batteries need attention
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Total Battery Usage
              </CardTitle>
              <CardDescription className="text-slate-400">
                Usage by BMS ID over time (kWh)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BatteryUsageChart dateRange={dateRange} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Battery Health Distribution
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Health status across all batteries
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[300px]">
                  {/* Placeholder for battery health distribution chart */}
                  <BatteryHealthDistributionChart dateRange={dateRange} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Efficiency Trends
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Battery efficiency over time
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[300px]">
                  {/* Placeholder for efficiency trends chart */}
                  <BatteryEfficiencyTrendsChart dateRange={dateRange} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="motor" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Avg RPM
                </CardTitle>
                <CardDescription className="text-slate-400">
                  All motors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">3,245</div>
                <p className="text-sm text-slate-400 mt-1">
                  -2.1% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Temperature
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Average
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">42.3°C</div>
                <p className="text-sm text-slate-400 mt-1">
                  +1.5°C from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Efficiency
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Average
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">89.4%</div>
                <p className="text-sm text-slate-400 mt-1">
                  +0.7% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">Alerts</CardTitle>
                <CardDescription className="text-slate-400">
                  This month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-400">7</div>
                <p className="text-sm text-slate-400 mt-1">
                  -3 from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Motor Performance
              </CardTitle>
              <CardDescription className="text-slate-400">
                Performance metrics across all motors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MotorPerformanceChart dateRange={dateRange} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Temperature Trends
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Motor temperature patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[300px]">
                  {/* Placeholder for temperature chart */}
                  <MotorTemperatureTrendsChart dateRange={dateRange} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Maintenance Predictions
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Predicted maintenance needs
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[300px]">
                  {/* Placeholder for maintenance chart */}
                  <MotorMaintenancePredictionsChart dateRange={dateRange} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Total Stations
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">42</div>
                <p className="text-sm text-slate-400 mt-1">
                  +3 from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Utilization
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Average
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">68.2%</div>
                <p className="text-sm text-slate-400 mt-1">
                  +4.7% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Peak Hours
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Most active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">
                  17:00-19:00
                </div>
                <p className="text-sm text-slate-400 mt-1">87.3% utilization</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Availability
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Current status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">95.2%</div>
                <p className="text-sm text-slate-400 mt-1">
                  2 stations offline
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Station Usage Patterns
              </CardTitle>
              <CardDescription className="text-slate-400">
                Usage across all charging stations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StationUsageChart dateRange={dateRange} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ScooterMap />
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Accessible Swapping Zones (Geofences){" "}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Regions marked in light blue indicate accessible areas for
                  battery swapping operations. Areas outside these zones are
                  considered inaccessible.{" "}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[300px]">
                  {/* Placeholder for geographic distribution map */}
                  <StationGeofencingMap />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Total Vehicles
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Active fleet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">128</div>
                <p className="text-sm text-slate-400 mt-1">
                  +12 from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Distance
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Total this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">
                  24,387 km
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  +8.3% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Energy Used
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Total this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">
                  3,842 kWh
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  +5.7% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-100 text-lg">
                  Efficiency
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Fleet average
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">
                  6.3 km/kWh
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  +2.4% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Fleet Activity Overview
              </CardTitle>
              <CardDescription className="text-slate-400">
                Activity metrics across the entire fleet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FleetOverviewChart dateRange={dateRange} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Health Distribution
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Overall fleet health status
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[300px]">
                  {/* Placeholder for health distribution chart */}
                  <FleetHealthDistributionChart dateRange={dateRange} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Energy Consumption
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Energy usage patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[300px]">
                  {/* Placeholder for energy consumption chart */}
                  <FleetEnergyConsumptionChart dateRange={dateRange} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    // </DashboardLayout>
  );
}
