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
    console.log('CHECKING WAAPI MAPPINGS');
    console.log('='.repeat(80));

    // WAAPI uses its own MongoDB (different from DMS)
    // It's usually on a different connection string
    // But we need to find where WAAPI stores its data
    
    // First, let's check the Analytics DB for tenant info
    const analyticsUri = process.env.ANALYTICS_MONGO_URI;
    const analyticsDbName = process.env.ANALYTICS_MONGO_DB_NAME || 'dms';

    const analyticsConn = await mongoose.createConnection(analyticsUri, {
      dbName: analyticsDbName
    }).asPromise();

    console.log('\n[1] Tenant info from Analytics DB:');
    const tenant = await analyticsConn.collection('tenants').findOne({});
    if (tenant) {
      console.log(`  Tenant _id: ${tenant._id}`);
      console.log(`  Tenant mongoUri: ${tenant.mongoUri.substring(0, 60)}...`);
      console.log(`  Tenant mongoDbName: ${tenant.mongoDbName}`);
    }

    // Now check the WAAPI database
    // WAAPI typically stores mappings in its own DB
    // Let's check if there's a mappings collection in the analytics DB
    console.log('\n[2] Looking for tenant mappings in Analytics DB:');
    const mappings = await analyticsConn.collection('tenantmappings').find({}).toArray();
    if (mappings.length === 0) {
      console.log('  ❌ No tenantmappings collection found');
      
      // Try looking for mappings with different name
      const collections = await analyticsConn.db.listCollections().toArray();
      console.log('\n  Available collections:');
      collections.forEach(c => {
        if (c.name.toLowerCase().includes('map') || c.name.toLowerCase().includes('account') || c.name.toLowerCase().includes('tenant')) {
          console.log(`    - ${c.name}`);
        }
      });
    } else {
      console.log(`  ✓ Found ${mappings.length} mapping(s):`);
      mappings.forEach((m, i) => {
        console.log(`\n  Mapping ${i + 1}:`);
        console.log(JSON.stringify(m, null, 4));
      });
    }

    // Check if WAAPI has a separate database
    console.log('\n[3] Looking in WAAPI database (if separate):');
    console.log('  Note: WAAPI might use a different MongoDB instance');
    console.log('  Check WAAPI logs or config for its MongoDB URI');

    await analyticsConn.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
