"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { Clock, TrendingUp, AlertCircle, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface HourlyPaymentsChartProps {
  filters?: {
    dateRange?: {
      from: Date;
      to: Date;
    };
    selectedProvinces: string[];
    selectedDistricts: string[];
    selectedAreas: string[];
    selectedStations: string[];
  };
}

export function HourlyPaymentsChart({ filters }: HourlyPaymentsChartProps) {
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Fetch hourly payment data with all filters applied
  const prevFiltersRef = useRef<string>("");
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fetchHourlyData = async () => {
      if (!filters?.dateRange?.from || !filters?.dateRange?.to) {
        return;
      }

      // check the filters object to avoid duplicate fetches
      const filtersString = JSON.stringify(filters);
      if (filtersString === prevFiltersRef.current || isFetchingRef.current) {
        console.log("Filters unchanged or fetch in progress, skipping update");
        return; // Do nothing
      }

      setLoading(true);
      setError(null);

      try {
        // Build geographic filter conditions
        const buildGeographicFilters = () => {
          let conditions = [];

          if (filters.selectedProvinces?.length > 0) {
            const provinces = filters.selectedProvinces
              .map((p) => `'${p.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`adp.PROVICE_NAME IN (${provinces})`);
          }

          if (filters.selectedDistricts?.length > 0) {
            const districts = filters.selectedDistricts
              .map((d) => `'${d.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`adp.DISTRICT_NAME IN (${districts})`);
          }

          if (filters.selectedAreas?.length > 0) {
            const areas = filters.selectedAreas
              .map((a) => `'${a.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`fp.LOCATION_NAME IN (${areas})`);
          }

          if (filters.selectedStations?.length > 0) {
            const stations = filters.selectedStations
              .map((s) => `'${s.replace(/'/g, "''")}'`)
              .join(", ");
            conditions.push(`fp.STATION_NAME IN (${stations})`);
          }

          return conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";
        };

        const geographicFilters = buildGeographicFilters();

        const addOneDay = (date: Date) => {
          const newDate = new Date(date);
          newDate.setDate(newDate.getDate() + 1);
          return newDate;
        };

        // Convert timestamps to milliseconds for filtering
        const fromTimestamp = filters.dateRange.from.getTime(); // add 1 day here
        const toTimestamp =
          Math.floor(filters.dateRange.to.getTime()) + 86399000; // End of day

        const hourlyQuery = `
          SELECT 
            HOUR(TO_TIMESTAMP_NTZ(fp.CREATED_EPOCH / 1000)) as HOUR,
            COUNT(*) as PAYMENT_COUNT,
            SUM(fp.AMOUNT) as TOTAL_AMOUNT,
            COUNT(DISTINCT fp.CUSTOMER_ID) as UNIQUE_CUSTOMERS,
            COUNT(DISTINCT fp.STATION_NAME) as ACTIVE_STATIONS,
            COUNT(CASE WHEN fp.PAYMENT_STATUS = 'PAID' THEN 1 END) as PAID_PAYMENTS,
            COUNT(CASE WHEN fp.PAYMENT_STATUS = 'VOIDED' THEN 1 END) as VOIDED_PAYMENTS,
            AVG(fp.AMOUNT) as AVG_AMOUNT
          FROM SOURCE_DATA.DYNAMO_DB.FACT_PAYMENT fp
          LEFT JOIN SOURCE_DATA.MASTER_DATA.AREA_DISTRICT_PROVICE_LOOKUP adp 
            ON fp.LOCATION_NAME = adp.AREA_NAME
          WHERE fp.CREATED_EPOCH >= ${fromTimestamp}
            AND fp.CREATED_EPOCH <= ${toTimestamp}
            AND fp.CREATED_EPOCH IS NOT NULL
            AND fp.PAYMENT_TYPE = 'BATTERY_SWAP'
            AND fp.PAYMENT_STATUS != 'CANCELLED'
            ${geographicFilters}
          GROUP BY HOUR(TO_TIMESTAMP_NTZ(fp.CREATED_EPOCH / 1000))
          ORDER BY HOUR(TO_TIMESTAMP_NTZ(fp.CREATED_EPOCH / 1000))
        `;

        console.log("Hourly Payments Query:", hourlyQuery);

        const response = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql: hourlyQuery }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch hourly data: ${response.status}`);
        }

        const result = await response.json();
        console.log("Hourly Payments Data:", result);

        setHourlyData(result || []);
      } catch (err) {
        console.error("Error fetching hourly payment data:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHourlyData();
  }, [
    filters?.dateRange?.from,
    filters?.dateRange?.to,
    filters?.selectedProvinces,
    filters?.selectedDistricts,
    filters?.selectedAreas,
    filters?.selectedStations,
  ]);

  // Transform data for simple aggregated chart
  const chartData = useMemo(() => {
    if (!hourlyData.length) {
      // Create 24-hour template with zero values if no data
      return Array.from({ length: 24 }, (_, index) => ({
        hour: index,
        hourLabel: `${index.toString().padStart(2, "0")}:00`,
        payments: 0,
        amount: 0,
        customers: 0,
        stations: 0,
        paidPayments: 0,
        voidedPayments: 0,
        avgAmount: 0,
      }));
    }

    // Create complete 24-hour array and fill with data
    const hourlyMap = new Map();
    hourlyData.forEach((item) => {
      hourlyMap.set(item.HOUR, item);
    });

    return Array.from({ length: 24 }, (_, index) => {
      const hourData = hourlyMap.get(index);

      return {
        hour: index,
        hourLabel: `${index.toString().padStart(2, "0")}:00`,
        payments: hourData?.PAYMENT_COUNT || 0,
        amount: hourData?.TOTAL_AMOUNT || 0,
        customers: hourData?.UNIQUE_CUSTOMERS || 0,
        stations: hourData?.ACTIVE_STATIONS || 0,
        paidPayments: hourData?.PAID_PAYMENTS || 0,
        voidedPayments: hourData?.VOIDED_PAYMENTS || 0,
        avgAmount: hourData?.AVG_AMOUNT || 0,
      };
    });
  }, [hourlyData]);

  // Calculate summary stats
  const totalPayments = chartData.reduce((sum, item) => sum + item.payments, 0);
  const totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);
  const peakHour = chartData.reduce(
    (peak, current) => (current.payments > peak.payments ? current : peak),
    chartData[0] || { hour: 0, payments: 0 }
  );
  const averagePaymentsPerHour = totalPayments / 24;
  const totalPaidPayments = chartData.reduce(
    (sum, item) => sum + item.paidPayments,
    0
  );
  const totalVoidedPayments = chartData.reduce(
    (sum, item) => sum + item.voidedPayments,
    0
  );
  const paidRate =
    totalPayments > 0 ? (totalPaidPayments / totalPayments) * 100 : 0;

  // Get bar color based on payment volume
  const getBarColor = (payments, maxPayments) => {
    const intensity = maxPayments > 0 ? payments / maxPayments : 0;
    if (intensity > 0.8) return "#dc2626"; // High volume - red
    if (intensity > 0.6) return "#ea580c"; // Medium-high - orange
    if (intensity > 0.4) return "#d97706"; // Medium - amber
    if (intensity > 0.2) return "#ca8a04"; // Low-medium - yellow
    return "#65a30d"; // Low volume - green
  };

  const maxPayments = Math.max(...chartData.map((item) => item.payments));

  // Create filter summary
  const filterSummary = [];
  if (filters?.selectedProvinces?.length > 0) {
    filterSummary.push(`${filters.selectedProvinces.length} provinces`);
  }
  if (filters?.selectedDistricts?.length > 0) {
    filterSummary.push(`${filters.selectedDistricts.length} districts`);
  }
  if (filters?.selectedAreas?.length > 0) {
    filterSummary.push(`${filters.selectedAreas.length} areas`);
  }
  if (filters?.selectedStations?.length > 0) {
    filterSummary.push(`${filters.selectedStations.length} stations`);
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-[350px] bg-gray-100 rounded animate-pulse flex items-center justify-center">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Unable to load hourly payment data
            </p>
            <p className="text-xs text-red-500 mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Filter Summary */}
      <div className="flex items-center justify-between">
        {filterSummary.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Filtered by: {filterSummary.join(", ")}
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="hourLabel"
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 11 }}
            interval={1}
          />
          <YAxis
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const isLowVolume = data.payments === 0;
                const isPeakHour = data.hour === peakHour.hour;

                return (
                  <div className="rounded-lg border bg-background p-3 shadow-sm max-w-xs">
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{label}</span>
                        {isPeakHour && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            Peak Hour
                          </span>
                        )}
                        {isLowVolume && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            No Activity
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-[0.65rem] uppercase text-muted-foreground">
                            Total Payments
                          </span>
                          <div className="font-bold text-primary">
                            {data.payments?.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-[0.65rem] uppercase text-muted-foreground">
                            Amount
                          </span>
                          <div className="font-bold text-green-600">
                            Rs. {data.amount?.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-[0.65rem] uppercase text-muted-foreground">
                            Paid
                          </span>
                          <div className="font-bold text-blue-600">
                            {data.paidPayments} (
                            {data.payments > 0
                              ? (
                                  (data.paidPayments / data.payments) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </div>
                        </div>
                        <div>
                          <span className="text-[0.65rem] uppercase text-muted-foreground">
                            Voided
                          </span>
                          <div className="font-bold text-red-600">
                            {data.voidedPayments} (
                            {data.payments > 0
                              ? (
                                  (data.voidedPayments / data.payments) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </div>
                        </div>
                        <div>
                          <span className="text-[0.65rem] uppercase text-muted-foreground">
                            Avg Amount
                          </span>
                          <div className="font-bold text-orange-600">
                            Rs. {data.avgAmount?.toFixed(0)}
                          </div>
                        </div>
                        <div>
                          <span className="text-[0.65rem] uppercase text-muted-foreground">
                            Active Stations
                          </span>
                          <div className="font-bold text-purple-600">
                            {data.stations}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="payments" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.payments, maxPayments)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Activity Analysis */}
      {totalPayments > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              Battery Swap Payment Analysis - {totalPayments} payments
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Morning Peak:</span>
              <div className="font-medium">
                {(() => {
                  const morningPeak = chartData
                    .slice(6, 12)
                    .reduce((max, curr) =>
                      curr.payments > max.payments ? curr : max
                    );
                  return `${morningPeak.hourLabel} (${morningPeak.payments})`;
                })()}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Evening Peak:</span>
              <div className="font-medium">
                {(() => {
                  const eveningPeak = chartData
                    .slice(17, 23)
                    .reduce((max, curr) =>
                      curr.payments > max.payments ? curr : max
                    );
                  return `${eveningPeak.hourLabel} (${eveningPeak.payments})`;
                })()}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Night Activity:</span>
              <div className="font-medium">
                {(() => {
                  const nightPayments = [
                    ...chartData.slice(0, 6),
                    ...chartData.slice(22),
                  ].reduce((sum, curr) => sum + curr.payments, 0);
                  return `${((nightPayments / totalPayments) * 100).toFixed(
                    1
                  )}%`;
                })()}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Day Activity:</span>
              <div className="font-medium">
                {(() => {
                  const dayPayments = chartData
                    .slice(6, 22)
                    .reduce((sum, curr) => sum + curr.payments, 0);
                  return `${((dayPayments / totalPayments) * 100).toFixed(1)}%`;
                })()}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default HourlyPaymentsChart;
