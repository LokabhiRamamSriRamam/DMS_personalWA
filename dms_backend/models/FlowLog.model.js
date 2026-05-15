import mongoose from 'mongoose';

export const FlowLogSchema = new mongoose.Schema({
  flowId:       { type: mongoose.Schema.Types.ObjectId, ref: 'ChatbotFlow' },
  flowName:     { type: String, default: '' },
  triggerType:  { type: String },
  phone:        { type: String, index: true },
  status: {
    type: String,
    enum: [
      // Trigger-level (one per triggerFlow call)
      'success',
      'no_matching_flow',
      'no_session_api_key',
      'invalid_phone',
      'duplicate_session_skipped',
      'no_root_node',
      'error',
      // Node-level (one per executeNode that fires a send or schedules)
      'message_sent',
      'message_failed',
      'message_scheduled',
      // Legacy
      'send_failed',
    ],
    required: true,
  },
  nodeId:       { type: String, default: '' },
  messageType:  { type: String, default: '' }, // text/image/video/document/audio/poll/location
  scheduledFor: { type: Date },                // populated when status='message_scheduled'
  error:        { type: String, default: '' },
  templateData: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt:    { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }, // TTL 30 days
});

FlowLogSchema.index({ flowId: 1, createdAt: -1 });
FlowLogSchema.index({ status: 1, createdAt: -1 });
FlowLogSchema.index({ triggerType: 1, createdAt: -1 });
