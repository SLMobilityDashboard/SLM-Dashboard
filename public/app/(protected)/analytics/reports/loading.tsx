export default function AnalyticsReportsLoading() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading report builder...</p>
      </div>
    </div>
  )
}
