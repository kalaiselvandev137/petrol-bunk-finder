import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import SearchInput from '../../components/SearchInput';
import { useLocation } from '../../hooks/useLocation';


export default function HomeScreen() {
  const router = useRouter();
  const { getCurrentLocation, loading: locationLoading } = useLocation();

  const [from, setFrom] = useState(null);   // { address, coords }
  const [to, setTo] = useState(null);       // { address, coords }

  /** Auto-fill "From" with GPS current location */
  const handleUseCurrentLocation = async () => {
    try {
      const loc = await getCurrentLocation();
      setFrom({ address: loc.address, coords: loc.coords });
    } catch (err) {
      Alert.alert('Location Error', err.message);
    }
  };

  /** Navigate to map screen passing origin/destination as params */
  const handleFindBunks = () => {
    if (!from) {
      Alert.alert('Missing Location', 'Please enter or select your starting location.');
      return;
    }
    if (!to) {
      Alert.alert('Missing Destination', 'Please enter your destination.');
      return;
    }

    router.push({
      pathname: '/map',
      params: {
        fromAddress: from.address,
        fromLat: from.coords.latitude,
        fromLng: from.coords.longitude,
        toAddress: to.address,
        toLat: to.coords.latitude,
        toLng: to.coords.longitude,
      },
    });
  };

  const canSearch = from && to;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-blue-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 py-8">

          {/* Header */}
          <View className="items-center mb-8">
              <Image
                source={require('../../../assets/images/petrol-maps/logo.png')} className="w-24 h-24 mb-4"
                resizeMode="contain"
              />
            <Text className="text-3xl font-bold text-gray-900 text-center">
              Petrol Bunk Finder
            </Text>
            <Text className="text-gray-500 text-center mt-2 text-sm">
              Find petrol bunks along your route
            </Text>
          </View>

          {/* Search Card */}
          <View className="bg-white rounded-3xl p-5 shadow-sm">

            {/* FROM field */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                From
              </Text>
              <SearchInput
                placeholder="Enter starting location..."
                value={from?.address || ''}
                onPlaceSelect={(place) => setFrom(place)}
                 onClear={() => setFrom(null)}
                leftIcon={
                  <View className="w-3 h-3 rounded-full bg-green-500" />
                }
              />
              {/* GPS button */}
              <TouchableOpacity
                className="flex-row items-center mt-2 ml-1"
                onPress={handleUseCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Text className="text-blue-500 text-sm font-medium">
                    📍 Use my current location
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider with swap hint */}
            <View className="flex-row items-center mb-4">
              <View className="flex-1 h-px bg-gray-100" />
              <View className="mx-3 w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <Text className="text-gray-400 text-base">↕</Text>
              </View>
              <View className="flex-1 h-px bg-gray-100" />
            </View>

            {/* TO field */}
            <View className="mb-5">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                To
              </Text>
              <SearchInput
                placeholder="Enter destination..."
                value={to?.address || ''}
                onPlaceSelect={(place) => setTo(place)}
                onClear={() => setTo(null)}
                leftIcon={
                  <View className="w-3 h-3 rounded-full bg-red-500" />
                }
              />
            </View>

            {/* Find Bunks Button */}
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center ${
                canSearch ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              onPress={handleFindBunks}
              disabled={!canSearch}
              activeOpacity={0.8}
            >
              <Text
                className={`font-bold text-lg ${
                  canSearch ? 'text-white' : 'text-gray-400'
                }`}
              >
                Find Petrol Bunks
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info pills */}
          <View className="flex-row justify-center gap-3 mt-6 -z-10">
            {['Live Route', 'Nearby Bunks', 'Open Status'].map((label) => (
              <View
                key={label}
                className="bg-orange-400 px-3 py-1.5 rounded-full border border-gray-100"
              >
                <Text className="text-white text-xs">{label}</Text>
              </View>
            ))}
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}