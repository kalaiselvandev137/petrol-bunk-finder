import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import SearchInput from '../../components/SearchInput';
import { useLocation } from '../../hooks/useLocation';

const SEARCH_HISTORY_KEY = '@petrol_bunk_search_history';

export default function HomeScreen() {
  const router = useRouter();
  const { getCurrentLocation, loading: locationLoading } = useLocation();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);

      if (storedHistory) {
        setSearchHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.log('Error loading search history:', error);
    }
  };

  const saveToHistory = async (place) => {
    if (!place?.address || !place?.coords) {
      return;
    }

    try {
      const existingHistory = [...searchHistory];

      const filteredHistory = existingHistory.filter(
        (item) =>
          item.address.toLowerCase() !== place.address.toLowerCase()
      );

      const updatedHistory = [
        {
          address: place.address,
          coords: {
            latitude: place.coords.latitude,
            longitude: place.coords.longitude,
          },
        },
        ...filteredHistory,
      ];

      const limitedHistory = updatedHistory.slice(0, 5);

      await AsyncStorage.setItem(
        SEARCH_HISTORY_KEY,
        JSON.stringify(limitedHistory)
      );

      setSearchHistory(limitedHistory);
    } catch (error) {
      console.log('Error saving search history:', error);
    }
  };

  const removeHistoryItem = async (address) => {
    try {
      const updatedHistory = searchHistory.filter(
        (item) => item.address !== address
      );

      await AsyncStorage.setItem(
        SEARCH_HISTORY_KEY,
        JSON.stringify(updatedHistory)
      );

      setSearchHistory(updatedHistory);
    } catch (error) {
      console.log('Error removing history:', error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      setSearchHistory([]);
    } catch (error) {
      console.log('Error clearing search history:', error);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      const loc = await getCurrentLocation();

      const place = {
        address: loc.address,
        coords: loc.coords,
      };

      setFrom(place);

      // Save current location to history
      await saveToHistory(place);
    } catch (err) {
      Alert.alert('Location Error', err.message);
    }
  };

  const handleFromSelect = async (place) => {
    setFrom(place);
    await saveToHistory(place);
  };

  const handleToSelect = async (place) => {
    setTo(place);
    await saveToHistory(place);
  };

  const handleFindBunks = () => {
    if (!from) {
      Alert.alert(
        'Missing Location',
        'Please enter or select your starting location.'
      );
      return;
    }

    if (!to) {
      Alert.alert(
        'Missing Destination',
        'Please enter your destination.'
      );
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
    <KeyboardAvoidingView style={{ flex: 1 }} className="bg-blue-50" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 py-8">

          {/* Header */}
          <View className="items-center mb-8">
            <Text className="text-3xl font-bold text-gray-900 text-center">
              Petrol Bunk Finder
            </Text>

            <Text className="text-gray-500 text-center mt-2 text-sm">
              Find petrol bunks along your route
            </Text>
          </View>

          {/* Search Card */}
          <View className="bg-white rounded-3xl p-5 shadow-sm">

            {/* FROM */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                From
              </Text>

              <SearchInput
                placeholder="Enter starting location..."
                value={from?.address || ''}
                onPlaceSelect={handleFromSelect}
                onClear={() => setFrom(null)}
                leftIcon={
                  <View className="w-3 h-3 rounded-full bg-green-500" />
                }
                history={searchHistory}
                onHistorySelect={handleFromSelect}
                onHistoryRemove={removeHistoryItem}
                onClearHistory={clearSearchHistory}
              />

              {/* GPS button */}
              <TouchableOpacity
                className="flex-row items-center mt-2 ml-1"
                onPress={handleUseCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color="#3B82F6"/>
                ) : (
                  <Text className="text-blue-500 text-sm font-medium">
                    📍 Use my current location
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View className="flex-row items-center mb-4">
              <View className="flex-1 h-px bg-gray-100" />
              <View className="flex-1 h-px bg-gray-100" />
            </View>

            {/* TO */}
            <View className="mb-5">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                To
              </Text>

              <SearchInput placeholder="Enter destination..." value={to?.address || ''}
                onPlaceSelect={handleToSelect} onClear={() => setTo(null)}
                leftIcon={
                  <View className="w-3 h-3 rounded-full bg-red-500" />
                }
                history={searchHistory}
                onHistorySelect={handleToSelect}
                onHistoryRemove={removeHistoryItem}
                onClearHistory={clearSearchHistory}
              />
            </View>

            {/* Find Bunks */}
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center ${canSearch ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              onPress={handleFindBunks}
              disabled={!canSearch}
              activeOpacity={0.8}
            >
              <Text className={`font-bold text-lg ${canSearch ? 'text-white' : 'text-gray-400'}`}>
                Find Petrol Bunks
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info pills */}
          <View className="flex-row justify-center gap-3 mt-6 -z-10">
            {['Live Route', 'Nearby Bunks', 'Open Status'].map(
              (label) => (
                <View key={label} className="bg-orange-400 px-3 py-1.5 rounded-full border border-gray-100">
                  <Text className="text-white text-xs">{label}</Text>
                </View>
              )
            )}
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}