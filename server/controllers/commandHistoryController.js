const CommandHistory = require('../models/CommandHistory');
const Server = require('../models/Server');
const { canAccess } = require('./serverController');

async function listCommandHistory(req, res) {
  const { serverId } = req.query;
  if (!serverId) return res.status(400).json({ message: 'serverId query param is required' });

  const server = await Server.findById(serverId);
  if (!server || !(await canAccess(server, req.user))) {
    return res.status(403).json({ message: 'Not allowed' });
  }

  const history = await CommandHistory.find({ user: req.user._id, server: serverId })
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ history: history.map((h) => ({ id: h._id, command: h.command, createdAt: h.createdAt })) });
}

module.exports = { listCommandHistory };
