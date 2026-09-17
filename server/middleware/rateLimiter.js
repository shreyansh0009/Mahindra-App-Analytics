const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const env = require('../config/env');

/**
 * Ingest traffic reaches us through nginx, so every mobile device shares one
 * source address as far as the limiter is concerned — the whole fleet was
 * spending a single per-IP budget and tripping RATE_LIMIT_EXCEEDED. Carrier NAT
 * would collapse them onto shared addresses even with the proxy trusted, so the
 * bucket is keyed by the user the payload names and only falls back to the
 * address when there is no userId to key on.
 *
 * /ingest/events carries its userId inside each event rather than at the top
 * level; the batch is one device's, so the first entry identifies the whole
 * request. This runs before validation, so treat every field as unverified.
 */
const ingestKey = (req, res) => {
  const body = req.body;
  if (body && typeof body === 'object') {
    const direct = body.userId;
    if (typeof direct === 'string' && direct.trim()) return `u:${direct.trim()}`;

    const first = Array.isArray(body.events) ? body.events[0] : null;
    const nested = first && first.userId;
    if (typeof nested === 'string' && nested.trim()) return `u:${nested.trim()}`;
  }
  return `ip:${ipKeyGenerator(req.ip)}`;
};

// Strict limiter for ingestion endpoints — mobile SDK calls these at high frequency
const ingestLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  keyGenerator: ingestKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please slow down' },
  },
});

// More relaxed limiter for dashboard read endpoints
const dashboardLimiter = rateLimit({
  windowMs: 60000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
  },
});

module.exports = { ingestLimiter, dashboardLimiter };
