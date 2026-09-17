const analyticsService = require('../services/analyticsService');

const getRetention = async (req, res, next) => {
  try {
    const data = await analyticsService.getRetention(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const getUsage = async (req, res, next) => {
  try {
    const data = await analyticsService.getUsageTrend(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const getEngagement = async (req, res, next) => {
  try {
    const data = await analyticsService.getEngagement(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getRetention, getUsage, getEngagement };
