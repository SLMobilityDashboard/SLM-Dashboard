import { type NextRequest, NextResponse } from "next/server"
import {
  mockVehicles,
  mockFleetKPIs,
  mockChargingOverTime,
  mockBatteryDistribution,
  mockHomeChargingIncrease
} from "@/lib/mock-data/fleet-data"


// Function to filter home charging data based on filtered vehicles
function filterHomeChargingData(filteredVehicles: any[]) {
  if (filteredVehicles.length === 0) return [];
  
  // Calculate scaling factor based on filtered vehicles vs total mock data
  const scalingFactor = filteredVehicles.length / mockVehicles.length;
  
  return mockHomeChargingIncrease.map(bin => ({
    ...bin,
    vehicleCount: Math.round(bin.vehicleCount * scalingFactor)
  })).filter(bin => bin.vehicleCount > 0); // Remove empty bins
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateRange = searchParams.get("dateRange") || "30"
  const vehicleModel = searchParams.get("vehicleModel") || "all"
  const batteryType = searchParams.get("batteryType") || "all"
  const region = searchParams.get("region") || "all"

  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Filter vehicles based on query parameters
    let filteredVehicles = [...mockVehicles]

    if (vehicleModel !== "all") {
      filteredVehicles = filteredVehicles.filter((v) => v.MODEL === vehicleModel)
    }

    if (batteryType !== "all") {
      filteredVehicles = filteredVehicles.filter((v) => v.BATTERY_TYPE === batteryType)
    }

    if (region !== "all") {
      filteredVehicles = filteredVehicles.filter((v) => v.REGION === region)
    }

    // Recalculate KPIs based on filtered data
    const filteredKPIs = {
      TOTAL_VEHICLES: filteredVehicles.length,
      TOTAL_CHARGING_SESSIONS: filteredVehicles.reduce(
        (sum, v) => sum + v.TOTAL_CHARGING_SESSIONS,
        0
      ),
      TOTAL_CHARGING_REVENUE: filteredVehicles.reduce(
        (sum, v) => sum + v.CHARGING_REVENUE,
        0
      ),
      TOTAL_CO2_SAVED: filteredVehicles.reduce(
        (sum, v) => sum + v.TOTAL_DISTANCE * 0.12,
        0
      ),
    }

    // Filter other data based on the filtered vehicles
    const vehicleModels = [...new Set(filteredVehicles.map((v) => v.MODEL))]
    // const filteredChargingPattern = chargingPattern.filter((s) => vehicleModels.includes(s.MODEL))

    const batteryTypes = [...new Set(filteredVehicles.map((v) => v.BATTERY_TYPE))]
    const filteredBatteryDistribution = mockBatteryDistribution.filter((b) => batteryTypes.includes(b.BATTERY_TYPE))

    // Filter home charging data proportionally
    const filteredHomeChargingIncrease = filterHomeChargingData(filteredVehicles)

    return NextResponse.json({
      success: true,
      data: {
        vehicles: filteredVehicles,
        kpis: filteredKPIs,
      },
    })
  } catch (error) {
    console.error("Error fetching vehicle overview:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch vehicle data",
      },
      { status: 500 },
    )
  }
}