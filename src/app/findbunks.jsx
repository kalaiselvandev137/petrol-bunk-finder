import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import SearchInput from '../components/SearchInput';
import { BUTTON_SHADOW, CARD_SHADOW } from '../constants/theme';
import { useLocation } from '../hooks/useLocation';

const SEARCH_HISTORY_KEY = '@petrol_bunk_search_history';

export default function FindBunksScreen() {
  const router = useRouter();
  const { getCurrentLocation, loading: locationLoading } = useLocation();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [mode, setMode] = useState('route'); // 'route' | 'all'
  const isAll = mode === 'all';

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (storedHistory) setSearchHistory(JSON.parse(storedHistory));
    } catch (error) {
      console.log('Error loading search history:', error);
    }
  };

  const saveToHistory = async (place) => {
    if (!place?.address || !place?.coords) return;
    try {
      const filteredHistory = searchHistory.filter(
        (item) => item.address.toLowerCase() !== place.address.toLowerCase()
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
      ].slice(0, 5);

      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
      setSearchHistory(updatedHistory);
    } catch (error) {
      console.log('Error saving search history:', error);
    }
  };

  const removeHistoryItem = async (address) => {
    try {
      const updatedHistory = searchHistory.filter((item) => item.address !== address);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
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
      const place = { address: loc.address, coords: loc.coords };
      setFrom(place);
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

  // All-bunks mode: no location needed – the map opens on your position and shows everything
  const handleShowAllBunks = () => {
    router.push({ pathname: '/map', params: { mode: 'all' } });
  };

  const handleFindBunks = () => {
    if (isAll) {
      handleShowAllBunks();
      return;
    }
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

  const canSearch = isAll ? true : !!(from && to);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} className="bg-[#F4F7FB]" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />

      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="bg-[#0B2559] rounded-b-[40px] px-6 pt-14 pb-14 overflow-hidden">
          <View className="absolute w-48 h-48 rounded-full"
            style={{ top: -40, right: -48, backgroundColor: 'rgba(10,91,255,0.4)' }}
          />
          <View className="absolute w-28 h-28 rounded-full"
            style={{ top: 64, right: -16, backgroundColor: 'rgba(0,229,255,0.2)' }}
          />
          <View className="absolute w-40 h-40 rounded-full"
            style={{ bottom: -48, left: -40, backgroundColor: 'rgba(0,224,198,0.2)' }}
          />

          <TouchableOpacity className="w-10 h-10 rounded-full items-center justify-center mb-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
            onPress={() => router.back()} activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-2xl bg-[#0A5BFF] items-center justify-center border-2 border-[#00E5FF]">
              <Text className="text-2xl">⛽</Text>
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-3xl font-extrabold text-white">Petrol Bunk Finder</Text>
              <Text className="text-[#7DF3E6] text-sm mt-1">Find petrol bunks along your route</Text>
            </View>
          </View>
        </View>

        {/* Search section */}
        <View className="flex-1 px-5 justify-center pb-12 pt-3">
          <View className="bg-white rounded-3xl p-5 border border-[#E3EBF6]" style={{ ...CARD_SHADOW, zIndex: 10 }}>
            {/* Mode toggle */}
            <View className="flex-row bg-[#F1F5FB] rounded-2xl p-1 mb-5">
              {[
                { id: 'route', label: '🛣️ Along route' },
                { id: 'all', label: '⛽ All bunks' },
              ].map((m) => {
                const active = mode === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    className="flex-1 py-2.5 rounded-xl items-center"
                    style={active ? { backgroundColor: '#0A5BFF' } : null}
                    onPress={() => setMode(m.id)}
                    activeOpacity={0.8}
                  >
                    <Text className="text-sm font-semibold" style={{ color: active ? '#FFFFFF' : '#5B6B8C' }}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* FROM */}
            {!isAll && (
            <View className="mb-4">
              <Text className="text-sm font-semibold text-[#0B2559] mb-2 ml-1">
                {isAll ? 'Search around (optional)' : 'From'}
              </Text>

              <SearchInput
                placeholder="Enter starting location..."
                value={from?.address || ''}
                onPlaceSelect={handleFromSelect}
                onClear={() => setFrom(null)}
                leftIcon={
                  <View className="w-3 h-3 rounded-full bg-[#00C9B1] border-2 border-[#C9F7F0]" />
                }
                history={searchHistory}
                onHistorySelect={handleFromSelect}
                onHistoryRemove={removeHistoryItem}
                onClearHistory={clearSearchHistory}
              />

              <TouchableOpacity
                className="flex-row items-center self-start mt-3 ml-1 px-3 py-2 rounded-full bg-[#E6FBF8]"
                onPress={handleUseCurrentLocation}
                disabled={locationLoading}
                activeOpacity={0.7}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color="#0A8F8F" />
                ) : (
                  <Text className="text-[#0A8F8F] text-sm font-semibold">
                    📍 Use my current location
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            )}

            {isAll && (
              <Text className="text-xs text-[#7A8AA8] mb-5 ml-1">
                No location needed. The map opens on your position and shows every fuel bunk in the
                area you view, with highway bunks highlighted and all our dealers marked.
              </Text>
            )}

            {/* Divider */}
            {!isAll && (
            <View className="flex-row items-center mb-4">
              <View className="flex-1 h-px bg-[#E3EBF6]" />
              <View className="w-2 h-2 rounded-full bg-[#00E5FF] mx-2" />
              <View className="flex-1 h-px bg-[#E3EBF6]" />
            </View>
            )}

            {/* TO */}
            {!isAll && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-[#0B2559] mb-2 ml-1">To</Text>

              <SearchInput
                placeholder="Enter destination..."
                value={to?.address || ''}
                onPlaceSelect={handleToSelect}
                onClear={() => setTo(null)}
                leftIcon={
                  <View className="w-3 h-3 rounded-full bg-[#0A5BFF] border-2 border-[#C9DBFF]" />
                }
                history={searchHistory}
                onHistorySelect={handleToSelect}
                onHistoryRemove={removeHistoryItem}
                onClearHistory={clearSearchHistory}
              />
            </View>
            )}

            <TouchableOpacity
              className="rounded-2xl py-4 items-center"
              style={[
                { backgroundColor: canSearch ? '#0A5BFF' : '#E3EBF6' },
                canSearch ? BUTTON_SHADOW : null,
              ]}
              onPress={handleFindBunks}
              disabled={!canSearch}
              activeOpacity={0.85}
            >
              <Text className="font-bold text-lg" style={{ color: canSearch ? '#FFFFFF' : '#9AA9C2' }}>
                {isAll ? 'Show All Bunks' : 'Find Petrol Bunks'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info pills */}
          <View className="flex-row justify-center gap-3 mt-6">
            {['Live Route', 'Nearby Bunks', 'Open Status'].map((label) => (
              <View
                key={label}
                className="flex-row items-center bg-[#E6FBF8] px-3 py-1.5 rounded-full border border-[#B9F3EA]"
              >
                <View className="w-1.5 h-1.5 rounded-full bg-[#00C9B1] mr-1.5" />
                <Text className="text-[#0A8F8F] text-xs font-semibold">{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}