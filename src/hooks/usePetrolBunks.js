import { useCallback, useState } from 'react';
import {
  BUNK_SEARCH_RADIUS,
  GOOGLE_PLACES_NEARBY_URL,
  MAPS_API_KEY,
} from '../constants/config';

export function usePetrolBunks() {
  const [bunks, setBunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch petrol bunks for a single coordinate point.
   */
  const fetchBunksAtPoint = useCallback(async ({ latitude, longitude }) => {
    const url =
      `${GOOGLE_PLACES_NEARBY_URL}` +
      `?location=${latitude},${longitude}` +
      `&radius=${BUNK_SEARCH_RADIUS}` +
      `&type=gas_station` +
      `&key=${MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API error: ${data.status}`);
    }

    return data.results || [];
  }, []);

  /**
   * Search for petrol bunks along the entire route by sampling waypoints.
   * @param {{ latitude: number, longitude: number }[]} waypointCoords
   */
  const searchBunks = useCallback(
    async (waypointCoords) => {
      if (!waypointCoords || waypointCoords.length === 0) return;

      setLoading(true);
      setError(null);
      setBunks([]);

      try {
        // Fire all waypoint searches in parallel
        const results = await Promise.all(
          waypointCoords.map((coord) => fetchBunksAtPoint(coord))
        );

        // Flatten and deduplicate by place_id
        const seen = new Set();
        const unique = results.flat().filter((place) => {
          if (seen.has(place.place_id)) return false;
          seen.add(place.place_id);
          return true;
        });

        setBunks(unique);
        return unique;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchBunksAtPoint]
  );

  return { searchBunks, bunks, loading, error };
}