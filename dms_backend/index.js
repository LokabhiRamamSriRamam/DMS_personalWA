import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";

// Configurations
import { connectAnalyticsDb } from "./config/analyticsDb.js";

// Middleware
import { authenticate } from './middleware/auth.js';
import { resolveTenant } from './middleware/resolveTenant.js';

// Routes
import patientRoutes from "./routes/patient.routes.js";
import visitRoutes from "./routes/visit.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import labRoutes from './routes/lab.routes.js';
import userRoutes from './routes/user.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import clinicalFindingRoutes from './routes/clinicalFinding.routes.js';
import diagnosisRoutes from './routes/diagnosis.routes.js';
import suggestedTreatmentRoutes from './routes/suggestedTreatment.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import serviceRoutes from './routes/services.routes.js';
import fileRoutes from './routes/files.js';
import transcribeRoutes from './routes/transcribe.routes.js';
import reportRoutes from './routes/report.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import emailRoutes from './routes/email.routes.js';
import { startAppointmentStatusJob } from './services/appointmentStatusJob.js';
import { handleWebhook } from './controllers/wasender.controller.js';
import wasenderRoutes from './routes/wasender.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';
import { startScheduledMessageJob } from './services/scheduledMessageJob.js';
import bookingRoutes  from './routes/booking.routes.js';
import settingsRoutes from './routes/settings.routes.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Socket.io — used to push webhook events (QR update, session status) to frontend in real-time
export const io = new SocketIO(httpServer, {
  cors: { origin: '*' },
});
io.on('connection', socket => {
  const { tenantId } = socket.handshake.query;
  if (tenantId) socket.join(`tenant:${tenantId}`);
});

// Basic Middleware
app.use(cors());
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; }, // preserve raw bytes for HMAC verification
}));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", uptime: process.uptime() });
});

// Authentication & Public Routes
app.use('/api/users', userRoutes);

// WaSender webhook (public — no auth)
// Tenant-scoped URL is the deterministic path; the legacy bare URL is kept
// for sessions registered before tenant-scoped URLs existed.
app.post('/api/wasender/webhook/:tenantId', handleWebhook);
app.post('/api/wasender/webhook', handleWebhook);

// Webhook Routes (public, no auth required)

// Multi-Tenant Aware Routes
// resolveTenant must come AFTER authenticate because it relies on req.user.tenantId
const tenantStack = [authenticate, resolveTenant];

// Public booking routes (no auth — must be BEFORE the catch-all /api mount)
app.use('/api/public/:tenantId/booking', bookingRoutes);

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
app.use('/api/email',                tenantStack, emailRoutes);
app.use('/api/wasender',             tenantStack, wasenderRoutes);
app.use('/api/chatbot',              tenantStack, chatbotRoutes);
app.use('/api/settings',             tenantStack, settingsRoutes);



// Global error handler
app.use((err, req, res, next) => {
  console.error('[Global Error Path]:', req.path, err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

// Connect to Analytics DB before starting the server
async function startServer() {
  try {
    await connectAnalyticsDb();
    httpServer.listen(PORT, () => {
      console.log(`🚀 DMS Multi-Tenant Backend running on port ${PORT}`);
      // Start background appointment status transitions
      startAppointmentStatusJob();
      // Start scheduled WaSender message job
      startScheduledMessageJob();
    });
  } catch (err) {
    console.error('❌ PANIC: Could not connect to Analytics DB. Server aborted.', err.message);
    process.exit(1);
  }
}

startServer();
