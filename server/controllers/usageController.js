const usageService = require('../services/usageService');

// Thin handlers — every service returns { data, meta? }; forward as-is. Awaited
// because getRoleUsage aggregates over Mongo; the synthetic ones return plain
// objects and awaiting those is a no-op.
const send = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req.query);
    res.success(result.data, 200, result.meta);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  screenUsage: send(usageService.getScreenUsage),
  moduleUsage: send(usageService.getModuleUsage),
  workflowBreak: send(usageService.getWorkflowBreak),
  roleUsage: send(usageService.getRoleUsage),
  filters: (req, res, next) => {
    try {
      res.success(usageService.getFilterOptions(req.query));
    } catch (err) {
      next(err);
    }
  },
};
