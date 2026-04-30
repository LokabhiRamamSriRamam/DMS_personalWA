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
  { $set: { mongoUri: process.env.MONGO_URI, updatedAt: new Date() } }
);

console.log('Updated:', result.modifiedCount, 'document(s)');
console.log('mongoUri set to:', process.env.MONGO_URI);

await conn.close();
