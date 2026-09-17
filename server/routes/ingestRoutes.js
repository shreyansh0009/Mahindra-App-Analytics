const { Router } = require('express');
const { ingestLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const {
  identifyRules,
  loginRules,
  sessionStartRules,
  sessionEndRules,
  eventsRules,
  screenRules,
} = require('../validators/ingestValidator');
const ctrl = require('../controllers/ingestController');

const router = Router();

router.use(ingestLimiter);

router.post('/identify', identifyRules, validate, ctrl.identify);
router.post('/login', loginRules, validate, ctrl.login);
router.post('/session/start', sessionStartRules, validate, ctrl.sessionStart);
router.post('/session/end', sessionEndRules, validate, ctrl.sessionEnd);
router.post('/events', eventsRules, validate, ctrl.events);
router.post('/screen', screenRules, validate, ctrl.screenVisit);

module.exports = router;
