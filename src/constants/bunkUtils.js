// constants/bunkUtils.js

// Google Places has no "on highway" flag, so we look for highway words in the
// bunk's name / address (NH 44, NH-48, SH 12, Highway, Bypass, Expressway ...)
const HIGHWAY_RE =
  /\b(?:NH|SH)[\s.\-]*\d+[A-Z]?\b|\bnational\s+highway\b|\bstate\s+highway\b|\bhighways?\b|\bhwy\b|\bbye?[\s\-]?pass\b|\bexpressway\b/i;

export function isHighwayBunk(bunk) {
  const text = `${bunk?.name || ''} ${bunk?.vicinity || ''} ${bunk?.address || ''}`;
  return HIGHWAY_RE.test(text);
}

const toRad = (v) => (v * Math.PI) / 180;

// Haversine distance in meters
export function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m) {
  if (!Number.isFinite(m)) return '';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function getBunkCoords(bunk) {
  const lat = bunk?.geometry?.location?.lat ?? bunk?.geometry?.location?.latitude;
  const lng = bunk?.geometry?.location?.lng ?? bunk?.geometry?.location?.longitude;
  if (lat == null || lng == null) return null;
  return { latitude: lat, longitude: lng };
}

export function titleCase(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}