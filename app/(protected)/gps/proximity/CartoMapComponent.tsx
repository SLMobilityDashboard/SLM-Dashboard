"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Type definitions
export interface MapMarker {
  position: [number, number];
  popup?: string;
  icon?: "location" | "charging" | "scooter";
  color?: string;
}

export interface MapRoute {
  path: [number, number][];
  color?: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
}

export interface MapCluster {
  center: [number, number];
  radius: number;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

export interface CoveragePolygon {
  coordinates: [number, number][];
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  weight?: number;
  opacity?: number;
  dashArray?: string;
  popup?: string;
}

export interface CartoMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routes?: MapRoute[];
  clusters?: MapCluster[];
  coveragePolygons?: CoveragePolygon[];
  eps?: number;
  clusterSeparation?: number;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

// Memoized CartoMapComponent to prevent unnecessary re-renders
const CartoMapComponent = React.memo<CartoMapProps>(
  ({
    center = [7.8731, 80.7718],
    zoom = 7,
    markers = [],
    routes = [],
    clusters = [],
    coveragePolygons = [],
    eps = 0,
    clusterSeparation = 0,
    height = "500px",
    onMapClick,
    interactive = true,
  }) => {
    const mapRef = React.useRef<HTMLDivElement>(null);
    const mapInstance = React.useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [leaflet, setLeaflet] = useState<any>(null);

    React.useEffect(() => {
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

    const getIconSVG = useCallback((icon: MapMarker["icon"]) => {
      switch (icon) {
        case "location":
          return `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>`;
        case "charging":
          return `<path d="M7 2v11m3-9 4 14m3-11v11"></path>`;
        case "scooter":
          return `<circle cx="12" cy="12" r="10"/>`;
        default:
          return `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>`;
      }
    }, []);

    React.useEffect(() => {
      if (!leaflet || !mapRef.current) return;

      const L = leaflet.default || leaflet;

      const initMap = () => {
        try {
          if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current, {
              zoomControl: interactive,
              dragging: interactive,
              scrollWheelZoom: interactive,
            }).setView(center, zoom);

            L.tileLayer(
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              {
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                subdomains: "abcd",
                maxZoom: 19,
              }
            ).addTo(mapInstance.current);

            if (onMapClick) {
              mapInstance.current.on("click", (e: any) => {
                onMapClick(e.latlng.lat, e.latlng.lng);
              });
            }
          } else {
            mapInstance.current.setView(center, zoom);
          }

          // Remove old layers except tile layer
          mapInstance.current.eachLayer((layer: any) => {
            if (
              layer instanceof L.Marker ||
              layer instanceof L.Polyline ||
              layer instanceof L.Circle ||
              layer instanceof L.Polygon
            ) {
              mapInstance.current.removeLayer(layer);
            }
          });

          // Add coverage polygons FIRST (so they appear behind other elements)
          coveragePolygons.forEach((polygon) => {
            const {
              coordinates,
              color = "#3b82f6",
              fillColor = "#3b82f6",
              fillOpacity = 0.15,
              weight = 2,
              opacity = 0.7,
              dashArray = "",
              popup = "",
            } = polygon;

            if (coordinates && coordinates.length > 0) {
              const leafletPolygon = L.polygon(coordinates, {
                color,
                fillColor,
                fillOpacity,
                weight,
                opacity,
                dashArray,
              }).addTo(mapInstance.current);

              if (popup) {
                leafletPolygon.bindPopup(popup);
              }
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

            const customIcon = L.divIcon({
              className: "custom-marker-icon",
              html: `
              <div style="width: 30px; height: 30px; background-color: ${color}; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 0 10px rgba(0, 0, 0, 0.5); border: 2px solid white;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  ${getIconSVG(icon)}
                </svg>
              </div>
            `,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            });

            const markerInstance = L.marker(position, {
              icon: customIcon,
            }).addTo(mapInstance.current);

            if (popup) {
              markerInstance.bindPopup(popup, { className: "custom-popup" });
            }

            // Draw eps radius circle (in blue) - OPTIONAL, usually not needed with polygons
            if (eps > 0) {
              L.circle(position, {
                radius: eps * 1000,
                color: "#06b6d4",
                fillColor: "#06b6d4",
                fillOpacity: 0.05,
                weight: 1,
                dashArray: "4, 4",
              }).addTo(mapInstance.current);
            }
          });

          // Draw routes
          routes.forEach((route) => {
            const {
              path,
              color = "#06b6d4",
              weight = 3,
              opacity = 0.7,
              dashArray = "",
            } = route;
            L.polyline(path, { color, weight, opacity, dashArray }).addTo(
              mapInstance.current
            );
          });

          // Draw clusters (usually not needed when showing coverage polygons)
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
      coveragePolygons,
      eps,
      clusterSeparation,
      onMapClick,
      interactive,
      getIconSVG,
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
);

CartoMapComponent.displayName = "CartoMapComponent";

export default CartoMapComponent;
