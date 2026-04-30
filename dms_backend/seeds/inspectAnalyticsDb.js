import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ANALYTICS_URI = process.env.ANALYTICS_MONGO_URI;
const ANALYTICS_DB  = process.env.ANALYTICS_MONGO_DB_NAME || 'dms';

const conn = await mongoose.createConnection(ANALYTICS_URI, { dbName: ANALYTICS_DB, autoIndex: false }).asPromise();
const db = conn.db;

const tenants = await db.collection('tenants').find({}).toArray();
const users   = await db.collection('dms_users').find({}, { projection: { password: 0 } }).toArray();

console.log('\n=== TENANTS ===');
console.log(JSON.stringify(tenants, null, 2));
console.log('\n=== USERS (no passwords) ===');
console.log(JSON.stringify(users, null, 2));

await conn.close();
