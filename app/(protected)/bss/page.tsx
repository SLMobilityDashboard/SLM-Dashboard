"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Battery,
  AlertTriangle,
  Search,
  RefreshCw,
  X,
  Filter,
  MapPin,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Building2,
  Phone,
  Mail,
  User,
  Globe,
  TrendingUp,
  Wrench,
  AlertCircle,
} from "lucide-react";
import LoadingState from "@/components/bss/LoadingState";
import ErrorState from "@/components/bss/ErrorState";
import KPIGrid from "@/components/bss/KPIGrid";
import BSSGrid from "@/components/bss/BSSGrid";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BatterySwappingStation {
  STATION_ID: string;
  VENDOR_ID?: string;
  VENDOR_NAME?: string;
  STATION_MODEL?: string;
  SERIAL_NO?: string;
  STATION_NAME?: string;
  LOCATION_ID?: string;
  RATING_GROUP_ID?: number;
  HA_INTERVAL?: number;
  STATUS_INTERVAL?: number;
  INIT_COMPLETED?: number;
  CONFIG_DOWNLOADED?: number;
  MAINTENANCE_MODE?: number;
  STATION_ACTIVE?: number;
  STATION_DELETED?: number;
  STATION_CREATED_AT?: Date;
  STATION_UPDATED_AT?: Date;
  STATION_DELETED_AT?: Date;
  APPROVED_STATUS?: string;
  APPROVED_BY?: string;
  BSS_PLANTED_DATE_ELEC_UNIT_COUNT?: number;
  BSS_PLANTED_DATE?: Date;
  BSS_PLANTED_PLACE_MOBILE_NUMBER?: string;
  CITY_ID?: string;
  LOCATION_CODE?: string;
  LOCATION_NAME?: string;
  LATITUDE?: number;
  LONGITUDE?: number;
  LOCATION_ACTIVE?: number;
  LOCATION_DELETED?: number;
  LOCATION_CREATED_AT?: Date;
  LOCATION_UPDATED_AT?: Date;
  LOCATION_DELETED_AT?: Date;
  STATUS?: string;
  // Vendor fields
  VENDOR_COMPANY_NAME?: string;
  VENDOR_COUNTRY?: string;
  VENDOR_CONTACT_NAME?: string;
  VENDOR_CONTACT_DESIGNATION?: string;
  VENDOR_CONTACT_PHONE?: number;
  VENDOR_CONTACT_ADDRESS?: string;
  VENDOR_CONTACT_EMAIL?: string;
  VENDOR_HAS_CHARGING?: number;
  VENDOR_HAS_SWAPPING?: number;
  VENDOR_HAS_BATTERY?: number;
  VENDOR_HAS_3W_PARTS?: number;
  VENDOR_HAS_BIKE_PARTS?: number;
  // Swap statistics
  TOTAL_SWAPS?: number;
  LAST_SWAP_DATE?: Date;
  SWAPS_SINCE_MAINTENANCE?: number;
  // Maintenance info (mock data for now)
  LAST_MAINTENANCE_DATE?: Date;
  MAINTENANCE_STATUS?: "OK" | "DUE_SOON" | "OVERDUE";
  MAINTENANCE_REASON?: "TIME_BASED" | "SWAP_COUNT" | "BOTH";
}

export interface BSSKPIs {
  TOTAL_STATIONS: number;
  ACTIVE_STATIONS: number;
  MAINTENANCE_STATIONS: number;
  INACTIVE_STATIONS: number;
  TOTAL_LOCATIONS: number;
  TOTAL_VENDORS: number;
  TOTAL_SWAPS: number;
  STATIONS_DUE_MAINTENANCE: number;
}

export interface BSSFilters {
  searchTerm: string;
  vendorFilter: string;
  statusFilter: string;
  modelFilter: string;
  locationFilter: string;
  cityFilter: string;
  approvalFilter: string;
  countryFilter: string;
  maintenanceFilter: string;
}


