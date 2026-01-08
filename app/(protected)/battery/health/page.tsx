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
  AlertTriangle,
  BarChart3,
  LineChart,
  PieChart,
} from "lucide-react";
import { BatteryHealthOverview } from "@/components/battery/battery-health-overview";
import { BatteryHealthChart } from "@/components/battery/battery-health-chart";
import { BatteryDegradationChart } from "@/components/battery/battery-degradation-chart";
import { BatteryAnomalyDetection } from "@/components/battery/battery-anomaly-detection";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function BatteryHealthPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(2024, 1, 1), // Feb 1, 2024
    to: new Date(2024, 1, 28), // Feb 28, 2024
  });

  const [selectedBattery, setSelectedBattery] = useState("all");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Battery Health Monitoring
          </h1>
          <p className="text-slate-400">
            Comprehensive analysis of battery health and performance
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="w-full md:w-auto">
            <Label htmlFor="battery-select" className="sr-only">
              Select Battery
            </Label>
            <Select value={selectedBattery} onValueChange={setSelectedBattery}>
              <SelectTrigger
                id="battery-select"
                className="w-full md:w-[200px] border-slate-700 bg-slate-900/50"
              >
                <SelectValue placeholder="Select Battery" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batteries</SelectItem>
                <SelectItem value="BT10600A">BT10600A</SelectItem>
                <SelectItem value="BT10600B">BT10600B</SelectItem>
                <SelectItem value="BT10600C">BT10600C</SelectItem>
                <SelectItem value="BT10600D">BT10600D</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            className="w-full md:w-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-lg flex items-center">
              <Battery className="mr-2 h-5 w-5 text-green-500" />
              Overall Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">92%</div>
            <div className="mt-2">
              <Progress value={92} className="h-2 bg-slate-700">
                <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full" />
              </Progress>
            </div>
            <p className="text-xs text-slate-400 mt-2">Excellent condition</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-lg flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
              Anomalies Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">3</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-400">Last 30 days</span>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                Investigate
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-lg flex items-center">
              <LineChart className="mr-2 h-5 w-5 text-cyan-500" />
              Avg. Degradation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-400">0.8%</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-400">Per month</span>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                Below Average
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-lg flex items-center">
              <PieChart className="mr-2 h-5 w-5 text-blue-500" />
              Predicted Lifespan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">4.2 yrs</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-400">Remaining</span>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                +0.5 yrs
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Battery className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="health-trends"
            className="flex items-center gap-2"
          >
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Health Trends</span>
          </TabsTrigger>
          <TabsTrigger value="degradation" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Degradation</span>
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Anomalies</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <BatteryHealthOverview batteryId={selectedBattery} />
        </TabsContent>

        <TabsContent value="health-trends" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Battery Health Trends
              </CardTitle>
              <CardDescription className="text-slate-400">
                Health metrics over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BatteryHealthChart
                dateRange={dateRange}
                batteryId={selectedBattery}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="degradation" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Battery Degradation Analysis
              </CardTitle>
              <CardDescription className="text-slate-400">
                Capacity loss over time and cycles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BatteryDegradationChart
                dateRange={dateRange}
                batteryId={selectedBattery}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Anomaly Detection
              </CardTitle>
              <CardDescription className="text-slate-400">
                Unusual patterns and potential issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BatteryAnomalyDetection
                dateRange={dateRange}
                batteryId={selectedBattery}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
