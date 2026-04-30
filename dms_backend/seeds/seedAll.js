import dotenv from 'dotenv';
import { seedClinicalData } from './clinicalData.seed.js';

dotenv.config();

async function runSeeds() {
  // Get your tenant's MongoDB URI and database name
  // For this example, we're using the test database
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dental-clinic';
  const dbName = 'test'; // Replace with your actual tenant database name

  console.log(`🌱 Starting seed process for database: ${dbName}`);
  console.log(`📍 Connecting to: ${mongoUri}\n`);

  try {
    await seedClinicalData(mongoUri, dbName);
    console.log('\n✅ All seeds completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeding failed:', err);
    process.exit(1);
  }
}

runSeeds();
