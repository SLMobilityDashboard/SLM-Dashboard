"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GPSPoint {
  id: string;
  lat: number;
  lng: number;
  timestamp: string;
  scooterId: string;
  area: string;
  tbox: string;
  bms: string;
  battery_type: string;
  distance?: number;
}

type ColorBy = "tbox" | "bms" | "battery_type";
type MapType = "street" | "satellite" | "dark" | "light";

interface MapProvider {
  label: string;
  url: string;
  attribution: string;
  maxZoom?: number;
}

const mapProviders: Record<MapType, MapProvider> = {
  street: {
    label: "Street Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxZoom: 17,
  },

  dark: {
    label: "Dark Mode",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
  light: {
    label: "Light Mode",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
};

const getColorPalette = (keys: string[]): Record<string, string> => {
  const palette = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#0ea5e9",
    "#22c55e",
    "#eab308",
    "#f97316",
    "#a855f7",
  ];
  const map: Record<string, string> = {};
  keys.forEach((key, i) => {
    map[key] = palette[i % palette.length];
  });
  return map;
};

const GPSMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [colorBy, setColorBy] = useState<ColorBy>("tbox");
  const [mapType, setMapType] = useState<MapType>("street");

  const gpsPoints: GPSPoint[] = [
    {
      id: "1",
      lat: 6.9271,
      lng: 79.8612,
      timestamp: "2024-07-28T10:00:00Z",
      scooterId: "A001",
      area: "Colombo",
      distance: 850,
      tbox: "T1",
      bms: "B1",
      battery_type: "Lithium",
    },
    {
      id: "2",
      lat: 7.2906,
      lng: 80.6337,
      timestamp: "2024-07-28T10:30:00Z",
      scooterId: "B002",
      area: "Kandy",
      distance: 690,
      tbox: "T2",
      bms: "B2",
      battery_type: "Lead",
    },
    {
      id: "3",
      lat: 6.0535,
      lng: 80.221,
      timestamp: "2024-07-28T11:00:00Z",
      scooterId: "C003",
      area: "Galle",
      distance: 580,
      tbox: "T1",
      bms: "B1",
      battery_type: "Lithium",
    },
    {
      id: "4",
      lat: 9.6615,
      lng: 80.0255,
      timestamp: "2024-07-28T11:15:00Z",
      scooterId: "D004",
      area: "Jaffna",
      distance: 520,
      tbox: "T3",
      bms: "B3",
      battery_type: "NiMH",
    },
    {
      id: "5",
      lat: 7.2084,
      lng: 79.838,
      timestamp: "2024-07-28T11:30:00Z",
      scooterId: "E005",
      area: "Negombo",
      distance: 480,
      tbox: "T2",
      bms: "B2",
      battery_type: "Lead",
    },
    {
      id: "6",
      lat: 6.7153,
      lng: 80.3846,
      timestamp: "2024-07-28T12:00:00Z",
      scooterId: "F006",
      area: "Ratnapura",
      distance: 420,
      tbox: "T1",
      bms: "B1",
      battery_type: "Lithium",
    },
    {
      id: "7",
      lat: 7.471,
      lng: 80.3604,
      timestamp: "2024-07-28T12:30:00Z",
      scooterId: "G007",
      area: "Kurunegala",
      distance: 380,
      tbox: "T4",
      bms: "B4",
      battery_type: "NiMH",
    },
    {
      id: "8",
      lat: 6.7056,
      lng: 80.3847,
      timestamp: "2024-07-28T13:00:00Z",
      scooterId: "H008",
      area: "Balangoda",
      distance: 350,
      tbox: "T3",
      bms: "B3",
      battery_type: "Lead",
    },
    {
      id: "9",
      lat: 6.0325,
      lng: 80.2168,
      timestamp: "2024-07-28T13:30:00Z",
      scooterId: "I009",
      area: "Hikkaduwa",
      distance: 320,
      tbox: "T2",
      bms: "B2",
      battery_type: "Lithium",
    },
    {
      id: "10",
      lat: 6.9895,
      lng: 79.8833,
      timestamp: "2024-07-28T14:00:00Z",
      scooterId: "J010",
      area: "Colombo",
      distance: 300,
      tbox: "T1",
      bms: "B1",
      battery_type: "Lithium",
    },
    {
      id: "11",
      lat: 6.848,
      lng: 79.9265,
      timestamp: "2024-07-28T14:30:00Z",
      scooterId: "K011",
      area: "Dehiwala",
      distance: 280,
      tbox: "T5",
      bms: "B5",
      battery_type: "Lead",
    },
    {
      id: "12",
      lat: 6.8219,
      lng: 80.0415,
      timestamp: "2024-07-28T15:00:00Z",
      scooterId: "L012",
      area: "Kaduwela",
      distance: 250,
      tbox: "T4",
      bms: "B4",
      battery_type: "NiMH",
    },
    {
      id: "13",
      lat: 6.9271,
      lng: 79.8612,
      timestamp: "2024-07-28T15:30:00Z",
      scooterId: "M013",
      area: "Colombo",
      distance: 230,
      tbox: "T1",
      bms: "B1",
      battery_type: "Lithium",
    },
    {
      id: "14",
      lat: 6.8769,
      lng: 79.8617,
      timestamp: "2024-07-28T16:00:00Z",
      scooterId: "N014",
      area: "Nugegoda",
      distance: 210,
      tbox: "T3",
      bms: "B3",
      battery_type: "Lead",
    },
    {
      id: "15",
      lat: 6.8947,
      lng: 79.9026,
      timestamp: "2024-07-28T16:30:00Z",
      scooterId: "O015",
      area: "Maharagama",
      distance: 190,
      tbox: "T2",
      bms: "B2",
      battery_type: "Lithium",
    },
    {
      id: "16",
      lat: 7.2964,
      lng: 80.635,
      timestamp: "2024-07-28T17:00:00Z",
      scooterId: "P016",
      area: "Kandy",
      distance: 170,
      tbox: "T5",
      bms: "B5",
      battery_type: "NiMH",
    },
    {
      id: "17",
      lat: 6.7153,
      lng: 80.3846,
      timestamp: "2024-07-28T17:30:00Z",
      scooterId: "Q017",
      area: "Ratnapura",
      distance: 150,
      tbox: "T1",
      bms: "B1",
      battery_type: "Lithium",
    },
    {
      id: "18",
      lat: 6.0535,
      lng: 80.221,
      timestamp: "2024-07-28T18:00:00Z",
      scooterId: "R018",
      area: "Galle",
      distance: 130,
      tbox: "T4",
      bms: "B4",
      battery_type: "Lead",
    },
    {
      id: "19",
      lat: 7.2084,
      lng: 79.838,
      timestamp: "2024-07-28T18:30:00Z",
      scooterId: "S019",
      area: "Negombo",
      distance: 110,
      tbox: "T3",
      bms: "B3",
      battery_type: "NiMH",
    },
    {
      id: "20",
      lat: 6.8219,
      lng: 80.0415,
      timestamp: "2024-07-28T19:00:00Z",
      scooterId: "T020",
      area: "Kaduwela",
      distance: 90,
      tbox: "T2",
      bms: "B2",
      battery_type: "Lithium",
    },
  ];

  const displayData = gpsPoints;
  const getColorKey = (point: GPSPoint) => point[colorBy];
  const uniqueKeys = Array.from(new Set(displayData.map(getColorKey)));
  const colorMap = getColorPalette(uniqueKeys);

  // Load Leaflet library
  useEffect(() => {
    const loadLeaflet = async () => {
      if (typeof window === "undefined") return;

      try {
        // Check if Leaflet is already loaded
        if ((window as any).L) {
          setLeafletLoaded(true);
          return;
        }

        // Load CSS first
        const leafletCss = document.createElement("link");
        leafletCss.rel = "stylesheet";
        leafletCss.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(leafletCss);

        // Load JavaScript
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => {
            setLeafletLoaded(true);
            resolve();
          };
          script.onerror = () => reject(new Error("Failed to load Leaflet"));
          document.head.appendChild(script);
        });
      } catch (error) {
        console.error("Error loading Leaflet:", error);
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    const initializeMap = () => {
      try {
        const L = (window as any).L;
        if (!L) {
          console.error("Leaflet not available");
          return;
        }

        const map = L.map(mapRef.current).setView([7.9, 80.7], 7);

        const provider = mapProviders[mapType];
        const tileLayer = L.tileLayer(provider.url, {
          attribution: provider.attribution,
          maxZoom: provider.maxZoom || 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        tileLayerRef.current = tileLayer;
        setMapLoaded(true);
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          console.error("Error removing map:", error);
        }
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Update map type
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current || !leafletLoaded)
      return;

    try {
      const L = (window as any).L;
      const map = mapInstanceRef.current;

      // Remove current tile layer
      map.removeLayer(tileLayerRef.current);

      // Add new tile layer
      const provider = mapProviders[mapType];
      const newTileLayer = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom || 19,
      }).addTo(map);

      tileLayerRef.current = newTileLayer;
    } catch (error) {
      console.error("Error changing map type:", error);
    }
  }, [mapType, leafletLoaded]);

  // Update markers when color scheme changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || !leafletLoaded) return;
    addMarkers();
  }, [colorBy, mapLoaded, leafletLoaded]);

  const clearMarkers = () => {
    markersRef.current.forEach((marker) => {
      try {
        if (mapInstanceRef.current && marker) {
          mapInstanceRef.current.removeLayer(marker);
        }
      } catch (error) {
        console.error("Error removing marker:", error);
      }
    });
    markersRef.current = [];
  };

  const addMarkers = () => {
    if (!mapInstanceRef.current || !leafletLoaded) {
      console.error("Map or Leaflet not ready");
      return;
    }

    const L = (window as any).L;
    const map = mapInstanceRef.current;

    if (!L || !map) {
      console.error("Leaflet or map not available");
      return;
    }

    try {
      // Clear existing markers
      clearMarkers();

      const bounds = L.latLngBounds([]);

      displayData.forEach((point) => {
        const key = getColorKey(point);
        const color = colorMap[key] || "#6b7280";

        // Validate coordinates
        if (
          typeof point.lat !== "number" ||
          typeof point.lng !== "number" ||
          isNaN(point.lat) ||
          isNaN(point.lng)
        ) {
          console.warn("Invalid coordinates for point:", point);
          return;
        }

        try {
          const marker = L.circleMarker([point.lat, point.lng], {
            radius: 8,
            fillColor: color,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          });

          const popupContent = `
            <div class="p-2">
              <div class="font-semibold text-sm mb-1">Scooter ${
                point.scooterId
              }</div>
              <div class="text-xs space-y-1">
                <div><span class="font-medium">Area:</span> ${point.area}</div>
                <div><span class="font-medium">${
                  colorBy.charAt(0).toUpperCase() + colorBy.slice(1)
                }:</span> ${key}</div>
                <div><span class="font-medium">Distance:</span> ${
                  point.distance ?? "N/A"
                } km</div>
                <div><span class="font-medium">Timestamp:</span> ${new Date(
                  point.timestamp
                ).toLocaleString()}</div>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.addTo(map);
          markersRef.current.push(marker);
          bounds.extend([point.lat, point.lng]);
        } catch (markerError) {
          console.error("Error creating marker for point:", point, markerError);
        }
      });

      if (displayData.length > 0 && bounds.isValid()) {
        try {
          map.fitBounds(bounds, { padding: [20, 20] });
        } catch (boundsError) {
          console.error("Error fitting bounds:", boundsError);
        }
      }
    } catch (error) {
      console.error("Error adding markers:", error);
    }
  };

  if (!leafletLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GPS Map</CardTitle>
          <CardDescription>Loading map resources...</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full h-96 rounded-b-lg overflow-hidden flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Loading Leaflet...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GPS Points</CardTitle>
        <CardDescription>
          Visualize scooter locations colored by {colorBy.replace("_", " ")}.
        </CardDescription>

        {/* Control Panel */}
        <div className="flex flex-col sm:flex-row gap-4 py-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Color by:
            </label>
            <Select
              value={colorBy}
              onValueChange={(value: ColorBy) => setColorBy(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="tbox">T-Box</SelectItem>
                <SelectItem value="bms">BMS</SelectItem>
                <SelectItem value="battery_type">Battery Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Map type:
            </label>
            <Select
              value={mapType}
              onValueChange={(value: MapType) => setMapType(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="street">Street Map</SelectItem>
                <SelectItem value="satellite">Satellite</SelectItem>
                <SelectItem value="dark">Dark Mode</SelectItem>
                <SelectItem value="light">Light Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <div className="text-xs font-medium text-muted-foreground mb-1 w-full">
            Legend ({uniqueKeys.length} {colorBy.replace("_", " ")} categories):
          </div>
          {Object.entries(colorMap).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground">{key}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0 relative">
        <div className="relative z-10">
          <div
            ref={mapRef}
            className="w-full h-[500px] rounded-b-lg overflow-hidden relative z-10"
            style={{ zIndex: 1 }}
          />
          {!mapLoaded && leafletLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">
                  Initializing map...
                </p>
              </div>
            </div>
          )}

          {/* Map Stats Overlay */}
          <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
            <div className="text-xs space-y-1">
              <div className="font-semibold">Map Statistics</div>
              <div className="text-muted-foreground">
                <div>Total Scooters: {displayData.length}</div>
                <div>Active Areas: {uniqueKeys.length}</div>
                <div>Map Type: {mapProviders[mapType].label}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GPSMap;
