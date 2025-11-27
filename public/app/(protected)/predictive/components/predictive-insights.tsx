"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Download,
  RefreshCw,
  Brain,
  BarChart3,
} from "lucide-react"

export default function PredictiveInsights() {
  const [insights, setInsights] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])

  useEffect(() => {
    // Generate insights
    const generateInsights = () => {
      return [
        {
          id: 1,
          title: "Revenue Growth Opportunity",
          description: "Peak demand periods show 23% higher revenue potential during weekends",
          impact: "High",
          confidence: 94,
          category: "Revenue",
          icon: DollarSign,
          color: "text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          details:
            "Analysis of historical data shows consistent patterns of increased demand during weekend hours (6 PM - 10 PM). Implementing dynamic pricing could capture additional $12,450 monthly revenue.",
          actionable: true,
          roi: "$12,450/month",
        },
        {
          id: 2,
          title: "Demand Pattern Shift",
          description: "Customer behavior changing towards off-peak usage, reducing operational costs",
          impact: "Medium",
          confidence: 87,
          category: "Operations",
          icon: TrendingUp,
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          details:
            "15% increase in off-peak usage over the last 30 days. This trend reduces strain on peak infrastructure and lowers operational costs by approximately 8%.",
          actionable: false,
          roi: "8% cost reduction",
        },
        {
          id: 3,
          title: "Churn Risk Alert",
          description: "142 customers showing early churn indicators, intervention recommended",
          impact: "High",
          confidence: 91,
          category: "Customer",
          icon: Users,
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          details:
            "Machine learning model identified customers with declining usage patterns and increased complaint frequency. Proactive engagement could retain 78% of at-risk customers.",
          actionable: true,
          roi: "$89,400 retained revenue",
        },
        {
          id: 4,
          title: "Station Optimization",
          description: "3 underperforming stations could benefit from battery allocation rebalancing",
          impact: "Medium",
          confidence: 83,
          category: "Operations",
          icon: Target,
          color: "text-purple-400",
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/30",
          details:
            "Suburban Plaza, Tech Park, and City Center stations show suboptimal utilization. Redistributing 20% of battery inventory could improve overall network efficiency by 12%.",
          actionable: true,
          roi: "12% efficiency gain",
        },
      ]
    }

    const generateRecommendations = () => {
      return [
        {
          id: 1,
          title: "Implement Dynamic Pricing",
          description: "Adjust pricing based on demand patterns to maximize revenue",
          priority: "High",
          effort: "Medium",
          timeline: "2-3 weeks",
          expectedImpact: "+18% revenue",
          category: "Pricing",
          steps: [
            "Analyze historical demand patterns",
            "Define pricing tiers and triggers",
            "Implement pricing algorithm",
            "A/B test with select stations",
            "Full rollout across network",
          ],
        },
        {
          id: 2,
          title: "Customer Retention Campaign",
          description: "Proactive outreach to at-risk customers with personalized offers",
          priority: "High",
          effort: "Low",
          timeline: "1 week",
          expectedImpact: "78% retention rate",
          category: "Customer Success",
          steps: [
            "Segment at-risk customers",
            "Design personalized offers",
            "Launch email/SMS campaign",
            "Monitor engagement metrics",
            "Follow up with non-responders",
          ],
        },
        {
          id: 3,
          title: "Battery Reallocation Strategy",
          description: "Optimize battery distribution across stations based on demand forecasts",
          priority: "Medium",
          effort: "High",
          timeline: "4-6 weeks",
          expectedImpact: "+12% efficiency",
          category: "Operations",
          steps: [
            "Audit current battery distribution",
            "Model optimal allocation scenarios",
            "Plan logistics for reallocation",
            "Execute gradual redistribution",
            "Monitor performance improvements",
          ],
        },
        {
          id: 4,
          title: "Predictive Maintenance Program",
          description: "Use IoT data to predict and prevent equipment failures",
          priority: "Medium",
          effort: "High",
          timeline: "8-12 weeks",
          expectedImpact: "-35% downtime",
          category: "Maintenance",
          steps: [
            "Install additional IoT sensors",
            "Develop failure prediction models",
            "Create maintenance scheduling system",
            "Train maintenance team",
            "Implement automated alerts",
          ],
        },
      ]
    }

    setInsights(generateInsights())
    setRecommendations(generateRecommendations())
  }, [])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-500/10 text-red-400 border-red-500/30"
      case "Medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30"
      case "Low":
        return "bg-green-500/10 text-green-400 border-green-500/30"
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30"
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case "High":
        return "bg-red-500/10 text-red-400 border-red-500/30"
      case "Medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30"
      case "Low":
        return "bg-green-500/10 text-green-400 border-green-500/30"
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30"
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "High":
        return "text-green-400"
      case "Medium":
        return "text-amber-400"
      case "Low":
        return "text-slate-400"
      default:
        return "text-slate-400"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">AI-Generated Insights</h2>
          <p className="text-slate-400 mt-1">Actionable recommendations based on predictive analysis</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Insights</p>
                <p className="text-2xl font-bold text-slate-100">{insights.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/10">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">High Impact</p>
                <p className="text-2xl font-bold text-slate-100">
                  {insights.filter((i) => i.impact === "High").length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Actionable</p>
                <p className="text-2xl font-bold text-slate-100">{insights.filter((i) => i.actionable).length}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Avg Confidence</p>
                <p className="text-2xl font-bold text-slate-100">
                  {Math.round(insights.reduce((acc, i) => acc + i.confidence, 0) / insights.length)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <BarChart3 className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="bg-slate-900/50 p-1 border border-slate-800">
          <TabsTrigger value="insights" className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400">
            <Lightbulb className="w-4 h-4 mr-2" />
            Key Insights
          </TabsTrigger>
          <TabsTrigger
            value="recommendations"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
          >
            <Target className="w-4 h-4 mr-2" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="impact" className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400">
            <DollarSign className="w-4 h-4 mr-2" />
            Business Impact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {insights.map((insight) => (
              <Card
                key={insight.id}
                className={`bg-slate-900/50 border-slate-800 backdrop-blur-sm ${insight.borderColor}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${insight.bgColor}`}>
                        <insight.icon className={`w-5 h-5 ${insight.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-slate-100 text-lg">{insight.title}</CardTitle>
                        <p className="text-sm text-slate-400 mt-1">{insight.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={`${getImpactColor(insight.impact)} border-current`}>
                        {insight.impact} Impact
                      </Badge>
                      <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600/50">
                        {insight.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-300">{insight.description}</p>
                  <p className="text-sm text-slate-400">{insight.details}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-green-400">{insight.roi}</span>
                    </div>
                    {insight.actionable && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                      >
                        Take Action
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <div className="space-y-6">
            {recommendations.map((rec) => (
              <Card key={rec.id} className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-100">{rec.title}</CardTitle>
                      <p className="text-slate-400 mt-1">{rec.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                        {rec.priority} Priority
                      </Badge>
                      <Badge variant="outline" className={getEffortColor(rec.effort)}>
                        {rec.effort} Effort
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/30 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Timeline</div>
                      <div className="text-sm font-medium text-slate-200">{rec.timeline}</div>
                    </div>
                    <div className="bg-slate-800/30 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Expected Impact</div>
                      <div className="text-sm font-medium text-green-400">{rec.expectedImpact}</div>
                    </div>
                    <div className="bg-slate-800/30 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Category</div>
                      <div className="text-sm font-medium text-slate-200">{rec.category}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-3">Implementation Steps</h4>
                    <div className="space-y-2">
                      {rec.steps.map((step: string, index: number) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300">
                            {index + 1}
                          </div>
                          <span className="text-sm text-slate-400">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <span>Est. ROI: {rec.expectedImpact}</span>
                      <span>•</span>
                      <span>Timeline: {rec.timeline}</span>
                    </div>
                    <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
                      Start Implementation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="impact" className="space-y-6">
          {/* ROI Analysis */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">Business Impact Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/30 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">$156,850</div>
                  <div className="text-sm text-slate-400 mb-1">Potential Monthly Revenue</div>
                  <div className="text-xs text-slate-500">From implementing all recommendations</div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-cyan-400 mb-2">23%</div>
                  <div className="text-sm text-slate-400 mb-1">Efficiency Improvement</div>
                  <div className="text-xs text-slate-500">Across all operational metrics</div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">78%</div>
                  <div className="text-sm text-slate-400 mb-1">Customer Retention</div>
                  <div className="text-xs text-slate-500">Expected improvement rate</div>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-lg font-medium text-slate-200 mb-4">Implementation Roadmap</h4>
                <div className="space-y-4">
                  {[
                    {
                      phase: "Phase 1",
                      duration: "Weeks 1-2",
                      focus: "Quick wins - Customer retention campaign",
                      impact: "$89,400",
                    },
                    {
                      phase: "Phase 2",
                      duration: "Weeks 3-5",
                      focus: "Dynamic pricing implementation",
                      impact: "$12,450/month",
                    },
                    {
                      phase: "Phase 3",
                      duration: "Weeks 6-10",
                      focus: "Battery reallocation strategy",
                      impact: "12% efficiency",
                    },
                    {
                      phase: "Phase 4",
                      duration: "Weeks 11-24",
                      focus: "Predictive maintenance program",
                      impact: "35% downtime reduction",
                    },
                  ].map((phase, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-lg">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-200">{phase.phase}</div>
                        <div className="text-sm text-slate-400">{phase.focus}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-300">{phase.duration}</div>
                        <div className="text-sm text-green-400">{phase.impact}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-slate-200 mb-3">Implementation Risks</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-slate-300">Customer resistance to dynamic pricing</div>
                        <div className="text-xs text-slate-500">
                          Mitigation: Gradual rollout with clear communication
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-slate-300">Technical complexity of battery reallocation</div>
                        <div className="text-xs text-slate-500">Mitigation: Phased approach with pilot testing</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-slate-300">Resource constraints for maintenance program</div>
                        <div className="text-xs text-slate-500">Mitigation: Hire additional technical staff</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-200 mb-3">Success Factors</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-slate-300">Strong data foundation and analytics capability</div>
                        <div className="text-xs text-slate-500">94% model accuracy provides reliable insights</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-slate-300">Experienced operations team</div>
                        <div className="text-xs text-slate-500">Track record of successful implementations</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-slate-300">Customer-centric approach</div>
                        <div className="text-xs text-slate-500">High satisfaction scores and loyalty</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
