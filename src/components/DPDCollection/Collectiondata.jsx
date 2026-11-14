import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Keyboard, Linking, Pressable,
  RefreshControl, StatusBar, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalendarModal from '../../components/CalendarModal';
import StripCard from '../../components/StripCard';
import { BUTTON_SHADOW, COLORS, GLASS, SOFT_SHADOW } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import apiurl from '../../services/apiendpoint';
import { ViewToggle } from '../MonthlySummary/MonthlyParts';
import DpdMonthlyView from './DpdMonthlyView';


const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['Pending', 'Partial', 'Collected'];

// ---- helpers -------------------------------------------------------------

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatMoney(n) {
  const num = Number(n) || 0;
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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

function dpdColor(dpd) {
  if (dpd >= 30) return { bg: 'bg-[#FDECEC]', text: 'text-[#D93036]', dot: 'bg-[#D93036]', hex: '#D93036' };
  if (dpd >= 10) return { bg: 'bg-[#FFF4D6]', text: 'text-[#9A6B00]', dot: 'bg-[#F5A524]', hex: '#F5A524' };
  return { bg: 'bg-[#D9F7F1]', text: 'text-[#0A8F8F]', dot: 'bg-[#00C9B1]', hex: '#00C9B1' };
}

function statusColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'collected':
      return { bg: 'bg-[#D9F7F1]', text: 'text-[#0A8F8F]' };
    case 'partial':
      return { bg: 'bg-[#FFF4D6]', text: 'text-[#9A6B00]' };
    default:
      return { bg: 'bg-[#E8EEF8]', text: 'text-[#5B6B8C]' };
  }
}

// ---- summary card ---------------------------------------------------------

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

// ---- customer row ----------------------------------------------------------