const calculateMaintenanceStatus = (
  lastMaintenanceDate: Date | undefined,
  swapsSinceMaintenance: number
): "OK" | "DUE_SOON" | "OVERDUE" => {
  const now = new Date();
  const DAYS_THRESHOLD = 30;
  const SWAPS_THRESHOLD = 100;

  let timeOverdue = false;
  let swapsOverdue = false;

  if (lastMaintenanceDate) {
    const daysSinceMaintenance = Math.floor(
      (now.getTime() - lastMaintenanceDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    timeOverdue = daysSinceMaintenance >= DAYS_THRESHOLD;
  }

  swapsOverdue = swapsSinceMaintenance >= SWAPS_THRESHOLD;

  if (timeOverdue || swapsOverdue) {
    return "OVERDUE";
  }

  // Due soon: within 7 days or within 20 swaps
  if (lastMaintenanceDate) {
    const daysSinceMaintenance = Math.floor(
      (now.getTime() - lastMaintenanceDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceMaintenance >= 23 || swapsSinceMaintenance >= 80) {
      return "DUE_SOON";
    }
  }

  return "OK";
};

const getMaintenanceReason = (
  lastMaintenanceDate: Date | undefined,
  swapsSinceMaintenance: number
): "TIME_BASED" | "SWAP_COUNT" | "BOTH" | undefined => {
  const now = new Date();
  const DAYS_THRESHOLD = 30;
  const SWAPS_THRESHOLD = 100;

  let timeOverdue = false;
  let swapsOverdue = false;

  if (lastMaintenanceDate) {
    const daysSinceMaintenance = Math.floor(
      (now.getTime() - lastMaintenanceDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    timeOverdue = daysSinceMaintenance >= DAYS_THRESHOLD;
  }

  swapsOverdue = swapsSinceMaintenance >= SWAPS_THRESHOLD;

  if (timeOverdue && swapsOverdue) return "BOTH";
  if (timeOverdue) return "TIME_BASED";
  if (swapsOverdue) return "SWAP_COUNT";
  return undefined;
};

// Mock data generator for maintenance records
const generateMockMaintenanceDate = (): Date => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 60);
  const lastMaintenanceDate = new Date(now);
  lastMaintenanceDate.setDate(lastMaintenanceDate.getDate() - daysAgo);
  return lastMaintenanceDate;
};

// ============================================================================
// STATUS DERIVATION
// ============================================================================

const deriveBSSStatus = (station: BatterySwappingStation): string => {
  if (station.STATION_DELETED === 1) return "DELETED";
  if (station.MAINTENANCE_MODE === 1) return "MAINTENANCE";
  if (station.STATION_ACTIVE === 0) return "INACTIVE";
  if (station.INIT_COMPLETED === 0) return "INITIALIZING";
  if (station.CONFIG_DOWNLOADED === 0) return "CONFIGURING";
  if (station.STATION_ACTIVE === 1) return "ACTIVE";
  return "UNKNOWN";
};

// ============================================================================
// SQL QUERY BUILDER - SINGLE JOINED QUERY
// ============================================================================

const buildComprehensiveBSSQuery = () => {
  return `
    WITH swap_stats AS (
      SELECT 
        STATION_NAME as STATION_ID,
        COUNT(*) as TOTAL_SWAPS,
        MAX(TO_TIMESTAMP(PAID_AT)) as LAST_SWAP_DATE
      FROM SOURCE_DATA.DYNAMO_DB.FACT_PAYMENT
      WHERE PAYMENT_TYPE = 'BATTERY_SWAP'
        AND STATION_NAME IS NOT NULL
      GROUP BY STATION_NAME
    )
    SELECT 
      -- Station details
      ss.STATION_ID,
      ss.VENDOR_ID,
      ss.STATION_MODEL,
      ss.SERIAL_NO,
      ss.STATION_NAME,
      ss.LOCATION_ID,
      ss.RATING_GROUP_ID,
      ss.HA_INTERVAL,
      ss.STATUS_INTERVAL,
      ss.INIT_COMPLETED,
      ss.CONFIG_DOWNLOADED,
      ss.MAINTENANCE_MODE,
      ss.STATION_ACTIVE,
      ss.STATION_DELETED,
      ss.STATION_CREATED_AT,
      ss.STATION_UPDATED_AT,
      ss.STATION_DELETED_AT,
      ss.APPROVED_STATUS,
      ss.APPROVED_BY,
      ss.BSS_PLANTED_DATE_ELEC_UNIT_COUNT,
      ss.BSS_PLANTED_DATE,
      ss.BSS_PLANTED_PLACE_MOBILE_NUMBER,
      -- Location details
      ss.CITY_ID,
      ss.LOCATION_CODE,
      ss.LOCATION_NAME,
      ss.LATITUDE,
      ss.LONGITUDE,
      ss.LOCATION_ACTIVE,
      ss.LOCATION_DELETED,
      ss.LOCATION_CREATED_AT,
      ss.LOCATION_UPDATED_AT,
      ss.LOCATION_DELETED_AT,
      -- Vendor details
      v.NAME as VENDOR_COMPANY_NAME,
      v.COUNTRY as VENDOR_COUNTRY,
      v.PRIMARY_CONTACT_NAME as VENDOR_CONTACT_NAME,
      v.PRIMARY_CONTACT_DESIGNATION as VENDOR_CONTACT_DESIGNATION,
      v.PRIMARY_CONTACT_PHONE as VENDOR_CONTACT_PHONE,
      v.PRIMARY_CONTACT_ADDRESS as VENDOR_CONTACT_ADDRESS,
      v.PRIMARY_CONTACT_EMAIL as VENDOR_CONTACT_EMAIL,
      v.CHARGING_STATION as VENDOR_HAS_CHARGING,
      v.SWAPPING_STATION as VENDOR_HAS_SWAPPING,
      v.BATTERY as VENDOR_HAS_BATTERY,
      v.THREE_WHEELER_OR_PARTS as VENDOR_HAS_3W_PARTS,
      v.BIKES_OR_PARTS as VENDOR_HAS_BIKE_PARTS,
      -- Swap statistics
      COALESCE(swap.TOTAL_SWAPS, 0) as TOTAL_SWAPS,
      swap.LAST_SWAP_DATE
    FROM REPORT_DB.BSS_ANALYTICS.VW_SWAPPING_STATION_LOCATION ss
    LEFT JOIN SOURCE_DATA.MASTER_DATA.VENDOR v
      ON ss.VENDOR_ID = v.VENDOR_ID
      AND v.DELETED = 0
    LEFT JOIN swap_stats swap
      ON (ss.STATION_NAME = swap.STATION_ID OR ss.STATION_ID = swap.STATION_ID)
    WHERE ss.STATION_DELETED = 0
    ORDER BY ss.STATION_ID;
  `;
};

// ============================================================================
// FILTER COMPONENT
// ============================================================================
interface FilterPanelProps {
  filters: BSSFilters;
  onFiltersChange: (filters: BSSFilters) => void;
  vendors: string[];
  models: string[];
  locations: string[];
  cities: string[];
  countries: string[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  vendors,
  models,
  locations,
  cities,
  countries,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<BSSFilters>(filters);
  const [appliedFilters, setAppliedFilters] = useState<BSSFilters>(filters);

  const updateTempFilters = (key: keyof BSSFilters, value: string) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasUnappliedChanges = JSON.stringify(tempFilters) !== JSON.stringify(appliedFilters);

  const applyFilters = () => {
    setAppliedFilters(tempFilters);
    onFiltersChange(tempFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (appliedFilters.searchTerm) count++;
    if (appliedFilters.vendorFilter !== "all") count++;
    if (appliedFilters.statusFilter !== "all") count++;
    if (appliedFilters.modelFilter !== "all") count++;
    if (appliedFilters.locationFilter !== "all") count++;
    if (appliedFilters.cityFilter !== "all") count++;
    if (appliedFilters.approvalFilter !== "all") count++;
    if (appliedFilters.countryFilter !== "all") count++;
    if (appliedFilters.maintenanceFilter !== "all") count++;
    return count;
  };

  const clearFilters = () => {
    const defaultFilters: BSSFilters = {
      searchTerm: "",
      vendorFilter: "all",
      statusFilter: "all",
      modelFilter: "all",
      locationFilter: "all",
      cityFilter: "all",
      approvalFilter: "all",
      countryFilter: "all",
      maintenanceFilter: "all",
    };
    setTempFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-200">Filters</span>
            {getActiveFiltersCount() > 0 && (
              <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-400">
                {getActiveFiltersCount()} active
              </span>
            )}
            {hasUnappliedChanges && (
              <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs text-yellow-400">
                Unapplied changes
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {getActiveFiltersCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-slate-400 hover:text-slate-300"
            >
              {showFilters ? "Less" : "More"} Filters
            </Button>
            <Button
              size="sm"
              onClick={applyFilters}
              disabled={!hasUnappliedChanges}
              className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>

        {/* Main Search */}
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Quick Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search stations, vendors, locations..."
              value={tempFilters.searchTerm}
              onChange={(e) => updateTempFilters("searchTerm", e.target.value)}
              className="pl-10 bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Main Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Status</label>
            <select
              value={tempFilters.statusFilter}
              onChange={(e) => updateTempFilters("statusFilter", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INITIALIZING">Initializing</option>
              <option value="CONFIGURING">Configuring</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Maintenance Status</label>
            <select
              value={tempFilters.maintenanceFilter}
              onChange={(e) => updateTempFilters("maintenanceFilter", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200"
            >
              <option value="all">All</option>
              <option value="OK">OK</option>
              <option value="DUE_SOON">Due Soon</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Vendor</label>
            <select
              value={tempFilters.vendorFilter}
              onChange={(e) => updateTempFilters("vendorFilter", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200"
            >
              <option value="all">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor} value={vendor}>
                  {vendor}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Model</label>
            <select
              value={tempFilters.modelFilter}
              onChange={(e) => updateTempFilters("modelFilter", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200"
            >
              <option value="all">All Models</option>
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <>
            <div className="pt-4 border-t border-slate-700/50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Country</label>
                  <select
                    value={tempFilters.countryFilter}
                    onChange={(e) => updateTempFilters("countryFilter", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200"
                  >
                    <option value="all">All Countries</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300">City</label>
                  <select
                    value={tempFilters.cityFilter}
                    onChange={(e) => updateTempFilters("cityFilter", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200"
                  >
                    <option value="all">All Cities</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Location</label>
                  <select
                    value={tempFilters.locationFilter}
                    onChange={(e) => updateTempFilters("locationFilter", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200"
                  >
                    <option value="all">All Locations</option>
                    {locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Approval</label>
                  <select
                    value={tempFilters.approvalFilter}
                    onChange={(e) => updateTempFilters("approvalFilter", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200"
                  >
                    <option value="all">All</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filter Guide */}
            <div className="pt-4 border-t border-slate-700/50">
              <label className="mb-3 block text-slate-300 text-sm">Filter Guide</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-slate-300">Overdue:</span>
                      <span className="ml-1">Immediate maintenance required</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-slate-300">Due Soon:</span>
                      <span className="ml-1">Plan maintenance within 7 days</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-slate-300">OK:</span>
                      <span className="ml-1">Station operating normally</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p>• Use Quick Search for instant lookup</p>
                  <p>• Filter by maintenance status to prioritize work</p>
                  <p>• Combine location + vendor for regional analysis</p>
                  <p>• Sort by swap count to identify high-usage stations</p>
                </div>
              </div>
            </div>

            {/* Active Filter Summary */}
            {getActiveFiltersCount() > 0 && (
              <div className="pt-4 border-t border-slate-700/50">
                <label className="mb-3 block text-slate-300 text-sm">Active Filter Summary</label>
                <div className="text-xs text-slate-400 space-y-1">
                  {appliedFilters.searchTerm && (
                    <p>• Quick Search: <span className="text-slate-300">"{appliedFilters.searchTerm}"</span></p>
                  )}
                  {appliedFilters.statusFilter !== "all" && (
                    <p>• Status: <span className="text-slate-300">{appliedFilters.statusFilter}</span></p>
                  )}
                  {appliedFilters.maintenanceFilter !== "all" && (
                    <p>• Maintenance: <span className="text-slate-300">{appliedFilters.maintenanceFilter}</span></p>
                  )}
                  {appliedFilters.vendorFilter !== "all" && (
                    <p>• Vendor: <span className="text-slate-300">{appliedFilters.vendorFilter}</span></p>
                  )}
                  {appliedFilters.modelFilter !== "all" && (
                    <p>• Model: <span className="text-slate-300">{appliedFilters.modelFilter}</span></p>
                  )}
                  {appliedFilters.countryFilter !== "all" && (
                    <p>• Country: <span className="text-slate-300">{appliedFilters.countryFilter}</span></p>
                  )}
                  {appliedFilters.cityFilter !== "all" && (
                    <p>• City: <span className="text-slate-300">{appliedFilters.cityFilter}</span></p>
                  )}
                  {appliedFilters.locationFilter !== "all" && (
                    <p>• Location: <span className="text-slate-300">{appliedFilters.locationFilter}</span></p>
                  )}
                  {appliedFilters.approvalFilter !== "all" && (
                    <p>• Approval: <span className="text-slate-300">{appliedFilters.approvalFilter}</span></p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAINTENANCE ALERT COMPONENT
// ============================================================================

interface MaintenanceAlertProps {
  station: BatterySwappingStation;
}

const MaintenanceAlert: React.FC<MaintenanceAlertProps> = ({ station }) => {
  if (station.MAINTENANCE_STATUS === "OK" || !station.MAINTENANCE_STATUS) return null;

  const alertColors = {
    DUE_SOON: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    OVERDUE: "bg-red-500/10 border-red-500/30 text-red-400",
    OK: "",
  };

  const alertIcons = {
    DUE_SOON: <Clock className="w-4 h-4" />,
    OVERDUE: <AlertCircle className="w-4 h-4" />,
    OK: null,
  };

  const color = alertColors[station.MAINTENANCE_STATUS];
  const icon = alertIcons[station.MAINTENANCE_STATUS];

  const getReasonText = () => {
    if (station.MAINTENANCE_REASON === "BOTH") {
      return "Time & swap count exceeded";
    } else if (station.MAINTENANCE_REASON === "TIME_BASED") {
      return "30+ days since last maintenance";
    } else if (station.MAINTENANCE_REASON === "SWAP_COUNT") {
      return `${station.SWAPS_SINCE_MAINTENANCE} swaps since maintenance`;
    }
    return "";
  };

  return (
    <div className={`mt-4 p-3 rounded-lg border flex items-start gap-3 ${color}`}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">
            {station.MAINTENANCE_STATUS === "OVERDUE" 
              ? "Maintenance Overdue" 
              : "Maintenance Due Soon"}
          </p>
          <Wrench className="w-4 h-4" />
        </div>
        <p className="text-xs opacity-90">{getReasonText()}</p>
        {station.LAST_MAINTENANCE_DATE && (
          <p className="text-xs opacity-75">
            Last serviced: {station.LAST_MAINTENANCE_DATE.toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SWAP STATS COMPONENT
// ============================================================================
interface SwapStatsCardProps {
  station: BatterySwappingStation;
}

const SwapStatsCard: React.FC<SwapStatsCardProps> = ({ station }) => {
  const totalSwaps = station.TOTAL_SWAPS || 0;
  const swapsSinceMaintenance = station.SWAPS_SINCE_MAINTENANCE || 0;
  
  const swapProgress = Math.min((swapsSinceMaintenance / 100) * 100, 100);

  const progressColor = swapProgress >= 100 
    ? "bg-red-400" 
    : swapProgress >= 80 
    ? "bg-amber-400" 
    : "bg-green-400";

  return (
    <div className="mt-4 p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg space-y-3">
      <div className="flex items-center gap-2 text-slate-300 font-medium">
        <TrendingUp className="w-4 h-4 text-blue-400" />
        <span>Swap Statistics</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Total Swaps</p>
          <p className="text-2xl font-bold text-blue-400">{totalSwaps.toLocaleString()}</p>
        </div>
        
        <div>
          <p className="text-xs text-slate-500 mb-1">Since Maintenance</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-300">
              {swapsSinceMaintenance}
            </p>
            <p className="text-xs text-slate-500">/ 100</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Progress to next maintenance</span>
          <span>{Math.round(swapProgress)}%</span>
        </div>
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div 
            className={`h-full ${progressColor} transition-all duration-500`}
            style={{ width: `${swapProgress}%` }}
          />
        </div>
      </div>

      {station.LAST_SWAP_DATE && (
        <div className="pt-2 border-t border-slate-700/50 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Last swap: {station.LAST_SWAP_DATE.toLocaleDateString()} {station.LAST_SWAP_DATE.toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// VENDOR INFO COMPONENT
// ============================================================================
interface VendorInfoCardProps {
  station: BatterySwappingStation;
}

const VendorInfoCard: React.FC<VendorInfoCardProps> = ({ station }) => {
  if (!station.VENDOR_COMPANY_NAME) return null;

  return (
    <div className="mt-4 p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg space-y-3">
      <div className="flex items-center gap-2 text-slate-300 font-medium">
        <Building2 className="w-4 h-4 text-cyan-400" />
        <span>Vendor Details</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        {station.VENDOR_COMPANY_NAME && (
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Company</p>
              <p className="text-slate-300">{station.VENDOR_COMPANY_NAME}</p>
            </div>
          </div>
        )}
        
        {station.VENDOR_COUNTRY && (
          <div className="flex items-start gap-2">
            <Globe className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Country</p>
              <p className="text-slate-300">{station.VENDOR_COUNTRY}</p>
            </div>
          </div>
        )}
      </div>
      
      {(station.VENDOR_HAS_SWAPPING || station.VENDOR_HAS_CHARGING || station.VENDOR_HAS_BATTERY) && (
        <div className="pt-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 mb-2">Products & Services</p>
          <div className="flex flex-wrap gap-2">
            {station.VENDOR_HAS_SWAPPING === 1 && (
              <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded text-xs text-cyan-400">
                Swapping Stations
              </span>
            )}
            {station.VENDOR_HAS_CHARGING === 1 && (
              <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
                Charging Stations
              </span>
            )}
            {station.VENDOR_HAS_BATTERY === 1 && (
              <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-xs text-purple-400">
                Batteries
              </span>
            )}
            {station.VENDOR_HAS_3W_PARTS === 1 && (
              <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                3-Wheeler Parts
              </span>
            )}
            {station.VENDOR_HAS_BIKE_PARTS === 1 && (
              <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
                Bike Parts
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
const BSSOverviewPage: React.FC = () => {
  const [allStations, setAllStations] = useState<BatterySwappingStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [filters, setFilters] = useState<BSSFilters>({
    searchTerm: "",
    vendorFilter: "all",
    statusFilter: "all",
    modelFilter: "all",
    locationFilter: "all",
    cityFilter: "all",
    approvalFilter: "all",
    countryFilter: "all",
    maintenanceFilter: "all",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const dataFetchedRef = useRef(false);

  // Fetch data using single joined query
  const fetchBSSData = useCallback(async () => {
    if (dataFetchedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      console.log("Fetching comprehensive BSS data with single query...");

      const response = await fetch("/api/testquery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sql: buildComprehensiveBSSQuery(), 
          params: [] 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("BSS data loaded:", data.length, "records");

      // Transform and enrich data
      const transformedStations: BatterySwappingStation[] = data.map((item: any) => {
        // Generate mock maintenance data (replace with real data when available)
        const lastMaintenanceDate = generateMockMaintenanceDate();
        const swapsSinceMaintenance = Math.floor(Math.random() * 120);
        const maintenanceStatus = calculateMaintenanceStatus(lastMaintenanceDate, swapsSinceMaintenance);
        const maintenanceReason = getMaintenanceReason(lastMaintenanceDate, swapsSinceMaintenance);

        const station: BatterySwappingStation = {
          STATION_ID: item.STATION_ID,
          VENDOR_ID: item.VENDOR_ID,
          STATION_MODEL: item.STATION_MODEL,
          SERIAL_NO: item.SERIAL_NO,
          STATION_NAME: item.STATION_NAME,
          LOCATION_ID: item.LOCATION_ID,
          RATING_GROUP_ID: item.RATING_GROUP_ID,
          HA_INTERVAL: item.HA_INTERVAL,
          STATUS_INTERVAL: item.STATUS_INTERVAL,
          INIT_COMPLETED: item.INIT_COMPLETED,
          CONFIG_DOWNLOADED: item.CONFIG_DOWNLOADED,
          MAINTENANCE_MODE: item.MAINTENANCE_MODE,
          STATION_ACTIVE: item.STATION_ACTIVE,
          STATION_DELETED: item.STATION_DELETED,
          STATION_CREATED_AT: item.STATION_CREATED_AT ? new Date(item.STATION_CREATED_AT) : undefined,
          STATION_UPDATED_AT: item.STATION_UPDATED_AT ? new Date(item.STATION_UPDATED_AT) : undefined,
          STATION_DELETED_AT: item.STATION_DELETED_AT ? new Date(item.STATION_DELETED_AT) : undefined,
          APPROVED_STATUS: item.APPROVED_STATUS,
          APPROVED_BY: item.APPROVED_BY,
          BSS_PLANTED_DATE_ELEC_UNIT_COUNT: item.BSS_PLANTED_DATE_ELEC_UNIT_COUNT,
          BSS_PLANTED_DATE: item.BSS_PLANTED_DATE ? new Date(item.BSS_PLANTED_DATE) : undefined,
          BSS_PLANTED_PLACE_MOBILE_NUMBER: item.BSS_PLANTED_PLACE_MOBILE_NUMBER,
          CITY_ID: item.CITY_ID,
          LOCATION_CODE: item.LOCATION_CODE,
          LOCATION_NAME: item.LOCATION_NAME,
          LATITUDE: item.LATITUDE,
          LONGITUDE: item.LONGITUDE,
          LOCATION_ACTIVE: item.LOCATION_ACTIVE,
          LOCATION_DELETED: item.LOCATION_DELETED,
          LOCATION_CREATED_AT: item.LOCATION_CREATED_AT ? new Date(item.LOCATION_CREATED_AT) : undefined,
          LOCATION_UPDATED_AT: item.LOCATION_UPDATED_AT ? new Date(item.LOCATION_UPDATED_AT) : undefined,
          LOCATION_DELETED_AT: item.LOCATION_DELETED_AT ? new Date(item.LOCATION_DELETED_AT) : undefined,
          // Vendor information
          VENDOR_COMPANY_NAME: item.VENDOR_COMPANY_NAME,
          VENDOR_COUNTRY: item.VENDOR_COUNTRY,
          VENDOR_CONTACT_NAME: item.VENDOR_CONTACT_NAME,
          VENDOR_CONTACT_DESIGNATION: item.VENDOR_CONTACT_DESIGNATION,
          VENDOR_CONTACT_PHONE: item.VENDOR_CONTACT_PHONE,
          VENDOR_CONTACT_ADDRESS: item.VENDOR_CONTACT_ADDRESS,
          VENDOR_CONTACT_EMAIL: item.VENDOR_CONTACT_EMAIL,
          VENDOR_HAS_CHARGING: item.VENDOR_HAS_CHARGING,
          VENDOR_HAS_SWAPPING: item.VENDOR_HAS_SWAPPING,
          VENDOR_HAS_BATTERY: item.VENDOR_HAS_BATTERY,
          VENDOR_HAS_3W_PARTS: item.VENDOR_HAS_3W_PARTS,
          VENDOR_HAS_BIKE_PARTS: item.VENDOR_HAS_BIKE_PARTS,
          // Swap statistics
          TOTAL_SWAPS: item.TOTAL_SWAPS || 0,
          LAST_SWAP_DATE: item.LAST_SWAP_DATE ? new Date(item.LAST_SWAP_DATE) : undefined,
          SWAPS_SINCE_MAINTENANCE: swapsSinceMaintenance,
          // Maintenance information
          LAST_MAINTENANCE_DATE: lastMaintenanceDate,
          MAINTENANCE_STATUS: maintenanceStatus,
          MAINTENANCE_REASON: maintenanceReason,
        };

        station.STATUS = deriveBSSStatus(station);
        return station;
      });

      setAllStations(transformedStations);
      setDataLoaded(true);
      dataFetchedRef.current = true;
    } catch (err) {
      console.error("Error fetching BSS data:", err);
      setError(`Failed to fetch data: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Extract unique values for filters
  const { vendorNames, models, locations, cities, countries } = useMemo(() => {
    const vendorNameSet = new Set(allStations.map((s) => s.VENDOR_COMPANY_NAME).filter(Boolean));
    const modelSet = new Set(allStations.map((s) => s.STATION_MODEL).filter(Boolean));
    const locationSet = new Set(allStations.map((s) => s.LOCATION_NAME).filter(Boolean));
    const citySet = new Set(allStations.map((s) => s.CITY_ID).filter(Boolean));
    const countrySet = new Set(allStations.map((s) => s.VENDOR_COUNTRY).filter(Boolean));

    return {
      vendorNames: Array.from(vendorNameSet).sort() as string[],
      models: Array.from(modelSet).sort() as string[],
      locations: Array.from(locationSet).sort() as string[],
      cities: Array.from(citySet).sort() as string[],
      countries: Array.from(countrySet).sort() as string[],
    };
  }, [allStations]);

  // Apply filters
  const filteredStations = useMemo(() => {
    return allStations.filter((station) => {
      const matchesSearch =
        !filters.searchTerm ||
        [
          station.STATION_ID,
          station.STATION_NAME,
          station.VENDOR_ID,
          station.VENDOR_COMPANY_NAME,
          station.STATION_MODEL,
          station.LOCATION_NAME,
          station.LOCATION_CODE,
          station.SERIAL_NO,
          station.CITY_ID,
          station.VENDOR_COUNTRY,
        ].some((field) => field?.toLowerCase().includes(filters.searchTerm.toLowerCase()));

      const matchesVendor = 
        filters.vendorFilter === "all" || 
        station.VENDOR_COMPANY_NAME === filters.vendorFilter;
      
      const matchesStatus = filters.statusFilter === "all" || station.STATUS === filters.statusFilter;
      const matchesModel = filters.modelFilter === "all" || station.STATION_MODEL === filters.modelFilter;
      const matchesLocation = filters.locationFilter === "all" || station.LOCATION_NAME === filters.locationFilter;
      const matchesCity = filters.cityFilter === "all" || station.CITY_ID === filters.cityFilter;
      const matchesCountry = filters.countryFilter === "all" || station.VENDOR_COUNTRY === filters.countryFilter;
      const matchesApproval =
        filters.approvalFilter === "all" || station.APPROVED_STATUS === filters.approvalFilter;
      const matchesMaintenance = 
        filters.maintenanceFilter === "all" || 
        station.MAINTENANCE_STATUS === filters.maintenanceFilter;

      return (
        matchesSearch &&
        matchesVendor &&
        matchesStatus &&
        matchesModel &&
        matchesLocation &&
        matchesCity &&
        matchesCountry &&
        matchesApproval &&
        matchesMaintenance
      );
    });
  }, [allStations, filters]);

  // Calculate KPIs
  const kpis = useMemo((): BSSKPIs => {
    const activeStations = filteredStations.filter((s) => s.STATUS === "ACTIVE").length;
    const maintenanceStations = filteredStations.filter((s) => s.STATUS === "MAINTENANCE").length;
    const inactiveStations = filteredStations.filter((s) => s.STATUS === "INACTIVE").length;
    const uniqueLocations = new Set(
      filteredStations.map((s) => s.LOCATION_ID).filter(Boolean)
    ).size;
    const uniqueVendors = new Set(
      filteredStations.map((s) => s.VENDOR_ID).filter(Boolean)
    ).size;
    const totalSwaps = filteredStations.reduce((sum, s) => sum + (s.TOTAL_SWAPS || 0), 0);
    const stationsDueMaintenance = filteredStations.filter(
      (s) => s.MAINTENANCE_STATUS === "OVERDUE" || 
             s.MAINTENANCE_STATUS === "DUE_SOON"
    ).length;

    return {
      TOTAL_STATIONS: filteredStations.length,
      ACTIVE_STATIONS: activeStations,
      MAINTENANCE_STATIONS: maintenanceStations,
      INACTIVE_STATIONS: inactiveStations,
      TOTAL_LOCATIONS: uniqueLocations,
      TOTAL_VENDORS: uniqueVendors,
      TOTAL_SWAPS: totalSwaps,
      STATIONS_DUE_MAINTENANCE: stationsDueMaintenance,
    };
  }, [filteredStations]);

  // Pagination
  const paginatedStations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStations, currentPage]);

  const totalPages = Math.ceil(filteredStations.length / itemsPerPage);

  // Effects
  useEffect(() => {
    if (!dataFetchedRef.current) {
      fetchBSSData();
    }
  }, [fetchBSSData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchBSSData} />;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <Battery className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">
              Battery Swapping Infrastructure
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            BSS Overview & Maintenance Tracker
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Monitor station performance, track swap counts, and manage preventive maintenance schedules across your network.
          </p>
        </div>

        {/* Data Summary */}
        {dataLoaded && (
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-green-400 text-sm">
                {allStations.length.toLocaleString()} stations • {kpis.TOTAL_VENDORS} vendors • {kpis.TOTAL_SWAPS.toLocaleString()} total swaps
              </span>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <KPIGrid kpis={kpis} />

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          vendors={vendorNames}
          models={models}
          locations={locations}
          cities={cities}
          countries={countries}
        />

        {/* Station Grid */}
        <BSSGrid
          stations={paginatedStations}
          currentPage={currentPage}
          totalPages={totalPages}
          totalStations={filteredStations.length}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default BSSOverviewPage;