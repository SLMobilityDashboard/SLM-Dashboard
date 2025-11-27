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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Battery,
  Zap,
  MapPin,
  Activity,
  Users,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { FleetStatusOverview } from "@/components/fleet/fleet-status-overview";
import { FleetMaintenanceTable } from "@/components/fleet/fleet-maintenance-table";
import { FleetUtilizationChart } from "@/components/fleet/fleet-utilization-chart";
import { DateRangePicker } from "@/components/ui/date-range-picker";

import ScooterStatusTable from "@/components/scooter-status-table";

export default function FleetPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(2024, 1, 1), // Feb 1, 2024
    to: new Date(2024, 1, 28), // Feb 28, 2024
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Fleet Management
          </h1>
          <p className="text-slate-400">
            Comprehensive overview of your EV fleet
          </p>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          className="w-full md:w-auto"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-lg flex items-center">
              <Users className="mr-2 h-5 w-5 text-blue-500" />
              Total Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">128</div>
            <div className="flex items-center mt-1">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                +12
              </Badge>
              <span className="text-xs text-slate-400 ml-2">
                from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-lg flex items-center">
              <Activity className="mr-2 h-5 w-5 text-cyan-500" />
              Active Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-400">112</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-400">87.5% of fleet</span>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                +5
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-lg flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
              Maintenance Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">8</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-400">6.3% of fleet</span>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                Attention
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-lg flex items-center">
              <Battery className="mr-2 h-5 w-5 text-green-500" />
              Avg. Battery Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">92%</div>
            <div className="mt-2">
              <Progress value={92} className="h-2 bg-slate-700">
                <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full" />
              </Progress>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">Fleet Utilization</CardTitle>
            <CardDescription className="text-slate-400">
              Usage patterns and efficiency metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FleetUtilizationChart dateRange={dateRange} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
