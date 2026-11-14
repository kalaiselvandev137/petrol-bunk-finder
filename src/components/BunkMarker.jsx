import { Image, Text, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps';
import { getBunkCoords } from '../constants/bunkUtils';

// Marker colours: normal = grey ring, highway = amber ring + "NH" badge, dealer = purple filled + star
const STYLE = {
  normal: { ring: '#9CA3AF', bg: '#FFFFFF' },
  highway: { ring: '#F59E0B', bg: '#FFF4D6' },
  dealer: { ring: '#7C3AED', bg: '#EDE9FE' },
};

export default function BunkMarker({ bunk, onPress }) {
  const coord = getBunkCoords(bunk);
  if (!coord) return null;

  const kind = bunk.isDealer ? 'dealer' : bunk.isHighway ? 'highway' : 'normal';
  const s = STYLE[kind];
  const size = bunk.isDealer ? 40 : bunk.isHighway ? 38 : 32;
  const d = bunk.dealer;

  return (
    <Marker coordinate={coord} zIndex={bunk.isDealer ? 5 : bunk.isHighway ? 3 : 1}>
      {/* Custom marker pin */}
      <View style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: s.bg,
            borderWidth: 3,
            borderColor: s.ring,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={require('../../assets/images/petrol-maps/petrol-pump.png')}
            style={{ width: size - 14, height: size - 14 }}
            resizeMode="contain"
          />
        </View>

        {bunk.isDealer && (
          <View
            style={{
              position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: 8,
              backgroundColor: '#7C3AED', borderWidth: 1.5, borderColor: '#FFFFFF',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>★</Text>
          </View>
        )}

        {bunk.isHighway && (
          <View
            style={{
              position: 'absolute', bottom: 0, right: 0, paddingHorizontal: 4, height: 14, borderRadius: 7,
              backgroundColor: '#F59E0B', borderWidth: 1.5, borderColor: '#FFFFFF',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: '800' }}>NH</Text>
          </View>
        )}
      </View>

      {/* NOTE: onPress lives on the Callout itself, not on a nested
          TouchableOpacity — with `tooltip`, Android flattens the callout
          into a single touch target and never forwards taps to children. */}
      <Callout tooltip onPress={() => onPress?.(bunk)}>
        <View className="bg-white rounded-2xl px-4 py-3 shadow-lg border border-gray-100 min-w-[190px] max-w-[250px]">
          <View className="flex-row flex-wrap mb-1.5">
            {bunk.isDealer && (
              <View className="rounded-full px-2 py-0.5 mr-1.5 mb-1" style={{ backgroundColor: '#EDE9FE' }}>
                <Text className="text-xs font-semibold" style={{ color: '#6D28D9' }}>★ Our dealer</Text>
              </View>
            )}
            {bunk.isHighway && (
              <View className="rounded-full px-2 py-0.5 mr-1.5 mb-1" style={{ backgroundColor: '#FFF4D6' }}>
                <Text className="text-xs font-semibold" style={{ color: '#9A6B00' }}>🛣️ Highway</Text>
              </View>
            )}
          </View>

          <Text className="text-gray-900 font-bold text-sm" numberOfLines={2}>
            {bunk.name}
          </Text>
          <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>
            {bunk.vicinity}
          </Text>

          {d && (
            <View className="mt-2">
              {!!d.OMC && <Text className="text-gray-600 text-xs">OMC: {d.OMC}</Text>}
              {!!d.Primary_Mobile && <Text className="text-gray-600 text-xs mt-0.5">📞 {d.Primary_Mobile}</Text>}
              {!!d.Approved_Line_Amount && (
                <Text className="text-gray-600 text-xs mt-0.5">
                  Line: ₹{Number(d.Approved_Line_Amount).toLocaleString('en-IN')}
                </Text>
              )}
            </View>
          )}

          {bunk.rating != null && (
            <View className="flex-row items-center mt-2">
              <Text className="text-yellow-500 text-xs">★</Text>
              <Text className="text-gray-600 text-xs ml-1">{bunk.rating} / 5</Text>
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

          <View className="mt-3 bg-blue-500 rounded-xl py-2 items-center">
            <Text className="text-white text-xs font-bold">⛽ Route to here</Text>
          </View>
        </View>
      </Callout>
    </Marker>
  );
}