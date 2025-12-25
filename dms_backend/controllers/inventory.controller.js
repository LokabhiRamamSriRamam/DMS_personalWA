import Inventory from "../models/Inventory.model.js";

export const createInventoryItem = async (req, res) => {
  const item = await Inventory.create(req.body);
  res.status(201).json(item);
};

export const getInventory = async (req, res) => {
  const items = await Inventory.find();
  res.json(items);
};

export const updateInventory = async (req, res) => {
  const item = await Inventory.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(item);
};
