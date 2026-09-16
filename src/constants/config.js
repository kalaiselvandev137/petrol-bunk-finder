/**
 * Central app configuration.
 *
 * Expo SDK 49+ natively reads variables prefixed with EXPO_PUBLIC_ from .env
 * No babel plugin needed — just use process.env.EXPO_PUBLIC_*
 *
 * Make sure your .env file contains:
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_key_here
 */
export const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/** Google APIs base URLs */
export const GOOGLE_DIRECTIONS_URL =
  'https://maps.googleapis.com/maps/api/directions/json';

export const GOOGLE_PLACES_NEARBY_URL =
  'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

export const GOOGLE_PLACES_AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';

export const GOOGLE_PLACE_DETAILS_URL =
  'https://maps.googleapis.com/maps/api/place/details/json';

  export const GOOGLE_ROUTES_URL =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

/** Search radius (meters) around each point on the route to look for bunks */
export const BUNK_SEARCH_RADIUS = 3000;
