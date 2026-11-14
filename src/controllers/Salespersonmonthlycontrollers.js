import { DPDCollection } from '../models/DPDCollectionModel.js';
import { Fieldupdate } from '../models/FieldupdateModel.js';

// ---------- helpers ----------
// Local-time bounds + local getters, same convention as your existing
// setHours(0,0,0,0) code, so it behaves the same on a UTC or IST server.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

function parseMonth(str) {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(str || '').trim());
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function monthRange({ year, month }) {
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 1, 0, 0, 0, 0), // exclusive
    daysInMonth: new Date(year, month, 0).getDate(),
  };
}

const prevMonthOf = ({ year, month }) =>
  month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
const monthKey = ({ year, month }) => `${year}-${pad(month)}`;
const monthLabel = ({ year, month }) => `${MONTH_NAMES[month - 1]} ${year}`;

const round = (n, p = 0) => {
  const f = 10 ** p;
  return Math.round((Number(n) || 0) * f) / f;
};
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function pctChange(curr, prev) {
  if (!prev) return curr ? 100 : 0;
  return round(((curr - prev) / prev) * 100, 1);
}

function bump(map, key, amount = 0) {
  const k = (key || 'Unknown').toString().trim() || 'Unknown';
  if (!map[k]) map[k] = { count: 0, amount: 0 };
  map[k].count += 1;
  map[k].amount += amount;
}

const rank = (map, n, by = 'count') =>
  Object.entries(map)
    .map(([name, v]) => ({ name, count: v.count, amount: round(v.amount) }))
    .sort((a, b) => b[by] - a[by] || b.count - a.count)
    .slice(0, n);

// ---------- DPD ----------
// How your data behaves (from savedpdcollection):
//  - every day's document holds a full snapshot of all open customers
//  - customers missing from that day's upload are COPIED forward with
//    _continuing / _noUpdateToday = true and the SAME Collecting_Money
//  - Collected customers are not carried forward
// So summing Collecting_Money over every day would count the same payment many
// times. Instead we count money EARNED per customer per day:
//  - fresh (non-carried) entry  -> its Collecting_Money
//  - carried entry              -> only the increase over the previous day's value
//    (covers a salesman editing the amount on a carried entry)

const isCarried = (e) => !!(e._continuing || e._noUpdateToday);

const customerKey = (e) =>
  String(e.Customer_ID || e._extractedId || e._baseName || e.Customer_Name || '')
    .toLowerCase()
    .trim();

async function loadDpdMonth(userId, ym) {
  const r = monthRange(ym);
  const [docs, baseline] = await Promise.all([
    DPDCollection.find({ Employee_ID: userId, Date: { $gte: r.start, $lt: r.end } }).lean(),
    // last snapshot before the month: so a payment already counted last month
    // and carried into day 1 is not counted again
    DPDCollection.findOne({ Employee_ID: userId, Date: { $lt: r.start } })
      .sort({ Date: -1 })
      .lean(),
  ]);
  return summariseDpd(docs, baseline);
}

