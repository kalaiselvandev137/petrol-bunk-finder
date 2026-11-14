import * as FileSystem from 'expo-file-system/legacy'; // SDK 53 or older: 'expo-file-system'
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import apiurl from '../services/apiendpoint';
import { isAttendanceActiveToday, setAttendanceActive } from '../services/attendanceState';
import { stopLocationTask } from '../services/locationTask';
import { endTrackingSession, istDate } from '../services/trackingApi';
import { useAuth } from './AuthContext';

// Mount path of attendanceRouter on your server (app.use('/attendance', attendanceRouter))
const BASE = '/attendance';

const AttendanceContext = createContext(null);

async function api(path, token, { method = 'GET', body } = {}) {
  const res = await fetch(`${apiurl()}${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || json.error || `Request failed (${res.status})`);
  }
  return json;
}

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export function AttendanceProvider({ children }) {
  const { token } = useAuth();
  const [record, setRecord] = useState(null);
  const [localActive, setLocalActive] = useState(false); // fallback when offline
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // ignore a record left over from yesterday if the app stayed open past midnight
  const attendance = record && record.date === istDate() ? record : null;
  const checkedIn = attendance ? !!attendance.checkInAt && !attendance.checkOutAt : localActive;
  const onLeave = (attendance?.status || '').toLowerCase().startsWith('leave');

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const json = await api('/apigetmyattendancetoday', token);
      const rec = json.attendance || null;
      const active = !!rec?.checkInAt && !rec?.checkOutAt;
      setRecord(rec);
      setLocalActive(active);
      await setAttendanceActive(active);
    } catch {
      setLocalActive(await isAttendanceActiveToday()); // offline: trust this phone
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setRecord(null);
      setLocalActive(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();
  }, [token, refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

const checkIn = async () => {
  setBusy(true);
  try {
    // 1. location (unchanged)
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') throw new Error('Location permission is required to check in.');
    let pos;
    try {
      pos = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        15000
      );
    } catch {
      throw new Error('Could not get your location. Turn on GPS and try again.');
    }

    // 2. live selfie
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) throw new Error('Camera permission is required to verify your face.');

    const shot = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: false,
      quality: 0.6,
    });
    if (shot.canceled) return; // user backed out, no error

    const asset = shot.assets[0];

    // 3. upload selfie + location together
    const res = await FileSystem.uploadAsync(`${apiurl()}${BASE}/apicheckin`, asset.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'selfie',
      mimeType: asset.mimeType || 'image/jpeg',
      parameters: {
        latitude: String(pos.coords.latitude),
        longitude: String(pos.coords.longitude),
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    let json = {};
    try { json = JSON.parse(res.body); } catch {}
    if (res.status < 200 || res.status >= 300 || json.success === false) {
      throw new Error(json.message || `Check-in failed (${res.status})`);
    }

    await setAttendanceActive(true);
    setLocalActive(true);
    setRecord(json.attendance);
  } finally {
    setBusy(false);
  }
};

  const checkOut = async () => {
    setBusy(true);
    try {
      // best-effort location; checking out must work even without GPS
      let point = {};
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.granted) {
          const p = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            8000
          );
          point = { latitude: p.coords.latitude, longitude: p.coords.longitude };
        }
      } catch {}

      // if this fails (offline) we throw before touching tracking, so the trail keeps recording
      const json = await api('/apicheckout', token, { method: 'POST', body: point });

      await setAttendanceActive(false);
      try {
        await stopLocationTask();
        await endTrackingSession(); // uploads leftovers + closes the session while the token is valid
      } catch (e) {
        console.warn('Tracking cleanup failed', e);
      }
      setLocalActive(false);
      setRecord(json.attendance);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AttendanceContext.Provider
      value={{ attendance, checkedIn, onLeave, loading, busy, refresh, checkIn, checkOut }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be used within AttendanceProvider');
  return ctx;
}
