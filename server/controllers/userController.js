const userService = require('../services/userService');
const ApiError = require('../utils/apiError');

const getUsers = async (req, res, next) => {
  try {
    const { data, meta } = await userService.getUsers(req.query);
    res.paginated(data, meta);
  } catch (err) {
    next(err);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.userId);
    if (!user) return next(ApiError.notFound('User not found'));
    res.success(user);
  } catch (err) {
    next(err);
  }
};

const getTimeline = async (req, res, next) => {
  try {
    const { data, meta } = await userService.getUserTimeline(req.params.userId, req.query);
    res.paginated(data, meta);
  } catch (err) {
    next(err);
  }
};

const getSessions = async (req, res, next) => {
  try {
    const { data, meta } = await userService.getUserSessions(req.params.userId, req.query);
    res.paginated(data, meta);
  } catch (err) {
    next(err);
  }
};

const getTopUsers = async (req, res, next) => {
  try {
    const data = await userService.getTopUsers(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const getActiveUsers = async (req, res, next) => {
  try {
    const data = await userService.getActiveUsers();
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
  getUsers,
  getUser,
  getTimeline,
  getSessions,
  getTopUsers,
  getActiveUsers,
  getStats: wrap(userService.getUserStats),
  getDemographics: wrap(userService.getDemographics),
};
