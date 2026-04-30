import mongoose from 'mongoose';

let analyticsConnection = null;

export async function connectAnalyticsDb() {
  if (analyticsConnection && (analyticsConnection.readyState === 1 || analyticsConnection.readyState === 2)) {
    return analyticsConnection;
  }

  analyticsConnection = await mongoose.createConnection(process.env.ANALYTICS_MONGO_URI, {
    autoIndex:                false,
    dbName:                   process.env.ANALYTICS_MONGO_DB_NAME || 'dms',
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS:          45000,
    heartbeatFrequencyMS:     300000,
    maxPoolSize:              50,
    minPoolSize:              5,
    retryWrites:              true,
    retryReads:               true,
  }).asPromise();

  analyticsConnection.on('disconnected', () => {
    console.warn('[AnalyticsDB] Disconnected');
    analyticsConnection = null;
  });

  analyticsConnection.on('error', (err) => {
    console.error('[AnalyticsDB] Error:', err.message);
    analyticsConnection = null;
  });

  analyticsConnection.on('disconnected', async () => {
    console.log('[AnalyticsDB] Attempting to reconnect...');
    setTimeout(() => {
      connectAnalyticsDb().catch(err => {
        console.error('[AnalyticsDB] Reconnection failed:', err.message);
      });
    }, 5000);
  });

  console.log('✅ Analytics DB connected:', analyticsConnection.host);
  return analyticsConnection;
}

export function getAnalyticsDb() {
  // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  if (!analyticsConnection || analyticsConnection.readyState === 0 || analyticsConnection.readyState === 3) {
    console.error('[AnalyticsDB] Connection lost, triggering reconnect...');
    connectAnalyticsDb().catch(err => console.error('[AnalyticsDB] Reconnection error:', err.message));
    throw new Error('Analytics DB reconnecting. Retry your request.');
  }
  return analyticsConnection;
}
