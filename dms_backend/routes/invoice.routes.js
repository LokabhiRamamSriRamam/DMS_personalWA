import express from "express";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  recordTransaction,
  getTransactions,
  exportTransactionsPdf
} from "../controllers/invoice.controller.js";

const router = express.Router();

// --- INVOICE ROUTES ---
router.get("/invoices", getInvoices);           // Get all
router.get("/invoices/:id", getInvoiceById);    // Get single
router.post("/invoices", createInvoice);        // Create new
router.put("/invoices/:id", updateInvoice);     // Update manual

// --- TRANSACTION ROUTES ---
router.get("/transactions", getTransactions);   // Get history
router.post("/transactions/export/pdf", exportTransactionsPdf); // PDF export (renders posted rows)
router.post("/transactions", recordTransaction); // Record payment

export default router;