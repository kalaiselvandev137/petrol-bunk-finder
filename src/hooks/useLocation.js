import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

/**
 * useLocation – requests device GPS permission, returns the current location
 * as both coordinates and a human-readable address string.
 */
export function useLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Ask for permission and return:
   * {
   *   coords: { latitude, longitude },
   *   address: "Human readable address string"
   * }
   */
  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied. Please enable location access in settings.');
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode using Expo's built-in geocoder
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const address = [
        place.name,
        place.street,
        place.city,
        place.region,
      ]
        .filter(Boolean)
        .join(', ');

      return {
        coords: { latitude, longitude },
        address: address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getCurrentLocation, loading, error };
}