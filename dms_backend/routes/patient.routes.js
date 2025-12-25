import express from "express";
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient
} from "../controllers/patient.controller.js";

const router = express.Router();

router.post("/", createPatient);
router.get("/", getPatients);
router.get("/:id", getPatientById);
router.put("/:id", updatePatient);

export default router;
