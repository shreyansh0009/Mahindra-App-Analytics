/**
 * Role analytics — real Mongo aggregations over the User collection's role and
 * login fields (designation / loginDays / totalLogins), unlike the synthetic
 * usage-analytics modules.
 *
 * Replaces the former geographyService. That service sliced by a
 * Zone → State → AO → Dealer → Branch → TM hierarchy, but the app reports none
 * of it, so those reports could only ever describe seeded users. Role is the one
 * organisational dimension production actually populates.
 */
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const User = require('../models/User');
const Session = require('../models/Session');
const { ROLES, buildRoleMatch } = require('../data/roleTaxonomy');
const { buildDealerMatch, DEALER_CATEGORY } = require('../data/dealerTaxonomy');
const { getPagination, buildMeta } = require('../utils/pagination');
const { buildDateFilter } = require('../utils/dateRange');

const round = (n, d = 0) => {
  const f = 10 ** d;
  return Math.round((n || 0) * f) / f;
};

// Classification thresholds shared by classification / table / export.
const classify = (loginDays = 0) => {
  if (loginDays > 20) return 'frequent';
  if (loginDays >= 5) return 'occasional';
  if (loginDays >= 1) return 'low';
  return 'none';
};

const CATEGORY_LABELS = {
  frequent: 'Frequent User',
  occasional: 'Occasional User',
  low: 'Low Usage',
  none: 'No Login',
};

// Mongo $switch mirroring `classify()`, for use inside aggregation pipelines.
const categorySwitch = {
  $switch: {
    branches: [
      { case: { $gt: ['$loginDays', 20] }, then: 'frequent' },
      { case: { $gte: ['$loginDays', 5] }, then: 'occasional' },
      { case: { $gte: ['$loginDays', 1] }, then: 'low' },
    ],
    default: 'none',
  },
};

// ── Filters ────────────────────────────────────────────────────────────────
const getFilterOptions = () => {
  return {
    roles: ROLES,
    userCategories: Object.keys(CATEGORY_LABELS).map((key) => ({ key, label: CATEGORY_LABELS[key] })),
    platforms: ['android', 'ios', 'web'],
    datePresets: ['today', 'yesterday', 'last7', 'last30', 'custom'],
  };
};

// Build the shared Mongo match filter for role + dealership + category + date +
// search. Exported as buildScopeMatch so dealerService reuses exactly these
// semantics — the two report families must agree on what a filter selects, or
// the same selection gives different totals on different pages.
const buildMatch = (query = {}) => {
  const match = { ...buildRoleMatch(query), ...buildDealerMatch(query) };
  // Opt-in, set by the Dealer & Geography page so its directory and export list
  // the same population its charts count. Role Analytics leaves it off — there,
  // restricting to dealership users would silently drop most of the org.
  if (query.dealersOnly === 'true') match['dealer.category'] = DEALER_CATEGORY;
  if (query.userCategory) {
    match.$expr = { $eq: [categorySwitch, query.userCategory] };
  }
  Object.assign(match, buildDateFilter(query, 'lastActiveAt'));
  if (query.search) {
    const re = new RegExp(query.search, 'i');
    match.$or = [
      { name: re }, { email: re }, { mobile: re }, { starId: re }, { userId: re },
      { 'dealer.name': re }, { 'dealer.city': re },
    ];
  }
  return match;
};

// ── Headline cards for the current role/date selection ─────────────────────
const getRoleSummary = async (query = {}) => {
  const match = buildMatch(query);

  const [scoped, orgTotal] = await Promise.all([
    User.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          avgTimeSpent: { $avg: '$totalTimeSpent' },
          totalLogins: { $sum: '$totalLogins' },
          avgLogins: { $avg: '$totalLogins' },
        },
      },
    ]),
    User.countDocuments({}),
  ]);

  const s = scoped[0] || { totalUsers: 0, activeUsers: 0, avgTimeSpent: 0, totalLogins: 0, avgLogins: 0 };

  return {
    data: {
      totalUsers: s.totalUsers,
      percentageOfUsers: orgTotal ? round((s.totalUsers / orgTotal) * 100, 1) : 0,
      avgTimeSpent: Math.round(s.avgTimeSpent || 0),
      totalLogins: s.totalLogins || 0,
      avgLogins: round(s.avgLogins || 0, 1),
      activeUsers: s.activeUsers,
    },
  };
};

