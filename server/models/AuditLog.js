const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    server: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true },
    action: {
      type: String,
      enum: ['connect', 'disconnect', 'connect_failed', 'deploy_started', 'deploy_finished', 'deploy_failed'],
      required: true,
    },
    detail: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
