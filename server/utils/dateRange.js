const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

/**
 * Builds a MongoDB date filter object from startDate / endDate query params.
 * Returns {} if neither is provided (no date filter applied).
 */
const buildDateFilter = (query, field = 'timestamp') => {
  const { startDate, endDate } = query;
  if (!startDate && !endDate) return {};

  const filter = {};
  const range = {};
  if (startDate) range.$gte = dayjs.utc(startDate).startOf('day').toDate();
  if (endDate) range.$lte = dayjs.utc(endDate).endOf('day').toDate();
  filter[field] = range;
  return filter;
};

/**
 * Returns start/end Date objects for a given granularity and reference date.
 */
const getPeriodBounds = (granularity, date = new Date()) => {
  const d = dayjs.utc(date);
  if (granularity === 'day') {
    return { start: d.startOf('day').toDate(), end: d.endOf('day').toDate() };
  }
  if (granularity === 'week') {
    return { start: d.startOf('week').toDate(), end: d.endOf('week').toDate() };
  }
  if (granularity === 'month') {
    return { start: d.startOf('month').toDate(), end: d.endOf('month').toDate() };
  }
  return { start: d.startOf('day').toDate(), end: d.endOf('day').toDate() };
};

module.exports = { buildDateFilter, getPeriodBounds };
