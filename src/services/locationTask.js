import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { isAttendanceActiveToday } from './attendanceState';
import { endTrackingSession, enqueuePoints, flushTrackingQueue } from './trackingApi';

export const LOCATION_TASK = 'salesman-location-task';

const MAX_ACCURACY_M = 100;

export const toPoint = (loc) => ({
  latitude: loc.coords.latitude,
  longitude: loc.coords.longitude,
  accuracy: loc.coords.accuracy ?? null,
  speed: loc.coords.speed ?? null,
  timestamp: loc.timestamp,
});

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;

  const token = await AsyncStorage.getItem('auth_token');
  if (!token) return; // logged out

  // Tracking now follows attendance, not a fixed 9-7 window.
  // Not checked in (or the IST day rolled over without a check-out): shut everything down.
  if (!(await isAttendanceActiveToday())) {
    try {
      await stopLocationTask();
      await endTrackingSession();
    } catch {}
    return;
  }

  const points = data.locations
    .filter((l) => l.coords.accuracy == null || l.coords.accuracy <= MAX_ACCURACY_M)
    .map(toPoint);

  if (points.length) {
    await enqueuePoints(points);
    await flushTrackingQueue();
  }
});

export const isLocationTaskRunning = () => Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);

export async function startLocationTask() {
  if (await isLocationTaskRunning()) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000,
    distanceInterval: 50,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Petrol Maps',
      notificationBody: 'Location is being shared with your company while you are checked in',
      notificationColor: '#2563EB',
    },
  });
}

export async function stopLocationTask() {
  if (await isLocationTaskRunning()) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
