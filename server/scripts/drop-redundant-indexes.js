/**
 * One-off: drops single-field indexes that are already covered as the prefix of a
 * compound index, to reclaim space on the Atlas M0 tier (which bills logical
 * dataSize + indexSize, not compressed storageSize).
 *
 * Safe to re-run. Each index is re-verified as a strict prefix of another,
 * non-unique index before it is dropped; anything that fails that check is
 * skipped rather than dropped.
 *
 * The matching `index: true` declarations were removed from models/Event.js and
 * models/ScreenVisit.js — without that, Mongoose autoIndex rebuilds them on the
 * next server boot.
 *
 *   node scripts/drop-redundant-indexes.js           # dry run
 *   node scripts/drop-redundant-indexes.js --apply   # actually drop
 */
require('dotenv').config();
const mongoose = require('mongoose');

const TARGETS = {
  events: ['eventName_1', 'sessionId_1', 'userId_1', 'eventType_1'],
  screenvisits: ['userId_1', 'sessionId_1', 'screenName_1'],
};

const APPLY = process.argv.includes('--apply');
const mb = (b) => (b / 1048576).toFixed(1);

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const before = await db.command({ dbStats: 1 });
  console.log(`BEFORE  data ${mb(before.dataSize)} + idx ${mb(before.indexSize)} = ${mb(before.dataSize + before.indexSize)} MB\n`);

  for (const [coll, names] of Object.entries(TARGETS)) {
    const idx = await db.collection(coll).indexes();
    for (const name of names) {
      const target = idx.find((i) => i.name === name);
      if (!target) { console.log(`  skip    ${coll}.${name} (already gone)`); continue; }
      if (target.unique) { console.log(`  REFUSE  ${coll}.${name} (unique)`); continue; }

      const keys = Object.keys(target.key);
      const cover = idx.find((i) => i.name !== name
        && Object.keys(i.key).length > keys.length
        && keys.every((k, j) => Object.keys(i.key)[j] === k));
      if (!cover) { console.log(`  REFUSE  ${coll}.${name} (no covering compound index)`); continue; }

      if (!APPLY) { console.log(`  would drop ${coll}.${name} — covered by ${cover.name}`); continue; }
      await db.collection(coll).dropIndex(name);
      console.log(`  dropped ${coll}.${name} — covered by ${cover.name}`);
    }
  }

  const after = await db.command({ dbStats: 1 });
  console.log(`\nAFTER   data ${mb(after.dataSize)} + idx ${mb(after.indexSize)} = ${mb(after.dataSize + after.indexSize)} MB`);
  console.log(`RECLAIMED ${mb(before.indexSize - after.indexSize)} MB | headroom ${(512 - (after.dataSize + after.indexSize) / 1048576).toFixed(1)} MB of 512`);
  if (!APPLY) console.log('\n(dry run — re-run with --apply to drop)');

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
