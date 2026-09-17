/**
 * Usage analytics service — Screen / Module / Workflow / Role usage.
 *
 * The org dimensions these reports slice by (zone, dealer, branch, role,
 * module, workflow) are not present on the live collections, so figures are
 * generated deterministically (see usageTaxonomy) and respond to the filter
 * bar + date range. Controllers stay thin; all shaping lives here.
 */
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const User = require('../models/User');
const Session = require('../models/Session');
const { ROLES: ROLE_LIST } = require('../data/roleTaxonomy');

const {
  MODULES,
  SCREENS,
  WORKFLOWS,
  rand,
  randInt,
  scaleFromQuery,
  filterKey,
  dayLabels,
  getFilterOptions,
} = require('../data/usageTaxonomy');

const { getPagination, buildMeta } = require('../utils/pagination');

// Users the app has not sent a role for yet.
const UNASSIGNED = 'Unassigned';

const round = (n, d = 0) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

// Generic paginate + search + sort over an in-memory row set.
const paginate = (rows, query, searchField) => {
  let out = rows;
  if (query.search) {
    const q = query.search.toLowerCase();
    out = out.filter((r) => String(r[searchField]).toLowerCase().includes(q));
  }
  if (query.sortBy && out.length && query.sortBy in out[0]) {
    const dir = query.order === 'asc' ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = a[query.sortBy];
      const bv = b[query.sortBy];
      if (typeof av === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }
  const { page, limit, skip } = getPagination(query);
  const total = out.length;
  return { rows: out.slice(skip, skip + limit), meta: buildMeta(page, limit, total) };
};

// Small stable spark/trend series for a given seed key.
const trendSeries = (key, points, base, variance) =>
  Array.from({ length: points }, (_, i) => round(base * (0.7 + rand(`${key}:${i}`) * variance)));

// ── Feature 1: Screen-wise usage ──────────────────────────────────────────
const getScreenUsage = (query = {}) => {
  const scale = scaleFromQuery(query);
  const fk = filterKey(query);

  const rows = SCREENS.map((screenName) => {
    const seed = `screen:${screenName}:${fk}`;
    const views = Math.round(randInt(`${seed}:v`, 900, 13000) * scale);
    const uniqueUsers = Math.round(views * (0.35 + rand(`${seed}:u`) * 0.4));
    const avgTime = randInt(`${seed}:t`, 8000, 145000); // ms
    const exitRate = round(15 + rand(`${seed}:e`) * 45, 1);
    const bounceRate = round(8 + rand(`${seed}:b`) * 32, 1);
    const revisitCount = Math.round(views * (0.12 + rand(`${seed}:r`) * 0.25));
    return {
      screenName,
      views,
      uniqueUsers,
      avgTime,
      exitRate,
      bounceRate,
      revisitCount,
      trend: trendSeries(`${seed}:tr`, 12, views / 12, 0.8),
    };
  });

  const totalViews = rows.reduce((a, r) => a + r.views, 0);
  const uniqueVisitors = rows.reduce((a, r) => a + r.uniqueUsers, 0);
  const avgTime = Math.round(rows.reduce((a, r) => a + r.avgTime, 0) / rows.length);
  const exitRate = round(rows.reduce((a, r) => a + r.exitRate, 0) / rows.length, 1);
  const bounceRate = round(rows.reduce((a, r) => a + r.bounceRate, 0) / rows.length, 1);
  const revisitCount = rows.reduce((a, r) => a + r.revisitCount, 0);

  const byViews = [...rows].sort((a, b) => b.views - a.views);
  const labels = dayLabels(query);
  const visitsTrend = labels.map((date, i) => ({
    date,
    views: Math.round((totalViews / labels.length) * (0.7 + rand(`svt:${fk}:${i}`) * 0.7)),
  }));

  const { rows: pageRows, meta } = paginate(rows, query, 'screenName');

  return {
    data: {
      summary: { totalViews, uniqueVisitors, avgTime, exitRate, bounceRate, revisitCount },
      charts: {
        topScreens: byViews.slice(0, 8).map((r) => ({ name: r.screenName, value: r.views })),
        leastScreens: byViews.slice(-5).reverse().map((r) => ({ name: r.screenName, value: r.views })),
        timeSpent: byViews.slice(0, 8).map((r) => ({ name: r.screenName, value: r.avgTime })),
        visitsTrend,
      },
      rows: pageRows,
    },
    meta,
  };
};

// ── Feature 2: Module-wise usage ──────────────────────────────────────────
const getModuleUsage = (query = {}) => {
  const scale = scaleFromQuery(query);
  const fk = filterKey(query);

  const rows = MODULES.map((module) => {
    const seed = `module:${module}:${fk}`;
    const usageCount = Math.round(randInt(`${seed}:c`, 1200, 18000) * scale);
    const users = Math.round(usageCount * (0.3 + rand(`${seed}:u`) * 0.4));
    const sessions = Math.round(usageCount * (0.5 + rand(`${seed}:s`) * 0.5));
    const avgTime = randInt(`${seed}:t`, 20000, 260000);
    const completionRate = round(29 + rand(`${seed}:r`) * 55, 1);
    return {
      module,
      usageCount,
      users,
      sessions,
      avgTime,
      completionRate,
      trend: trendSeries(`${seed}:tr`, 12, usageCount / 12, 0.8),
    };
  });

  const byUsage = [...rows].sort((a, b) => b.usageCount - a.usageCount);
  const labels = dayLabels(query);
  const usageTrend = labels.map((date, i) => {
    const point = { date };
    byUsage.slice(0, 4).forEach((r) => {
      point[r.module] = Math.round((r.usageCount / labels.length) * (0.7 + rand(`mut:${r.module}:${i}`) * 0.7));
    });
    return point;
  });

  const { rows: pageRows, meta } = paginate(rows, query, 'module');

  return {
    data: {
      summary: {
        totalUsage: rows.reduce((a, r) => a + r.usageCount, 0),
        totalUsers: rows.reduce((a, r) => a + r.users, 0),
        avgTime: Math.round(rows.reduce((a, r) => a + r.avgTime, 0) / rows.length),
        avgCompletion: round(rows.reduce((a, r) => a + r.completionRate, 0) / rows.length, 1),
      },
      charts: {
        mostUsed: byUsage.slice(0, 8).map((r) => ({ name: r.module, value: r.usageCount })),
        distribution: byUsage.map((r) => ({ name: r.module, value: r.usageCount })),
        completion: byUsage.slice(0, 6).map((r) => ({ name: r.module, value: r.completionRate })),
        usageTrend,
        trendSeries: byUsage.slice(0, 4).map((r) => ({ key: r.module, label: r.module })),
      },
      rows: pageRows,
    },
    meta,
  };
};

// ── Feature 3: Workflow break usage ───────────────────────────────────────
const getWorkflowBreak = (query = {}) => {
  const scale = scaleFromQuery(query);
  const fk = filterKey(query);
  const selected = query.workflow
    ? WORKFLOWS.find((w) => w.name === query.workflow) || WORKFLOWS[0]
    : WORKFLOWS[0];

  // Per-workflow summary rows for the table.
  const rows = WORKFLOWS.map((w) => {
    const seed = `wf:${w.name}:${fk}`;
    const started = Math.round(randInt(`${seed}:s`, 1500, 6000) * scale) || 1;
    const completionRate = round(58 + rand(`${seed}:r`) * 38, 1);
    const completed = Math.round(started * (completionRate / 100));
    const broken = started - completed;
    const avgDuration = randInt(`${seed}:d`, 45000, 340000);
    return { workflow: w.name, started, completed, broken, completionRate, avgDuration };
  });

  // Funnel for the selected workflow — monotonically decreasing per step.
  const seed = `wf:${selected.name}:${fk}`;
  const top = Math.round(randInt(`${seed}:top`, 2000, 6000) * scale) || 1;
  let remaining = top;
  const funnel = selected.steps.map((step, i) => {
    if (i > 0) {
      const dropPct = 0.06 + rand(`${seed}:drop:${i}`) * 0.18;
      remaining = Math.round(remaining * (1 - dropPct));
    }
    return { step, users: remaining, pct: round((remaining / top) * 100, 1) };
  });

  const funnelWithDrop = funnel.map((f, i) => ({
    ...f,
    dropOff: i === 0 ? 0 : funnel[i - 1].users - f.users,
    dropOffPct: i === 0 ? 0 : round(((funnel[i - 1].users - f.users) / funnel[i - 1].users) * 100, 1),
  }));

  const completedUsers = funnel[funnel.length - 1].users;
  const labels = dayLabels(query);
  const trend = labels.map((date, i) => ({
    date,
    dropOff: Math.round((top - completedUsers) / labels.length * (0.6 + rand(`wfd:${fk}:${i}`) * 0.8)),
    completion: round(55 + rand(`wfc:${fk}:${i}`) * 40, 1),
  }));

  const { rows: pageRows, meta } = paginate(rows, query, 'workflow');

  return {
    data: {
      selectedWorkflow: selected.name,
      workflows: WORKFLOWS.map((w) => w.name),
      summary: {
        started: top,
        completed: completedUsers,
        dropOff: top - completedUsers,
        dropOffRate: round(((top - completedUsers) / top) * 100, 1),
        completionRate: round((completedUsers / top) * 100, 1),
        avgCompletionTime: randInt(`${seed}:act`, 60000, 300000),
      },
      funnel: funnelWithDrop,
      trend,
      rows: pageRows,
    },
    meta,
  };
};

// ── Feature 4: User role-wise usage ───────────────────────────────────────
// Unlike the three modules above, this one is a real aggregation: `designation`
// is reported by the app and stored on User, and sessions carry a userId, so
// activity per role can be counted rather than synthesised.
const getRoleUsage = async (query = {}) => {
  const end = query.endDate ? dayjs.utc(query.endDate).endOf('day') : dayjs.utc().endOf('day');
  const start = query.startDate
    ? dayjs.utc(query.startDate).startOf('day')
    : end.clone().subtract(29, 'day').startOf('day');

  // User count is small (thousands), so resolving userId -> role in memory is
  // cheaper than a $lookup against sessions on every request.
  const userMatch = {};
  if (query.designation) userMatch.designation = query.designation;
  if (query.platform) userMatch.platform = query.platform;
  const users = await User.find(userMatch, { userId: 1, designation: 1 }).lean();
  const roleByUser = new Map(users.map((u) => [u.userId, u.designation || UNASSIGNED]));

  const sessions = await Session.aggregate([
    { $match: { startTime: { $gte: start.toDate(), $lte: end.toDate() }, userId: { $in: [...roleByUser.keys()] } } },
    {
      $group: {
        _id: { userId: '$userId', day: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } } },
        sessions: { $sum: 1 },
        duration: { $sum: { $ifNull: ['$duration', 0] } },
      },
    },
  ]);

  // One pass over (user, day) pairs fills every window at once.
  const dayCut = end.clone().subtract(0, 'day').format('YYYY-MM-DD');
  const weekCut = end.clone().subtract(6, 'day').format('YYYY-MM-DD');
  const monthCut = end.clone().subtract(29, 'day').format('YYYY-MM-DD');

  const byRole = new Map();
  const bucket = () => ({
    dayUsers: new Set(), weekUsers: new Set(), monthUsers: new Set(),
    sessions: 0, duration: 0, perDay: new Map(),
  });

  sessions.forEach((row) => {
    const role = roleByUser.get(row._id.userId) || UNASSIGNED;
    if (!byRole.has(role)) byRole.set(role, bucket());
    const b = byRole.get(role);
    const day = row._id.day;
    if (day === dayCut) b.dayUsers.add(row._id.userId);
    if (day >= weekCut) b.weekUsers.add(row._id.userId);
    if (day >= monthCut) b.monthUsers.add(row._id.userId);
    b.sessions += row.sessions;
    b.duration += row.duration;
    if (!b.perDay.has(day)) b.perDay.set(day, new Set());
    b.perDay.get(day).add(row._id.userId);
  });

  // Every known role appears even at zero, so a role with no activity reads as a
  // real finding rather than a missing row.
  const present = [...new Set([...ROLE_LIST, ...byRole.keys()])];
  const rows = present.map((role) => {
    const b = byRole.get(role) || bucket();
    const users = b.monthUsers.size || 0;
    return {
      role,
      daily: b.dayUsers.size,
      weekly: b.weekUsers.size,
      monthly: users,
      sessions: b.sessions,
      avgSession: b.sessions ? Math.round(b.duration / b.sessions) : 0,
      avgTime: users ? Math.round(b.duration / users) : 0,
      trend: [],
    };
  });

  const byMonthly = [...rows].sort((a, b) => b.monthly - a.monthly);
  // Default order is busiest-first; roles with no activity still appear, at the
  // end, so a role the app never reports stays visible as a zero row.
  rows.sort((a, b) => b.monthly - a.monthly);

  const days = Math.min(end.diff(start, 'day') + 1, 60);
  const trend = Array.from({ length: days }, (_, i) => {
    const date = start.clone().add(i, 'day').format('YYYY-MM-DD');
    const point = { date };
    rows.forEach((r) => {
      point[r.role] = byRole.get(r.role)?.perDay.get(date)?.size ?? 0;
    });
    return point;
  });

  const { rows: pageRows, meta } = paginate(rows, query, 'role');
  const activeRows = rows.filter((r) => r.monthly > 0);
  const avgOf = (key) => (activeRows.length
    ? Math.round(activeRows.reduce((a, r) => a + r[key], 0) / activeRows.length)
    : 0);

  return {
    data: {
      summary: {
        dau: rows.reduce((a, r) => a + r.daily, 0),
        wau: rows.reduce((a, r) => a + r.weekly, 0),
        mau: rows.reduce((a, r) => a + r.monthly, 0),
        sessions: rows.reduce((a, r) => a + r.sessions, 0),
        avgSession: avgOf('avgSession'),
        avgTime: avgOf('avgTime'),
      },
      charts: {
        dau: byMonthly.map((r) => ({ name: r.role, value: r.daily })),
        wau: byMonthly.map((r) => ({ name: r.role, value: r.weekly })),
        mau: byMonthly.map((r) => ({ name: r.role, value: r.monthly })),
        distribution: byMonthly.map((r) => ({ name: r.role, value: r.monthly })),
        trend,
        trendSeries: rows.map((r) => ({ key: r.role, label: r.role })),
      },
      rows: pageRows,
    },
    meta,
  };
};

module.exports = {
  getScreenUsage,
  getModuleUsage,
  getWorkflowBreak,
  getRoleUsage,
  getFilterOptions,
};
