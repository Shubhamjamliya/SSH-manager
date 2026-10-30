const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Fixed port so it can be added once to the backend's CLIENT_ORIGIN allowlist.
const PORT = 51734;
const APP_DIR = path.join(__dirname, 'app');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Serves the pre-built React app locally (not via file://, so React Router's
// history-API navigation and deep links/reloads work correctly) and falls
// back to index.html for any unknown path, as a SPA needs.
function startLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(APP_DIR, urlPath);

      if (!filePath.startsWith(APP_DIR)) {
        res.writeHead(403);
        res.end();
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err || stats.isDirectory()) {
          filePath = path.join(APP_DIR, 'index.html');
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      });
    });

    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

let mainWindow;

async function createWindow() {
  if (!fs.existsSync(path.join(APP_DIR, 'index.html'))) {
    console.error('desktop/app is missing a build. Run `npm run prepare-client` first.');
    app.quit();
    return;
  }

  await startLocalServer();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0d1117',
    title: 'ServerPilot',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  // Any link that would open a new window (e.g. target="_blank") opens in the
  // OS browser instead of a second Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
