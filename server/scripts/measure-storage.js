/**
 * Read-only: reports what is actually consuming the M0 512MB budget, which is
 * billed on logical dataSize + indexSize (not compressed storageSize).
 *
 *   node scripts/measure-storage.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MB = (b) => (b / 1024 / 1024).toFixed(1);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const s = await db.command({ dbStats: 1 });
  const logical = s.dataSize + s.indexSize;
  console.log(`\n=== BUDGET (512MB cap) ===`);
  console.log(`data  ${MB(s.dataSize)}MB + index ${MB(s.indexSize)}MB = ${MB(logical)}MB`);
  console.log(`free  ${MB(512 * 1024 * 1024 - logical)}MB  (${((logical / (512*1024*1024))*100).toFixed(1)}% used)`);

  console.log(`\n=== PER COLLECTION ===`);
  for (const { name } of await db.listCollections().toArray()) {
    const c = await db.command({ collStats: name });
    console.log(`${name.padEnd(22)} docs ${String(c.count).padStart(9)}  data ${MB(c.size).padStart(7)}MB  idx ${MB(c.totalIndexSize).padStart(7)}MB  avg ${Math.round(c.avgObjSize || 0)}B`);
  }

  console.log(`\n=== events BY TYPE ===`);
  const byType = await db.collection('events').aggregate([
    { $group: { _id: '$eventType', n: { $sum: 1 }, bytes: { $sum: { $bsonSize: '$$ROOT' } } } },
    { $sort: { bytes: -1 } },
  ]).toArray();
  byType.forEach((r) => console.log(`${String(r._id).padEnd(20)} ${String(r.n).padStart(9)} docs  ${MB(r.bytes).padStart(7)}MB`));

  console.log(`\n=== events BY MONTH ===`);
  const byMonth = await db.collection('events').aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$timestamp' } }, n: { $sum: 1 }, bytes: { $sum: { $bsonSize: '$$ROOT' } } } },
    { $sort: { _id: 1 } },
  ]).toArray();
  byMonth.forEach((r) => console.log(`${r._id}  ${String(r.n).padStart(9)} docs  ${MB(r.bytes).padStart(7)}MB`));

  console.log(`\n=== events INDEXES ===`);
  const idx = await db.collection('events').aggregate([{ $indexStats: {} }]).toArray();
  const sizes = (await db.command({ collStats: 'events' })).indexSizes;
  idx.forEach((i) => console.log(`${i.name.padEnd(28)} ${MB(sizes[i.name] || 0).padStart(7)}MB  ops ${i.accesses.ops}`));

  await mongoose.disconnect();
};
run().catch((e) => { console.error(e.message); process.exit(1); });
