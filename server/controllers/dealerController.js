const dealerService = require('../services/dealerService');

const wrap = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req.query);
    res.success(result.data, 200, result.meta);
  } catch (err) {
    next(err);
  }
};

// Filter options come from the collection, so unlike the role filters this one
// hits the database and has to be awaited.
const filters = async (req, res, next) => {
  try {
    res.success(await dealerService.getFilterOptions());
  } catch (err) {
    next(err);
  }
};

module.exports = {
  filters,
  summary: wrap(dealerService.getDealerSummary),
  analytics: wrap(dealerService.getDealerAnalytics),
  geography: wrap(dealerService.getGeographyAnalytics),
};
