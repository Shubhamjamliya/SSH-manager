const VaultAccess = require('../models/VaultAccess');
const User = require('../models/User');

async function listVaultMembers(req, res) {
  const grants = await VaultAccess.find({ owner: req.user._id }).populate('member', 'name email');
  res.json({
    members: grants.map((g) => ({ id: g.member._id, name: g.member.name, email: g.member.email })),
  });
}

async function grantVaultAccess(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required' });

  const member = await User.findOne({ email: email.toLowerCase() });
  if (!member) return res.status(404).json({ message: 'No account found with that email' });
  if (String(member._id) === String(req.user._id)) {
    return res.status(400).json({ message: "You can't share your vault with yourself" });
  }

  await VaultAccess.findOneAndUpdate(
    { owner: req.user._id, member: member._id },
    { owner: req.user._id, member: member._id },
    { upsert: true }
  );

  res.status(201).json({ member: { id: member._id, name: member.name, email: member.email } });
}

async function revokeVaultAccess(req, res) {
  await VaultAccess.deleteOne({ owner: req.user._id, member: req.params.memberId });
  res.json({ message: 'Access revoked' });
}

module.exports = { listVaultMembers, grantVaultAccess, revokeVaultAccess };
