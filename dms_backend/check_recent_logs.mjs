import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function check() {
  try {
    const analyticsUri = process.env.ANALYTICS_MONGO_URI;
    const analyticsDbName = process.env.ANALYTICS_MONGO_DB_NAME || 'dms';

    const analyticsConn = await mongoose.createConnection(analyticsUri, {
      dbName: analyticsDbName
    }).asPromise();

    const tenants = await analyticsConn.collection('tenants').find({}).limit(1).toArray();
    const tenant = tenants[0];

    const tenantConn = await mongoose.createConnection(tenant.mongoUri, {
      dbName: tenant.mongoDbName
    }).asPromise();

    console.log('='.repeat(80));
    console.log('ALL WHATSAPP LOGS (MOST RECENT FIRST)');
    console.log('='.repeat(80));

    const logs = await tenantConn.collection('whatsapplogs')
      .find({})
      .sort({ sentAt: -1 })
      .limit(10)
      .toArray();

    logs.forEach((log, i) => {
      const sentTime = new Date(log.sentAt).toLocaleString();
      console.log(`\n[${i + 1}] ${sentTime}`);
      console.log(`    Event: ${log.event}`);
      console.log(`    Status: ${log.status}`);
      console.log(`    To: ${log.to}`);
      if (log.errorMessage) {
        console.log(`    Error: ${log.errorMessage.substring(0, 80)}...`);
      }
      console.log(`    Has scheduledAt: ${!!log.payload?.scheduledAt}`);
    });

    await tenantConn.close();
    await analyticsConn.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