function CustomerCard({ item, onPress }) {
  const dpd = dpdColor(item.Max_of_DPD || 0);
  const status = statusColor(item.Status);

  return (
    <StripCard color={dpd.hex} onPress={() => onPress(item)}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-semibold text-[#0B2559]" numberOfLines={1}>
            {item._baseName || item.Customer_Name}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="location-outline" size={12} color={COLORS.faint} />
            <Text className="text-xs text-[#7A8AA8] ml-1">
              {item.Customer_ID} · {item.City}, {item.State}
            </Text>
          </View>
        </View>
        <View className={`px-2 py-1 rounded-full ${status.bg}`}>
          <Text className={`text-[11px] font-medium ${status.text}`}>
            {item.Status || 'Pending'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mt-3">
        <View>
          <Text className="text-[11px] text-[#7A8AA8]">Outstanding</Text>
          <Text className="text-lg font-bold text-[#0B2559]">
            {formatMoney(item.Sum_Of_Total_Outstanding)}
          </Text>
        </View>

        <View className={`flex-row items-center px-2.5 py-1 rounded-full ${dpd.bg}`}>
          <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dpd.dot}`} />
          <Text className={`text-xs font-semibold ${dpd.text}`}>
            {item.Max_of_DPD} DPD
          </Text>
        </View>
      </View>

      <View className="h-[1px] bg-[#EEF3FA] my-3" />

      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => item.Contact_No && Linking.openURL(`tel:${item.Contact_No}`)}
        >
          <Ionicons name="call-outline" size={14} color={COLORS.blue} />
          <Text className="text-sm text-[#0A5BFF] font-medium ml-1.5">
            {item.Contact_No || '—'}
          </Text>
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Text className="text-[11px] text-[#7A8AA8] mr-1">
            Updated {prettyDate(item._lastUpdated)}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.disabled} />
        </View>
      </View>
    </StripCard>
  );
}

// ---- detail bottom sheet ----------------------------------------------------

function DetailRow({ icon, label, value }) {
  return (
    <View className="flex-row items-center py-2.5 border-b border-[#EEF3FA]">
      <View className="w-8 items-center">
        <Ionicons name={icon} size={16} color={COLORS.soft} />
      </View>
      <Text className="text-xs text-[#7A8AA8] flex-1">{label}</Text>
      <Text className="text-sm font-medium text-[#0B2559] flex-1 text-right" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function CollectionDetailSheet({ sheetRef, item, token, onSaved }) {
  const [status, setStatus] = useState('Pending');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const snapPoints = useMemo(() => ['85%'], []);

  useEffect(() => {
    if (item) {
      setStatus(item.Status || 'Pending');
      setAmount(item.Collecting_Money ? String(item.Collecting_Money) : '');
      setRemarks(item.Remarks || '');
      setSaveError(null);
    }
  }, [item]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
    ),
    []
  );

  if (!item) return null;

  const dpd = dpdColor(item.Max_of_DPD || 0);

  const handleSave = async () => {
    Keyboard.dismiss();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${apiurl()}/dpd-collection/apiupdatedpdcollection`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          collectionId: item.collectionId,
          entryIndex: item.entryIndex,
          updatedEntry: {
            Customer_Name: item.Customer_Name || item._baseName,
            City: item.City,
            State: item.State,
            Sum_Of_Total_Outstanding: item.Sum_Of_Total_Outstanding,
            Max_of_DPD: item.Max_of_DPD,
            Contact_No: item.Contact_No,
            Customer_ID: item.Customer_ID,
            Collecting_Money: Number(amount) || 0,
            Remarks: remarks,
            Status: status,
            collectionDate: item.collectionDate,
            employeeName: item.employeeName,
            uploadMethod: item.uploadMethod,
            _addedOn: item._addedOn,
            _baseName: item._baseName,
            _extractedId: item._extractedId,
            _fullName: item._fullName,
            _isNew: item._isNew,
            _uploadIndex: item._uploadIndex,
          }
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message || 'Update failed');
      }
      onSaved({ ...item, Collecting_Money: Number(amount) || 0, Status: status, Remarks: remarks });
      sheetRef.current?.close();
    } catch (e) {
      setSaveError('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet ref={sheetRef} index={-1} snapPoints={snapPoints} enablePanDownToClose
      backdropComponent={renderBackdrop} handleIndicatorStyle={{ backgroundColor: '#C5D0E3', width: 40 }}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-1 pr-2">
            <Text className="text-lg font-bold text-[#0B2559]">
              {item._baseName || item.Customer_Name}
            </Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="location-outline" size={13} color={COLORS.faint} />
              <Text className="text-xs text-[#7A8AA8] ml-1">
                {item.City}, {item.State}
              </Text>
            </View>
          </View>
          <View className={`flex-row items-center px-2.5 py-1 rounded-full ${dpd.bg}`}>
            <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dpd.dot}`} />
            <Text className={`text-xs font-semibold ${dpd.text}`}>{item.Max_of_DPD} DPD</Text>
          </View>
        </View>

        <TouchableOpacity className="flex-row items-center self-start mt-2 mb-4 px-3 py-2 rounded-full bg-[#E8F0FF]"
          onPress={() => item.Contact_No && Linking.openURL(`tel:${item.Contact_No}`)}
        >
          <Ionicons name="call-outline" size={14} color={COLORS.blue} />
          <Text className="text-sm text-[#0A5BFF] font-semibold ml-1.5">{item.Contact_No}</Text>
        </TouchableOpacity>

        {/* Read-only details */}
        <View className="bg-[#F4F7FB] rounded-2xl px-3 mb-5">
          <DetailRow icon="pricetag-outline" label="Customer ID" value={item.Customer_ID} />
          <DetailRow icon="cash-outline" label="Outstanding" value={formatMoney(item.Sum_Of_Total_Outstanding)}/>
          <DetailRow icon="person-outline" label="Assigned to" value={item.employeeName} />
          <DetailRow icon="time-outline" label="Last updated" value={prettyDate(item._lastUpdated)} />
        </View>

        {/* Editable: Status */}
        <Text className="text-sm font-semibold text-[#0B2559] mb-2">Status</Text>
        <View className="flex-row mb-5">
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt;
            return (
              <TouchableOpacity key={opt} onPress={() => setStatus(opt)}
                className={`flex-1 mr-2 py-2.5 rounded-xl items-center border ${
                  active ? 'bg-[#0A5BFF] border-[#0A5BFF]' : 'bg-white border-[#DCE6F4]'
                }`}
              >
                <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-[#5B6B8C]'}`}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Editable: Collecting money */}
        <Text className="text-sm font-semibold text-[#0B2559] mb-2">Collecting money</Text>
        <View className="flex-row items-center bg-[#F1F5FB] border border-[#E3EBF6] rounded-xl px-3 mb-5">
          <Ionicons name="cash-outline" size={16} color={COLORS.muted} />
          <TextInput
            className="flex-1 text-sm text-[#0B2559] py-3 ml-2"
            placeholder="0"
            placeholderTextColor={COLORS.faint}
            keyboardType="numeric"
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
          />
        </View>

        {/* Editable: Remarks */}
        <Text className="text-sm font-semibold text-[#0B2559] mb-2">Remarks</Text>
        <View className="bg-[#F1F5FB] border border-[#E3EBF6] rounded-xl px-3 mb-2">
          <TextInput
            className="text-sm text-[#0B2559] py-3"
            placeholder="Add a note (optional)"
            placeholderTextColor={COLORS.faint}
            value={remarks}
            onChangeText={setRemarks}
            multiline
          />
        </View>

        {saveError && (
          <View className="flex-row items-center mt-2">
            <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
            <Text className="text-xs text-[#D93036] ml-1">{saveError}</Text>
          </View>
        )}

        <TouchableOpacity
          className="bg-[#0A5BFF] rounded-2xl py-3.5 items-center mt-5 flex-row justify-center"
          style={BUTTON_SHADOW}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text className="text-white font-semibold text-sm ml-2">Save changes</Text>
            </>
          )}
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

