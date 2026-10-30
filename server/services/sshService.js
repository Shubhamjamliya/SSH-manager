const { Client } = require('ssh2');

/**
 * Opens an interactive SSH shell (PTY) and wires it to callbacks.
 * Returns the ssh2 Client + stream so the caller can write input and end the session.
 */
function openShell(
  { host, port, username, password, privateKey, passphrase, cols, rows },
  { onData, onStatus, onClose, onError }
) {
  const conn = new Client();

  conn.on('ready', () => {
    onStatus('connected');
    conn.shell({ cols: cols || 80, rows: rows || 24, term: 'xterm-256color' }, (err, stream) => {
      if (err) {
        onError(err.message);
        conn.end();
        return;
      }

      stream.on('data', (data) => onData(data.toString('utf8')));
      stream.stderr.on('data', (data) => onData(data.toString('utf8')));
      stream.on('close', () => {
        conn.end();
      });

      conn._shellStream = stream;
    });
  });

  conn.on('error', (err) => {
    onError(err.message);
  });

  conn.on('close', () => {
    onStatus('disconnected');
    onClose();
  });

  conn.connect({
    host,
    port: port || 22,
    username,
    ...(privateKey ? { privateKey, passphrase: passphrase || undefined } : { password }),
    readyTimeout: 15000,
    keepaliveInterval: 10000,
  });

  return conn;
}

function writeToShell(conn, data) {
  if (conn && conn._shellStream) conn._shellStream.write(data);
}

function resizeShell(conn, cols, rows) {
  if (conn && conn._shellStream) conn._shellStream.setWindow(rows, cols, 0, 0);
}

function closeShell(conn) {
  if (!conn) return;
  try {
    if (conn._shellStream) conn._shellStream.end();
    conn.end();
  } catch (_err) {
    // connection already closed
  }
}

/**
 * Opens a bare SSH connection (no PTY/shell) for running discrete exec() commands,
 * used by the deployment runner to execute one command at a time and capture its result.
 */
function connect({ host, port, username, password, privateKey, passphrase }) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn));
    conn.on('error', (err) => reject(err));
    conn.connect({
      host,
      port: port || 22,
      username,
      ...(privateKey ? { privateKey, passphrase: passphrase || undefined } : { password }),
      readyTimeout: 20000,
      keepaliveInterval: 10000,
    });
  });
}

function execCommand(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', (data) => {
        stdout += data.toString('utf8');
      });
      stream.stderr.on('data', (data) => {
        stderr += data.toString('utf8');
      });
      stream.on('close', (code) => {
        resolve({ code: code ?? 0, stdout, stderr });
      });
      stream.on('error', (streamErr) => reject(streamErr));
    });
  });
}

module.exports = { openShell, writeToShell, resizeShell, closeShell, connect, execCommand };
