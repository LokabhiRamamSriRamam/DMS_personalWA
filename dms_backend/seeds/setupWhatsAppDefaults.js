/**
 * Setup WhatsApp Settings and Templates for the tenant
 *
 * Usage:
 *   node dms_backend/seeds/setupWhatsAppDefaults.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import { WhatsAppSettingsSchema } from '../models/WhatsAppSettings.model.js';
import { WhatsAppTemplateSchema } from '../models/WhatsAppTemplate.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TENANT_URI = process.env.MONGO_URI;
const TENANT_DB_NAME = 'dms_clinic';

async function main() {
  console.log('🔗 Connecting to tenant DB...');
  const tenantConn = await mongoose.createConnection(TENANT_URI, {
    dbName: TENANT_DB_NAME,
    autoIndex: false,
  }).asPromise();

  const WhatsAppSettings = tenantConn.model('WhatsAppSettings', WhatsAppSettingsSchema);
  const WhatsAppTemplate = tenantConn.model('WhatsAppTemplate', WhatsAppTemplateSchema);

  try {
    // 1. Create/update WhatsApp Settings
    console.log('📋 Setting up WhatsApp Settings...');
    const settings = await WhatsAppSettings.findOneAndUpdate(
      {},
      {
        enabled: true,
        defaultLanguage: 'en',
        fallbackLanguage: 'en',
        events: {
          appointmentBooked: { enabled: true, delayMinutes: 0 },
          appointmentReminder: { enabled: true, hoursBeforeAppointment: 24 },
          appointmentRescheduled: { enabled: true, delayMinutes: 0 },
          treatmentCompleted: { enabled: false, delayMinutes: 0 },
          feedbackMessage: { enabled: false, delayMinutes: 0 },
          postCare: { enabled: false, delayMinutes: 0 },
        },
      },
      { upsert: true, new: true }
    );
    console.log('✅ WhatsApp Settings created/updated');

    // 2. Create default templates for appointmentBooked
    console.log('📋 Creating default templates...');
    const templates = [
      {
        event: 'appointmentBooked',
        language: 'en',
        contentType: 'text',
        content: { text: 'Hi {{name}}, your appointment with {{doctorName}} has been confirmed for {{date}} at {{time}}.' },
        isActive: true,
      },
      {
        event: 'appointmentBooked',
        language: 'hi',
        contentType: 'text',
        content: { text: 'नमस्ते {{name}},\nआपकी नियुक्ति {{doctorName}} के साथ {{date}} को {{time}} पर पुष्टि की गई है।' },
        isActive: true,
      },
      {
        event: 'appointmentReminder',
        language: 'en',
        contentType: 'text',
        content: { text: 'Hi {{name}}, reminder: your appointment with {{doctorName}} is coming up on {{date}} at {{time}}. Please arrive 5 minutes early.' },
        isActive: true,
      },
      {
        event: 'appointmentReminder',
        language: 'hi',
        contentType: 'text',
        content: { text: 'नमस्ते {{name}},\nआपकी {{doctorName}} के साथ नियुक्ति {{date}} को {{time}} पर है। कृपया 5 मिनट पहले आएं।' },
        isActive: true,
      },
      {
        event: 'appointmentRescheduled',
        language: 'en',
        contentType: 'text',
        content: { text: 'Hi {{name}}, your appointment with {{doctorName}} has been rescheduled to {{date}} at {{time}}. Please confirm your availability.' },
        isActive: true,
      },
      {
        event: 'appointmentRescheduled',
        language: 'hi',
        contentType: 'text',
        content: { text: 'नमस्ते {{name}},\nआपकी {{doctorName}} के साथ नियुक्ति {{date}} को {{time}} पर स्थगित कर दी गई है। कृपया अपनी उपलब्धता की पुष्टि करें।' },
        isActive: true,
      },
    ];

    for (const template of templates) {
      const existing = await WhatsAppTemplate.findOne({ event: template.event, language: template.language });
      if (!existing) {
        await WhatsAppTemplate.create(template);
        console.log(`  ✅ Created template: ${template.event} (${template.language})`);
      } else {
        console.log(`  ⏭️  Template already exists: ${template.event} (${template.language})`);
      }
    }

    console.log('\n✅ WhatsApp setup complete!');
    console.log('📝 Note: You can now configure messages in the WhatsApp settings page.');
    console.log('💡 Supported events: appointmentBooked, appointmentReminder, appointmentRescheduled, treatmentCompleted, feedbackMessage, postCare');

  } catch (err) {
    console.error('❌ Setup failed:', err);
  } finally {
    await tenantConn.close();
    process.exit(0);
  }
}

main();
