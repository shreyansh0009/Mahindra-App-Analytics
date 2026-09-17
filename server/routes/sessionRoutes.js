const { Router } = require('express');
const { dashboardLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/sessionController');

const router = Router();
router.use(dashboardLimiter);

router.get('/stats', ctrl.getStats);
router.get('/hourly', ctrl.getHourly);
router.get('/trend', ctrl.getTrend);
router.get('/', ctrl.getSessions);
router.get('/:sessionId', ctrl.getSession);

module.exports = router;
