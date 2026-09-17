/**
 * What every filter control is called, and what it actually narrows.
 *
 * Filter bars used to be placeholder-only, which reads fine until something is
 * selected — the placeholder is then replaced by the value, and a lone
 * "Salesman" or "West Bengal" no longer says which dimension it belongs to.
 * Each control carries a permanent label instead, and a description explaining
 * what it filters, so the effect is legible before it is applied.
 *
 * Kept in one place because these controls appear on eight pages: a filter that
 * means one thing on Role Analytics and another on Dealer & Geography is the
 * bug this file exists to prevent.
 */
export const FILTER_META = {
  dateRange: {
    label: 'Date Range',
    description: 'Limits every chart and table on this page to activity recorded in this period.',
  },
  designation: {
    label: 'Role',
    description: 'The role the app reports for each user when they log in. Users the app has not sent a role for appear as “Unassigned”.',
  },
  role: {
    label: 'Role',
    description: 'The role the app reports for each user when they log in.',
  },
  userCategory: {
    label: 'Login Frequency',
    description: 'Groups users by how many distinct days they logged in: Frequent (>20 days), Occasional (5–20), Low (1–4), No Login (0).',
  },
  state: {
    label: 'Dealer State',
    description: 'State of the dealership’s billing address — this locates the dealership, not the user.',
  },
  city: {
    label: 'Dealer City',
    description: 'City of the dealership’s billing address. Only cities belonging to the selected state are offered.',
  },
  dealer: {
    label: 'Dealership',
    description: 'The Salesforce account a user belongs to. Only dealerships in the selected state are offered.',
  },
  dealerCategory: {
    label: 'Account Type',
    description: 'Salesforce account category. Dealer and geography reports count DEALER accounts only, so franchise and distributor addresses are excluded.',
  },
  appVersion: {
    label: 'App Version',
    description: 'Restricts results to sessions recorded on this build of the mobile app.',
  },
  platform: {
    label: 'Platform',
    description: 'The device operating system a user’s sessions were recorded on.',
  },
  workflow: {
    label: 'Workflow',
    description: 'Which multi-step journey to chart drop-off for.',
  },
  search: {
    label: 'Search',
    description: 'Matches name, email, mobile, Star ID, user ID, and dealership name or city.',
  },
};

export const filterMeta = (key) => FILTER_META[key] || { label: key, description: '' };
