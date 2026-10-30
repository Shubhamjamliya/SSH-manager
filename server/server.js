require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
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

const app = express();
const httpServer = http.createServer(app);

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/snippets', snippetRoutes);
app.use('/api/command-history', commandHistoryRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/vault', vaultRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const io = new SocketIOServer(httpServer, {
  cors: { origin: clientOrigin, credentials: true },
});
registerTerminalSocket(io);
registerDeploySocket(io);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => console.log(`ServerPilot backend listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
