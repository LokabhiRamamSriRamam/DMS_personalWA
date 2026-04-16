import mongoose from 'mongoose';
import { getAnalyticsDb } from '../config/analyticsDb.js';

/**
 * Logs a DMS event to the analytics dashboard's dms_activity_logs collection.
 * Call this from controllers after key actions.
 * Failures are logged but do NOT throw — analytics should never break the main flow.
 *
 * @param {string} tenantId - The tenant's ObjectId as string
 * @param {string} eventType - e.g. 'appointment_created', 'invoice_paid', 'patient_registered', 'user_login'
 * @param {object} data - Extra data to store with the event (keep small)
 */
export async function logEvent(tenantId, eventType, data = {}) {
  try {
    const analyticsDb = getAnalyticsDb();
    await analyticsDb.collection('dms_activity_logs').insertOne({
      tenantId:  new mongoose.Types.ObjectId(tenantId),
      product:   'dms',
      eventType,
      data,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[analyticsLogger] Failed to log event:', eventType, err.message);
    // Do NOT re-throw — analytics logging must never break the main request
  }
}
