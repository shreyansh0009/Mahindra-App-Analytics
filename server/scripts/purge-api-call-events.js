/**
 * Deletes api_call events older than a cutoff, in batches.
 *
 * api_call is 375k of the 677k events in the collection and ~61% of incoming
 * write volume, but only one thing reads it: the average-response-time KPI in
 * dashboardService (`{ eventType: 'api_call', 'metrics.responseTimeMs': ... }`),
 * which is scoped to the dashboard's date range — 30 days by default. Keeping a
 * recent window preserves that KPI; everything older is write-only data.
 *
 * Batched rather than one deleteMany: a single 250k-doc delete on a shared tier
 * holds locks long enough to time out ingest requests.
 *
 *   node scripts/purge-api-call-events.js              # dry run, 7-day cutoff
 *   node scripts/purge-api-call-events.js --days=14    # dry run, different cutoff
 *   node scripts/purge-api-call-events.js --apply      # actually delete
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const daysArg = process.argv.find((a) => a.startsWith('--days='));
const DAYS = daysArg ? parseInt(daysArg.split('=')[1], 10) : 7;
const BATCH = 5000;
const MB = (b) => (b / 1024 / 1024).toFixed(1);

const run = async () => {
  if (!Number.isInteger(DAYS) || DAYS < 1) throw new Error('--days must be a positive integer');
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const events = db.collection('events');

  const cutoff = new Date(Date.now() - DAYS * 86400000);
  const filter = { eventType: 'api_call', timestamp: { $lt: cutoff } };

  const before = await db.command({ dbStats: 1 });
  const target = await events.countDocuments(filter);
  console.log(`logical size now : ${MB(before.dataSize + before.indexSize)}MB`);
  console.log(`cutoff           : ${cutoff.toISOString()} (${DAYS}d)`);
  console.log(`api_call to purge: ${target}`);

  if (!APPLY) {
    console.log('\nDRY RUN — nothing deleted. Re-run with --apply.');
    return mongoose.disconnect();
  }

  let removed = 0;
  // Drive each batch off _id so the delete never rescans the range it just cleared.
  for (;;) {
    const ids = await events.find(filter, { projection: { _id: 1 } }).limit(BATCH).toArray();
    if (!ids.length) break;
    const r = await events.deleteMany({ _id: { $in: ids.map((d) => d._id) } });
    removed += r.deletedCount;
    process.stdout.write(`\rdeleted ${removed}/${target}`);
  }

  const after = await db.command({ dbStats: 1 });
  console.log(`\n\nlogical size now : ${MB(after.dataSize + after.indexSize)}MB`);
  console.log(`reclaimed        : ${MB((before.dataSize + before.indexSize) - (after.dataSize + after.indexSize))}MB`);
  await mongoose.disconnect();
};
run().catch((e) => { console.error(e.message); process.exit(1); });
