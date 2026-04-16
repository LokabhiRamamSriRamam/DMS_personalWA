import mongoose from 'mongoose';
import { getAnalyticsDb } from '../config/analyticsDb.js';
import { getTenantConnection } from '../config/tenantDb.js';
import { getTenantModels } from '../config/tenantModels.js';

export async function resolveTenant(req, res, next) {
  try {
    const { tenantId } = req.user;

    if (!tenantId) {
      return res.status(403).json({ message: 'User is not assigned to a clinic (No tenantId)' });
    }

    const analyticsDb = getAnalyticsDb();
    
    // 1. Fetch Tenant Configuration 
    // JWT tenantId is a string, must convert to ObjectId for _id lookup
    const tenant = await analyticsDb.collection('tenants').findOne({ 
      _id: new mongoose.Types.ObjectId(tenantId) 
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Clinic configuration not found. Contact administration.' });
    }

    if (!tenant.mongoUri || !tenant.mongoDbName) {
      return res.status(500).json({ message: 'Clinic database configuration is incomplete.' });
    }

    // 2. Resolve/Reuse Database Connection
    const tenantConn = await getTenantConnection(tenant.mongoUri, tenant.mongoDbName);

    // 3. Attach Context to Request
    req.tenantModels = getTenantModels(tenantConn);

    // Inject sensitive credentials (Google, API Keys)
    req.tenantConfig = {
      clientId:        tenant.googleClientId,
      clientSecret:    tenant.googleClientSecret,
      refreshToken:    tenant.googleRefreshToken,
      driveFolderId:   tenant.googleDriveFolderId, // Correct field name
      sarvamApiKey:    tenant.sarvamApiKey,
      nvidiaApiKey:    tenant.nvidiaApiKey,
    };

    next();
  } catch (err) {
    console.error('[resolveTenant] Error:', err.message);
    res.status(500).json({ message: 'Internal Server Error during tenant resolution.' });
  }
}
