// place at: components/DPDCollection/DpdMonthlyView.jsx
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useMonthlySummary } from '../../hooks/useMonthlySummary';
import {
    Card, ChangePill, Chip, InsightsCard, MonthBar, RankList, StatTile, TrendBars, money,
} from '../MonthlySummary/MonthlyParts';

const PATH = '/dpd-collection/apigetsalespersonmonthlysummary';

export default function DpdMonthlyView() {
  const [month, setMonth] = useState(new Date());
  const { data, loading, refreshing, error, reload, refresh } = useMonthlySummary(PATH, month);
  const s = data?.summary;
  const cmp = data?.comparison;

  return (
    <View className="flex-1">
      <View className="px-4 pb-5">
        <MonthBar value={month} onChange={setMonth} />
      </View>

      <View className="flex-1 bg-[#F4F7FB] rounded-t-[28px] overflow-hidden">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="warning-outline" size={40} color={COLORS.warning} />
            <Text className="text-[#5B6B8C] text-center text-sm mt-3 mb-4">{error}</Text>
            <TouchableOpacity className="bg-[#0A5BFF] px-5 py-2.5 rounded-xl" onPress={reload}>
              <Text className="text-white font-semibold text-sm">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.blue} colors={[COLORS.blue]} />
            }
          >
            {/* Hero */}
            <View className="bg-[#0B2559] rounded-3xl p-5 mb-4">
              <Text className="text-[#7DF3E6] text-xs">Collected in {data?.monthLabel}</Text>
              <Text className="text-3xl font-extrabold text-white mt-1">{money(s?.totalCollected)}</Text>
              <View className="mt-3">
                <ChangePill pct={cmp?.previousCollected > 0 ? cmp.collectedChangePct : null} />
              </View>
            </View>

            <InsightsCard insights={data?.insights} />

            {s?.hasData && (
              <>
                <View className="flex-row -mx-1 mb-2">
                  <StatTile label="Open outstanding" value={money(s.openOutstanding)} />
                  <StatTile label="Collection rate" value={`${s.collectionRate}%`} accent="text-[#0A8F8F]" />
                </View>
                <View className="flex-row -mx-1 mb-4">
                  <StatTile label="Open customers" value={`${s.openCustomers}/${s.totalCustomers}`} />
                  <StatTile label="Avg DPD" value={String(s.avgDPD)} accent="text-[#D93036]" />
                </View>

                <Card title="Customer status">
                  <View className="flex-row -mx-1">
                    <Chip label="Pending" value={s.status.Pending} bg="bg-[#E8EEF8]" text="text-[#5B6B8C]" />
                    <Chip label="Partial" value={s.status.Partial} bg="bg-[#FFF4D6]" text="text-[#9A6B00]" />
                    <Chip label="Collected" value={s.status.Collected} bg="bg-[#D9F7F1]" text="text-[#0A8F8F]" />
                  </View>
                </Card>

                <Card title="Open customers by DPD">
                  <View className="flex-row -mx-1">
                    <Chip label="0-9 days" value={s.dpdBuckets['0-9']} bg="bg-[#D9F7F1]" text="text-[#0A8F8F]" />
                    <Chip label="10-29 days" value={s.dpdBuckets['10-29']} bg="bg-[#FFF4D6]" text="text-[#9A6B00]" />
                    <Chip label="30+ days" value={s.dpdBuckets['30+']} bg="bg-[#FDECEC]" text="text-[#D93036]" />
                  </View>
                </Card>

                <Card title="Daily collection">
                  <TrendBars data={s.dailyTrend.map((d) => ({ date: d.date, value: d.amount }))} color="#00C9B1" />
                  {!!s.bestDay && (
                    <Text className="text-[11px] text-[#7A8AA8] mt-2">
                      Best day {s.bestDay.date} · {money(s.bestDay.amount)} · avg {money(s.avgPerActiveDay)} per active day
                    </Text>
                  )}
                </Card>

                <Card title="Top payers this month">
                  <RankList
                    rows={s.topPayers.map((p) => ({ name: p.name, sub: p.city, value: money(p.collected) }))}
                    empty="No collections recorded yet."
                  />
                </Card>

                {s.highRisk.length > 0 && (
                  <Card title="High risk (30+ DPD)">
                    <RankList
                      rows={s.highRisk.map((r) => ({
                        name: r.name,
                        sub: `${r.city} · ${r.dpd} DPD`,
                        value: money(r.outstanding),
                      }))}
                    />
                  </Card>
                )}

                <Card title="Highest outstanding cities">
                  <RankList
                    rows={s.topCities.map((c) => ({ name: c.name, sub: `${c.count} customers`, value: money(c.amount) }))}
                  />
                </Card>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}