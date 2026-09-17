/**
 * Feature Usage analytics (Priority 3) — tracks how many users actually use
 * key application features, per role group (Salesman vs Sales Manager /
 * Coordinator).
 *
 * Real data path: mobile clients emit Event docs with eventType one of
 * enquiry_creation/enquiry_review/enquiry_followup/product_guide/
 * village_visit/booking/delivery (see server/models/Event.js EVENT_TYPES),
 * via the existing POST /ingest/events batch endpoint. Once at least one such
 * event exists for a role group, this service aggregates real Event + User
 * data. Until then it falls back to the same deterministic synthetic
 * generator used by usageTaxonomy.js, so the dashboard still renders before
 * any mobile client has started sending these events.
 */
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const User = require('../models/User');
const Event = require('../models/Event');
const { buildRoleMatch } = require('../data/roleTaxonomy');
const { buildDateFilter } = require('../utils/dateRange');
const {
  rand, randInt, scaleFromQuery, filterKey, dayLabels,
} = require('../data/usageTaxonomy');
const { getPagination, buildMeta } = require('../utils/pagination');

const round = (n, d = 0) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

const SALESMAN_FEATURES = [
  { name: 'Enquiry Creation', usagePct: 78, eventType: 'enquiry_creation' },
  { name: 'Enquiry Review', usagePct: 65, eventType: 'enquiry_review' },
  { name: 'Enquiry Follow-up', usagePct: 59, eventType: 'enquiry_followup' },
  { name: 'Product Guide', usagePct: 82, eventType: 'product_guide' },
  { name: 'Village Visit', usagePct: 44, eventType: 'village_visit' },
];

const MANAGER_FEATURES = [
  { name: 'Enquiry Creation', usagePct: 42, eventType: 'enquiry_creation' },
  { name: 'Enquiry Review', usagePct: 71, eventType: 'enquiry_review' },
  { name: 'Enquiry Follow-up', usagePct: 66, eventType: 'enquiry_followup' },
  { name: 'Booking', usagePct: 58, eventType: 'booking' },
  { name: 'Delivery', usagePct: 46, eventType: 'delivery' },
];

// Roles that belong to each group, for scoping the real-data query. The former
// 'Coordinator' designation no longer exists — the app's role list has no such
// value — so the manager group is the two sales-line manager roles it does send.
const GROUP_DESIGNATIONS = {
  salesman: ['Salesman'],
  manager: ['Sales Manager', 'Branch Manager'],
};

const trendSeries = (key, points, base, variance) =>
  Array.from({ length: points }, (_, i) => round(base * (0.7 + rand(`${key}:${i}`) * variance)));

const buildFeatureUsage = (features, group, query) => {
  const scale = scaleFromQuery(query);
  const fk = filterKey(query);
  const totalUsersPool = Math.round(randInt(`fu:${group}:${fk}:pool`, 400, 1400) * scale) || 1;

  const rows = features.map((f) => {
    const seed = `fu:${group}:${f.name}:${fk}`;
    const uniqueUsers = Math.round(totalUsersPool * (f.usagePct / 100));
    const avgUses = randInt(`${seed}:au`, 2, 18);
    const totalUses = uniqueUsers * avgUses;
    return {
      feature: f.name,
      totalUsers: totalUsersPool,
      uniqueUsers,
      usagePct: f.usagePct,
      avgUses,
      totalUses,
      trend: trendSeries(`${seed}:tr`, 12, uniqueUsers / 12, 0.8),
    };
  });

  const labels = dayLabels(query);
  const trend = labels.map((date, i) => {
    const point = { date };
    rows.forEach((r) => {
      point[r.feature] = Math.round((r.uniqueUsers / labels.length) * (0.7 + rand(`fut:${group}:${r.feature}:${i}`) * 0.7));
    });
    return point;
  });

  const { page, limit, skip } = getPagination(query);
  const total = rows.length;
  const pageRows = rows.slice(skip, skip + limit);

  return {
    data: {
      summary: {
        totalUsers: totalUsersPool,
        uniqueUsers: Math.round(rows.reduce((a, r) => a + r.uniqueUsers, 0) / rows.length),
        avgUsagePct: round(rows.reduce((a, r) => a + r.usagePct, 0) / rows.length, 1),
        avgUses: Math.round(rows.reduce((a, r) => a + r.avgUses, 0) / rows.length),
      },
      charts: {
        bar: rows.map((r) => ({ name: r.feature, value: r.uniqueUsers })),
        pie: rows.map((r) => ({ name: r.feature, value: r.usagePct })),
        trend,
        trendSeries: rows.map((r) => ({ key: r.feature, label: r.feature })),
      },
      rows: pageRows,
    },
    meta: buildMeta(page, limit, total),
  };
};

