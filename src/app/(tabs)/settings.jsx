import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileCard from '../../components/settings/profilecard';
import { useAuth } from '../../context/AuthContext';
import apiurl from '../../services/apiendpoint';


export default function SettingsScreen() {
  const { token, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setError(null);

    try {
      const response = await fetch(
        `${apiurl()}/employees/apigetprofile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to load profile');
      }

      setProfile(data);
    } catch (e) {
      console.error('Failed to fetch profile:', e);
      setError(e.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProfile({ silent: true });
  };

  const fullName = [profile?.First_Name, profile?.Last_Name]
    .filter(Boolean)
    .join(' ');
  const displayName = fullName || 'Guest User';
  const displayEmail = profile?.Email || 'No email on file';
  const displayMobile = profile?.Mobilenumber || '—';
  const displayRole = profile?.Role || 'Member';
  const displayStatus = profile?.Status || '—';

  const imagePath = Array.isArray(profile?.Image) ? profile.Image[0] : null;
  const avatarUri = imagePath
    ? `${apiurl()}/${imagePath}`
    : null;

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout failed:', error);
            }
          },
        },
      ],
      {
        cancelable: true,
      }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text className="text-gray-500 mt-3">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6" showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >

        <ProfileCard avatarUri={avatarUri} displayName={displayName} displayEmail={displayEmail}
          displayMobile={displayMobile} displayRole={displayRole} displayStatus={displayStatus}
        />

        {/* App preferences placeholder */}
        <View className="bg-gray-50 rounded-2xl p-5 mb-6">
          <Text className="text-gray-900 font-bold mb-1">Preferences</Text>
          <Text className="text-gray-500 text-sm">
            App preferences, search radius, and brand filter defaults will
            live here.
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity className="w-full bg-red-500 rounded-xl py-4 mb-10 items-center" onPress={handleLogout}>
          <Text className="text-white text-base font-bold">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}