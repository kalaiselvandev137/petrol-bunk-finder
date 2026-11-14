import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../../global.css';
import SplashVideo from '../components/SplashVideo';
import TrackingConsentModal from '../components/Tracking/TrackingConsentModal';
import { AttendanceProvider, useAttendance } from '../context/AttendanceContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useAutoTracking } from '../hooks/useAutoTracking';
import '../services/locationTask'; // registers the background task at app start
import { apiGetTrackingConsent, apiSaveTrackingConsent } from '../services/trackingApi';

SplashScreen.preventAutoHideAsync(); // keep native splash until the video view is ready

// Shows the one-time consent notice, then tracks while the salesman is checked in (salesmen only)
function TrackingGate() {
  const { user, token } = useAuth();
  const { checkedIn } = useAttendance();
  const [consent, setConsent] = useState(null); // null = unknown / loading
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (!user || !token || (user.Role && user.Role !== 'Sales_Man')) {
      setConsent(null);
      setDeclined(false);
      return;
    }
    apiGetTrackingConsent()
      .then((r) => setConsent(!!r.accepted))
      .catch(() => setConsent(null)); // offline: don't prompt, don't track
  }, [user, token]);

  // tracking runs only between check-in and check-out
  useAutoTracking({ enabled: consent === true && checkedIn, userKey: user?.Email });

  const accept = async () => {
    try {
      await apiSaveTrackingConsent();
      setConsent(true);
    } catch {
      // stays on the notice; the user can tap again
    }
  };

  return (
    <TrackingConsentModal
      visible={!!user && consent === false && !declined}
      onAccept={accept}
      onDecline={() => setDeclined(true)} // asked again at next login
    />
  );
}

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [videoDone, setVideoDone] = useState(false);

  const onLayoutRootView = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const handleFinish = useCallback(() => setVideoDone(true), []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  const showSplash = !videoDone || isLoading;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView} >
      <StatusBar style="dark" />

      {/* Stack stays mounted so router.replace works while the splash covers it */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />

        <Stack.Screen name="map" options={{ presentation: 'card' }} />

        <Stack.Screen
          name="account"
          options={{ headerShown: true, title: 'My Account', presentation: 'card' }}
        />
        <Stack.Screen
          name="dealers"
          options={{ headerShown: true, title: 'My Dealers', presentation: 'card' }}
        />
      </Stack>

      {/* Hold the consent modal back so it never appears over the video */}
      {!showSplash && <TrackingGate />}

      {showSplash && <SplashVideo onFinish={handleFinish} />}
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AttendanceProvider>
        <RootLayoutNav />
      </AttendanceProvider>
    </AuthProvider>
  );
}
