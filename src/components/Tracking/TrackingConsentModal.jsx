import { Modal, Text, TouchableOpacity, View } from 'react-native';

export default function TrackingConsentModal({ visible, onAccept, onDecline }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-2xl p-5 w-full">
          <Text className="text-lg font-bold text-gray-900 mb-2">Location sharing</Text>
          <Text className="text-sm text-gray-600 leading-5">
            To support field operations, this app records your location from the moment you
            check in for the day until you check out, including when the app is in the
            background.
            {'\n\n'}This data is visible only to authorised management and is used for
            visit and travel records. Tracking stops when you check out.
          </Text>
          <TouchableOpacity className="bg-blue-600 rounded-xl py-3.5 items-center mt-5" onPress={onAccept}>
            <Text className="text-white font-semibold text-sm">I understand and agree</Text>
          </TouchableOpacity>
          <TouchableOpacity className="py-3 items-center mt-1" onPress={onDecline}>
            <Text className="text-gray-500 text-sm">Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
