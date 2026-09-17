const { body } = require('express-validator');
const { EVENT_TYPES } = require('../models/Event');
const { ROLES } = require('../data/roleTaxonomy');

const identifyRules = [
  body('userId').trim().notEmpty().withMessage('userId is required'),
  body('name').optional().trim(),
  body('email').optional().trim().isEmail().withMessage('Invalid email'),
  body('platform')
    .optional()
    .isIn(['ios', 'android', 'web'])
    .withMessage('platform must be ios | android | web'),
  // Role — the only organisational dimension the app reports. The app's
  // getUserRole() returns '' when no role flag matches, so an empty string is
  // accepted and simply not stored, rather than failing the whole call.
  body('designation')
    .optional({ values: 'falsy' })
    .isIn(ROLES)
    .withMessage(`designation must be one of: ${ROLES.join(', ')}`),
  body('mobile').optional().trim(),
  body('doj').optional().isISO8601().withMessage('doj must be ISO8601'),
  body('starId').optional().trim(),
  // Dealership — an object, validated only for shape. The individual fields are
  // open sets from Salesforce (dealer names, cities, categories), so there is
  // nothing to check them against; normalizeDealer() cleans and drops blanks.
  // Rejecting an unrecognised city here would only lose real data.
  // Dealership — accepted flat (the app's shape), nested under `dealer`, or
  // under the raw Salesforce key names. Shape-checked only: these are open sets
  // from Salesforce, so there is nothing to validate them against, and
  // rejecting an unrecognised city would only lose real data.
  body('dealer').optional({ values: 'falsy' }).isObject().withMessage('dealer must be an object'),
  body('accountName').optional({ values: 'falsy' }).trim(),
  body('dealerCategory').optional({ values: 'falsy' }).trim(),
  body('billingState').optional({ values: 'falsy' }).trim(),
  body('billingCity').optional({ values: 'falsy' }).trim(),
  body('billingPostalCode').optional({ values: 'falsy' }).trim(),
  body('billingStreet').optional({ values: 'falsy' }).trim(),
  body('billingCountry').optional({ values: 'falsy' }).trim(),
];

const loginRules = [
  body('userId').trim().notEmpty().withMessage('userId is required'),
  body('loginAt').optional().isISO8601().withMessage('loginAt must be ISO8601'),
];

const sessionStartRules = [
  body('sessionId').trim().notEmpty().withMessage('sessionId is required'),
  body('userId').trim().notEmpty().withMessage('userId is required'),
  body('startTime').optional().isISO8601().withMessage('startTime must be ISO8601'),
  body('platform').optional().isIn(['ios', 'android', 'web']),
  body('appVersion').optional().trim(),
  body('osVersion').optional().trim(),
  body('deviceModel').optional().trim(),
  body('networkType').optional().isIn(['wifi', 'cellular', 'offline', 'unknown']),
  body('location').optional().isObject(),
];

const sessionEndRules = [
  body('sessionId').trim().notEmpty().withMessage('sessionId is required'),
  body('userId').trim().notEmpty().withMessage('userId is required'),
  body('endTime').optional().isISO8601().withMessage('endTime must be ISO8601'),
];

const eventsRules = [
  body('events').isArray({ min: 1, max: 50 }).withMessage('events must be an array of 1–50 items'),
  body('events.*.eventId').trim().notEmpty().withMessage('each event.eventId is required'),
  body('events.*.sessionId').trim().notEmpty().withMessage('each event.sessionId is required'),
  body('events.*.userId').trim().notEmpty().withMessage('each event.userId is required'),
  body('events.*.eventType')
    .isIn(EVENT_TYPES)
    .withMessage(`eventType must be one of: ${EVENT_TYPES.join(', ')}`),
  body('events.*.eventName').trim().notEmpty().withMessage('each event.eventName is required'),
  body('events.*.timestamp')
    .optional()
    .isISO8601()
    .withMessage('timestamp must be ISO8601'),
  body('events.*.metrics').optional().isObject(),
  body('events.*.metrics.loadTimeMs').optional().isFloat({ min: 0 }),
  body('events.*.metrics.startupTimeMs').optional().isFloat({ min: 0 }),
  body('events.*.metrics.responseTimeMs').optional().isFloat({ min: 0 }),
];

const screenRules = [
  body('sessionId').trim().notEmpty().withMessage('sessionId is required'),
  body('userId').trim().notEmpty().withMessage('userId is required'),
  body('screenName').trim().notEmpty().withMessage('screenName is required'),
  body('entryTime').optional().isISO8601(),
  body('exitTime').optional().isISO8601(),
  body('duration').optional().isInt({ min: 0 }),
];

module.exports = {
  identifyRules,
  loginRules,
  sessionStartRules,
  sessionEndRules,
  eventsRules,
  screenRules,
};
