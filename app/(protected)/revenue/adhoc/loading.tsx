import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdHocAnalysisLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="container mx-auto p-6">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2 bg-slate-800" />
          <Skeleton className="h-4 w-96 bg-slate-800" />
        </div>

        {/* Tabs Skeleton */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg w-full">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 flex-1 bg-slate-700" />
            ))}
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <Skeleton className="h-6 w-32 bg-slate-800" />
                <Skeleton className="h-4 w-48 bg-slate-800" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 border border-slate-700 rounded-lg"
                  >
                    <Skeleton className="h-5 w-24 mb-2 bg-slate-800" />
                    <Skeleton className="h-4 w-32 bg-slate-800" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <Skeleton className="h-6 w-40 bg-slate-800" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full bg-slate-800" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-24 bg-slate-800" />
                    <Skeleton className="h-10 w-24 bg-slate-800" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
