import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Linking, Pressable,
  RefreshControl, StatusBar, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalendarModal from '../../components/CalendarModal';
import AddFieldUpdateModal from '../../components/FieldUpdates/Addfieldupdatemodal';
import StripCard from '../../components/StripCard';
import { COLORS, GLASS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import apiurl from '../../services/apiendpoint';


const PAGE_SIZE = 10;

// ---- helpers -------------------------------------------------------------

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
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

function statusColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return { bg: 'bg-[#E8F0FF]', text: 'text-[#0A5BFF]', hex: '#0A5BFF' };
    case 'approved':
      return { bg: 'bg-[#D9F7F1]', text: 'text-[#0A8F8F]', hex: '#00C9B1' };
    case 'rejected':
      return { bg: 'bg-[#FDECEC]', text: 'text-[#D93036]', hex: '#D93036' };
    default:
      return { bg: 'bg-[#E8EEF8]', text: 'text-[#5B6B8C]', hex: '#9AA9C2' };
  }
}

// Image paths come back relative ("uploads/Fieldupdates/xxx.jpg")
function imageUrl(path) {
  if (!path) return null;
  const base = String(apiurl()).replace(/\/+$/, '');
  return `${base}/${encodeURI(String(path).replace(/^\/+/, ''))}`;
}

// ---- field update card -----------------------------------------------------

