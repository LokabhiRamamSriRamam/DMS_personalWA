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
    console.log('CHECKING MONGODB FOR WHATSAPP DATA');
    console.log('='.repeat(80));

    const analyticsUri = process.env.ANALYTICS_MONGO_URI;
    const analyticsDbName = process.env.ANALYTICS_MONGO_DB_NAME || 'dms';

    console.log(`\nANALYTICS_MONGO_URI: ${analyticsUri ? 'SET' : 'NOT SET'}`);
    console.log(`ANALYTICS_MONGO_DB_NAME: ${analyticsDbName}`);

    if (!analyticsUri) {
      console.error('❌ ANALYTICS_MONGO_URI not set in .env');
      process.exit(1);
    }

    console.log('\n[1] Connecting to Analytics DB...');
    const analyticsConn = await mongoose.createConnection(analyticsUri, {
      dbName: analyticsDbName
    }).asPromise();
    console.log('✓ Connected to Analytics DB');

    const tenants = await analyticsConn.collection('tenants').find({}).limit(1).toArray();
    if (!tenants.length) {
      console.error('❌ No tenants found in analytics DB');
      process.exit(1);
    }

    const tenant = tenants[0];
    console.log(`\n[2] Found tenant: ${tenant._id}`);
    console.log(`    mongoUri: ${tenant.mongoUri.substring(0, 50)}...`);
    console.log(`    mongoDbName: ${tenant.mongoDbName}`);

    const tenantConn = await mongoose.createConnection(tenant.mongoUri, {
      dbName: tenant.mongoDbName
    }).asPromise();
    console.log('✓ Connected to Tenant DB');

    console.log('\n' + '='.repeat(80));
    console.log('CHECK 1: WHATSAPP SETTINGS');
    console.log('='.repeat(80));
    const settings = await tenantConn.collection('whatsappsettings').findOne({});
    if (!settings) {
      console.log('❌ NO SETTINGS FOUND - This is the problem!');
    } else {
      console.log('✓ Settings found:');
      console.log(JSON.stringify(settings, null, 2));
    }

    console.log('\n' + '='.repeat(80));
    console.log('CHECK 2: TEMPLATES FOR appointmentBooked');
    console.log('='.repeat(80));
    const templates = await tenantConn.collection('whatsapptemplates').find({ event: 'appointmentBooked' }).toArray();
    if (!templates.length) {
      console.log('❌ NO TEMPLATES FOUND');
    } else {
      console.log(`✓ Found ${templates.length} template(s):`);
      templates.forEach((t, i) => {
        console.log(`\nTemplate ${i + 1}:`);
        console.log(JSON.stringify(t, null, 2));
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('CHECK 3: ACTIVE TEMPLATES');
    console.log('='.repeat(80));
    const activeTemplates = await tenantConn.collection('whatsapptemplates').find({ 
      event: 'appointmentBooked', 
      isActive: true 
    }).toArray();
    console.log(`Found ${activeTemplates.length} active template(s)`);

    console.log('\n' + '='.repeat(80));
    console.log('CHECK 4: RECENT WHATSAPP LOGS');
    console.log('='.repeat(80));
    const logs = await tenantConn.collection('whatsapplogs').find({}).sort({ sentAt: -1 }).limit(5).toArray();
    console.log(`Found ${logs.length} log(s)`);
    if (logs.length > 0) {
      logs.forEach((log, i) => {
        console.log(`\nLog ${i + 1}: event=${log.event}, status=${log.status}, to=${log.to}`);
        if (log.errorMessage) console.log(`  ERROR: ${log.errorMessage}`);
      });
    }

    await tenantConn.close();
    await analyticsConn.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

check();
