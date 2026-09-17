/** Read-only: how much of each event doc is field names vs actual content. */
require('dotenv').config();
const mongoose = require('mongoose');
const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const ev = mongoose.connection.db.collection('events');
  const docs = await ev.find({}).limit(2000).toArray();
  let keys = 0, values = 0;
  const lens = {};
  docs.forEach((d) => {
    Object.entries(d).forEach(([k, v]) => {
      keys += k.length + 2;
      const s = v === null || v === undefined ? 0 : (typeof v === 'object' ? JSON.stringify(v).length : String(v).length);
      values += s;
      lens[k] = Math.max(lens[k] || 0, s);
    });
  });
  console.log(`sampled ${docs.length} events`);
  console.log(`avg field-name overhead : ${Math.round(keys / docs.length)} B/doc`);
  console.log(`avg actual content      : ${Math.round(values / docs.length)} B/doc`);
  console.log(`\nmax observed length per field:`);
  Object.entries(lens).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k.padEnd(16)} ${v}`));
  console.log(`\nsample properties payload:`);
  const withProps = docs.find((d) => d.properties && Object.keys(d.properties).length);
  console.log(JSON.stringify(withProps && withProps.properties, null, 2)?.slice(0, 400));
  await mongoose.disconnect();
};
run().catch((e) => { console.error(e.message); process.exit(1); });
