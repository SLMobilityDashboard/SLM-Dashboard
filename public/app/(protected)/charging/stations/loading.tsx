import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard-layout";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64 bg-slate-800" />
          <Skeleton className="h-4 w-48 mt-2 bg-slate-800" />
        </div>
        <Skeleton className="h-10 w-full md:w-72 bg-slate-800" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-10 w-full bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card
              key={i}
              className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm"
            >
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32 bg-slate-800" />
                <Skeleton className="h-3 w-24 mt-1 bg-slate-800" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 bg-slate-800" />
                <Skeleton className="h-3 w-32 mt-2 bg-slate-800" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mt-6">
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-slate-800" />
            <Skeleton className="h-4 w-64 mt-1 bg-slate-800" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full bg-slate-800" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card
              key={i}
              className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm"
            >
              <CardHeader>
                <Skeleton className="h-6 w-48 bg-slate-800" />
                <Skeleton className="h-4 w-64 mt-1 bg-slate-800" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full bg-slate-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
