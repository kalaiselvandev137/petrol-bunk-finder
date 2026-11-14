import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import BunkMarker from './BunkMarker';

const MAP_TYPES = [
  { id: 'standard', label: '🗺️', type: 'standard' },
  { id: 'satellite', label: '🛰️', type: 'satellite' },
  { id: 'hybrid', label: '🔀', type: 'hybrid' },
  { id: 'terrain', label: '⛰️', type: 'terrain' },
];

export default function RouteMap({
  routeCoords,
  origin,
  destination,
  bunks = [],
  onBunkPress,
  selectedBunkId,
  onRegionChangeComplete,
  fitTo,
}) {
  const mapRef = useRef(null);
  const [mapType, setMapType] = useState('standard');
  const router = useRouter();
  
  // Get dealer parameters from route
  const params = useLocalSearchParams();
  const isDealerRoute = !!params?.dealerName;

  // A tapped bunk always wins; otherwise show the dealer marker for dealer routes
  const finalDestination = destination?.isBunk
    ? destination
    : isDealerRoute
    ? {
        ...destination,
        isDealerMarker: true,
        dealerName: params.dealerName,
        address: params.dealerAddress || destination?.address,
      }
    : destination;

  useEffect(() => {
    if (!mapRef.current) return;

    if (routeCoords.length > 0) {
      setTimeout(() => {
        try {
          // Validate coordinates before fitting
          const validCoords = routeCoords.filter(
            (c) => c && typeof c.latitude === 'number' && typeof c.longitude === 'number'
          );

          if (validCoords.length > 0) {
            mapRef.current?.fitToCoordinates(validCoords, {
              edgePadding: { top: 80, right: 40, bottom: 300, left: 40 },
              animated: true,
            });
          } else {
            console.warn('No valid coordinates found for fitToCoordinates');
          }
        } catch (err) {
          console.error('fitToCoordinates error:', err);
        }
      }, 300);
    }
  }, [routeCoords]);

  // Zoom to a chosen area (state / district): { key, coords: [{latitude, longitude}] }
  useEffect(() => {
    if (!fitTo?.coords?.length || !mapRef.current) return;
    if (fitTo.coords.length === 1) {
      mapRef.current.animateToRegion(
        { ...fitTo.coords[0], latitudeDelta: 0.08, longitudeDelta: 0.08 },
        500
      );
    } else {
      mapRef.current.fitToCoordinates(fitTo.coords, {
        edgePadding: { top: 220, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  }, [fitTo?.key]);

  const changeMapType = () => {
    const currentIndex = MAP_TYPES.findIndex((item) => item.type === mapType);
    const nextIndex = (currentIndex + 1) % MAP_TYPES.length;
    setMapType(MAP_TYPES[nextIndex].type);
  };

  const initialRegion = origin?.coords
    ? {
        latitude: parseFloat(origin.coords.latitude),
        longitude: parseFloat(origin.coords.longitude),
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 15,
        longitudeDelta: 15,
      };

  return (
    <>
      <StatusBar style="white" />
      <View className="flex-1">
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsTraffic={false}
          mapType={mapType}
          onRegionChangeComplete={onRegionChangeComplete}
        >
          {/* Route polyline */}
          {routeCoords && routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords
                .map((c) => ({
                  latitude: typeof c.latitude === 'number' ? c.latitude : parseFloat(c.latitude),
                  longitude: typeof c.longitude === 'number' ? c.longitude : parseFloat(c.longitude),
                }))
                .filter((c) => !Number.isNaN(c.latitude) && !Number.isNaN(c.longitude))}
              strokeColor="#3B82F6"
              strokeWidth={8}
              tappable={false}
              zIndex={1}
            />
          )}

          {/* ========== ORIGIN MARKER (3D style) ========== */}
          {origin?.coords && (
            <Marker
              coordinate={{
                latitude: parseFloat(origin.coords.latitude),
                longitude: parseFloat(origin.coords.longitude),
              }}
              title="Current Location"
              description={origin.address}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={10}
            >
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-green-500 border-4 border-white items-center justify-center shadow-lg">
                  <Text className="text-2xl">📍</Text>
                </View>
                <View className="w-3 h-3 bg-green-500 rotate-45 -mt-1.5" />
              </View>
            </Marker>
          )}

          {/* ========== DESTINATION MARKER - Handles both dealer and bunk ========== */}
          {finalDestination?.coords && (
            <Marker
              coordinate={{
                latitude: parseFloat(finalDestination.coords.latitude),
                longitude: parseFloat(finalDestination.coords.longitude),
              }}
              title={finalDestination.isDealerMarker ? 'Dealer' : 'Selected Bunk'}
              description={finalDestination.address}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={10}
            >
              <View className="items-center">
                <View
                  className={`w-12 h-12 rounded-full border-4 border-white items-center justify-center shadow-lg ${
                    finalDestination.isDealerMarker ? 'bg-purple-500' : 'bg-orange-500'
                  }`}
                >
                  <Text className="text-2xl">
                    {finalDestination.isDealerMarker ? '🏢' : '⛽'}
                  </Text>
                </View>
                <View
                  className={`w-3 h-3 rotate-45 -mt-1.5 ${
                    finalDestination.isDealerMarker ? 'bg-purple-500' : 'bg-orange-500'
                  }`}
                />
              </View>
            </Marker>
          )}

          {/* Petrol bunk markers (skip the currently selected one) */}
          {bunks && bunks.length > 0 && (
            bunks
              .filter((bunk) => bunk.place_id !== selectedBunkId)
              .map((bunk) => <BunkMarker key={bunk.place_id} bunk={bunk} onPress={onBunkPress} />)
          )}
        </MapView>

        {/* Map Type Toggle Button */}
        <TouchableOpacity
          className="absolute bottom-44 right-4 z-20 w-12 h-12 bg-white border border-blue-300 rounded-full shadow-lg items-center justify-center"
          onPress={changeMapType}
          activeOpacity={0.8}
        >
          <Text className="text-white text-2xl font-bold text-center ">
            {MAP_TYPES.find((item) => item.type === mapType)?.label}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}