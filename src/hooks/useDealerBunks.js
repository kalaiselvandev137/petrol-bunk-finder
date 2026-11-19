// hooks/useDealerBunks.js
import { useCallback, useEffect, useState } from 'react';
import { isHighwayBunk, titleCase } from '../constants/bunkUtils';
import { useAuth } from '../context/AuthContext';
import apiurl from '../services/apiendpoint';

const num = (...vals) => {
  for (const v of vals) {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

// Turn a dealer record into the same shape the map uses for Google places,
// so markers, list and routing work for both.
function normalizeDealer(d) {
  const lat = num(d.latitude, d.Latitude, d.lat, d.location?.latitude, d.location?.coordinates?.[1]);
  const lng = num(d.longitude, d.Longitude, d.lng, d.location?.longitude, d.location?.coordinates?.[0]);
  if (lat == null || lng == null) return null; // can't be drawn without coordinates

  const dealer = {
    place_id: `dealer-${d._id}`,
    name: d.Business_Name,
    vicinity: [d.Current_Address_Locality, d.Current_Address_State].filter(Boolean).join(', '),
    geometry: { location: { lat, lng } },
    isDealer: true,
    dealer: d,
    state: titleCase(d.Current_Address_State) || null,
    district: titleCase(d.District) || null, // saved by the backend
    searchText: [
      d.Business_Name, d.OMC, d.Lead_ID, d.Primary_Mobile,
      d.Current_Address_Locality, d.District, d.Current_Address_State,
    ].filter(Boolean).join(' ').toLowerCase(),
  };
  dealer.isHighway = isHighwayBunk(dealer);
  return dealer;
}

export function useDealerBunks() {
  const { token } = useAuth();
  const [dealerBunks, setDealerBunks] = useState([]);
  const [missingCoords, setMissingCoords] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiurl()}/dealers/apigetalldealersformap`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const rows = Array.isArray(json) ? json : json.resdata || json.data || [];
      const mapped = rows.map(normalizeDealer);
      setDealerBunks(mapped.filter(Boolean));
      setMissingCoords(mapped.filter((m) => !m).length);
    } catch (e) {
      console.warn('Dealer bunks load failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { dealerBunks, missingCoords, loading, reload: load };
}