require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const env = require('../config/env');
const User = require('../models/User');
const Session = require('../models/Session');
const Event = require('../models/Event');
const ScreenVisit = require('../models/ScreenVisit');
const AnalyticsSummary = require('../models/AnalyticsSummary');
const { ROLES } = require('../data/roleTaxonomy');

// Headcount skew across the app's 13 roles, in ROLES order: field staff
// (Salesman) dominate, management and specialist roles are much thinner.
const ROLE_WEIGHTS = [0.10, 0.02, 0.05, 0.03, 0.06, 0.04, 0.14, 0.32, 0.08, 0.06, 0.03, 0.04, 0.03];

// ── Config ────────────────────────────────────────────────────────────────────
const DAYS = 30;
const TOTAL_USERS = 300;
// User-classification distribution — must sum to TOTAL_USERS.
const CATEGORY_COUNTS = { frequent: 80, occasional: 120, low: 60, none: 40 };
const SESSIONS_PER_DAY_RANGE = [100, 220];
const EVENTS_PER_SESSION_RANGE = [4, 18];

const PLATFORMS = ['ios', 'android', 'web'];
const PLATFORM_WEIGHTS = [0.35, 0.50, 0.15];

const SCREENS = [
  'HomeScreen', 'DashboardScreen', 'ProfileScreen', 'SettingsScreen',
  'NotificationsScreen', 'MapScreen', 'CropDetailsScreen', 'WeatherScreen',
  'MarketPricesScreen', 'SoilAnalysisScreen', 'FarmCalendarScreen', 'HelpScreen',
];

const EVENT_NAMES = {
  app_open:      ['app_open'],
  app_close:     ['app_close'],
  login:         ['user_login', 'auto_login'],
  logout:        ['user_logout'],
  screen_view:   SCREENS.map((s) => `view_${s}`),
  screen_exit:   SCREENS.map((s) => `exit_${s}`),
  button_click:  ['tap_submit', 'tap_refresh', 'tap_filter', 'tap_export', 'tap_share', 'tap_save'],
  navigation:    ['nav_back', 'nav_drawer_open', 'nav_tab_switch'],
  api_call:      ['fetch_weather', 'fetch_market_prices', 'fetch_soil_data', 'sync_farm_data'],
  error:         ['network_error', 'api_timeout', 'parse_error'],
  custom:        ['crop_added', 'field_updated', 'alert_dismissed', 'report_generated'],
};

