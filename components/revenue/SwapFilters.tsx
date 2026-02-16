"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  CalendarIcon,
  Filter,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

interface SwapFiltersProps {
  onFiltersChange?: (filters: SwapFilters) => void;
}

export interface SwapFilters {
  dateRange?: DateRange;
  selectedAreas: string[];
  selectedStations: string[];
  selectedCustomers: string[];  // ✅ Changed from customerId
  paymentMethods: string[];
}

interface StationData {
  AREA: string;
  STATION: string;
}

// ✅ Fixed hook that fetches customer names
const useSwapFilterData = () => {
  const [areaData, setAreaData] = useState<string[]>([]);
  const [stationData, setStationData] = useState<StationData[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [customerNames, setCustomerNames] = useState<string[]>([]);  // ✅ Added
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      console.log("Already fetched filter data, skipping");
      return;
    }

    hasFetchedRef.current = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        console.log("🔄 Starting to fetch filter data...");

        // ✅ Fetch customer names (with fallback to CUSTOMER_ID if name is empty)
        const customerNamesRes = await fetch("/api/testquery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sql: `SELECT DISTINCT 
                    COALESCE(NULLIF(CUSTOMER_NAME, ''), CUSTOMER_ID) AS CUSTOMER_NAME
                  FROM DB_DUMP.PUBLIC.SWAP_OVERALL
                  WHERE CUSTOMER_ID IS NOT NULL 
                    AND CUSTOMER_ID != ''
                  ORDER BY CUSTOMER_NAME
                  LIMIT 1000`,
          }),
        });

        // Fetch distinct areas
        const areasRes = await fetch("/api/testquery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sql: `SELECT DISTINCT LOCATION_NAME
                  FROM DB_DUMP.PUBLIC.SWAP_OVERALL
                  WHERE LOCATION_NAME IS NOT NULL 
                    AND LOCATION_NAME != ''
                  ORDER BY LOCATION_NAME`,
          }),
        });

        // Fetch stations per area
        const stationsRes = await fetch("/api/testquery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sql: `SELECT DISTINCT 
                    LOCATION_NAME AS AREA, 
                    STATION_NAME AS STATION 
                  FROM DB_DUMP.PUBLIC.SWAP_OVERALL
                  WHERE LOCATION_NAME IS NOT NULL 
                    AND LOCATION_NAME != ''
                    AND STATION_NAME IS NOT NULL 
                    AND STATION_NAME != ''
                  ORDER BY LOCATION_NAME, STATION_NAME`,
          }),
        });

        // Fetch distinct payment methods
        const paymentMethodsRes = await fetch("/api/testquery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sql: `SELECT DISTINCT PAYMENT_METHOD
                  FROM DB_DUMP.PUBLIC.SWAP_OVERALL
                  WHERE PAYMENT_METHOD IS NOT NULL 
                    AND PAYMENT_METHOD != ''
                  ORDER BY PAYMENT_METHOD`,
          }),
        });

        // ✅ Check all responses
        if (!customerNamesRes.ok || !areasRes.ok || !stationsRes.ok || !paymentMethodsRes.ok) {
          const errorText = !customerNamesRes.ok 
            ? await customerNamesRes.text()
            : !areasRes.ok 
            ? await areasRes.text() 
            : !stationsRes.ok 
            ? await stationsRes.text() 
            : await paymentMethodsRes.text();
          throw new Error(`API Error: ${errorText}`);
        }

        const customerNamesData: { CUSTOMER_NAME: string }[] = await customerNamesRes.json();
        const areasData: { LOCATION_NAME: string }[] = await areasRes.json();
        const stationData: StationData[] = await stationsRes.json();
        const paymentMethodsData: { PAYMENT_METHOD: string }[] = await paymentMethodsRes.json();

        console.log(`✅ Loaded ${customerNamesData.length} customer names`);
        console.log(`✅ Loaded ${areasData.length} areas`);
        console.log(`✅ Loaded ${stationData.length} stations`);
        console.log(`✅ Loaded ${paymentMethodsData.length} payment methods`);

        // Debug: Log sample data
        if (customerNamesData.length > 0) {
          console.log("👤 Sample customers:", customerNamesData.slice(0, 5).map(c => c.CUSTOMER_NAME));
        } else {
          console.warn("⚠️ No customer names returned!");
        }

        setCustomerNames(customerNamesData.map(row => row.CUSTOMER_NAME) || []);
        setAreaData(areasData.map(row => row.LOCATION_NAME) || []);
        setStationData(stationData || []);
        setPaymentMethods(paymentMethodsData.map(row => row.PAYMENT_METHOD) || []);
      } catch (err: any) {
        console.error("❌ Failed to fetch filter data:", err);
        setError(err.message || "Failed to fetch filter data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { areaData, stationData, paymentMethods, customerNames, loading, error };
};

// ✅ Helper function for default date range - Last Calendar Year
const getDefaultDateRange = (): DateRange => {
  const today = new Date();
  const lastYear = today.getFullYear() - 1;
  const defaultFrom = new Date(lastYear, 0, 1); // January 1st of last year
  const defaultTo = new Date(lastYear, 11, 31); // December 31st of last year
  return { from: defaultFrom, to: defaultTo };
};

export function SwapFilters({ onFiltersChange }: SwapFiltersProps) {
  const defaultRange = getDefaultDateRange();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempRange, setTempRange] = useState<DateRange | undefined>(defaultRange);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"from" | "to">("from");
  const [quickTime, setQuickTime] = useState<string>("last_year");

  const [filters, setFilters] = useState<SwapFilters>({
    dateRange: defaultRange,
    selectedAreas: [],
    selectedStations: [],
    selectedCustomers: [],  // ✅ Changed from customerId
    paymentMethods: [],
  });

  const [appliedFilters, setAppliedFilters] = useState<SwapFilters>({
    dateRange: defaultRange,
    selectedAreas: [],
    selectedStations: [],
    selectedCustomers: [],  // ✅ Changed from customerId
    paymentMethods: [],
  });

  const { areaData, stationData, paymentMethods, customerNames, loading, error } = useSwapFilterData();

  // Debug: Log when data is loaded
  useEffect(() => {
    if (!loading) {
      console.log("📊 Filter data loaded:", {
        customers: customerNames.length,
        areas: areaData.length,
        stations: stationData.length,
        paymentMethods: paymentMethods.length,
      });
    }
  }, [loading, customerNames.length, areaData.length, stationData.length, paymentMethods.length]);

  const hasPendingChanges = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(appliedFilters);
  }, [filters, appliedFilters]);

  const availableAreas = useMemo(() => {
    return areaData.sort();
  }, [areaData]);

  const availableStations = useMemo(() => {
    if (filters.selectedAreas.length > 0) {
      const result = stationData
        .filter((station) => filters.selectedAreas.includes(station.AREA))
        .map((station) => station.STATION)
        .sort();
      console.log("🏢 Available Stations for selected areas:", result);
      return result;
    }
    return [];
  }, [stationData, filters.selectedAreas]);

  const updateFilters = (newFilters: Partial<SwapFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
  };

  const applyFilters = () => {
    const newAppliedFilters = { ...filters };
    console.log("🎯 [SwapFilters] Applying filters:", newAppliedFilters);
    setAppliedFilters(newAppliedFilters);
    
    onFiltersChange?.(newAppliedFilters);
  };

  const clearAllFilters = () => {
    const cleared: SwapFilters = {
      selectedAreas: [],
      selectedStations: [],
      selectedCustomers: [],  // ✅ Changed from customerId
      paymentMethods: [],
      dateRange: defaultRange,
    };

    console.log("🧹 [SwapFilters] Clearing all filters");
    setFilters(cleared);
    setAppliedFilters(cleared);
    setDateRange(cleared.dateRange);
    setTempRange(cleared.dateRange);
    setQuickTime("last_year");
    
    onFiltersChange?.(cleared);
  };

  const handleAreaChange = (area: string, checked: boolean) => {
    const newAreas = checked
      ? [...filters.selectedAreas, area]
      : filters.selectedAreas.filter((a) => a !== area);

    let newStations = filters.selectedStations;
    if (!checked) {
      const areaStations = stationData
        .filter((station) => station.AREA === area)
        .map((station) => station.STATION);
      newStations = newStations.filter((s) => !areaStations.includes(s));
    }

    updateFilters({
      selectedAreas: newAreas,
      selectedStations: newStations,
    });
  };

  const handleStationChange = (station: string, checked: boolean) => {
    const newStations = checked
      ? [...filters.selectedStations, station]
      : filters.selectedStations.filter((s) => s !== station);

    let newAreas = filters.selectedAreas;

    if (checked) {
      const stationInfo = stationData.find((s) => s.STATION === station);
      if (stationInfo) {
        const areaName = stationInfo.AREA;
        if (!newAreas.includes(areaName)) {
          newAreas = [...newAreas, areaName];
        }
      }
    }

    updateFilters({
      selectedAreas: newAreas,
      selectedStations: newStations,
    });
  };

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    const newMethods = checked
      ? [...filters.paymentMethods, method]
      : filters.paymentMethods.filter((m) => m !== method);
    updateFilters({ paymentMethods: newMethods });
  };

  // ✅ Fixed customer change handler
  const handleCustomerChange = (customer: string, checked: boolean) => {
    const newCustomers = checked
      ? [...filters.selectedCustomers, customer]
      : filters.selectedCustomers.filter((c) => c !== customer);
    updateFilters({ selectedCustomers: newCustomers });
  };

  const MonthYearSelector = ({
    date,
    onMonthChange,
    onYearChange,
  }: {
    date: Date;
    onMonthChange: (month: number) => void;
    onYearChange: (year: number) => void;
  }) => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    return (
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <Select
          value={date.getMonth().toString()}
          onValueChange={(value) => onMonthChange(parseInt(value))}
        >
          <SelectTrigger className="w-20 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month, index) => (
              <SelectItem key={index} value={index.toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onYearChange(date.getFullYear() - 1)}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>

          <Select
            value={date.getFullYear().toString()}
            onValueChange={(value) => onYearChange(parseInt(value))}
          >
            <SelectTrigger className="w-16 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 21 }, (_, i) => {
                const year = new Date().getFullYear() - 10 + i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onYearChange(date.getFullYear() + 1)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (dateRange?.from || dateRange?.to) count++;
    if (filters.selectedAreas.length > 0) count++;
    if (filters.selectedStations.length > 0) count++;
    if (filters.selectedCustomers.length > 0) count++;  // ✅ Changed
    if (filters.paymentMethods.length > 0) count++;
    return count;
  };

  const handleQuickTimeChange = (value: string) => {
    setQuickTime(value);

    if (value === "custom") {
      return;
    }

    const today = new Date();
    let newFrom = new Date();
    let newTo = new Date();

    switch (value) {
      case "last_week":
        newFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        newTo = today;
        break;
      case "last_month":
        newFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        newTo = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "this_month":
        newFrom = new Date(today.getFullYear(), today.getMonth(), 1);
        newTo = new Date(today);
        break;
      case "last_3_months":
        newFrom = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        newTo = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "last_year":
        const lastYear = today.getFullYear() - 1;
        newFrom = new Date(lastYear, 0, 1); // January 1st of last year
        newTo = new Date(lastYear, 11, 31); // December 31st of last year
        break;
      default:
        return;
    }

    const range = { from: newFrom, to: newTo };
    setDateRange(range);
    setTempRange(range);
    updateFilters({ dateRange: range });
  };

  const applyDateRange = () => {
    if (!tempRange?.from || !tempRange?.to) return;

    const filterRange = {
      from: new Date(tempRange.from),
      to: new Date(tempRange.to),
    };

    setDateRange(filterRange);
    setFilters((prev) => ({ ...prev, dateRange: filterRange }));

    setTimeout(() => {
      setFilters((current) => {
        setAppliedFilters(current);
        return current;
      });
    }, 0);

    setQuickTime("custom");
    setIsCalendarOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    setTempRange((prevRange) => {
      const newRange = { ...prevRange } || {};

      if (datePickerMode === "from") {
        newRange.from = date;
        if (newRange.to && date > newRange.to) {
          newRange.to = undefined;
        }
      } else if (datePickerMode === "to") {
        newRange.to = date;
        if (newRange.from && date < newRange.from) {
          newRange.from = undefined;
        }
      }

      return newRange;
    });
  };

  const handleCalendarMonthChange = (month: number) => {
    const newDate = new Date(currentMonth.getFullYear(), month);
    setCurrentMonth(newDate);

    if (datePickerMode === "from") {
      const firstDayOfMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
      setTempRange((prev) => ({ ...prev, from: firstDayOfMonth }));
    } else {
      const lastDayOfMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
      setTempRange((prev) => ({ ...prev, to: lastDayOfMonth }));
    }
  };

  const handleCalendarYearChange = (year: number) => {
    const newDate = new Date(year, currentMonth.getMonth());
    setCurrentMonth(newDate);

    if (datePickerMode === "from") {
      const firstDayOfMonth = new Date(year, newDate.getMonth(), 1);
      setTempRange((prev) => ({ ...prev, from: firstDayOfMonth }));
    } else {
      const lastDayOfMonth = new Date(year, newDate.getMonth() + 1, 0);
      setTempRange((prev) => ({ ...prev, to: lastDayOfMonth }));
    }
  };

  const isDateRangeDisabled = quickTime !== "custom";

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin h-5 w-5 mr-2" />
          <span>Loading filter options...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600">
            <p className="font-medium">Error loading filters</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary">{getActiveFiltersCount()} active</Badge>
            )}
            {hasPendingChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Changes pending
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {hasPendingChanges && (
              <Button
                variant="default"
                size="sm"
                onClick={applyFilters}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Apply Filters
              </Button>
            )}
            {getActiveFiltersCount() > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Quick Time Filter */}
          <div className="space-y-2">
            <Label>Quick Time</Label>
            <Select value={quickTime} onValueChange={handleQuickTimeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Picker */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    isDateRangeDisabled
                      ? "opacity-50 cursor-not-allowed bg-muted"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  disabled={isDateRangeDisabled}
                  onClick={() => !isDateRangeDisabled && setIsCalendarOpen(true)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                          {format(dateRange.to, "MMM dd, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM dd, yyyy")
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              {!isDateRangeDisabled && (
                <PopoverContent className="w-auto p-0 shadow-lg border-0" align="start">
                  <div className="bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                    <div className="p-4 space-y-4">
                      <div className="flex justify-center">
                        <div className="flex rounded-md bg-muted p-1">
                          <Button
                            variant={datePickerMode === "from" ? "default" : "ghost"}
                            size="sm"
                            className="px-3 py-1 text-xs"
                            onClick={() => setDatePickerMode("from")}
                          >
                            From Date
                          </Button>
                          <Button
                            variant={datePickerMode === "to" ? "default" : "ghost"}
                            size="sm"
                            className="px-3 py-1 text-xs"
                            onClick={() => setDatePickerMode("to")}
                          >
                            To Date
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <MonthYearSelector
                          date={currentMonth}
                          onMonthChange={handleCalendarMonthChange}
                          onYearChange={handleCalendarYearChange}
                        />
                        <Calendar
                          selected={
                            datePickerMode === "from" ? tempRange?.from : tempRange?.to
                          }
                          onSelect={handleDateSelect}
                          mode="single"
                          month={currentMonth}
                          numberOfMonths={1}
                          showOutsideDays={false}
                          className="p-0"
                          modifiers={{
                            selected_range_start: tempRange?.from,
                            selected_range_end: tempRange?.to,
                            selected_range_middle:
                              tempRange?.from && tempRange?.to
                                ? (date: Date) =>
                                    tempRange.from! < date && date < tempRange.to!
                                : undefined,
                          }}
                          modifiersClassNames={{
                            selected_range_start:
                              "bg-primary text-primary-foreground rounded-r-none",
                            selected_range_end:
                              "bg-primary text-primary-foreground rounded-l-none",
                            selected_range_middle:
                              "bg-accent/30 text-accent-foreground rounded-none",
                          }}
                          classNames={{
                            months: "flex flex-col space-y-4",
                            month: "space-y-2",
                            caption: "hidden",
                            nav: "hidden",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell:
                              "text-muted-foreground rounded-md w-8 font-normal text-[0.7rem] text-center",
                            row: "flex w-full mt-1",
                            cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                            day: "h-8 w-8 p-0 font-normal text-xs hover:bg-accent hover:text-accent-foreground rounded-md transition-all duration-200 cursor-pointer",
                            day_selected:
                              "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
                            day_today: "bg-accent/80 text-accent-foreground font-semibold",
                            day_outside: "text-muted-foreground/50 opacity-50",
                            day_disabled: "text-muted-foreground/30 cursor-not-allowed",
                            day_hidden: "invisible",
                          }}
                        />
                      </div>

                      <div className="border-t pt-3 space-y-3">
                        {tempRange?.from && tempRange?.to && (
                          <div className="flex items-center justify-between text-xs">
                            <div className="text-muted-foreground">
                              <span className="font-medium">Selected Range:</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                                {format(tempRange.from, "MMM dd, yyyy")} -{" "}
                                {format(tempRange.to, "MMM dd, yyyy")}
                              </span>
                              <span className="text-muted-foreground">
                                (
                                {Math.ceil(
                                  (tempRange.to.getTime() - tempRange.from.getTime()) /
                                    (1000 * 60 * 60 * 24)
                                ) + 1}{" "}
                                days)
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button
                            onClick={applyDateRange}
                            disabled={!tempRange?.from || !tempRange?.to}
                            variant="default"
                            size="sm"
                          >
                            Apply Date Range
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              )}
            </Popover>
          </div>

          {/* ✅ Customer - Multi-select */}
          <div className="space-y-2">
            <Label>Customer ({customerNames.length} available)</Label>
            <Select
              value=""
              onValueChange={(value) => {
                if (!filters.selectedCustomers.includes(value)) {
                  handleCustomerChange(value, true);
                }
              }}
              disabled={customerNames.length === 0}
            >
              <SelectTrigger>
                <span>
                  {filters.selectedCustomers.length > 0
                    ? `${filters.selectedCustomers.length} selected`
                    : customerNames.length === 0
                    ? "No customers available"
                    : "Select customers"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {customerNames
                  .filter((customer) => !filters.selectedCustomers.includes(customer))
                  .map((customer) => (
                    <SelectItem key={customer} value={customer}>
                      {customer}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1">
              {filters.selectedCustomers.map((customer) => (
                <Badge key={customer} variant="secondary">
                  {customer}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => handleCustomerChange(customer, false)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Area */}
          <div className="space-y-2">
            <Label>Area ({availableAreas.length} available)</Label>
            <Select
              value=""
              onValueChange={(value) => {
                if (!filters.selectedAreas.includes(value)) {
                  handleAreaChange(value, true);
                }
              }}
              disabled={availableAreas.length === 0}
            >
              <SelectTrigger>
                <span>
                  {filters.selectedAreas.length > 0
                    ? `${filters.selectedAreas.length} selected`
                    : availableAreas.length === 0
                    ? "No areas available"
                    : "Select areas"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {availableAreas
                  .filter((area) => !filters.selectedAreas.includes(area))
                  .map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1">
              {filters.selectedAreas.map((area) => (
                <Badge key={area} variant="secondary">
                  {area}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => handleAreaChange(area, false)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* BSS Stations */}
          {filters.selectedAreas.length > 0 && (
            <div className="space-y-2">
              <Label>BSS Stations ({availableStations.length} available)</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (!filters.selectedStations.includes(value)) {
                    handleStationChange(value, true);
                  }
                }}
                disabled={availableStations.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      filters.selectedStations.length > 0
                        ? `${filters.selectedStations.length} selected`
                        : availableStations.length === 0
                        ? "No stations available"
                        : "Select stations"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableStations
                    .filter((station) => !filters.selectedStations.includes(station))
                    .map((station) => (
                      <SelectItem key={station} value={station}>
                        {station}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1">
                {filters.selectedStations.map((station) => (
                  <Badge key={station} variant="secondary">
                    {station}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => handleStationChange(station, false)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="space-y-2">
            <Label>Payment Method ({paymentMethods.length} available)</Label>
            <Select
              value=""
              onValueChange={(value) => {
                if (!filters.paymentMethods.includes(value)) {
                  handlePaymentMethodChange(value, true);
                }
              }}
              disabled={paymentMethods.length === 0}
            >
              <SelectTrigger>
                <span>
                  {filters.paymentMethods.length > 0
                    ? `${filters.paymentMethods.length} selected`
                    : paymentMethods.length === 0
                    ? "No methods available"
                    : "Select methods"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {paymentMethods
                  .filter((method) => !filters.paymentMethods.includes(method))
                  .map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1">
              {filters.paymentMethods.map((method) => (
                <Badge key={method} variant="secondary">
                  {method}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => handlePaymentMethodChange(method, false)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}