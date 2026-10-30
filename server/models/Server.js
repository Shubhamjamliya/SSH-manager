const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    host: { type: String, required: true, trim: true },
    port: { type: Number, default: 22 },
    username: { type: String, required: true, trim: true },
    authType: { type: String, enum: ['password', 'key'], default: 'password' },
    // All secrets are AES-256-GCM encrypted at rest; decrypted only in-memory when opening an SSH connection
    encryptedPassword: { type: String },
    encryptedPrivateKey: { type: String },
    encryptedPassphrase: { type: String },
    group: { type: String, default: 'Default', trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Team members (besides owner) allowed to connect to this server
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

serverSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    host: this.host,
    port: this.port,
    username: this.username,
    authType: this.authType,
    group: this.group,
    owner: this.owner,
    sharedWith: this.sharedWith,
  };
};

module.exports = mongoose.model('Server', serverSchema);
