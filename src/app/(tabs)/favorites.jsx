import { SafeAreaView, Text, View } from 'react-native';

export default function FavoritesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-5xl mb-4">⭐</Text>
        <Text className="text-xl font-bold text-gray-900 text-center">
          Favorites
        </Text>
        <Text className="text-gray-500 text-center mt-2 text-sm">
          Save your frequently visited petrol bunks or routes here for quick access.
        </Text>
      </View>
    </SafeAreaView>
  );
}