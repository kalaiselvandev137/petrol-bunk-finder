import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as FileSystem from 'expo-file-system/legacy';
import { COLORS, SOFT_SHADOW } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import apiurl from '../services/apiendpoint';

// Navy native header shared by every state of this screen
const HEADER_OPTIONS = {
  title: 'My Account',
  headerShown: true,
  headerStyle: { backgroundColor: COLORS.navy },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '700' },
  headerShadowVisible: false,
  statusBarStyle: 'light',
};

export default function AccountScreen() {
  const { token } = useAuth();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingField, setUploadingField] = useState(null);

  const fetchProfile = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${apiurl()}/employees/apigetprofile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || 'Failed to load account details'
        );
      }

      setProfile(data);
    } catch (e) {
      console.error('Failed to fetch account:', e);
      setError(e.message || 'Failed to load account details');
    } finally {
      setIsLoading(false);
    }
  };

  const captureAndUpload = async (fieldName) => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
      const mimeType = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      setUploadingField(fieldName);

      const uploadResult = await FileSystem.uploadAsync(
        `${apiurl()}/employees/apiupdateprofile`,
        asset.uri,
        {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName,
          mimeType,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      let data;
      try {
        data = JSON.parse(uploadResult.body);
      } catch {
        throw new Error('Unexpected server response');
      }

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(data?.message || 'Upload failed');
      }

      setProfile(data);
    } catch (e) {
      console.error('Upload failed:', e);
      Alert.alert('Upload failed', e.message || 'Please try again.');
    } finally {
      setUploadingField(null);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const fullName = [
    profile?.First_Name,
    profile?.Last_Name,
  ]
    .filter(Boolean)
    .join(' ');

  const displayName = fullName || 'Guest User';

  const imagePath = Array.isArray(profile?.Image)
    ? profile.Image[0]
    : null;

  const avatarUri = imagePath
    ? `${apiurl()}/${imagePath}`
    : null;

  const facePath = Array.isArray(profile?.face_verify_reference_image)
    ? profile.face_verify_reference_image[0]
    : null;
  const faceUri = facePath ? `${apiurl()}/${facePath}` : null;

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={HEADER_OPTIONS} />
        <SafeAreaView className="flex-1 bg-[#F4F7FB] items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.blue} />

          <Text className="text-[#5B6B8C] mt-3">
            Loading account...
          </Text>
        </SafeAreaView>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={HEADER_OPTIONS} />
        <SafeAreaView className="flex-1 bg-[#F4F7FB] items-center justify-center px-6">
          <Ionicons name="warning-outline" size={40} color={COLORS.warning} />
          <Text className="text-[#D93036] text-center mt-3">
            {error}
          </Text>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={HEADER_OPTIONS} />

      <SafeAreaView className="flex-1 bg-[#F4F7FB]" edges={['bottom']}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >

          {/* Profile Header */}
          <View className="bg-[#0B2559] rounded-b-[36px] items-center pt-2 pb-8 overflow-hidden">
            <View
              className="absolute w-44 h-44 rounded-full"
              style={{ top: -60, right: -40, backgroundColor: 'rgba(10,91,255,0.4)' }}
            />
            <View
              className="absolute w-32 h-32 rounded-full"
              style={{ bottom: -40, left: -30, backgroundColor: 'rgba(0,224,198,0.2)' }}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => captureAndUpload('Image')}
              disabled={uploadingField !== null}
              className="mb-4"
            >
            <Image
              source={
                avatarUri
                  ? { uri: avatarUri }
                  : require('../../assets/images/petrol-maps/profile.png')
              }
              className="w-28 h-28 rounded-full border-4 border-[#00E0C6] bg-white"
              resizeMode="cover"
            />

            {uploadingField === 'Image' && (
              <View className="absolute inset-0 rounded-full bg-black/40 items-center justify-center">
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}

            <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#00E0C6] items-center justify-center border-2 border-[#0B2559]">
              <Ionicons name="camera" size={18} color="#0B2559" />
            </View>
          </TouchableOpacity>

            <Text className="text-2xl font-bold text-white">
              {displayName}
            </Text>

            <View className="bg-[#00E0C6] px-3.5 py-1.5 rounded-full mt-2">
              <Text className="text-[#0B2559] text-xs font-bold">
                {profile?.Role || 'Member'}
              </Text>
            </View>
          </View>


          {/* Account Information */}
          <View
            className="bg-white rounded-2xl border border-[#E3EBF6] overflow-hidden mx-5 mt-6"
            style={SOFT_SHADOW}
          >

            <Text className="text-lg font-bold text-[#0B2559] px-5 pt-5 pb-3">
              Account details
            </Text>

            <AccountRow
              icon="person-outline"
              label="First name"
              value={profile?.First_Name}
            />

            <AccountRow
              icon="person-outline"
              label="Last name"
              value={profile?.Last_Name}
            />

            <AccountRow
              icon="mail-outline"
              label="Email"
              value={profile?.Email}
            />

            <AccountRow
              icon="call-outline"
              label="Mobile number"
              value={profile?.Mobilenumber}
            />

            <AccountRow
              icon="location-outline"
              label="Address"
              value={profile?.Address}
            />

            <AccountRow
              icon="briefcase-outline"
              label="Role"
              value={profile?.Role}
            />

            <AccountRow
              icon="shield-checkmark-outline"
              label="Status"
              value={profile?.Status}
              last
            />

          </View>

          <View
            className="bg-white rounded-2xl border border-[#E3EBF6] mx-5 mt-5 p-5"
            style={SOFT_SHADOW}
          >
            <Text className="text-lg font-bold text-[#0B2559]">Face verification</Text>
            <Text className="text-[#7A8AA8] text-xs mt-1 mb-4">
              A clear, front-facing photo used as your reference for face verification.
            </Text>

            <View className="flex-row items-center">
              <View className="w-24 h-24 rounded-2xl bg-[#E8F0FF] items-center justify-center overflow-hidden">
                {uploadingField === 'face_verify_reference_image' ? (
                  <ActivityIndicator color={COLORS.blue} />
                ) : faceUri ? (
                  <Image source={{ uri: faceUri }} className="w-24 h-24" resizeMode="cover" />
                ) : (
                  <Ionicons name="scan-outline" size={32} color={COLORS.blue} />
                )}
              </View>

              <View className="flex-1 ml-4">
                <TouchableOpacity
                  onPress={() => captureAndUpload('face_verify_reference_image')}
                  disabled={uploadingField !== null}
                  className="bg-[#0A5BFF] rounded-xl py-3 flex-row items-center justify-center"
                >
                  <Ionicons name="camera" size={18} color="#FFFFFF" />
                  <Text className="text-white font-semibold ml-2">
                    {faceUri ? 'Retake photo' : 'Take photo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}


function AccountRow({ icon, label, value, last = false }) {
  return (
    <View
      className={`flex-row items-center px-5 py-3.5 ${
        !last ? 'border-b border-[#EEF3FA]' : ''
      }`}
    >
      <View className="w-9 h-9 rounded-xl bg-[#E8F0FF] items-center justify-center mr-3">
        <Ionicons name={icon} size={17} color={COLORS.blue} />
      </View>

      <View className="flex-1">
        <Text className="text-[#7A8AA8] text-xs mb-0.5">
          {label}
        </Text>

        <Text className="text-[#0B2559] text-base font-medium">
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}