// ---- main screen ------------------------------------------------------------

export default function CollectionData() {
  const [view, setView] = useState('daily'); // 'daily' | 'monthly'
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { token } = useAuth();
  const requestSeq = useRef(0);
  const debounceRef = useRef(null);
  const sheetRef = useRef(null);

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
        const res = await fetch(`${apiurl()}/dpd-collection/apigetsalespersondpdcollections?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();

        // ignore stale responses (e.g. fast typing while searching)
        if (seq !== requestSeq.current) return;

        if (!json.success) throw new Error('Request failed');

        const rows = json.resdata || [];
        setSummary(json.summary || null);
        setData((prev) => (append ? [...prev, ...rows] : rows));
        setHasMore(first + rows.length < (json.totallength || 0));
      } catch (e) {
        if (seq === requestSeq.current) {
          setError('Could not load collections. Pull down to retry.');
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

  // refetch on date change immediately
  useEffect(() => {
    fetchData({ first: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // debounce search input
  useEffect(() => {
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

  const openDetail = (item) => {
    setSelectedItem(item);
    sheetRef.current?.expand();
  };

  const handleSaved = (updatedItem) => {
    setData((prev) =>
      prev.map((row) =>
        row.Customer_ID === updatedItem.Customer_ID && row.entryIndex === updatedItem.entryIndex
          ? updatedItem
          : row
      )
    );
  };

  // ---- monthly view (new) ----
  if (view === 'monthly') {
    return (
      <SafeAreaView className="flex-1 bg-[#0B2559]" edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View className="px-4 pt-2">
          <Text className="text-2xl font-extrabold text-white mb-3">Collections</Text>
          <ViewToggle value={view} onChange={setView} />
        </View>
        <DpdMonthlyView />
      </SafeAreaView>
    );
  }

  // ---- daily view (original) ----
  return (
    <SafeAreaView className="flex-1 bg-[#0B2559]" edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 pt-2 pb-5">
        <Text className="text-2xl font-extrabold text-white mb-3">Collections</Text>

        <ViewToggle value={view} onChange={setView} />

        {/* Search */}
        <View className="flex-row items-center bg-white rounded-xl px-3 py-2.5 mb-3">
          <Ionicons name="search-outline" size={16} color={COLORS.soft} />
          <TextInput
            className="flex-1 text-sm text-[#0B2559] ml-2"
            placeholder="Search customer, city, ID..."
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
          >
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
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
        {summary && (
          <View className="flex-row px-3 pt-4 pb-3">
            <SummaryCard
              label="Outstanding"
              value={formatMoney(summary.remainingOutstanding)}
            />
            <SummaryCard
              label="Collected"
              value={formatMoney(summary.totalCollected)}
              accent="text-[#0A8F8F]"
            />
            <SummaryCard
              label="Customers"
              value={String(summary.totalCustomers ?? data.length)}
            />
            <SummaryCard label="Avg DPD" value={String(summary.avgDPD ?? '—')} />
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
            keyExtractor={(item, idx) =>
              `${item.Customer_ID}-${item.entryIndex ?? idx}`
            }
            renderItem={({ item }) => <CustomerCard item={item} onPress={openDetail} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: summary ? 4 : 16, paddingBottom: 24 }}
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
                  No collections found
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

      <CollectionDetailSheet
        sheetRef={sheetRef}
        item={selectedItem}
        token={token}
        onSaved={handleSaved}
      />
    </SafeAreaView>
  );
}