const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const env = require('./config/env');
const connectDB = require('./database/connection');
const { ensureAdminSeed } = require('./services/authService');
const logger = require('./utils/logger');
const responseFormatter = require('./middleware/responseFormatter');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes/index');

const app = express();

// nginx terminates TLS in front of the app, so req.ip is the proxy's address
// unless the hop is trusted. Rate limiting and request logs both key off it.
// One hop only — a blanket `true` would let a client forge X-Forwarded-For.
app.set('trust proxy', 1);

// ── CORS debug ───────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[CORS-DEBUG] ${req.method} ${req.path} | Origin: ${req.headers.origin}`);
  next();
});

// ── CORS — must run before everything including helmet ────────────────────────
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use((req, res, next) => {
  console.log(`[CORS-DEBUG] After cors middleware | Access-Control-Allow-Origin: ${res.getHeader('Access-Control-Allow-Origin')}`);
  next();
});

// ── Security & transport ──────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    // CSP disabled — configure per-domain when needed (fonts, CDNs, etc.)
    contentSecurityPolicy: false,
  })
);
app.use(compression());

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../client/dist')));

// ── Logging ───────────────────────────────────────────────────────────────────
if (env.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// ── Response helpers ─────────────────────────────────────────────────────────
app.use(responseFormatter);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// ── SPA fallback — serve React app for all non-API routes ───────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Boot ──────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  await ensureAdminSeed();
  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

start();

module.exports = app;
