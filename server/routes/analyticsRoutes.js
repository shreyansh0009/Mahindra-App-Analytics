const { Router } = require('express');
const { dashboardLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/analyticsController');

const router = Router();
router.use(dashboardLimiter);

router.get('/retention', ctrl.getRetention);
router.get('/usage', ctrl.getUsage);
router.get('/engagement', ctrl.getEngagement);

module.exports = router;
