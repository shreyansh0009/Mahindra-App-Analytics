const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const router = Router();

// Public — mobile SDK write endpoints (no admin JWT)
router.use('/ingest',    require('./ingestRoutes'));

// Public — authentication
router.use('/auth',      require('./authRoutes'));

// Protected — every dashboard-facing endpoint requires a valid admin JWT
router.use('/dashboard', authenticate, require('./dashboardRoutes'));
router.use('/users',     authenticate, require('./userRoutes'));
router.use('/sessions',  authenticate, require('./sessionRoutes'));
router.use('/events',    authenticate, require('./eventRoutes'));
router.use('/screens',   authenticate, require('./screenRoutes'));
router.use('/analytics', authenticate, require('./analyticsRoutes'));
router.use('/reports',   authenticate, require('./reportRoutes'));

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date() } });
});

module.exports = router;
