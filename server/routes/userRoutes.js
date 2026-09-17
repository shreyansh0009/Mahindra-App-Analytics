const { Router } = require('express');
const { dashboardLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/userController');

const router = Router();
router.use(dashboardLimiter);

// Specific routes before parameterised ones
router.get('/top', ctrl.getTopUsers);
router.get('/active', ctrl.getActiveUsers);
router.get('/stats', ctrl.getStats);
router.get('/demographics', ctrl.getDemographics);

router.get('/', ctrl.getUsers);
router.get('/:userId', ctrl.getUser);
router.get('/:userId/timeline', ctrl.getTimeline);
router.get('/:userId/sessions', ctrl.getSessions);

module.exports = router;
