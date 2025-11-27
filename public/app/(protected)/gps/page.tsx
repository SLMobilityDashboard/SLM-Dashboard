// =======================
// Main GPS Page Component
// =======================
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GPSFilters } from "@/components/gps/gps-filters";
import { GPSMetrics } from "@/components/gps/gps-metrics";
import { GPSChart } from "@/components/gps/gps-chart";
import TopPerformingScooters from "@/components/gps/top";
import DistanceByBatteryType from "@/components/gps/DistanceByBatteryType";
import { Activity, AlertCircle } from "lucide-react";
import { Separator } from "@radix-ui/react-select";
import useVehicleMetadata from "@/hooks/Snowflake/gps/useVehicleMetadata";
import type { GPSFilters as GPSFiltersType, AggregatedData } from "@/types/gps";

export default function GPSPage() {
  // Initialize filters with default values
  const getDefaultDateRange = () => {
    const today = new Date();
    const from = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from, to };
  };

  const [filters, setFilters] = useState<GPSFiltersType>({
    quickTime: "last_year",
    dateRange: getDefaultDateRange(),
    aggregation: "monthly",
    selectedTboxes: [],
    selectedBmses: [],
    selectedBatteryTypes: [],
  });

  const {
    tboxes,
    bmses,
    batteryTypes,
    aggregatedData,
    loading: metadataLoading,
    error,
  } = useVehicleMetadata(filters);

  // Process aggregatedData for charts and battery distance
  const processedData = useMemo(() => {
    if (!aggregatedData.length) {
      return {
        gpsData: [],
        batteryTypeDistanceData: [],
      };
    }

    const gpsData = aggregatedData.map((row: AggregatedData) => ({
      date: row.period_start,
      GPS: row.total_distance,
      points: row.total_points,
      vehicles: row.vehicle_count,
    }));

    const batteryTypeDistanceData = aggregatedData.flatMap(
      (row: AggregatedData) =>
        row.battery_names?.map((name: string) => ({
          BATTERY_TYPE: name,
          TOTAL_DISTANCE: row.total_distance / (row.battery_names?.length || 1),
          BATTERY_NAME: name,
        })) || []
    );

    return {
      gpsData,
      batteryTypeDistanceData,
    };
  }, [aggregatedData]);

  const isDateRangeSet =
    filters.dateRange &&
    filters.dateRange.from instanceof Date &&
    filters.dateRange.to instanceof Date;

  const handleFiltersChange = (newFilters: GPSFiltersType) => {
    console.log("Filters changed:", newFilters);
    setFilters(newFilters);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
          <Activity className="h-4 w-4 text-cyan-400 mr-2" />
          <span className="text-cyan-400 text-sm font-medium">
            GPS Overview
          </span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          GPS Points and Distances
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Explore GPS data for electric scooters with cascading filters by TBOX
          ID, BMS ID, and Battery Type.
        </p>
      </div>

      {/* Filters */}
      <GPSFilters
        tboxes={tboxes}
        bmses={bmses}
        batteryTypes={batteryTypes}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        loading={metadataLoading}
      />

      <Separator className="my-6" />

      {/* Error */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error loading data:</span>
            </div>
            <p className="text-red-400/80 mt-1 text-sm">{error}</p>
            <p className="text-red-400/60 mt-2 text-xs">
              Please check your database connection and table schema.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {metadataLoading ? (
        <div className="text-center p-8">
          <div className="flex items-center justify-center gap-2">
            <Activity className="h-6 w-6 animate-spin text-cyan-400" />
            <p className="text-lg text-muted-foreground">
              Loading GPS data and filters...
            </p>
          </div>
        </div>
      ) : isDateRangeSet || filters.quickTime !== "custom" ? (
        <>
          <GPSMetrics
            aggregatedData={aggregatedData}
            loading={metadataLoading}
            error={error}
          />

          <div className="grid gap-4">
            <GPSChart filters={filters} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TopPerformingScooters
              filters={{
                dateRange:
                  filters.dateRange &&
                  filters.dateRange.from &&
                  filters.dateRange.to
                    ? {
                        from: filters.dateRange.from,
                        to: filters.dateRange.to,
                      }
                    : undefined,
                selectedBatteryTypes: filters.selectedBatteryTypes || [],
              }}
            />

            <Card>
              <CardHeader>
                <CardTitle>Distance by Battery Type</CardTitle>
                <CardDescription>
                  Proportion of total distance travelled by battery types.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[550px]">
                <DistanceByBatteryType
                  filters={{
                    dateRange: filters.dateRange,
                    selectedBatteryTypes: filters.selectedBatteryTypes,
                    selectedScooters: filters.selectedTboxes, // 👈 map correctly
                    selectedBms: filters.selectedBmses, // 👈 map correctly
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center p-8">
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg text-muted-foreground">
                Please select a valid date range to view GPS data.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Use the "Quick Time" filter above or select a custom date range.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
