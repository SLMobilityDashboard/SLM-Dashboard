"use client"

import type React from "react"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Battery,
  BatteryCharging,
  Zap,
  AlertTriangle,
  Search,
  RefreshCw,
  Activity,
  Gauge,
  ThermometerSun,
} from "lucide-react"

// Types
interface BatteryData {
  BATTERY_ID: string
  BATTERY_TYPE: string
  VEHICLE_ID?: string
  STATUS: string
  HEALTH_PERCENTAGE: number
  CHARGE_LEVEL: number
  TEMPERATURE: number
  CYCLE_COUNT: number
  VOLTAGE: number
  CURRENT: number
  LAST_SWAP_DATE?: Date
  LOCATION?: string
  STATION_ID?: string
}

interface BatteryKPIs {
  TOTAL_BATTERIES: number
  ACTIVE_BATTERIES: number
  AVERAGE_HEALTH: number
  BATTERIES_CHARGING: number
  BATTERIES_AVAILABLE: number
  BATTERIES_IN_USE: number
  TOTAL_SWAPS_TODAY: number
  AVERAGE_TEMPERATURE: number
}

interface FilterState {
  searchTerm: string
  batteryType: string
  status: string
  healthRange: string
  location: string
}

// Component: Loading State
const LoadingState = () => (
  <div className="min-h-screen p-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-slate-300">Loading battery data...</span>
        </div>
      </div>
    </div>
  </div>
)

// Component: Error State
const ErrorState = ({
  error,
  onRetry,
}: {
  error: string
  onRetry: () => void
}) => (
  <div className="min-h-screen p-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-center h-64">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-red-400 font-medium mb-2">Error Loading Data</h3>
            <p className="text-slate-400 text-sm mb-4">{error}</p>
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
)

// Component: KPI Cards
const BatteryKPICards = ({ kpis }: { kpis: BatteryKPIs }) => {
  const kpiCards = [
    {
      title: "Total Batteries",
      value: kpis.TOTAL_BATTERIES.toLocaleString(),
      icon: Battery,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Active Batteries",
      value: kpis.ACTIVE_BATTERIES.toLocaleString(),
      icon: BatteryCharging,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
    },
    {
      title: "Average Health",
      value: `${kpis.AVERAGE_HEALTH.toFixed(1)}%`,
      icon: Gauge,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    },
    {
      title: "Batteries Charging",
      value: kpis.BATTERIES_CHARGING.toLocaleString(),
      icon: Zap,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
    },
    {
      title: "Available",
      value: kpis.BATTERIES_AVAILABLE.toLocaleString(),
      icon: Battery,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "In Use",
      value: kpis.BATTERIES_IN_USE.toLocaleString(),
      icon: Activity,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
    },
    {
      title: "Swaps Today",
      value: kpis.TOTAL_SWAPS_TODAY.toLocaleString(),
      icon: RefreshCw,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
    {
      title: "Avg Temperature",
      value: `${kpis.AVERAGE_TEMPERATURE.toFixed(1)}°C`,
      icon: ThermometerSun,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpiCards.map((kpi, index) => (
        <Card
          key={index}
          className={`${kpi.bgColor} ${kpi.borderColor} backdrop-blur-sm hover:scale-105 transition-transform duration-200`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">{kpi.title}</p>
                <p className={`text-2xl font-bold ${kpi.color} mt-1`}>{kpi.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Component: Battery Table
const BatteryTable = ({ batteries }: { batteries: BatteryData[] }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return "text-green-400 bg-green-500/10"
      case "charging":
        return "text-yellow-400 bg-yellow-500/10"
      case "in_use":
        return "text-blue-400 bg-blue-500/10"
      case "maintenance":
        return "text-orange-400 bg-orange-500/10"
      case "faulty":
        return "text-red-400 bg-red-500/10"
      default:
        return "text-slate-400 bg-slate-500/10"
    }
  }

  const getHealthColor = (health: number) => {
    if (health >= 80) return "text-green-400"
    if (health >= 60) return "text-yellow-400"
    if (health >= 40) return "text-orange-400"
    return "text-red-400"
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Battery className="w-5 h-5 text-cyan-400" />
          Battery Inventory
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Battery ID</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Type</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Health</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Charge</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Temperature</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Cycles</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Location</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batteries.map((battery) => (
                <tr key={battery.BATTERY_ID} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-3 px-4 text-slate-200 font-mono text-sm">{battery.BATTERY_ID}</td>
                  <td className="py-3 px-4 text-slate-300">{battery.BATTERY_TYPE}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(battery.STATUS)}`}>
                      {battery.STATUS.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${getHealthColor(battery.HEALTH_PERCENTAGE)}`}>
                      {battery.HEALTH_PERCENTAGE}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-green-400"
                          style={{ width: `${battery.CHARGE_LEVEL}%` }}
                        />
                      </div>
                      <span className="text-slate-300 text-sm">{battery.CHARGE_LEVEL}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{battery.TEMPERATURE}°C</td>
                  <td className="py-3 px-4 text-slate-300">{battery.CYCLE_COUNT.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-300">{battery.LOCATION || "N/A"}</td>
                  <td className="py-3 px-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 bg-transparent"
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// Component: Filters
const Filters = ({
  filters,
  setFilters,
  onRefresh,
}: {
  filters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>
  onRefresh: () => void
}) => (
  <Card className="bg-slate-900/50 border-slate-700/50">
    <CardContent className="p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search batteries..."
            value={filters.searchTerm}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
            className="w-64 bg-slate-800 border-slate-600"
          />
        </div>

        <Select
          value={filters.batteryType}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, batteryType: value }))}
        >
          <SelectTrigger className="w-48 bg-slate-800 border-slate-600">
            <SelectValue placeholder="Battery Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Lithium-Ion">Lithium-Ion</SelectItem>
            <SelectItem value="LiFePO4">LiFePO4</SelectItem>
            <SelectItem value="Solid State">Solid State</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-600">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="charging">Charging</SelectItem>
            <SelectItem value="in_use">In Use</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="faulty">Faulty</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.healthRange}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, healthRange: value }))}
        >
          <SelectTrigger className="w-48 bg-slate-800 border-slate-600">
            <SelectValue placeholder="Health Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health</SelectItem>
            <SelectItem value="excellent">Excellent (80-100%)</SelectItem>
            <SelectItem value="good">Good (60-79%)</SelectItem>
            <SelectItem value="fair">Fair (40-59%)</SelectItem>
            <SelectItem value="poor">Poor (0-39%)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.location}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, location: value }))}
        >
          <SelectTrigger className="w-48 bg-slate-800 border-slate-600">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="Station A">Station A</SelectItem>
            <SelectItem value="Station B">Station B</SelectItem>
            <SelectItem value="Station C">Station C</SelectItem>
            <SelectItem value="Warehouse">Warehouse</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </CardContent>
  </Card>
)

