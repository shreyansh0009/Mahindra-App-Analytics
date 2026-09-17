const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const User = require('../models/User');
const Session = require('../models/Session');
const Event = require('../models/Event');
const ScreenVisit = require('../models/ScreenVisit');
const { normalizeEventIdentity } = require('../utils/eventName');
const { normalizeDealer } = require('../data/dealerTaxonomy');

/**
 * Upserts a user profile. Called by the mobile SDK on login / identify.
 */
const identifyUser = async (payload) => {
  const {
    userId, name, email, platform,
    designation, mobile, doj, starId,
  } = payload;

  // Set dealer field-by-field rather than as a whole object: a nested $set of
  // `dealer` would replace the stored subdocument, wiping fields this particular
  // call happened not to carry.
  const dealerFields = {};
  const normalizedDealer = normalizeDealer(payload);
  if (normalizedDealer) {
    Object.entries(normalizedDealer).forEach(([k, v]) => { dealerFields[`dealer.${k}`] = v; });
  }

  const user = await User.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...(name && { name }),
        ...(email && { email }),
        ...(platform && { platform }),
        ...(designation && { designation }),
        ...(mobile && { mobile }),
        ...(doj && { doj: new Date(doj) }),
        ...(starId && { starId }),
        ...dealerFields,
        lastActiveAt: new Date(),
      },
      $setOnInsert: { firstSeenAt: new Date() },
    },
    { upsert: true, new: true }
  );

  return user;
};

/**
 * Records a login instance. Increments totalLogins on every call; increments
 * loginDays only the first time a given UTC calendar day is seen, so the
 * frequent/occasional/low classification reflects distinct login days.
 */
