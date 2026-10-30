const mongoose = require('mongoose');

const commandHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    server: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true },
    command: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

commandHistorySchema.index({ user: 1, server: 1, createdAt: -1 });

module.exports = mongoose.model('CommandHistory', commandHistorySchema);
