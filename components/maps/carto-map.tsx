"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Define the props interface
interface CartoMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
    icon?: string;
    color?: string;
  }>;
  routes?: Array<{
    path: Array<[number, number]>;
    color?: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
  }>;
  clusters?: Array<{
    center: [number, number];
    radius: number;
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
  }>;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

// Create a fallback component
function MapFallback({ height = "500px" }: { height?: string }) {
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        <div style={{ height, position: "relative" }}>
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
              <p className="mt-2 text-sm text-slate-300">Loading map...</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Create the actual map component that will be dynamically loaded
function CartoMapComponent({
  center = [7.8731, 80.7718],
  zoom = 7,
  markers = [],
  routes = [],
  clusters = [],
  height = "500px",
  onMapClick,
  interactive = true,
}: CartoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leaflet, setLeaflet] = useState<any>(null);

  useEffect(() => {
    // Import Leaflet only on client side
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

  useEffect(() => {
    if (!leaflet || !mapRef.current) return;

    const L = leaflet.default || leaflet;

    const initMap = () => {
      try {
        // Initialize map if it doesn't exist
        if (!mapInstance.current) {
          // Create map with dark style
          mapInstance.current = L.map(mapRef.current, {
            zoomControl: interactive,
            dragging: interactive,
            scrollWheelZoom: interactive,
          }).setView(center, zoom);

          // Add Carto DarkMatter tile layer
          L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            {
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
              subdomains: "abcd",
              maxZoom: 19,
            }
          ).addTo(mapInstance.current);

          // Add click event handler if provided
          if (onMapClick) {
            mapInstance.current.on("click", (e: any) => {
              onMapClick(e.latlng.lat, e.latlng.lng);
            });
          }

          // Custom CSS for styling
          const style = document.createElement("style");
          style.innerHTML = `
            .custom-marker-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              border-radius: 50%;
              border: 2px solid rgba(255, 255, 255, 0.5);
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            }
            .custom-marker-pulse {
              animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
              0% { transform: scale(0.8); opacity: 1; }
              70% { transform: scale(1.5); opacity: 0.3; }
              100% { transform: scale(0.8); opacity: 1; }
            }
            .custom-popup {
              background-color: rgba(15, 23, 42, 0.9);
              border: 1px solid rgba(100, 116, 139, 0.5);
              border-radius: 4px;
              color: white;
              font-family: system-ui, sans-serif;
              padding: 8px 12px;
              font-size: 14px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            }
            .custom-popup .leaflet-popup-content-wrapper {
              background-color: transparent;
              border: none;
              box-shadow: none;
            }
            .custom-popup .leaflet-popup-content {
              margin: 0;
              color: white;
            }
            .custom-popup .leaflet-popup-tip {
              background-color: rgba(15, 23, 42, 0.9);
              border: 1px solid rgba(100, 116, 139, 0.5);
            }
            .custom-popup a.leaflet-popup-close-button {
              color: rgba(255, 255, 255, 0.7);
            }
            .custom-popup a.leaflet-popup-close-button:hover {
              color: white;
            }
          `;
          document.head.appendChild(style);
        } else {
          // Update map view if it already exists
          mapInstance.current.setView(center, zoom);
        }

        // Clear existing layers
        mapInstance.current.eachLayer((layer: any) => {
          if (
            layer instanceof L.Marker ||
            layer instanceof L.Polyline ||
            layer instanceof L.Circle
          ) {
            mapInstance.current.removeLayer(layer);
          }
        });

        // Add markers
        markers.forEach((marker) => {
          const {
            position,
            popup,
            icon = "location",
            color = "#06b6d4",
          } = marker;

          // Create custom icon
          const customIcon = L.divIcon({
            className: "custom-marker-icon",
            html: `
              <div style="width: 30px; height: 30px; background-color: ${color}; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  ${
                    icon === "location"
                      ? '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>'
                      : icon === "charging"
                      ? '<path d="M7 2v11m3-9 4 14m3-11v11"></path>'
                      : icon === "scooter"
                      ? '<circle cx="12" cy="12" r="10"/>'
                      : '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>'
                  }
                </svg>
              </div>
              <div class="custom-marker-pulse" style="position: absolute; top: -10px; left: -10px; width: 50px; height: 50px; background-color: ${color}; opacity: 0.3; border-radius: 50%;"></div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          // Create marker with custom icon
          const markerInstance = L.marker(position, { icon: customIcon }).addTo(
            mapInstance.current
          );

          // Add popup if provided
          if (popup) {
            markerInstance
              .bindPopup(popup, {
                className: "custom-popup",
              })
              .openPopup();
          }
        });

        // Add routes
        routes.forEach((route) => {
          const {
            path,
            color = "#06b6d4",
            weight = 3,
            opacity = 0.7,
            dashArray = "",
          } = route;

          L.polyline(path, {
            color,
            weight,
            opacity,
            dashArray,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(mapInstance.current);
        });

        // Add clusters
        clusters.forEach((cluster) => {
          const {
            center,
            radius,
            color = "#06b6d4",
            fillColor = "#06b6d4",
            fillOpacity = 0.2,
          } = cluster;

          L.circle(center, {
            radius,
            color,
            fillColor,
            fillOpacity,
            weight: 1,
          }).addTo(mapInstance.current);
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing map:", error);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      // Cleanup on component unmount
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [
    leaflet,
    center,
    zoom,
    markers,
    routes,
    clusters,
    onMapClick,
    interactive,
  ]);

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        <div style={{ height, position: "relative" }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
                <p className="mt-2 text-sm text-slate-300">Loading map...</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="h-full w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// Dynamically import the map component with SSR disabled
const DynamicCartoMap = dynamic(() => Promise.resolve(CartoMapComponent), {
  ssr: false,
  loading: MapFallback,
});

// Export the dynamic component as default
export default function CartoMap(props: CartoMapProps) {
  return <DynamicCartoMap {...props} />;
}
