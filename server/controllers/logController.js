const AuditLog = require('../models/AuditLog');

async function listLogs(req, res) {
  const filter = req.user.role === 'admin' ? {} : { user: req.user._id };

  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('server', 'name host')
    .populate('user', 'name email');

  res.json({
    logs: logs.map((log) => ({
      id: log._id,
      action: log.action,
      detail: log.detail,
      createdAt: log.createdAt,
      server: log.server ? { id: log.server._id, name: log.server.name, host: log.server.host } : null,
      user: log.user ? { id: log.user._id, name: log.user.name } : null,
    })),
  });
}

module.exports = { listLogs };
