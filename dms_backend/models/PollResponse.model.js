import mongoose from 'mongoose';

export const PollResponseSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    messageId: { type: String, required: true, index: true },
    from: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedbackType: {
      type: String,
      enum: ['excellent', 'good', 'neutral', 'poor', 'very_poor'],
      required: true,
    },
    selectedOption: { type: String, required: true },
    pollQuestion: { type: String, required: true },
    respondedAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('PollResponse', PollResponseSchema);
