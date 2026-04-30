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
    console.log('APPOINTMENT REMINDER LOGS');
    console.log('='.repeat(80));

    const reminderLogs = await tenantConn.collection('whatsapplogs')
      .find({ event: 'appointmentReminder' })
      .sort({ sentAt: -1 })
      .limit(5)
      .toArray();

    if (reminderLogs.length === 0) {
      console.log('\n❌ NO APPOINTMENT REMINDER LOGS FOUND');
      console.log('\nPossible reasons:');
      console.log('  1. appointmentReminder event is DISABLED in WhatsApp settings');
      console.log('  2. No new appointments booked since enabling it');
      console.log('\nCurrent settings:');
      
      const settings = await tenantConn.collection('whatsappsettings').findOne({});
      console.log(`  appointmentReminder.enabled: ${settings?.events?.appointmentReminder?.enabled}`);
      console.log(`  appointmentReminder.hoursBeforeAppointment: ${settings?.events?.appointmentReminder?.hoursBeforeAppointment}`);
    } else {
      console.log(`\n✓ Found ${reminderLogs.length} reminder log(s):\n`);
      
      reminderLogs.forEach((log, i) => {
        const sentTime = new Date(log.sentAt);
        const scheduledTime = log.payload?.scheduledAt ? new Date(log.payload.scheduledAt) : null;

        console.log(`[${i + 1}] Reminder Log`);
        console.log(`    Sent At (UTC): ${sentTime.toISOString()}`);
        console.log(`    Sent At (IST): ${sentTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        
        if (scheduledTime) {
          console.log(`    Scheduled At (UTC): ${scheduledTime.toISOString()}`);
          console.log(`    Scheduled At (IST): ${scheduledTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
          
          // Try to find the corresponding appointment
          const appointmentId = log.payload?.appointmentId;
          if (appointmentId) {
            console.log(`    Appointment ID: ${appointmentId}`);
          }
        }
        console.log(`    Status: ${log.status}`);
        console.log('');
      });
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
