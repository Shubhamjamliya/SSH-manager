const mongoose = require('mongoose');

// Grants a member standing access to ALL of owner's servers (current and future),
// as opposed to Server.sharedWith which grants access to one server at a time.
const vaultAccessSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

vaultAccessSchema.index({ owner: 1, member: 1 }, { unique: true });

module.exports = mongoose.model('VaultAccess', vaultAccessSchema);
