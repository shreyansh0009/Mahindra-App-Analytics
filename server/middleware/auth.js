const ApiError = require('../utils/apiError');
const { verifyToken } = require('../utils/jwt');

/**
 * Require a valid admin JWT in the Authorization header.
 * Attaches the decoded payload to req.admin.
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    const decoded = verifyToken(token);
    req.admin = { id: decoded.id, username: decoded.username };
    next();
  } catch (err) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

module.exports = { authenticate };
