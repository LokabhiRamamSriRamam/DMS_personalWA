import mongoose from 'mongoose';

const pool = new Map();

/**
 * Gets or creates a connection to a specific tenant's database.
 * @param {string} mongoUri
 * @param {string} mongoDbName
 */
export async function getTenantConnection(mongoUri, mongoDbName) {
  const cacheKey = `${mongoUri}|${mongoDbName}`;

  if (pool.has(cacheKey)) {
    const conn = pool.get(cacheKey);
    // Ensure the connection is still open or opening
    if (conn.readyState === 1 || conn.readyState === 2) {
      return conn;
    }
  }

  // Create new connection if it doesn't exist or was closed
  const conn = await mongoose.createConnection(mongoUri, { 
    dbName: mongoDbName, 
    autoIndex: true 
  }).asPromise();
  
  pool.set(cacheKey, conn);

  conn.on('disconnected', () => {
    console.log(`[TenantDB] Disconnected: ${cacheKey}`);
    pool.delete(cacheKey);
  });

  conn.on('error', (err) => {
    console.error(`[TenantDB] Error on ${cacheKey}:`, err.message);
    pool.delete(cacheKey);
  });

  return conn;
}
