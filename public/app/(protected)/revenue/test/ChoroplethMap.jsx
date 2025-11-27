"use client";

import React from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ✅ Hardcoded GeoJSON — simplified for demo
const geoData = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { region_code: "LK-11", name: "Colombo" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [79.85, 6.9],
            [80.0, 6.9],
            [80.0, 7.1],
            [79.85, 7.1],
            [79.85, 6.9],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { region_code: "LK-31", name: "Galle" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.1, 5.9],
            [80.3, 5.9],
            [80.3, 6.1],
            [80.1, 6.1],
            [80.1, 5.9],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { region_code: "LK-41", name: "Jaffna" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.0, 9.6],
            [80.2, 9.6],
            [80.2, 9.8],
            [80.0, 9.8],
            [80.0, 9.6],
          ],
        ],
      },
    },
  ],
};

// ✅ Hardcoded region values (from “Snowflake”)
const regionData = [
  { region_code: "LK-11", value: 30 },
  { region_code: "LK-31", value: 75 },
  { region_code: "LK-41", value: 90 },
];

// ✅ Color scale function
const getColor = (d) => {
  return d > 80
    ? "#800026"
    : d > 60
    ? "#BD0026"
    : d > 40
    ? "#E31A1C"
    : d > 20
    ? "#FC4E2A"
    : d > 0
    ? "#FEB24C"
    : "#FFEDA0";
};

const ChoroplethMap = () => {
  const style = (feature) => {
    const code = feature.properties.region_code;
    const match = regionData.find((r) => r.region_code === code);
    const value = match ? match.value : 0;

    return {
      fillColor: getColor(value),
      weight: 1,
      opacity: 1,
      color: "white",
      dashArray: "3",
      fillOpacity: 0.7,
    };
  };

  return (
    <MapContainer
      center={[7.8731, 80.7718]}
      zoom={7}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON data={geoData} style={style} />
    </MapContainer>
  );
};

export default ChoroplethMap;
