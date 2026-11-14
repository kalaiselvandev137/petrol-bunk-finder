import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { OVERLAY } from '../constants/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Pure-JS month picker (year arrows + 12 month buttons). Future months are disabled.
export default function MonthPickerModal({ visible, value, onSelect, onClose }) {
  const [year, setYear] = useState(value.getFullYear());

  useEffect(() => {
    if (visible) setYear(value.getFullYear());
  }, [visible, value]);

  const now = new Date();
  const isFuture = (m) =>
    year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth());
  const isSelected = (m) => year === value.getFullYear() && m === value.getMonth();
  const isCurrent = (m) => year === now.getFullYear() && m === now.getMonth();
  const atCurrentYear = year >= now.getFullYear();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: OVERLAY }}
        onPress={onClose}
      >
        <Pressable className="bg-white rounded-3xl w-full max-w-sm overflow-hidden" onPress={() => {}}>
          <View className="flex-row items-center justify-between bg-[#0B2559] px-3 py-3">
            <TouchableOpacity className="w-9 h-9 items-center justify-center" onPress={() => setYear((y) => y - 1)}>
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-base font-semibold text-white">{year}</Text>
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center"
              onPress={() => setYear((y) => y + 1)}
              disabled={atCurrentYear}
            >
              <Ionicons name="chevron-forward" size={20} color={atCurrentYear ? '#5B7099' : '#FFFFFF'} />
            </TouchableOpacity>
          </View>

          <View className="p-4 flex-row flex-wrap">
            {MONTHS.map((label, m) => {
              const disabled = isFuture(m);
              const selected = isSelected(m);
              return (
                <View key={label} style={{ width: '33.33%' }} className="p-1.5">
                  <TouchableOpacity
                    disabled={disabled}
                    onPress={() => onSelect(new Date(year, m, 1))}
                    className={`py-3 rounded-xl items-center border ${
                      selected
                        ? 'bg-[#0A5BFF] border-[#0A5BFF]'
                        : isCurrent(m)
                        ? 'bg-[#E6FBF8] border-[#B9F3EA]'
                        : 'bg-white border-[#DCE6F4]'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selected ? 'text-white' : disabled ? 'text-[#C5D0E3]' : 'text-[#0B2559]'
                      }`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <TouchableOpacity className="mb-3 self-center px-4 py-2" onPress={onClose}>
            <Text className="text-sm text-[#5B6B8C] font-medium">Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}