const featureUsageService = require('../services/featureUsageService');

const featureUsage = async (req, res, next) => {
  try {
    const result = await featureUsageService.getFeatureUsage(req.query);
    res.success(result.data, 200, result.meta);
  } catch (err) {
    next(err);
  }
};

module.exports = { featureUsage };
