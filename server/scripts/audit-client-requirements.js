/**
 * Read-only audit: for each field the P1/P2/P3 requirements need, how many real
 * users actually have it. Answers "is this a code gap or a data gap?".
 *
 * Usage: node scripts/audit-client-requirements.js
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const FEATURE_EVENTS = [
  'enquiry_creation', 'enquiry_review', 'enquiry_followup',
  'product_guide', 'village_visit', 'booking', 'delivery', 'login',
];

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.collection('users');
  const events = mongoose.connection.collection('events');

  const total = await users.countDocuments({});
  const has = async (f) => users.countDocuments({ [f]: { $exists: true, $ne: null, $ne: '' } });
  const gt0 = async (f) => users.countDocuments({ [f]: { $gt: 0 } });

  const pct = (n) => `${n} / ${total} (${total ? Math.round((n / total) * 1000) / 10 : 0}%)`;

  console.log(`\ntotal users: ${total}\n`);
  console.log('── Fields the requirements need ──────────────────────');
  for (const f of ['name', 'email', 'designation', 'mobile', 'doj', 'starId']) {
    console.log(`  ${f.padEnd(14)} ${pct(await has(f))}`);
  }
  console.log('\n── Login metrics (drive the classification) ──────────');
  for (const f of ['loginDays', 'totalLogins']) {
    console.log(`  ${f.padEnd(14)} ${pct(await gt0(f))}`);
  }
  console.log('\n── Time spent (drives "average spent time") ──────────');
  for (const f of ['totalTimeSpent', 'totalSessions']) {
    console.log(`  ${f.padEnd(14)} ${pct(await gt0(f))}`);
  }
  console.log('\n── Geography fields the client asked to filter by ────');
  for (const f of ['zone', 'state', 'ao', 'dealer', 'branch', 'tm']) {
    console.log(`  ${f.padEnd(14)} ${pct(await has(f))}`);
  }
  console.log('\n── P3 feature events ingested (all time) ─────────────');
  for (const t of FEATURE_EVENTS) {
    console.log(`  ${t.padEnd(20)} ${await events.countDocuments({ eventType: t })}`);
  }
  console.log('\n── Roles actually seen in production ─────────────────');
  const roles = await users.aggregate([
    { $group: { _id: '$designation', n: { $sum: 1 } } }, { $sort: { n: -1 } },
  ]).toArray();
  roles.forEach((r) => console.log(`  ${String(r._id ?? '(none)').padEnd(22)} ${r.n}`));

  await mongoose.disconnect();
};

main().catch((e) => { console.error(e); process.exit(1); });
