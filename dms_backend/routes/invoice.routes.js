import express from "express";
import {
  createInvoice,
  getInvoices,
  getInvoiceById
} from "../controllers/invoice.controller.js";

const router = express.Router();

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);

export default router;
