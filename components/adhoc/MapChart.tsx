"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Layers, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface MapChartProps {
  data: any[];
  config: any;
}

export default function MapChart({ data, config }: MapChartProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leaflet, setLeaflet] = useState<any>(null);
  const [zoom, setZoom] = useState(6);

  // Load Leaflet dynamically
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

  // Initialize map
  useEffect(() => {
    if (!leaflet || !mapRef.current || !data.length) return;

    const L = leaflet.default || leaflet;

    const initMap = () => {
      try {
        if (!mapInstance.current) {
          // Calculate center from data
          const avgLat =
            data.reduce((sum, point) => sum + (point.latitude || 0), 0) /
            data.length;
          const avgLng =
            data.reduce((sum, point) => sum + (point.longitude || 0), 0) /
            data.length;

          // Initialize map with OpenStreetMap tiles
          mapInstance.current = L.map(mapRef.current, {
            center: [avgLat || 0, avgLng || 0],
            zoom: zoom,
            zoomControl: false,
          });

          // Add OpenStreetMap tile layer (no API key needed)
          L.tileLayer(
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              attribution: "© OpenStreetMap contributors",
              subdomains: "abcd",
              maxZoom: 19,
            }
          ).addTo(mapInstance.current);

          // Custom marker style
          const createCustomIcon = (point: any) => {
            const value = point.value || 50;
            const category = point.category || "default";

            // Color based on category or value
            let color = "#06B6D4"; // default cyan
            if (category === "high" || value > 75) color = "#10B981"; // green
            else if (category === "medium" || (value > 25 && value <= 75))
              color = "#F59E0B"; // yellow
            else if (category === "low" || value <= 25) color = "#EF4444"; // red

            // Size based on value or default
            const size = Math.max(20, Math.min(50, (value / 100) * 50));

            return L.divIcon({
              className: "custom-marker",
              html: `
                <div style="
                  width: ${size}px;
                  height: ${size}px;
                  background-color: ${color};
                  border: 3px solid rgba(255, 255, 255, 0.8);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: ${Math.max(8, size / 4)}px;
                  box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
                  position: relative;
                  z-index: 1000;
                ">
                  ${Math.round(value)}
                </div>
                ${
                  point.ping_speed
                    ? `
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: ${size * 2}px;
                  height: ${size * 2}px;
                  border: 2px solid ${color};
                  border-radius: 50%;
                  opacity: 0.6;
                  animation: ping ${Math.max(
                    1,
                    3 - point.ping_speed / 100
                  )}s infinite;
                  pointer-events: none;
                ">
                </div>
                <style>
                  @keyframes ping {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
                    75%, 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
                  }
                </style>
                `
                    : ""
                }
              `,
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            });
          };

          // Add markers
          data.forEach((point, index) => {
            if (!point.latitude || !point.longitude) return;

            const marker = L.marker([point.latitude, point.longitude], {
              icon: createCustomIcon(point),
            }).addTo(mapInstance.current);

            // Custom popup
            const popupContent = `
              <div style="color: white; font-family: system-ui, sans-serif; min-width: 200px;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #06B6D4;">
                  ${point.name || `Point ${index + 1}`}
                </div>
                <div style="font-size: 12px; line-height: 1.4;">
                  <div style="margin-bottom: 4px;">
                    <span style="color: #94A3B8;">Coordinates:</span>
                    <span style="margin-left: 8px; font-weight: 500;">${point.latitude.toFixed(
                      4
                    )}, ${point.longitude.toFixed(4)}</span>
                  </div>
                  <div style="margin-bottom: 4px;">
                    <span style="color: #94A3B8;">Value:</span>
                    <span style="margin-left: 8px; font-weight: 500;">${
                      point.value?.toLocaleString() || "N/A"
                    }</span>
                  </div>
                  ${
                    point.category
                      ? `
                  <div style="margin-bottom: 4px;">
                    <span style="color: #94A3B8;">Category:</span>
                    <span style="margin-left: 8px; font-weight: 500;">${point.category}</span>
                  </div>
                  `
                      : ""
                  }
                  ${
                    point.ping_speed
                      ? `
                  <div style="margin-bottom: 4px;">
                    <span style="color: #94A3B8;">Ping Speed:</span>
                    <span style="margin-left: 8px; font-weight: 500;">${point.ping_speed.toFixed(
                      1
                    )}ms</span>
                  </div>
                  `
                      : ""
                  }
                </div>
              </div>
            `;

            marker.bindPopup(popupContent, {
              className: "custom-popup",
              maxWidth: 300,
              closeButton: true,
            });
          });

          // Add custom CSS for popups
          const style = document.createElement("style");
          style.innerHTML = `
            .custom-popup .leaflet-popup-content-wrapper {
              background-color: rgba(15, 23, 42, 0.95);
              border: 1px solid rgba(100, 116, 139, 0.5);
              border-radius: 8px;
              color: white;
              backdrop-filter: blur(8px);
            }
            .custom-popup .leaflet-popup-tip {
              background-color: rgba(15, 23, 42, 0.95);
              border: 1px solid rgba(100, 116, 139, 0.5);
            }
            .custom-popup .leaflet-popup-close-button {
              color: rgba(255, 255, 255, 0.7);
              font-size: 18px;
            }
            .custom-popup .leaflet-popup-close-button:hover {
              color: white;
              background-color: rgba(255, 255, 255, 0.1);
              border-radius: 4px;
            }
          `;
          document.head.appendChild(style);

          // Fit bounds to show all markers
          if (data.length > 0) {
            const group = new L.featureGroup(
              data
                .filter((point) => point.latitude && point.longitude)
                .map((point) => L.marker([point.latitude, point.longitude]))
            );
            if (group.getLayers().length > 0) {
              mapInstance.current.fitBounds(group.getBounds().pad(0.1));
            }
          }

          // Update zoom state when map zoom changes
          mapInstance.current.on("zoomend", () => {
            setZoom(mapInstance.current.getZoom());
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing map:", error);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [leaflet, data, zoom]);

  const handleZoomIn = () => {
    if (mapInstance.current) {
      mapInstance.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstance.current) {
      mapInstance.current.zoomOut();
    }
  };

  const handleReset = () => {
    if (mapInstance.current && data.length > 0) {
      const validData = data.filter(
        (point) => point.latitude && point.longitude
      );
      if (validData.length > 0) {
        const group = new (leaflet.default || leaflet).featureGroup(
          validData.map((point) =>
            (leaflet.default || leaflet).marker([
              point.latitude,
              point.longitude,
            ])
          )
        );
        mapInstance.current.fitBounds(group.getBounds().pad(0.1));
      }
    }
  };

  return (
    <div className="relative h-[400px] w-full">
      {/* Map Container */}
      <div ref={mapRef} className="h-full w-full rounded-lg overflow-hidden" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
            <p className="text-slate-300 text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <Button
          size="sm"
          variant="outline"
          className="bg-slate-800/90 border-slate-600 text-white hover:bg-slate-700"
          onClick={handleZoomIn}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-slate-800/90 border-slate-600 text-white hover:bg-slate-700"
          onClick={handleZoomOut}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-slate-800/90 border-slate-600 text-white hover:bg-slate-700"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Map Info */}
      <div className="absolute top-4 left-4 z-[1000]">
        <Card className="bg-slate-800/90 border-slate-600">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-cyan-400" />
              <span className="text-white font-medium">Interactive Map</span>
              <Badge
                variant="outline"
                className="text-xs text-slate-300 border-slate-600"
              >
                Zoom: {zoom}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      {config.showLegend && (
        <div className="absolute bottom-4 left-4 z-[1000]">
          <Card className="bg-slate-800/90 border-slate-600">
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Layers className="h-3 w-3 text-cyan-400" />
                  <span className="text-white font-medium">Legend</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-slate-300">High Value (75+)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-slate-300">Medium Value (25-75)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-slate-300">Low Value (0-25)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Stats */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <Card className="bg-slate-800/90 border-slate-600">
          <CardContent className="p-3">
            <div className="text-xs text-slate-300">
              <div className="font-medium text-white mb-1">Data Points</div>
              <div>
                {data.filter((d) => d.latitude && d.longitude).length} locations
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
