import React, { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPin,
  Activity,
  DollarSign,
  Battery,
  TrendingUp,
  Loader2,
  Navigation,
} from "lucide-react";

interface SwapTransaction {
  LOCATION_NAME: string;
  STATION_NAME: string;
  OLDCABINET_BID: string;
  NEWCABINET_BID: string;
  OLDBID_BATPERCENT: number;
  NEWBID_BATPERCENT: number;
  AMOUNT: number;
  CREATED_EPOCH: number;
  PAYMENT_STATUS: string;
}

interface StationLocation {
  locationName: string;
  stationName: string;
  swapCount: number;
  totalRevenue: number;
  avgAmount: number;
  avgBatteryOutPercent: number;
  avgBatteryInPercent: number;
  successRate: number;
  lat: number;
  lng: number;
  category: string;
  healthGain: number;
}

interface SwapStationMapProps {
  swapTransactions: SwapTransaction[];
  BMSID: string;
}

// Color palettes for different metrics
const colorPalettes = {
  swapCount: {
    "High Traffic (50+)": "#22C55E",
    "Medium Traffic (20-49)": "#EAB308",
    "Low Traffic (10-19)": "#F97316",
    "Very Low Traffic (<10)": "#DC2626",
  },
  revenue: {
    "High Revenue (100k+)": "#10B981",
    "Medium Revenue (50k-100k)": "#3B82F6",
    "Low Revenue (20k-50k)": "#F59E0B",
    "Very Low Revenue (<20k)": "#EF4444",
  },
  batteryHealth: {
    "Excellent Health (+20%)": "#06D6A0",
    "Good Health (+10-20%)": "#3B82F6",
    "Fair Health (0-10%)": "#F59E0B",
    "Poor Health (Negative)": "#EE6C4D",
  },
  successRate: {
    "Excellent (95%+)": "#22C55E",
    "Good (85-95%)": "#3B82F6",
    "Fair (75-85%)": "#EAB308",
    "Needs Improvement (<75%)": "#EF4444",
  },
};

// Enhanced geocoding function for Sri Lanka stations
const geocodeStation = (
  locationName: string,
  stationName: string
): { lat: number; lng: number } => {
  const knownLocations: Record<string, { lat: number; lng: number }> = {
    // Major cities
    colombo: { lat: 6.9271, lng: 79.8612 },
    gampaha: { lat: 7.0873, lng: 79.999 },
    kalutara: { lat: 6.5854, lng: 79.9607 },
    kandy: { lat: 7.2906, lng: 80.6337 },
    matale: { lat: 7.4675, lng: 80.6234 },
    "nuwara eliya": { lat: 6.9497, lng: 80.7891 },
    galle: { lat: 6.0535, lng: 80.221 },
    matara: { lat: 5.9549, lng: 80.555 },
    hambantota: { lat: 6.1429, lng: 81.1212 },
    jaffna: { lat: 9.6615, lng: 80.0255 },
    trincomalee: { lat: 8.5874, lng: 81.2152 },
    batticaloa: { lat: 7.731, lng: 81.6747 },
    anuradhapura: { lat: 8.3114, lng: 80.4037 },
    polonnaruwa: { lat: 7.9403, lng: 81.0188 },
    kurunegala: { lat: 7.4818, lng: 80.3609 },
    puttalam: { lat: 8.0362, lng: 79.8283 },
    ratnapura: { lat: 6.7056, lng: 80.3847 },
    badulla: { lat: 6.9934, lng: 81.055 },

    // Colombo suburbs & areas
    "mount lavinia": { lat: 6.8412, lng: 79.8638 },
    dehiwala: { lat: 6.8562, lng: 79.8742 },
    nugegoda: { lat: 6.8649, lng: 79.8997 },
    maharagama: { lat: 6.8484, lng: 79.9265 },
    kotte: { lat: 6.8905, lng: 79.9018 },
    battaramulla: { lat: 6.8989, lng: 79.9181 },
    rajagiriya: { lat: 6.9089, lng: 79.8913 },
    moratuwa: { lat: 6.773, lng: 79.8816 },
    panadura: { lat: 6.7133, lng: 79.9026 },
    negombo: { lat: 7.2008, lng: 79.8358 },
    kelaniya: { lat: 6.9553, lng: 79.922 },
    kaduwela: { lat: 6.9333, lng: 79.9833 },
    homagama: { lat: 6.8444, lng: 80.0022 },
    piliyandala: { lat: 6.8011, lng: 79.9222 },
    kadawatha: { lat: 7.0083, lng: 79.9533 },
    "ja-ela": { lat: 7.0742, lng: 79.8917 },
    wattala: { lat: 6.9889, lng: 79.8917 },
  };

  const normalizedLocation = locationName.toLowerCase().trim();

  if (knownLocations[normalizedLocation]) {
    const base = knownLocations[normalizedLocation];
    const hash = (stationName || "").split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const latOffset = ((hash % 100) - 50) / 10000;
    const lngOffset = (((hash >> 8) % 100) - 50) / 10000;

    return {
      lat: base.lat + latOffset,
      lng: base.lng + lngOffset,
    };
  }

  // Fallback: Generate within Sri Lanka bounds
  const hash = (locationName + stationName).split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const latOffset = (Math.abs(hash % 400) - 200) / 100;
  const lngOffset = (Math.abs((hash >> 8) % 240) - 120) / 100;

  return {
    lat: 6.9271 + latOffset,
    lng: 79.8612 + lngOffset,
  };
};

