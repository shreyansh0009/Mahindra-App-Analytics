const { Router } = require('express');
const { dashboardLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/eventController');

const router = Router();
router.use(dashboardLimiter);

router.get('/distribution', ctrl.getDistribution);
router.get('/top', ctrl.getTopEvents);
router.get('/stats', ctrl.getStats);
router.get('/trend', ctrl.getTrend);
router.get('/summary', ctrl.getSummary);
router.get('/', ctrl.getEvents);

module.exports = router;
