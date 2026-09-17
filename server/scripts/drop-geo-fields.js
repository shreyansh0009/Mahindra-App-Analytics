/**
 * One-off: removes the geography hierarchy from existing user documents.
 *
 * The app reports a role and nothing else — there is no zone/state/AO/dealer/
 * branch/TM data behind it — so those fields only ever held values invented by
 * the seeder. Leaving them in place would keep feeding filters and exports that
 * describe seeded users only. See data/roleTaxonomy.js.
 *
 * Also drops the compound index that covered them, and normalises any stored
 * designation that is not in the app's role list (the old taxonomy had
 * 'Coordinator', 'Dealer Admin' and 'Regional Manager', which the app never
 * sends) — those are unset rather than guessed at, so they show as Unassigned.
 *
 *   node scripts/drop-geo-fields.js           # dry run
 *   node scripts/drop-geo-fields.js --apply
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { ROLES } = require('../data/roleTaxonomy');

const GEO_FIELDS = ['zone', 'state', 'ao', 'dealer', 'branch', 'tm'];
const OLD_INDEX = 'zone_1_state_1_ao_1_dealer_1_branch_1_tm_1';
const APPLY = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const users = db.collection('users');

  const geoFilter = { $or: GEO_FIELDS.map((f) => ({ [f]: { $exists: true } })) };
  const staleRole = { designation: { $exists: true, $nin: [...ROLES, null] } };

  console.log(`users with geo fields : ${await users.countDocuments(geoFilter)}`);
  console.log(`users with a role outside the app's list: ${await users.countDocuments(staleRole)}`);
  const stale = await users.distinct('designation', staleRole);
  if (stale.length) console.log(`  values to clear: ${stale.join(', ')}`);

  const indexes = await users.indexes();
  const hasOld = indexes.some((i) => i.name === OLD_INDEX);
  console.log(`old compound index present: ${hasOld}`);
  GEO_FIELDS.forEach((f) => {
    if (indexes.some((i) => i.name === `${f}_1`)) console.log(`  single index ${f}_1 present`);
  });

  if (!APPLY) { console.log('\n(dry run — re-run with --apply)'); await mongoose.disconnect(); return; }

  const r1 = await users.updateMany(geoFilter, { $unset: Object.fromEntries(GEO_FIELDS.map((f) => [f, ''])) });
  console.log(`\ncleared geo fields on ${r1.modifiedCount} users`);

  const r2 = await users.updateMany(staleRole, { $unset: { designation: '' } });
  console.log(`cleared stale designation on ${r2.modifiedCount} users`);

  for (const name of [OLD_INDEX, ...GEO_FIELDS.map((f) => `${f}_1`)]) {
    try { await users.dropIndex(name); console.log(`dropped index ${name}`); }
    catch (e) { if (e.codeName !== 'IndexNotFound') throw e; }
  }

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
