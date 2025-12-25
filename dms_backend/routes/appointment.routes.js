import express from "express";
import {
  createAppointment,
  getAppointments,
  updateAppointmentStatus
} from "../controllers/appointment.controller.js";

const router = express.Router();

router.post("/", createAppointment);
router.get("/", getAppointments);
router.patch("/:id/status", updateAppointmentStatus);

export default router;
