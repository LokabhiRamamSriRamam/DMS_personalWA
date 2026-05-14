import mongoose from 'mongoose';
import { getAnalyticsDb } from '../config/analyticsDb.js';
import { getTenantConnection } from '../config/tenantDb.js';
import { getTenantModels } from '../config/tenantModels.js';

/**
 * Resolves a tenant from :tenantId URL param (no JWT required).
 * Used exclusively for public booking routes.
 */
export async function resolvePublicTenant(req, res, next) {
  try {
    const { tenantId } = req.params;
    if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({ message: 'Invalid clinic ID' });
    }

    const analyticsDb = getAnalyticsDb();
    const tenant = await analyticsDb.collection('tenants').findOne({
      _id: new mongoose.Types.ObjectId(tenantId),
    });

    if (!tenant) return res.status(404).json({ message: 'Clinic not found' });
    if (!tenant.mongoUri || !tenant.mongoDbName) {
      return res.status(500).json({ message: 'Clinic configuration is incomplete' });
    }

    const conn = await getTenantConnection(tenant.mongoUri, tenant.mongoDbName);
    req.tenantModels  = getTenantModels(conn);
    req.tenantName    = tenant.name || '';
    req.tenantId      = tenantId;
    next();
  } catch (err) {
    console.error('[resolvePublicTenant]', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
}
