import AsyncStorage from '@react-native-async-storage/async-storage';
import { istDate } from './trackingApi';

// Stored on the phone so the background task (no React, maybe no network)
// can tell whether the salesman is checked in today.
const KEY = 'attendance_active_date';

export const setAttendanceActive = (on) =>
  on ? AsyncStorage.setItem(KEY, istDate()) : AsyncStorage.removeItem(KEY);

export const isAttendanceActiveToday = async () => (await AsyncStorage.getItem(KEY)) === istDate();
