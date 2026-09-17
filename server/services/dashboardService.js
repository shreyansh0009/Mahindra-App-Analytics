const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const User = require('../models/User');
const Session = require('../models/Session');
const Event = require('../models/Event');
const ScreenVisit = require('../models/ScreenVisit');
const { buildDateFilter } = require('../utils/dateRange');

const getSummary = async (query) => {
  const { userId } = query;

  // ── Single-user scope: every KPI reflects just this user ──────────────────
  if (userId) {
    const sessionFilter = { ...buildDateFilter(query, 'startTime'), userId };
    const eventFilter = { ...buildDateFilter(query, 'timestamp'), userId };
    const screenFilter = { ...buildDateFilter(query, 'date'), userId };

    const [scopedUser, totalSessions, activeSessions, totalEvents, totalScreenViews, avgDurationResult] =
      await Promise.all([
        User.findOne({ userId }).lean(),
        Session.countDocuments(sessionFilter),
        Session.countDocuments({ isActive: true, userId }),
        Event.countDocuments(eventFilter),
        ScreenVisit.countDocuments(screenFilter),
        Session.aggregate([
          { $match: { ...sessionFilter, duration: { $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: '$duration' } } },
        ]),
      ]);

    return {
      scopedUser,
      totalSessions,
      activeSessions,
      totalEvents,
      totalScreenViews,
      avgSessionDuration: Math.round(avgDurationResult[0]?.avg || 0),
    };
  }

  // ── Global scope ──────────────────────────────────────────────────────────
  const dateFilter = buildDateFilter(query, 'timestamp');
  const sessionDateFilter = buildDateFilter(query, 'startTime');

  const now = new Date();
  const todayStart = dayjs.utc(now).startOf('day').toDate();
  const weekStart = dayjs.utc(now).startOf('week').toDate();
  const monthStart = dayjs.utc(now).startOf('month').toDate();

  const newUsersFilter = buildDateFilter(query, 'firstSeenAt');

  const [
    totalUsers,
    dau,
    wau,
    mau,
    newUsers,
    totalSessions,
    activeSessions,
    totalEvents,
    avgDurationResult,
    scopedUser,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastActiveAt: { $gte: todayStart } }),
    User.countDocuments({ lastActiveAt: { $gte: weekStart } }),
    User.countDocuments({ lastActiveAt: { $gte: monthStart } }),
    User.countDocuments(newUsersFilter),
    Session.countDocuments(sessionDateFilter),
    Session.countDocuments({ isActive: true, ...(userId && { userId }) }),
    Event.countDocuments(dateFilter),
    Session.aggregate([
      { $match: { ...sessionDateFilter, duration: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$duration' } } },
    ]),
    userId ? User.findOne({ userId }).lean() : null,
  ]);

  const avgSessionDuration = avgDurationResult[0]?.avg || 0;

  // Growth %: new users in the current range vs the immediately preceding
  // range of equal length. Falls back to a trailing 30-day window when no
  // explicit date range is supplied.
  const growth = await computeUserGrowth(query);

  return {
    totalUsers,
    dau,
    wau,
    mau,
    newUsers,
    totalSessions,
    activeSessions,
    totalEvents,
    avgSessionDuration: Math.round(avgSessionDuration),
    growth,
    scopedUser,
  };
};

// New-user growth % between the current and previous period of equal length.
const computeUserGrowth = async (query) => {
  const end = query.endDate ? dayjs.utc(query.endDate).endOf('day') : dayjs.utc().endOf('day');
  const start = query.startDate
    ? dayjs.utc(query.startDate).startOf('day')
    : end.clone().subtract(29, 'day').startOf('day');

  const spanMs = end.valueOf() - start.valueOf();
  const prevEnd = start.clone().subtract(1, 'millisecond');
  const prevStart = dayjs.utc(prevEnd.valueOf() - spanMs);

  const [current, previous] = await Promise.all([
    User.countDocuments({ firstSeenAt: { $gte: start.toDate(), $lte: end.toDate() } }),
    User.countDocuments({ firstSeenAt: { $gte: prevStart.toDate(), $lte: prevEnd.toDate() } }),
  ]);

  if (!previous) return current ? 100 : 0;
  return +(((current - previous) / previous) * 100).toFixed(1);
};

