# ServerPilot Desktop

An Electron shell around the existing React client. It does **not** run its own backend —
it serves a production build of `client/` locally (on `http://127.0.0.1:51734`, to keep
React Router working correctly) and talks to your already-deployed backend, same as the
web app. Same login, same servers, same team/vault sharing.

## One-time setup

1. Add the desktop app's local origin to the backend's `CLIENT_ORIGIN` env var (comma-separated),
   both in `server/.env` for local testing and in your Render dashboard for the packaged app:
   ```
   CLIENT_ORIGIN=https://ssh-manager-alpha.vercel.app,http://localhost:51734
   ```
2. Install dependencies:
   ```
   cd desktop
   npm install
   ```

## Run in development

```
npm start
```
This builds `client/` in production mode (using `client/.env.production`, which points at
the hosted Render backend) and launches the Electron window.

If you've already built the client and just want to relaunch Electron without rebuilding:
```
npm run start:fast
```

## Build an installer

```
npm run dist
```
Produces a Windows installer (NSIS), macOS `.dmg`, or Linux `AppImage` in `desktop/release/`,
depending on the platform you run it on — `electron-builder` only cross-compiles with extra
platform-specific tooling, so build on (or in CI matching) the OS you're targeting.
