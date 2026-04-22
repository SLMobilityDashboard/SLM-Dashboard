"use client";

import { useState, useEffect } from "react";
import { CalendarIcon, Search, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export interface SwapFilters {
  search: string;
  segment: string;
  sortBy: "score" | "swaps" | "trend" | "name";
  dateRange?: {
    from: Date;
    to: Date;
  };
  quickTime: string;
}

interface SwapFiltersProps {
  onFiltersChange: (filters: SwapFilters) => void;
}

export function SwapFilters({ onFiltersChange }: SwapFiltersProps) {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear() - 1, today.getMonth(), 1);
  const defaultTo = new Date(today.getFullYear(), today.getMonth(), 0);
  const defaultRange: DateRange = { from: defaultFrom, to: defaultTo };

  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [sortBy, setSortBy] = useState<SwapFilters["sortBy"]>("score");
  const [quickTime, setQuickTime] = useState("last_year");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    onFiltersChange({
      search,
      segment,
      sortBy,
      quickTime,
      dateRange:
        dateRange?.from && dateRange?.to
          ? { from: dateRange.from, to: dateRange.to }
          : undefined,
    });
  }, [search, segment, sortBy, quickTime, dateRange]);

  const handleQuickTimeChange = (value: string) => {
    setQuickTime(value);
    if (value === "custom") return;

    const today = new Date();
    let newFrom = new Date();
    let newTo = new Date();

    switch (value) {
      case "history":
        newFrom = new Date(2020, 0, 1);
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

    setDateRange({ from: newFrom, to: newTo });
  };

  const clearAllFilters = () => {
    setSearch("");
    setSegment("all");
    setSortBy("score");
    setQuickTime("last_year");
    setDateRange(defaultRange);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (dateRange?.from || dateRange?.to) count++;
    if (segment !== "all") count++;
    if (search) count++;
    if (sortBy !== "score") count++;
    if (quickTime !== "last_year") count++;
    return count;
  };

  const isDateRangeDisabled = quickTime !== "custom";

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Header — mirrors RevenueFilters */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary">{getActiveFiltersCount()} active</Badge>
            )}
          </div>
          {getActiveFiltersCount() > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Segment */}
          <div className="space-y-2">
            <Label>Segment</Label>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger>
                <SelectValue placeholder="All segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All segments</SelectItem>
                <SelectItem value="Champion">Champion</SelectItem>
                <SelectItem value="Rising">Rising</SelectItem>
                <SelectItem value="Steady">Steady</SelectItem>
                <SelectItem value="Cooling">Cooling</SelectItem>
                <SelectItem value="At risk">At risk</SelectItem>
                <SelectItem value="New">New</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <Label>Sort By</Label>
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SwapFilters["sortBy"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Health score</SelectItem>
                <SelectItem value="swaps">Total swaps</SelectItem>
                <SelectItem value="trend">Trend</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Time */}
          <div className="space-y-2">
            <Label>Quick Time</Label>
            <Select value={quickTime} onValueChange={handleQuickTimeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="history">History (All Data)</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isDateRangeDisabled}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    isDateRangeDisabled && "opacity-50 cursor-not-allowed bg-muted"
                  )}
                  onClick={() => !isDateRangeDisabled && setIsCalendarOpen(true)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {dateRange?.from && dateRange?.to ? (
                      <>
                        {format(dateRange.from, "MMM dd, yyyy")} –{" "}
                        {format(dateRange.to, "MMM dd, yyyy")}
                      </>
                    ) : (
                      "Pick a date range"
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              {!isDateRangeDisabled && (
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      if (range?.from && range?.to) setIsCalendarOpen(false);
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              )}
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}