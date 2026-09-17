const dashboardService = require('../services/dashboardService');

const summary = async (req, res, next) => {
  try {
    const data = await dashboardService.getSummary(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const graphs = async (req, res, next) => {
  try {
    const data = await dashboardService.getGraphData(req.query);
    res.success(data);
  } catch (err) {
    next(err);
  }
};

const realtime = async (req, res, next) => {
  try {
    const data = await dashboardService.getRealtimeStats();
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
  summary,
  graphs,
  realtime,
  devices: wrap(dashboardService.getDeviceBreakdown),
  appVersions: wrap(dashboardService.getAppVersions),
  funnel: wrap(dashboardService.getFunnel),
  retentionCurve: wrap(dashboardService.getRetentionCurve),
  sessionOverview: wrap(dashboardService.getSessionOverview),
  performance: wrap(dashboardService.getPerformance),
  geo: wrap(dashboardService.getGeo),
};
