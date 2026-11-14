import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { OVERLAY } from '../constants/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Pure-JS calendar picker (no native module needed)
export default function CalendarModal({ visible, value, onSelect, onClose }) {
  const [viewMonth, setViewMonth] = useState(
    new Date(value.getFullYear(), value.getMonth(), 1)
  );

  useEffect(() => {
    if (visible) setViewMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [visible, value]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDayIdx = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayIdx; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const changeMonth = (delta) => setViewMonth(new Date(year, month + delta, 1));

  const isFuture = (d) => new Date(year, month, d) > today;
  const isSelected = (d) =>
    d === value.getDate() && month === value.getMonth() && year === value.getFullYear();
  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const atCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: OVERLAY }}
        onPress={onClose}
      >
        <Pressable className="bg-white rounded-3xl w-full max-w-sm overflow-hidden" onPress={() => {}}>
          {/* Month header */}
          <View className="flex-row items-center justify-between bg-[#0B2559] px-3 py-3">
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center"
              onPress={() => changeMonth(-1)}
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-base font-semibold text-white">
              {viewMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center"
              onPress={() => changeMonth(1)}
              disabled={atCurrentMonth}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={atCurrentMonth ? '#5B7099' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>

          <View className="p-4">
            {/* Weekday labels */}
            <View className="flex-row mb-1">
              {WEEKDAYS.map((w, i) => (
                <View key={i} className="flex-1 items-center py-1">
                  <Text className="text-[11px] text-[#7A8AA8] font-medium">{w}</Text>
                </View>
              ))}
            </View>

            {/* Day grid */}
            <View className="flex-row flex-wrap">
              {cells.map((d, idx) => {
                if (d === null) {
                  return <View key={idx} style={{ width: '14.28%' }} className="h-10" />;
                }
                const disabled = isFuture(d);
                const selected = isSelected(d);
                return (
                  <View key={idx} style={{ width: '14.28%' }} className="h-10 items-center justify-center">
                    <TouchableOpacity
                      disabled={disabled}
                      onPress={() => onSelect(new Date(year, month, d))}
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        selected ? 'bg-[#0A5BFF]' : isToday(d) ? 'bg-[#E6FBF8]' : ''
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          selected
                            ? 'text-white font-semibold'
                            : disabled
                            ? 'text-[#C5D0E3]'
                            : isToday(d)
                            ? 'text-[#0A8F8F] font-semibold'
                            : 'text-[#0B2559]'
                        }`}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity className="mt-3 self-center px-4 py-2" onPress={onClose}>
              <Text className="text-sm text-[#5B6B8C] font-medium">Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}