import { useCallback, useState } from 'react';
import { GOOGLE_ROUTES_URL, MAPS_API_KEY } from '../constants/config';

/**
 * Decode a Google Maps encoded polyline string into lat/lng coordinate pairs.
 * @param {string} encoded
 * @returns {{ latitude: number, longitude: number }[]}
 */
function decodePolyline(encoded) {
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return poly;
}

/**
 * Sample N evenly-spaced waypoints from a polyline array.
 * Used to pick candidate points for the petrol bunk nearby search.
 */
function sampleWaypoints(polyline, count = 8) {
  if (polyline.length <= count) return polyline;
  const step = Math.floor(polyline.length / count);
  return polyline.filter((_, i) => i % step === 0).slice(0, count);
}

function formatDuration(secondsStr) {
  const totalSeconds = parseInt(secondsStr.replace('s', ''), 10);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.round((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs} hr ${mins} min`;
  return `${mins} min`;
}

function formatDistance(meters) {
  const km = meters / 1000;
  return km >= 1 ? `${km.toFixed(1)} km` : `${meters} m`;
}

export function useDirections() {
  const [routeCoords, setRouteCoords] = useState([]);
  const [waypointCoords, setWaypointCoords] = useState([]);
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch a driving route between origin and destination.
   * @param {{latitude:number, longitude:number}} origin
   * @param {{latitude:number, longitude:number}} destination
   * @param {{ updateWaypoints?: boolean }} options
   *   - updateWaypoints (default true): also update waypointCoords used for bunk search.
   *     Set to false when navigating to a selected bunk so we don't re-trigger bunk search.
   */
  const fetchRoute = useCallback(async (origin, destination, options = {}) => {
    const { updateWaypoints = true } = options;
    if (!origin || !destination) {
      console.warn('fetchRoute: Missing origin or destination', { origin, destination });
      return;
    }

    setLoading(true);
    setError(null);
    setRouteCoords([]);
    if (updateWaypoints) {
      setWaypointCoords([]);
    }

    try {
      // Validate API key
      if (!MAPS_API_KEY) {
        throw new Error('Google Maps API key is not configured. Check your .env file.');
      }

      const body = {
        origin: {
          location: {
            latLng: { 
              latitude: parseFloat(origin.latitude), 
              longitude: parseFloat(origin.longitude) 
            },
          },
        },
        destination: {
          location: {
            latLng: { 
              latitude: parseFloat(destination.latitude), 
              longitude: parseFloat(destination.longitude) 
            },
          },
        },
        travelMode: 'DRIVE',
        polylineQuality: 'OVERVIEW',
        computeAlternativeRoutes: false,
      };

      // console.log('Fetching route with body:', JSON.stringify(body, null, 2));
      

      const response = await fetch(GOOGLE_ROUTES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': MAPS_API_KEY,
          'X-Goog-FieldMask':
            'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // console.log('Routes API Response:', data);

      // Check for API errors
      if (!response.ok) {
        throw new Error(
          `Routes API error: ${response.status} – ${data.error?.message || JSON.stringify(data)}`
        );
      }

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found. Try different origin/destination coordinates.');
      }

      const route = data.routes[0];
      
      // Handle both possible polyline formats
      let polylineString = route.polyline?.encodedPolyline;
      
      if (!polylineString) {
        console.error('No encodedPolyline in response:', route);
        throw new Error('No polyline data received from Google Routes API');
      }

      const decoded = decodePolyline(polylineString);

      if (decoded.length === 0) {
        throw new Error('Failed to decode polyline');
      }

      // console.log('Decoded polyline coordinates:', decoded.length, 'points');
      

      setRouteCoords(decoded);
      if (updateWaypoints) {
        const waypoints = sampleWaypoints(decoded, 8);
        // console.log('Setting waypoints:', waypoints.length, 'points');
        setWaypointCoords(waypoints);
      }

      // Format and set duration and distance
      const formattedDuration = route.duration ? formatDuration(route.duration) : '';
      const formattedDistance = route.distanceMeters ? formatDistance(route.distanceMeters) : '';
      
      setDuration(formattedDuration);
      setDistance(formattedDistance);

      // console.log('Route fetched successfully. Duration:', formattedDuration, 'Distance:', formattedDistance);

      return decoded;
    } catch (err) {
      console.error('fetchRoute error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchRoute, routeCoords, waypointCoords, duration, distance, loading, error };
}