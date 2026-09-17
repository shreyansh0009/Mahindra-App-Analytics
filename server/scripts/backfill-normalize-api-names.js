/**
 * One-off: rewrites existing events to the normalized identity that
 * utils/eventName.js now applies at ingest time.
 *
 * Strips query strings from eventName/apiEndpoint and unsets apiEndpoint where it
 * merely repeated the name. On the Mahindra dataset this covers ~248k api_call
 * documents holding ~100MB of duplicated URL text, plus the ~80MB of eventName
 * index built over it.
 *
 * Runs in bounded batches with bulkWrite so it does not hold a huge cursor open,
 * and only touches documents whose stored value actually differs, so it is safe
 * to re-run and safe to interrupt.
 *
 *   node scripts/backfill-normalize-api-names.js           # dry run
 *   node scripts/backfill-normalize-api-names.js --apply   # rewrite
 *
 * NOTE: reclaiming the space needs a compact afterwards — Mongo does not return
 * freed space to the tier's quota on its own. See the console hint at the end.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { normalizeEventIdentity } = require('../utils/eventName');

const APPLY = process.argv.includes('--apply');
const BATCH = 2000;
const mb = (b) => (b / 1048576).toFixed(1);

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const events = db.collection('events');

  const before = await db.command({ dbStats: 1 });
  console.log(`BEFORE  data ${mb(before.dataSize)} + idx ${mb(before.indexSize)} = ${mb(before.dataSize + before.indexSize)} MB`);

  // Only documents that could possibly change: a '?' in either field, or an
  // apiEndpoint that duplicates the name.
  const filter = {
    $or: [
      { eventName: /\?/ },
      { apiEndpoint: /\?/ },
      { apiEndpoint: { $exists: true, $ne: null } },
    ],
  };

  const total = await events.countDocuments(filter);
  console.log(`candidates: ${total}\n`);

  const cursor = events.find(filter).project({ eventName: 1, apiEndpoint: 1 });
  let scanned = 0;
  let changed = 0;
  let ops = [];

  const flush = async () => {
    if (!ops.length) return;
    if (APPLY) await events.bulkWrite(ops, { ordered: false });
    ops = [];
  };

  for await (const doc of cursor) {
    scanned += 1;
    const next = normalizeEventIdentity(doc);

    const nameChanged = next.eventName !== doc.eventName;
    const endpointGone = doc.apiEndpoint != null && next.apiEndpoint === undefined;
    const endpointChanged = next.apiEndpoint !== undefined && next.apiEndpoint !== doc.apiEndpoint;
    if (!nameChanged && !endpointGone && !endpointChanged) continue;

    changed += 1;
    const update = {};
    if (nameChanged) update.$set = { eventName: next.eventName };
    if (endpointChanged) update.$set = { ...(update.$set || {}), apiEndpoint: next.apiEndpoint };
    if (endpointGone) update.$unset = { apiEndpoint: '' };
    ops.push({ updateOne: { filter: { _id: doc._id }, update } });

    if (ops.length >= BATCH) {
      await flush();
      process.stdout.write(`\r  ${scanned}/${total} scanned, ${changed} rewritten`);
    }
  }
  await flush();
  console.log(`\r  ${scanned}/${total} scanned, ${changed} rewritten          \n`);

  if (!APPLY) {
    console.log('(dry run — nothing written. re-run with --apply)');
    await mongoose.disconnect();
    return;
  }

  const after = await db.command({ dbStats: 1 });
  console.log(`AFTER   data ${mb(after.dataSize)} + idx ${mb(after.indexSize)} = ${mb(after.dataSize + after.indexSize)} MB`);
  console.log(`RECLAIMED ${mb((before.dataSize + before.indexSize) - (after.dataSize + after.indexSize))} MB`);
  console.log('\nIf dataSize did not drop as much as expected, run a compact from the Atlas');
  console.log('shell to release the freed space:  db.runCommand({ compact: "events" })');

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
