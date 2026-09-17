const roleService = require('../services/roleService');

const wrap = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req.query);
    res.success(result.data, 200, result.meta);
  } catch (err) {
    next(err);
  }
};

const filters = (req, res, next) => {
  try {
    res.success(roleService.getFilterOptions(req.query));
  } catch (err) {
    next(err);
  }
};

const exportUsers = async (req, res, next) => {
  try {
    const buffer = await roleService.exportUsers(req.query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="users-export.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  filters,
  summary: wrap(roleService.getRoleSummary),
  analytics: wrap(roleService.getRoleAnalytics),
  classification: wrap(roleService.getUserClassification),
  userTable: wrap(roleService.getUserTable),
  exportUsers,
};
