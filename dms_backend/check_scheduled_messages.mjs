import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function check() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING SCHEDULED MESSAGE TIMINGS');
    console.log('='.repeat(80));

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

    console.log('\n[LATEST WHATSAPP LOGS WITH SCHEDULING]');
    const logs = await tenantConn.collection('whatsapplogs')
      .find({})
      .sort({ sentAt: -1 })
      .limit(10)
      .toArray();

    logs.forEach((log, i) => {
      const sentTime = new Date(log.sentAt);
      const scheduledTime = log.payload?.scheduledAt ? new Date(log.payload.scheduledAt) : null;

      console.log(`\n[${i + 1}] ${log.event}`);
      console.log(`    Sent At: ${sentTime.toISOString()} (UTC)`);
      console.log(`    Sent At IST: ${sentTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      
      if (scheduledTime) {
        console.log(`    Scheduled At (UTC): ${scheduledTime.toISOString()}`);
        console.log(`    Scheduled At (IST): ${scheduledTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      } else {
        console.log(`    Scheduled At: None (immediate send)`);
      }
      
      if (log.payload?.messageType === 'appointmentReminder') {
        console.log(`    ⚠️  This is a REMINDER - check if scheduledAt is X hours BEFORE appointment time`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('CHECKING APPOINTMENT TIME vs REMINDER TIME');
    console.log('='.repeat(80));

    // Get appointments to compare
    const appointments = await tenantConn.collection('appointments')
      .find({})
      .sort({ start_time: -1 })
      .limit(3)
      .toArray();

    appointments.forEach((apt, i) => {
      const aptTime = new Date(apt.start_time);
      console.log(`\n[Appointment ${i + 1}]`);
      console.log(`    Start Time (UTC): ${aptTime.toISOString()}`);
      console.log(`    Start Time (IST): ${aptTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`    Patient: ${apt.patient_id}`);
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
