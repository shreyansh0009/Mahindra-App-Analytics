const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const User = require('../models/User');
const Session = require('../models/Session');
const Event = require('../models/Event');
const { getPagination, buildMeta } = require('../utils/pagination');
const { buildDateFilter } = require('../utils/dateRange');

const getUsers = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const { search, platform, isActive, sortBy = 'lastActiveAt', order = 'desc' } = query;

  const filter = {};
  if (search) filter.$or = [
    { userId: new RegExp(search, 'i') },
    { name: new RegExp(search, 'i') },
    { email: new RegExp(search, 'i') },
  ];
  if (platform) filter.platform = platform;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  Object.assign(filter, buildDateFilter(query, 'lastActiveAt'));

  const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return { data, meta: buildMeta(page, limit, total) };
};

const getUserById = async (userId) => {
  return User.findOne({ userId }).lean();
};

const getUserTimeline = async (userId, query) => {
  const { page, limit, skip } = getPagination(query);
  const dateFilter = buildDateFilter(query, 'timestamp');

  const filter = { userId, ...dateFilter };

  const [data, total] = await Promise.all([
    Event.find(filter).sort({ timestamp: 1 }).skip(skip).limit(limit).lean(),
    Event.countDocuments(filter),
  ]);

  return { data, meta: buildMeta(page, limit, total) };
};

const getUserSessions = async (userId, query) => {
  const { page, limit, skip } = getPagination(query);
  const dateFilter = buildDateFilter(query, 'startTime');

  const filter = { userId, ...dateFilter };

  const [data, total] = await Promise.all([
    Session.find(filter).sort({ startTime: -1 }).skip(skip).limit(limit).lean(),
    Session.countDocuments(filter),
  ]);

  return { data, meta: buildMeta(page, limit, total) };
};

const getTopUsers = async (query) => {
  const { limit = 10, metric = 'totalEvents' } = query;
  const validMetrics = ['totalEvents', 'totalSessions', 'totalTimeSpent', 'totalScreenViews'];
  const sortField = validMetrics.includes(metric) ? metric : 'totalEvents';

  return User.find()
    .sort({ [sortField]: -1 })
    .limit(parseInt(limit, 10))
    .lean();
};

const getActiveUsers = async () => {
  return User.find({ isActive: true }).sort({ lastActiveAt: -1 }).limit(50).lean();
};

// KPI counters for the Users page.
const getUserStats = async (query) => {
  const newFilter = buildDateFilter(query, 'firstSeenAt');
  const [total, newUsers, active, returning] = await Promise.all([
    User.countDocuments(),
    User.countDocuments(newFilter),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ totalSessions: { $gt: 1 } }),
  ]);
  return { total, newUsers, active, inactive: total - active, returning };
};

// Demographic breakdowns + registration growth trend.
const getDemographics = async (query) => {
  const start = query.startDate
    ? dayjs.utc(query.startDate).startOf('day').toDate()
    : dayjs.utc().subtract(29, 'day').startOf('day').toDate();
  const end = query.endDate ? dayjs.utc(query.endDate).endOf('day').toDate() : dayjs.utc().endOf('day').toDate();

  const bucket = (field) =>
    User.aggregate([
      { $group: { _id: `$${field}`, value: { $sum: 1 } } },
      { $sort: { value: -1 } },
      { $project: { name: '$_id', value: 1, _id: 0 } },
    ]);

  const [gender, ageGroup, country, growth] = await Promise.all([
    bucket('gender'),
    bucket('ageGroup'),
    bucket('country'),
    User.aggregate([
      { $match: { firstSeenAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$firstSeenAt' } }, users: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', users: 1, _id: 0 } },
    ]),
  ]);

  return { gender, ageGroup, country, growth };
};

module.exports = {
  getUsers,
  getUserById,
  getUserTimeline,
  getUserSessions,
  getTopUsers,
  getActiveUsers,
  getUserStats,
  getDemographics,
};
