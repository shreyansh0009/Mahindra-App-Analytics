require('dotenv').config();
const mongoose = require('mongoose');
const MB = (b) => (b / 1024 / 1024).toFixed(1);
const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const bi = await db.admin().command({ buildInfo: 1 });
  console.log(`Atlas server version : ${bi.version}`);
  const s = await db.command({ dbStats: 1 });
  console.log(`\nlogical (what M0 bills): ${MB(s.dataSize + s.indexSize)}MB`);
  console.log(`on-disk (what a VPS uses): ${MB(s.storageSize + s.indexSize)}MB`);
  console.log(`compression ratio on data: ${(s.dataSize / s.storageSize).toFixed(2)}x`);
  await mongoose.disconnect();
};
run().catch((e) => { console.error(e.message); process.exit(1); });
