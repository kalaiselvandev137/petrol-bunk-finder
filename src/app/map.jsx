import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RouteMap from '../components/RouteMap';
import { PETROL_BRANDS, matchesBrand } from '../constants/brands';
import { useDirections } from '../hooks/useDirections';
import { usePetrolBunks } from '../hooks/usePetrolBunks';

/**
 * MapScreen – Shows the route on a Google Map and all petrol bunks along it.
 *
 * Route params (from home screen):
 *   fromAddress, fromLat, fromLng
 *   toAddress,   toLat,   toLng
 */
export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const origin = useMemo(
    () => ({
      address: params.fromAddress,
      coords: {
        latitude: parseFloat(params.fromLat),
        longitude: parseFloat(params.fromLng),
      },
    }),
    [params.fromAddress, params.fromLat, params.fromLng]
  );

  const destination = useMemo(
    () => ({
      address: params.toAddress,
      coords: {
        latitude: parseFloat(params.toLat),
        longitude: parseFloat(params.toLng),
      },
    }),
    [params.toAddress, params.toLat, params.toLng]
  );

  const {
    fetchRoute,
    routeCoords,
    waypointCoords,
    duration,
    distance,
    loading: routeLoading,
    error: routeError,
  } = useDirections();

  const {
    searchBunks,
    bunks,
    loading: bunksLoading,
    error: bunksError,
  } = usePetrolBunks();

  const [selectedBunk, setSelectedBunk] = useState(null);
  const [selectedBrands, setSelectedBrands] = useState([]);

  // Bottom Sheet
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['18%', '55%', '75%'], []);

  const filteredBunks = useMemo(() => {
    return bunks.filter((bunk) => matchesBrand(bunk.name, selectedBrands));
  }, [bunks, selectedBrands]);

  const toggleBrand = (brandId) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    );
  };

  const isLoading = routeLoading || bunksLoading;

  // Active destination shown on map / header
  const activeDestination = useMemo(() => {
    if (selectedBunk) {
      const lat =
        selectedBunk.geometry?.location?.lat ??
        selectedBunk.geometry?.location?.latitude;
      const lng =
        selectedBunk.geometry?.location?.lng ??
        selectedBunk.geometry?.location?.longitude;

      return {
        address: selectedBunk.name,
        coords: { latitude: lat, longitude: lng },
        isBunk: true,
      };
    }
    return { ...destination, isBunk: false };
  }, [selectedBunk, destination]);

  /** On mount: fetch original route then search for bunks along it */
  useEffect(() => {
    const loadRouteAndBunks = async () => {
      try {
        await fetchRoute(origin.coords, destination.coords, {
          updateWaypoints: true,
        });
      } catch (err) {
        Alert.alert('Route Error', err.message);
      }
    };
    loadRouteAndBunks();
  }, [origin.coords, destination.coords, fetchRoute]);

  useEffect(() => {
    if (waypointCoords.length > 0) {
      searchBunks(waypointCoords).catch((err) => {
        Alert.alert('Bunk Search Error', err.message);
      });
    }
  }, [waypointCoords, searchBunks]);

  /**
   * When user taps a petrol bunk:
   * 1. Mark it as selected
   * 2. Fetch a driving route from origin → bunk
   * 3. Expand the bottom sheet
   */
  const handleBunkPress = async (bunk) => {
    setSelectedBunk(bunk);

    const lat =
      bunk.geometry?.location?.lat ?? bunk.geometry?.location?.latitude;
    const lng =
      bunk.geometry?.location?.lng ?? bunk.geometry?.location?.longitude;

    if (lat == null || lng == null) {
      Alert.alert('Error', 'Could not get location for this petrol bunk.');
      return;
    }

    try {
      await fetchRoute(
        origin.coords,
        { latitude: lat, longitude: lng },
        { updateWaypoints: false }
      );

      // Expand the sheet when a bunk is selected
      bottomSheetRef.current?.snapToIndex(1);
    } catch (err) {
      Alert.alert('Route Error', err.message);
    }
  };

  /** Clear selection and restore the original origin → destination route */
  const handleClearSelection = async () => {
    setSelectedBunk(null);
    try {
      await fetchRoute(origin.coords, destination.coords, {
        updateWaypoints: false,
      });
      // Collapse the sheet
      bottomSheetRef.current?.snapToIndex(0);
    } catch (err) {
      Alert.alert('Route Error', err.message);
    }
  };

  const handleSheetChanges = useCallback((index) => {
    // index === 0 → collapsed
    // index === 1 → expanded
  }, []);

  const error = routeError || bunksError;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Back button + route summary header */}
      <View className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pb-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white shadow items-center justify-center mr-3"
            onPress={() => router.back()}
          >
            <Text className="text-gray-700 text-xl">←</Text>
          </TouchableOpacity>

          <View className="flex-1 bg-white rounded-2xl px-4 py-3 shadow">
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2" />
              <Text className="text-gray-700 text-sm flex-1" numberOfLines={1}>
                {origin.address}
              </Text>
            </View>

            <View className="flex-row items-center mt-1.5">
              <View
                className={`w-2.5 h-2.5 rounded-full mr-2 ${
                  selectedBunk ? 'bg-orange-500' : 'bg-red-500'
                }`}
              />
              <Text className="text-gray-700 text-sm flex-1" numberOfLines={1}>
                {activeDestination.address}
              </Text>

              {selectedBunk && (
                <TouchableOpacity
                  onPress={handleClearSelection}
                  className="ml-2 w-6 h-6 rounded-full bg-gray-200 items-center justify-center"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text className="text-gray-600 text-xs font-bold">×</Text>
                </TouchableOpacity>
              )}
            </View>

            {(duration || distance) && !isLoading && (
              <View className="flex-row justify-center mt-2">
                <View className="bg-blue-500 rounded-full px-4 py-1.5 flex-row gap-4">
                  {duration && (
                    <Text className="text-white text-xs font-semibold">
                      🕐 {duration}
                    </Text>
                  )}
                  {distance && (
                    <Text className="text-white text-xs font-semibold">
                      📏 {distance}
                    </Text>
                  )}
                  {!selectedBunk && bunks.length > 0 && (
                    <Text className="text-white text-xs font-semibold">
                      ⛽ {filteredBunks.length} bunks
                    </Text>
                  )}
                  {selectedBunk && (
                    <Text className="text-white text-xs font-semibold">
                      ⛽ To selected bunk
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Loading overlay */}
      {isLoading && (
        <View className="absolute inset-0 z-20 items-center justify-center bg-white/70">
          <View className="bg-white rounded-3xl px-8 py-6 shadow-lg items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-700 font-semibold mt-3">
              {routeLoading ? 'Finding route...' : 'Searching for bunks...'}
            </Text>
            <Text className="text-gray-400 text-xs mt-1">
              This may take a few seconds
            </Text>
          </View>
        </View>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <View className="absolute inset-0 z-20 items-center justify-center px-8 bg-white/90">
          <Text className="text-4xl mb-3">⚠️</Text>
          <Text className="text-gray-900 font-bold text-lg text-center">
            Something went wrong
          </Text>
          <Text className="text-gray-500 text-sm text-center mt-2">{error}</Text>
          <TouchableOpacity
            className="mt-4 bg-blue-500 rounded-2xl px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Brand filter chips */}
      {!isLoading && bunks.length > 0 && (
        <View className="absolute top-[140px] left-0 right-0 z-10 px-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedBrands([])}
              className={`px-3 py-1.5 rounded-full border ${
                selectedBrands.length === 0
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-white border-gray-200'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selectedBrands.length === 0 ? 'text-white' : 'text-gray-600'
                }`}
              >
                All
              </Text>
            </TouchableOpacity>

            {PETROL_BRANDS.map((brand) => {
              const isSelected = selectedBrands.includes(brand.id);
              return (
                <TouchableOpacity
                  key={brand.id}
                  onPress={() => toggleBrand(brand.id)}
                  className={`px-3 py-1.5 rounded-full border ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {brand.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Map */}
      <RouteMap
        routeCoords={routeCoords}
        origin={origin}
        destination={activeDestination}
        bunks={filteredBunks}
        onBunkPress={handleBunkPress}
        selectedBunkId={selectedBunk?.place_id}
      />

      {/* ========== Draggable Bottom Sheet ========== */}
      {!isLoading && filteredBunks.length > 0 && (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          enableOverDrag={false}
          handleIndicatorStyle={{
            backgroundColor: '#D1D5DB',
            width: 40,
          }}
          backgroundStyle={{
            backgroundColor: 'white',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          {/* Sheet Header */}
          <View className="px-4 pb-3">
            <Text className="text-gray-800 font-bold text-base text-center">
              ⛽ {filteredBunks.length} Petrol Bunks Found
            </Text>
            <Text className="text-gray-400 text-xs text-center mt-1">
              Drag up for full list
            </Text>
          </View>

          <BottomSheetFlatList
            data={filteredBunks}
            keyExtractor={(item) => item.place_id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 40,
            }}
            ItemSeparatorComponent={() => (
              <View className="h-px bg-gray-100 my-2" />
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`flex-row items-center py-3 px-1 rounded-xl ${
                  selectedBunk?.place_id === item.place_id ? 'bg-blue-50' : ''
                }`}
                onPress={() => handleBunkPress(item)}
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                  <Text className="text-xl">⛽</Text>
                </View>

                <View className="flex-1">
                  <Text
                    className="text-gray-900 font-semibold text-sm"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    className="text-gray-500 text-xs mt-0.5"
                    numberOfLines={1}
                  >
                    {item.vicinity}
                  </Text>
                  {item.rating != null && (
                    <Text className="text-yellow-600 text-xs mt-0.5">
                      ★ {item.rating}
                    </Text>
                  )}
                </View>

                {item.opening_hours != null && (
                  <View
                    className={`rounded-full px-2 py-0.5 ${
                      item.opening_hours.open_now
                        ? 'bg-green-100'
                        : 'bg-red-100'
                    }`}
                  >
                    <Text className={`text-xs font-medium ${item.opening_hours.open_now? 'text-green-700': 'text-red-600'}`}
                    >
                      {item.opening_hours.open_now ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </BottomSheet>
      )}

      {/* No bunks found state */}
      {!isLoading &&
        filteredBunks.length === 0 &&
        routeCoords.length > 0 &&
        !error && (
          <View className="absolute bottom-6 left-4 right-4">
            <View className="bg-white rounded-2xl px-5 py-4 shadow items-center">
              <Text className="text-2xl mb-1">🔍</Text>
              <Text className="text-gray-700 font-semibold">
                No petrol bunks found
              </Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">
                Try a different route or increase the search radius in config.js
              </Text>
            </View>
          </View>
        )}
    </SafeAreaView>
  );
}