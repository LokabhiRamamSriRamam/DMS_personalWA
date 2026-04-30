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
    console.log('LATEST appointmentBooked PAYLOAD');
    console.log('='.repeat(80));

    const latestLog = await tenantConn.collection('whatsapplogs')
      .findOne({ event: 'appointmentBooked' }, { sort: { sentAt: -1 } });

    if (latestLog) {
      console.log('\nPayload:');
      console.log(JSON.stringify(latestLog.payload, null, 2));
      console.log(`\nStatus: ${latestLog.status}`);
      console.log(`Scheduled At: ${latestLog.payload.scheduledAt}`);
      console.log(`Has {{}} tokens in content? ${JSON.stringify(latestLog.payload.content).includes('{{')}`);
    } else {
      console.log('❌ No appointmentBooked logs found');
    }

    await tenantConn.close();
    await analyticsConn.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
