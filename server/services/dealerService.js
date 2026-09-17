/**
 * Dealer & geography analytics — real aggregations over the dealership details
 * denormalised onto each user (see models/User.js `dealer`).
 *
 * The geography here is the *dealership's* billing address, not the user's
 * location: the app has no user location and never will. Every figure below is
 * therefore "users attached to a dealership in <place>", which is what the
 * client's Zone/State/Dealer ask actually resolves to once AO and TM are
 * dropped. Zone is absent from the source data and is not synthesised.
 */
const User = require('../models/User');
const { buildRoleMatch } = require('../data/roleTaxonomy');
const { buildDealerMatch, DEALER_CATEGORY } = require('../data/dealerTaxonomy');
const { classify, CATEGORY_LABELS, categorySwitch, buildScopeMatch } = require('./roleService');
const { getPagination, buildMeta } = require('../utils/pagination');

const round = (n, d = 0) => {
  const f = 10 ** d;
  return Math.round((n || 0) * f) / f;
};

// Per-group classification tallies, shared by the dealer and geography rollups.
const CLASSIFICATION_ACCUMULATORS = {
  frequent: { $sum: { $cond: [{ $gt: ['$loginDays', 20] }, 1, 0] } },
  occasional: { $sum: { $cond: [{ $and: [{ $gte: ['$loginDays', 5] }, { $lte: ['$loginDays', 20] }] }, 1, 0] } },
  low: { $sum: { $cond: [{ $and: [{ $gte: ['$loginDays', 1] }, { $lt: ['$loginDays', 5] }] }, 1, 0] } },
  none: { $sum: { $cond: [{ $eq: ['$loginDays', 0] }, 1, 0] } },
};

// ── Filters ────────────────────────────────────────────────────────────────
/**
 * Read from the collection rather than a hardcoded list. Dealerships are an
 * open set, so the only honest filter list is the one the data actually
 * contains — and a dropdown built this way can never offer an option that
 * returns nothing.
 */
const getFilterOptions = async () => {
  // Scoped to dealerships, matching what the reports themselves count — a
  // dropdown must not offer a state that the page will then report as empty.
  const scope = { 'dealer.category': DEALER_CATEGORY };
  const [states, cities, categories, dealers] = await Promise.all([
    User.distinct('dealer.state', { ...scope, 'dealer.state': { $ne: null } }),
    User.distinct('dealer.city', { ...scope, 'dealer.city': { $ne: null } }),
    User.distinct('dealer.category', { 'dealer.category': { $ne: null } }),
    User.aggregate([
      { $match: { ...scope, 'dealer.key': { $ne: null } } },
      { $group: { _id: '$dealer.key', name: { $first: '$dealer.name' }, state: { $first: '$dealer.state' } } },
      { $sort: { name: 1 } },
      { $limit: 2000 },
    ]),
  ]);

  return {
    states: states.filter(Boolean).sort(),
    cities: cities.filter(Boolean).sort(),
    dealerCategories: categories.filter(Boolean).sort(),
    dealers: dealers.map((d) => ({ id: d._id, name: d.name || d._id, state: d.state })),
    userCategories: Object.keys(CATEGORY_LABELS).map((key) => ({ key, label: CATEGORY_LABELS[key] })),
  };
};

/**
 * Role + dealership + category + date + search, combined.
 *
 * Scoped to actual dealerships. The app sends DealerCategory__c only when it
 * equals DEALER and '' for every other account type, yet it sends that account's
 * billing address either way — so without this, a franchise or distributor
 * address would be counted as dealer geography. `includeAllCategories=true`
 * lifts the scope for ad-hoc queries; the dashboard never sets it.
 */
const buildMatch = (query = {}) => {
  const match = { ...buildScopeMatch(query), ...buildDealerMatch(query) };
  if (query.includeAllCategories !== 'true' && !query.dealerCategory) {
    match['dealer.category'] = DEALER_CATEGORY;
  }
  return match;
};

