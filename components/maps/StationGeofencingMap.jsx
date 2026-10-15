"use client";

import React, { useMemo, useEffect, useState } from "react";
import Papa from "papaparse";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

if (typeof window !== "undefined") {
  delete L.Icon.Default.prototype._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "leaflet/images/marker-icon-2x.png",
    iconUrl: "leaflet/images/marker-icon.png",
    shadowUrl: "leaflet/images/marker-shadow.png",
  });
}

// Proper CSV data as string
const stationCsvData = `Station_id,Station_name,District,Address,Latitude,Longitude
ST01,Miriswaththa,Gampaha,"No. 84/C, Miriswatta, Muduugoda, Gampaha",7.123456,80.123456
ST02,Seeduwa,Gampaha,"No. 73 Liyanagemulla, Seeduwa",7.148497,79.873276
ST03,Minuwangoda,Gampaha,"No. 179/D, Kurunegala Road, Nilpanagoda, Minuwangoda",7.182689,79.961171
ST04,Divulapitiya,Gampaha,"No. 71/14, Divulapitiya Plaza, Colombo Road, Divulapitiya",7.222404,80.017613
ST05,Katunayake,Gampaha,"No 128, 18th Mile Post, Katunayake 11450",7.222445,80.017625
ST06,Udugampola,Gampaha,"No. 140 Dobawala, Udugampola",7.120498,79.983923
ST07,Kadawatha,Gampaha,"Subodha Mawatha, Kadawatha",7.006685,79.958184
ST08,Kochchikade,Gampaha,"Thopputhota Filling Station, Chilaw-Colombo Main Rd, 61110",7.274298,79.862597
ST09,Paliyagoda,Gampaha,"3 Negombo Rd, Wattala 11300",6.960975,79.880949
ST10,Boralesgamuwa,Colombo,"15/1 Kesbewa Road, Boralesgamuwa",6.837024,79.903572
ST11,Thalawathugoda,Colombo,"263/1 Hokandara Rd, Ruhunupura",6.877865,79.939505
ST12,Moratuwa,Colombo,"Galle Rd, Moratuwa",6.787022,79.884759
ST13,Borella,Colombo,"29 Grenier Rd, Colombo",6.915059,79.881394
ST14,Padukka,Colombo,"Arukwatta – Pitumpe Rd, Padukka 10500",6.847305,80.102153
ST15,Beruwala,Kalutara,"Galle Rd, Beruwala",7.222348,80.017553
ST16,Bandaragama,Kalutara,"17A, Horana Rd, Bandaragama",6.714853,79.989208
ST17,Maggona,Kalutara,"Maggona West",7.222444,80.017606
ST18,Panadura,Kalutara,"173, 01/01 Galle Rd, Beruwala 12070",6.713372,79.906452`;

const GEOFENCE_RADIUS_METERS = 10000; // 10 km radius

const addLeafletCustomStyles = () => {
  const styleId = "leaflet-custom-styles-geofence";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
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
      background-color: #06b6d4; /* cyan */
      width: 30px;
      height: 30px;
    }
    .custom-marker-icon svg {
      width: 16px;
      height: 16px;
      stroke: white;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: orange;
    }
    .custom-popup .leaflet-popup-content-wrapper {
      background-color: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(100, 116, 139, 0.5);
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }
    .custom-popup .leaflet-popup-content {
      margin: 0;
      color: white;
      font-family: system-ui, sans-serif;
      padding: 8px 12px;
      font-size: 14px;
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
};

export default function StationGeofencingMap() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    addLeafletCustomStyles();
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const stations = useMemo(() => {
    const { data, errors } = Papa.parse(stationCsvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (errors.length > 0) {
      console.error("CSV Parse Error:", errors);
      return [];
    }

    return data.filter(
      (s) =>
        typeof s.Latitude === "number" &&
        typeof s.Longitude === "number" &&
        s.Latitude !== null &&
        s.Longitude !== null
    );
  }, []);

  if (stations.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[300px] w-full flex items-center justify-center text-slate-500">
            No station data available to display geofences.
          </div>
        </CardContent>
      </Card>
    );
  }

  const centerLat =
    stations.reduce((sum, s) => sum + s.Latitude, 0) / stations.length;
  const centerLng =
    stations.reduce((sum, s) => sum + s.Longitude, 0) / stations.length;

  // Create custom icon with a bolt SVG (representing charging station)
  const createCustomDivIcon = () => {
    const svgBolt = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    `;

    return L.divIcon({
      className: "custom-marker-icon",
      html: svgBolt,
      iconSize: [30, 30],
      iconAnchor: [15, 30], // bottom-center of the icon
      popupAnchor: [0, -30],
    });
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
      <div className="h-[300px] w-full relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
              <p className="mt-2 text-sm text-slate-300">Loading map...</p>
            </div>
          </div>
        )}
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={10}
          scrollWheelZoom={true}
          className="h-full w-full"
          whenReady={() => setIsLoading(false)}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            subdomains="abcd"
            maxZoom={19}
          />

          {stations.map((station, index) => (
            <React.Fragment key={station.Station_id || index}>
              <Marker
                position={[station.Latitude, station.Longitude]}
                icon={createCustomDivIcon()}
              >
                <Popup className="custom-popup" autoPan={false}>
                  <div>
                    <strong>{station.Station_name}</strong>
                    <br />
                    {station.Address}
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={[station.Latitude, station.Longitude]}
                radius={GEOFENCE_RADIUS_METERS}
                pathOptions={{
                  color: "#06b6d4",
                  fillColor: "#06b6d4",
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: "6 6",
                }}
              />
            </React.Fragment>
          ))}
        </MapContainer>
      </div>
    </Card>
  );
}
