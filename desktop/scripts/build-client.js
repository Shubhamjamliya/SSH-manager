const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '..', '..', 'client');
const distDir = path.join(clientDir, 'dist');
const destDir = path.join(__dirname, '..', 'app');

console.log('Building client (production mode, points at the hosted backend)...');
execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

console.log('Copying client build into desktop/app...');
fs.rmSync(destDir, { recursive: true, force: true });
fs.cpSync(distDir, destDir, { recursive: true });

console.log('Done.');
