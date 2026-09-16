import { Image, Text, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps';

export default function BunkMarker({ bunk, onPress }) {
  const latitude =
    bunk.geometry?.location?.lat ?? bunk.geometry?.location?.latitude;
  const longitude =
    bunk.geometry?.location?.lng ?? bunk.geometry?.location?.longitude;

  if (latitude == null || longitude == null) return null;

  return (
    <Marker coordinate={{ latitude, longitude }}>
      {/* Custom marker pin */}
      <View className="items-center">
        <View className="items-center justify-center">
          <Image
            source={require('../../assets/images/petrol-maps/petrol-pump.png')}
            className="w-[25px] h-[25px]"
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Callout bubble shown on tap – details + select button.
          NOTE: onPress lives on the Callout itself, not on a nested
          TouchableOpacity — with `tooltip`, Android flattens the callout
          into a single touch target and never forwards taps to children. */}
      <Callout tooltip onPress={() => onPress?.(bunk)}>
        <View className="bg-white rounded-2xl px-4 py-3 shadow-lg border border-gray-100 min-w-[180px] max-w-[240px]">
          <Text className="text-gray-900 font-bold text-sm" numberOfLines={2}>
            {bunk.name}
          </Text>
          <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>
            {bunk.vicinity}
          </Text>

          {bunk.rating != null && (
            <View className="flex-row items-center mt-2">
              <Text className="text-yellow-500 text-xs">★</Text>
              <Text className="text-gray-600 text-xs ml-1">
                {bunk.rating} / 5
              </Text>
            </View>
          )}

          {bunk.opening_hours != null && (
            <View
              className={`mt-2 rounded-full px-2 py-0.5 self-start ${
                bunk.opening_hours.open_now ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  bunk.opening_hours.open_now ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {bunk.opening_hours.open_now ? 'Open Now' : 'Closed'}
              </Text>
            </View>
          )}

          {/* Select as destination – visual only; tap is handled by Callout's onPress above */}
          <View className="mt-3 bg-blue-500 rounded-xl py-2 items-center">
            <Text className="text-white text-xs font-bold">⛽ Route to here</Text>
          </View>
        </View>
      </Callout>
    </Marker>
  );
}