const APP_VERSIONS  = ['1.0.0', '1.1.0', '1.2.0', '1.2.1', '1.3.0'];
const OS_VERSIONS   = { ios: ['16.0', '16.5', '17.0', '17.4'], android: ['12', '13', '14'], web: ['Chrome/124', 'Safari/17', 'Firefox/125'] };
const DEVICE_MODELS = { ios: ['iPhone 13', 'iPhone 14', 'iPhone 15', 'iPad Air'], android: ['Samsung Galaxy S23', 'OnePlus 11', 'Pixel 7', 'Redmi Note 12'], web: ['Desktop', 'Desktop', 'Mobile'] };
const NETWORK_TYPES = ['wifi', 'cellular', 'wifi', 'wifi', 'cellular'];
const LOCATIONS = [
  { country: 'India', city: 'Pune',      lat: 18.52, lng: 73.85 },
  { country: 'India', city: 'Nashik',    lat: 19.99, lng: 73.78 },
  { country: 'India', city: 'Nagpur',    lat: 21.14, lng: 79.08 },
  { country: 'India', city: 'Aurangabad',lat: 19.87, lng: 75.34 },
  { country: 'India', city: 'Mumbai',    lat: 19.07, lng: 72.87 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const rand      = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick      = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickW     = (arr, weights) => {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < arr.length; i++) {
    cum += weights[i];
    if (r <= cum) return arr[i];
  }
  return arr[arr.length - 1];
};
// UTC-normalized so seeded day boundaries line up with dashboardService's UTC-based
// date filters, regardless of the seeding machine's local timezone.
const daysAgo   = (n) => dayjs.utc().subtract(n, 'day').startOf('day').toDate();
const midnight  = (d) => dayjs.utc(d).startOf('day').toDate();
const addMs     = (d, ms) => new Date(d.getTime() + ms);

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Session.deleteMany({}),
    Event.deleteMany({}),
    ScreenVisit.deleteMany({}),
    AnalyticsSummary.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ── 1. Users ────────────────────────────────────────────────────────────────
  const users = [];
  const firstNames = ['Arjun', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Anjali', 'Rohan', 'Pooja', 'Sanjay', 'Divya'];
  const lastNames  = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Yadav', 'Gupta', 'Joshi', 'Desai', 'Nair', 'Mehta'];

  const GENDERS = ['male', 'female', 'other'];
  const GENDER_WEIGHTS = [0.55, 0.41, 0.04];
  const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55+'];
  const AGE_WEIGHTS = [0.26, 0.37, 0.20, 0.11, 0.06];

  // Build a flat category label per user (80 frequent / 120 occasional / 60
  // low / 40 none), then shuffle so it's not correlated with insertion order.
  const categoryPool = [
    ...Array(CATEGORY_COUNTS.frequent).fill('frequent'),
    ...Array(CATEGORY_COUNTS.occasional).fill('occasional'),
    ...Array(CATEGORY_COUNTS.low).fill('low'),
    ...Array(CATEGORY_COUNTS.none).fill('none'),
  ];
  for (let i = categoryPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [categoryPool[i], categoryPool[j]] = [categoryPool[j], categoryPool[i]];
  }

  // loginDays range per category, and total-logins multiplier.
  const loginDaysFor = (category) => {
    if (category === 'frequent') return rand(21, 30);
    if (category === 'occasional') return rand(5, 19);
    if (category === 'low') return rand(1, 4);
    return 0;
  };

  let starIdCounter = 100001;

  for (let i = 0; i < TOTAL_USERS; i++) {
    const platform = pickW(PLATFORMS, PLATFORM_WEIGHTS);
    const firstSeen = daysAgo(rand(1, DAYS));
    const category = categoryPool[i];
    const loginDays = loginDaysFor(category);
    const totalLogins = loginDays === 0 ? 0 : loginDays * rand(1, 3);
    const lastLoginAt = loginDays === 0 ? null : daysAgo(rand(0, Math.min(loginDays, DAYS - 1)));

    users.push({
      userId:          `user_${uuidv4().slice(0, 8)}`,
      name:            `${pick(firstNames)} ${pick(lastNames)}`,
      email:           `user${i + 1}@mahindrafarms.in`,
      platform,
      gender:          pickW(GENDERS, GENDER_WEIGHTS),
      ageGroup:        pickW(AGE_GROUPS, AGE_WEIGHTS),
      country:         pick(LOCATIONS).country,
      firstSeenAt:     firstSeen,
      lastActiveAt:    lastLoginAt || daysAgo(rand(15, DAYS)),
      totalSessions:   0,
      totalEvents:     0,
      totalScreenViews:0,
      totalTimeSpent:  0,
      isActive:        category !== 'none',

      designation:     pickW(ROLES, ROLE_WEIGHTS),
      mobile:          `9${rand(100000000, 999999999)}`,
      doj:             daysAgo(rand(60, 1800)),
      starId:          `STAR${starIdCounter++}`,
      loginDays,
      totalLogins,
      lastLoginAt,
    });
  }
  await User.insertMany(users);
  console.log(`Inserted ${users.length} users`);

  // ── 2. Sessions, Events, ScreenVisits ────────────────────────────────────────
  const allSessions    = [];
  const allEvents      = [];
  const allScreenVisits = [];

  // Track per-user lifetime stats
  const userStats = {};
  users.forEach((u) => { userStats[u.userId] = { sessions: 0, events: 0, screens: 0, time: 0 }; });

  for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
    const dayStart = daysAgo(dayOffset);
    const sessionCount = rand(...SESSIONS_PER_DAY_RANGE);

    for (let s = 0; s < sessionCount; s++) {
      const user      = pick(users);
      const platform  = user.platform;
      const sessionStart = addMs(dayStart, rand(0, 86_400_000 - 1));
      const duration  = rand(60_000, 900_000); // 1–15 min
      const sessionEnd = addMs(sessionStart, duration);
      const sessionId = `sess_${uuidv4().slice(0, 12)}`;

      const screensThisSession = [];
      const eventCount = rand(...EVENTS_PER_SESSION_RANGE);
      let cursor = sessionStart.getTime() + 1000;

      // Build events for this session
      const sessionEvents = [];

      // Always start with app_open
      sessionEvents.push({
        eventId:   `evt_${uuidv4().slice(0, 12)}`,
        sessionId,
        userId:    user.userId,
        eventType: 'app_open',
        eventName: 'app_open',
        timestamp: new Date(cursor),
        properties: { source: pick(['push_notification', 'direct', 'deeplink']) },
      });
      cursor += rand(500, 3000);

      // Middle events
      for (let e = 1; e < eventCount - 1; e++) {
        const eventType = pick(Object.keys(EVENT_NAMES));
        const eventName = pick(EVENT_NAMES[eventType]);
        const ts        = new Date(cursor);
        const evDuration = eventType === 'screen_view' ? rand(5000, 120_000) : undefined;

        const ev = {
          eventId:   `evt_${uuidv4().slice(0, 12)}`,
          sessionId,
          userId:    user.userId,
          eventType,
          eventName,
          timestamp: ts,
          properties: {},
        };

        if (evDuration)           ev.duration     = evDuration;
        if (eventType === 'error') ev.errorMessage = pick(['Connection timeout', 'Server error 500', 'Parse failed', 'Auth expired']);
        if (eventType === 'api_call') {
          ev.apiEndpoint = `/${eventName.replace('fetch_', '').replace('sync_', '')}`;
          ev.statusCode  = Math.random() > 0.1 ? 200 : pick([400, 500, 503]);
        }

        if (eventType === 'screen_view') {
          const screen = pick(SCREENS);
          ev.screenName = screen;
          if (!screensThisSession.includes(screen)) screensThisSession.push(screen);

          const exitTime = addMs(ts, evDuration);
          allScreenVisits.push({
            sessionId,
            userId:     user.userId,
            screenName: screen,
            entryTime:  ts,
            exitTime,
            duration:   evDuration,
            date:       midnight(ts),
          });
        }

        sessionEvents.push(ev);
        cursor += rand(1000, evDuration || 10_000);
      }

      // Always end with app_close
      sessionEvents.push({
        eventId:   `evt_${uuidv4().slice(0, 12)}`,
        sessionId,
        userId:    user.userId,
        eventType: 'app_close',
        eventName: 'app_close',
        timestamp: sessionEnd,
        properties: {},
      });

      allEvents.push(...sessionEvents);

      const osVersions  = OS_VERSIONS[platform];
      const deviceModels = DEVICE_MODELS[platform];

      allSessions.push({
        sessionId,
        userId:        user.userId,
        startTime:     sessionStart,
        endTime:       sessionEnd,
        duration,
        platform,
        appVersion:    pick(APP_VERSIONS),
        osVersion:     pick(osVersions),
        deviceModel:   pick(deviceModels),
        networkType:   pick(NETWORK_TYPES),
        location:      pick(LOCATIONS),
        isActive:      false,
        eventCount:    sessionEvents.length,
        screensVisited: screensThisSession,
      });

      // Accumulate user stats
      const stats = userStats[user.userId];
      stats.sessions += 1;
      stats.events   += sessionEvents.length;
      stats.screens  += screensThisSession.length;
      stats.time     += duration;
    }
  }

  // Batch insert
  const BATCH = 500;
  for (let i = 0; i < allSessions.length; i += BATCH) {
    await Session.insertMany(allSessions.slice(i, i + BATCH));
  }
  console.log(`Inserted ${allSessions.length} sessions`);

  for (let i = 0; i < allEvents.length; i += BATCH) {
    await Event.insertMany(allEvents.slice(i, i + BATCH));
  }
  console.log(`Inserted ${allEvents.length} events`);

  for (let i = 0; i < allScreenVisits.length; i += BATCH) {
    await ScreenVisit.insertMany(allScreenVisits.slice(i, i + BATCH));
  }
  console.log(`Inserted ${allScreenVisits.length} screen visits`);

  // ── 3. Update user lifetime stats ────────────────────────────────────────────
  const bulkOps = users.map((u) => ({
    updateOne: {
      filter: { userId: u.userId },
      update: {
        $set: {
          totalSessions:    userStats[u.userId].sessions,
          totalEvents:      userStats[u.userId].events,
          totalScreenViews: userStats[u.userId].screens,
          totalTimeSpent:   userStats[u.userId].time,
        },
      },
    },
  }));
  await User.bulkWrite(bulkOps);
  console.log('Updated user lifetime stats');

  // ── 4. AnalyticsSummaries (daily, last 30 days) ───────────────────────────
  const summaries = [];
  for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
    const date = midnight(daysAgo(dayOffset));

    // Compute from seeded sessions for this day
    const daySessions = allSessions.filter((s) => {
      const d = midnight(s.startTime);
      return d.getTime() === date.getTime();
    });

    const dauSet = new Set(daySessions.map((s) => s.userId));
    const newUserSet = new Set(
      users.filter((u) => midnight(u.firstSeenAt).getTime() === date.getTime()).map((u) => u.userId)
    );
    const totalDuration = daySessions.reduce((sum, s) => sum + s.duration, 0);
    const avgSessionDuration = daySessions.length ? Math.round(totalDuration / daySessions.length) : 0;

    const platformBreakdown = { ios: 0, android: 0, web: 0 };
    daySessions.forEach((s) => { platformBreakdown[s.platform] = (platformBreakdown[s.platform] || 0) + 1; });

    // Top screens for the day
    const screenCounts = {};
    allScreenVisits
      .filter((sv) => midnight(sv.date).getTime() === date.getTime())
      .forEach((sv) => {
        if (!screenCounts[sv.screenName]) screenCounts[sv.screenName] = { visits: 0, totalDuration: 0 };
        screenCounts[sv.screenName].visits++;
        screenCounts[sv.screenName].totalDuration += sv.duration;
      });
    const topScreens = Object.entries(screenCounts)
      .sort((a, b) => b[1].visits - a[1].visits)
      .slice(0, 5)
      .map(([screenName, d]) => ({
        screenName,
        visits: d.visits,
        avgDuration: Math.round(d.totalDuration / d.visits),
      }));

    // Event distribution for the day
    const daySessionIds = new Set(daySessions.map((s) => s.sessionId));
    const evTypeCounts = {};
    allEvents
      .filter((e) => daySessionIds.has(e.sessionId))
      .forEach((e) => { evTypeCounts[e.eventType] = (evTypeCounts[e.eventType] || 0) + 1; });
    const eventDistribution = Object.entries(evTypeCounts).map(([eventType, count]) => ({ eventType, count }));

    const totalEventsDay = Object.values(evTypeCounts).reduce((a, b) => a + b, 0);

    summaries.push({
      date,
      granularity:       'day',
      dau:               dauSet.size,
      newUsers:          newUserSet.size,
      totalSessions:     daySessions.length,
      totalEvents:       totalEventsDay,
      avgSessionDuration,
      topScreens,
      eventDistribution,
      platformBreakdown,
      retentionRate:     rand(30, 75),
    });
  }

  await AnalyticsSummary.insertMany(summaries);
  console.log(`Inserted ${summaries.length} analytics summaries`);

  // ── 5. Live traffic (last 5 minutes) — powers the Real-time page ──────────────
  const liveSessions = [];
  const liveEvents = [];
  const liveScreenVisits = [];
  const liveUsers = [];
  const nowMs = Date.now();
  const LIVE_SESSION_COUNT = 18;

  for (let s = 0; s < LIVE_SESSION_COUNT; s++) {
    const user = pick(users);
    const platform = user.platform;
    const startMs = nowMs - rand(5000, 290_000); // within last ~5 min
    const sessionId = `sess_live_${uuidv4().slice(0, 10)}`;
    const screensThisSession = [];
    const sessionEvents = [];
    let cursor = startMs;

    sessionEvents.push({
      eventId: `evt_${uuidv4().slice(0, 12)}`,
      sessionId,
      userId: user.userId,
      eventType: 'app_open',
      eventName: 'app_open',
      timestamp: new Date(cursor),
      properties: {},
    });

    const liveEventCount = rand(3, 8);
    for (let e = 1; e < liveEventCount; e++) {
      cursor = Math.min(nowMs, cursor + rand(2000, 40_000));
      const screen = pick(SCREENS);
      const evType = pick(['screen_view', 'button_click', 'screen_view', 'api_call', 'custom']);
      const ev = {
        eventId: `evt_${uuidv4().slice(0, 12)}`,
        sessionId,
        userId: user.userId,
        eventType: evType,
        eventName: pick(EVENT_NAMES[evType]),
        timestamp: new Date(cursor),
        properties: {},
      };
      if (evType === 'screen_view') {
        ev.screenName = screen;
        ev.duration = rand(4000, 60_000);
        if (!screensThisSession.includes(screen)) screensThisSession.push(screen);
        liveScreenVisits.push({
          sessionId,
          userId: user.userId,
          screenName: screen,
          entryTime: new Date(cursor),
          duration: ev.duration,
          date: midnight(new Date(cursor)),
        });
      }
      sessionEvents.push(ev);
    }

    liveEvents.push(...sessionEvents);
    liveSessions.push({
      sessionId,
      userId: user.userId,
      startTime: new Date(startMs),
      duration: 0,
      platform,
      appVersion: pick(APP_VERSIONS),
      osVersion: pick(OS_VERSIONS[platform]),
      deviceModel: pick(DEVICE_MODELS[platform]),
      networkType: pick(NETWORK_TYPES),
      location: pick(LOCATIONS),
      isActive: true,
      eventCount: sessionEvents.length,
      screensVisited: screensThisSession,
    });
    liveUsers.push(user.userId);
  }

  await Session.insertMany(liveSessions);
  await Event.insertMany(liveEvents);
  await ScreenVisit.insertMany(liveScreenVisits);
  // Mark these users active "now" so DAU / realtime reflect live traffic.
  await User.updateMany({ userId: { $in: liveUsers } }, { $set: { lastActiveAt: new Date() } });
  console.log(`Inserted ${liveSessions.length} live sessions (${liveEvents.length} live events)`);

  console.log('\nSeed complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
