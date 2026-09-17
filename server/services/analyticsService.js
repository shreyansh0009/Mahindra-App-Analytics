const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const User = require('../models/User');
const Session = require('../models/Session');
const Event = require('../models/Event');

/**
 * Day-N retention cohort.
 * Groups users by their firstSeenAt date (cohort) and checks if they were
 * active on day 1, 3, 7, 14, 30 after joining.
 */
const getRetention = async (query) => {
  const { days = 30 } = query;
  const cutoff = dayjs.utc().subtract(parseInt(days, 10), 'day').startOf('day').toDate();

  const cohorts = await User.aggregate([
    { $match: { firstSeenAt: { $gte: cutoff } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$firstSeenAt' } },
        users: { $push: '$userId' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 30 },
  ]);

  const retentionDays = [1, 3, 7, 14, 30];

  const result = await Promise.all(
    cohorts.map(async (cohort) => {
      const cohortDate = dayjs.utc(cohort._id);
      const retention = {};

      await Promise.all(
        retentionDays.map(async (d) => {
          const dayStart = cohortDate.add(d, 'day').startOf('day').toDate();
          const dayEnd = cohortDate.add(d, 'day').endOf('day').toDate();

          const active = await Session.distinct('userId', {
            userId: { $in: cohort.users },
            startTime: { $gte: dayStart, $lte: dayEnd },
          });

          retention[`day${d}`] = cohort.count > 0
            ? Math.round((active.length / cohort.count) * 100)
            : 0;
        })
      );

      return { date: cohort._id, cohortSize: cohort.count, retention };
    })
  );

  return result;
};

/**
 * DAU / WAU / MAU trend over the requested date range.
 */
const getUsageTrend = async (query) => {
  const { granularity = 'day', days = 30 } = query;
  const start = dayjs.utc().subtract(parseInt(days, 10), 'day').startOf('day').toDate();
  const end = dayjs.utc().endOf('day').toDate();

  const fmt = granularity === 'month' ? '%Y-%m' : granularity === 'week' ? '%Y-%U' : '%Y-%m-%d';

  return Session.aggregate([
    { $match: { startTime: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: fmt, date: '$startTime' } },
        activeUsers: { $addToSet: '$userId' },
        sessions: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
      },
    },
    {
      $project: {
        date: '$_id',
        activeUsers: { $size: '$activeUsers' },
        sessions: 1,
        avgDuration: { $round: ['$avgDuration', 0] },
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ]);
};

/**
 * Engagement metrics: avg session duration trend, avg events per session.
 */
const getEngagement = async (query) => {
  const { days = 30 } = query;
  const start = dayjs.utc().subtract(parseInt(days, 10), 'day').startOf('day').toDate();

  return Session.aggregate([
    { $match: { startTime: { $gte: start }, duration: { $gt: 0 } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
        avgDuration: { $avg: '$duration' },
        avgEvents: { $avg: '$eventCount' },
        sessions: { $sum: 1 },
      },
    },
    {
      $project: {
        date: '$_id',
        avgDuration: { $round: ['$avgDuration', 0] },
        avgEvents: { $round: ['$avgEvents', 1] },
        sessions: 1,
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ]);
};

module.exports = { getRetention, getUsageTrend, getEngagement };