export default function SwapStationMap({
  swapTransactions,
  BMSID,
}: SwapStationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leaflet, setLeaflet] = useState<any>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [colorBy, setColorBy] = useState<
    "swapCount" | "revenue" | "batteryHealth" | "successRate"
  >("swapCount");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Load Leaflet
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        setLeaflet(L);
      } catch (error) {
        console.error("Failed to load Leaflet:", error);
        setIsLoading(false);
      }
    };
    loadLeaflet();
  }, []);

  // Process station data
  const stationLocations = useMemo(() => {
    const locationData: Record<string, StationLocation> = {};

    swapTransactions.forEach((transaction) => {
      const key = `${transaction.LOCATION_NAME}-${transaction.STATION_NAME}`;

      if (!locationData[key]) {
        const coords = geocodeStation(
          transaction.LOCATION_NAME,
          transaction.STATION_NAME
        );
        locationData[key] = {
          locationName: transaction.LOCATION_NAME || "Unknown Location",
          stationName: transaction.STATION_NAME || "Unknown Station",
          swapCount: 0,
          totalRevenue: 0,
          avgAmount: 0,
          avgBatteryOutPercent: 0,
          avgBatteryInPercent: 0,
          successRate: 0,
          lat: coords.lat,
          lng: coords.lng,
          category: "",
          healthGain: 0,
        };
      }

      locationData[key].swapCount += 1;
      locationData[key].totalRevenue += transaction.AMOUNT || 0;
      locationData[key].avgBatteryOutPercent +=
        transaction.OLDBID_BATPERCENT || 0;
      locationData[key].avgBatteryInPercent +=
        transaction.NEWBID_BATPERCENT || 0;
    });

    // Calculate averages and categorize
    Object.values(locationData).forEach((station) => {
      station.avgAmount =
        station.swapCount > 0 ? station.totalRevenue / station.swapCount : 0;
      station.avgBatteryOutPercent =
        station.swapCount > 0
          ? station.avgBatteryOutPercent / station.swapCount
          : 0;
      station.avgBatteryInPercent =
        station.swapCount > 0
          ? station.avgBatteryInPercent / station.swapCount
          : 0;
      station.healthGain =
        station.avgBatteryInPercent - station.avgBatteryOutPercent;

      const stationTransactions = swapTransactions.filter(
        (t) =>
          t.LOCATION_NAME === station.locationName &&
          t.STATION_NAME === station.stationName
      );
      const successfulSwaps = stationTransactions.filter(
        (t) => t.PAYMENT_STATUS === "PAID" || t.PAYMENT_STATUS === "VOIDED"
      ).length;
      station.successRate =
        stationTransactions.length > 0
          ? (successfulSwaps / stationTransactions.length) * 100
          : 0;

      // Assign category based on current colorBy metric
      switch (colorBy) {
        case "swapCount":
          if (station.swapCount >= 50) station.category = "High Traffic (50+)";
          else if (station.swapCount >= 20)
            station.category = "Medium Traffic (20-49)";
          else if (station.swapCount >= 10)
            station.category = "Low Traffic (10-19)";
          else station.category = "Very Low Traffic (<10)";
          break;
        case "revenue":
          if (station.totalRevenue >= 100000)
            station.category = "High Revenue (100k+)";
          else if (station.totalRevenue >= 50000)
            station.category = "Medium Revenue (50k-100k)";
          else if (station.totalRevenue >= 20000)
            station.category = "Low Revenue (20k-50k)";
          else station.category = "Very Low Revenue (<20k)";
          break;
        case "batteryHealth":
          if (station.healthGain >= 20)
            station.category = "Excellent Health (+20%)";
          else if (station.healthGain >= 10)
            station.category = "Good Health (+10-20%)";
          else if (station.healthGain >= 0)
            station.category = "Fair Health (0-10%)";
          else station.category = "Poor Health (Negative)";
          break;
        case "successRate":
          if (station.successRate >= 95) station.category = "Excellent (95%+)";
          else if (station.successRate >= 85)
            station.category = "Good (85-95%)";
          else if (station.successRate >= 75)
            station.category = "Fair (75-85%)";
          else station.category = "Needs Improvement (<75%)";
          break;
      }
    });

    return Object.values(locationData).sort(
      (a, b) => b.swapCount - a.swapCount
    );
  }, [swapTransactions, colorBy]);

  // Calculate map center and zoom
  const mapCenter = useMemo(() => {
    if (stationLocations.length === 0) {
      return { lat: 7.8731, lng: 80.7718 };
    }
    const avgLat =
      stationLocations.reduce((sum, s) => sum + s.lat, 0) /
      stationLocations.length;
    const avgLng =
      stationLocations.reduce((sum, s) => sum + s.lng, 0) /
      stationLocations.length;
    return { lat: avgLat, lng: avgLng };
  }, [stationLocations]);

  const calculateZoom = () => {
    if (stationLocations.length === 0) return 8;
    const lats = stationLocations.map((s) => s.lat);
    const lngs = stationLocations.map((s) => s.lng);
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const maxSpread = Math.max(latSpread, lngSpread);

    if (maxSpread > 4) return 7;
    if (maxSpread > 2) return 8;
    if (maxSpread > 1) return 9;
    if (maxSpread > 0.5) return 10;
    if (maxSpread > 0.2) return 11;
    return 12;
  };

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Create popup content
  const createPopupContent = (station: StationLocation) => {
    const palette = (colorPalettes[colorBy] ||
      colorPalettes.swapCount) as Record<string, string>;
    const color = palette[station.category] || "#6B7280";

    return `
      <div style="color: white; font-family: system-ui, sans-serif; min-width: 250px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">
          <div style="font-weight: 600; font-size: 16px;">${
            station.stationName
          }</div>
          <div style="background: ${color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase;">
            ${station.category}
          </div>
        </div>
        <div style="font-size: 13px; line-height: 1.5;">
          <div style="margin-bottom: 6px;">
            <span style="color: #94a3b8;">Location:</span>
            <span style="font-weight: 500; margin-left: 8px;">${
              station.locationName
            }</span>
          </div>
          <div style="margin-bottom: 6px;">
            <span style="color: #94a3b8;">Swap Count:</span>
            <span style="font-weight: 500; margin-left: 8px;">${
              station.swapCount
            }</span>
          </div>
          <div style="margin-bottom: 6px;">
            <span style="color: #94a3b8;">Total Revenue:</span>
            <span style="font-weight: 500; margin-left: 8px;">${formatCurrency(
              station.totalRevenue
            )}</span>
          </div>
          <div style="margin-bottom: 6px;">
            <span style="color: #94a3b8;">Avg Cost:</span>
            <span style="font-weight: 500; margin-left: 8px;">${formatCurrency(
              station.avgAmount
            )}</span>
          </div>
          <div style="margin-bottom: 6px;">
            <span style="color: #94a3b8;">Success Rate:</span>
            <span style="font-weight: 500; margin-left: 8px;">${station.successRate.toFixed(
              1
            )}%</span>
          </div>
          <div style="margin-bottom: 6px;">
            <span style="color: #94a3b8;">Battery OUT:</span>
            <span style="font-weight: 500; margin-left: 8px; color: #fb923c;">${station.avgBatteryOutPercent.toFixed(
              1
            )}%</span>
          </div>
          <div style="margin-bottom: 6px;">
            <span style="color: #94a3b8;">Battery IN:</span>
            <span style="font-weight: 500; margin-left: 8px; color: #34d399;">${station.avgBatteryInPercent.toFixed(
              1
            )}%</span>
          </div>
          <div style="margin-bottom: 6px;">
            <span style="color: #94a3b8;">Health Gain:</span>
            <span style="font-weight: 500; margin-left: 8px; color: #06d6a0;">+${station.healthGain.toFixed(
              1
            )}%</span>
          </div>
        </div>
      </div>
    `;
  };

  // Initialize and update map
  useEffect(() => {
    if (!leaflet || !mapRef.current || stationLocations.length === 0) return;

    const L = leaflet.default || leaflet;

    // Initialize map
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
      });

      // Add custom styles
      const style = document.createElement("style");
      style.innerHTML = `
        .simple-marker {
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .simple-marker:hover {
          transform: scale(1.4);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
          border-width: 3px;
          z-index: 1000 !important;
        }
        
        .custom-popup {
          background-color: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(100, 116, 139, 0.5);
          border-radius: 12px;
          color: white;
          font-family: system-ui, sans-serif;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background-color: transparent;
          border: none;
          box-shadow: none;
          border-radius: 12px;
          padding: 16px;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
          color: white;
        }
        .custom-popup .leaflet-popup-tip {
          background-color: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(100, 116, 139, 0.5);
        }
        .custom-popup a.leaflet-popup-close-button {
          color: rgba(255, 255, 255, 0.7);
          font-size: 18px;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .custom-popup a.leaflet-popup-close-button:hover {
          color: white;
          background-color: rgba(255, 255, 255, 0.1);
        }
      `;
      document.head.appendChild(style);
    }

    // Set view
    mapInstance.current.setView(
      [mapCenter.lat, mapCenter.lng],
      calculateZoom()
    );

    // Remove existing layers
    mapInstance.current.eachLayer((layer: any) => {
      mapInstance.current.removeLayer(layer);
    });

    // Add tile layer
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "© OpenStreetMap contributors © CARTO",
        maxZoom: 19,
        subdomains: "abcd",
      }
    ).addTo(mapInstance.current);

    // Add markers
    stationLocations.forEach((station) => {
      const palette = (colorPalettes[colorBy] ||
        colorPalettes.swapCount) as Record<string, string>;
      const color = palette[station.category] || "#6B7280";
      const transparentColor = hexToRgba(color, 0.2);

      const baseSize = 12;
      const iconHtml = `
        <div
          class="simple-marker"
          style="
            width: ${baseSize}px;
            height: ${baseSize}px;
            background-color: ${transparentColor};
            border: 2px solid ${color};
          "
        ></div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: [baseSize, baseSize],
        iconAnchor: [baseSize / 2, baseSize / 2],
      });

      const marker = L.marker([station.lat, station.lng], { icon })
        .addTo(mapInstance.current)
        .on("click", () => {
          setSelectedStation(`${station.locationName}-${station.stationName}`);
        });

      marker.bindPopup(createPopupContent(station), {
        className: "custom-popup",
        closeButton: true,
        maxWidth: 300,
      });
    });

    setIsLoading(false);
  }, [leaflet, stationLocations, colorBy, mapCenter]);

  if (stationLocations.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-cyan-500" />
            Station Location Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-96 text-slate-400">
            <MapPin className="h-16 w-16 mb-4 opacity-50" />
            <p>No location data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-cyan-500" />
                Battery Swap Station Coverage Map
              </CardTitle>
              <p className="text-slate-400 text-sm mt-2">
                Geographic distribution of {stationLocations.length} swap
                stations across Sri Lanka
              </p>
            </div>

            {/* Color By Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Color by:</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setColorBy("swapCount")}
                  className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 transition-colors ${
                    colorBy === "swapCount"
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Activity className="h-3 w-3" />
                  Traffic
                </button>
                <button
                  onClick={() => setColorBy("revenue")}
                  className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 transition-colors ${
                    colorBy === "revenue"
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <DollarSign className="h-3 w-3" />
                  Revenue
                </button>
                <button
                  onClick={() => setColorBy("batteryHealth")}
                  className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 transition-colors ${
                    colorBy === "batteryHealth"
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Battery className="h-3 w-3" />
                  Health
                </button>
                <button
                  onClick={() => setColorBy("successRate")}
                  className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 transition-colors ${
                    colorBy === "successRate"
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <TrendingUp className="h-3 w-3" />
                  Success
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative h-[600px] w-full bg-slate-950 rounded-b-lg overflow-hidden">
            {/* Map Badge */}
            <div className="absolute top-3 left-3 z-[999]">
              <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs font-medium">
                Carto Dark Matter | {stationLocations.length} stations
              </div>
            </div>

            {/* Color Legend */}
            <div className="absolute top-3 right-3 z-[999] max-w-xs">
              <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 p-3 rounded-md text-xs">
                <div className="font-medium mb-2 text-cyan-400">
                  {colorBy === "swapCount"
                    ? "Traffic Level"
                    : colorBy === "revenue"
                    ? "Revenue Tier"
                    : colorBy === "batteryHealth"
                    ? "Battery Health"
                    : "Success Rate"}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {colorPalettes[colorBy] &&
                    Object.entries(
                      colorPalettes[colorBy] as Record<string, string>
                    ).map(([category, color]) => (
                      <div key={category} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border border-white/30"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs">{category}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-[1001]">
                <div className="flex flex-col items-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm">Loading map...</p>
                </div>
              </div>
            )}

            {/* Map Container */}
            <div ref={mapRef} className="h-full w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Station Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stationLocations.map((station, index) => {
          const isSelected =
            selectedStation ===
            `${station.locationName}-${station.stationName}`;

          return (
            <Card
              key={index}
              className={`cursor-pointer transition-all duration-300 ${
                isSelected
                  ? "bg-slate-800 border-cyan-500 ring-2 ring-cyan-500"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
              onClick={() =>
                setSelectedStation(
                  `${station.locationName}-${station.stationName}`
                )
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? "bg-cyan-600" : "bg-emerald-600"
                      }`}
                    >
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 text-sm">
                        {station.stationName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {station.locationName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">
                      {station.swapCount}
                    </div>
                    <div className="text-xs text-slate-400">swaps</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Total Revenue</span>
                    <span className="text-slate-200 font-semibold">
                      {formatCurrency(station.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Avg Cost</span>
                    <span className="text-slate-200">
                      {formatCurrency(station.avgAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Success Rate</span>
                    <span
                      className={`font-semibold ${
                        station.successRate >= 95
                          ? "text-emerald-400"
                          : station.successRate >= 85
                          ? "text-cyan-400"
                          : station.successRate >= 75
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {station.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-slate-500">OUT</div>
                        <div className="text-orange-400 font-semibold">
                          {station.avgBatteryOutPercent.toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Gain</div>
                        <div
                          className={`font-semibold ${
                            station.healthGain >= 20
                              ? "text-emerald-400"
                              : station.healthGain >= 10
                              ? "text-cyan-400"
                              : station.healthGain >= 0
                              ? "text-amber-400"
                              : "text-red-400"
                          }`}
                        >
                          +{station.healthGain.toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">IN</div>
                        <div className="text-emerald-400 font-semibold">
                          {station.avgBatteryInPercent.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Badge */}
                <div className="mt-3 pt-3 border-t border-slate-800">
                  {colorPalettes[colorBy] && (
                    <div
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: `${
                          (
                            (colorPalettes[colorBy] ||
                              colorPalettes.swapCount) as Record<string, string>
                          )[station.category] || "#6B7280"
                        }20`,
                        color:
                          (
                            (colorPalettes[colorBy] ||
                              colorPalettes.swapCount) as Record<string, string>
                          )[station.category] || "#6B7280",
                      }}
                    >
                      {station.category}
                    </div>
                  )}
                  {index < 3 && (
                    <span className="ml-2 text-xs text-slate-500">
                      🏆 Top #{index + 1}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-lg">
            Network Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-3xl font-bold text-cyan-400">
                {stationLocations.length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Total Stations</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-3xl font-bold text-emerald-400">
                {swapTransactions.length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Total Swaps</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-3xl font-bold text-purple-400">
                {formatCurrency(
                  stationLocations.reduce((sum, s) => sum + s.totalRevenue, 0)
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1">Total Revenue</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-3xl font-bold text-amber-400">
                {(
                  stationLocations.reduce((sum, s) => sum + s.successRate, 0) /
                  stationLocations.length
                ).toFixed(1)}
                %
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Avg Success Rate
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
