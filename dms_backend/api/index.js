import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Configurations
import { connectAnalyticsDb } from "../config/analyticsDb.js";

// Middleware
import { authenticate } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/resolveTenant.js';

// Routes
import patientRoutes from "../routes/patient.routes.js";
import visitRoutes from "../routes/visit.routes.js";
import appointmentRoutes from "../routes/appointment.routes.js";
import inventoryRoutes from "../routes/inventory.routes.js";
import invoiceRoutes from "../routes/invoice.routes.js";
import labRoutes from '../routes/lab.routes.js';
import userRoutes from '../routes/user.routes.js';
import doctorRoutes from '../routes/doctor.routes.js';
import clinicalFindingRoutes from '../routes/clinicalFinding.routes.js';
import diagnosisRoutes from '../routes/diagnosis.routes.js';
import suggestedTreatmentRoutes from '../routes/suggestedTreatment.routes.js';
import vendorRoutes from '../routes/vendor.routes.js';
import serviceRoutes from '../routes/services.routes.js';
import fileRoutes from '../routes/files.js';
import transcribeRoutes from '../routes/transcribe.routes.js';
import reportRoutes from '../routes/report.routes.js';
import analyticsRoutes from '../routes/analytics.routes.js';
import feedbackRoutes from '../routes/feedback.routes.js';

dotenv.config();

const app = express();

// Basic Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", uptime: process.uptime() });
});

// Authentication & Public Routes
app.use('/api/users', userRoutes);

// Webhook Routes (public, no auth required)

// Multi-Tenant Aware Routes
const tenantStack = [authenticate, resolveTenant];

app.use("/api/patients",     tenantStack, patientRoutes);
app.use("/api/visits",       tenantStack, visitRoutes);
app.use("/api/appointments", tenantStack, appointmentRoutes);
app.use("/api/inventory",    tenantStack, inventoryRoutes);
app.use("/api",              tenantStack, invoiceRoutes);
app.use('/api/labs',         tenantStack, labRoutes);
app.use('/api/doctors',              tenantStack, doctorRoutes);
app.use('/api/clinical-findings',    tenantStack, clinicalFindingRoutes);
app.use('/api/diagnoses',            tenantStack, diagnosisRoutes);
app.use('/api/suggested-treatments', tenantStack, suggestedTreatmentRoutes);
app.use('/api/vendors',              tenantStack, vendorRoutes);
app.use('/api/services',             tenantStack, serviceRoutes);
app.use('/api/files',                tenantStack, fileRoutes);
app.use('/api/transcribe',           tenantStack, transcribeRoutes);
app.use('/api/report',               tenantStack, reportRoutes);
app.use('/api/analytics',            tenantStack, analyticsRoutes);
app.use('/api/feedback',             tenantStack, feedbackRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Global Error Path]:', req.path, err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

// Lazy database connection — connects on first request, cached for warm invocations
let dbConnected = false;

app.use(async (req, res, next) => {
  if (!dbConnected) {
    try {
      await connectAnalyticsDb();
      dbConnected = true;
    } catch (err) {
      console.error('❌ Analytics DB connection failed:', err.message);
      return res.status(503).json({ error: 'Database unavailable' });
    }
  }
  next();
});

export default app;
