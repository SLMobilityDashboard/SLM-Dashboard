"use client";

import React, { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Loader2,
  MapPin,
  Zap,
  AlertTriangle,
  CheckCircle,
  Battery,
  BatteryLow,
  Navigation,
} from "lucide-react";

// Custom Leaflet Icons
const createCustomIcon = (color, iconSvg, size = [32, 32]) => {
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: ${size[0]}px;
        height: ${size[1]}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">
        ${iconSvg}
      </div>
    `,
    className: "custom-div-icon",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2],
  });
};

// Station Icon
const stationIcon = createCustomIcon(
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  `<svg width="18" height="18" fill="white" viewBox="0 0 24 24">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`
);

// Scooter Icons based on status
const safeScooterIcon = createCustomIcon(
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  `<svg width="16" height="16" fill="white" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>`,
  [28, 28]
);

const warningScooterIcon = createCustomIcon(
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  `<svg width="16" height="16" fill="white" viewBox="0 0 24 24">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>`,
  [28, 28]
);

const dangerScooterIcon = createCustomIcon(
  "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
  `<svg width="16" height="16" fill="white" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    <path d="M15 9H9v6h6V9z" fill="#ff4757"/>
  </svg>`,
  [28, 28]
);

const addLeafletCustomStyles = () => {
  const styleId = "leaflet-custom-styles-enhanced-scooter-map";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
    .custom-div-icon {
      background: transparent !important;
      border: none !important;
    }
    
    .leaflet-popup-content-wrapper {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
    }
    
    .leaflet-popup-content {
      margin: 16px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .leaflet-popup-tip {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: 1px solid rgba(255,255,255,0.2);
    }
    
    .leaflet-popup-close-button {
      color: white !important;
      font-size: 18px !important;
      font-weight: bold !important;
      padding: 8px !important;
      top: 4px !important;
      right: 4px !important;
    }
    
    .leaflet-popup-close-button:hover {
      background: rgba(255,255,255,0.2) !important;
      border-radius: 50%;
    }
    
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 12px;
      margin-top: 8px;
    }
    
    .status-safe {
      background: rgba(34, 197, 94, 0.2);
      color: #15803d;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    
    .status-warning {
      background: rgba(245, 158, 11, 0.2);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    
    .status-danger {
      background: rgba(239, 68, 68, 0.2);
      color: #dc2626;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    .battery-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 8px 0;
      padding: 6px 10px;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.2);
    }
    
    .info-grid {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }
    
    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    
    .info-label {
      opacity: 0.8;
      min-width: 60px;
    }
    
    .info-value {
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);
};

const stations = [
  { id: "ST01", name: "Miriswaththa", lat: 7.123456, lng: 80.123456 },
  { id: "ST02", name: "Seeduwa", lat: 7.148497, lng: 79.873276 },
  { id: "ST03", name: "Minuwangoda", lat: 7.182689, lng: 79.961171 },
  { id: "ST04", name: "Divulapitiya", lat: 7.222404, lng: 80.017613 },
  { id: "ST05", name: "Katunayake", lat: 7.222445, lng: 80.017625 },
  { id: "ST06", name: "Udugampola", lat: 7.120498, lng: 79.983923 },
  { id: "ST07", name: "Kadawatha", lat: 7.006685, lng: 79.958184 },
  { id: "ST08", name: "Kochchikade", lat: 7.274298, lng: 79.862597 },
  { id: "ST09", name: "Paliyagoda", lat: 6.960975, lng: 79.880949 },
  { id: "ST10", name: "Boralesgamuwa", lat: 6.837024, lng: 79.903572 },
  { id: "ST11", name: "Thalawathugoda", lat: 6.877865, lng: 79.939505 },
  { id: "ST12", name: "Moratuwa", lat: 6.787022, lng: 79.884759 },
  { id: "ST13", name: "Borella", lat: 6.915059, lng: 79.881394 },
  { id: "ST14", name: "Padukka", lat: 6.847305, lng: 80.102153 },
  { id: "ST15", name: "Beruwala", lat: 7.222348, lng: 80.017553 },
  { id: "ST16", name: "Bandaragama", lat: 6.714853, lng: 79.989208 },
  { id: "ST17", name: "Maggona", lat: 7.222444, lng: 80.017606 },
  { id: "ST18", name: "Panadura", lat: 6.713372, lng: 79.906452 },
];

const scooters = [
  { id: "SC001", lat: 6.9278, lng: 79.8612, battery: 70 },
  { id: "SC002", lat: 6.935, lng: 79.85, battery: 30 },
  { id: "SC003", lat: 6.95, lng: 79.865, battery: 10 },
  { id: "SC004", lat: 7.9, lng: 80.9, battery: 100 },
  { id: "SC005", lat: 7.05, lng: 79.95, battery: 85 },
  { id: "SC006", lat: 6.842, lng: 79.8725, battery: 60 },
  { id: "SC007", lat: 6.9271, lng: 80.8612, battery: 45 },
  { id: "SC008", lat: 8.3114, lng: 80.4037, battery: 90 },
  { id: "SC009", lat: 9.6615, lng: 80.0255, battery: 20 },
  { id: "SC010", lat: 7.2906, lng: 80.6337, battery: 55 },
  { id: "SC011", lat: 6.0535, lng: 80.22, battery: 35 },
  { id: "SC012", lat: 6.4214, lng: 80.0064, battery: 75 },
  { id: "SC013", lat: 8.5784, lng: 81.233, battery: 65 },
  { id: "SC014", lat: 6.9442, lng: 81.0092, battery: 90 },
  { id: "SC015", lat: 6.9365, lng: 79.8758, battery: 40 },
  { id: "SC016", lat: 7.16, lng: 79.87, battery: 50 },
  { id: "SC017", lat: 6.711, lng: 81.2158, battery: 30 },
  { id: "SC018", lat: 8.033, lng: 80.983, battery: 85 },
  { id: "SC019", lat: 6.6685, lng: 80.1717, battery: 95 },
  { id: "SC020", lat: 7.7167, lng: 81.7, battery: 10 },
];

const getDistanceFromLatLng = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getScooterRangeMeters = (battery) => battery * 500; // 0.5 km per 1%

const getScooterStatus = (scooter, distanceToNearestStation, scooterRange) => {
  if (distanceToNearestStation > scooterRange) {
    return "danger";
  } else if (
    scooter.battery <= 25 ||
    distanceToNearestStation > scooterRange * 0.7
  ) {
    return "warning";
  }
  return "safe";
};

const getScooterIcon = (status) => {
  switch (status) {
    case "danger":
      return dangerScooterIcon;
    case "warning":
      return warningScooterIcon;
    default:
      return safeScooterIcon;
  }
};

const getBatteryIcon = (battery) => {
  if (battery <= 20) return <BatteryLow className="w-4 h-4 text-red-400" />;
  return <Battery className="w-4 h-4 text-green-400" />;
};

const ScooterMap = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [mapStats, setMapStats] = useState({ safe: 0, warning: 0, danger: 0 });

  useEffect(() => {
    addLeafletCustomStyles();

    // Calculate stats
    const stats = { safe: 0, warning: 0, danger: 0 };
    scooters.forEach((scooter) => {
      const distanceToNearestStation = getNearestStationDistance(scooter);
      const scooterRange = getScooterRangeMeters(scooter.battery);
      const status = getScooterStatus(
        scooter,
        distanceToNearestStation,
        scooterRange
      );
      stats[status]++;
    });
    setMapStats(stats);

    setTimeout(() => setIsLoading(false), 500);
  }, []);

  const getNearestStationDistance = (scooter) => {
    const distances = stations.map((station) =>
      getDistanceFromLatLng(scooter.lat, scooter.lng, station.lat, station.lng)
    );
    return Math.min(...distances);
  };

  return (
    <div className="w-full space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">
                  Safe Scooters
                </p>
                <p className="text-2xl font-bold text-green-700">
                  {mapStats.safe}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Warning</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {mapStats.warning}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Danger Zone</p>
                <p className="text-2xl font-bold text-red-700">
                  {mapStats.danger}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Map Card */}
      <Card className="w-full bg-gradient-to-br from-slate-50 to-gray-100 border-gray-200">
        <CardHeader className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <Navigation className="w-6 h-6" />
            <div>
              <CardTitle className="text-xl">
                Smart Scooter Fleet Monitor
              </CardTitle>
              <CardDescription className="text-indigo-100 mt-1">
                Real-time scooter locations with intelligent danger zone
                detection
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[600px] relative z-0 p-0">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-full bg-gray-900 rounded-b-lg">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mb-4" />
              <p className="text-gray-300 animate-pulse">
                Loading smart map...
              </p>
            </div>
          ) : (
            <div className="h-full rounded-b-lg overflow-hidden">
              <MapContainer
                center={[6.9278, 79.8612]}
                zoom={8}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {/* Stations */}
                {stations.map((station) => (
                  <Marker
                    key={station.id}
                    position={[station.lat, station.lng]}
                    icon={stationIcon}
                  >
                    <Popup className="custom-popup">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4" />
                          <strong>{station.name}</strong>
                        </div>
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-label">Station ID:</span>
                            <span className="info-value">{station.id}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Type:</span>
                            <span className="info-value">Charging Station</span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Scooters */}
                {scooters.map((scooter) => {
                  const scooterRange = getScooterRangeMeters(scooter.battery);
                  const distanceToNearestStation =
                    getNearestStationDistance(scooter);
                  const status = getScooterStatus(
                    scooter,
                    distanceToNearestStation,
                    scooterRange
                  );
                  const isInDanger = status === "danger";

                  return (
                    <React.Fragment key={scooter.id}>
                      <Marker
                        position={[scooter.lat, scooter.lng]}
                        icon={getScooterIcon(status)}
                      >
                        <Popup className="custom-popup">
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Zap className="w-4 h-4" />
                              <strong>Scooter {scooter.id}</strong>
                            </div>

                            <div className="battery-indicator">
                              {getBatteryIcon(scooter.battery)}
                              <span>Battery: {scooter.battery}%</span>
                            </div>

                            <div className="info-grid">
                              <div className="info-item">
                                <Navigation className="w-3 h-3" />
                                <span className="info-label">Range:</span>
                                <span className="info-value">
                                  {(scooterRange / 1000).toFixed(1)} km
                                </span>
                              </div>
                              <div className="info-item">
                                <MapPin className="w-3 h-3" />
                                <span className="info-label">Nearest:</span>
                                <span className="info-value">
                                  {(distanceToNearestStation / 1000).toFixed(1)}{" "}
                                  km
                                </span>
                              </div>
                            </div>

                            <div className={`status-badge status-${status}`}>
                              {status === "safe" && (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              {status === "warning" && (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              {status === "danger" && (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              {status.toUpperCase()}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScooterMap;
