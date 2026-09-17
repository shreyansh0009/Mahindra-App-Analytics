/**
 * Read-only: WHY the collection is growing, not just how fast.
 * Tests: acceleration, per-user outliers, duplicate payloads, feedback loops.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const MB = (b) => (b / 1024 / 1024).toFixed(1);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const ev = mongoose.connection.db.collection('events');
  const agg = (p) => ev.aggregate(p, { allowDiskUse: true }).toArray();
  const d = (n) => new Date(Date.now() - n * 86400000);

  console.log('\n=== 1. EVENTS PER DAY (last 14d) — is it accelerating? ===');
  (await agg([
    { $match: { timestamp: { $gte: d(14) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                n: { $sum: 1 }, users: { $addToSet: '$userId' }, bytes: { $sum: { $bsonSize: '$$ROOT' } } } },
    { $project: { n: 1, bytes: 1, users: { $size: '$users' } } }, { $sort: { _id: 1 } },
  ])).forEach((r) => console.log(`${r._id}  ${String(r.n).padStart(7)} events  ${String(r.users).padStart(5)} users  ${MB(r.bytes).padStart(6)}MB  ${String(Math.round(r.n / r.users)).padStart(5)} ev/user`));

  console.log('\n=== 2. TOP USERS (last 3d) — a few devices, or the whole fleet? ===');
  (await agg([
    { $match: { timestamp: { $gte: d(3) } } },
    { $group: { _id: '$userId', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 10 },
  ])).forEach((r) => console.log(`${String(r._id).padEnd(24)} ${String(r.n).padStart(7)} events in 3d`));

  console.log('\n=== 3. TOP eventName (last 3d) ===');
  (await agg([
    { $match: { timestamp: { $gte: d(3) } } },
    { $group: { _id: { t: '$eventType', n: '$eventName' }, n: { $sum: 1 } } },
    { $sort: { n: -1 } }, { $limit: 15 },
  ])).forEach((r) => console.log(`${String(r._id.t).padEnd(14)} ${String(r._id.n).slice(0, 60).padEnd(62)} ${String(r.n).padStart(7)}`));

  console.log('\n=== 4. FEEDBACK LOOP? api_call targets pointing at our own analytics API ===');
  (await agg([
    { $match: { eventType: 'api_call', timestamp: { $gte: d(3) } } },
    { $group: { _id: '$apiEndpoint', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 12 },
  ])).forEach((r) => console.log(`${String(r._id).slice(0, 70).padEnd(72)} ${String(r.n).padStart(7)}`));

  console.log('\n=== 5. DUPLICATES — same user+name+timestamp, different eventId ===');
  const dup = await agg([
    { $match: { timestamp: { $gte: d(3) } } },
    { $group: { _id: { u: '$userId', n: '$eventName', t: '$timestamp' }, c: { $sum: 1 } } },
    { $match: { c: { $gt: 1 } } },
    { $group: { _id: null, groups: { $sum: 1 }, extra: { $sum: { $subtract: ['$c', 1] } } } },
  ]);
  const total3d = await ev.countDocuments({ timestamp: { $gte: d(3) } });
  const x = dup[0] || { groups: 0, extra: 0 };
  console.log(`${x.extra} redundant copies across ${x.groups} groups — ${((x.extra / total3d) * 100).toFixed(1)}% of the last 3 days (${total3d} events)`);

  console.log('\n=== 6. SESSION CHURN — events per session ===');
  (await agg([
    { $match: { timestamp: { $gte: d(3) } } },
    { $group: { _id: '$sessionId', n: { $sum: 1 } } },
    { $group: { _id: null, sessions: { $sum: 1 }, avg: { $avg: '$n' }, max: { $max: '$n' } } },
  ])).forEach((r) => console.log(`${r.sessions} sessions in 3d, avg ${Math.round(r.avg)} events/session, max ${r.max}`));

  await mongoose.disconnect();
};
run().catch((e) => { console.error(e.message); process.exit(1); });