const trackLogin = async (payload) => {
  const { userId, loginAt } = payload;
  const at = loginAt ? new Date(loginAt) : new Date();
  const dayStr = dayjs.utc(at).format('YYYY-MM-DD');

  // Single atomic pipeline update (Mongo 4.2+): reading lastLoginAt and then
  // writing in two round-trips would race under concurrent/retried calls for
  // the same user (both could see "not logged in today" and double-count
  // loginDays), so the same-day check has to happen server-side in one op.
  const updated = await User.findOneAndUpdate(
    { userId },
    [
      {
        $set: {
          totalLogins: { $add: [{ $ifNull: ['$totalLogins', 0] }, 1] },
          loginDays: {
            $cond: [
              { $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$lastLoginAt' } }, dayStr] },
              { $ifNull: ['$loginDays', 0] },
              { $add: [{ $ifNull: ['$loginDays', 0] }, 1] },
            ],
          },
          lastLoginAt: at,
          lastActiveAt: at,
          firstSeenAt: { $ifNull: ['$firstSeenAt', at] },
        },
      },
    ],
    { upsert: true, new: true, updatePipeline: true }
  );

  return { userId, loginDays: updated.loginDays, totalLogins: updated.totalLogins, lastLoginAt: updated.lastLoginAt };
};

/**
 * Creates a new session. If the sessionId already exists we return the existing one
 * (idempotent for retries from mobile clients).
 */
const startSession = async (payload) => {
  const {
    sessionId,
    userId,
    startTime,
    platform,
    appVersion,
    osVersion,
    deviceModel,
    networkType,
    location,
  } = payload;

  const existing = await Session.findOne({ sessionId });
  if (existing) return existing;

  const session = await Session.create({
    sessionId,
    userId,
    startTime: startTime ? new Date(startTime) : new Date(),
    platform,
    appVersion,
    osVersion,
    deviceModel,
    networkType,
    location,
    isActive: true,
  });

  // Ensure user exists (in case identify was not called first)
  await User.findOneAndUpdate(
    { userId },
    {
      $set: { lastActiveAt: new Date(), ...(platform && { platform }) },
      $inc: { totalSessions: 1 },
      $setOnInsert: { firstSeenAt: new Date() },
    },
    { upsert: true }
  );

  return session;
};

/**
 * Closes an active session and computes its duration.
 */
const endSession = async (payload) => {
  const { sessionId, userId, endTime } = payload;

  const session = await Session.findOne({ sessionId });
  if (!session) return null;

  const end = endTime ? new Date(endTime) : new Date();
  const duration = end - session.startTime;

  await Session.updateOne(
    { sessionId },
    { $set: { endTime: end, duration, isActive: false } }
  );

  await User.findOneAndUpdate(
    { userId },
    {
      $set: { lastActiveAt: end },
      $inc: { totalTimeSpent: duration },
    }
  );

  return { sessionId, duration };
};

/**
 * Batch-inserts up to 50 events. Uses ordered:false so partial batches
 * succeed even if some events are duplicates (duplicate eventId is skipped).
 */
const ingestEvents = async (events) => {
  const now = new Date();

  // Query strings are stripped from the event name here rather than at query
  // time — they made every call to the same endpoint a distinct name, which is
  // both wrong for grouping and the single largest consumer of storage.
  const docs = events.map((e) => ({
    eventId: e.eventId,
    sessionId: e.sessionId,
    userId: e.userId,
    eventType: e.eventType,
    ...normalizeEventIdentity({ eventName: e.eventName, apiEndpoint: e.apiEndpoint }),
    screenName: e.screenName || null,
    timestamp: e.timestamp ? new Date(e.timestamp) : now,
    properties: e.properties || {},
    duration: e.duration,
    errorMessage: e.errorMessage,
    statusCode: e.statusCode,
    metrics: e.metrics,
  }));

  let inserted = 0;
  let insertedDocs = [];
  try {
    const result = await Event.insertMany(docs, { ordered: false });
    insertedDocs = result;
    inserted = result.length;
  } catch (err) {
    // BulkWriteError: some succeeded, some were duplicates
    if (err.code === 11000 && err.insertedDocs) {
      insertedDocs = err.insertedDocs;
      inserted = err.insertedDocs.length;
    } else if (err.insertedCount != null) {
      inserted = err.insertedCount;
    } else {
      throw err;
    }
  }

  // Clients may report a login either through POST /ingest/login or as a plain
  // `login` event in this batch. Credit both so the login-derived metrics
  // (loginDays drives the user classification on Geography) don't silently stay
  // at zero for a client that only ever sends events. Only *inserted* docs
  // count: a retried batch is dropped by the eventId unique index and must not
  // increment the counters a second time.
  const loginEvents = insertedDocs
    .filter((d) => d.eventType === 'login' && d.userId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Sequential, not Promise.all: trackLogin decides whether to bump loginDays by
  // comparing against the lastLoginAt it just wrote, so concurrent calls for the
  // same user on the same day would each see the pre-batch value and double-count.
  for (const e of loginEvents) {
    await trackLogin({ userId: e.userId, loginAt: e.timestamp });
  }

  // Every counter below is derived from insertedDocs rather than the submitted
  // docs. Mobile clients retry batches on flaky networks; the eventId unique
  // index drops those duplicates from the events collection, but counting the
  // submitted payload re-incremented these totals on each retry and drifted them
  // permanently above the real event count.
  if (!insertedDocs.length) return { inserted, total: docs.length };

  // Update per-user counters
  const userGroups = insertedDocs.reduce((acc, e) => {
    acc[e.userId] = (acc[e.userId] || 0) + 1;
    return acc;
  }, {});

  await Promise.all(
    Object.entries(userGroups).map(([uid, count]) =>
      User.updateOne({ userId: uid }, { $inc: { totalEvents: count }, $set: { lastActiveAt: now } })
    )
  );

  // Update per-session eventCount and screensVisited
  const sessionGroups = insertedDocs.reduce((acc, e) => {
    if (!acc[e.sessionId]) acc[e.sessionId] = { count: 0, screens: new Set() };
    acc[e.sessionId].count += 1;
    if (e.screenName) acc[e.sessionId].screens.add(e.screenName);
    return acc;
  }, {});

  await Promise.all(
    Object.entries(sessionGroups).map(([sid, { count, screens }]) =>
      Session.updateOne(
        { sessionId: sid },
        {
          $inc: { eventCount: count },
          $addToSet: { screensVisited: { $each: [...screens] } },
        }
      )
    )
  );

  return { inserted, total: docs.length };
};

/**
 * Records a screen visit entry. Denormalized for fast screen analytics.
 */
const trackScreenVisit = async (payload) => {
  const { sessionId, userId, screenName, entryTime, exitTime, duration } = payload;

  const entry = entryTime ? new Date(entryTime) : new Date();
  const exit = exitTime ? new Date(exitTime) : null;
  const dur = duration ?? (exit ? exit - entry : 0);
  const dateOnly = dayjs.utc(entry).startOf('day').toDate();

  const visit = await ScreenVisit.create({
    sessionId,
    userId,
    screenName,
    entryTime: entry,
    exitTime: exit,
    duration: dur,
    date: dateOnly,
  });

  await User.updateOne({ userId }, { $inc: { totalScreenViews: 1 } });

  return visit;
};

module.exports = {
  identifyUser,
  trackLogin,
  startSession,
  endSession,
  ingestEvents,
  trackScreenVisit,
};
