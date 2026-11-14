import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, StatusBar, Text, TouchableOpacity, View,
} from 'react-native';
import AttendanceCard from '../../components/Attendance/AttendanceCard';
import { ChangePill, MonthBar, ViewToggle } from '../../components/MonthlySummary/MonthlyParts';
import { BUTTON_SHADOW, CARD_SHADOW, SOFT_SHADOW } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import apiurl from '../../services/apiendpoint';

// ---- helpers -------------------------------------------------------------

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function monthParam(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function prettyToday() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatMoney(n) {
  const num = Number(n) || 0;
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function prettyTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function prettyShortDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ---- small UI pieces -------------------------------------------------------

function Stat({ label, value, color = '#0B2559' }) {
  return (
    <View className="flex-1 bg-[#F4F7FB] rounded-2xl px-3 py-3 mx-1">
      <Text className="text-[11px] text-[#5B6B8C] mb-1">{label}</Text>
      <Text className="text-base font-bold" style={{ color }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SectionCard({ icon, iconColor, iconBg, title, subtitle, onPress, children }) {
  return (
    <View
      className="bg-white rounded-3xl p-4 mb-4 border border-[#E3EBF6]"
      style={SOFT_SHADOW}
    >
      <TouchableOpacity
        className="flex-row items-center justify-between mb-3"
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          <View
            className="w-11 h-11 rounded-2xl items-center justify-center"
            style={{ backgroundColor: iconBg }}
          >
            <Ionicons name={icon} size={22} color={iconColor} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-[#0B2559]">{title}</Text>
            <Text className="text-xs text-[#7A8AA8] mt-0.5">{subtitle}</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <Text className="text-xs font-semibold text-[#0A5BFF] mr-1">View all</Text>
          <Ionicons name="chevron-forward" size={14} color="#0A5BFF" />
        </View>
      </TouchableOpacity>
      {children}
    </View>
  );
}

// AI-style bullet lines coming from the backend `insights` array
function MiniInsights({ lines = [], max = 3 }) {
  if (!lines.length) return null;
  return (
    <View className="bg-[#E8F0FF] rounded-2xl px-3 py-3 mt-4">
      <View className="flex-row items-center mb-1">
        <Ionicons name="sparkles" size={14} color="#0A5BFF" />
        <Text className="text-xs font-bold text-[#0B2559] ml-1.5">This month</Text>
      </View>
      {lines.slice(0, max).map((line, i) => (
        <View key={i} className="flex-row mt-1">
          <Text className="text-[#0A5BFF] mr-2 text-xs">•</Text>
          <Text className="flex-1 text-xs text-[#0B2559] leading-4">{line}</Text>
        </View>
      ))}
    </View>
  );
}

// ---- screen ------------------------------------------------------------------

export default function HomeScreen() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [mode, setMode] = useState('daily'); // 'daily' | 'monthly'
  const [month, setMonth] = useState(new Date());

  // daily (old API) data
  const [dpd, setDpd] = useState(null);
  const [fieldTotal, setFieldTotal] = useState(0);
  const [recentVisits, setRecentVisits] = useState([]);

  // monthly (new API) data
  const [mDpd, setMDpd] = useState(null);
  const [mField, setMField] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const firstName = user?.First_Name || user?.firstName || user?.name || '';

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      const current = ++seq.current;
      if (isRefresh) setRefreshing(true);
      setError(null);

      const headers = { Authorization: `Bearer ${token}` };

      try {
        if (mode === 'daily') {
          const today = formatDate(new Date());
          const dpdParams = new URLSearchParams({
            first: '0', rows: '1', globalfilter: '', selectedDate: today,
          });
          const fieldParams = new URLSearchParams({
            first: '0', rows: '3', globalfilter: '', selectedDate: today,
          });

          const [dpdRes, fieldRes] = await Promise.all([
            fetch(`${apiurl()}/dpd-collection/apigetsalespersondpdcollections?${dpdParams}`, { headers }),
            fetch(`${apiurl()}/fieldupdates/apigetsalespersonfieldupdates?${fieldParams}`, { headers }),
          ]);
          const [dpdJson, fieldJson] = await Promise.all([dpdRes.json(), fieldRes.json()]);

          if (current !== seq.current) return;
          if (!dpdJson.success || !fieldJson.success) throw new Error('Request failed');

          setDpd({
            ...(dpdJson.summary || {}),
            totalCustomers: dpdJson.summary?.totalCustomers ?? dpdJson.totallength ?? 0,
          });
          setFieldTotal(fieldJson.totallength || 0);
          setRecentVisits(fieldJson.resdata || []);
        } else {
          const m = monthParam(month);
          const [dpdRes, fieldRes] = await Promise.all([
            fetch(`${apiurl()}/dpd-collection/apigetsalespersonmonthlysummary?month=${m}`, { headers }),
            fetch(`${apiurl()}/fieldupdates/apigetsalespersonfieldupdatesmonthly?month=${m}`, { headers }),
          ]);
          const [dpdJson, fieldJson] = await Promise.all([dpdRes.json(), fieldRes.json()]);

          if (current !== seq.current) return;
          if (!dpdJson.success || !fieldJson.success) throw new Error('Request failed');

          setMDpd(dpdJson);
          setMField(fieldJson);
        }
      } catch (e) {
        if (current === seq.current) setError('Could not load dashboard. Pull down to retry.');
      } finally {
        if (current === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token, mode, month]
  );

  // refresh on tab focus, and whenever mode / month changes (callback identity changes)
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const changeMode = (m) => {
    if (m === mode) return;
    setLoading(true);
    setMode(m);
  };

  const changeMonth = (d) => {
    setLoading(true);
    setMonth(d);
  };

  // ---- daily numbers (old) ----
  const collected = Number(dpd?.totalCollected) || 0;
  const outstanding = Number(dpd?.remainingOutstanding) || 0;
  const total = collected + outstanding;
  const progress = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0;

  // ---- monthly numbers (new) ----
  const d = mDpd?.summary;
  const f = mField?.summary;
  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const mProgress = Math.min(100, Math.round(Number(d?.collectionRate) || 0));
  const mRecent = (mField?.recentVisits || []).slice(0, 3);

  return (
    <View className="flex-1 bg-[#F4F7FB]">
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            tintColor="#0A5BFF"
          />
        }
      >
        {/* Hero */}
        <View className="bg-[#0B2559] rounded-b-[40px] px-6 pt-16 pb-16 overflow-hidden">
          <View
            className="absolute w-48 h-48 rounded-full"
            style={{ top: -40, right: -48, backgroundColor: 'rgba(10,91,255,0.4)' }}
          />
          <View
            className="absolute w-28 h-28 rounded-full"
            style={{ top: 64, right: -16, backgroundColor: 'rgba(0,229,255,0.2)' }}
          />
          <View
            className="absolute w-40 h-40 rounded-full"
            style={{ bottom: -48, left: -40, backgroundColor: 'rgba(0,224,198,0.2)' }}
          />

          <Text className="text-[#7DF3E6] text-sm">{prettyToday()}</Text>
          <Text className="text-3xl font-extrabold text-white mt-1" numberOfLines={1}>
            {greeting()}{firstName ? `, ${firstName}` : ''}
          </Text>
          <Text className="text-[#C9DBFF] text-sm mt-1">
            {mode === 'daily' ? "Here's your day at a glance" : `Here's ${monthLabel} at a glance`}
          </Text>

          {/* Daily | Monthly switch + month selector */}
          <View className="mt-5">
            <ViewToggle value={mode} onChange={changeMode} />
            {mode === 'monthly' && <MonthBar value={month} onChange={changeMonth} />}
          </View>
        </View>

        <View className="px-5 -mt-14">
          <AttendanceCard />
          {/* Find bunks action */}
          <TouchableOpacity
            className="bg-white rounded-3xl p-4 mb-4 flex-row items-center border border-[#E3EBF6]"
            style={CARD_SHADOW}
            onPress={() => router.push('/findbunks')}
            activeOpacity={1}
          >
            <View className="w-14 h-14 rounded-2xl bg-[#0A5BFF] items-center justify-center border-2 border-[#00E5FF]">
              <Text className="text-2xl">⛽</Text>
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-base font-bold text-[#0B2559]">Find Petrol Bunks</Text>
              <Text className="text-xs text-[#7A8AA8] mt-0.5">Search a route and see bunks along it</Text>
            </View>
            <View
              className="w-10 h-10 rounded-full bg-[#0A5BFF] items-center justify-center"
              style={BUTTON_SHADOW}
            >
              <Ionicons name="search" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#0A5BFF" />
            </View>
          ) : error ? (
            <View className="items-center py-10 px-6">
              <Ionicons name="warning-outline" size={40} color="#F5A524" />
              <Text className="text-[#5B6B8C] text-center text-sm mt-3 mb-4">{error}</Text>
              <TouchableOpacity
                className="bg-[#0A5BFF] px-5 py-2.5 rounded-xl"
                onPress={() => {
                  setLoading(true);
                  loadDashboard();
                }}
              >
                <Text className="text-white font-semibold text-sm">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : mode === 'daily' ? (
            <>
              {/* ===== DAILY (old) ===== */}
              <SectionCard
                icon="cash-outline"
                iconColor="#0A5BFF"
                iconBg="#E8F0FF"
                title="DPD Collections"
                subtitle="Today's collection progress"
                onPress={() => router.push('/dpdcollection')}
              >
                <View className="flex-row -mx-1">
                  <Stat label="Outstanding" value={formatMoney(outstanding)} />
                  <Stat label="Collected" value={formatMoney(collected)} color="#00A892" />
                </View>
                <View className="flex-row -mx-1 mt-2">
                  <Stat label="Customers" value={String(dpd?.totalCustomers ?? 0)} />
                  <Stat label="Avg DPD" value={String(dpd?.avgDPD ?? '—')} color="#D93036" />
                </View>

                <View className="mt-4">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-[11px] text-[#5B6B8C]">Collected</Text>
                    <Text className="text-[11px] font-semibold text-[#0B2559]">{progress}%</Text>
                  </View>
                  <View className="h-2 rounded-full bg-[#E3EBF6] overflow-hidden">
                    <View
                      className="h-2 rounded-full"
                      style={{ width: `${progress}%`, backgroundColor: '#00C9B1' }}
                    />
                  </View>
                </View>
              </SectionCard>

              <SectionCard
                icon="location-outline"
                iconColor="#0A8F8F"
                iconBg="#E6FBF8"
                title="Field Updates"
                subtitle="Today's dealer & bunk visits"
                onPress={() => router.push('/fieldupdates')}
              >
                <View className="flex-row items-center justify-between bg-[#F4F7FB] rounded-2xl px-4 py-3">
                  <View>
                    <Text className="text-[11px] text-[#5B6B8C]">Visits today</Text>
                    <Text className="text-2xl font-extrabold text-[#0B2559]">{fieldTotal}</Text>
                  </View>
                  <TouchableOpacity
                    className="flex-row items-center bg-[#0A5BFF] px-3.5 py-2 rounded-full"
                    onPress={() => router.push('/fieldupdates')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text className="text-xs font-semibold text-white ml-1">Add update</Text>
                  </TouchableOpacity>
                </View>

                {recentVisits.length === 0 ? (
                  <Text className="text-xs text-[#7A8AA8] text-center mt-4">
                    No visits recorded today yet.
                  </Text>
                ) : (
                  <View className="mt-3">
                    <Text className="text-[11px] font-semibold text-[#7A8AA8] mb-1 ml-1">
                      LATEST VISITS
                    </Text>
                    {recentVisits.map((v, i) => (
                      <View
                        key={v._id || i}
                        className={`flex-row items-center py-2.5 px-1 ${
                          i < recentVisits.length - 1 ? 'border-b border-[#E3EBF6]' : ''
                        }`}
                      >
                        <View className="w-8 h-8 rounded-full bg-[#E6FBF8] items-center justify-center">
                          <Ionicons name="storefront-outline" size={15} color="#0A8F8F" />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className="text-sm font-semibold text-[#0B2559]" numberOfLines={1}>
                            {(v.Bunk_Name || '').trim() || '—'}
                          </Text>
                          <Text className="text-[11px] text-[#7A8AA8]" numberOfLines={1}>
                            {v.City_Name}{v.Oil_Company ? ` · ${v.Oil_Company}` : ''}
                          </Text>
                        </View>
                        <Text className="text-[11px] text-[#9AA9C2]">{prettyTime(v.createdAt)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </SectionCard>
            </>
          ) : (
            <>
              {/* ===== MONTHLY (new) ===== */}
              <SectionCard
                icon="cash-outline"
                iconColor="#0A5BFF"
                iconBg="#E8F0FF"
                title="DPD Collections"
                subtitle={`${monthLabel} collection progress`}
                onPress={() => router.push('/dpdcollection')}
              >
                <View className="flex-row -mx-1">
                  <Stat label="Collected" value={formatMoney(d?.totalCollected)} color="#00A892" />
                  <Stat label="Open outstanding" value={formatMoney(d?.openOutstanding)} />
                </View>
                <View className="flex-row -mx-1 mt-2">
                  <Stat label="Open customers" value={`${d?.openCustomers ?? 0}/${d?.totalCustomers ?? 0}`} />
                  <Stat label="Avg DPD" value={String(d?.avgDPD ?? '—')} color="#D93036" />
                </View>

                <View className="mt-4">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-[11px] text-[#5B6B8C]">Collection rate</Text>
                    <Text className="text-[11px] font-semibold text-[#0B2559]">{mProgress}%</Text>
                  </View>
                  <View className="h-2 rounded-full bg-[#E3EBF6] overflow-hidden">
                    <View
                      className="h-2 rounded-full"
                      style={{ width: `${mProgress}%`, backgroundColor: '#00C9B1' }}
                    />
                  </View>
                </View>

                {mDpd?.comparison?.previousCollected > 0 && (
                  <View className="mt-3">
                    <ChangePill pct={mDpd.comparison.collectedChangePct} />
                  </View>
                )}

                <MiniInsights lines={mDpd?.insights} />
              </SectionCard>

              <SectionCard
                icon="location-outline"
                iconColor="#0A8F8F"
                iconBg="#E6FBF8"
                title="Field Updates"
                subtitle={`${monthLabel} dealer & bunk visits`}
                onPress={() => router.push('/fieldupdates')}
              >
                <View className="flex-row items-center justify-between bg-[#F4F7FB] rounded-2xl px-4 py-3">
                  <View>
                    <Text className="text-[11px] text-[#5B6B8C]">Visits this month</Text>
                    <Text className="text-2xl font-extrabold text-[#0B2559]">{f?.totalVisits ?? 0}</Text>
                  </View>
                  <TouchableOpacity
                    className="flex-row items-center bg-[#0A5BFF] px-3.5 py-2 rounded-full"
                    onPress={() => router.push('/fieldupdates')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text className="text-xs font-semibold text-white ml-1">Add update</Text>
                  </TouchableOpacity>
                </View>

                {(f?.totalVisits ?? 0) > 0 && (
                  <View className="flex-row -mx-1 mt-2">
                    <Stat label="Bunks" value={String(f.uniqueBunks)} />
                    <Stat label="Dealers" value={String(f.uniqueDealers)} />
                    <Stat label="Active days" value={String(f.activeDays)} color="#0A8F8F" />
                  </View>
                )}

                {mField?.comparison?.previousVisits > 0 && (
                  <View className="mt-3">
                    <ChangePill pct={mField.comparison.visitsChangePct} />
                  </View>
                )}

                <MiniInsights lines={mField?.insights} />

                {mRecent.length > 0 && (
                  <View className="mt-4">
                    <Text className="text-[11px] font-semibold text-[#7A8AA8] mb-1 ml-1">
                      LATEST VISITS
                    </Text>
                    {mRecent.map((v, i) => (
                      <View
                        key={v._id || i}
                        className={`flex-row items-center py-2.5 px-1 ${
                          i < mRecent.length - 1 ? 'border-b border-[#E3EBF6]' : ''
                        }`}
                      >
                        <View className="w-8 h-8 rounded-full bg-[#E6FBF8] items-center justify-center">
                          <Ionicons name="storefront-outline" size={15} color="#0A8F8F" />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className="text-sm font-semibold text-[#0B2559]" numberOfLines={1}>
                            {v.bunk || '—'}
                          </Text>
                          <Text className="text-[11px] text-[#7A8AA8]" numberOfLines={1}>
                            {v.city}{v.oilCompany ? ` · ${v.oilCompany}` : ''}
                          </Text>
                        </View>
                        <Text className="text-[11px] text-[#9AA9C2]">{prettyShortDate(v.date)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </SectionCard>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}