// ── Headline cards ─────────────────────────────────────────────────────────
const getDealerSummary = async (query = {}) => {
  const match = buildMatch(query);

  const [scoped, orgTotal] = await Promise.all([
    User.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          avgTimeSpent: { $avg: '$totalTimeSpent' },
          totalLogins: { $sum: '$totalLogins' },
          dealers: { $addToSet: '$dealer.key' },
          states: { $addToSet: '$dealer.state' },
          cities: { $addToSet: '$dealer.city' },
          ...CLASSIFICATION_ACCUMULATORS,
        },
      },
    ]),
    User.countDocuments({}),
  ]);

  const s = scoped[0];
  const nonNull = (arr) => (arr || []).filter(Boolean).length;

  return {
    data: {
      totalUsers: s ? s.totalUsers : 0,
      // The whole user base, so the page can state its own coverage rather than
      // letting a handful of dealerships read as the entire network.
      orgTotalUsers: orgTotal,
      percentageOfUsers: orgTotal && s ? round((s.totalUsers / orgTotal) * 100, 1) : 0,
      activeUsers: s ? s.activeUsers : 0,
      avgTimeSpent: s ? Math.round(s.avgTimeSpent || 0) : 0,
      totalLogins: s ? s.totalLogins : 0,
      totalDealers: s ? nonNull(s.dealers) : 0,
      totalStates: s ? nonNull(s.states) : 0,
      totalCities: s ? nonNull(s.cities) : 0,
      classification: {
        frequent: s ? s.frequent : 0,
        occasional: s ? s.occasional : 0,
        low: s ? s.low : 0,
        none: s ? s.none : 0,
      },
    },
  };
};

// Shared rollup for "group users by one dealership dimension".
const rollup = async (query, groupId, labelFields = {}) => {
  const match = buildMatch(query);

  const rows = await User.aggregate([
    { $match: match },
    {
      $group: {
        _id: groupId,
        ...Object.fromEntries(Object.entries(labelFields).map(([k, v]) => [k, { $first: v }])),
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
        avgTimeSpent: { $avg: '$totalTimeSpent' },
        avgLoginDays: { $avg: '$loginDays' },
        totalLogins: { $sum: '$totalLogins' },
        ...CLASSIFICATION_ACCUMULATORS,
      },
    },
    { $sort: { totalUsers: -1 } },
  ]);

  const grandTotal = rows.reduce((a, r) => a + r.totalUsers, 0) || 1;

  // A null group is a user whose profile carried no dealership yet. Shown as
  // "Unassigned" rather than dropped, so row counts still reconcile with the
  // user total and the reporting gap stays visible instead of quietly closing.
  return rows.map((r) => ({
    id: r._id || null,
    name: r.name || r._id || 'Unassigned',
    ...Object.fromEntries(Object.keys(labelFields).filter((k) => k !== 'name').map((k) => [k, r[k]])),
    totalUsers: r.totalUsers,
    percentageOfUsers: round((r.totalUsers / grandTotal) * 100, 1),
    activeUsers: r.activeUsers,
    avgTimeSpent: Math.round(r.avgTimeSpent || 0),
    avgLoginDays: round(r.avgLoginDays || 0, 1),
    totalLogins: r.totalLogins,
    frequent: r.frequent,
    occasional: r.occasional,
    low: r.low,
    none: r.none,
  }));
};

const summarise = (rows, query) => {
  const { page, limit, skip } = getPagination(query);
  const tally = (k) => rows.reduce((a, r) => a + r[k], 0);

  return {
    data: {
      summary: {
        groups: rows.length,
        totalUsers: tally('totalUsers'),
        activeUsers: tally('activeUsers'),
        totalLogins: tally('totalLogins'),
      },
      charts: {
        totalUsers: rows.slice(0, 12).map((r) => ({ name: r.name, value: r.totalUsers })),
        share: rows.slice(0, 8).map((r) => ({ name: r.name, value: r.totalUsers })),
        classification: [
          { name: 'Frequent', value: tally('frequent') },
          { name: 'Occasional', value: tally('occasional') },
          { name: 'Low', value: tally('low') },
          { name: 'No Login', value: tally('none') },
        ],
      },
      rows: rows.slice(skip, skip + limit),
    },
    meta: buildMeta(page, limit, rows.length),
  };
};

// ── One row per dealership ──────────────────────────────────────────────────
const getDealerAnalytics = async (query = {}) => {
  const rows = await rollup(query, '$dealer.key', {
    name: '$dealer.name',
    category: '$dealer.category',
    state: '$dealer.state',
    city: '$dealer.city',
  });
  return summarise(rows, query);
};

// ── One row per state or city ───────────────────────────────────────────────
const getGeographyAnalytics = async (query = {}) => {
  const dimension = query.dimension === 'city' ? 'city' : 'state';
  const rows = await rollup(query, `$dealer.${dimension}`);
  const result = summarise(rows, query);
  result.data.dimension = dimension;
  return result;
};

module.exports = {
  getFilterOptions,
  getDealerSummary,
  getDealerAnalytics,
  getGeographyAnalytics,
  classify,
};
