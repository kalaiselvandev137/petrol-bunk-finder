import { TouchableOpacity, View } from 'react-native';
import { SOFT_SHADOW } from '../constants/theme';

// White card with a coloured status strip on the left edge.
export default function StripCard({ color, onPress, children }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="mb-3 rounded-2xl bg-white"
      style={SOFT_SHADOW}
    >
      <View className="flex-row rounded-2xl overflow-hidden border border-[#E3EBF6]">
        <View style={{ width: 5, backgroundColor: color }} />
        <View className="flex-1 p-4">{children}</View>
      </View>
    </TouchableOpacity>
  );
}