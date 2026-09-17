const reportService = require('../services/reportService');

const daily = async (req, res, next) => {
  try {
    const data = await reportService.getDailyReport(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const weekly = async (req, res, next) => {
  try {
    const data = await reportService.getWeeklyReport(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const monthly = async (req, res, next) => {
  try {
    const data = await reportService.getMonthlyReport(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { daily, weekly, monthly };
