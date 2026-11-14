import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiurl from '../services/apiendpoint';

export const monthParam = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * Loads a monthly summary from the backend.
 * @param {string} path   e.g. '/dpd-collection/apigetsalespersonmonthlysummary'
 * @param {Date}   month  any date inside the wanted month
 */
export function useMonthlySummary(path, month) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      const current = ++seq.current;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiurl()}${path}?month=${monthParam(month)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (current !== seq.current) return; // stale response (fast month switching)
        if (!json.success) throw new Error(json.message || 'Request failed');
        setData(json);
      } catch (e) {
        if (current === seq.current) setError('Could not load the monthly summary. Pull down to retry.');
      } finally {
        if (current === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token, path, month]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, refreshing, error, reload: () => load(), refresh: () => load(true) };
}