// ── User Classification: cards + pie + bar + trend + table ─────────────────
const getUserClassification = async (query = {}) => {
  // Every dimension except userCategory: the classification *is* the category
  // breakdown, so pre-filtering by it would leave one non-zero bucket.
  const match = { ...buildRoleMatch(query), ...buildDealerMatch(query) };
  if (query.dealersOnly === 'true') match['dealer.category'] = DEALER_CATEGORY;
  Object.assign(match, buildDateFilter(query, 'lastActiveAt'));

  const counts = await User.aggregate([
    { $match: match },
    { $group: { _id: categorySwitch, count: { $sum: 1 } } },
  ]);

  const byKey = { frequent: 0, occasional: 0, low: 0, none: 0 };
  counts.forEach((c) => { byKey[c._id] = c.count; });

  const cards = Object.entries(byKey).map(([key, count]) => ({ key, label: CATEGORY_LABELS[key], count }));
  const pie = cards.map((c) => ({ name: c.label, value: c.count }));
  const bar = pie;

  // Trend: real daily-active-user counts (from Session) bucketed by each
  // user's overall login-activity category.
  const matchedUsers = await User.find(match, { userId: 1, loginDays: 1 }).lean();
  const categoryByUser = new Map(matchedUsers.map((u) => [u.userId, classify(u.loginDays)]));

  const start = query.startDate ? dayjs.utc(query.startDate).startOf('day') : dayjs.utc().subtract(13, 'day').startOf('day');
  const end = query.endDate ? dayjs.utc(query.endDate).endOf('day') : dayjs.utc().endOf('day');

  const sessions = await Session.aggregate([
    { $match: { startTime: { $gte: start.toDate(), $lte: end.toDate() }, userId: { $in: [...categoryByUser.keys()] } } },
    {
      $group: {
        _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } }, userId: '$userId' },
      },
    },
  ]);

  const trendMap = {};
  sessions.forEach((row) => {
    const day = row._id.day;
    const cat = categoryByUser.get(row._id.userId) || 'none';
    trendMap[day] = trendMap[day] || { frequent: 0, occasional: 0, low: 0, none: 0 };
    trendMap[day][cat] += 1;
  });

  const days = Math.min(end.diff(start, 'day') + 1, 60);
  const trend = Array.from({ length: days }, (_, i) => {
    const date = start.clone().add(i, 'day').format('YYYY-MM-DD');
    return { date, ...(trendMap[date] || { frequent: 0, occasional: 0, low: 0, none: 0 }) };
  });

  return { data: { cards, charts: { pie, bar, trend } } };
};

// ── User Table (Priority 1) ─────────────────────────────────────────────────
const getUserTable = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const match = buildMatch(query);
  const { sortBy = 'lastActiveAt', order = 'desc' } = query;
  const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

  const [rows, total] = await Promise.all([
    User.find(match).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(match),
  ]);

  const data = rows.map((u) => ({
    userId: u.userId,
    name: u.name,
    email: u.email,
    mobile: u.mobile,
    designation: u.designation,
    doj: u.doj,
    starId: u.starId,
    dealer: u.dealer?.name || null,
    dealerCategory: u.dealer?.category || null,
    state: u.dealer?.state || null,
    city: u.dealer?.city || null,
    loginDays: u.loginDays,
    totalLogins: u.totalLogins,
    avgTimeSpent: u.totalSessions ? Math.round(u.totalTimeSpent / u.totalSessions) : 0,
    lastLogin: u.lastLoginAt,
    status: u.isActive ? 'Active' : 'Inactive',
    category: CATEGORY_LABELS[classify(u.loginDays)],
  }));

  return { data, meta: buildMeta(page, limit, total) };
};

