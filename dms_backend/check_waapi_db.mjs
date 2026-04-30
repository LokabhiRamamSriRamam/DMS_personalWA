import mongoose from 'mongoose';

async function check() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING WAAPI DATABASE');
    console.log('='.repeat(80));

    // WAAPI database connection from the logs
    const waapiUri = 'mongodb+srv://wookraftaya_db_user:rbSBmop6Rqw3nbGq@waapi.tqgkxyq.mongodb.net/?appName=WAAPI';

    console.log('\n[1] Connecting to WAAPI MongoDB...');
    const waapiConn = await mongoose.createConnection(waapiUri, {
      dbName: 'waapi'
    }).asPromise();
    console.log('✓ Connected to WAAPI DB');

    // List all collections
    console.log('\n[2] Collections in WAAPI DB:');
    const collections = await waapiConn.db.listCollections().toArray();
    collections.forEach(c => {
      console.log(`  - ${c.name}`);
    });

    // Check for tenant mappings
    console.log('\n[3] Tenant Mappings:');
    const mappings = await waapiConn.collection('tenantmappings').find({}).toArray();
    if (mappings.length === 0) {
      console.log('  ❌ No mappings found');
    } else {
      console.log(`  ✓ Found ${mappings.length} mapping(s):`);
      mappings.forEach((m, i) => {
        console.log(`\n  Mapping ${i + 1}:`);
        console.log(JSON.stringify(m, null, 4));
      });
    }

    // Check accounts
    console.log('\n[4] Accounts:');
    const accounts = await waapiConn.collection('accounts').find({}).toArray();
    if (accounts.length === 0) {
      console.log('  ❌ No accounts found');
    } else {
      console.log(`  ✓ Found ${accounts.length} account(s):`);
      accounts.forEach((a, i) => {
        console.log(`\n  Account ${i + 1}:`);
        console.log(`    _id: ${a._id}`);
        console.log(`    name: ${a.name}`);
        console.log(`    phone: ${a.phone}`);
        console.log(`    status: ${a.status}`);
      });
    }

    // Check tenant configuration
    console.log('\n[5] Tenant configuration in WAAPI:');
    const tenants = await waapiConn.collection('tenants').find({}).toArray();
    if (tenants.length === 0) {
      console.log('  ❌ No tenants found');
    } else {
      console.log(`  ✓ Found ${tenants.length} tenant(s):`);
      tenants.forEach((t, i) => {
        console.log(`\n  Tenant ${i + 1}:`);
        console.log(JSON.stringify(t, null, 4));
      });
    }

    await waapiConn.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