function summariseDpd(docs, baseline) {
  const lastMoney = new Map();
  for (const e of baseline?.Entries || []) {
    lastMoney.set(customerKey(e), Number(e.Collecting_Money) || 0);
  }

  const sorted = [...docs].sort((a, b) => new Date(a.Date) - new Date(b.Date));
  const latest = new Map();
  const perCustomer = new Map();
  const daily = {};
  let totalCollected = 0;

  for (const doc of sorted) {
    const day = dayKey(doc.Date);
    for (const e of doc.Entries || []) {
      const key = customerKey(e);
      const money = Number(e.Collecting_Money) || 0;
      const earned = isCarried(e) ? Math.max(0, money - (lastMoney.get(key) || 0)) : money;
      lastMoney.set(key, money);
      latest.set(key, e);

      if (earned > 0) {
        totalCollected += earned;
        daily[day] = (daily[day] || 0) + earned;
        const p = perCustomer.get(key) || {
          name: e._baseName || e.Customer_Name,
          city: e.City,
          collected: 0,
        };
        p.collected += earned;
        perCustomer.set(key, p);
      }
    }
  }

  const customers = [...latest.values()];
  const open = customers.filter((e) => e.Status !== 'Collected');

  const status = { Pending: 0, Partial: 0, Collected: 0 };
  customers.forEach((e) => {
    if (status[e.Status] != null) status[e.Status] += 1;
  });

  let openOutstanding = 0;
  let dpdSum = 0;
  const buckets = { '0-9': 0, '10-29': 0, '30+': 0 };
  const byCity = {};
  open.forEach((e) => {
    const out = Number(e.Sum_Of_Total_Outstanding) || 0;
    const dpd = Number(e.Max_of_DPD) || 0;
    openOutstanding += out;
    dpdSum += dpd;
    if (dpd >= 30) buckets['30+'] += 1;
    else if (dpd >= 10) buckets['10-29'] += 1;
    else buckets['0-9'] += 1;
    bump(byCity, e.City, out);
  });

  const dailyTrend = Object.entries(daily)
    .map(([date, amount]) => ({ date, amount: round(amount) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const bestDay = dailyTrend.reduce((b, d) => (!b || d.amount > b.amount ? d : b), null);

  const toRow = (e) => ({
    name: e._baseName || e.Customer_Name,
    city: e.City,
    dpd: Number(e.Max_of_DPD) || 0,
    outstanding: round(e.Sum_Of_Total_Outstanding),
    status: e.Status,
  });

  return {
    totalCollected: round(totalCollected),
    openOutstanding: round(openOutstanding),
    totalCustomers: customers.length,
    openCustomers: open.length,
    avgDPD: open.length ? round(dpdSum / open.length, 1) : 0,
    collectionRate:
      totalCollected + openOutstanding > 0
        ? round((totalCollected / (totalCollected + openOutstanding)) * 100, 1)
        : 0,
    status,
    dpdBuckets: buckets,
    activeDays: dailyTrend.length,
    avgPerActiveDay: dailyTrend.length ? round(totalCollected / dailyTrend.length) : 0,
    bestDay,
    dailyTrend,
    topPayers: [...perCustomer.values()]
      .sort((a, b) => b.collected - a.collected)
      .slice(0, 5)
      .map((p) => ({ ...p, collected: round(p.collected) })),
    highRisk: open
      .filter((e) => (Number(e.Max_of_DPD) || 0) >= 30)
      .sort((a, b) => (b.Sum_Of_Total_Outstanding || 0) - (a.Sum_Of_Total_Outstanding || 0))
      .slice(0, 5)
      .map(toRow),
    topOutstanding: [...open]
      .sort((a, b) => (b.Sum_Of_Total_Outstanding || 0) - (a.Sum_Of_Total_Outstanding || 0))
      .slice(0, 5)
      .map(toRow),
    topCities: rank(byCity, 5, 'amount'),
    hasData: docs.length > 0,
  };
}

export const getSalespersonDpdMonthlySummary = async (req, res) => {
  try {
    if (req.user?.Role !== 'Sales_Man') {
      return res.status(403).send({ success: false, message: 'Access denied. Salesperson only.' });
    }
    const userId = req.user.id;
    const cur = parseMonth(req.query.month);
    const prev = prevMonthOf(cur);

    const [s, p] = await Promise.all([loadDpdMonth(userId, cur), loadDpdMonth(userId, prev)]);

    const comparison = {
      previousMonth: monthKey(prev),
      previousCollected: p.totalCollected,
      collectedChangePct: pctChange(s.totalCollected, p.totalCollected),
      avgDPDChange: round(s.avgDPD - p.avgDPD, 1),
    };

    const insights = [];
    if (!s.hasData) {
      insights.push(`No DPD collection data found for ${monthLabel(cur)}.`);
    } else {
      insights.push(
        `In ${monthLabel(cur)} you collected ${inr(s.totalCollected)} over ${s.activeDays} active day${s.activeDays === 1 ? '' : 's'}.`
      );
      if (p.totalCollected > 0) {
        const c = comparison.collectedChangePct;
        insights.push(
          `That is ${Math.abs(c)}% ${c >= 0 ? 'higher' : 'lower'} than ${monthLabel(prev)} (${inr(p.totalCollected)}).`
        );
      }
      if (s.bestDay) {
        insights.push(`Best day: ${s.bestDay.date} with ${inr(s.bestDay.amount)}.`);
      }
      insights.push(
        `${inr(s.openOutstanding)} is still outstanding from ${s.openCustomers} open customer${s.openCustomers === 1 ? '' : 's'} (average ${s.avgDPD} DPD).`
      );
      if (s.dpdBuckets['30+'] > 0) {
        insights.push(
          `${s.dpdBuckets['30+']} customer${s.dpdBuckets['30+'] === 1 ? ' is' : 's are'} at 30+ DPD${
            s.highRisk[0] ? ` - start with ${s.highRisk[0].name}` : ''
          }.`
        );
      }
      if (s.status.Collected > 0) {
        insights.push(`${s.status.Collected} customer${s.status.Collected === 1 ? ' was' : 's were'} fully collected.`);
      }
    }

    res.send({
      success: true,
      month: monthKey(cur),
      monthLabel: monthLabel(cur),
      summary: s,
      comparison,
      insights,
    });
  } catch (err) {
    console.error('Error fetching DPD monthly summary:', err);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch DPD monthly summary',
      error: err.message,
    });
  }
};

// ---------- Field updates ----------

function summariseVisits(visits) {
  const byDay = {};
  const byOil = {};
  const byCity = {};
  const byRegion = {};
  const byStatus = {};
  const dealerVisits = {};
  const bunks = new Set();

  for (const v of visits) {
    const day = dayKey(v.Visit_Date);
    byDay[day] = (byDay[day] || 0) + 1;
    bump(byOil, v.Oil_Company);
    bump(byCity, v.City_Name);
    bump(byRegion, v.Region);
    const st = v.Status || 'Unknown';
    byStatus[st] = (byStatus[st] || 0) + 1;
    if (v.Dealer_Name) {
      const k = v.Dealer_Name.trim().toLowerCase();
      dealerVisits[k] = dealerVisits[k] || { name: v.Dealer_Name.trim(), count: 0 };
      dealerVisits[k].count += 1;
    }
    if (v.Bunk_Name) bunks.add(v.Bunk_Name.trim().toLowerCase());
  }

  const dailyTrend = Object.entries(byDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const busiestDay = dailyTrend.reduce((b, d) => (!b || d.count > b.count ? d : b), null);

  return {
    totalVisits: visits.length,
    uniqueBunks: bunks.size,
    uniqueDealers: Object.keys(dealerVisits).length,
    activeDays: dailyTrend.length,
    avgPerActiveDay: dailyTrend.length ? round(visits.length / dailyTrend.length, 1) : 0,
    busiestDay,
    dailyTrend,
    byStatus,
    byOilCompany: rank(byOil, 6),
    topCities: rank(byCity, 5),
    topRegions: rank(byRegion, 5),
    mostVisitedDealers: Object.values(dealerVisits)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

export const getSalespersonFieldupdatesMonthlySummary = async (req, res) => {
  try {
    const userId = req.user?.id;
    const cur = parseMonth(req.query.month);
    const prev = prevMonthOf(cur);

    const fetchMonth = (ym) => {
      const r = monthRange(ym);
      return Fieldupdate.find({ Employee_ID: userId, Visit_Date: { $gte: r.start, $lt: r.end } })
        .sort({ Visit_Date: -1, createdAt: -1 })
        .lean();
    };

    const [curDocs, prevDocs] = await Promise.all([fetchMonth(cur), fetchMonth(prev)]);
    const s = summariseVisits(curDocs);
    const p = summariseVisits(prevDocs);

    const comparison = {
      previousMonth: monthKey(prev),
      previousVisits: p.totalVisits,
      visitsChangePct: pctChange(s.totalVisits, p.totalVisits),
    };

    const recentVisits = curDocs.slice(0, 5).map((v) => ({
      _id: v._id,
      date: dayKey(v.Visit_Date),
      bunk: (v.Bunk_Name || '').trim(),
      dealer: (v.Dealer_Name || '').trim(),
      city: v.City_Name,
      oilCompany: v.Oil_Company,
      status: v.Status,
      notes: (v.Visit_Notes || '').trim(),
    }));

    const insights = [];
    if (!curDocs.length) {
      insights.push(`No field visits recorded for ${monthLabel(cur)}.`);
    } else {
      insights.push(
        `In ${monthLabel(cur)} you made ${s.totalVisits} visit${s.totalVisits === 1 ? '' : 's'} to ${s.uniqueBunks} bunk${s.uniqueBunks === 1 ? '' : 's'} over ${s.activeDays} day${s.activeDays === 1 ? '' : 's'} (about ${s.avgPerActiveDay} per active day).`
      );
      if (p.totalVisits > 0) {
        const c = comparison.visitsChangePct;
        insights.push(
          `That is ${Math.abs(c)}% ${c >= 0 ? 'more' : 'fewer'} than ${monthLabel(prev)} (${p.totalVisits} visits).`
        );
      }
      if (s.busiestDay) {
        insights.push(`Busiest day: ${s.busiestDay.date} with ${s.busiestDay.count} visits.`);
      }
      if (s.byOilCompany[0]) {
        insights.push(`Most visits were to ${s.byOilCompany[0].name} bunks (${s.byOilCompany[0].count}).`);
      }
      if (s.topCities[0]) {
        insights.push(`Top city: ${s.topCities[0].name} (${s.topCities[0].count} visits).`);
      }
    }

    res.send({
      success: true,
      month: monthKey(cur),
      monthLabel: monthLabel(cur),
      summary: s,
      comparison,
      recentVisits,
      insights,
    });
  } catch (err) {
    console.error('Error fetching field updates monthly summary:', err);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch field updates monthly summary',
      error: err.message,
    });
  }
};