// Performance metrics derived from perf-related events (single $facet pass).
// Reuses the events collection — no separate performance collection.
const getPerformance = async (query) => {
  const match = buildDateFilter(query, 'timestamp');
  if (query.userId) match.userId = query.userId;

  const [agg] = await Event.aggregate([
    { $match: match },
    {
      $facet: {
        apiResponse: [
          { $match: { eventType: 'api_call', 'metrics.responseTimeMs': { $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: '$metrics.responseTimeMs' }, count: { $sum: 1 } } },
        ],
        screenLoad: [
          { $match: { 'metrics.loadTimeMs': { $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: '$metrics.loadTimeMs' } } },
        ],
        startup: [
          { $match: { eventType: 'app_startup', 'metrics.startupTimeMs': { $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: '$metrics.startupTimeMs' } } },
        ],
        crashes: [
          { $match: { eventType: 'crash' } },
          { $count: 'count' },
        ],
        errors: [
          { $match: { eventType: 'error' } },
          { $count: 'count' },
        ],
        sessions: [
          { $group: { _id: '$sessionId' } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  const crashCount = agg?.crashes[0]?.count || 0;
  const sessionCount = agg?.sessions[0]?.count || 0;

  return {
    avgApiResponse: Math.round(agg?.apiResponse[0]?.avg || 0),
    apiCallCount: agg?.apiResponse[0]?.count || 0,
    avgScreenLoad: Math.round(agg?.screenLoad[0]?.avg || 0),
    avgStartupTime: Math.round(agg?.startup[0]?.avg || 0),
    crashCount,
    errorCount: agg?.errors[0]?.count || 0,
    crashFreeRate: sessionCount
      ? +(((sessionCount - crashCount) / sessionCount) * 100).toFixed(2)
      : 100,
  };
};

// Geographic + network distribution from sessions.
const getGeo = async (query) => {
  const filter = buildDateFilter(query, 'startTime');
  if (query.userId) filter.userId = query.userId;

  const [countries, networks] = await Promise.all([
    Session.aggregate([
      { $match: filter },
      { $group: { _id: '$location.country', value: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { value: -1 } },
      { $limit: 10 },
      { $project: { name: '$_id', value: 1, _id: 0 } },
    ]),
    Session.aggregate([
      { $match: filter },
      { $group: { _id: '$networkType', value: { $sum: 1 } } },
      { $sort: { value: -1 } },
      { $project: { name: '$_id', value: 1, _id: 0 } },
    ]),
  ]);

  return { countries, networks };
};

// Device platform + top device-model breakdown (respects date range + userId).
const getDeviceBreakdown = async (query) => {
  const filter = buildDateFilter(query, 'startTime');
  if (query.userId) filter.userId = query.userId;

  const [platforms, models] = await Promise.all([
    Session.aggregate([
      { $match: filter },
      { $group: { _id: '$platform', value: { $sum: 1 } } },
      { $sort: { value: -1 } },
      { $project: { name: '$_id', value: 1, _id: 0 } },
    ]),
    Session.aggregate([
      { $match: filter },
      { $group: { _id: '$deviceModel', value: { $sum: 1 } } },
      { $sort: { value: -1 } },
      { $limit: 8 },
      { $project: { name: '$_id', value: 1, _id: 0 } },
    ]),
  ]);

  return { platforms, models };
};

// App-version distribution with distinct-user counts.
const getAppVersions = async (query) => {
  const filter = buildDateFilter(query, 'startTime');
  if (query.userId) filter.userId = query.userId;

  const rows = await Session.aggregate([
    { $match: filter },
    { $group: { _id: '$appVersion', users: { $addToSet: '$userId' }, sessions: { $sum: 1 } } },
    { $project: { version: '$_id', users: { $size: '$users' }, sessions: 1, _id: 0 } },
    { $sort: { users: -1 } },
  ]);

  const totalUsers = rows.reduce((acc, r) => acc + r.users, 0) || 1;
  return rows.map((r) => ({ ...r, pct: +((r.users / totalUsers) * 100).toFixed(1) }));
};

// Conversion funnel by distinct users progressing through a screen journey.
// Uses ScreenVisit so the steps reflect real navigation depth (naturally decreasing).
const getFunnel = async (query) => {
  const filter = buildDateFilter(query, 'date');
  if (query.userId) filter.userId = query.userId;

  const STEPS = [
    { step: 'Home', screenName: 'HomeScreen' },
    { step: 'Browse', screenName: 'MarketPricesScreen' },
    { step: 'Crop Details', screenName: 'CropDetailsScreen' },
    { step: 'Soil Analysis', screenName: 'SoilAnalysisScreen' },
    { step: 'Planning', screenName: 'FarmCalendarScreen' },
  ];

  const counts = await Promise.all(
    STEPS.map((s) =>
      ScreenVisit.distinct('userId', { ...filter, screenName: s.screenName }).then((u) => u.length)
    )
  );

  const top = counts[0] || 1;
  return STEPS.map((s, i) => ({
    step: s.step,
    users: counts[i],
    pct: +((counts[i] / top) * 100).toFixed(1),
  }));
};

// Aggregate day-N retention curve (average across all recent cohorts).
const getRetentionCurve = async (query) => {
  const days = parseInt(query.days, 10) || 30;
  const cutoff = dayjs.utc().subtract(days, 'day').startOf('day').toDate();
  const cohortUsers = await User.find(
    query.userId ? { userId: query.userId } : { firstSeenAt: { $gte: cutoff } },
    { userId: 1, firstSeenAt: 1 }
  ).lean();

  const retentionDays = [1, 3, 7, 14, 30];
  const totals = cohortUsers.length || 1;
  if (!cohortUsers.length) return retentionDays.map((d) => ({ day: `Day ${d}`, value: 0 }));

  // One pass over the cohort's sessions instead of a query per (user, day-N):
  // the old version fired cohortUsers.length * retentionDays.length `exists`
  // calls, which grew linearly with the user table and dominated page load.
  const activeDays = await Session.aggregate([
    { $match: { userId: { $in: cohortUsers.map((u) => u.userId) } } },
    {
      $group: {
        _id: {
          userId: '$userId',
          day: { $dateToString: { format: '%Y-%m-%d', date: '$startTime', timezone: 'UTC' } },
        },
      },
    },
  ]);

  const seen = new Set(activeDays.map((r) => `${r._id.userId}|${r._id.day}`));

  return retentionDays.map((d) => {
    let retained = 0;
    for (const u of cohortUsers) {
      const target = dayjs.utc(u.firstSeenAt).add(d, 'day').format('YYYY-MM-DD');
      if (seen.has(`${u.userId}|${target}`)) retained += 1;
    }
    return { day: `Day ${d}`, value: +((retained / totals) * 100).toFixed(1) };
  });
};

// Session-quality metrics for the overview "Session Overview" panel.
const getSessionOverview = async (query) => {
  const filter = buildDateFilter(query, 'startTime');
  if (query.userId) filter.userId = query.userId;

  const [agg] = await Session.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        sessions: { $sum: 1 },
        users: { $addToSet: '$userId' },
        avgDuration: { $avg: '$duration' },
        avgScreens: { $avg: { $size: '$screensVisited' } },
        bounces: { $sum: { $cond: [{ $lte: [{ $size: '$screensVisited' }, 1] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        sessions: 1,
        avgDuration: { $round: ['$avgDuration', 0] },
        avgScreens: { $round: ['$avgScreens', 2] },
        sessionsPerUser: { $round: [{ $divide: ['$sessions', { $size: '$users' }] }, 2] },
        bounceRate: { $round: [{ $multiply: [{ $divide: ['$bounces', '$sessions'] }, 100] }, 1] },
      },
    },
  ]);

  return agg || { sessions: 0, avgDuration: 0, avgScreens: 0, sessionsPerUser: 0, bounceRate: 0 };
};

const getGraphData = async (query) => {
  const { startDate, endDate, granularity = 'day', userId } = query;

  const start = startDate
    ? dayjs.utc(startDate).startOf('day').toDate()
    : dayjs.utc().subtract(29, 'day').startOf('day').toDate();
  const end = endDate
    ? dayjs.utc(endDate).endOf('day').toDate()
    : dayjs.utc().endOf('day').toDate();

  const groupFormat =
    granularity === 'month' ? '%Y-%m' : granularity === 'week' ? '%Y-%U' : '%Y-%m-%d';

  // For a single scoped user, "active users per day" isn't meaningful (it's always
  // just that one user) — swap it for their screen-views trend instead.
  const dauTrendQuery = userId
    ? ScreenVisit.aggregate([
        { $match: { userId, date: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat, date: '$date' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
    : User.aggregate([
        { $match: { lastActiveAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat, date: '$lastActiveAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

  const [dauTrend, sessionTrend, eventTrend] = await Promise.all([
    dauTrendQuery,

    Session.aggregate([
      { $match: { startTime: { $gte: start, $lte: end }, ...(userId && { userId }) } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$startTime' } },
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Event.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end }, ...(userId && { userId }) } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$timestamp' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return { dauTrend, sessionTrend, eventTrend, scopedByUser: !!userId };
};

const getRealtimeStats = async () => {
  const fiveMinAgo = dayjs.utc().subtract(5, 'minute').toDate();

  const [activeSessions, onlineUsersAgg, recentEvents, eventTypes, feed, topPages] = await Promise.all([
    Session.countDocuments({ isActive: true }),
    Session.distinct('userId', { isActive: true }),
    Event.countDocuments({ timestamp: { $gte: fiveMinAgo } }),
    Event.aggregate([
      { $match: { timestamp: { $gte: fiveMinAgo } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    // Live activity feed: most recent events joined to user + session location.
    Event.aggregate([
      { $match: { timestamp: { $gte: fiveMinAgo } } },
      { $sort: { timestamp: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'users', localField: 'userId', foreignField: 'userId', as: 'user' } },
      { $lookup: { from: 'sessions', localField: 'sessionId', foreignField: 'sessionId', as: 'session' } },
      {
        $project: {
          _id: 0,
          userId: 1,
          eventName: 1,
          eventType: 1,
          screenName: 1,
          timestamp: 1,
          name: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, '$userId'] },
          city: { $ifNull: [{ $arrayElemAt: ['$session.location.city', 0] }, 'Unknown'] },
        },
      },
    ]),
    ScreenVisit.aggregate([
      { $match: { entryTime: { $gte: fiveMinAgo } } },
      { $group: { _id: '$screenName', users: { $sum: 1 } } },
      { $sort: { users: -1 } },
      { $limit: 6 },
      { $project: { page: '$_id', users: 1, _id: 0 } },
    ]),
  ]);

  return {
    activeSessions,
    onlineUsers: onlineUsersAgg.length,
    recentEvents,
    eventTypes,
    feed,
    topPages,
    since: fiveMinAgo,
  };
};

module.exports = {
  getSummary,
  getGraphData,
  getRealtimeStats,
  getDeviceBreakdown,
  getAppVersions,
  getFunnel,
  getRetentionCurve,
  getSessionOverview,
  getPerformance,
  getGeo,
};
