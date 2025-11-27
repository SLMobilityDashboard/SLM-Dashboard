"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Target,
  BarChart3,
  DollarSign,
  Zap,
  AlertCircle,
} from "lucide-react"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"

export default function ForecastingDashboard() {
  const [selectedMetric, setSelectedMetric] = useState("revenue")
  const [timeRange, setTimeRange] = useState("30d")
  const [forecastData, setForecastData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Generate forecast data
  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      const data = generateForecastData(selectedMetric, timeRange)
      setForecastData(data)
      setIsLoading(false)
    }, 1000)
  }, [selectedMetric, timeRange])

  const generateForecastData = (metric: string, range: string) => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
    const data = []

    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)

      let actual, predicted, upperBound, lowerBound

      if (metric === "revenue") {
        const base = 15000 + Math.sin(i * 0.2) * 3000
        actual = i < days * 0.7 ? base + (Math.random() - 0.5) * 2000 : null
        predicted = base + (Math.random() - 0.5) * 1000
        upperBound = predicted * 1.15
        lowerBound = predicted * 0.85
      } else if (metric === "demand") {
        const base = 450 + Math.sin(i * 0.3) * 100
        actual = i < days * 0.7 ? base + (Math.random() - 0.5) * 50 : null
        predicted = base + (Math.random() - 0.5) * 30
        upperBound = predicted * 1.2
        lowerBound = predicted * 0.8
      } else {
        const base = 85 + Math.sin(i * 0.1) * 10
        actual = i < days * 0.7 ? base + (Math.random() - 0.5) * 5 : null
        predicted = base + (Math.random() - 0.5) * 3
        upperBound = predicted * 1.1
        lowerBound = predicted * 0.9
      }

      data.push({
        date: date.toISOString().split("T")[0],
        actual: actual ? Math.round(actual) : null,
        predicted: Math.round(predicted),
        upperBound: Math.round(upperBound),
        lowerBound: Math.round(lowerBound),
      })
    }

    return data
  }

  const metrics = [
    {
      id: "revenue",
      name: "Revenue Forecast",
      icon: DollarSign,
      color: "text-green-400",
      current: "$18,450",
      change: "+12.3%",
      accuracy: "94.2%",
    },
    {
      id: "demand",
      name: "Demand Prediction",
      icon: Zap,
      color: "text-blue-400",
      current: "523 swaps",
      change: "+8.7%",
      accuracy: "91.8%",
    },
    {
      id: "utilization",
      name: "Station Utilization",
      icon: Target,
      color: "text-purple-400",
      current: "78.5%",
      change: "-2.1%",
      accuracy: "89.5%",
    },
  ]

  const currentMetric = metrics.find((m) => m.id === selectedMetric)

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-48 bg-slate-800/50 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metrics.map((metric) => (
                <SelectItem key={metric.id} value={metric.id}>
                  <div className="flex items-center space-x-2">
                    <metric.icon className={`w-4 h-4 ${metric.color}`} />
                    <span>{metric.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metric Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <Card
            key={metric.id}
            className={`bg-slate-900/50 border-slate-800 backdrop-blur-sm cursor-pointer transition-all ${
              selectedMetric === metric.id ? "ring-2 ring-cyan-500/50" : ""
            }`}
            onClick={() => setSelectedMetric(metric.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">{metric.name}</p>
                  <p className="text-2xl font-bold text-slate-100">{metric.current}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge
                      variant="outline"
                      className={`${
                        metric.change.startsWith("+")
                          ? "bg-green-500/10 text-green-400 border-green-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}
                    >
                      {metric.change.startsWith("+") ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {metric.change}
                    </Badge>
                    <span className="text-xs text-slate-500">vs last period</span>
                  </div>
                </div>
                <div className="text-right">
                  <metric.icon className={`w-8 h-8 ${metric.color} mb-2`} />
                  <div className="text-xs text-slate-400">Accuracy</div>
                  <div className="text-sm font-medium text-slate-200">{metric.accuracy}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Forecast Chart */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100 flex items-center">
              {currentMetric && <currentMetric.icon className={`w-5 h-5 mr-2 ${currentMetric.color}`} />}
              {currentMetric?.name} - {timeRange.toUpperCase()}
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                  <span className="text-slate-400">Actual</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-slate-400">Predicted</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
                  <span className="text-slate-400">Confidence</span>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                {currentMetric?.accuracy} Accuracy
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-slate-400">Loading forecast data...</div>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />

                  {/* Confidence interval */}
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stackId="1"
                    stroke="none"
                    fill="#64748b"
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stackId="1"
                    stroke="none"
                    fill="#64748b"
                    fillOpacity={0.1}
                  />

                  {/* Predicted line */}
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />

                  {/* Actual line */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ fill: "#06b6d4", strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forecast Accuracy */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Forecast Accuracy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">7-day accuracy</span>
                <span className="text-sm font-medium text-green-400">96.8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">30-day accuracy</span>
                <span className="text-sm font-medium text-green-400">94.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">90-day accuracy</span>
                <span className="text-sm font-medium text-amber-400">87.5%</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Model Performance</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">MAPE</span>
                  <span className="text-slate-300">5.8%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">RMSE</span>
                  <span className="text-slate-300">1,247</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">MAE</span>
                  <span className="text-slate-300">892</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Insights */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-slate-300">Revenue expected to increase by 15% next month</p>
                  <p className="text-xs text-slate-500">Driven by seasonal demand patterns</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-slate-300">Peak demand predicted for weekends</p>
                  <p className="text-xs text-slate-500">Consider dynamic pricing strategies</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-slate-300">Station utilization varies by location</p>
                  <p className="text-xs text-slate-500">Optimize battery allocation accordingly</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-slate-300">Weather impact on demand detected</p>
                  <p className="text-xs text-slate-500">Rain reduces usage by 12% on average</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Station-wise Forecast */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Station-wise Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="top-stations" className="space-y-4">
            <TabsList className="bg-slate-800/50 p-1">
              <TabsTrigger value="top-stations" className="data-[state=active]:bg-slate-700">
                Top Performing
              </TabsTrigger>
              <TabsTrigger value="growth" className="data-[state=active]:bg-slate-700">
                Growth Potential
              </TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:bg-slate-700">
                Alerts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="top-stations" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "Downtown Hub", forecast: "$24,500", change: "+18%", confidence: "95%" },
                  { name: "Airport Station", forecast: "$19,200", change: "+12%", confidence: "92%" },
                  { name: "Mall Complex", forecast: "$16,800", change: "+8%", confidence: "89%" },
                  { name: "Business District", forecast: "$15,400", change: "+15%", confidence: "94%" },
                  { name: "University Campus", forecast: "$12,900", change: "+22%", confidence: "87%" },
                  { name: "Residential Area", forecast: "$11,600", change: "+5%", confidence: "91%" },
                ].map((station, index) => (
                  <div key={index} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-200">{station.name}</h4>
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                        {station.confidence}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold text-slate-100 mb-1">{station.forecast}</div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {station.change}
                      </Badge>
                      <span className="text-xs text-slate-500">next 30 days</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="growth" className="space-y-4">
              <div className="text-center py-8 text-slate-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Growth potential analysis coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <div className="space-y-3">
                {[
                  { station: "Suburban Plaza", issue: "Forecast accuracy below 85%", severity: "warning" },
                  { station: "Tech Park", issue: "Unusual demand pattern detected", severity: "info" },
                  { station: "City Center", issue: "Model requires retraining", severity: "error" },
                ].map((alert, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
                  >
                    <AlertCircle
                      className={`w-4 h-4 ${
                        alert.severity === "error"
                          ? "text-red-400"
                          : alert.severity === "warning"
                            ? "text-amber-400"
                            : "text-blue-400"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-200">{alert.station}</div>
                      <div className="text-xs text-slate-400">{alert.issue}</div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-200">
                      Investigate
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
