import { useEffect, useState } from 'react';

type AreaStations = Record<string, string[]>;

let cachedData: AreaStations | null = null;
let cacheTimestamp: number | null = null;
const ONE_DAY = 24 * 60 * 60 * 1000;

export const useAreaStations = () => {
  const [data, setData] = useState<AreaStations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isCached = cachedData && cacheTimestamp && Date.now() - cacheTimestamp < ONE_DAY;
    if (isCached) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: 'SELECT DISTINCT(LOCATIONNAME) AS AREA, STATIONNAME AS STATION FROM DB_DUMP.PUBLIC.MY_REVENUESUMMARY ORDER BY AREA, STATION',
          }),
        });
      
        if (!res.ok && res.status === 404) {
          setError('No area stations found.');
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const errorResponse = { error: "Failed to fetch area stations" };
          throw new Error(errorResponse.error || 'Unknown server error');
        }
        const rows: { AREA: string; STATION: string }[] = await res.json();
        
        // console.log('Fetched area stations:', rows);

        if (!rows || rows.length === 0) {
          setError('No area stations found.');
          setLoading(false);
          return;
        }        
        // // Simulating data fetch for demonstration purposes
        // const rows: { AREA: string; STATION: string }[] = [
        //   { AREA: "Central", STATION: "Central Station" }
        // ];

        const grouped: AreaStations = {};
        for (const { AREA, STATION } of rows) {
          if (!grouped[AREA]) grouped[AREA] = [];
          grouped[AREA].push(STATION);
        }

        // console.log('Grouped area stations:', grouped);

        cachedData = grouped;
        cacheTimestamp = Date.now();
        setData(grouped);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Something went wrong while fetching area stations.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};
