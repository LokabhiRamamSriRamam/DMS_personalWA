/**
 * appointmentStatusJob.js
 * ───────────────────────
 * Runs on a 5-minute interval and auto-transitions appointment statuses
 * across EVERY tenant database registered in the Analytics DB:
 *
 *   • Scheduled   → No Show   if start_time was > 24 hours ago
 *   • In Progress → Completed if start_time was > 10 hours ago
 *
 * Does NOT rely on the lazy tenant pool (which is empty until first HTTP
 * request). Instead it fetches all tenant configs from Analytics DB at
 * startup and builds its own direct connections.
 */

import mongoose from 'mongoose';
import { getAnalyticsDb } from '../config/analyticsDb.js';
import { getTenantConnection } from '../config/tenantDb.js';
import { getTenantModels }    from '../config/tenantModels.js';

const JOB_INTERVAL_MS       = 60 * 60 * 1000;     // every 1 hour
const NO_SHOW_THRESHOLD_MS  = 24 * 60 * 60 * 1000; // 24 hours
const COMPLETE_THRESHOLD_MS = 10 * 60 * 60 * 1000; // 10 hours

async function getAllTenantConnections() {
  try {
    const analyticsDb = getAnalyticsDb();
    const tenants = await analyticsDb
      .collection('tenants')
      .find(
        { mongoUri: { $exists: true }, mongoDbName: { $exists: true } },
        { projection: { mongoUri: 1, mongoDbName: 1, _id: 1 } }
      )
      .toArray();

    const connections = [];
    for (const tenant of tenants) {
      try {
        const conn = await getTenantConnection(tenant.mongoUri, tenant.mongoDbName);
        connections.push(conn);
      } catch (err) {
        console.warn(`[AppointmentJob] Could not connect to tenant ${tenant._id}: ${err.message}`);
      }
    }
    return connections;
  } catch (err) {
    console.error('[AppointmentJob] Failed to load tenants:', err.message);
    return [];
  }
}

async function runOneTenant(conn) {
  try {
    const { Appointment } = getTenantModels(conn);
    const now = new Date();

    // ── Scheduled → No Show ──────────────────────────────────────────────────
    const noShowCutoff = new Date(now.getTime() - NO_SHOW_THRESHOLD_MS);
    const noShowResult = await Appointment.updateMany(
      { status: 'Scheduled', start_time: { $lt: noShowCutoff } },
      { $set: { status: 'No Show' } }
    );

    // ── In Progress → Completed ───────────────────────────────────────────────
    const completedCutoff = new Date(now.getTime() - COMPLETE_THRESHOLD_MS);
    const completedResult = await Appointment.updateMany(
      { status: 'In Progress', start_time: { $lt: completedCutoff } },
      { $set: { status: 'Completed' } }
    );

    const changed = noShowResult.modifiedCount + completedResult.modifiedCount;
    if (changed > 0) {
      console.log(
        `[AppointmentJob] ${conn.name || conn.db?.databaseName}: ` +
        `No Show +${noShowResult.modifiedCount}, Completed +${completedResult.modifiedCount}`
      );
    }
  } catch (err) {
    console.error(`[AppointmentJob] Error on conn "${conn.name}":`, err.message);
  }
}

async function runAllTenants() {
  const connections = await getAllTenantConnections();
  for (const conn of connections) {
    if (conn.readyState === 1) {
      await runOneTenant(conn);
    }
  }
}

export function startAppointmentStatusJob() {
  console.log('[AppointmentJob] Started — will run immediately and every 5 minutes.');

  // Run once right away to catch stale appointments from before server start
  runAllTenants().catch(err =>
    console.error('[AppointmentJob] Initial run error:', err.message)
  );

  setInterval(() => {
    runAllTenants().catch(err =>
      console.error('[AppointmentJob] Interval run error:', err.message)
    );
  }, JOB_INTERVAL_MS);
}
