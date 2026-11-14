import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_SHADOW, COLORS, SOFT_SHADOW } from '../../constants/theme';
import { useAttendance } from '../../context/AttendanceContext';

function prettyTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function AttendanceCard() {
  const { attendance, checkedIn, onLeave, loading, busy, refresh, checkIn, checkOut } = useAttendance();

  // re-sync whenever Home comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const checkedOut = !!attendance?.checkOutAt && !checkedIn;

  const handleCheckIn = async () => {
    try {
      await checkIn();
    } catch (e) {
      Alert.alert('Check-in failed', e.message);
    }
  };

  const handleCheckOut = () => {
    Alert.alert(
      'Check out',
      'Check out for today?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check out',
          style: 'destructive',
          onPress: async () => {
            try {
              await checkOut();
            } catch (e) {
              Alert.alert('Check-out failed', e.message);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  let subtitle = 'Check in to start your day';
  if (loading) subtitle = "Checking today's status...";
  else if (onLeave) subtitle = 'You are marked on leave today';
  else if (checkedIn) subtitle = `Checked in at ${prettyTime(attendance?.checkInAt)}`;
  else if (checkedOut)
    subtitle = `In ${prettyTime(attendance.checkInAt)} · Out ${prettyTime(attendance.checkOutAt)}`;

  const iconBg = checkedIn ? '#D9F7F1' : onLeave ? '#FFF4D6' : '#E8F0FF';
  const iconColor = checkedIn ? COLORS.teal : onLeave ? '#9A6B00' : COLORS.blue;
  const iconName = checkedIn ? 'checkmark-circle' : onLeave ? 'calendar-outline' : 'finger-print-outline';

  return (
    <View className="bg-white rounded-3xl p-4 mb-4 border border-[#E3EBF6]" style={SOFT_SHADOW}>
      <View className="flex-row items-center">
        <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: iconBg }}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.blue} />
          ) : (
            <Ionicons name={iconName} size={22} color={iconColor} />
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-[#0B2559]">Attendance</Text>
          <Text className="text-xs text-[#7A8AA8] mt-0.5">{subtitle}</Text>
        </View>
        {checkedIn && (
          <View className="px-2.5 py-1 rounded-full bg-[#D9F7F1]">
            <Text className="text-[11px] font-semibold text-[#0A8F8F]">Present</Text>
          </View>
        )}
      </View>

      {/* {checkedIn && (
        <View className="flex-row items-center bg-[#E6FBF8] rounded-xl px-3 py-2 mt-3">
          <Ionicons name="navigate-circle-outline" size={16} color={COLORS.teal} />
          <Text className="text-xs text-[#0A8F8F] font-medium ml-2 flex-1">
            Location sharing is on until you check out
          </Text>
        </View>
      )} */}

      {!loading && !onLeave && (
        <TouchableOpacity
          className={`rounded-2xl py-3 items-center flex-row justify-center mt-3 ${
            checkedIn ? 'bg-white border border-[#F6D3D5]' : 'bg-[#0A5BFF]'
          }`}
          style={checkedIn ? null : BUTTON_SHADOW}
          onPress={checkedIn ? handleCheckOut : handleCheckIn}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator size="small" color={checkedIn ? COLORS.danger : '#FFFFFF'} />
          ) : (
            <>
              <Ionicons
                name={checkedIn ? 'log-out-outline' : 'log-in-outline'}
                size={18}
                color={checkedIn ? COLORS.danger : '#FFFFFF'}
              />
              <Text className={`font-semibold text-sm ml-2 ${checkedIn ? 'text-[#D93036]' : 'text-white'}`}>
                {checkedIn ? 'Check out' : checkedOut ? 'Check in again' : 'Check in'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
