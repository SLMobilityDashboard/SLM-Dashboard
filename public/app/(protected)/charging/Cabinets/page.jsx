"use client";

import { useState, useEffect, useMemo } from "react";
import { Upload } from "lucide-react";
import * as Papa from "papaparse";
import { Card, CardContent } from "@/components/ui/card";
import { CombinedFilters } from "@/components/cabinet/CombinedFilters";
import { TimelineControls } from "@/components/cabinet/TimelineControls";
import { CabinetGrid } from "@/components/cabinet/CabinetGrid";
import { AnomalyDetector } from "@/lib/anomaly-detector";

const BatteryStationAnalyzer = () => {
  const [data, setData] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [stations, setStations] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [currentTimestampIndex, setCurrentTimestampIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [selectedCabinets, setSelectedCabinets] = useState([]);
  const [filterType, setFilterType] = useState("all");

  // Parse CSV data
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const processedData = results.data.map((row) => ({
            ...row,
            timestamp: Number.parseInt(row.timestamp),
            battery: Number.parseInt(row.battery) || 0,
            cell_temp: Number.parseInt(row.cell_temp) || 0,
            kwh: Number.parseInt(row.kwh) || 0,
            no: Number.parseInt(row.no) || 0,
            is_battery: Number.parseInt(row.is_battery) || 0,
            charger_online: Number.parseInt(row.charger_online) || 0,
            communication: Number.parseInt(row.communication) || 0,
            door: Number.parseInt(row.door) || 0,
            v: Number.parseInt(row.v) || 0,
            t: Number.parseInt(row.t) || 0,
            urgency: Number.parseInt(row.urgency) || 0,
            single_vol: row.single_vol || "",
            bid: row.bid || "",
            battery_status: Number.parseInt(row.battery_status) || 0,
            out_fire: Number.parseInt(row.out_fire) || 0,
            i: Number.parseFloat(row.i) || 0,
            s: Number.parseInt(row.s) || 0,
          }));

          setData(processedData);

          // Extract unique stations and timestamps
          const uniqueStations = [
            ...new Set(
              processedData
                .map((row) => row["device_id"]?.trim())
                .filter((id) => id)
            ),
          ];
          const uniqueTimestamps = [
            ...new Set(processedData.map((row) => row.timestamp)),
          ].sort();

          setStations(uniqueStations);
          setTimestamps(uniqueTimestamps);

          if (uniqueStations.length > 0) {
            setSelectedStation(uniqueStations[0]);
          }
          if (uniqueTimestamps.length > 0) {
            setCurrentTimestamp(uniqueTimestamps[0]);
          }

          // Initialize with all cabinets selected
          setSelectedCabinets(Array.from({ length: 12 }, (_, i) => i + 1));
        },
      });
    }
  };

  // Auto-play functionality
  useEffect(() => {
    let interval;
    if (isPlaying && timestamps.length > 0) {
      interval = setInterval(() => {
        setCurrentTimestampIndex((prev) => {
          const next = (prev + 1) % timestamps.length;
          setCurrentTimestamp(timestamps[next]);
          return next;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timestamps, playbackSpeed]);

  // Get current timestamp data
  const currentData = useMemo(() => {
    if (!selectedStation || !currentTimestamp) return [];

    const stationData = data.filter(
      (row) =>
        row.device_id === selectedStation && row.timestamp === currentTimestamp
    );

    // Create a 4x3 grid (12 cabinets)
    const gridData = Array(12)
      .fill(null)
      .map((_, index) => {
        const cabinetNo = index + 1;
        return (
          stationData.find((row) => row.no === cabinetNo) || { no: cabinetNo }
        );
      });

    return gridData;
  }, [data, selectedStation, currentTimestamp]);

  const anomalyDetector = new AnomalyDetector();

  // Get previous timestamp data for anomaly detection
  const previousData = useMemo(() => {
    if (!selectedStation || currentTimestampIndex === 0) return [];

    const prevTimestamp = timestamps[currentTimestampIndex - 1];
    const stationData = data.filter(
      (row) =>
        row.device_id === selectedStation && row.timestamp === prevTimestamp
    );

    return Array(12)
      .fill(null)
      .map((_, index) => {
        const cabinetNo = index + 1;
        return (
          stationData.find((row) => row.no === cabinetNo) || { no: cabinetNo }
        );
      });
  }, [data, selectedStation, currentTimestampIndex, timestamps]);

  // Get historical data for loose connection analysis
  const historicalData = useMemo(() => {
    if (!selectedStation) return [];

    return data
      .filter((row) => row.device_id === selectedStation)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data, selectedStation]);

  // Apply smart filtering
  const filteredCurrentData = useMemo(() => {
    let filtered = currentData;

    // Apply smart filter first
    switch (filterType) {
      case "with-battery":
        filtered = filtered.filter((cabinet) => cabinet.is_battery === 1);
        break;
      case "without-battery":
        filtered = filtered.filter(
          (cabinet) => cabinet.is_battery === 0 || !cabinet.timestamp
        );
        break;
      case "online":
        filtered = filtered.filter(
          (cabinet) => cabinet.communication === 1 && cabinet.timestamp
        );
        break;
      case "offline":
        filtered = filtered.filter(
          (cabinet) => cabinet.communication === 0 || !cabinet.timestamp
        );
        break;
      case "charging":
        filtered = filtered.filter(
          (cabinet) => cabinet.charger_online === 1 && cabinet.timestamp
        );
        break;
      case "anomalies":
        filtered = filtered.filter((cabinet) => {
          if (!cabinet.timestamp) return false;
          const previous = previousData.find((p) => p.no === cabinet.no);
          const anomalies = anomalyDetector.detectAnomalies(cabinet, previous);
          return anomalies.length > 0;
        });
        break;
      case "high-temp":
        filtered = filtered.filter(
          (cabinet) => cabinet.cell_temp > 40 && cabinet.timestamp
        );
        break;
      case "low-battery":
        filtered = filtered.filter(
          (cabinet) => cabinet.battery < 30 && cabinet.timestamp
        );
        break;
      default:
        // "all" - no additional filtering
        break;
    }

    // Then apply manual cabinet selection
    if (selectedCabinets.length < 12) {
      filtered = filtered.filter((cabinet) =>
        selectedCabinets.includes(cabinet.no)
      );
    }

    return filtered;
  }, [currentData, filterType, selectedCabinets, previousData]);

  // Filter previous data to match current filtered data
  const filteredPreviousData = useMemo(() => {
    const filteredCabinetNos = filteredCurrentData.map((cabinet) => cabinet.no);
    return previousData.filter((cabinet) =>
      filteredCabinetNos.includes(cabinet.no)
    );
  }, [previousData, filteredCurrentData]);

  // Timeline navigation functions
  const goToPrevious = () => {
    if (currentTimestampIndex > 0) {
      const newIndex = currentTimestampIndex - 1;
      setCurrentTimestampIndex(newIndex);
      setCurrentTimestamp(timestamps[newIndex]);
    }
  };

  const goToNext = () => {
    if (currentTimestampIndex < timestamps.length - 1) {
      const newIndex = currentTimestampIndex + 1;
      setCurrentTimestampIndex(newIndex);
      setCurrentTimestamp(timestamps[newIndex]);
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-100">
            Battery Cabinet Monitor
          </h1>
          <p className="text-slate-400">
            Real-time monitoring and loose connection analysis
          </p>
        </div>

        {/* File Upload */}
        <Card className="border-slate-700">
          <CardContent className="p-6">
            <label className="flex items-center justify-center gap-4 p-8 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-slate-500 transition-colors">
              <Upload className="w-8 h-8 text-slate-400" />
              <div className="text-center">
                <span className="text-lg font-medium text-slate-200">
                  Upload CSV Data
                </span>
                <p className="text-slate-400 mt-1">
                  Select your battery cabinet data file
                </p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </CardContent>
        </Card>

        {data.length > 0 && (
          <>
            {/* Combined Filters */}
            <CombinedFilters
              stations={stations}
              selectedStation={selectedStation}
              onStationChange={setSelectedStation}
              selectedCabinets={selectedCabinets}
              onCabinetChange={setSelectedCabinets}
              filterType={filterType}
              onFilterTypeChange={setFilterType}
              currentData={currentData}
              previousData={previousData}
              anomalyDetector={anomalyDetector}
              historicalData={historicalData}
              filteredCurrentData={filteredCurrentData}
            />

            {/* Cabinet Grid */}
            <CabinetGrid
              currentData={filteredCurrentData}
              previousData={filteredPreviousData}
              anomalyDetector={anomalyDetector}
            />

            {/* Timeline Controls - Row Oriented */}
            <TimelineControls
              timestamps={timestamps}
              currentTimestampIndex={currentTimestampIndex}
              currentTimestamp={currentTimestamp}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onSliderChange={(value) => {
                const newIndex = value[0];
                setCurrentTimestampIndex(newIndex);
                setCurrentTimestamp(timestamps[newIndex]);
              }}
              onPlayToggle={() => setIsPlaying(!isPlaying)}
              onReset={() => {
                setCurrentTimestampIndex(0);
                setCurrentTimestamp(timestamps[0]);
                setIsPlaying(false);
              }}
              onSpeedChange={setPlaybackSpeed}
              onPrevious={goToPrevious}
              onNext={goToNext}
              canGoPrevious={currentTimestampIndex > 0}
              canGoNext={currentTimestampIndex < timestamps.length - 1}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default BatteryStationAnalyzer;
