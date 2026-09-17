const ScreenVisit = require('../models/ScreenVisit');
const { buildDateFilter } = require('../utils/dateRange');

const getScreenAnalytics = async (query) => {
  const dateFilter = buildDateFilter(query, 'date');
  if (query.userId) dateFilter.userId = query.userId;

  return ScreenVisit.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$screenName',
        totalVisits: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgDuration: { $avg: '$duration' },
        totalDuration: { $sum: '$duration' },
      },
    },
    {
      $project: {
        screenName: '$_id',
        totalVisits: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        avgDuration: { $round: ['$avgDuration', 0] },
        totalDuration: 1,
        _id: 0,
      },
    },
    { $sort: { totalVisits: -1 } },
  ]);
};

const getTopScreens = async (query) => {
  const { limit = 10 } = query;
  const dateFilter = buildDateFilter(query, 'date');
  if (query.userId) dateFilter.userId = query.userId;

  return ScreenVisit.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$screenName',
        visits: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { visits: -1 } },
    { $limit: parseInt(limit, 10) },
    {
      $project: {
        screenName: '$_id',
        visits: 1,
        avgDuration: { $round: ['$avgDuration', 0] },
        _id: 0,
      },
    },
  ]);
};

const getScreenTrend = async (screenName, query) => {
  const dateFilter = buildDateFilter(query, 'date');

  return ScreenVisit.aggregate([
    { $match: { screenName, ...dateFilter } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        visits: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        visits: 1,
        avgDuration: { $round: ['$avgDuration', 0] },
        _id: 0,
      },
    },
  ]);
};

module.exports = { getScreenAnalytics, getTopScreens, getScreenTrend };
