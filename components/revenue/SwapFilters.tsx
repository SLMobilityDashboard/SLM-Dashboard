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
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

interface SwapFiltersProps {
  onFiltersChange?: (filters: SwapFilters) => void;
}

export interface SwapFilters {
  dateRange?: DateRange;
  selectedProvinces: string[];
  selectedDistricts: string[];
  selectedAreas: string[];
  selectedStations: string[];
  customerId: string;
  paymentMethods: string[];
}

interface StationData {
  AREA: string;
  STATION: string;
}

interface PaymentAreaData {
  AREA: string;
  DISTRICT: string;
  PROVINCE: string;
}

// Custom hook that fetches geographic hierarchy from swap data
const useGeographicHierarchy = () => {
  const [completeHierarchy, setCompleteHierarchy] = useState<PaymentAreaData[]>([]);
  const [stationData, setStationData] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      console.log("Already fetched geographic data, skipping");
      return;
    }

    hasFetchedRef.current = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const hierarchyRes = await fetch("/api/testquery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sql: `SELECT DISTINCT 
                    so.LOCATION_NAME AS AREA,
                    adp.DISTRICT_NAME AS DISTRICT,
                    adp.PROVINCE_NAME AS PROVINCE
                  FROM DB_DUMP.PUBLIC.SWAP_OVERALL so
                  JOIN SOURCE_DATA.MASTER_DATA.AREA_DISTRICT_PROVICE_LOOKUP adp 
                    ON so.LOCATION_NAME = adp.AREA_NAME
                  WHERE so.AMOUNT > 0
                    AND so.STATION_NAME IS NOT NULL AND so.STATION_NAME != ''
                    AND so.LOCATION_NAME IS NOT NULL AND so.LOCATION_NAME != ''
                    AND so.TRANSACTION_TIME > 946684800000
                  ORDER BY PROVINCE, DISTRICT, AREA`,
          }),
        });

        const stationsRes = await fetch("/api/testquery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sql: `SELECT DISTINCT 
                    so.LOCATION_NAME AS AREA, 
                    so.STATION_NAME AS STATION 
                  FROM DB_DUMP.PUBLIC.SWAP_OVERALL so
                  WHERE so.AMOUNT > 0
                    AND so.STATION_NAME IS NOT NULL AND so.STATION_NAME != ''
                    AND so.LOCATION_NAME IS NOT NULL AND so.LOCATION_NAME != ''
                    AND so.TRANSACTION_TIME > 946684800000
                  ORDER BY AREA, STATION`,
          }),
        });

        if (!hierarchyRes.ok || !stationsRes.ok) {
          throw new Error("Failed to fetch geographic data");
        }

        const hierarchyData: PaymentAreaData[] = await hierarchyRes.json();
        const stationData: StationData[] = await stationsRes.json();

        console.log(`✅ Loaded ${hierarchyData.length} areas and ${stationData.length} stations`);

        setCompleteHierarchy(hierarchyData || []);
        setStationData(stationData || []);
      } catch (err: any) {
        console.error("Failed to fetch geographic data:", err);
        setError(err.message || "Failed to fetch geographic data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { completeHierarchy, stationData, loading, error };
};

export function SwapFilters({ onFiltersChange }: SwapFiltersProps) {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const defaultTo = new Date(today.getFullYear(), today.getMonth(), 0);
  const defaultRange: DateRange = { from: defaultFrom, to: defaultTo };

  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempRange, setTempRange] = useState<DateRange | undefined>(defaultRange);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"from" | "to">("from");
  const [quickTime, setQuickTime] = useState<string>("last_month");

  const [filters, setFilters] = useState<SwapFilters>({
    dateRange: defaultRange,
    selectedProvinces: [],
    selectedDistricts: [],
    selectedAreas: [],
    selectedStations: [],
    customerId: "",
    paymentMethods: [],
  });

  const [appliedFilters, setAppliedFilters] = useState<SwapFilters>({
    dateRange: defaultRange,
    selectedProvinces: [],
    selectedDistricts: [],
    selectedAreas: [],
    selectedStations: [],
    customerId: "",
    paymentMethods: [],
  });

  const { completeHierarchy, stationData, loading } = useGeographicHierarchy();

  const hasPendingChanges = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(appliedFilters);
  }, [filters, appliedFilters]);

  const paymentMethods = [
    "Credit Card",
    "Mobile Payment",
    "Subscription",
    "Cash",
    "Corporate Account",
  ];

  const availableProvinces = useMemo(() => {
    const provinces = new Set<string>();
    completeHierarchy.forEach((item) => provinces.add(item.PROVINCE));
    return Array.from(provinces).sort();
  }, [completeHierarchy]);

  const availableDistricts = useMemo(() => {
    const districts = new Set<string>();
    let filteredData = completeHierarchy;

    if (filters.selectedProvinces.length > 0) {
      filteredData = filteredData.filter((item) =>
        filters.selectedProvinces.includes(item.PROVINCE)
      );
    }

    filteredData.forEach((item) => districts.add(item.DISTRICT));
    return Array.from(districts).sort();
  }, [completeHierarchy, filters.selectedProvinces]);

  const availableAreas = useMemo(() => {
    const areas = new Set<string>();
    let filteredData = completeHierarchy;

    if (filters.selectedProvinces.length > 0) {
      filteredData = filteredData.filter((item) =>
        filters.selectedProvinces.includes(item.PROVINCE)
      );
    }

    if (filters.selectedDistricts.length > 0) {
      filteredData = filteredData.filter((item) =>
        filters.selectedDistricts.includes(item.DISTRICT)
      );
    }

    filteredData.forEach((item) => areas.add(item.AREA));
    return Array.from(areas).sort();
  }, [completeHierarchy, filters.selectedProvinces, filters.selectedDistricts]);

  const availableStations = useMemo(() => {
    if (filters.selectedAreas.length > 0) {
      return stationData
        .filter((station) => filters.selectedAreas.includes(station.AREA))
        .map((station) => station.STATION)
        .sort();
    }
    return [];
  }, [stationData, filters.selectedAreas]);

  useEffect(() => {
    onFiltersChange?.(appliedFilters);
  }, [appliedFilters, onFiltersChange]);

  const updateFilters = (newFilters: Partial<SwapFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const clearAllFilters = () => {
    const today = new Date();
    const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const cleared: SwapFilters = {
      selectedProvinces: [],
      selectedDistricts: [],
      selectedAreas: [],
      selectedStations: [],
      customerId: "",
      paymentMethods: [],
      dateRange: { from: oneMonthAgo, to: lastDayLastMonth },
    };

    setFilters(cleared);
    setAppliedFilters(cleared);
    setDateRange(cleared.dateRange);
    setTempRange(cleared.dateRange);
    setQuickTime("last_month");
  };

  const handleProvinceChange = (province: string, checked: boolean) => {
    const newProvinces = checked
      ? [...filters.selectedProvinces, province]
      : filters.selectedProvinces.filter((p) => p !== province);

    let newDistricts = filters.selectedDistricts;
    let newAreas = filters.selectedAreas;
    let newStations = filters.selectedStations;

    if (!checked) {
      if (newProvinces.length === 0) {
        // Keep current selections
      } else {
        const validDistricts = new Set<string>();
        completeHierarchy
          .filter((item) => newProvinces.includes(item.PROVINCE))
          .forEach((item) => validDistricts.add(item.DISTRICT));

        newDistricts = newDistricts.filter((d) => validDistricts.has(d));

        const validAreas = new Set<string>();
        completeHierarchy
          .filter(
            (item) =>
              newProvinces.includes(item.PROVINCE) &&
              (newDistricts.length === 0 || newDistricts.includes(item.DISTRICT))
          )
          .forEach((item) => validAreas.add(item.AREA));

        newAreas = newAreas.filter((a) => validAreas.has(a));

        newStations = newStations.filter((s) => {
          const stationArea = stationData.find((station) => station.STATION === s)?.AREA;
          return stationArea && validAreas.has(stationArea);
        });
      }
    }

    updateFilters({
      selectedProvinces: newProvinces,
      selectedDistricts: newDistricts,
      selectedAreas: newAreas,
      selectedStations: newStations,
    });
  };

  const handleDistrictChange = (district: string, checked: boolean) => {
    const newDistricts = checked
      ? [...filters.selectedDistricts, district]
      : filters.selectedDistricts.filter((d) => d !== district);

    let newProvinces = filters.selectedProvinces;
    if (checked) {
      const districtProvince = completeHierarchy.find(
        (item) => item.DISTRICT === district
      )?.PROVINCE;
      if (districtProvince && !newProvinces.includes(districtProvince)) {
        newProvinces = [...newProvinces, districtProvince];
      }
    }

    let newAreas = filters.selectedAreas;
    let newStations = filters.selectedStations;

    if (!checked) {
      if (newDistricts.length === 0 && newProvinces.length === 0) {
        // Keep current selections
      } else {
        const validAreas = new Set<string>();
        completeHierarchy
          .filter((item) => {
            const matchesProvince =
              newProvinces.length === 0 || newProvinces.includes(item.PROVINCE);
            const matchesDistrict =
              newDistricts.length === 0 || newDistricts.includes(item.DISTRICT);
            return matchesProvince && matchesDistrict;
          })
          .forEach((item) => validAreas.add(item.AREA));

        if (validAreas.size > 0) {
          newAreas = newAreas.filter((a) => validAreas.has(a));
          newStations = newStations.filter((s) => {
            const stationArea = stationData.find(
              (station) => station.STATION === s
            )?.AREA;
            return stationArea && validAreas.has(stationArea);
          });
        }
      }
    }

    updateFilters({
      selectedProvinces: newProvinces,
      selectedDistricts: newDistricts,
      selectedAreas: newAreas,
      selectedStations: newStations,
    });
  };

  const handleAreaChange = (area: string, checked: boolean) => {
    const newAreas = checked
      ? [...filters.selectedAreas, area]
      : filters.selectedAreas.filter((a) => a !== area);

    let newDistricts = filters.selectedDistricts;
    let newProvinces = filters.selectedProvinces;

    if (checked) {
      const areaInfo = completeHierarchy.find((item) => item.AREA === area);
      if (areaInfo) {
        if (!newDistricts.includes(areaInfo.DISTRICT)) {
          newDistricts = [...newDistricts, areaInfo.DISTRICT];
        }
        if (!newProvinces.includes(areaInfo.PROVINCE)) {
          newProvinces = [...newProvinces, areaInfo.PROVINCE];
        }
      }
    }

    let newStations = filters.selectedStations;
    if (!checked) {
      const areaStations = stationData
        .filter((station) => station.AREA === area)
        .map((station) => station.STATION);
      newStations = newStations.filter((s) => !areaStations.includes(s));
    }

    updateFilters({
      selectedProvinces: newProvinces,
      selectedDistricts: newDistricts,
      selectedAreas: newAreas,
      selectedStations: newStations,
    });
  };

  const handleStationChange = (station: string, checked: boolean) => {
    const newStations = checked
      ? [...filters.selectedStations, station]
      : filters.selectedStations.filter((s) => s !== station);

    let newAreas = filters.selectedAreas;
    let newDistricts = filters.selectedDistricts;
    let newProvinces = filters.selectedProvinces;

    if (checked) {
      const stationInfo = stationData.find((s) => s.STATION === station);
      if (stationInfo) {
        const areaName = stationInfo.AREA;
        if (!newAreas.includes(areaName)) {
          newAreas = [...newAreas, areaName];
        }

        const areaInfo = completeHierarchy.find((item) => item.AREA === areaName);
        if (areaInfo) {
          if (!newDistricts.includes(areaInfo.DISTRICT)) {
            newDistricts = [...newDistricts, areaInfo.DISTRICT];
          }
          if (!newProvinces.includes(areaInfo.PROVINCE)) {
            newProvinces = [...newProvinces, areaInfo.PROVINCE];
          }
        }
      }
    }

    updateFilters({
      selectedProvinces: newProvinces,
      selectedDistricts: newDistricts,
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
    if (filters.selectedProvinces.length > 0) count++;
    if (filters.selectedDistricts.length > 0) count++;
    if (filters.selectedAreas.length > 0) count++;
    if (filters.selectedStations.length > 0) count++;
    if (filters.customerId.trim()) count++;
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
        newFrom = new Date(today.getFullYear() - 1, today.getMonth(), 1);
        newTo = new Date(today.getFullYear(), today.getMonth(), 0);
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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

          {/* Customer ID */}
          <div className="space-y-2">
            <Label>Customer ID</Label>
            <Input
              placeholder="Enter customer ID..."
              value={filters.customerId}
              onChange={(e) => updateFilters({ customerId: e.target.value })}
              className="w-full"
            />
          </div>

          {/* Province */}
          <div className="space-y-2">
            <Label>Province</Label>
            <Select
              value=""
              onValueChange={(value) => {
                if (!filters.selectedProvinces.includes(value)) {
                  handleProvinceChange(value, true);
                }
              }}
            >
              <SelectTrigger>
                <span>
                  {filters.selectedProvinces.length > 0
                    ? `${filters.selectedProvinces.length} selected`
                    : "Select provinces"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {availableProvinces
                  .filter((province) => !filters.selectedProvinces.includes(province))
                  .map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1">
              {filters.selectedProvinces.map((province) => (
                <Badge key={province} variant="secondary">
                  {province}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => handleProvinceChange(province, false)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* District */}
          <div className="space-y-2">
            <Label>District</Label>
            <Select
              value=""
              onValueChange={(value) => {
                if (!filters.selectedDistricts.includes(value)) {
                  handleDistrictChange(value, true);
                }
              }}
            >
              <SelectTrigger>
                <span>
                  {filters.selectedDistricts.length > 0
                    ? `${filters.selectedDistricts.length} selected`
                    : "Select districts"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {availableDistricts
                  .filter((district) => !filters.selectedDistricts.includes(district))
                  .map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1">
              {filters.selectedDistricts.map((district) => (
                <Badge key={district} variant="secondary">
                  {district}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => handleDistrictChange(district, false)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Area */}
          <div className="space-y-2">
            <Label>Area</Label>
            <Select
              value=""
              onValueChange={(value) => {
                if (!filters.selectedAreas.includes(value)) {
                  handleAreaChange(value, true);
                }
              }}
            >
              <SelectTrigger>
                <span>
                  {filters.selectedAreas.length > 0
                    ? `${filters.selectedAreas.length} selected`
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
              <Label>BSS Stations</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (!filters.selectedStations.includes(value)) {
                    handleStationChange(value, true);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      filters.selectedStations.length > 0
                        ? `${filters.selectedStations.length} selected`
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
            <Label>Payment Method</Label>
            <Select
              value=""
              onValueChange={(value) => {
                if (!filters.paymentMethods.includes(value)) {
                  handlePaymentMethodChange(value, true);
                }
              }}
            >
              <SelectTrigger>
                <span>
                  {filters.paymentMethods.length > 0
                    ? `${filters.paymentMethods.length} selected`
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