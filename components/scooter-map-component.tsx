"use client"

import { useEffect, useRef } from "react"

interface ScooterMapComponentProps {
  lat: number
  lng: number
}

export default function ScooterMapComponent({ lat, lng }: ScooterMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const marker = useRef<any>(null)
  const pulseCircle = useRef<any>(null)

  useEffect(() => {
    // Only import Leaflet on the client side
    const initializeMap = async () => {
      if (typeof window === "undefined") return
      if (!mapRef.current) return

      // Dynamically import Leaflet
      const L = (await import("leaflet")).default

      // Import Leaflet CSS
      require("leaflet/dist/leaflet.css")

      // Initialize map if it doesn't exist
      if (!mapInstance.current) {
        // Create map with dark style
        mapInstance.current = L.map(mapRef.current).setView([lat, lng], 15)

        // Add OpenStreetMap tile layer (no API key needed)
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(mapInstance.current)

        // Custom scooter icon
        const scooterIcon = L.divIcon({
          className: "custom-scooter-icon",
          html: `<div class="relative">
                  <div class="absolute -top-3 -left-3 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-slate-800">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="w-3 h-3 text-slate-900">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  </div>
                  <div class="absolute -top-10 -left-10 w-20 h-20 bg-cyan-500/20 rounded-full animate-ping"></div>
                </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        })

        // Add marker for scooter location
        marker.current = L.marker([lat, lng], { icon: scooterIcon }).addTo(mapInstance.current)

        // Add pulsing circle
        pulseCircle.current = L.circle([lat, lng], {
          color: "#06b6d4",
          fillColor: "#06b6d4",
          fillOpacity: 0.2,
          radius: 50,
        }).addTo(mapInstance.current)

        // Add custom CSS for the pulsing effect
        const style = document.createElement("style")
        style.innerHTML = `
          .custom-scooter-icon {
            background: transparent;
            border: none;
          }
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 1; }
            70% { transform: scale(1.5); opacity: 0.3; }
            100% { transform: scale(0.8); opacity: 1; }
          }
          .animate-ping {
            animation: pulse 2s infinite;
          }
        `
        document.head.appendChild(style)

        // Add some sample route lines
        const routePoints = [
          [lat - 0.005, lng - 0.005],
          [lat - 0.003, lng - 0.001],
          [lat, lng],
          [lat + 0.002, lng + 0.003],
          [lat + 0.004, lng + 0.006],
        ]

        const routeLine = L.polyline(routePoints as L.LatLngExpression[], {
          color: "#06b6d4",
          weight: 3,
          opacity: 0.7,
          dashArray: "5, 10",
        }).addTo(mapInstance.current)

        // Add some sample charging stations
        const stations = [
          { lat: lat + 0.008, lng: lng - 0.005, name: "Charging Station A", available: 3 },
          { lat: lat - 0.007, lng: lng + 0.007, name: "Charging Station B", available: 0 },
          { lat: lat + 0.005, lng: lng + 0.009, name: "Charging Station C", available: 5 },
        ]

        stations.forEach((station) => {
          const stationIcon = L.divIcon({
            className: "custom-station-icon",
            html: `<div class="w-6 h-6 bg-${station.available > 0 ? "green" : "red"}-500 rounded-full flex items-center justify-center border-2 border-slate-800 text-xs text-white font-bold">
                    ${station.available}
                  </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })

          L.marker([station.lat, station.lng], { icon: stationIcon })
            .addTo(mapInstance.current)
            .bindPopup(`<b>${station.name}</b><br>${station.available} spots available`)
        })
      } else {
        // Update map view if it already exists
        mapInstance.current.setView([lat, lng], mapInstance.current.getZoom())

        // Update marker position
        if (marker.current) {
          marker.current.setLatLng([lat, lng])
        }

        // Update pulse circle position
        if (pulseCircle.current) {
          pulseCircle.current.setLatLng([lat, lng])
        }
      }
    }

    initializeMap()

    return () => {
      // Cleanup on component unmount
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [lat, lng])

  return <div ref={mapRef} className="w-full h-full bg-slate-800 rounded-lg overflow-hidden"></div>
}
