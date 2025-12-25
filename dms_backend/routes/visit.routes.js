import express from "express";
import {
  createVisit,
  getVisits,
  getVisitById
} from "../controllers/visit.controller.js";

const router = express.Router();

router.post("/", createVisit);
router.get("/", getVisits);
router.get("/:id", getVisitById);

export default router;
