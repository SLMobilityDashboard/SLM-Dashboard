import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RevenueFilters } from "@/components/revenue/revenue-filters"
import { RevenueReportsTable } from "@/components/revenue/revenue-reports-table"
import { RevenueExportTools } from "@/components/revenue/revenue-export-tools"

export default function RevenueReportsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Revenue Reports</h2>
        <RevenueExportTools />
      </div>

      <RevenueFilters />

      <Card>
        <CardHeader>
          <CardTitle>Detailed Revenue Reports</CardTitle>
          <CardDescription>Comprehensive revenue data with advanced filtering and export options</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
            <RevenueReportsTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
