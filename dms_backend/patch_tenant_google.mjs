import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const TENANT_ID = '69df8bcbf951c03063572728';

async function patch() {
  const analyticsUri   = process.env.ANALYTICS_MONGO_URI;
  const analyticsDbName = process.env.ANALYTICS_MONGO_DB_NAME || 'dms';

  const conn = await mongoose.createConnection(analyticsUri, { dbName: analyticsDbName }).asPromise();

  const update = {
    googleClientId:     process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
  };

  console.log('Patching tenant with:');
  console.log(JSON.stringify(update, null, 2));

  const result = await conn.collection('tenants').updateOne(
    { _id: new mongoose.Types.ObjectId(TENANT_ID) },
    { $set: { ...update, updatedAt: new Date() } }
  );

  console.log('\nResult:', result.modifiedCount === 1 ? '✅ Tenant updated successfully' : '⚠️  No document modified');

  await conn.close();
  process.exit(0);
}

patch().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
