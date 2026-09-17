import { Image, Text, View } from 'react-native';

export default function ProfileCard ({ avatarUri, displayName, displayEmail, displayMobile, displayRole, displayStatus }) {

    return (
        <>
        <View className="items-center pt-14 pb-8">
         <Image
            source={
              avatarUri
                ? { uri: avatarUri }
                : require('../../../assets/images/petrol-maps/profile.png')
            }
            className="w-28 h-28 rounded-full mb-4"
            resizeMode="cover"
          />

          <Text className="text-2xl font-bold text-gray-900 text-center">
            {displayName}
          </Text>

          <View className="bg-orange-100 px-3 py-1 rounded-full mt-2">
            <Text className="text-orange-600 text-xs font-semibold uppercase tracking-wide">
              {displayRole}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View className="bg-gray-50 rounded-2xl p-5 mb-6">
          <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
            <Text className="text-gray-500 text-sm">Name</Text>
            <Text className="text-gray-900 text-sm font-semibold">
              {displayName}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
            <Text className="text-gray-500 text-sm">Email</Text>
            <Text className="text-gray-900 text-sm font-semibold">
              {displayEmail}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
            <Text className="text-gray-500 text-sm">Mobile</Text>
            <Text className="text-gray-900 text-sm font-semibold">
              {displayMobile}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
            <Text className="text-gray-500 text-sm">Role</Text>
            <Text className="text-gray-900 text-sm font-semibold">
              {displayRole}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-3">
            <Text className="text-gray-500 text-sm">Status</Text>
            <Text className={`text-sm font-semibold ${
                displayStatus === 'Active' ? 'text-green-600' : 'text-gray-900'}`}
            >
              {displayStatus}
            </Text>
          </View>
        </View>
        </>
    )
}