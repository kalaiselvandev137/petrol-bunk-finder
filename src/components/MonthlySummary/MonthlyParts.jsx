import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { COLORS, GLASS, SOFT_SHADOW } from '../../constants/theme';
import MonthPickerModal from '../MonthPickerModal';

export const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// ---- Daily | Monthly switch (sits on the navy header) -----------------------
export function ViewToggle({ value, onChange }) {
  return (
    <View className="flex-row rounded-xl p-1 mb-3" style={{ backgroundColor: GLASS }}>
      {[
        { id: 'daily', label: 'Daily' },
        { id: 'monthly', label: 'Monthly' },
      ].map((o) => {
        const active = value === o.id;
        return (
          <TouchableOpacity
            key={o.id}
            className={`flex-1 py-2 rounded-lg items-center ${active ? 'bg-white' : ''}`}
            onPress={() => onChange(o.id)}
            activeOpacity={0.8}
          >
            <Text className={`text-sm font-semibold ${active ? 'text-[#0B2559]' : 'text-white'}`}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---- month selector: < October 2026 > ---------------------------------------
export function MonthBar({ value, onChange }) {
  const [show, setShow] = useState(false);
  const now = new Date();
  const atCurrent = value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth();
  const shift = (n) => onChange(new Date(value.getFullYear(), value.getMonth() + n, 1));

  return (
    <>
      <View className="flex-row items-center rounded-xl px-2 py-1.5" style={{ backgroundColor: GLASS }}>
        <TouchableOpacity className="w-9 h-9 items-center justify-center rounded-lg" onPress={() => shift(-1)}>
          <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 flex-row items-center justify-center" onPress={() => setShow(true)}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.mintSoft} />
          <Text className="text-sm font-semibold text-white ml-2">
            {value.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="w-9 h-9 items-center justify-center rounded-lg"
          onPress={() => shift(1)}
          disabled={atCurrent}
        >
          <Ionicons name="chevron-forward" size={18} color={atCurrent ? '#5B7099' : '#FFFFFF'} />
        </TouchableOpacity>
      </View>

      {!atCurrent && (
        <TouchableOpacity className="self-center mt-2" onPress={() => onChange(new Date())}>
          <Text className="text-xs font-medium text-[#7DF3E6]">Go to this month</Text>
        </TouchableOpacity>
      )}

      <MonthPickerModal
        visible={show}
        value={value}
        onSelect={(d) => {
          onChange(d);
          setShow(false);
        }}
        onClose={() => setShow(false)}
      />
    </>
  );
}

// ---- cards / blocks ------------------------------------------------------------
export function Card({ title, children }) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-4 border border-[#E3EBF6]" style={SOFT_SHADOW}>
      {!!title && <Text className="text-sm font-bold text-[#0B2559] mb-3">{title}</Text>}
      {children}
    </View>
  );
}

export function InsightsCard({ insights = [] }) {
  if (!insights.length) return null;
  return (
    <View className="bg-[#E8F0FF] rounded-2xl p-4 mb-4 border border-[#C9DBFF]">
      <View className="flex-row items-center mb-2">
        <Ionicons name="sparkles" size={16} color={COLORS.blue} />
        <Text className="text-sm font-bold text-[#0B2559] ml-1.5">Monthly insights</Text>
      </View>
      {insights.map((line, i) => (
        <View key={i} className="flex-row mt-1.5">
          <Text className="text-[#0A5BFF] mr-2">•</Text>
          <Text className="flex-1 text-sm text-[#0B2559] leading-5">{line}</Text>
        </View>
      ))}
    </View>
  );
}

export function StatTile({ label, value, accent }) {
  return (
    <View className="flex-1 bg-white rounded-2xl px-3 py-3 mx-1 border border-[#E3EBF6]" style={SOFT_SHADOW}>
      <Text className="text-[11px] text-[#7A8AA8] mb-1">{label}</Text>
      <Text className={`text-base font-bold ${accent || 'text-[#0B2559]'}`} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// green = up is good, red = down is bad; pass goodWhenUp={false} where lower is better
export function ChangePill({ pct, label = 'vs last month', goodWhenUp = true }) {
  if (pct == null) return null;
  const up = pct >= 0;
  const good = up === goodWhenUp;
  return (
    <View
      className={`flex-row items-center self-start px-2.5 py-1 rounded-full ${good ? 'bg-[#D9F7F1]' : 'bg-[#FDECEC]'}`}
    >
      <Ionicons
        name={up ? 'arrow-up' : 'arrow-down'}
        size={12}
        color={good ? '#0A8F8F' : COLORS.danger}
      />
      <Text className={`text-[11px] font-semibold ml-1 ${good ? 'text-[#0A8F8F]' : 'text-[#D93036]'}`}>
        {Math.abs(pct)}% {label}
      </Text>
    </View>
  );
}

// rows: [{ name, sub?, value }]
export function RankList({ rows = [], empty = 'Nothing to show yet.' }) {
  if (!rows.length) return <Text className="text-xs text-[#7A8AA8]">{empty}</Text>;
  return (
    <View>
      {rows.map((r, i) => (
        <View
          key={`${r.name}-${i}`}
          className={`flex-row items-center py-2.5 ${i < rows.length - 1 ? 'border-b border-[#EEF3FA]' : ''}`}
        >
          <View className="w-6 h-6 rounded-full bg-[#E8F0FF] items-center justify-center mr-3">
            <Text className="text-[11px] font-bold text-[#0A5BFF]">{i + 1}</Text>
          </View>
          <View className="flex-1 pr-2">
            <Text className="text-sm font-semibold text-[#0B2559]" numberOfLines={1}>{r.name}</Text>
            {!!r.sub && <Text className="text-[11px] text-[#7A8AA8]" numberOfLines={1}>{r.sub}</Text>}
          </View>
          <Text className="text-sm font-bold text-[#0B2559]">{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

// data: [{ date: 'YYYY-MM-DD', value }]  -> small bar chart, one bar per active day
export function TrendBars({ data = [], color = COLORS.blue }) {
  if (!data.length) return <Text className="text-xs text-[#7A8AA8]">No activity this month.</Text>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View>
      <View className="flex-row items-end" style={{ height: 90 }}>
        {data.map((d) => (
          <View key={d.date} className="flex-1 items-center justify-end mx-px" style={{ height: 90 }}>
            <View
              style={{
                width: '80%',
                height: Math.max(4, (d.value / max) * 84),
                backgroundColor: color,
                borderRadius: 4,
              }}
            />
          </View>
        ))}
      </View>
      <View className="flex-row justify-between mt-1.5">
        <Text className="text-[10px] text-[#9AA9C2]">{data[0].date.slice(8)}</Text>
        <Text className="text-[10px] text-[#9AA9C2]">{data[data.length - 1].date.slice(8)}</Text>
      </View>
    </View>
  );
}

export function Chip({ label, value, bg, text }) {
  return (
    <View className={`flex-1 mx-1 py-2.5 rounded-xl items-center ${bg}`}>
      <Text className={`text-lg font-extrabold ${text}`}>{value}</Text>
      <Text className={`text-[11px] font-medium ${text}`}>{label}</Text>
    </View>
  );
}