"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, Send, Sparkles, TrendingUp, AlertTriangle, Target, BarChart3, Play, Settings } from "lucide-react"

export default function PredictiveQueryBuilder() {
  const [query, setQuery] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedModel, setSelectedModel] = useState("")

  const prebuiltModels = [
    {
      name: "Revenue Forecasting",
      description: "Predict monthly revenue based on historical data and market trends",
      accuracy: "94.2%",
      type: "Regression",
      icon: TrendingUp,
      color: "text-green-400",
    },
    {
      name: "Demand Prediction",
      description: "Forecast battery swap demand across different stations",
      accuracy: "91.8%",
      type: "Time Series",
      icon: BarChart3,
      color: "text-blue-400",
    },
    {
      name: "Churn Analysis",
      description: "Identify customers likely to discontinue service",
      accuracy: "89.5%",
      type: "Classification",
      icon: AlertTriangle,
      color: "text-amber-400",
    },
    {
      name: "Price Optimization",
      description: "Optimize pricing strategies for maximum profitability",
      accuracy: "92.1%",
      type: "Optimization",
      icon: Target,
      color: "text-purple-400",
    },
  ]

  const handleSubmit = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
    }, 3000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Query Builder */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-slate-100">
              <Brain className="w-5 h-5 mr-2 text-cyan-400" />
              AI Model Builder
            </CardTitle>
            <p className="text-sm text-slate-400">Describe what you want to predict in natural language</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Natural Language Query</label>
              <Textarea
                placeholder="e.g., 'Predict the number of battery swaps at each station for the next 30 days based on historical usage patterns, weather data, and local events'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[120px] bg-slate-800/50 border-slate-700 focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Model Type</label>
                <Select>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700">
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regression">Regression</SelectItem>
                    <SelectItem value="classification">Classification</SelectItem>
                    <SelectItem value="timeseries">Time Series</SelectItem>
                    <SelectItem value="anomaly">Anomaly Detection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Data Source</label>
                <Select>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stations">Station Data</SelectItem>
                    <SelectItem value="customers">Customer Data</SelectItem>
                    <SelectItem value="transactions">Transaction Data</SelectItem>
                    <SelectItem value="weather">Weather Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={handleSubmit}
                disabled={!query || isProcessing}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Build Model
                  </>
                )}
              </Button>

              <Button variant="outline" className="border-slate-700 hover:bg-slate-800 bg-transparent">
                <Settings className="w-4 h-4 mr-2" />
                Advanced Settings
              </Button>
            </div>

            {isProcessing && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-300">Analyzing your query...</span>
                </div>
                <div className="space-y-2 text-xs text-slate-400">
                  <div>✓ Parsing natural language query</div>
                  <div>✓ Identifying data requirements</div>
                  <div>⏳ Selecting optimal model architecture</div>
                  <div className="text-slate-500">⏳ Preparing training pipeline</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Query Examples */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Example Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                "Predict which customers are likely to churn in the next 3 months",
                "Forecast daily revenue for each charging station",
                "Detect anomalies in battery performance data",
                "Optimize pricing to maximize profit margins",
              ].map((example, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800/50 transition-colors"
                  onClick={() => setQuery(example)}
                >
                  <p className="text-sm text-slate-300">{example}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pre-built Models */}
      <div className="space-y-6">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Pre-built Models</CardTitle>
            <p className="text-sm text-slate-400">Ready-to-use verified models</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {prebuiltModels.map((model, index) => (
              <div
                key={index}
                className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <model.icon className={`w-4 h-4 ${model.color}`} />
                    <h4 className="font-medium text-slate-200">{model.name}</h4>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                    {model.accuracy}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mb-3">{model.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600/50 text-xs">
                    {model.type}
                  </Badge>
                  <Button size="sm" variant="ghost" className="text-cyan-400 hover:text-cyan-300">
                    <Play className="w-3 h-3 mr-1" />
                    Deploy
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Model Library Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Total Models</span>
              <span className="text-sm font-medium text-slate-200">47</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Active Deployments</span>
              <span className="text-sm font-medium text-slate-200">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Avg. Accuracy</span>
              <span className="text-sm font-medium text-green-400">91.8%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Training Queue</span>
              <span className="text-sm font-medium text-amber-400">3</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
