import { useState, useEffect, useCallback } from 'react';

interface TBoxGPS {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  tboxId: number;
  province?: string;
  district?: string;
  area?: string;
  pointCount?: number;
  isHotspot?: boolean;
  isKeyPoint?: boolean;
}

interface TBoxGPSData {
  tboxes: TBoxGPS[];
  totalTBoxes: number;
  activeTBoxes: number;
  averageLatitude: number;
  averageLongitude: number;
  samplingInfo?: {
    originalPoints: number;
    sampledPoints: number;
    compressionRatio: string;
    strategy: string;
  };
}

interface TBoxGPSFilters {
  quickTime: string;
  dateRange?: { from: Date; to: Date };
  selectedTboxes: number[];
  selectedProvinces: string[];
  selectedDistricts: string[];
  selectedAreas: string[];
}

interface GeographicalData {
  provinces: string[];
  districts: { [province: string]: string[] };
  areas: { [district: string]: string[] };
}

interface UseTBoxGPSDataReturn {
  data: TBoxGPSData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  availableTboxes: number[];
  loadingTboxes: boolean;
  geographicalData: GeographicalData;
  loadingGeographical: boolean;
}

const getDefaultDateRange = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fromDate = new Date(currentYear - 1, currentMonth, 1);
  const toDate = new Date(currentYear, currentMonth, 0);
  return { from: fromDate, to: toDate };
};

export const useTBoxGPSData = (
  filters: TBoxGPSFilters & { shouldFetchData?: boolean }
): UseTBoxGPSDataReturn => {
  const [data, setData] = useState<TBoxGPSData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTboxes, setAvailableTboxes] = useState<number[]>([]);
  const [loadingTboxes, setLoadingTboxes] = useState(false);
  const [geographicalData, setGeographicalData] = useState<GeographicalData>({
    provinces: [],
    districts: {},
    areas: {}
  });
  const [loadingGeographical, setLoadingGeographical] = useState(false);
  // Add this state at the top of your hook
