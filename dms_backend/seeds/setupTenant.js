/**
 * One-time setup script: creates a tenant record in the analytics DB
 * and links your existing dms_user account to it.
 *
 * Usage:
 *   node dms_backend/seeds/setupTenant.js
 *
 * What it does:
 *   1. Connects to the analytics DB (ANALYTICS_MONGO_URI)
 *   2. Upserts a tenant document in 'tenants' collection using MONGO_URI
 *   3. Updates the dms_user with the tenant's _id
 *   4. Activates the user (status: 'active')
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';

// Load .env from dms_backend/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ANALYTICS_URI  = process.env.ANALYTICS_MONGO_URI;
const ANALYTICS_DB   = process.env.ANALYTICS_MONGO_DB_NAME || 'dms';
const TENANT_URI     = process.env.MONGO_URI;
const TENANT_DB_NAME = 'dms_clinic'; // The database name inside TENANT_URI
const USER_EMAIL     = 'connectgenai@gmail.com'; // Your login email

if (!ANALYTICS_URI || !TENANT_URI) {
  console.error('❌ ANALYTICS_MONGO_URI and MONGO_URI must be set in .env');
  process.exit(1);
}

async function main() {
  console.log('🔗 Connecting to analytics DB...');
  const analyticsConn = await mongoose.createConnection(ANALYTICS_URI, {
    dbName: ANALYTICS_DB,
    autoIndex: false,
  }).asPromise();

  const db = analyticsConn.db;

  // 1. Find or create tenant
  let tenant = await db.collection('tenants').findOne({ mongoUri: TENANT_URI });

  if (!tenant) {
    console.log('📋 No tenant found — creating one...');
    const result = await db.collection('tenants').insertOne({
      name:         'Demo Clinic',
      mongoUri:     TENANT_URI,
      mongoDbName:  TENANT_DB_NAME,
      status:       'active',
      createdAt:    new Date(),
    });
    tenant = await db.collection('tenants').findOne({ _id: result.insertedId });
    console.log(`✅ Tenant created: ${tenant._id}`);
  } else {
    console.log(`✅ Tenant already exists: ${tenant._id}`);
    // Ensure mongoDbName is set
    if (!tenant.mongoDbName) {
      await db.collection('tenants').updateOne(
        { _id: tenant._id },
        { $set: { mongoDbName: TENANT_DB_NAME } }
      );
      console.log(`   Updated mongoDbName → ${TENANT_DB_NAME}`);
    }
  }

  // 2. Update user to link tenant + activate
  const user = await db.collection('dms_users').findOne({ email: USER_EMAIL, product: 'dms' });
  if (!user) {
    console.error(`❌ No dms_user found with email: ${USER_EMAIL}`);
    console.log('   Run POST /api/users/register first, then re-run this script.');
    await analyticsConn.close();
    process.exit(1);
  }

  await db.collection('dms_users').updateOne(
    { _id: user._id },
    { $set: { tenantId: tenant._id, status: 'active' } }
  );

  console.log(`✅ User "${USER_EMAIL}" linked to tenant ${tenant._id} and status set to 'active'`);
  console.log('\n🎉 Setup complete! Restart your backend server, then log in again to get a fresh token.');

  await analyticsConn.close();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
