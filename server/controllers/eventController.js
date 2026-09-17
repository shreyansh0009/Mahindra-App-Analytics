const eventService = require('../services/eventService');

const getEvents = async (req, res, next) => {
  try {
    const { data, meta } = await eventService.getEvents(req.query);
    res.paginated(data, meta);
  } catch (err) {
    next(err);
  }
};

const getDistribution = async (req, res, next) => {
  try {
    const data = await eventService.getEventDistribution(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const getTopEvents = async (req, res, next) => {
  try {
    const data = await eventService.getTopEvents(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const wrap = (fn) => async (req, res, next) => {
  try {
    res.success(await fn(req.query));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEvents,
  getDistribution,
  getTopEvents,
  getStats: wrap(eventService.getEventStats),
  getTrend: wrap(eventService.getEventTrend),
  getSummary: wrap(eventService.getEventSummary),
};
