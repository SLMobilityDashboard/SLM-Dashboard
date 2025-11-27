import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-96 mx-auto bg-slate-700/50" />
          <Skeleton className="h-6 w-64 mx-auto bg-slate-700/30" />
        </div>

        {/* Upload Card Skeleton */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full bg-slate-700/30" />
          </CardContent>
        </Card>

        {/* Controls Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-32 bg-slate-700/50" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-full bg-slate-700/30" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cabinet Grid Skeleton */}
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardHeader>
            <Skeleton className="h-8 w-64 mx-auto bg-slate-700/50" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i} className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-6 w-24 bg-slate-700/50" />
                      <Skeleton className="h-5 w-5 rounded bg-slate-700/50" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <Skeleton key={j} className="h-12 bg-slate-700/30" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Legend Skeleton */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <Skeleton className="h-6 w-32 mx-auto bg-slate-700/50" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 bg-slate-700/30" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
