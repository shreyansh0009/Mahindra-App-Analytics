const { Router } = require('express');
const { dashboardLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/reportController');

const router = Router();
router.use(dashboardLimiter);

router.get('/daily', ctrl.daily);
router.get('/weekly', ctrl.weekly);
router.get('/monthly', ctrl.monthly);

module.exports = router;
