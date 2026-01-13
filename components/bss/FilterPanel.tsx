import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Search, X, Check, Loader2 } from "lucide-react";

interface BSSFilters {
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

interface FilterPanelProps {
  filters: BSSFilters;
  onFiltersChange: (filters: BSSFilters) => void;
  vendors: string[];
  models: string[];
  locations: string[];
  cities: string[];
  countries: string[];
  loading?: boolean;
}

const DEFAULT_FILTERS: BSSFilters = {
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

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  vendors,
  models,
  locations,
  cities,
  countries,
  loading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<BSSFilters>(filters);
  const [tempFilters, setTempFilters] = useState<BSSFilters>(filters);

  useEffect(() => {
    setAppliedFilters(filters);
    setTempFilters(filters);
  }, [filters]);

  const updateTempFilters = useCallback(
    (newFilters: Partial<BSSFilters>) => {
      setTempFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...tempFilters });
    onFiltersChange({ ...tempFilters });
  }, [tempFilters, onFiltersChange]);

  const hasUnappliedChanges = useCallback(() => {
    return JSON.stringify(tempFilters) !== JSON.stringify(appliedFilters);
  }, [tempFilters, appliedFilters]);

  const getActiveFiltersCount = useCallback(() => {
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
  }, [appliedFilters]);

  const clearAllFilters = useCallback(() => {
    setTempFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    onFiltersChange(DEFAULT_FILTERS);
  }, [onFiltersChange]);

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-200">Filters</span>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary">
                {getActiveFiltersCount()} active
              </Badge>
            )}
            {hasUnappliedChanges() && (
              <Badge
                variant="outline"
                className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
              >
                Unapplied changes
              </Badge>
            )}
            {loading && (
              <div className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                <span className="text-xs text-slate-400">
                  Loading filters...
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {getActiveFiltersCount() > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Less" : "More"} Filters
            </Button>
            <Button
              size="sm"
              onClick={applyFilters}
              disabled={!hasUnappliedChanges()}
              className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50"
            >
              <Check className="h-4 w-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>

        {/* Main Search */}
        <div className="space-y-2">
          <Label className="text-slate-300">Quick Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search stations, vendors, locations..."
              value={tempFilters.searchTerm}
              onChange={(e) => updateTempFilters({ searchTerm: e.target.value })}
              className="pl-10 bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Main Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status */}
          <div className="space-y-2">
            <Label className="text-slate-300">Status</Label>
            <Select
              value={tempFilters.statusFilter}
              onValueChange={(value) => updateTempFilters({ statusFilter: value })}
              disabled={loading}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="INITIALIZING">Initializing</SelectItem>
                <SelectItem value="CONFIGURING">Configuring</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Maintenance Status */}
          <div className="space-y-2">
            <Label className="text-slate-300">Maintenance Status</Label>
            <Select
              value={tempFilters.maintenanceFilter}
              onValueChange={(value) => updateTempFilters({ maintenanceFilter: value })}
              disabled={loading}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
                <SelectItem value="DUE_SOON">Due Soon</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <Label className="text-slate-300">Vendor</Label>
            <Select
              value={tempFilters.vendorFilter}
              onValueChange={(value) => updateTempFilters({ vendorFilter: value })}
              disabled={loading}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor} value={vendor}>
                    {vendor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label className="text-slate-300">Model</Label>
            <Select
              value={tempFilters.modelFilter}
              onValueChange={(value) => updateTempFilters({ modelFilter: value })}
              disabled={loading}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <>
            <div className="pt-4 border-t border-slate-700/50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Country */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Country</Label>
                  <Select
                    value={tempFilters.countryFilter}
                    onValueChange={(value) => updateTempFilters({ countryFilter: value })}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label className="text-slate-300">City</Label>
                  <Select
                    value={tempFilters.cityFilter}
                    onValueChange={(value) => updateTempFilters({ cityFilter: value })}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Location</Label>
                  <Select
                    value={tempFilters.locationFilter}
                    onValueChange={(value) => updateTempFilters({ locationFilter: value })}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Approval */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Approval</Label>
                  <Select
                    value={tempFilters.approvalFilter}
                    onValueChange={(value) => updateTempFilters({ approvalFilter: value })}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Filter Guide */}
            <div className="pt-4 border-t border-slate-700/50">
              <Label className="mb-3 block text-slate-300">Filter Guide</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-slate-300">Active:</span>
                      <span className="ml-1">Station is operational</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-slate-300">Maintenance:</span>
                      <span className="ml-1">Under servicing</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-slate-300">Inactive:</span>
                      <span className="ml-1">Station offline</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p>• Use Quick Search for instant station lookup</p>
                  <p>• Combine filters for precise targeting</p>
                  <p>• Monitor maintenance status regularly</p>
                  <p>• Filter by location for regional insights</p>
                </div>
              </div>
            </div>

            {/* Active Filter Summary */}
            <div className="pt-4 border-t border-slate-700/50">
              <Label className="mb-3 block text-slate-300">Active Filter Summary</Label>
              <div className="text-xs text-slate-400 space-y-1">
                {appliedFilters.searchTerm && (
                  <p>
                    • Quick Search: <span className="text-slate-300">"{appliedFilters.searchTerm}"</span>
                  </p>
                )}
                {appliedFilters.statusFilter !== "all" && (
                  <p>
                    • Status: <span className="text-slate-300">{appliedFilters.statusFilter}</span>
                  </p>
                )}
                {appliedFilters.vendorFilter !== "all" && (
                  <p>
                    • Vendor: <span className="text-slate-300">{appliedFilters.vendorFilter}</span>
                  </p>
                )}
                {appliedFilters.modelFilter !== "all" && (
                  <p>
                    • Model: <span className="text-slate-300">{appliedFilters.modelFilter}</span>
                  </p>
                )}
                {appliedFilters.maintenanceFilter !== "all" && (
                  <p>
                    • Maintenance: <span className="text-slate-300">{appliedFilters.maintenanceFilter}</span>
                  </p>
                )}
                {appliedFilters.countryFilter !== "all" && (
                  <p>
                    • Country: <span className="text-slate-300">{appliedFilters.countryFilter}</span>
                  </p>
                )}
                {appliedFilters.cityFilter !== "all" && (
                  <p>
                    • City: <span className="text-slate-300">{appliedFilters.cityFilter}</span>
                  </p>
                )}
                {appliedFilters.locationFilter !== "all" && (
                  <p>
                    • Location: <span className="text-slate-300">{appliedFilters.locationFilter}</span>
                  </p>
                )}
                {appliedFilters.approvalFilter !== "all" && (
                  <p>
                    • Approval: <span className="text-slate-300">{appliedFilters.approvalFilter}</span>
                  </p>
                )}
                {getActiveFiltersCount() === 0 && (
                  <p className="text-slate-500 italic">No filters applied - showing all stations</p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Demo Component
export default function App() {
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

  const sampleVendors = ["Huawei", "Ericsson", "Nokia", "ZTE"];
  const sampleModels = ["5G-NR", "LTE-Advanced", "4G-LTE", "3G-UMTS"];
  const sampleLocations = ["Site-001", "Site-002", "Site-003", "Site-004"];
  const sampleCities = ["New York", "Los Angeles", "Chicago", "Houston"];
  const sampleCountries = ["USA", "Canada", "Mexico", "Brazil"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-100">
            BSS Filter Panel
          </h1>
          <p className="text-slate-400">
            Modern filter design inspired by the Battery Filter component
          </p>
        </div>

        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          vendors={sampleVendors}
          models={sampleModels}
          locations={sampleLocations}
          cities={sampleCities}
          countries={sampleCountries}
          loading={false}
        />
      </div>
    </div>
  );
}