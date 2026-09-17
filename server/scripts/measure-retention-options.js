/**
 * Read-only: how much logical size each retention option would reclaim.
 * M0 bills dataSize + indexSize, and deletes DO shrink dataSize, so these
 * numbers are real reclaim, not just free-list space.
 *
 *   node scripts/measure-retention-options.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const MB = (b) => (b / 1024 / 1024).toFixed(1);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const days = (n) => new Date(Date.now() - n * 86400000);

  const size = async (coll, match) => {
    const r = await db.collection(coll).aggregate([
      { $match: match },
      { $group: { _id: null, n: { $sum: 1 }, bytes: { $sum: { $bsonSize: '$$ROOT' } } } },
    ]).toArray();
    return r[0] || { n: 0, bytes: 0 };
  };

  // index bytes scale roughly with doc count, so estimate from the ratio
  const ev = await db.command({ collStats: 'events' });
  const sv = await db.command({ collStats: 'screenvisits' });
  const evIdxPerDoc = ev.totalIndexSize / ev.count;
  const svIdxPerDoc = sv.totalIndexSize / sv.count;

  const show = async (label, coll, match, idxPerDoc) => {
    const r = await size(coll, match);
    console.log(`${label.padEnd(46)} ${String(r.n).padStart(8)} docs  ~${MB(r.bytes + r.n * idxPerDoc).padStart(6)}MB reclaimed`);
  };

  console.log('\n=== OPTION A: drop api_call beyond N days ===');
  for (const d of [30, 14, 7]) {
    await show(`api_call older than ${d}d`, 'events', { eventType: 'api_call', timestamp: { $lt: days(d) } }, evIdxPerDoc);
  }
  await show('ALL api_call', 'events', { eventType: 'api_call' }, evIdxPerDoc);

  console.log('\n=== OPTION B: global retention on events ===');
  for (const d of [90, 60, 45]) {
    await show(`all events older than ${d}d`, 'events', { timestamp: { $lt: days(d) } }, evIdxPerDoc);
  }

  console.log('\n=== OPTION C: screenvisits retention ===');
  for (const d of [90, 60, 45]) {
    await show(`screenvisits older than ${d}d`, 'screenvisits', { timestamp: { $lt: days(d) } }, svIdxPerDoc);
  }

  console.log('\n=== growth rate (events, last 7d) ===');
  const wk = await size('events', { timestamp: { $gte: days(7) } });
  console.log(`${wk.n} docs / 7d  = ${MB(wk.bytes + wk.n * evIdxPerDoc)}MB per week  ~${MB((wk.bytes + wk.n * evIdxPerDoc) * 4.3)}MB/month`);

  await mongoose.disconnect();
};
run().catch((e) => { console.error(e.message); process.exit(1); });
