"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

interface CartoMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
    icon?: string;
    color?: string;
    size?: "small" | "medium" | "large"; // NEW
    opacity?: number;                     // NEW: 0–1, default 1
    ghost?: boolean;                      // NEW: hollow dashed circle, no pulse
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
  eps?: number;
  clusterSeparation?: number;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

// ── Pin size dimensions (outer circle px, svg icon px, anchor, pulse ring px) ──
const SIZE_MAP = {
  small:  { outer: 20, svg: 10, anchor: 10, pulse: 36 },
  medium: { outer: 30, svg: 16, anchor: 15, pulse: 50 },
  large:  { outer: 40, svg: 20, anchor: 20, pulse: 64 },
};

function getIconPath(icon: string): string {
  switch (icon) {
    case "charging": return '<path d="M7 2v11m3-9 4 14m3-11v11"></path>';
    case "scooter":  return '<circle cx="12" cy="12" r="10"/>';
    default:
      return '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>';
  }
}

function buildMarkerHtml(
  color: string,
  icon: string,
  size: "small" | "medium" | "large",
  opacity: number,
  ghost: boolean
): string {
  const { outer, svg, pulse } = SIZE_MAP[size];

  if (ghost) {
    // Hollow dashed circle — clearly "old / inactive" position, no pulse
    const dot = Math.round(outer * 0.28);
    return `
      <div style="position:relative;width:${outer}px;height:${outer}px;opacity:${opacity};">
        <div style="
          width:${outer}px;height:${outer}px;
          border:2px dashed ${color};
          border-radius:50%;
          background:${color}15;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 8px ${color}35;
        ">
          <div style="width:${dot}px;height:${dot}px;border-radius:50%;background:${color};opacity:0.55;"></div>
        </div>
      </div>
    `;
  }

  // Standard filled pin with animated pulse ring
  const offset = -Math.round((pulse - outer) / 2);
  return `
    <div style="position:relative;width:${outer}px;height:${outer}px;opacity:${opacity};">
      <div style="
        position:relative;z-index:1;
        width:${outer}px;height:${outer}px;
        background-color:${color};
        display:flex;align-items:center;justify-content:center;
        border-radius:50%;
        box-shadow:0 0 10px rgba(0,0,0,0.5);
      ">
        <svg xmlns="http://www.w3.org/2000/svg"
          width="${svg}" height="${svg}" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          ${getIconPath(icon)}
        </svg>
      </div>
      <div class="custom-marker-pulse" style="
        position:absolute;top:${offset}px;left:${offset}px;
        width:${pulse}px;height:${pulse}px;
        background-color:${color};opacity:0.3;border-radius:50%;
      "></div>
    </div>
  `;
}

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

function CartoMapComponent({
  center = [7.8731, 80.7718],
  zoom = 7,
  markers = [],
  routes = [],
  clusters = [],
  eps = 0,
  clusterSeparation = 0,
  height = "500px",
  onMapClick,
  interactive = true,
}: CartoMapProps) {
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leaflet, setLeaflet]     = useState<any>(null);

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

  useEffect(() => {
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
            "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            {
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
              subdomains: "abcd",
              maxZoom: 19,
            }
          ).addTo(mapInstance.current);

          if (onMapClick) {
            mapInstance.current.on("click", (e: any) => {
              onMapClick(e.latlng.lat, e.latlng.lng);
            });
          }

          // Inject global styles once per page load
          const style = document.createElement("style");
          style.innerHTML = `
            .custom-marker-icon { display:flex; align-items:center; justify-content:center; }
            .custom-marker-pulse { animation: carto-pulse 1.5s infinite; }
            @keyframes carto-pulse {
              0%   { transform: scale(0.8); opacity: 0.8; }
              70%  { transform: scale(1.5); opacity: 0.1; }
              100% { transform: scale(0.8); opacity: 0.8; }
            }
            .custom-popup .leaflet-popup-content-wrapper {
              background-color: rgba(15,23,42,0.95);
              border: 1px solid rgba(100,116,139,0.4);
              border-radius: 8px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            }
            .custom-popup .leaflet-popup-content { margin:0; color:white; }
            .custom-popup .leaflet-popup-tip { background-color: rgba(15,23,42,0.95); }
            .custom-popup a.leaflet-popup-close-button { color: rgba(255,255,255,0.6); }
            .custom-popup a.leaflet-popup-close-button:hover { color: white; }
          `;
          document.head.appendChild(style);
        } else {
          mapInstance.current.setView(center, zoom);
        }

        // Remove old markers/shapes (keep tile layer)
        mapInstance.current.eachLayer((layer: any) => {
          if (
            layer instanceof L.Marker ||
            layer instanceof L.Polyline ||
            layer instanceof L.Circle
          ) {
            mapInstance.current.removeLayer(layer);
          }
        });

        // ── Markers ──
        markers.forEach((marker) => {
          const {
            position,
            popup,
            icon    = "location",
            color   = "#06b6d4",
            size    = "medium",
            opacity = 1,
            ghost   = false,
          } = marker;

          const { outer, anchor } = SIZE_MAP[size];

          const customIcon = L.divIcon({
            className: "custom-marker-icon",
            html: buildMarkerHtml(color, icon, size, opacity, ghost),
            iconSize:   [outer, outer],
            iconAnchor: [anchor, anchor],
          });

          const mi = L.marker(position, { icon: customIcon }).addTo(mapInstance.current);

          if (popup) {
            mi.bindPopup(popup, { className: "custom-popup" });
          }

          // Radius circles only on real (non-ghost) markers
          if (!ghost) {
            if (eps > 0) {
              L.circle(position, {
                radius: eps * 1000,
                color: "#06b6d4", fillColor: "#06b6d4",
                fillOpacity: 0.05, weight: 1, dashArray: "4, 4",
              }).addTo(mapInstance.current);
            }
            if (clusterSeparation && clusterSeparation > 0) {
              L.circle(position, {
                radius: clusterSeparation * 1000,
                color: "#f59e0b", fillColor: "#f59e0b",
                fillOpacity: 0.05, weight: 1, dashArray: "6, 6",
              }).addTo(mapInstance.current);
            }
          }
        });

        // ── Routes ──
        routes.forEach((route) => {
          const { path, color = "#06b6d4", weight = 3, opacity = 0.7, dashArray = "" } = route;
          L.polyline(path, { color, weight, opacity, dashArray, lineCap: "round", lineJoin: "round" })
            .addTo(mapInstance.current);
        });

        // ── Clusters ──
        clusters.forEach((cluster) => {
          const { center, radius, color = "#06b6d4", fillColor = "#06b6d4", fillOpacity = 0.2 } = cluster;
          L.circle(center, { radius, color, fillColor, fillOpacity, weight: 1 })
            .addTo(mapInstance.current);
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
  }, [leaflet, center, zoom, markers, routes, clusters, eps, clusterSeparation, onMapClick, interactive]);

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

const DynamicCartoMap = dynamic(() => Promise.resolve(CartoMapComponent), {
  ssr: false,
  loading: MapFallback,
});

export default function CartoMap(props: CartoMapProps) {
  return <DynamicCartoMap {...props} />;
}