// ── Per-role breakdown: one row per designation ─────────────────────────────
const getRoleAnalytics = async (query = {}) => {
  const match = buildMatch(query);

  const rows = await User.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$designation',
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
        avgTimeSpent: { $avg: '$totalTimeSpent' },
        avgLoginDays: { $avg: '$loginDays' },
        totalLogins: { $sum: '$totalLogins' },
        frequent: { $sum: { $cond: [{ $gt: ['$loginDays', 20] }, 1, 0] } },
        occasional: { $sum: { $cond: [{ $and: [{ $gte: ['$loginDays', 5] }, { $lte: ['$loginDays', 20] }] }, 1, 0] } },
        low: { $sum: { $cond: [{ $and: [{ $gte: ['$loginDays', 1] }, { $lt: ['$loginDays', 5] }] }, 1, 0] } },
        none: { $sum: { $cond: [{ $eq: ['$loginDays', 0] }, 1, 0] } },
      },
    },
    { $sort: { totalUsers: -1 } },
  ]);

  const summary = rows.reduce(
    (acc, r) => ({
      totalUsers: acc.totalUsers + r.totalUsers,
      activeUsers: acc.activeUsers + r.activeUsers,
      totalLogins: acc.totalLogins + r.totalLogins,
      avgTimeSpent: acc.avgTimeSpent + r.avgTimeSpent * r.totalUsers,
      avgLoginDays: acc.avgLoginDays + r.avgLoginDays * r.totalUsers,
    }),
    { totalUsers: 0, activeUsers: 0, totalLogins: 0, avgTimeSpent: 0, avgLoginDays: 0 }
  );
  const totalUsers = summary.totalUsers || 1;

  const { page, limit, skip } = getPagination(query);
  // A null _id is a user the app has not sent a role for yet. Those are shown as
  // "Unassigned" rather than dropped, so the row counts still add up to the
  // user total and a gap in app-side reporting stays visible.
  const tableRows = rows.map((r) => ({
    name: r._id || 'Unassigned',
    totalUsers: r.totalUsers,
    activeUsers: r.activeUsers,
    avgTimeSpent: Math.round(r.avgTimeSpent || 0),
    avgLoginDays: round(r.avgLoginDays || 0, 1),
    totalLogins: r.totalLogins,
    frequent: r.frequent,
    occasional: r.occasional,
    low: r.low,
    none: r.none,
  }));

  return {
    data: {
      summary: {
        totalUsers: summary.totalUsers,
        activeUsers: summary.activeUsers,
        avgTimeSpent: Math.round(summary.avgTimeSpent / totalUsers),
        avgLoginDays: round(summary.avgLoginDays / totalUsers, 1),
        totalLogins: summary.totalLogins,
      },
      charts: {
        totalUsers: tableRows.slice(0, 10).map((r) => ({ name: r.name, value: r.totalUsers })),
        classification: [
          { name: 'Frequent', value: rows.reduce((a, r) => a + r.frequent, 0) },
          { name: 'Occasional', value: rows.reduce((a, r) => a + r.occasional, 0) },
          { name: 'Low', value: rows.reduce((a, r) => a + r.low, 0) },
          { name: 'No Login', value: rows.reduce((a, r) => a + r.none, 0) },
        ],
      },
      rows: tableRows.slice(skip, skip + limit),
    },
    meta: buildMeta(page, limit, tableRows.length),
  };
};

// ── Excel export ─────────────────────────────────────────────────────────────
const exportUsers = async (query = {}) => {
  const ExcelJS = require('exceljs');
  const match = buildMatch(query);
  const rows = await User.find(match).sort({ lastActiveAt: -1 }).limit(10000).lean();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Users');
  sheet.columns = [
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Mobile', key: 'mobile', width: 16 },
    { header: 'Designation', key: 'designation', width: 18 },
    { header: 'DOJ', key: 'doj', width: 14 },
    { header: 'Star ID', key: 'starId', width: 14 },
    { header: 'Dealer', key: 'dealer', width: 34 },
    { header: 'Dealer Category', key: 'dealerCategory', width: 16 },
    { header: 'State', key: 'state', width: 18 },
    { header: 'City', key: 'city', width: 18 },
    { header: 'Login Days', key: 'loginDays', width: 12 },
    { header: 'Total Logins', key: 'totalLogins', width: 14 },
    { header: 'Avg Time', key: 'avgTime', width: 14 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Category', key: 'category', width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  rows.forEach((u) => {
    sheet.addRow({
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      designation: u.designation,
      doj: u.doj ? dayjs(u.doj).format('YYYY-MM-DD') : '',
      starId: u.starId,
      dealer: u.dealer?.name || '',
      dealerCategory: u.dealer?.category || '',
      state: u.dealer?.state || '',
      city: u.dealer?.city || '',
      loginDays: u.loginDays,
      totalLogins: u.totalLogins,
      avgTime: u.totalSessions ? Math.round(u.totalTimeSpent / u.totalSessions / 1000) : 0,
      status: u.isActive ? 'Active' : 'Inactive',
      category: CATEGORY_LABELS[classify(u.loginDays)],
    });
  });

  return workbook.xlsx.writeBuffer();
};

module.exports = {
  buildScopeMatch: buildMatch,
  CATEGORY_LABELS,
  categorySwitch,
  getFilterOptions,
  getRoleSummary,
  getRoleAnalytics,
  getUserClassification,
  getUserTable,
  exportUsers,
  classify,
  ROLES,
};
