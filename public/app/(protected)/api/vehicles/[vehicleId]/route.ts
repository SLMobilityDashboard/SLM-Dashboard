// app/(layout)/api/vehicles/[vehicleId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Mock data generator for demonstration
function generateMockVehicleData(vehicleId: string) {
  const mockVehicle = {
    VEHICLE_ID: vehicleId,
    VIN: `1HGBH41JXMN${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    MODEL: 'ElectricCar Pro',
    BATTERY_TYPE: 'Lithium Ion 75kWh',
    STATUS: Math.random() > 0.5 ? 'SOLD' : 'FACTORY_INSTOCK',
    REGION: 'North America',
    CREATED_DATE: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    CUSTOMER_ID: Math.random() > 0.3 ? `CUST_${Math.random().toString(36).substr(2, 8)}` : null,
    CUSTOMER_NAME: Math.random() > 0.3 ? 'John Doe' : null,
    EMAIL: Math.random() > 0.3 ? 'john.doe@email.com' : null,
    PHONE: Math.random() > 0.3 ? '+1-555-0123' : null,
    LATITUDE: Math.random() > 0.3 ? 40.7128 + (Math.random() - 0.5) * 2 : null,
    LONGITUDE: Math.random() > 0.3 ? -74.0060 + (Math.random() - 0.5) * 2 : null,
    ADDRESS: Math.random() > 0.3 ? '123 Main St, New York, NY 10001' : null,
    LAST_LOCATION_UPDATE: Math.random() > 0.3 ? new Date().toISOString() : null,
  };

  const mockChargingPatterns = Array.from({ length: 24 }, (_, hour) => ({
    HOUR_OF_DAY: hour,
    SESSION_COUNT: Math.floor(Math.random() * 10) + 1,
    AVG_DURATION: Math.floor(Math.random() * 120) + 30,
    AVG_ENERGY: Math.floor(Math.random() * 50) + 10,
    AVG_COST: Math.floor(Math.random() * 25) + 5,
  }));

  const mockSwappingHistory = Array.from({ length: Math.floor(Math.random() * 15) + 5 }, (_, i) => {
    const swapDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    return {
      SWAP_DATE: swapDate.toISOString().split('T')[0],
      SWAP_TIME: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      STATION_NAME: `Battery Station ${Math.floor(Math.random() * 50) + 1}`,
      LOCATION: `Location ${Math.floor(Math.random() * 20) + 1}`,
      OLD_BATTERY_ID: `BAT_${Math.random().toString(36).substr(2, 8)}`,
      OLD_BATTERY_HEALTH: Math.floor(Math.random() * 40) + 60,
      NEW_BATTERY_ID: `BAT_${Math.random().toString(36).substr(2, 8)}`,
      NEW_BATTERY_HEALTH: Math.floor(Math.random() * 15) + 85,
      SWAP_DURATION_SECONDS: Math.floor(Math.random() * 300) + 120,
      SWAP_COST: Math.floor(Math.random() * 20) + 10,
    };
  });

  const mockGpsAnalytics = Array.from({ length: Math.floor(Math.random() * 25) + 10 }, (_, i) => {
    const travelDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    return {
      TRAVEL_DATE: travelDate.toISOString().split('T')[0],
      FIRST_LOCATION_TIME: '08:00',
      LAST_LOCATION_TIME: '18:30',
      LOCATION_POINTS: Math.floor(Math.random() * 500) + 100,
      TOTAL_DISTANCE: Math.floor(Math.random() * 200) + 50,
      AVG_SPEED: Math.floor(Math.random() * 40) + 30,
      MAX_SPEED: Math.floor(Math.random() * 50) + 60,
      IDLE_POINTS: Math.floor(Math.random() * 50) + 10,
      ROUTE_EFFICIENCY: Math.floor(Math.random() * 30) + 70,
    };
  });

  const mockBatteryHealth = [{
    BATTERY_ID: `BAT_${Math.random().toString(36).substr(2, 8)}`,
    BATTERY_TYPE: 'Lithium Ion',
    CAPACITY_KWH: 75,
    HEALTH_PERCENTAGE: Math.floor(Math.random() * 25) + 75,
    CYCLE_COUNT: Math.floor(Math.random() * 1000) + 200,
    LAST_MAINTENANCE_DATE: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    REPLACEMENT_DATE: null,
    TOTAL_SWAPS: Math.floor(Math.random() * 20) + 5,
    LAST_SWAP_DATE: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }];

  return {
    vehicle: mockVehicle,
    chargingPatterns: mockChargingPatterns,
    swappingHistory: mockSwappingHistory,
    gpsAnalytics: mockGpsAnalytics,
    batteryHealth: mockBatteryHealth,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    // Await the params object before accessing its properties
    const { vehicleId } = await params;

    if (!vehicleId) {
      return NextResponse.json(
        { success: false, error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching data for vehicle: ${vehicleId}`);

    // Generate mock data (replace this with your actual database queries)
    const mockData = generateMockVehicleData(vehicleId);
    
    console.log(`Generated mock data for vehicle ${vehicleId}:`, {
      vehicleId: vehicleId,
      vehicle: !!mockData.vehicle,
      chargingPatterns: mockData.chargingPatterns.length,
      swappingHistory: mockData.swappingHistory.length,
      gpsAnalytics: mockData.gpsAnalytics.length,
      batteryHealth: mockData.batteryHealth[0]?.HEALTH_PERCENTAGE || 'N/A',
      lastUpdated: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: mockData,
    });

  } catch (error) {
    console.error('Error in vehicle API route:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}