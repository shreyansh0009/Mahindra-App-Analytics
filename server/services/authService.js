const Admin = require('../models/Admin');
const ApiError = require('../utils/apiError');
const { signToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Validate credentials and issue a JWT.
 */
const login = async (username, password) => {
  const admin = await Admin.findOne({ username: String(username).toLowerCase() }).select('+password');

  // Same error for unknown user and wrong password (avoid user enumeration)
  if (!admin || !(await admin.comparePassword(password))) {
    throw new ApiError(401, 'Invalid username or password');
  }

  const token = signToken({ id: admin._id, username: admin.username });
  return { token, user: { username: admin.username } };
};

/**
 * Return the current admin's public info.
 */
const getMe = async (id) => {
  const admin = await Admin.findById(id);
  if (!admin) throw new ApiError(401, 'Admin not found');
  return { username: admin.username };
};

/**
 * Create the single admin account on boot if it does not exist.
 * Idempotent — never creates duplicates.
 */
const ensureAdminSeed = async () => {
  const exists = await Admin.findOne({ username: env.ADMIN_USERNAME });
  if (exists) return;
  await Admin.create({ username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD });
  logger.info(`Seeded admin account: ${env.ADMIN_USERNAME}`);
};

module.exports = { login, getMe, ensureAdminSeed };
