import { useCallback, useState } from 'react';
import {
  BUNK_SEARCH_RADIUS,
  GOOGLE_PLACES_NEARBY_URL,
  MAPS_API_KEY,
} from '../constants/config';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function usePetrolBunks() {
  const [bunks, setBunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callNearby = useCallback(async (url) => {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API error: ${data.status}`);
    }
    return data;
  }, []);

  /**
   * Fetch petrol bunks for a single coordinate point (first page only).
   */
  const fetchBunksAtPoint = useCallback(
    async ({ latitude, longitude }) => {
      const url =
        `${GOOGLE_PLACES_NEARBY_URL}` +
        `?location=${latitude},${longitude}` +
        `&radius=${BUNK_SEARCH_RADIUS}` +
        `&type=gas_station` +
        `&key=${MAPS_API_KEY}`;
      const data = await callNearby(url);
      return data.results || [];
    },
    [callNearby]
  );

  /**
   * Search for petrol bunks along the entire route by sampling waypoints.
   */
  const searchBunks = useCallback(
    async (waypointCoords) => {
      if (!waypointCoords || waypointCoords.length === 0) return;

      setLoading(true);
      setError(null);
      setBunks([]);

      try {
        const results = await Promise.all(waypointCoords.map((c) => fetchBunksAtPoint(c)));
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

  /**
   * "All bunks" mode: every bunk around a point, following Google's paging
   * (up to 3 pages = 60 results). New results are merged into the existing ones,
   * so panning and tapping "Search this area" keeps what was already found.
   */
  const searchArea = useCallback(
    async ({ latitude, longitude }, radius = 15000, { replace = false } = {}) => {
      setLoading(true);
      setError(null);
      if (replace) setBunks([]);

      try {
        let url =
          `${GOOGLE_PLACES_NEARBY_URL}` +
          `?location=${latitude},${longitude}` +
          `&radius=${Math.min(Math.round(radius), 50000)}` +
          `&type=gas_station` +
          `&key=${MAPS_API_KEY}`;

        const found = [];
        for (let page = 0; page < 3; page++) {
          const data = await callNearby(url);
          found.push(...(data.results || []));
          if (!data.next_page_token) break;
          await sleep(2000); // Google needs a moment before the token becomes valid
          url =
            `${GOOGLE_PLACES_NEARBY_URL}` +
            `?pagetoken=${data.next_page_token}` +
            `&key=${MAPS_API_KEY}`;
        }

        setBunks((prev) => {
          const map = new Map((replace ? [] : prev).map((b) => [b.place_id, b]));
          found.forEach((b) => map.set(b.place_id, b));
          return Array.from(map.values());
        });
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [callNearby]
  );

  return { searchBunks, searchArea, bunks, loading, error };
}