const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

/**
 * Runs after express-validator chains. Collects errors and short-circuits
 * the request before it reaches the controller.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => `${e.path}: ${e.msg}`)
      .join('; ');
    return next(ApiError.badRequest(message, 'VALIDATION_ERROR'));
  }
  next();
};

module.exports = validate;
