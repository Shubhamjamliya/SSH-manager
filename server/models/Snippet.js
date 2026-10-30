const mongoose = require('mongoose');

const snippetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    command: { type: String, required: true },
    scope: { type: String, enum: ['private', 'team'], default: 'private' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

snippetSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    command: this.command,
    scope: this.scope,
    owner: this.owner,
  };
};

module.exports = mongoose.model('Snippet', snippetSchema);
