/**
 * User roles reported by the mobile app.
 *
 * This list is the app team's own `getUserRole()` ladder, in its order — the app
 * derives a single role from a set of Salesforce boolean flags and sends the
 * resulting label on /ingest/identify. `is_sales_person` and `is_salesman_user`
 * both map to 'Salesman', so 14 flags collapse to 13 distinct roles.
 *
 * Replaces the former data/geoTaxonomy.js. That file modelled a
 * Zone → State → AO → Dealer → Branch hierarchy with a TM per branch, but the
 * app has no such data to send: it reports a role and nothing else. Every one of
 * those dimensions was invented for seeding, so filters built on them could only
 * ever describe seeded users. Role is the one organisational dimension that is
 * actually populated from production, so it is the only one modelled here.
 *
 * Keep in sync with the app's getUserRole(). A role the app sends that is missing
 * here is rejected by the identify validator, so additions must land before the
 * app ships them.
 */

const ROLES = [
  'Branch Manager',
  'Dealer CEO',
  'DES User',
  'Distributor',
  'FDW Coordinator',
  'Franchise User',
  'Sales Manager',
  'Salesman',
  'Mechanic',
  'Service Advisor',
  'Installer',
  'Workshop Manager',
  'Spare Store Manager',
];

// The app returns '' when no flag matches; identify treats that as "not sent"
// rather than storing an empty designation.
const isKnownRole = (value) => typeof value === 'string' && ROLES.includes(value);

// Mongo match for the role + device dimensions a report can be sliced by.
const buildRoleMatch = (query = {}) => {
  const match = {};
  if (query.designation) match.designation = query.designation;
  if (query.platform) match.platform = query.platform;
  if (query.appVersion) match.appVersion = query.appVersion;
  return match;
};

module.exports = { ROLES, isKnownRole, buildRoleMatch };