function FieldUpdateCard({ item, onPress }) {
  const status = statusColor(item.Status);
  const thumb = imageUrl(item.Visit_Image);
  const bunk = (item.Bunk_Name || '').trim();
  const dealer = (item.Dealer_Name || '').trim();
  const notes = (item.Visit_Notes || '').replace(/\r?\n/g, ' · ').trim();

  return (
    <StripCard color={status.hex} onPress={() => onPress?.(item)}>
      {/* Top: bunk name + status */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-semibold text-[#0B2559]" numberOfLines={1}>
            {bunk || '—'}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="location-outline" size={12} color={COLORS.faint} />
            <Text className="text-xs text-[#7A8AA8] ml-1" numberOfLines={1}>
              {item.City_Name}, {item.State_Name} · {item.Pincode}
            </Text>
          </View>
        </View>
        <View className={`px-2 py-1 rounded-full ${status.bg}`}>
          <Text className={`text-[11px] font-medium ${status.text}`}>
            {item.Status || '—'}
          </Text>
        </View>
      </View>

      {/* Middle: oil company / region + thumbnail */}
      <View className="flex-row items-center justify-between mt-3">
        <View className="flex-1 pr-3">
          <View className="flex-row flex-wrap">
            {!!item.Oil_Company && (
              <View className="flex-row items-center bg-[#E6FBF8] px-2.5 py-1 rounded-full mr-2 mb-1">
                <Ionicons name="flame-outline" size={12} color={COLORS.teal} />
                <Text className="text-xs font-medium text-[#0A8F8F] ml-1">{item.Oil_Company}</Text>
              </View>
            )}
            {!!item.Region && (
              <View className="flex-row items-center bg-[#EEF3FA] px-2.5 py-1 rounded-full mb-1">
                <Ionicons name="map-outline" size={12} color={COLORS.muted} />
                <Text className="text-xs font-medium text-[#5B6B8C] ml-1">{item.Region}</Text>
              </View>
            )}
          </View>

          {!!item.Complete_Address?.trim() && (
            <Text className="text-xs text-[#5B6B8C] mt-1" numberOfLines={1}>
              {item.Complete_Address.trim()}
            </Text>
          )}
        </View>

        {thumb && (
          <Image
            source={{ uri: thumb }}
            className="w-14 h-14 rounded-xl bg-[#EEF3FA]"
            resizeMode="cover"
          />
        )}
      </View>

      {/* Notes */}
      {!!notes && (
        <View className="bg-[#F4F7FB] rounded-xl px-3 py-2 mt-3">
          <Text className="text-[11px] text-[#7A8AA8] mb-0.5">Visit notes</Text>
          <Text className="text-sm text-[#0B2559]" numberOfLines={2}>
            {notes}
          </Text>
        </View>
      )}

      <View className="h-[1px] bg-[#EEF3FA] my-3" />

      {/* Bottom: dealer + time */}
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          className="flex-row items-center flex-1 pr-2"
          onPress={() => item.Dealer_Contact && Linking.openURL(`tel:${item.Dealer_Contact}`)}
        >
          <Ionicons name="call-outline" size={14} color={COLORS.blue} />
          <Text className="text-sm text-[#0A5BFF] font-medium ml-1.5" numberOfLines={1}>
            {dealer || 'Dealer'}{item.Dealer_Contact ? ` · ${item.Dealer_Contact}` : ''}
          </Text>
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Text className="text-[11px] text-[#7A8AA8] mr-1">
            {item.Employee_Name} · {prettyTime(item.createdAt)}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.disabled} />
        </View>
      </View>
    </StripCard>
  );
}

// ---- main screen ------------------------------------------------------------

export default function FieldUpdates() {
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const { token } = useAuth();
  const requestSeq = useRef(0);
  const debounceRef = useRef(null);
  const firstSearchRun = useRef(true);

  const fetchData = useCallback(
    async ({ first = 0, append = false, isRefresh = false } = {}) => {
      const seq = ++requestSeq.current;
      if (append) setLoadingMore(true);
      else if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          first: String(first),
          rows: String(PAGE_SIZE),
          globalfilter: search,
          selectedDate: formatDate(selectedDate),
        });
        const res = await fetch(
          `${apiurl()}/fieldupdates/apigetsalespersonfieldupdates?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();

        // ignore stale responses (e.g. fast typing while searching)
        if (seq !== requestSeq.current) return;

        if (!json.success) throw new Error('Request failed');

        const rows = json.resdata || [];
        setTotal(json.totallength || 0);
        setData((prev) => (append ? [...prev, ...rows] : rows));
        setHasMore(first + rows.length < (json.totallength || 0));
      } catch (e) {
        if (seq === requestSeq.current) {
          setError('Could not load field updates. Pull down to retry.');
        }
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [search, selectedDate, token]
  );

  // refetch on date change immediately (also runs on mount)
  useEffect(() => {
    fetchData({ first: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // debounce search input (skip initial mount; the date effect already fetched)
  useEffect(() => {
    if (firstSearchRun.current) {
      firstSearchRun.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData({ first: 0 });
    }, 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const shiftDate = (days) => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      return d;
    });
  };

  const isToday = formatDate(selectedDate) === formatDate(new Date());

  const onSelectDate = (pickedDate) => {
    setSelectedDate(pickedDate);
    setShowPicker(false);
  };

  const onEndReached = () => {
    if (!hasMore || loadingMore || loading) return;
    fetchData({ first: data.length, append: true });
  };

  // after a new entry is saved, jump to today and reload
  const handleAdded = () => {
    if (isToday) fetchData({ first: 0 });
    else setSelectedDate(new Date()); // date effect refetches
  };

  // placeholder: detail view / edit will be added next
  const openDetail = (item) => {};

  return (
    <SafeAreaView className="flex-1 bg-[#0B2559]" edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 pt-2 pb-5">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-extrabold text-white">Field Updates</Text>
          <View className="flex-row items-center">
            {!loading && !error && (
              <View className="px-2.5 py-1 rounded-full mr-2" style={{ backgroundColor: GLASS }}>
                <Text className="text-xs font-semibold text-white">
                  {total} {total === 1 ? 'visit' : 'visits'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              className="flex-row items-center bg-[#00E0C6] px-3 py-1.5 rounded-full"
              onPress={() => setShowAdd(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color={COLORS.navy} />
              <Text className="text-xs font-bold text-[#0B2559] ml-1">Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-white rounded-xl px-3 py-2.5 mb-3">
          <Ionicons name="search-outline" size={16} color={COLORS.soft} />
          <TextInput
            className="flex-1 text-sm text-[#0B2559] ml-2"
            placeholder="Search bunk, dealer, city..."
            placeholderTextColor={COLORS.faint}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.faint} />
            </TouchableOpacity>
          )}
        </View>

        {/* Date filter */}
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
            <Text className="text-sm font-semibold text-white ml-2">
              {prettyDate(selectedDate)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-9 h-9 items-center justify-center rounded-lg"
            onPress={() => shiftDate(1)}
            disabled={isToday}
          >
            <Ionicons name="chevron-forward" size={18} color={isToday ? '#5B7099' : '#FFFFFF'} />
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
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="warning-outline" size={40} color={COLORS.warning} />
            <Text className="text-[#5B6B8C] text-center text-sm mt-3 mb-4">{error}</Text>
            <Pressable
              className="bg-[#0A5BFF] px-5 py-2.5 rounded-xl"
              onPress={() => fetchData({ first: 0 })}
            >
              <Text className="text-white font-semibold text-sm">Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <FieldUpdateCard item={item} onPress={openDetail} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchData({ first: 0, isRefresh: true })}
                tintColor={COLORS.blue}
                colors={[COLORS.blue]}
              />
            }
            onEndReachedThreshold={0.4}
            onEndReached={onEndReached}
            ListEmptyComponent={
              <View className="items-center justify-center mt-24 px-8">
                <Ionicons name="file-tray-outline" size={44} color={COLORS.disabled} />
                <Text className="text-lg font-bold text-[#0B2559] text-center mt-4">
                  No field updates found
                </Text>
                <Text className="text-[#5B6B8C] text-center mt-2 text-sm">
                  Try a different search term or pick another date.
                </Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <View className="py-4">
                  <ActivityIndicator size="small" color={COLORS.blue} />
                </View>
              ) : null
            }
          />
        )}
      </View>

      <AddFieldUpdateModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={handleAdded}
      />
    </SafeAreaView>
  );
}