const BatteriesOverviewPage = () => {
  const [batteries, setBatteries] = useState<BatteryData[]>([])
  const [batteryKPIs, setBatteryKPIs] = useState<BatteryKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    batteryType: "all",
    status: "all",
    healthRange: "all",
    location: "all",
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Mock data for now - replace with actual API call
      const mockBatteries: BatteryData[] = Array.from({ length: 50 }, (_, i) => ({
        BATTERY_ID: `BAT-${String(i + 1).padStart(4, "0")}`,
        BATTERY_TYPE: ["Lithium-Ion", "LiFePO4", "Solid State"][i % 3],
        VEHICLE_ID: i % 4 === 0 ? undefined : `VEH-${String(i + 1).padStart(4, "0")}`,
        STATUS: ["available", "charging", "in_use", "maintenance", "faulty"][i % 5],
        HEALTH_PERCENTAGE: Math.floor(Math.random() * 40) + 60,
        CHARGE_LEVEL: Math.floor(Math.random() * 100),
        TEMPERATURE: Math.floor(Math.random() * 20) + 25,
        CYCLE_COUNT: Math.floor(Math.random() * 500) + 100,
        VOLTAGE: 48 + Math.random() * 4,
        CURRENT: Math.random() * 10,
        LAST_SWAP_DATE: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        LOCATION: ["Station A", "Station B", "Station C", "Warehouse"][i % 4],
        STATION_ID: i % 4 === 3 ? undefined : `ST-${String((i % 3) + 1).padStart(3, "0")}`,
      }))

      const mockKPIs: BatteryKPIs = {
        TOTAL_BATTERIES: mockBatteries.length,
        ACTIVE_BATTERIES: mockBatteries.filter((b) => b.STATUS !== "faulty").length,
        AVERAGE_HEALTH: mockBatteries.reduce((sum, b) => sum + b.HEALTH_PERCENTAGE, 0) / mockBatteries.length,
        BATTERIES_CHARGING: mockBatteries.filter((b) => b.STATUS === "charging").length,
        BATTERIES_AVAILABLE: mockBatteries.filter((b) => b.STATUS === "available").length,
        BATTERIES_IN_USE: mockBatteries.filter((b) => b.STATUS === "in_use").length,
        TOTAL_SWAPS_TODAY: Math.floor(Math.random() * 100) + 50,
        AVERAGE_TEMPERATURE: mockBatteries.reduce((sum, b) => sum + b.TEMPERATURE, 0) / mockBatteries.length,
      }

      setBatteries(mockBatteries)
      setBatteryKPIs(mockKPIs)
    } catch (err) {
      setError("Failed to fetch battery data")
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter batteries
  const filteredBatteries = useMemo(() => {
    return batteries.filter((battery) => {
      const matchesSearch =
        battery.BATTERY_ID.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        battery.BATTERY_TYPE.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (battery.LOCATION && battery.LOCATION.toLowerCase().includes(filters.searchTerm.toLowerCase()))

      const matchesType = filters.batteryType === "all" || battery.BATTERY_TYPE === filters.batteryType

      const matchesStatus = filters.status === "all" || battery.STATUS === filters.status

      const matchesHealth = (() => {
        if (filters.healthRange === "all") return true
        const health = battery.HEALTH_PERCENTAGE
        switch (filters.healthRange) {
          case "excellent":
            return health >= 80
          case "good":
            return health >= 60 && health < 80
          case "fair":
            return health >= 40 && health < 60
          case "poor":
            return health < 40
          default:
            return true
        }
      })()

      const matchesLocation = filters.location === "all" || battery.LOCATION === filters.location

      return matchesSearch && matchesType && matchesStatus && matchesHealth && matchesLocation
    })
  }, [batteries, filters])

  // Paginated batteries
  const paginatedBatteries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredBatteries.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredBatteries, currentPage])

  const totalPages = Math.ceil(filteredBatteries.length / itemsPerPage)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={fetchData} />

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
            <Battery className="h-4 w-4 text-green-400 mr-2" />
            <span className="text-green-400 text-sm font-medium">Battery Management System</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Battery Overview Dashboard
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Monitor and manage your battery fleet with real-time health, charging status, and performance analytics
          </p>
        </div>

        <Filters filters={filters} setFilters={setFilters} onRefresh={fetchData} />

        {batteryKPIs && <BatteryKPICards kpis={batteryKPIs} />}

        <BatteryTable batteries={paginatedBatteries} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredBatteries.length)} of {filteredBatteries.length} batteries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-slate-300 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BatteriesOverviewPage
