import mongoose from 'mongoose';

let analyticsConnection = null;

export async function connectAnalyticsDb() {
  if (analyticsConnection && analyticsConnection.readyState === 1) {
    return analyticsConnection;
  }

  analyticsConnection = await mongoose.createConnection(process.env.ANALYTICS_MONGO_URI, {
    autoIndex: false,
    dbName: process.env.ANALYTICS_MONGO_DB_NAME || 'dms',
  });

  console.log('✅ Analytics DB connected:', analyticsConnection.host);
  return analyticsConnection;
}

export function getAnalyticsDb() {
  if (!analyticsConnection || analyticsConnection.readyState !== 1) {
    throw new Error('Analytics DB not connected. Ensure connectAnalyticsDb() was called at startup.');
  }
  return analyticsConnection;
}
