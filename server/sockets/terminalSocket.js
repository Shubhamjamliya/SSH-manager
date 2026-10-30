const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ServerModel = require('../models/Server');
const AuditLog = require('../models/AuditLog');
const CommandHistory = require('../models/CommandHistory');
const { decrypt } = require('../utils/crypto');
const { openShell, writeToShell, resizeShell, closeShell } = require('../services/sshService');
const { canAccess } = require('../controllers/serverController');

// One SSH connection per socket per terminal tab (sessionId)
function registerTerminalSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Not authenticated'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user) return next(new Error('Not authenticated'));
      socket.user = user;
      next();
    } catch (_err) {
      next(new Error('Not authenticated'));
    }
  });

  io.on('connection', (socket) => {
    const sessions = new Map(); // sessionId -> ssh2 Client
    const commandBuffers = new Map(); // sessionId -> in-progress command line
    const sessionServerIds = new Map(); // sessionId -> serverId, for history logging

    socket.on('terminal:connect', async ({ sessionId, serverId, cols, rows }) => {
      try {
        const server = await ServerModel.findById(serverId);
        if (!server || !(await canAccess(server, socket.user))) {
          socket.emit('terminal:error', { sessionId, message: 'Not allowed to access this server' });
          return;
        }

        const credentials =
          server.authType === 'key'
            ? {
                privateKey: decrypt(server.encryptedPrivateKey),
                passphrase: server.encryptedPassphrase ? decrypt(server.encryptedPassphrase) : undefined,
              }
            : { password: decrypt(server.encryptedPassword) };

        sessionServerIds.set(sessionId, server._id);
        commandBuffers.set(sessionId, '');

        const conn = openShell(
          { host: server.host, port: server.port, username: server.username, ...credentials, cols, rows },
          {
            onData: (data) => socket.emit('terminal:data', { sessionId, data }),
            onStatus: (status) => socket.emit('terminal:status', { sessionId, status }),
            onError: (message) => socket.emit('terminal:error', { sessionId, message }),
            onClose: () => {
              sessions.delete(sessionId);
              commandBuffers.delete(sessionId);
              sessionServerIds.delete(sessionId);
              socket.emit('terminal:status', { sessionId, status: 'disconnected' });
            },
          }
        );

        sessions.set(sessionId, conn);
        await AuditLog.create({ user: socket.user._id, server: server._id, action: 'connect' });
      } catch (err) {
        socket.emit('terminal:error', { sessionId, message: err.message });
        await AuditLog.create({
          user: socket.user._id,
          server: serverId,
          action: 'connect_failed',
          detail: err.message,
        }).catch(() => {});
      }
    });

    socket.on('terminal:input', ({ sessionId, data }) => {
      writeToShell(sessions.get(sessionId), data);
      trackCommandBuffer(sessionId, data);
    });

    // Best-effort command history: accumulates raw keystrokes into a line buffer and
    // flushes to CommandHistory on Enter. Arrow-key/line-edit sequences are not fully
    // reconstructed — this captures the common case of typing a command and pressing Enter.
    function trackCommandBuffer(sessionId, data) {
      if (!commandBuffers.has(sessionId)) return;
      let buffer = commandBuffers.get(sessionId);

      for (const char of data) {
        const code = char.charCodeAt(0);
        if (code === 13 || code === 10) {
          const command = buffer.trim();
          buffer = '';
          if (command) {
            const serverId = sessionServerIds.get(sessionId);
            if (serverId) {
              CommandHistory.create({ user: socket.user._id, server: serverId, command }).catch(() => {});
            }
          }
        } else if (code === 127 || code === 8) {
          buffer = buffer.slice(0, -1);
        } else if (code >= 32) {
          buffer += char;
        }
      }

      commandBuffers.set(sessionId, buffer);
    }

    socket.on('terminal:resize', ({ sessionId, cols, rows }) => {
      resizeShell(sessions.get(sessionId), cols, rows);
    });

    socket.on('terminal:close', ({ sessionId }) => {
      closeShell(sessions.get(sessionId));
      sessions.delete(sessionId);
      commandBuffers.delete(sessionId);
      sessionServerIds.delete(sessionId);
    });

    socket.on('disconnect', () => {
      for (const conn of sessions.values()) closeShell(conn);
      sessions.clear();
      commandBuffers.clear();
      sessionServerIds.clear();
    });
  });
}

module.exports = registerTerminalSocket;