// Real-data path: aggregates actual ingested Events for the users in this
// role group. Returns null (triggering the synthetic fallback) if no such
// events have been ingested yet.
const buildRealFeatureUsage = async (features, group, query) => {
  const userMatch = { ...buildRoleMatch(query), designation: { $in: GROUP_DESIGNATIONS[group] } };
  const poolUserIds = await User.find(userMatch, { userId: 1 }).lean().then((rows) => rows.map((r) => r.userId));
  if (poolUserIds.length === 0) return null;

  const eventTypes = features.map((f) => f.eventType);
  const dateFilter = buildDateFilter(query, 'timestamp');
  const eventMatch = { userId: { $in: poolUserIds }, eventType: { $in: eventTypes }, ...dateFilter };

  const totalEventCount = await Event.countDocuments(eventMatch);
  if (totalEventCount === 0) return null;

  const [byFeature, byDay] = await Promise.all([
    Event.aggregate([
      { $match: eventMatch },
      { $group: { _id: '$eventType', uniqueUsers: { $addToSet: '$userId' }, totalUses: { $sum: 1 } } },
    ]),
    Event.aggregate([
      { $match: eventMatch },
      {
        $group: {
          _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, eventType: '$eventType' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const byFeatureMap = new Map(byFeature.map((r) => [r._id, r]));
  const totalUsersPool = poolUserIds.length;

  const rows = features.map((f) => {
    const agg = byFeatureMap.get(f.eventType);
    const uniqueUsers = agg ? agg.uniqueUsers.length : 0;
    const totalUses = agg ? agg.totalUses : 0;
    return {
      feature: f.name,
      totalUsers: totalUsersPool,
      uniqueUsers,
      usagePct: totalUsersPool ? round((uniqueUsers / totalUsersPool) * 100, 1) : 0,
      avgUses: uniqueUsers ? Math.round(totalUses / uniqueUsers) : 0,
      totalUses,
    };
  });

  const labels = dayLabels(query);
  const trendByDay = {};
  byDay.forEach((r) => {
    trendByDay[r._id.day] = trendByDay[r._id.day] || {};
    const feature = features.find((f) => f.eventType === r._id.eventType);
    if (feature) trendByDay[r._id.day][feature.name] = r.count;
  });
  const trend = labels.map((date) => ({ date, ...(trendByDay[date] || {}) }));

  const { page, limit, skip } = getPagination(query);
  const total = rows.length;
  const pageRows = rows.slice(skip, skip + limit);

  return {
    data: {
      summary: {
        totalUsers: totalUsersPool,
        uniqueUsers: rows.length ? Math.round(rows.reduce((a, r) => a + r.uniqueUsers, 0) / rows.length) : 0,
        avgUsagePct: rows.length ? round(rows.reduce((a, r) => a + r.usagePct, 0) / rows.length, 1) : 0,
        avgUses: rows.length ? Math.round(rows.reduce((a, r) => a + r.avgUses, 0) / rows.length) : 0,
      },
      charts: {
        bar: rows.map((r) => ({ name: r.feature, value: r.uniqueUsers })),
        pie: rows.map((r) => ({ name: r.feature, value: r.usagePct })),
        trend,
        trendSeries: rows.map((r) => ({ key: r.feature, label: r.feature })),
      },
      rows: pageRows,
    },
    meta: buildMeta(page, limit, total),
  };
};

const getFeatureUsage = async (query = {}) => {
  const group = query.role === 'manager' ? 'manager' : 'salesman';
  const features = group === 'manager' ? MANAGER_FEATURES : SALESMAN_FEATURES;

  const real = await buildRealFeatureUsage(features, group, query);
  if (real) return real;

  return buildFeatureUsage(features, group, query);
};

module.exports = { getFeatureUsage };
