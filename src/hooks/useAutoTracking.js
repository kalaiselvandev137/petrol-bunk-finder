import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { startLocationTask } from '../services/locationTask';
import { ensureTrackingSession, flushTrackingQueue } from '../services/trackingApi';

// Resolves once the app is in the foreground (e.g. after returning from system Settings)
const waitForActive = () =>
  new Promise((resolve) => {
    if (AppState.currentState === 'active') return resolve();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        sub.remove();
        resolve();
      }
    });
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function useAutoTracking({ enabled, userKey }) {
  const busy = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const run = async () => {
      // Android only allows starting the foreground service while the app is visible
      if (busy.current || AppState.currentState !== 'active') return;
      busy.current = true;
      try {
        let fg = await Location.getForegroundPermissionsAsync();
        if (fg.status !== 'granted') fg = await Location.requestForegroundPermissionsAsync();
        if (fg.status !== 'granted') return;

        let bg = await Location.getBackgroundPermissionsAsync();
        if (bg.status !== 'granted') bg = await Location.requestBackgroundPermissionsAsync();
        if (bg.status !== 'granted') return;

        // coming back from the Settings screen: wait until the app is really active
        await waitForActive();
        await sleep(500);

        await ensureTrackingSession(); // also rolls over to a new session on a new day
        await startLocationTask();
        await flushTrackingQueue();
      } catch (e) {
        console.warn('Auto tracking:', e.message);
      } finally {
        busy.current = false;
      }
    };

    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
  }, [enabled, userKey]);
}