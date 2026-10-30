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

module.exports = { openShell, writeToShell, resizeShell, closeShell };
