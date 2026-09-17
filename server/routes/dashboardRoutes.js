const { Router } = require('express');
const { dashboardLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/dashboardController');
const usage = require('../controllers/usageController');
const role = require('../controllers/roleController');
const feature = require('../controllers/featureUsageController');
const dealer = require('../controllers/dealerController');

const router = Router();
router.use(dashboardLimiter);

// Usage analytics modules (screen / module / workflow / role)
router.get('/usage/filters', usage.filters);
router.get('/screen-usage', usage.screenUsage);
router.get('/module-usage', usage.moduleUsage);
router.get('/workflow-break', usage.workflowBreak);
router.get('/role-usage', usage.roleUsage);

// Role analytics — real User-collection aggregations. Replaces the former
// geography / dealer / TM endpoints, which sliced by a hierarchy the app does
// not report. See data/roleTaxonomy.js.
router.get('/role-analytics/filters', role.filters);
router.get('/role-analytics/summary', role.summary);
router.get('/role-analytics', role.analytics);
router.get('/role-analytics/users', role.userTable);
router.get('/user-classification', role.classification);
router.get('/export/users', role.exportUsers);

// Dealer & geography analytics — sliced by the dealership on each user profile
// and that dealership's billing address. AO and TM are not modelled: they do not
// exist in the source data. See data/dealerTaxonomy.js.
router.get('/dealer-analytics/filters', dealer.filters);
router.get('/dealer-analytics/summary', dealer.summary);
router.get('/dealer-analytics', dealer.analytics);
router.get('/geography', dealer.geography);

// Feature usage (synthetic, filter-reactive — see featureUsageService)
router.get('/feature-usage', feature.featureUsage);

router.get('/summary', ctrl.summary);
router.get('/graphs', ctrl.graphs);
router.get('/realtime', ctrl.realtime);
router.get('/devices', ctrl.devices);
router.get('/app-versions', ctrl.appVersions);
router.get('/funnel', ctrl.funnel);
router.get('/retention-curve', ctrl.retentionCurve);
router.get('/session-overview', ctrl.sessionOverview);
router.get('/performance', ctrl.performance);
router.get('/geo', ctrl.geo);

module.exports = router;
