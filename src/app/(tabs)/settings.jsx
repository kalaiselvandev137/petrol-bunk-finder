import { SafeAreaView, Text, View } from 'react-native';

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-5xl mb-4">⚙️</Text>
        <Text className="text-xl font-bold text-gray-900 text-center">
          Settings
        </Text>
        <Text className="text-gray-500 text-center mt-2 text-sm">
          App preferences, search radius, and brand filter defaults will live here.
        </Text>
      </View>
    </SafeAreaView>
  );
}