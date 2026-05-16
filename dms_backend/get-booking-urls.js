import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

const ANALYTICS_MONGO_URI = process.env.ANALYTICS_MONGO_URI;
const ANALYTICS_MONGO_DB_NAME = process.env.ANALYTICS_MONGO_DB_NAME || 'dms';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function getBookingUrls() {
  let connection;

  try {
    // Connect to analytics database
    console.log('🔌 Connecting to Analytics MongoDB...');
    connection = await mongoose.createConnection(ANALYTICS_MONGO_URI, {
      dbName: ANALYTICS_MONGO_DB_NAME,
      serverSelectionTimeoutMS: 10000,
    }).asPromise();

    console.log('✅ Connected to Analytics DB\n');

    // Fetch all tenants
    const tenantsCollection = connection.collection('tenants');
    const tenants = await tenantsCollection.find({}).toArray();

    if (!tenants.length) {
      console.log('⚠️  No tenants found in the database');
      return;
    }

    console.log(`Found ${tenants.length} tenant(s):\n`);
    console.log('═'.repeat(80));

    // For each tenant, get booking settings and construct URL
    for (const tenant of tenants) {
      const tenantId = tenant._id.toString();
      const clinicName = tenant.clinicName || 'Unknown Clinic';

      // Connect to tenant's database to get booking settings
      const tenantConnection = await mongoose.createConnection(
        tenant.mongoUri,
        {
          dbName: tenant.mongoDbName,
          serverSelectionTimeoutMS: 10000,
        }
      ).asPromise();

      const bookingSettingsCollection = tenantConnection.collection('bookingsettings');
      const bookingSettings = await bookingSettingsCollection.findOne({});

      const isBookingEnabled = bookingSettings?.isBookingEnabled ?? true;
      const clinicDisplayName = bookingSettings?.clinicDisplayName || clinicName;

      // Construct booking URL
      const bookingUrl = `${API_BASE_URL}/api/public/${tenantId}/booking`;

      console.log(`\n📋 Tenant: ${clinicDisplayName}`);
      console.log(`   ID: ${tenantId}`);
      console.log(`   Booking Enabled: ${isBookingEnabled ? '✅ Yes' : '❌ No'}`);
      console.log(`   Booking URL: ${bookingUrl}`);
      console.log(`   Booking Page: ${bookingUrl.replace('/api', '')}`);

      if (bookingSettings) {
        console.log(`   Slot Duration: ${bookingSettings.slotDurationMinutes} minutes`);
        console.log(`   Tagline: ${bookingSettings.clinicTagline || 'N/A'}`);
      }

      await tenantConnection.close();
    }

    console.log('\n' + '═'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.close();
      console.log('\n🔌 Connection closed');
    }
  }
}

getBookingUrls();
