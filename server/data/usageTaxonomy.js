/**
 * Shared taxonomy + deterministic dummy-data engine for the usage analytics
 * modules (screen / module / workflow / role usage).
 *
 * These analytics dimensions (zone, dealer, branch, role, module, workflow) do
 * not exist on the live collections, so — per the demo requirement — numbers are
 * synthesised deterministically from a seeded hash. That keeps values stable
 * across refreshes (so the demo doesn't "jump") while still responding to the
 * active filters and the selected date range.
 */

// ── Organisation hierarchy ────────────────────────────────────────────────

const { ROLES: ROLE_LIST } = require('./roleTaxonomy');


const MODULES = [
  'Dashboard',
  'Orders',
  'Customers',
  'Payments',
  'Reports',
  'Inventory',
  'Attendance',
  'Settings',
  'Profile',
  'Analytics',
];

const SCREENS = [
  'Dashboard',
  'Orders',
  'Order Details',
  'Customers',
  'Customer Profile',
  'Payments',
  'Payment History',
  'Reports',
  'Inventory',
  'Stock Entry',
  'Attendance',
  'Leaderboard',
  'Notifications',
  'Settings',
  'Profile',
];

const WORKFLOWS = [
  { name: 'Order Placement', steps: ['Login', 'Dashboard', 'Orders', 'Order Details', 'Payment', 'Confirmation'] },
  { name: 'Customer Onboarding', steps: ['Login', 'Customers', 'New Customer', 'KYC Upload', 'Verification', 'Activated'] },
  { name: 'Payment Collection', steps: ['Login', 'Dashboard', 'Payments', 'Select Invoice', 'Confirm', 'Receipt'] },
  { name: 'Inventory Restock', steps: ['Login', 'Inventory', 'Low Stock', 'Create PO', 'Approve', 'Submitted'] },
  { name: 'Daily Attendance', steps: ['Login', 'Attendance', 'Check-in', 'Location', 'Submitted'] },
];

const APP_VERSIONS = ['3.2.1', '3.2.0', '3.1.5', '3.0.9'];
const PLATFORMS = ['android', 'ios', 'web'];

const DATE_PRESETS = ['today', 'yesterday', 'last7', 'last30', 'custom'];

// ── Deterministic pseudo-random helpers ───────────────────────────────────
const hashString = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// Stable 0..1 float for a given seed key.
const rand = (key) => (hashString(String(key)) % 100000) / 100000;

// Stable integer in [min, max] for a given seed key.
const randInt = (key, min, max) => min + Math.floor(rand(key) * (max - min + 1));

/**
 * Scale factor derived from the active filters + date range. Narrower filters
 * (a specific branch, role, platform…) shrink the numbers; longer date ranges
 * grow them — so the dummy data reacts believably to the filter bar.
 */
const scaleFromQuery = (query = {}) => {
  let scale = 1;
  if (query.zone) scale *= 0.32;
  if (query.dealer) scale *= 0.45;
  if (query.branch) scale *= 0.5;
  if (query.role) scale *= 0.28;
  if (query.appVersion) scale *= 0.6;
  if (query.platform) scale *= 0.55;

  // Date-range length (days) relative to a 30-day baseline.
  const days = rangeDays(query);
  scale *= Math.max(0.15, days / 30);
  return scale;
};

const rangeDays = (query = {}) => {
  if (query.startDate && query.endDate) {
    const ms = new Date(query.endDate) - new Date(query.startDate);
    return Math.max(1, Math.round(ms / 86400000) + 1);
  }
  return 30;
};

// A stable signature of the active filters — folded into every seed key so a
// different filter combination yields a different (but still stable) dataset.
const filterKey = (query = {}) =>
  ['zone', 'dealer', 'branch', 'role', 'appVersion', 'platform']
    .map((k) => query[k] || '')
    .join('|');

// Build an evenly-spaced list of ISO day labels across the active range.
const dayLabels = (query = {}) => {
  const days = Math.min(rangeDays(query), 60);
  const end = query.endDate ? new Date(query.endDate) : new Date();
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

// Filter options for the usage-analytics modules. Roles come from the real
// taxonomy the app reports; the rest are the synthetic dimensions these modules
// slice by.
const getFilterOptions = () => {
  return {
    roles: ROLE_LIST,
    modules: MODULES,
    workflows: WORKFLOWS.map((w) => w.name),
    appVersions: APP_VERSIONS,
    platforms: PLATFORMS,
    datePresets: DATE_PRESETS,
  };
};

module.exports = {
  MODULES,
  SCREENS,
  WORKFLOWS,
  APP_VERSIONS,
  PLATFORMS,
  hashString,
  rand,
  randInt,
  scaleFromQuery,
  rangeDays,
  filterKey,
  dayLabels,
  getFilterOptions,
};
