export default function SalesLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-slate-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-96 bg-slate-800 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-slate-700 rounded animate-pulse"></div>
            <div className="h-10 w-24 bg-slate-700 rounded animate-pulse"></div>
          </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border-slate-700 backdrop-blur-sm rounded-lg p-4"
            >
              <div className="h-4 w-20 bg-slate-700 rounded animate-pulse mb-3"></div>
              <div className="h-8 w-24 bg-slate-600 rounded animate-pulse mb-2"></div>
              <div className="h-3 w-16 bg-slate-800 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border-slate-700 backdrop-blur-sm rounded-lg p-6"
            >
              <div className="h-6 w-48 bg-slate-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-slate-800 rounded animate-pulse mb-4"></div>
              <div className="h-64 bg-slate-700/30 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-slate-800/50 border-slate-700 backdrop-blur-sm rounded-lg p-6">
          <div className="h-6 w-32 bg-slate-700 rounded animate-pulse mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 w-16 bg-slate-700 rounded animate-pulse"></div>
                <div className="h-4 w-32 bg-slate-700 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-slate-700 rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-slate-700 rounded animate-pulse"></div>
                <div className="h-4 w-28 bg-slate-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