const [refetchCounter, setRefetchCounter] = useState(0);

  const buildDateRangeCondition = useCallback((filters: TBoxGPSFilters): string => {
    let dateCondition = '';

    if (filters.dateRange?.from && filters.dateRange?.to) {
      const fromDate = filters.dateRange.from.toISOString().split('T')[0];
      const toDate = filters.dateRange.to.toISOString().split('T')[0];
      dateCondition = ` AND DATE(MEAN_TIMESTAMP) BETWEEN '${fromDate}' AND '${toDate}'`;
    } else if (filters.quickTime !== 'custom') {
      switch (filters.quickTime) {
        case 'today':
          dateCondition = ` AND DATE(MEAN_TIMESTAMP) = CURRENT_DATE()`;
          break;
        case 'yesterday':
          dateCondition = ` AND DATE(MEAN_TIMESTAMP) = DATEADD(day, -1, CURRENT_DATE())`;
          break;
        case 'last_7_days':
          dateCondition = ` AND DATE(MEAN_TIMESTAMP) >= DATEADD(day, -7, CURRENT_DATE())`;
          break;
        case 'last_30_days':
          dateCondition = ` AND DATE(MEAN_TIMESTAMP) >= DATEADD(day, -30, CURRENT_DATE())`;
          break;
        case 'last_90_days':
          dateCondition = ` AND DATE(MEAN_TIMESTAMP) >= DATEADD(day, -90, CURRENT_DATE())`;
          break;
        case 'last_year':
          dateCondition = ` AND DATE(MEAN_TIMESTAMP) >= DATEADD(year, -1, CURRENT_DATE())`;
          break;
      }
    }

    return dateCondition;
  }, []);

  const buildGeographicalCondition = useCallback((filters: TBoxGPSFilters): string => {
    let geoCondition = '';

    if (filters.selectedProvinces.length > 0) {
      const provinces = filters.selectedProvinces.map(p => `'${p}'`).join(',');
      geoCondition += ` AND PROVINCE IN (${provinces})`;
    }

    if (filters.selectedDistricts.length > 0) {
      const districts = filters.selectedDistricts.map(d => `'${d}'`).join(',');
      geoCondition += ` AND DISTRICT IN (${districts})`;
    }

    if (filters.selectedAreas.length > 0) {
      const areas = filters.selectedAreas.map(a => `'${a}'`).join(',');
      geoCondition += ` AND AREA IN (${areas})`;
    }

    return geoCondition;
  }, []);

  const buildGPSDataQuery = useCallback((filters: TBoxGPSFilters): string => {
    // CRITICAL: Apply ALL filters FIRST, then sample from filtered data
    // This ensures selected TBoxes, provinces, districts, and areas are respected
    
    const sql = `
      WITH filtered_data AS (
        -- STEP 1: Apply ALL filters first to get the exact dataset we want to visualize
        SELECT 
          TBOXID,
          MEAN_LAT,
          MEAN_LONG,
          MEAN_TIMESTAMP,
          PROVINCE,
          DISTRICT,
          AREA,
          -- Calculate grid cells for hotspot detection (~500m resolution)
          FLOOR(MEAN_LAT * 200) as lat_grid,
          FLOOR(MEAN_LONG * 200) as lng_grid
        FROM REPORT_DB.GPS_DASHBOARD.TBOX_GPS_ENRICHED
        WHERE 1=1
          ${buildDateRangeCondition(filters)}
          ${buildGeographicalCondition(filters)}
          ${filters.selectedTboxes.length > 0 ? `AND TBOXID IN (${filters.selectedTboxes.join(',')})` : ''}
      ),
      
      -- STEP 2: Calculate counts from FILTERED data only
      counts AS (
        SELECT 
          COUNT(*) as total_points,
          COUNT(DISTINCT TBOXID) as total_tboxes
        FROM filtered_data
      ),
      
      -- STEP 3: Identify hotspots in FILTERED data only
      hotspots AS (
        SELECT 
          lat_grid,
          lng_grid,
          COUNT(*) as density
        FROM filtered_data
        GROUP BY lat_grid, lng_grid
        HAVING COUNT(*) >= 10  -- Hotspot = 10+ points in same grid cell
      ),
      
      -- STEP 4: Calculate dynamic sampling rate from FILTERED data
      sampling_params AS (
        SELECT 
          total_tboxes,
          GREATEST(1, FLOOR(total_points / 950.0)) as skip_factor,  -- Reserve 50 points for hotspots
          CASE 
            WHEN total_tboxes <= 5 THEN 180    -- Few scooters: more points each
            WHEN total_tboxes <= 10 THEN 90    -- Medium: good coverage
            WHEN total_tboxes <= 20 THEN 45    -- Many: fair coverage
            ELSE 20                             -- Lots: overview + hotspots
          END as points_per_tbox
        FROM counts
      ),
      
      -- STEP 5: Sample hotspots from FILTERED data
      hotspot_points AS (
        SELECT 
          b.*,
          h.density,
          ROW_NUMBER() OVER (PARTITION BY b.lat_grid, b.lng_grid ORDER BY RANDOM()) as rn,
          'hotspot' as point_type
        FROM filtered_data b
        INNER JOIN hotspots h ON b.lat_grid = h.lat_grid AND b.lng_grid = h.lng_grid
      ),
      
      -- STEP 6: Temporal sampling from FILTERED data (excluding hotspots to avoid duplication)
      temporal_points AS (
        SELECT 
          b.*,
          ROW_NUMBER() OVER (
            PARTITION BY b.TBOXID, DATE_TRUNC('HOUR', b.MEAN_TIMESTAMP)
            ORDER BY RANDOM()
          ) as hour_rank,
          ROW_NUMBER() OVER (
            PARTITION BY b.TBOXID
            ORDER BY b.MEAN_TIMESTAMP
          ) as seq_num,
          'temporal' as point_type
        FROM filtered_data b
        CROSS JOIN sampling_params sp
        WHERE NOT EXISTS (
          SELECT 1 FROM hotspots h 
          WHERE h.lat_grid = b.lat_grid AND h.lng_grid = b.lng_grid
        )
      ),
      
      -- STEP 7: Route keypoints from FILTERED data (start/end of each journey)
      route_keypoints AS (
        SELECT 
          b.*,
          ROW_NUMBER() OVER (PARTITION BY b.TBOXID ORDER BY b.MEAN_TIMESTAMP) as point_seq,
          COUNT(*) OVER (PARTITION BY b.TBOXID) as total_tbox_points,
          'keypoint' as point_type
        FROM filtered_data b
      ),
      
      -- STEP 8: Combine all sampling strategies from FILTERED data
      sampled_points AS (
        -- Priority 1: Get hotspot samples (max ~50 points)
        SELECT 
          TBOXID, MEAN_LAT, MEAN_LONG, MEAN_TIMESTAMP, PROVINCE, DISTRICT, AREA,
          density as point_count,
          TRUE as is_hotspot,
          FALSE as is_keypoint,
          point_type
        FROM hotspot_points
        WHERE rn = 1  -- One representative per hotspot grid cell
        
        UNION ALL
        
        -- Priority 2: Get temporal samples (evenly distributed through time)
        SELECT 
          tp.TBOXID, tp.MEAN_LAT, tp.MEAN_LONG, tp.MEAN_TIMESTAMP, 
          tp.PROVINCE, tp.DISTRICT, tp.AREA,
          1 as point_count,
          FALSE as is_hotspot,
          FALSE as is_keypoint,
          tp.point_type
        FROM temporal_points tp
        CROSS JOIN sampling_params sp
        WHERE hour_rank = 1  -- One point per hour per TBox
          OR MOD(seq_num, sp.skip_factor) = 0  -- Plus systematic samples based on data volume
        
        UNION ALL
        
        -- Priority 3: Get route keypoints (start/end of each TBox journey)
        SELECT 
          TBOXID, MEAN_LAT, MEAN_LONG, MEAN_TIMESTAMP, PROVINCE, DISTRICT, AREA,
          1 as point_count,
          FALSE as is_hotspot,
          TRUE as is_keypoint,
          point_type
        FROM route_keypoints
        WHERE point_seq = 1                    -- First point of journey
          OR point_seq = total_tbox_points     -- Last point of journey
      ),
      
      -- STEP 9: Prioritize and limit to exactly 1000 points
      final_sample AS (
        SELECT 
          *,
          ROW_NUMBER() OVER (
            ORDER BY 
              CASE 
                WHEN is_hotspot THEN 1      -- Hotspots first (show where scooters spend time)
                WHEN is_keypoint THEN 2     -- Then keypoints (show routes)
                ELSE 3                       -- Then temporal samples (fill gaps)
              END,
              RANDOM()                       -- Random within priority group
          ) as priority_rank
        FROM sampled_points
      )
      
      -- STEP 10: Return final sampled data (max 1000 points)
      SELECT 
        TBOXID as tbox_id,
        CONCAT('TBox-', TBOXID) as name,
        MEAN_LAT as latitude,
        MEAN_LONG as longitude,
        MEAN_TIMESTAMP as timestamp,
        PROVINCE as province,
        DISTRICT as district,
        AREA as area,
        point_count,
        is_hotspot,
        is_keypoint
      FROM final_sample
      WHERE priority_rank <= 1000
      ORDER BY tbox_id, timestamp
    `;

    return sql;
  }, [buildDateRangeCondition, buildGeographicalCondition]);

  const fetchGeographicalData = useCallback(async () => {
    setLoadingGeographical(true);
    
    try {
      const sql = `
        SELECT DISTINCT 
          PROVINCE, 
          DISTRICT, 
          AREA 
        FROM REPORT_DB.GPS_DASHBOARD.TBOX_GPS_ENRICHED 
        WHERE PROVINCE IS NOT NULL AND PROVINCE != ''
          AND DISTRICT IS NOT NULL AND DISTRICT != ''
          AND AREA IS NOT NULL AND AREA != ''
        ORDER BY PROVINCE, DISTRICT, AREA
      `;

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      const provinces = new Set<string>();
      const districts: { [province: string]: string[] } = {};
      const areas: { [district: string]: string[] } = {};

      result.forEach((row: any) => {
        const province = row.PROVINCE;
        const district = row.DISTRICT;
        const area = row.AREA;

        provinces.add(province);

        if (!districts[province]) {
          districts[province] = [];
        }
        if (!districts[province].includes(district)) {
          districts[province].push(district);
        }

        if (!areas[district]) {
          areas[district] = [];
        }
        if (!areas[district].includes(area)) {
          areas[district].push(area);
        }
      });

      Object.keys(districts).forEach(province => {
        districts[province].sort();
      });
      
      Object.keys(areas).forEach(district => {
        areas[district].sort();
      });

      setGeographicalData({
        provinces: Array.from(provinces).sort(),
        districts,
        areas
      });

    } catch (err) {
      console.error('Error fetching geographical data:', err);
      setGeographicalData({
        provinces: [],
        districts: {},
        areas: {}
      });
    } finally {
      setLoadingGeographical(false);
    }
  }, []);

  const fetchAvailableTboxes = useCallback(async (filters: TBoxGPSFilters) => {
    setLoadingTboxes(true);
    
    try {
      let sql = `
        SELECT DISTINCT TBOXID 
        FROM REPORT_DB.GPS_DASHBOARD.TBOX_GPS_ENRICHED 
        WHERE 1=1
      `;

      sql += buildDateRangeCondition(filters);
      sql += buildGeographicalCondition(filters);
      sql += ` ORDER BY TBOXID LIMIT 1000`;

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      if (response.ok) {
        const result = await response.json();

        if (!result.error && result) {
          const tboxIds = result.map((row: any) => row.TBOXID);
          setAvailableTboxes(tboxIds);
        } else {
          console.error('Error in TBox query result:', result.error);
          setAvailableTboxes([]);
        }
      } else {
        console.error('Failed to fetch available TBoxes:', response.status);
        setAvailableTboxes([]);
      }
    } catch (err) {
      console.error('Error fetching available TBoxes:', err);
      setAvailableTboxes([]);
    } finally {
      setLoadingTboxes(false);
    }
  }, [buildDateRangeCondition, buildGeographicalCondition]);

  const fetchGPSData = useCallback(async (filters: TBoxGPSFilters) => {
    setLoading(true);
    setError(null);

    try {
      // First, get total count for compression ratio from FILTERED data
      const countSql = `
        SELECT COUNT(*) as total
        FROM REPORT_DB.GPS_DASHBOARD.TBOX_GPS_ENRICHED
        WHERE 1=1
          ${buildDateRangeCondition(filters)}
          ${buildGeographicalCondition(filters)}
          ${filters.selectedTboxes.length > 0 ? `AND TBOXID IN (${filters.selectedTboxes.join(',')})` : ''}
      `;

      const countResponse = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: countSql }),
      });

      let totalOriginalPoints = 0;
      if (countResponse.ok) {
        const countResult = await countResponse.json();
        totalOriginalPoints = countResult[0]?.TOTAL || 0;
      }

      // Then fetch sampled data
      const sql = buildGPSDataQuery(filters);
      
      console.log('Fetching GPS data with intelligent sampling (max 1000 points)');
      console.log('Applied filters:', {
        dateRange: filters.dateRange,
        quickTime: filters.quickTime,
        selectedTboxes: filters.selectedTboxes,
        selectedProvinces: filters.selectedProvinces,
        selectedDistricts: filters.selectedDistricts,
        selectedAreas: filters.selectedAreas,
      });

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const rawData = result || [];

      const tboxes: TBoxGPS[] = rawData.map((row: any) => ({
        id: String(row.TBOX_ID),
        name: row.NAME,
        latitude: parseFloat(row.LATITUDE),
        longitude: parseFloat(row.LONGITUDE),
        timestamp: row.TIMESTAMP,
        tboxId: row.TBOX_ID,
        province: row.PROVINCE,
        district: row.DISTRICT,
        area: row.AREA,
        pointCount: row.POINT_COUNT || 1,
        isHotspot: row.IS_HOTSPOT || false,
        isKeyPoint: row.IS_KEYPOINT || false,
      }));

      // Filter out invalid coordinates
      const validTboxes = tboxes.filter(t => 
        !isNaN(t.latitude) && !isNaN(t.longitude) && 
        t.latitude !== 0 && t.longitude !== 0
      );

      const totalTBoxes = validTboxes.length;
      const activeTBoxes = new Set(validTboxes.map(t => t.tboxId)).size;

      const latitudes = validTboxes.map(t => t.latitude);
      const longitudes = validTboxes.map(t => t.longitude);

      const averageLatitude =
        latitudes.length > 0
          ? latitudes.reduce((sum, lat) => sum + lat, 0) / latitudes.length
          : 0;
      const averageLongitude =
        longitudes.length > 0
          ? longitudes.reduce((sum, lng) => sum + lng, 0) / longitudes.length
          : 0;

      const compressionRatio = totalOriginalPoints > 0 && totalTBoxes > 0
        ? `${Math.round((totalOriginalPoints / totalTBoxes) * 10) / 10}:1`
        : 'N/A';

      const tboxGPSData: TBoxGPSData = {
        tboxes: validTboxes,
        totalTBoxes,
        activeTBoxes,
        averageLatitude: Math.round(averageLatitude * 1e6) / 1e6,
        averageLongitude: Math.round(averageLongitude * 1e6) / 1e6,
        samplingInfo: {
          originalPoints: totalOriginalPoints,
          sampledPoints: totalTBoxes,
          compressionRatio: compressionRatio,
          strategy: 'Intelligent Multi-Priority Sampling',
        },
      };

      console.log('Fetched data:', {
        totalOriginalPoints,
        sampledPoints: totalTBoxes,
        activeTBoxes,
        compressionRatio,
      });

      setData(tboxGPSData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching TBox GPS data:', err);
    } finally {
      setLoading(false);
    }
  }, [buildGPSDataQuery, buildDateRangeCondition, buildGeographicalCondition]);

// Modify the refetch function
const refetch = useCallback(() => {
  setRefetchCounter(prev => prev + 1);
}, []);

  // Fetch geographical data on mount
  useEffect(() => {
    fetchGeographicalData();
  }, [fetchGeographicalData]);

  // Fetch available TBoxes when filters change
  useEffect(() => {
    const hasValidDateRange = filters.dateRange?.from && filters.dateRange?.to;
    const hasQuickTime = filters.quickTime && filters.quickTime !== 'custom';

    if (hasValidDateRange || hasQuickTime) {
      fetchAvailableTboxes(filters);
    } else {
      setAvailableTboxes([]);
    }
  }, [
    filters.quickTime, 
    filters.dateRange, 
    filters.selectedProvinces,
    filters.selectedDistricts,
    filters.selectedAreas,
    fetchAvailableTboxes
  ]);

// Modify the useEffect
useEffect(() => {
  if (filters.shouldFetchData) {
    fetchGPSData(filters);
  }
}, [refetchCounter, filters.shouldFetchData, fetchGPSData]);

  return {
    data,
    loading,
    error,
    refetch,
    availableTboxes,
    loadingTboxes,
    geographicalData,
    loadingGeographical,
  };
};