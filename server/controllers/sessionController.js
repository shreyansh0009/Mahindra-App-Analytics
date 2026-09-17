const sessionService = require('../services/sessionService');
const ApiError = require('../utils/apiError');

const getSessions = async (req, res, next) => {
  try {
    const { data, meta } = await sessionService.getSessions(req.query);
    res.paginated(data, meta);
  } catch (err) {
    next(err);
  }
};

const getSession = async (req, res, next) => {
  try {
    const session = await sessionService.getSessionById(req.params.sessionId);
    if (!session) return next(ApiError.notFound('Session not found'));
    res.success(session);
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
  getSessions,
  getSession,
  getStats: wrap(sessionService.getSessionStats),
  getHourly: wrap(sessionService.getHourlyDistribution),
  getTrend: wrap(sessionService.getSessionTrend),
};
