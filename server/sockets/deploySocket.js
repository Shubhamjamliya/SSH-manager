const ServerModel = require('../models/Server');
const { decrypt } = require('../utils/crypto');
const { connect, execCommand } = require('../services/sshService');
const { canAccess } = require('../controllers/serverController');
const { buildDeploymentSteps } = require('../services/deploymentSteps');
const { logAudit } = require('../services/auditService');

// Deploy runs are separate from terminal sessions: one bare SSH connection per run,
// used only for sequential exec() calls (no PTY), closed when the run ends or is stopped.
function registerDeploySocket(io) {
  io.on('connection', (socket) => {
    const activeRuns = new Map(); // runId -> { conn, stopped }

    socket.on('deploy:start', async ({ runId, serverId, params }) => {
      if (activeRuns.has(runId)) return;

      let server;
      try {
        server = await ServerModel.findById(serverId);
        if (!server || !(await canAccess(server, socket.user))) {
          socket.emit('deploy:error', { runId, message: 'Not allowed to deploy to this server' });
          return;
        }
      } catch (err) {
        socket.emit('deploy:error', { runId, message: err.message });
        return;
      }

      const { steps } = buildDeploymentSteps(params || {});
      socket.emit('deploy:plan', { runId, steps: steps.map((s) => s.label) });

      const run = { conn: null, stopped: false };
      activeRuns.set(runId, run);

      await logAudit({ user: socket.user._id, server: server._id, action: 'deploy_started' }).catch(() => {});

      try {
        const credentials =
          server.authType === 'key'
            ? {
                privateKey: decrypt(server.encryptedPrivateKey),
                passphrase: server.encryptedPassphrase ? decrypt(server.encryptedPassphrase) : undefined,
              }
            : { password: decrypt(server.encryptedPassword) };

        const conn = await connect({
          host: server.host,
          port: server.port,
          username: server.username,
          ...credentials,
        });
        run.conn = conn;

        for (let i = 0; i < steps.length; i++) {
          if (run.stopped) break;
          const step = steps[i];
          socket.emit('deploy:step-start', { runId, index: i, label: step.label });

          try {
            const result = await execCommand(conn, step.command);
            const ok = result.code === 0;
            socket.emit('deploy:step-done', {
              runId,
              index: i,
              ok,
              code: result.code,
              output: (result.stdout || '') + (result.stderr || ''),
            });

            if (!ok && !step.continueOnError) {
              socket.emit('deploy:failed', { runId, index: i, message: `Step failed with exit code ${result.code}` });
              await logAudit({
                user: socket.user._id,
                server: server._id,
                action: 'deploy_failed',
                detail: step.label,
              }).catch(() => {});
              conn.end();
              activeRuns.delete(runId);
              return;
            }
          } catch (stepErr) {
            socket.emit('deploy:step-done', { runId, index: i, ok: false, output: stepErr.message });
            socket.emit('deploy:failed', { runId, index: i, message: stepErr.message });
            await logAudit({
              user: socket.user._id,
              server: server._id,
              action: 'deploy_failed',
              detail: stepErr.message,
            }).catch(() => {});
            conn.end();
            activeRuns.delete(runId);
            return;
          }
        }

        conn.end();
        activeRuns.delete(runId);

        if (run.stopped) {
          socket.emit('deploy:stopped', { runId });
        } else {
          socket.emit('deploy:complete', { runId });
          await logAudit({ user: socket.user._id, server: server._id, action: 'deploy_finished' }).catch(() => {});
        }
      } catch (err) {
        socket.emit('deploy:error', { runId, message: err.message });
        activeRuns.delete(runId);
      }
    });

    socket.on('deploy:stop', ({ runId }) => {
      const run = activeRuns.get(runId);
      if (!run) return;
      run.stopped = true;
      if (run.conn) run.conn.end();
    });

    socket.on('disconnect', () => {
      for (const run of activeRuns.values()) {
        run.stopped = true;
        if (run.conn) run.conn.end();
      }
      activeRuns.clear();
    });
  });
}

module.exports = registerDeploySocket;
