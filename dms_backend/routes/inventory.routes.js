import express from "express";
import {
  createInventoryItem,
  getInventory,
  updateInventory
} from "../controllers/inventory.controller.js";

const router = express.Router();

router.post("/", createInventoryItem);
router.get("/", getInventory);
router.put("/:id", updateInventory);

export default router;
