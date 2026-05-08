import mongoose from 'mongoose';

export const InventorySettingsSchema = new mongoose.Schema(
  {
    medicineEnabled: {
      type: Boolean,
      default: true,
    },
    consumableEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);
