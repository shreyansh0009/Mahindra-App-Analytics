/**
 * One-off: rebuilds events.eventName_1_timestamp_-1 to reclaim fragmentation.
 *
 * The backfill rewrote ~149k eventName values, and WiredTiger leaves the
 * superseded index keys behind as dead space: the index grew 42.1MB -> 68.7MB
 * even though the keys it stores shrank from ~233 to ~59 bytes. Normally
 * `compact` reclaims that, but Atlas shared tiers reject it
 * (AtlasError 8000, CMD_NOT_ALLOWED), so the supported route is to rebuild --
 * a fresh build writes only live keys.
 *
 * The index has to be dropped before it is rebuilt: Mongo rejects a second index
 * with the same key spec under a different name (IndexOptionsConflict, code 85),
 * so there is no way to stage a replacement alongside it. eventName queries fall
 * back to a collection scan for the length of the rebuild -- seconds at this
 * size, and event ingestion does not use this index at all.
 *
 * If the process dies between the drop and the create, the index is not lost:
 * models/Event.js still declares it and Mongoose autoIndex rebuilds it on the
 * next server start. Re-running this script also repairs that state.
 *
 *   node scripts/rebuild-eventname-index.js           # dry run
 *   node scripts/rebuild-eventname-index.js --apply
 */
require('dotenv').config();
const mongoose = require('mongoose');

const COLL = 'events';
const SPEC = { eventName: 1, timestamp: -1 };
const FINAL = 'eventName_1_timestamp_-1';

const APPLY = process.argv.includes('--apply');
const mb = (b) => (b / 1048576).toFixed(1);

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const coll = db.collection(COLL);

  const before = await db.command({ dbStats: 1 });
  const stats = await db.command({ collStats: COLL });
  const current = stats.indexSizes[FINAL];
  console.log(`BEFORE  total ${mb(before.dataSize + before.indexSize)} MB | ${FINAL} = ${current ? mb(current) : 'absent'} MB`);

  if (!current) { console.log('nothing to rebuild'); await mongoose.disconnect(); return; }

  const headroom = 512 * 1048576 - (before.dataSize + before.indexSize);
  console.log(`headroom ${mb(headroom)} MB`);

  if (!APPLY) { console.log('\n(dry run — re-run with --apply)'); await mongoose.disconnect(); return; }

  console.log(`dropping ${FINAL} ...`);
  await coll.dropIndex(FINAL);
  try {
    console.log(`rebuilding ${FINAL} ...`);
    await coll.createIndex(SPEC, { name: FINAL });
  } catch (err) {
    console.error(`\nREBUILD FAILED after the drop: ${err.message}`);
    console.error('The index is currently missing. Re-run this script, or restart the');
    console.error('server -- Mongoose autoIndex recreates it from models/Event.js.');
    throw err;
  }

  const after = await db.command({ dbStats: 1 });
  const s2 = await db.command({ collStats: COLL });
  console.log(`\nAFTER   total ${mb(after.dataSize + after.indexSize)} MB | ${FINAL} = ${mb(s2.indexSizes[FINAL])} MB`);
  console.log(`RECLAIMED ${mb(before.indexSize - after.indexSize)} MB | headroom ${mb(512 * 1048576 - (after.dataSize + after.indexSize))} MB of 512`);

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
