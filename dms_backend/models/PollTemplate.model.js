import mongoose from 'mongoose';



export const PollTemplateSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },

    // Poll question/name
    name: { type: String, required: true },

    // Poll options — MUST have 5 options starting with 1-5
    // e.g., ["1 - Very Unhappy", "2 - Unhappy", "3 - Neutral", "4 - Happy", "5 - Very Happy"]
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => arr.length === 5 && /^[1-5]\s-/.test(arr[0]) && /^[1-5]\s-/.test(arr[4]),
        message: 'Options must contain exactly 5 items starting with "1 -", "2 -", "3 -", "4 -", "5 -"',
      },
    },

    // When to send poll relative to appointment completion (in minutes)
    // e.g., 15 = send 15 minutes after appointment completion
    sendDelayMinutes: { type: Number, default: 15, min: 0 },



    // Whether this template is active
    isActive: { type: Boolean, default: true },

    // Message type for DMS
    messageType: { type: String, default: 'feedbackMessage' },

    // Content type for DMS (poll question)
    contentType: { type: String, default: 'poll' },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PollTemplateSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model('PollTemplate', PollTemplateSchema);
