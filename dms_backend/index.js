import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Routes
import patientRoutes from "./routes/patient.routes.js";
import visitRoutes from "./routes/visit.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", uptime: process.uptime() });
});

// API Routes
app.use("/api/patients", patientRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/invoices", invoiceRoutes);

// Global error handler (optional but recommended)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Internal Server Error"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
