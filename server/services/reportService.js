const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const User = require('../models/User');
const Session = require('../models/Session');
const Event = require('../models/Event');
const ScreenVisit = require('../models/ScreenVisit');

const buildReport = async (start, end) => {
  const sessionFilter = { startTime: { $gte: start, $lte: end } };
  const eventFilter = { timestamp: { $gte: start, $lte: end } };

  const [
    newUsers,
    activeUsers,
    totalSessions,
    totalEvents,
    avgDurationResult,
    topScreens,
    eventDistribution,
    platformBreakdown,
  ] = await Promise.all([
    User.countDocuments({ firstSeenAt: { $gte: start, $lte: end } }),
    User.countDocuments({ lastActiveAt: { $gte: start, $lte: end } }),
    Session.countDocuments(sessionFilter),
    Event.countDocuments(eventFilter),
    Session.aggregate([
      { $match: { ...sessionFilter, duration: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$duration' } } },
    ]),
    ScreenVisit.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: '$screenName', visits: { $sum: 1 }, avgDuration: { $avg: '$duration' } } },
      { $sort: { visits: -1 } },
      { $limit: 10 },
      { $project: { screenName: '$_id', visits: 1, avgDuration: { $round: ['$avgDuration', 0] }, _id: 0 } },
    ]),
    Event.aggregate([
      { $match: eventFilter },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Session.aggregate([
      { $match: sessionFilter },
      { $group: { _id: '$platform', count: { $sum: 1 } } },
    ]),
  ]);

  const avgSessionDuration = Math.round(avgDurationResult[0]?.avg || 0);
  const platform = platformBreakdown.reduce((acc, p) => {
    acc[p._id] = p.count;
    return acc;
  }, {});

  return {
    period: { start, end },
    newUsers,
    activeUsers,
    totalSessions,
    totalEvents,
    avgSessionDuration,
    topScreens,
    eventDistribution,
    platformBreakdown: platform,
  };
};

const getDailyReport = async (query) => {
  const date = query.date ? dayjs.utc(query.date) : dayjs.utc();
  return buildReport(date.startOf('day').toDate(), date.endOf('day').toDate());
};

const getWeeklyReport = async (query) => {
  const date = query.week ? dayjs.utc(query.week) : dayjs.utc();
  return buildReport(date.startOf('week').toDate(), date.endOf('week').toDate());
};

const getMonthlyReport = async (query) => {
  const date = query.month ? dayjs.utc(query.month) : dayjs.utc();
  return buildReport(date.startOf('month').toDate(), date.endOf('month').toDate());
};

module.exports = { getDailyReport, getWeeklyReport, getMonthlyReport };
