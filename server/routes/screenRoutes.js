const { Router } = require('express');
const { dashboardLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/screenController');

const router = Router();
router.use(dashboardLimiter);

router.get('/analytics', ctrl.getAnalytics);
router.get('/top', ctrl.getTopScreens);
router.get('/:screenName/trend', ctrl.getScreenTrend);

module.exports = router;
