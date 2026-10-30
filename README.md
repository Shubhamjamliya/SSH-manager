# ServerPilot — Web-based SSH Manager

A MERN-stack SSH manager: manage your Linux VPS fleet from a browser dashboard with a live, interactive terminal (xterm.js + ssh2 + Socket.IO).

## Stack
- **Frontend**: React + Vite, xterm.js
- **Backend**: Node.js + Express, Socket.IO, ssh2
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT + bcrypt (team accounts, admin/member roles)
- **Server credentials**: AES-256-GCM encrypted at rest; decrypted only in-memory to open an SSH connection; never sent to the browser

## Setup

### 1. MongoDB
Run MongoDB locally or point `MONGO_URI` at a hosted instance.

### 2. Backend
```
cd server
cp .env.example .env
# generate ENCRYPTION_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# paste it into .env, set JWT_SECRET to a long random string, set MONGO_URI
npm install
npm run dev
```

### 3. Frontend
```
cd client
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173. The first registered account becomes admin; everyone registered after that is a `member`.

## How it works
1. You add a server (host, port, username, password) — the password is AES-256-GCM encrypted before it's stored.
2. Clicking a server opens a new terminal tab and emits `terminal:connect` over Socket.IO.
3. The backend decrypts the password, opens an SSH2 shell (real PTY), and streams stdin/stdout both ways over the socket.
4. xterm.js renders the stream — `vim`, `htop`, `nano`, `sudo`, tab-completion, and ctrl-C all work exactly like a native terminal, because it's a real PTY, not a command-exec wrapper.
5. Each browser tab you open is its own SSH session; closing a tab ends that session.

## Deploying to your own VPS
- Put the Express/Socket.IO backend behind an HTTPS reverse proxy (nginx + Let's Encrypt) — Socket.IO upgrades to WSS automatically once the proxy terminates TLS.
- Serve the built React app (`npm run build` in `client/`) as static files from the same proxy, or from any static host, pointed at the backend's HTTPS URL.
- Keep `.env` (JWT_SECRET, ENCRYPTION_KEY, MONGO_URI) off version control and rotate ENCRYPTION_KEY only via a re-encryption migration — rotating it directly will make existing stored server passwords undecryptable.

## Roadmap (v2)
- SFTP file manager (upload/download)
- CPU/RAM/disk monitoring per server
- Command history, per-server activity logs
- Bulk command execution across server groups
- Per-server granular permissions beyond owner/sharedWith
