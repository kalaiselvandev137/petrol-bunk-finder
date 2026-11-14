import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RouteMap from '../components/RouteMap';
import { PETROL_BRANDS, matchesBrand } from '../constants/brands';
import {
  distanceMeters,
  formatDistance,
  getBunkCoords,
  isHighwayBunk,
} from '../constants/bunkUtils';
import { BUNK_SEARCH_RADIUS } from '../constants/config';
import { useDealerBunks } from '../hooks/useDealerBunks';
import { useDirections } from '../hooks/useDirections';
import { useLocation } from '../hooks/useLocation';
import { usePetrolBunks } from '../hooks/usePetrolBunks';

/**
 * MapScreen – two modes
 *
 *  • route mode (default): route params fromAddress/fromLat/fromLng + toAddress/toLat/toLng
 *    → shows the route and the bunks along it
 *  • all mode (mode=all): only fromAddress/fromLat/fromLng
 *    → shows every bunk around that point; "Search this area" loads more as you pan
 *
 * Bunk types on the map:
 *   grey ring   – normal bunk
 *   amber ring  – on a highway (NH/SH/bypass...)
 *   purple ★    – our dealer (from /dealers/apigetalldealersformap)
 */

const LAYERS = [
  { id: 'all', label: 'All' },
  { id: 'highway', label: '🛣️ Highway' },
  { id: 'dealers', label: '★ Dealers' },
];

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isAll = params.mode === 'all' || !params.toLat;

  // No start point passed in → use the phone's current location (no search needed)
  const { getCurrentLocation } = useLocation();
  const [deviceOrigin, setDeviceOrigin] = useState(null);
  const [locating, setLocating] = useState(isAll && !params.fromLat);

  useEffect(() => {
    if (!isAll || params.fromLat) return;
    let alive = true;
    (async () => {
      try {
        const loc = await Promise.race([
          getCurrentLocation(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
        ]);
        if (alive) setDeviceOrigin({ address: loc.address, coords: loc.coords });
      } catch (e) {
        // no location → the map opens on all of India instead
      } finally {
        if (alive) setLocating(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAll, params.fromLat, getCurrentLocation]);

  const origin = useMemo(() => {
    if (params.fromLat) {
      return {
        address: params.fromAddress,
        coords: {
          latitude: parseFloat(params.fromLat),
          longitude: parseFloat(params.fromLng),
        },
      };
    }
    return deviceOrigin || { address: '', coords: null };
  }, [params.fromAddress, params.fromLat, params.fromLng, deviceOrigin]);

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
    clearRoute,
    routeCoords,
    waypointCoords,
    duration,
    distance,
    loading: routeLoading,
    error: routeError,
  } = useDirections();

  const {
    searchBunks,
    searchArea,
    bunks,
    loading: bunksLoading,
    error: bunksError,
  } = usePetrolBunks();

  const { dealerBunks, missingCoords } = useDealerBunks();

  const [selectedBunk, setSelectedBunk] = useState(null);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [layer, setLayer] = useState('all'); // all | highway | dealers
  const [zoomHint, setZoomHint] = useState(false);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [areaOpen, setAreaOpen] = useState(false);
  const [fitTo, setFitTo] = useState(null);
  const regionRef = useRef(null);
  const searchTimer = useRef(null);
  const lastSearch = useRef(null);

  // Bottom Sheet
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['18%', '55%', '75%'], []);

  // ---- merge Google bunks + dealers ----------------------------------------
  const allBunks = useMemo(() => {
    const google = bunks.map((b) => ({ ...b, isHighway: isHighwayBunk(b) }));

    let dealers = dealerBunks;
    if (!isAll) {
      // route mode: only dealers near the route
      dealers = waypointCoords.length
        ? dealerBunks.filter((d) => {
            const c = getBunkCoords(d);
            return waypointCoords.some((w) => distanceMeters(w, c) <= BUNK_SEARCH_RADIUS);
          })
        : [];
    }

    // a Google result sitting on a dealer is the same bunk – show the dealer one
    const googleOnly = google.filter((g) => {
      const gc = getBunkCoords(g);
      if (!gc) return false;
      return !dealers.some((d) => distanceMeters(gc, getBunkCoords(d)) < 100);
    });

    return [...dealers, ...googleOnly];
  }, [bunks, dealerBunks, waypointCoords, isAll]);

  const filteredBunks = useMemo(() => {
    const list = allBunks.filter((b) => {
      if (layer === 'highway' && !b.isHighway) return false;
      if (layer === 'dealers' && !b.isDealer) return false;
      if (b.isDealer) {
        if (selectedState && b.state !== selectedState) return false;
        if (selectedDistrict && b.district !== selectedDistrict) return false;
      }
      const brandText = b.isDealer ? `${b.name} ${b.dealer?.OMC || ''}` : b.name;
      return matchesBrand(brandText, selectedBrands);
    });

    if (isAll && origin.coords) {
      const dist = (b) => distanceMeters(origin.coords, getBunkCoords(b));
      return list
        .map((b) => ({ b, d: dist(b) }))
        .sort((x, y) => x.d - y.d)
        .map((x) => ({ ...x.b, distanceFromOrigin: x.d }));
    }
    // route mode: dealers first, then highway bunks, then the rest
    const rank = (b) => (b.isDealer ? 0 : b.isHighway ? 1 : 2);
    return [...list].sort((a, b) => rank(a) - rank(b));
  }, [allBunks, layer, selectedBrands, isAll, origin.coords, selectedState, selectedDistrict]);

  const dealerCount = useMemo(() => filteredBunks.filter((b) => b.isDealer).length, [filteredBunks]);
  const highwayCount = useMemo(() => filteredBunks.filter((b) => b.isHighway).length, [filteredBunks]);

  // ---- state / district picker (from the dealers' State and District fields) ----
  const stateOptions = useMemo(() => {
    const m = {};
    dealerBunks.forEach((d) => {
      if (d.state) m[d.state] = (m[d.state] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [dealerBunks]);

  const districtOptions = useMemo(() => {
    if (!selectedState) return [];
    const m = {};
    dealerBunks.forEach((d) => {
      if (d.state === selectedState && d.district) m[d.district] = (m[d.district] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dealerBunks, selectedState]);

  const applyArea = (state, district, close) => {
    setSelectedState(state);
    setSelectedDistrict(district);
    if (close) setAreaOpen(false);
    if (!state) return;
    const coords = dealerBunks
      .filter((d) => d.state === state && (!district || d.district === district))
      .map((d) => getBunkCoords(d))
      .filter(Boolean);
    if (coords.length) setFitTo({ key: Date.now(), coords });
  };

  const areaLabel = selectedDistrict
    ? `📍 ${selectedDistrict}`
    : selectedState
    ? `📍 ${selectedState}`
    : '📍 All areas';

  const toggleBrand = (brandId) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId]
    );
  };

  // In all-bunks mode, bunk loading only shows a small pill so the map stays usable
  const isLoading = locating || routeLoading || (bunksLoading && !isAll);

  // Active destination shown on map / header (null in "all" mode until a bunk is tapped)
  const activeDestination = useMemo(() => {
    if (selectedBunk) {
      const c = getBunkCoords(selectedBunk);
      return {
        address: selectedBunk.name,
        coords: c,
        isBunk: true,
      };
    }
    if (isAll) return null;
    return { ...destination, isBunk: false };
  }, [selectedBunk, destination, isAll]);

  /** On mount: route mode → fetch route; all mode → search bunks around the start point */
  useEffect(() => {
    const load = async () => {
      try {
        if (!isAll) {
          await fetchRoute(origin.coords, destination.coords, { updateWaypoints: true });
        }
      } catch (err) {
        Alert.alert('Route Error', err.message);
      }
    };
    load();
  }, [origin.coords, destination.coords, fetchRoute, isAll]);

  useEffect(() => {
    if (isAll) return;
    if (waypointCoords.length > 0) {
      searchBunks(waypointCoords).catch((err) => {
        Alert.alert('Bunk Search Error', err.message);
      });
    }
  }, [waypointCoords, searchBunks, isAll]);

  /**
   * All-bunks mode: whenever the map stops moving, load the fuel bunks for the
   * visible area (cached by area, so small pans don't re-query Google).
   * Zoomed out too far → ask the user to zoom in (Google returns max 60 per query).
   */
  const MAX_DELTA = 0.9;
  const handleRegionChange = useCallback(
    (region) => {
      regionRef.current = region;
      if (!isAll) return;

      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(async () => {
        if (region.latitudeDelta > MAX_DELTA) {
          setZoomHint(true);
          return;
        }
        setZoomHint(false);

        const radius = Math.min(50000, Math.max(2000, (region.latitudeDelta * 111000) / 2));
        const last = lastSearch.current;
        if (
          last &&
          distanceMeters(last, region) < last.radius * 0.4 &&
          radius <= last.radius * 1.2
        ) {
          return; // already covered
        }
        lastSearch.current = { latitude: region.latitude, longitude: region.longitude, radius };

        try {
          await searchArea({ latitude: region.latitude, longitude: region.longitude }, radius);
        } catch (err) {
          lastSearch.current = null; // retry on next move
          console.warn('Bunk area search failed:', err.message);
        }
      }, 800);
    },
    [isAll, searchArea]
  );

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  /**
   * When user taps a bunk:
   * 1. Mark it as selected
   * 2. Fetch a driving route from origin → bunk
   * 3. Expand the bottom sheet
   */
  const handleBunkPress = async (bunk) => {
    const c = getBunkCoords(bunk);
    if (!c) {
      Alert.alert('Error', 'Could not get location for this petrol bunk.');
      return;
    }
    if (!origin.coords) {
      Alert.alert('Location needed', 'Turn on location to get the route to this bunk.');
      return;
    }
    setSelectedBunk(bunk);

    try {
      await fetchRoute(origin.coords, c, { updateWaypoints: false });
      bottomSheetRef.current?.snapToIndex(1);
    } catch (err) {
      Alert.alert('Route Error', err.message);
    }
  };

  /** Clear selection and restore the original view */
  const handleClearSelection = async () => {
    setSelectedBunk(null);
    if (isAll) {
      clearRoute();
      bottomSheetRef.current?.snapToIndex(0);
      return;
    }
    try {
      await fetchRoute(origin.coords, destination.coords, { updateWaypoints: false });
      bottomSheetRef.current?.snapToIndex(0);
    } catch (err) {
      Alert.alert('Route Error', err.message);
    }
  };

  const handleSheetChanges = useCallback((index) => {}, []);

  const error = routeError || (isAll ? null : bunksError);
  const showChips = !isLoading && (allBunks.length > 0 || layer !== 'all' || selectedBrands.length > 0);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pb-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white flex shadow items-center justify-center mr-3"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="gray" />
          </TouchableOpacity>

          <View className="flex-1 bg-white rounded-2xl px-4 py-3 shadow">
            {!!origin.address && (
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2" />
                <Text className="text-gray-700 text-sm flex-1" numberOfLines={1}>
                  {origin.address}
                </Text>
              </View>
            )}

            {activeDestination ? (
              <View className="flex-row items-center mt-1.5">
                <View
                  className={`w-2.5 h-2.5 rounded-full mr-2 ${selectedBunk ? 'bg-orange-500' : 'bg-red-500'}`}
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
            ) : (
              <View className="flex-row items-center mt-1.5">
                <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2" />
                <Text className="text-gray-700 text-sm flex-1" numberOfLines={1}>
                  All fuel bunks · dealers · highway
                </Text>
              </View>
            )}

            {/* All mode summary */}
            {isAll && !selectedBunk && !isLoading && (
              <View className="flex-row justify-center mt-2">
                <View className="bg-blue-500 rounded-full px-4 py-1.5 flex-row gap-4">
                  <Text className="text-white text-xs font-semibold">⛽ {filteredBunks.length} bunks</Text>
                  <Text className="text-white text-xs font-semibold">🛣️ {highwayCount}</Text>
                  <Text className="text-white text-xs font-semibold">★ {dealerCount}</Text>
                </View>
              </View>
            )}

            {/* Route summary */}
            {!(isAll && !selectedBunk) && (duration || distance) && !isLoading && (
              <View className="flex-row justify-center mt-2">
                <View className="bg-blue-500 rounded-full px-4 py-1.5 flex-row gap-4">
                  {duration && (
                    <Text className="text-white text-xs font-semibold">🕐 {duration}</Text>
                  )}
                  {distance && (
                    <Text className="text-white text-xs font-semibold">📏 {distance}</Text>
                  )}
                  {!selectedBunk && allBunks.length > 0 && (
                    <Text className="text-white text-xs font-semibold">
                      ⛽ {filteredBunks.length} bunks
                    </Text>
                  )}
                  {!selectedBunk && dealerCount > 0 && (
                    <Text className="text-white text-xs font-semibold">★ {dealerCount}</Text>
                  )}
                  {selectedBunk && (
                    <Text className="text-white text-xs font-semibold">⛽ To selected bunk</Text>
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
              {locating ? 'Getting your location...' : routeLoading ? 'Finding route...' : 'Searching for bunks...'}
            </Text>
            <Text className="text-gray-400 text-xs mt-1">This may take a few seconds</Text>
          </View>
        </View>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <View className="absolute inset-0 z-20 items-center justify-center px-8 bg-white/90">
          <Text className="text-4xl mb-3">⚠️</Text>
          <Text className="text-gray-900 font-bold text-lg text-center">Something went wrong</Text>
          <Text className="text-gray-500 text-sm text-center mt-2">{error}</Text>
          <TouchableOpacity
            className="mt-4 bg-blue-500 rounded-2xl px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Layer + brand filter chips */}
      {showChips && (
        <View className="absolute top-[140px] left-0 right-0 z-10 px-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {LAYERS.map((l) => {
              const active = layer === l.id;
              return (
                <TouchableOpacity
                  key={l.id}
                  onPress={() => {
                    setLayer(l.id);
                    if (l.id === 'all') setSelectedBrands([]);
                  }}
                  className={`px-3 py-1.5 rounded-full border ${
                    active ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-600'}`}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {isAll && stateOptions.length > 0 && (
              <TouchableOpacity
                onPress={() => setAreaOpen(true)}
                className={`px-3 py-1.5 rounded-full border ${
                  selectedState ? 'bg-purple-600 border-purple-600' : 'bg-white border-purple-300'
                }`}
              >
                <Text className={`text-xs font-semibold ${selectedState ? 'text-white' : 'text-purple-700'}`}>
                  {areaLabel} ▾
                </Text>
              </TouchableOpacity>
            )}

            <View className="w-px bg-gray-300 my-1" />

            {PETROL_BRANDS.map((brand) => {
              const isSelected = selectedBrands.includes(brand.id);
              return (
                <TouchableOpacity
                  key={brand.id}
                  onPress={() => toggleBrand(brand.id)}
                  className={`px-3 py-1.5 rounded-full border ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                    {brand.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* All-bunks status pill */}
      {isAll && !selectedBunk && !isLoading && (zoomHint || bunksLoading || !!bunksError) && (
        <View pointerEvents="none" className="absolute top-[186px] left-0 right-0 z-10 items-center">
          <View className="bg-white rounded-full px-4 py-2 shadow border border-blue-200 flex-row items-center">
            {bunksLoading && <ActivityIndicator size="small" color="#3B82F6" />}
            <Text className="text-blue-600 text-xs font-bold ml-1.5">
              {bunksLoading
                ? 'Loading fuel bunks...'
                : bunksError
                ? 'Could not load bunks – move the map to retry'
                : 'Zoom in to see all fuel bunks'}
            </Text>
          </View>
        </View>
      )}

      {/* State / district picker */}
      <Modal visible={areaOpen} transparent animationType="slide" onRequestClose={() => setAreaOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-4 pt-4 pb-8" style={{ maxHeight: '75%' }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-900 font-bold text-base">Select area</Text>
              <View className="flex-row items-center">
                <TouchableOpacity onPress={() => applyArea(null, null, true)} className="mr-5">
                  <Text className="text-blue-600 text-sm font-semibold">Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAreaOpen(false)}>
                  <Text className="text-gray-500 text-lg">✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-gray-500 text-xs font-semibold mb-2">STATE</Text>
              <View className="flex-row flex-wrap">
                {stateOptions.map(([name, count]) => {
                  const on = selectedState === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      onPress={() => applyArea(name, null, false)}
                      className={`px-3 py-1.5 rounded-full border mr-2 mb-2 ${
                        on ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-gray-700'}`}>
                        {name} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {!!selectedState && districtOptions.length > 0 && (
                <>
                  <Text className="text-gray-500 text-xs font-semibold mt-3 mb-2">DISTRICT</Text>
                  <View className="flex-row flex-wrap">
                    <TouchableOpacity
                      onPress={() => applyArea(selectedState, null, true)}
                      className={`px-3 py-1.5 rounded-full border mr-2 mb-2 ${
                        !selectedDistrict ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text className={`text-xs font-semibold ${!selectedDistrict ? 'text-white' : 'text-gray-700'}`}>
                        All districts
                      </Text>
                    </TouchableOpacity>
                    {districtOptions.map(([name, count]) => {
                      const on = selectedDistrict === name;
                      return (
                        <TouchableOpacity
                          key={name}
                          onPress={() => applyArea(selectedState, name, true)}
                          className={`px-3 py-1.5 rounded-full border mr-2 mb-2 ${
                            on ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-200'
                          }`}
                        >
                          <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-gray-700'}`}>
                            {name} ({count})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Map */}
      {!locating && (
        <RouteMap
          routeCoords={routeCoords}
          origin={origin}
          destination={activeDestination}
          bunks={filteredBunks}
          onBunkPress={handleBunkPress}
          selectedBunkId={selectedBunk?.place_id}
          onRegionChangeComplete={handleRegionChange}
          fitTo={fitTo}
        />
      )}

      {/* Legend */}
      {!isLoading && (allBunks.length > 0 || dealerBunks.length > 0) && (
        <View
          pointerEvents="none"
          className="absolute bottom-44 left-4 z-10 bg-white/95 rounded-xl px-3 py-2 border border-gray-200"
        >
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full border-2 mr-2" style={{ borderColor: '#9CA3AF' }} />
            <Text className="text-gray-600 text-[11px]">Fuel bunk</Text>
          </View>
          <View className="flex-row items-center mt-1">
            <View className="w-3 h-3 rounded-full border-2 mr-2" style={{ borderColor: '#F59E0B', backgroundColor: '#FFF4D6' }} />
            <Text className="text-gray-600 text-[11px]">Near highway</Text>
          </View>
          <View className="flex-row items-center mt-1">
            <View className="w-3 h-3 rounded-full border-2 mr-2" style={{ borderColor: '#7C3AED', backgroundColor: '#EDE9FE' }} />
            <Text className="text-gray-600 text-[11px]">Our dealer</Text>
          </View>
          <Text className="text-gray-500 text-[10px] mt-1.5">
            {dealerBunks.length} dealers loaded{isAll ? '' : ' (route mode: only those near the route)'}
          </Text>
          {missingCoords > 0 && (
            <Text className="text-gray-400 text-[10px] mt-1.5">{missingCoords} dealers have no location</Text>
          )}
        </View>
      )}

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
          handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }}
          backgroundStyle={{
            backgroundColor: 'white',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <View className="px-4 pb-3">
            <Text className="text-gray-800 font-bold text-base text-center">
              ⛽ {filteredBunks.length} Petrol Bunks Found
            </Text>
          </View>

          <BottomSheetFlatList
            data={filteredBunks}
            keyExtractor={(item) => item.place_id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ItemSeparatorComponent={() => <View className="h-px bg-gray-100 my-2" />}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`flex-row items-center py-3 px-1 rounded-xl ${
                  selectedBunk?.place_id === item.place_id ? 'bg-blue-100' : ''
                }`}
                onPress={() => handleBunkPress(item)}
                activeOpacity={0.7}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: item.isDealer ? '#EDE9FE' : item.isHighway ? '#FFF4D6' : '#FFEDD5',
                  }}
                >
                  <Text className="text-xl">{item.isDealer ? '★' : '⛽'}</Text>
                </View>

                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-sm" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>
                    {item.vicinity}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    {item.isDealer && (
                      <Text className="text-xs font-semibold mr-2" style={{ color: '#6D28D9' }}>
                        Dealer
                      </Text>
                    )}
                    {item.isHighway && (
                      <Text className="text-xs font-semibold mr-2" style={{ color: '#9A6B00' }}>
                        🛣️ Highway
                      </Text>
                    )}
                    {item.rating != null && (
                      <Text className="text-yellow-600 text-xs mr-2">★ {item.rating}</Text>
                    )}
                    {item.distanceFromOrigin != null && (
                      <Text className="text-gray-400 text-xs">{formatDistance(item.distanceFromOrigin)}</Text>
                    )}
                  </View>
                </View>

                {item.opening_hours != null && (
                  <View
                    className={`rounded-full px-2 py-0.5 ${
                      item.opening_hours.open_now ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        item.opening_hours.open_now ? 'text-green-700' : 'text-red-600'
                      }`}
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
        (isAll || routeCoords.length > 0) &&
        !error &&
        !(isAll && zoomHint) && (
          <View className="absolute bottom-6 left-4 right-4">
            <View className="bg-white rounded-2xl px-5 py-4 shadow items-center">
              <Text className="text-2xl mb-1">🔍</Text>
              <Text className="text-gray-700 font-semibold">No petrol bunks found</Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">
                {isAll ? 'Try another filter or move the map to another area.' : 'Try a different route.'}
              </Text>
            </View>
          </View>
        )}
    </>
  );
}