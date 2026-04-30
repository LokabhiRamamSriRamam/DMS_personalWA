import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { WhatsAppTemplateSchema } from './dms_backend/models/WhatsAppTemplate.model.js';

dotenv.config({ path: './dms_backend/.env' });

const conn = await mongoose.createConnection(process.env.MONGO_URI, { dbName: 'dms_clinic' }).asPromise();
const Template = conn.model('WhatsAppTemplate', WhatsAppTemplateSchema);

const templates = await Template.find({}).sort({ event: 1, language: 1 });
console.log(JSON.stringify(templates, null, 2));

await conn.close();
process.exit(0);
