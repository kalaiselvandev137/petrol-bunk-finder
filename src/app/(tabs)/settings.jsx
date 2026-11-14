import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SOFT_SHADOW } from '../../constants/theme';
import { useAttendance } from '../../context/AttendanceContext';
import { useAuth } from '../../context/AuthContext';
import apiurl from '../../services/apiendpoint';

function MenuItem({ icon, iconBg, label, sub, onPress }) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-4 mb-2.5 border border-[#E3EBF6]"
      style={SOFT_SHADOW}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center flex-1">
        <View className={`w-11 h-11 rounded-xl items-center justify-center ${iconBg}`}>
          {icon}
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-[#0B2559] text-[15px] font-semibold">{label}</Text>
          <Text className="text-[#7A8AA8] text-xs mt-0.5">{sub}</Text>
        </View>
      </View>
      <AntDesign name="right" size={16} color={COLORS.faint} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { token, logout } = useAuth();
  const { checkedIn } = useAttendance();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const fetchProfile = async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setError(null);

    try {
      const response = await fetch(`${apiurl()}/employees/apigetprofile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
  const displayRole = profile?.Role || 'Member';

  const imagePath = Array.isArray(profile?.Image) ? profile.Image[0] : null;
  const avatarUri = imagePath ? `${apiurl()}/${imagePath}` : null;

  const handleLogout = () => {
    if (checkedIn) {
      Alert.alert('Check out first', 'You are still checked in. Check out from the Home screen before logging out.');
      return;
    }
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
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
      { cancelable: true }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F7FB] items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.blue} />
        <Text className="text-[#5B6B8C] mt-3 text-sm">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0B2559]" edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        className="flex-1 bg-[#F4F7FB]"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.blue}
            colors={[COLORS.blue]}
          />
        }
      >
        {/* Hero */}
        <View className="bg-[#0B2559] rounded-b-[36px] px-5 pt-4 pb-8 overflow-hidden">
          <View
            className="absolute w-44 h-44 rounded-full"
            style={{ top: -50, right: -40, backgroundColor: 'rgba(10,91,255,0.4)' }}
          />
          <View
            className="absolute w-32 h-32 rounded-full"
            style={{ bottom: -40, left: -30, backgroundColor: 'rgba(0,224,198,0.2)' }}
          />

          <Text className="text-3xl font-extrabold text-white">Settings</Text>
          <Text className="text-[#7DF3E6] text-sm mt-1">Manage your account & preferences</Text>

          <View className="items-center mt-6">
            <View className="relative">
              <Image
                source={
                  avatarUri
                    ? { uri: avatarUri }
                    : require('../../../assets/images/petrol-maps/profile.png')
                }
                className="w-24 h-24 rounded-full border-4 border-[#00E0C6] bg-white"
                resizeMode="cover"
              />
              <View className="absolute bottom-1 right-1 w-5 h-5 bg-[#00E0C6] rounded-full border-2 border-[#0B2559]" />
            </View>

            <Text className="text-xl font-bold text-white mt-4 text-center">
              {displayName}
            </Text>

            <View className="bg-[#00E0C6] px-3.5 py-1.5 rounded-full mt-2.5">
              <Text className="text-[#0B2559] text-xs font-bold">{displayRole}</Text>
            </View>
          </View>
        </View>

        {/* Menu Section */}
        <View className="mt-6 px-5">
          <Text className="text-sm font-semibold text-[#5B6B8C] mb-3 px-1">Account</Text>

          <MenuItem
            iconBg="bg-[#E8F0FF]"
            icon={<MaterialCommunityIcons name="account-badge-outline" size={22} color={COLORS.blue} />}
            label="My Account"
            sub="View & edit profile details"
            onPress={() => router.push('/account')}
          />

          <MenuItem
            iconBg="bg-[#E6FBF8]"
            icon={<FontAwesome5 name="people-carry" size={20} color={COLORS.teal} />}
            label="My Dealers"
            sub="View dealer information"
            onPress={() => router.push('/dealers')}
          />

          <MenuItem
            iconBg="bg-[#E6FBF8]"
            icon={<MaterialCommunityIcons name="cart-outline" size={22} color={COLORS.teal} />}
            label="Today's Sales"
            sub="View sales & collections"
            onPress={() => router.push('/sales')}
          />
        </View>

        {/* Logout */}
        <View className="mt-6 px-5">
          <TouchableOpacity
            className="bg-white border border-[#F6D3D5] rounded-2xl py-4 flex-row items-center justify-center"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
            <Text className="text-[#D93036] text-base font-semibold ml-2">Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="mt-10 items-center">
          <Text className="text-[#7A8AA8] text-xs">FuelPay | Petrofinance Innovations</Text>
          <Text className="text-[#9AA9C2] text-[11px] mt-1">Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}