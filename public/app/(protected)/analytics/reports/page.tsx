import { Suspense } from "react"
import { ProfessionalReportBuilder } from "./components/professional-report-builder"

export default function AnalyticsReportsPage() {
  return (
    <div className="h-screen flex flex-col">
      <Suspense fallback={<div className="h-full bg-muted animate-pulse" />}>
        <ProfessionalReportBuilder />
      </Suspense>
    </div>
  )
}
