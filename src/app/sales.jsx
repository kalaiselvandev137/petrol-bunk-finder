import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl, StatusBar, Text, TouchableOpacity, View,
} from 'react-native';
import CalendarModal from '../components/CalendarModal';
import StripCard from '../components/StripCard';
import { COLORS, GLASS, SOFT_SHADOW } from '../constants/theme';
import { outcomeMeta } from '../constants/visitOutcomes';
import { useAuth } from '../context/AuthContext';
import apiurl from '../services/apiendpoint';

// ---- helpers ---------------------------------------------------------------

// Local date (the old toISOString() version returns yesterday between 12:00-5:30 AM IST)
function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDate(d) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function prettyTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDistance(m) {
  const n = Number(m);
  if (!Number.isFinite(n)) return '';
  return n < 1000 ? `${Math.round(n)} m` : `${(n / 1000).toFixed(1)} km`;
}

// ---- summary card ----------------------------------------------------------

function SummaryCard({ label, value, accent }) {
  return (
    <View
      className="flex-1 bg-white rounded-2xl px-3 py-3 mx-1 border border-[#E3EBF6]"
      style={SOFT_SHADOW}
    >
      <Text className="text-[11px] text-[#7A8AA8] mb-1">{label}</Text>
      <Text className={`text-base font-bold ${accent || 'text-[#0B2559]'}`} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ---- visit card ------------------------------------------------------------

function VisitCard({ item }) {
  const meta = outcomeMeta(item.Outcome);
  const onSite = item.On_Site === true || item.On_Site === 'true';
  const offSite = item.On_Site === false || item.On_Site === 'false';

  return (
    <StripCard color={meta.strip}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-semibold text-[#0B2559]" numberOfLines={1}>
            {item.Dealer_Name}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="pricetag-outline" size={12} color={COLORS.faint} />
            <Text className="text-xs text-[#7A8AA8] ml-1">
              {item.Lead_ID}{item.OMC ? ` · ${item.OMC}` : ''}
            </Text>
          </View>
        </View>
        <View
          className="flex-row items-center px-2.5 py-1 rounded-full"
          style={{ backgroundColor: meta.bg }}
        >
          <Ionicons name={meta.icon} size={12} color={meta.text} />
          <Text className="text-[11px] font-semibold ml-1" style={{ color: meta.text }}>
            {meta.label}
          </Text>
        </View>
      </View>

      {!!item.Notes?.trim() && (
        <View className="bg-[#F4F7FB] rounded-xl px-3 py-2 mt-3">
          <Text className="text-[11px] text-[#7A8AA8] mb-0.5">Notes</Text>
          <Text className="text-sm text-[#0B2559]" numberOfLines={2}>
            {item.Notes.trim()}
          </Text>
        </View>
      )}

      {!!item.Follow_Up_Date && (
        <View className="flex-row items-center mt-3 self-start px-2.5 py-1 rounded-full bg-[#FFF4D6]">
          <Ionicons name="calendar-outline" size={12} color="#9A6B00" />
          <Text className="text-xs font-medium text-[#9A6B00] ml-1">
            Follow up on {prettyDate(item.Follow_Up_Date)}
          </Text>
        </View>
      )}

      <View className="h-[1px] bg-[#EEF3FA] my-3" />

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={13} color={COLORS.soft} />
          <Text className="text-xs text-[#5B6B8C] ml-1">{prettyTime(item.createdAt)}</Text>
        </View>

        {(onSite || offSite) && (
          <View className="flex-row items-center">
            <Ionicons
              name={onSite ? 'checkmark-circle' : 'warning'}
              size={13}
              color={onSite ? COLORS.teal : COLORS.warning}
            />
            <Text
              className="text-xs font-medium ml-1"
              style={{ color: onSite ? COLORS.teal : '#9A6B00' }}
            >
              {onSite ? 'On site' : `${formatDistance(item.Distance_From_Dealer)} away`}
            </Text>
          </View>
        )}
      </View>
    </StripCard>
  );
}

// ---- screen ------------------------------------------------------------------

export default function SalesScreen() {
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visits, setVisits] = useState([]);
  const [allocated, setAllocated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const isToday = formatDate(selectedDate) === formatDate(new Date());

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const params = new URLSearchParams({
          first: '0',
          rows: '100',
          globalfilter: '',
          selectedDate: formatDate(selectedDate),
        });

        const [visitsRes, dealersJson] = await Promise.all([
          fetch(`${apiurl()}/dealervisits/apigetsalespersondealervisits?${params.toString()}`, { headers }),
          // rows=1 -> we only need totallength (dealers allocated to this salesman)
          fetch(`${apiurl()}/dealers/apigetdealersbysalesman?first=0&rows=1&globalfilter=`, { headers })
            .then((r) => r.json())
            .catch(() => null),
        ]);

        const json = await visitsRes.json();
        if (!json.success) throw new Error('Request failed');

        setVisits(json.resdata || []);
        setAllocated(dealersJson?.totallength ?? null);
      } catch {
        setError('Could not load visits. Pull down to retry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, selectedDate]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const count = (o) => visits.filter((v) => v.Outcome === o).length;
    return {
      visited: new Set(visits.map((v) => v.Dealer_ID)).size,
      onboarded: count('Onboarded'),
      interested: count('Interested'),
      followUps: count('Follow-up'),
    };
  }, [visits]);

  const shiftDate = (days) =>
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      return d;
    });

  const onSelectDate = (picked) => {
    setSelectedDate(picked);
    setShowPicker(false);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: isToday ? "Today's Sales" : 'Sales',
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.navy },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      />
      <StatusBar barStyle="light-content" />

      <View className="flex-1 bg-[#0B2559]">
        {/* Date filter */}
        <View className="px-4 pt-2 pb-5">
          <View className="flex-row items-center rounded-xl px-2 py-1.5" style={{ backgroundColor: GLASS }}>
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center rounded-lg"
              onPress={() => shiftDate(-1)}
            >
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 items-center flex-row justify-center"
              onPress={() => setShowPicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={COLORS.mintSoft} />
              <Text className="text-sm font-semibold text-white ml-2">{prettyDate(selectedDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-9 h-9 items-center justify-center rounded-lg"
              onPress={() => shiftDate(1)}
              disabled={isToday}
            >
              <Ionicons name="chevron-forward" size={18} color={isToday ? 'rgba(255,255,255,0.3)' : '#FFFFFF'} />
            </TouchableOpacity>
          </View>

          {!isToday && (
            <TouchableOpacity onPress={() => setSelectedDate(new Date())} className="self-center mt-2">
              <Text className="text-xs font-medium text-[#7DF3E6]">Go to today</Text>
            </TouchableOpacity>
          )}
        </View>

        <CalendarModal
          visible={showPicker}
          value={selectedDate}
          onSelect={onSelectDate}
          onClose={() => setShowPicker(false)}
        />

        {/* Body sheet */}
        <View className="flex-1 bg-[#F4F7FB] rounded-t-[28px] overflow-hidden">
          {/* Summary strip */}
          {!loading && !error && (
            <View className="flex-row px-3 pt-4 pb-3">
              <SummaryCard
                label="Visited"
                value={allocated != null ? `${stats.visited}/${allocated}` : String(stats.visited)}
              />
              <SummaryCard label="Onboarded" value={String(stats.onboarded)} accent="text-[#0A8F8F]" />
              <SummaryCard label="Interested" value={String(stats.interested)} accent="text-[#0A5BFF]" />
              <SummaryCard label="Follow-ups" value={String(stats.followUps)} accent="text-[#9A6B00]" />
            </View>
          )}

          {/* List */}
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={COLORS.blue} />
            </View>
          ) : error ? (
            <View className="flex-1 items-center justify-center px-8">
              <Ionicons name="warning-outline" size={40} color={COLORS.warning} />
              <Text className="text-[#5B6B8C] text-center text-sm mt-3 mb-4">{error}</Text>
              <Pressable className="bg-[#0A5BFF] px-5 py-2.5 rounded-xl" onPress={() => fetchData()}>
                <Text className="text-white font-semibold text-sm">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={visits}
              keyExtractor={(item, idx) => item._id || `${item.Dealer_ID}-${idx}`}
              renderItem={({ item }) => <VisitCard item={item} />}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchData(true)}
                  tintColor={COLORS.blue}
                  colors={[COLORS.blue]}
                />
              }
              ListEmptyComponent={
                <View className="items-center justify-center mt-24 px-8">
                  <Ionicons name="file-tray-outline" size={44} color={COLORS.disabled} />
                  <Text className="text-lg font-bold text-[#0B2559] text-center mt-4">
                    {isToday ? 'No dealer visits today' : 'No visits on this day'}
                  </Text>
                  <Text className="text-[#5B6B8C] text-center mt-2 text-sm">
                    {isToday
                      ? 'Open My Dealers and tap the visit button on a dealer to log a visit.'
                      : 'Pick another date to see earlier visits.'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </>
  );
}