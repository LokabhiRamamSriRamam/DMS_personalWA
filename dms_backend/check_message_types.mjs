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
    console.log('MESSAGE TYPES SENT TO WAAPI');
    console.log('='.repeat(80));

    // Get all unique message types from logs
    const logs = await tenantConn.collection('whatsapplogs').find({}).toArray();
    
    const messageTypes = {};
    logs.forEach(log => {
      const event = log.event;
      const contentType = log.payload?.contentType;
      const messageType = log.payload?.messageType;
      
      if (!messageTypes[event]) {
        messageTypes[event] = {
          count: 0,
          contentType: contentType,
          messageType: messageType,
          examples: []
        };
      }
      messageTypes[event].count++;
      
      if (messageTypes[event].examples.length < 2) {
        messageTypes[event].examples.push({
          message: log.payload?.message?.substring(0, 80),
          contentType: log.payload?.contentType,
          messageType: log.payload?.messageType,
          status: log.status
        });
      }
    });

    console.log(`\nFound ${logs.length} total logs\n`);
    console.log('Message Types Summary:');
    console.log('='.repeat(80));

    Object.entries(messageTypes).forEach(([event, info]) => {
      console.log(`\n[${event}]`);
      console.log(`  Count: ${info.count}`);
      console.log(`  contentType: ${info.contentType}`);
      console.log(`  messageType: ${info.messageType}`);
      console.log(`  Examples:`);
      info.examples.forEach((ex, i) => {
        console.log(`    ${i + 1}. "${ex.message}..."`);
        console.log(`       contentType: ${ex.contentType}`);
        console.log(`       messageType: ${ex.messageType}`);
        console.log(`       status: ${ex.status}`);
      });
    });

    // Now check what the service is configured to send
    console.log('\n' + '='.repeat(80));
    console.log('CONFIGURED EVENTS (from WhatsApp Settings):');
    console.log('='.repeat(80));

    const settings = await tenantConn.collection('whatsappsettings').findOne({});
    if (settings?.events) {
      Object.entries(settings.events).forEach(([eventKey, eventConfig]) => {
        console.log(`\n[${eventKey}]`);
        console.log(`  enabled: ${eventConfig.enabled}`);
        console.log(`  delayMinutes: ${eventConfig.delayMinutes}`);
        console.log(`  hoursBeforeAppointment: ${eventConfig.hoursBeforeAppointment}`);
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
