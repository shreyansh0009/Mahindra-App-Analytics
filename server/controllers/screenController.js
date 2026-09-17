const screenService = require('../services/screenService');

const getAnalytics = async (req, res, next) => {
  try {
    const data = await screenService.getScreenAnalytics(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const getTopScreens = async (req, res, next) => {
  try {
    const data = await screenService.getTopScreens(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const getScreenTrend = async (req, res, next) => {
  try {
    const data = await screenService.getScreenTrend(req.params.screenName, req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAnalytics, getTopScreens, getScreenTrend };
