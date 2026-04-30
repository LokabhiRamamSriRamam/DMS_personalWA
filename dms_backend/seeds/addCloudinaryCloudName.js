import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const conn = await mongoose.createConnection(process.env.ANALYTICS_MONGO_URI, {
  dbName: process.env.ANALYTICS_MONGO_DB_NAME || 'dms',
  autoIndex: false,
}).asPromise();

const result = await conn.db.collection('tenants').updateOne(
  { _id: new mongoose.Types.ObjectId('69df8bcbf951c03063572728') },
  { $set: { cloudinaryCloudName: 'dcpya36yc', updatedAt: new Date() } }
);

console.log('Modified:', result.modifiedCount, 'tenant(s)');
await conn.close();
