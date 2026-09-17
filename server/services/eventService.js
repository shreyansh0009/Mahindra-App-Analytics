const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const Event = require('../models/Event');
const { getPagination, buildMeta } = require('../utils/pagination');
const { buildDateFilter } = require('../utils/dateRange');

const getEvents = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const { userId, sessionId, eventType, screenName, search } = query;

  const filter = buildDateFilter(query, 'timestamp');
  if (userId) filter.userId = userId;
  if (sessionId) filter.sessionId = sessionId;
  if (eventType) filter.eventType = eventType;
  if (screenName) filter.screenName = new RegExp(screenName, 'i');
  if (search) filter.eventName = new RegExp(search, 'i');

  const [data, total] = await Promise.all([
    Event.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    Event.countDocuments(filter),
  ]);

  return { data, meta: buildMeta(page, limit, total) };
};

const getEventDistribution = async (query) => {
  const dateFilter = buildDateFilter(query, 'timestamp');
  if (query.userId) dateFilter.userId = query.userId;
  return Event.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$eventType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

const getTopEvents = async (query) => {
  const { limit = 10 } = query;
  const dateFilter = buildDateFilter(query, 'timestamp');
  if (query.userId) dateFilter.userId = query.userId;
  return Event.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$eventName', count: { $sum: 1 }, eventType: { $first: '$eventType' } } },
    { $sort: { count: -1 } },
    { $limit: parseInt(limit, 10) },
  ]);
};

// Per-event-name stats table: count, unique users, avg-per-user.
const getEventStats = async (query) => {
  const filter = buildDateFilter(query, 'timestamp');
  if (query.userId) filter.userId = query.userId;

  // Grouped in two stages rather than collecting a $addToSet of every userId per
  // event name — that set grew past the 100MB in-memory $group limit and made
  // this endpoint fail outright once the events collection got large.
  return Event.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { eventName: '$eventName', userId: '$userId' },
        count: { $sum: 1 },
        eventType: { $first: '$eventType' },
      },
    },
    {
      $group: {
        _id: '$_id.eventName',
        count: { $sum: '$count' },
        users: { $sum: 1 },
        eventType: { $first: '$eventType' },
      },
    },
    {
      $project: {
        event: '$_id',
        count: 1,
        eventType: 1,
        users: 1,
        perUser: { $round: [{ $divide: ['$count', '$users'] }, 2] },
        _id: 0,
      },
    },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);
};

// Daily event-frequency trend.
const getEventTrend = async (query) => {
  const filter = buildDateFilter(query, 'timestamp');
  if (query.userId) filter.userId = query.userId;

  return Event.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        events: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', events: 1, _id: 0 } },
  ]);
};

// Summary KPI counters for the Events page.
const getEventSummary = async (query) => {
  const filter = buildDateFilter(query, 'timestamp');
  if (query.userId) filter.userId = query.userId;

  const startOfToday = dayjs.utc().startOf('day').toDate();

  const [total, uniqueNames, uniqueUsers, today] = await Promise.all([
    Event.countDocuments(filter),
    Event.distinct('eventName', filter).then((a) => a.length),
    Event.distinct('userId', filter).then((a) => a.length),
    Event.countDocuments({ ...filter, timestamp: { $gte: startOfToday } }),
  ]);

  return {
    total,
    unique: uniqueNames,
    perUser: uniqueUsers ? +(total / uniqueUsers).toFixed(1) : 0,
    today,
  };
};

module.exports = {
  getEvents,
  getEventDistribution,
  getTopEvents,
  getEventStats,
  getEventTrend,
  getEventSummary,
};
