require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const { Server: SocketIOServer } = require('socket.io');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const snippetRoutes = require('./routes/snippets');
const commandHistoryRoutes = require('./routes/commandHistory');
const logRoutes = require('./routes/logs');
const vaultRoutes = require('./routes/vault');
const registerTerminalSocket = require('./sockets/terminalSocket');
const registerDeploySocket = require('./sockets/deploySocket');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const httpServer = http.createServer(app);

// CLIENT_ORIGIN accepts a comma-separated list, e.g. the Vercel web app + the
// Electron desktop app's local origin, so both can talk to this one backend.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function corsOriginCheck(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error('Not allowed by CORS'));
}

// Required for express-rate-limit / req.ip to see the real client IP behind
// Render's (or any) reverse proxy, instead of rate-limiting the proxy itself.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false, // this process serves a JSON/WS API only, no HTML to protect with CSP
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({ origin: corsOriginCheck, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize()); // strips $/. operators from req.body/query/params to block NoSQL injection
app.use(hpp()); // ignores duplicate query params instead of letting them override checks

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const sensitiveWriteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use(['/api/vault', '/api/servers'], sensitiveWriteLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/snippets', snippetRoutes);
app.use('/api/command-history', commandHistoryRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/vault', vaultRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});
registerTerminalSocket(io);
registerDeploySocket(io);

// Safety net: log unexpected rejections instead of letting the process die silently,
// since a single unhandled error here would otherwise take the whole server down.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => console.log(`ServerPilot backend listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
