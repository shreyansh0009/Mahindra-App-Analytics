const Session = require('../models/Session');
const Event = require('../models/Event');
const { getPagination, buildMeta } = require('../utils/pagination');
const { buildDateFilter } = require('../utils/dateRange');

const getSessions = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const { userId, platform, isActive, sortBy = 'startTime', order = 'desc' } = query;

  const filter = buildDateFilter(query, 'startTime');
  if (userId) filter.userId = userId;
  if (platform) filter.platform = platform;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    Session.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Session.countDocuments(filter),
  ]);

  return { data, meta: buildMeta(page, limit, total) };
};

const getSessionById = async (sessionId) => {
  const [session, events] = await Promise.all([
    Session.findOne({ sessionId }).lean(),
    Event.find({ sessionId }).sort({ timestamp: 1 }).lean(),
  ]);
  return session ? { ...session, events } : null;
};

// KPI stats for the Sessions page (avg / longest / shortest / bounce / per-user).
const getSessionStats = async (query) => {
  const filter = buildDateFilter(query, 'startTime');
  if (query.userId) filter.userId = query.userId;
  filter.duration = { $gt: 0 };

  const [agg] = await Session.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        sessions: { $sum: 1 },
        users: { $addToSet: '$userId' },
        avgDuration: { $avg: '$duration' },
        longest: { $max: '$duration' },
        shortest: { $min: '$duration' },
        bounces: { $sum: { $cond: [{ $lte: [{ $size: '$screensVisited' }, 1] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        sessions: 1,
        avgDuration: { $round: ['$avgDuration', 0] },
        longest: 1,
        shortest: 1,
        sessionsPerUser: { $round: [{ $divide: ['$sessions', { $size: '$users' }] }, 2] },
        bounceRate: { $round: [{ $multiply: [{ $divide: ['$bounces', '$sessions'] }, 100] }, 1] },
      },
    },
  ]);

  return agg || { sessions: 0, avgDuration: 0, longest: 0, shortest: 0, sessionsPerUser: 0, bounceRate: 0 };
};

// Sessions grouped by hour-of-day (0–23) for the distribution chart.
const getHourlyDistribution = async (query) => {
  const filter = buildDateFilter(query, 'startTime');
  if (query.userId) filter.userId = query.userId;

  const rows = await Session.aggregate([
    { $match: filter },
    { $group: { _id: { $hour: { date: '$startTime', timezone: 'UTC' } }, sessions: { $sum: 1 } } },
  ]);

  const map = new Map(rows.map((r) => [r._id, r.sessions]));
  return Array.from({ length: 24 }).map((_, h) => ({ hour: `${h}:00`, sessions: map.get(h) || 0 }));
};

// Daily sessions + avg-duration trend.
const getSessionTrend = async (query) => {
  const filter = buildDateFilter(query, 'startTime');
  if (query.userId) filter.userId = query.userId;

  return Session.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
        sessions: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', sessions: 1, avgDuration: { $round: ['$avgDuration', 0] }, _id: 0 } },
  ]);
};

module.exports = {
  getSessions,
  getSessionById,
  getSessionStats,
  getHourlyDistribution,
  getSessionTrend,
};
