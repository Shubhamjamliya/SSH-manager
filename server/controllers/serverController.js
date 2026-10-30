const Server = require('../models/Server');
const User = require('../models/User');
const { encrypt } = require('../utils/crypto');

function canAccess(server, user) {
  if (user.role === 'admin') return true;
  if (String(server.owner) === String(user._id)) return true;
  return server.sharedWith.some((id) => String(id) === String(user._id));
}

async function listServers(req, res) {
  const servers = await Server.find({
    $or: [{ owner: req.user._id }, { sharedWith: req.user._id }],
  }).sort({ group: 1, name: 1 });
  res.json({ servers: servers.map((s) => s.toSafeJSON()) });
}

async function createServer(req, res) {
  const { name, host, port, username, authType, password, privateKey, passphrase, group, sharedWithEmails } =
    req.body;

  if (!name || !host || !username) {
    return res.status(400).json({ message: 'name, host and username are required' });
  }
  if (authType === 'key' && !privateKey) {
    return res.status(400).json({ message: 'privateKey is required for key auth' });
  }
  if (authType !== 'key' && !password) {
    return res.status(400).json({ message: 'password is required for password auth' });
  }

  let sharedWith = [];
  if (Array.isArray(sharedWithEmails) && sharedWithEmails.length > 0) {
    const users = await User.find({ email: { $in: sharedWithEmails.map((e) => e.toLowerCase()) } });
    sharedWith = users.map((u) => u._id);
  }

  const server = await Server.create({
    name,
    host,
    port: port || 22,
    username,
    authType: authType === 'key' ? 'key' : 'password',
    encryptedPassword: authType === 'key' ? undefined : encrypt(password),
    encryptedPrivateKey: authType === 'key' ? encrypt(privateKey) : undefined,
    encryptedPassphrase: authType === 'key' && passphrase ? encrypt(passphrase) : undefined,
    group: group || 'Default',
    owner: req.user._id,
    sharedWith,
  });

  res.status(201).json({ server: server.toSafeJSON() });
}

async function updateServer(req, res) {
  const server = await Server.findById(req.params.id);
  if (!server) return res.status(404).json({ message: 'Server not found' });
  if (!canAccess(server, req.user) || (String(server.owner) !== String(req.user._id) && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Not allowed' });
  }

  const { name, host, port, username, authType, password, privateKey, passphrase, group } = req.body;
  if (name) server.name = name;
  if (host) server.host = host;
  if (port) server.port = port;
  if (username) server.username = username;
  if (group) server.group = group;
  if (authType) server.authType = authType === 'key' ? 'key' : 'password';
  if (password) {
    server.encryptedPassword = encrypt(password);
    server.encryptedPrivateKey = undefined;
    server.encryptedPassphrase = undefined;
  }
  if (privateKey) {
    server.encryptedPrivateKey = encrypt(privateKey);
    server.encryptedPassphrase = passphrase ? encrypt(passphrase) : undefined;
    server.encryptedPassword = undefined;
  }

  await server.save();
  res.json({ server: server.toSafeJSON() });
}

async function getServerAccess(req, res) {
  const server = await Server.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('sharedWith', 'name email');
  if (!server) return res.status(404).json({ message: 'Server not found' });
  if (!canAccess(server, req.user)) return res.status(403).json({ message: 'Not allowed' });

  res.json({
    owner: { id: server.owner._id, name: server.owner.name, email: server.owner.email },
    sharedWith: server.sharedWith.map((u) => ({ id: u._id, name: u.name, email: u.email })),
  });
}

async function updateServerAccess(req, res) {
  const server = await Server.findById(req.params.id);
  if (!server) return res.status(404).json({ message: 'Server not found' });
  if (String(server.owner) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not allowed' });
  }

  const { emails } = req.body;
  if (!Array.isArray(emails)) return res.status(400).json({ message: 'emails must be an array' });

  const users = await User.find({ email: { $in: emails.map((e) => e.toLowerCase()) } });
  server.sharedWith = users.map((u) => u._id);
  await server.save();

  res.json({ sharedWith: users.map((u) => ({ id: u._id, name: u.name, email: u.email })) });
}

async function deleteServer(req, res) {
  const server = await Server.findById(req.params.id);
  if (!server) return res.status(404).json({ message: 'Server not found' });
  if (String(server.owner) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not allowed' });
  }
  await server.deleteOne();
  res.json({ message: 'Deleted' });
}

module.exports = {
  listServers,
  createServer,
  updateServer,
  deleteServer,
  canAccess,
  getServerAccess,
  updateServerAccess,
};
