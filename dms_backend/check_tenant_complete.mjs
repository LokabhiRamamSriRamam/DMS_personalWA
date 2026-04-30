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
    console.log('COMPLETE TENANT INFORMATION');
    console.log('='.repeat(80));

    const analyticsUri = process.env.ANALYTICS_MONGO_URI;
    const analyticsDbName = process.env.ANALYTICS_MONGO_DB_NAME || 'dms';

    console.log('\n[LOCATION]');
    console.log(`MongoDB URI: ${analyticsUri}`);
    console.log(`Database Name: ${analyticsDbName}`);
    console.log(`Collection Name: tenants`);

    const analyticsConn = await mongoose.createConnection(analyticsUri, {
      dbName: analyticsDbName
    }).asPromise();

    console.log('\n[STRUCTURE - All Tenants]:');
    const tenants = await analyticsConn.collection('tenants').find({}).toArray();
    
    if (tenants.length === 0) {
      console.log('❌ No tenants found');
      process.exit(1);
    }

    console.log(`\nFound ${tenants.length} tenant(s):\n`);

    tenants.forEach((tenant, i) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`TENANT ${i + 1}`);
      console.log(`${'='.repeat(80)}`);
      console.log(JSON.stringify(tenant, null, 2));
      
      console.log(`\n[KEY FIELDS FOR WAAPI MAPPING]`);
      console.log(`  Tenant _id: ${tenant._id}`);
      console.log(`  Tenant name: ${tenant.name}`);
      console.log(`  Tenant mongoUri: ${tenant.mongoUri}`);
      console.log(`  Tenant mongoDbName: ${tenant.mongoDbName}`);
    });

    await analyticsConn.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
