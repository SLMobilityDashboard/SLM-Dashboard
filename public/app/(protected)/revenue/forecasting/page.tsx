import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RevenueFilters } from "@/components/revenue/revenue-filters"
import { RevenueForecastChart } from "@/components/revenue/revenue-forecast-chart"
import { RevenueProjections } from "@/components/revenue/revenue-projections"
import { SeasonalAnalysis } from "@/components/revenue/seasonal-analysis"

export default function RevenueForecastingPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Revenue Forecasting</h2>
      </div>

      <RevenueFilters />

      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecast</CardTitle>
              <CardDescription>AI-powered revenue predictions based on historical data and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
                <RevenueForecastChart />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Projections</CardTitle>
              <CardDescription>Scenario-based revenue projections and growth estimates</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
                <RevenueProjections />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Seasonal Analysis</CardTitle>
              <CardDescription>Understanding seasonal patterns and their impact on revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
                <SeasonalAnalysis />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
