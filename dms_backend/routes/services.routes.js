import mongoose from "mongoose";
import express from "express";
import {getServices, createService, updateService} from "../controllers/services.controller.js";
const router = express.Router();

// --- SERVICE ROUTES ---
router.get("/", getServices);               // Get all active services
router.post("/", createService);            // Create new service
router.put("/:id", updateService);          // Update existing service

export default router;