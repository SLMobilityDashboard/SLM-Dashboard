"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Car,
  Filter,
  X,
  Search,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import BatteryHistory from "@/components/home-charging/BatteryHistory";
import { BatteryFilters } from "@/hooks/useHomeCharging";

// Types
interface VehicleListItem {
  VEHICLE_ID: string;
  TBOX_IMEI_NO: string;
  CHASSIS_NUMBER: string;
}

export default function BatteryAnalysisPage() {
  // Vehicle list for selection
  const [availableVehicles, setAvailableVehicles] = useState<VehicleListItem[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleLoadError, setVehicleLoadError] = useState<string | null>(null);
  
  // Filter panel state
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  
  // Vehicle dropdown state
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);

  const getDefaultEndDate = () => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  };

  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 3); // Changed from 7 to 3
    return date.toISOString().split("T")[0];
  };

  // Temporary filter state (before applying)
  const [tempSelectedVehicle, setTempSelectedVehicle] = useState<string | null>(null);
  const [tempStartDate, setTempStartDate] = useState<string>(getDefaultStartDate());
  const [tempEndDate, setTempEndDate] = useState<string>(getDefaultEndDate());
  const [dateRangeError, setDateRangeError] = useState<string>("");
  const [vehicleSearch, setVehicleSearch] = useState<string>("");

  // Applied filters (actually used for fetching data)
  const [batteryFilters, setBatteryFilters] = useState<BatteryFilters>({
    timeRange: 72, // Changed from 168 (7 days) to 72 (3 days)
    includeIdleData: true,
    selectedVehicleImei: null,
    startTimestamp: Math.floor(new Date(getDefaultStartDate() + "T00:00:00").getTime() / 1000),
    endTimestamp: Math.floor(new Date(getDefaultEndDate() + "T23:59:59").getTime() / 1000),
  });

  // Auto-fetch vehicles on mount
  useEffect(() => {
    fetchVehicleList();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target as Node)) {
        setIsVehicleDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch vehicle list
  const fetchVehicleList = async () => {
    if (loadingVehicles) return;
    
    try {
      setLoadingVehicles(true);
      setVehicleLoadError(null);

      const sql = `
        SELECT DISTINCT
          TBOX_ID as TBOX_IMEI_NO,
          VEHICLE_ID,
          COALESCE(CHASSIS_NUMBER, VEHICLE_ID, TBOX_ID) as CHASSIS_NUMBER
        FROM SOURCE_DATA.MASTER_DATA.VEHICLE
        WHERE TBOX_ID IS NOT NULL
          AND LENGTH(TBOX_ID) > 5
          AND ACTIVE = 1
          AND (DELETED = 0 OR DELETED IS NULL)
        ORDER BY CHASSIS_NUMBER
        LIMIT 1000
      `;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      setAvailableVehicles(results || []);
      setVehicleLoadError(null);
    } catch (err) {
      console.error("Error fetching vehicle list:", err);
      setVehicleLoadError(err instanceof Error ? err.message : "Failed to load vehicles");
      setAvailableVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const calculateDaysDifference = (start: string, end: string): number => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
  };

  const handleStartDateChange = (newStartDate: string) => {
    setTempStartDate(newStartDate);
    setDateRangeError("");

    const start = new Date(newStartDate);
    const maxEnd = new Date(start);
    maxEnd.setDate(maxEnd.getDate() + 3); // Changed from 7 to 3
    const currentEnd = new Date(tempEndDate);
    const daysDiff = calculateDaysDifference(newStartDate, tempEndDate);

    if (daysDiff > 3) { // Changed from 7 to 3
      const adjustedEnd = maxEnd.toISOString().split("T")[0];
      setTempEndDate(adjustedEnd);
      setDateRangeError("End date adjusted to maintain 3-day maximum range"); // Updated message
    } else if (currentEnd < start) {
      setTempEndDate(newStartDate);
    }
  };

  const handleEndDateChange = (newEndDate: string) => {
    setDateRangeError("");
    const start = new Date(tempStartDate);
    const end = new Date(newEndDate);
    const maxEnd = new Date(start);
    maxEnd.setDate(maxEnd.getDate() + 3); // Changed from 7 to 3
    const daysDiff = calculateDaysDifference(tempStartDate, newEndDate);

    if (daysDiff > 3) { // Changed from 7 to 3
      const adjustedEnd = maxEnd.toISOString().split("T")[0];
      setTempEndDate(adjustedEnd);
      setDateRangeError("Maximum date range is 3 days"); // Updated message
      return;
    }

    if (end < start) {
      setTempEndDate(tempStartDate);
      setDateRangeError("End date cannot be before start date");
      return;
    }

    setTempEndDate(newEndDate);
  };

  const getMaxEndDate = () => {
    const start = new Date(tempStartDate);
    const maxEnd = new Date(start);
    maxEnd.setDate(maxEnd.getDate() + 3); // Changed from 7 to 3
    const today = new Date();
    return maxEnd < today
      ? maxEnd.toISOString().split("T")[0]
      : today.toISOString().split("T")[0];
  };

  const handleVehicleSelect = (imei: string) => {
    setTempSelectedVehicle(imei);
    setVehicleSearch("");
    setIsVehicleDropdownOpen(false);
  };

  const handleApplyFilters = () => {
    const startTime = new Date(tempStartDate + "T00:00:00").getTime() / 1000;
    const endTime = new Date(tempEndDate + "T23:59:59").getTime() / 1000;
    const hours = Math.ceil((endTime - startTime) / 3600);

    setBatteryFilters({
      timeRange: hours,
      startTimestamp: startTime,
      endTimestamp: endTime,
      includeIdleData: true,
      selectedVehicleImei: tempSelectedVehicle,
    });
  };

  const handleClearFilters = () => {
    const defaultStart = getDefaultStartDate();
    const defaultEnd = getDefaultEndDate();
    
    setTempStartDate(defaultStart);
    setTempEndDate(defaultEnd);
    setTempSelectedVehicle(null);
    setDateRangeError("");
    setVehicleSearch("");

    const startTime = new Date(defaultStart + "T00:00:00").getTime() / 1000;
    const endTime = new Date(defaultEnd + "T23:59:59").getTime() / 1000;

    setBatteryFilters({
      timeRange: 72, // Changed from 168 to 72
      startTimestamp: startTime,
      endTimestamp: endTime,
      includeIdleData: true,
      selectedVehicleImei: null,
    });
  };

  const daysDifference = calculateDaysDifference(tempStartDate, tempEndDate);

  // Filter vehicles based on search
  const filteredVehicles = availableVehicles.filter(vehicle => 
    vehicle.CHASSIS_NUMBER?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    vehicle.TBOX_IMEI_NO?.includes(vehicleSearch) ||
    vehicle.VEHICLE_ID?.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  const selectedVehicle = availableVehicles.find(
    v => v.TBOX_IMEI_NO === tempSelectedVehicle
  );

  const appliedVehicle = availableVehicles.find(
    v => v.TBOX_IMEI_NO === batteryFilters.selectedVehicleImei
  );

  const getActiveFiltersCount = () => {
    let count = 0;
    if (batteryFilters.selectedVehicleImei) count++;
    if (batteryFilters.timeRange !== 72) count++; // Changed from 168 to 72
    if (batteryFilters.includeIdleData) count++;
    return count;
  };

  // Check if filters have changed (to show Apply button state)
  const hasUnappliedChanges = () => {
    const tempStartTime = new Date(tempStartDate + "T00:00:00").getTime() / 1000;
    const tempEndTime = new Date(tempEndDate + "T23:59:59").getTime() / 1000;
    
    return (
      tempSelectedVehicle !== batteryFilters.selectedVehicleImei ||
      tempStartTime !== batteryFilters.startTimestamp ||
      tempEndTime !== batteryFilters.endTimestamp
    );
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <Car className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">
              Battery Analytics
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Battery History & Diagnostics
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Comprehensive battery performance and health insights
          </p>
        </div>

        {/* Collapsible Filters Card */}
        <Card className="transition-all duration-300">
          <CardContent className="p-0">
            {/* Filter Header - Always Visible */}
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="w-full p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Battery Filters</span>
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary">
                    {getActiveFiltersCount()} active
                  </Badge>
                )}
                {appliedVehicle && !isFilterExpanded && (
                  <Badge variant="outline" className="ml-2">
                    {appliedVehicle.CHASSIS_NUMBER}
                  </Badge>
                )}
                {hasUnappliedChanges() && (
                  <Badge variant="default" className="ml-2 bg-orange-600">
                    Unapplied changes
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getActiveFiltersCount() > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearFilters();
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
                {isFilterExpanded ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Expandable Filter Content */}
            <div
              className={`transition-all duration-300 ease-in-out ${
                isFilterExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
              }`}
            >
              <div className="p-4 pt-4 space-y-4 border-t border-slate-700">
                {/* Main Filter Grid - 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Vehicle Selection with Dropdown */}
                  <div className="space-y-2 relative" ref={vehicleDropdownRef}>
                    <Label>Select Vehicle</Label>
                    
                    {/* Dropdown Button */}
                    <button
                      onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                      className="w-full bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 flex items-center justify-between hover:bg-slate-600 transition-colors"
                    >
                      <span className="truncate">
                        {selectedVehicle 
                          ? selectedVehicle.CHASSIS_NUMBER 
                          : "Click to select vehicle..."}
                      </span>
                      <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isVehicleDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Content */}
                    {isVehicleDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-2">
                        <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-80 overflow-hidden">
                          {/* Search Input */}
                          <div className="p-2 border-b border-slate-700 sticky top-0 bg-slate-800">
                            <div className="relative">
                              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Search by chassis or IMEI..."
                                value={vehicleSearch}
                                onChange={(e) => setVehicleSearch(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 text-slate-200 pl-10 pr-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          {/* Vehicle List */}
                          <div className="max-h-60 overflow-y-auto p-2">
                            {loadingVehicles ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400 mr-2" />
                                <span className="text-sm text-slate-400">Loading vehicles...</span>
                              </div>
                            ) : vehicleLoadError ? (
                              <div className="text-center py-4">
                                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                                <p className="text-sm text-red-400 mb-2">Failed to load vehicles</p>
                                <p className="text-xs text-slate-500 mb-3">{vehicleLoadError}</p>
                                <button
                                  onClick={fetchVehicleList}
                                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded"
                                >
                                  Retry
                                </button>
                              </div>
                            ) : filteredVehicles.length === 0 ? (
                              <div className="text-center py-4 text-sm text-slate-400">
                                {vehicleSearch ? 'No vehicles found' : 'No vehicles available'}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {filteredVehicles.map((vehicle) => (
                                  <button
                                    key={vehicle.VEHICLE_ID}
                                    onClick={() => handleVehicleSelect(vehicle.TBOX_IMEI_NO)}
                                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                                      tempSelectedVehicle === vehicle.TBOX_IMEI_NO
                                        ? 'bg-purple-600 text-white'
                                        : 'hover:bg-slate-700 text-slate-300'
                                    }`}
                                  >
                                    <div className="text-sm font-medium">{vehicle.CHASSIS_NUMBER}</div>
                                    <div className="text-xs opacity-70">IMEI: {vehicle.TBOX_IMEI_NO}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Selected Vehicle Badge */}
                    {selectedVehicle && (
                      <Badge variant="secondary" className="w-full justify-between mt-2">
                        <span className="truncate">{selectedVehicle.CHASSIS_NUMBER}</span>
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVehicleSelect('');
                          }}
                        />
                      </Badge>
                    )}
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      max={getDefaultEndDate()}
                      className="w-full bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      min={tempStartDate}
                      max={getMaxEndDate()}
                      className="w-full bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Additional Row for Date Info and Apply Button */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                  {/* Date Range Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Selected Range:</span>
                      <span
                        className={`font-medium ${
                          daysDifference === 3 ? "text-purple-400" : "text-blue-400"
                        }`}
                      >
                        {daysDifference} day{daysDifference !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {dateRangeError && (
                      <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded px-2 py-1">
                        {dateRangeError}
                      </div>
                    )}
                  </div>

                  {/* Apply Button */}
                  <div className="flex items-end justify-end">
                    <Button
                      onClick={handleApplyFilters}
                      disabled={!tempSelectedVehicle || !hasUnappliedChanges()}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Battery History Component - Only show if vehicle is selected */}
        {batteryFilters.selectedVehicleImei ? (
          <BatteryHistory
            IMEI={batteryFilters.selectedVehicleImei}
            filters={batteryFilters}
          />
        ) : (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Car className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-medium text-slate-300 mb-2">
                No Vehicle Selected
              </h3>
              <p className="text-slate-400 mb-6">
                Please select a vehicle from the filters above and click "Apply Filters" to view its battery history
              </p>
              <Button
                variant="outline"
                onClick={() => setIsFilterExpanded(true)}
                className="mx-auto"
              >
                <Filter className="h-4 w-4 mr-2" />
                Open Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}