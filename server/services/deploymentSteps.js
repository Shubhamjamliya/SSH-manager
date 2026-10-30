const crypto = require('crypto');

function shQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function slugify(name) {
  return (
    (name || 'myapp')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'myapp'
  );
}

// Wraps file content in a heredoc with a random delimiter so the content can't
// accidentally (or deliberately) break out of the heredoc early.
function heredocWrite(path, content, { sudo = false } = {}) {
  const marker = `EOF_${crypto.randomBytes(6).toString('hex')}`;
  const tee = sudo ? 'sudo tee' : 'tee';
  return `cat <<'${marker}' | ${tee} ${path} > /dev/null\n${content}\n${marker}`;
}

function buildNginxConfig(slug, domain) {
  const www = `www.${domain}`;
  return `server {
    server_name ${domain} ${www};
    root /var/www/${slug};
    index index.html;
    client_max_body_size 6M;
    keepalive_timeout 65;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /uploads/ {
        alias /var/www/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        add_header Cross-Origin-Resource-Policy "cross-origin" always;
        access_log off;
        try_files $uri =404;
    }

    location /health {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ready {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering on;
        proxy_buffers 16 16k;
        proxy_busy_buffers_size 64k;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 75s;
        proxy_send_timeout 75s;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}`;
}

/**
 * Builds the ordered, non-interactive command list the deploy runner executes one at a
 * time over a bare SSH exec() connection. Each step is self-contained (its own `cd`)
 * since exec() does not preserve working directory between separate invocations.
 */
function buildDeploymentSteps({ name, domain, ip, repoUrl, email, backendEnv, frontendEnv }) {
  const slug = slugify(name);
  const domainClean = (domain || '').trim();
  const steps = [
    {
      label: 'Update apt & install base packages',
      command: 'sudo apt update && sudo apt install -y nginx git curl unzip',
    },
    {
      label: 'Set server timezone',
      command: 'sudo timedatectl set-timezone Asia/Kolkata',
    },
    {
      label: 'Install Node.js (if missing)',
      command:
        'command -v node >/dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs)',
    },
    {
      label: 'Install PM2 (if missing)',
      command: 'command -v pm2 >/dev/null 2>&1 || sudo npm install -g pm2',
    },
  ];

  if (repoUrl) {
    steps.push({
      label: 'Clone repository',
      command: `cd ~ && [ -d ${slug} ] || git clone ${shQuote(repoUrl)} ${slug}`,
    });
  }

  steps.push(
    {
      label: 'Install backend dependencies',
      command: `cd ~/${slug}/Backend && npm install`,
    }
  );

  if (backendEnv) {
    steps.push({
      label: 'Write backend .env',
      command: heredocWrite(`~/${slug}/Backend/.env`, backendEnv),
    });
  }

  steps.push(
    {
      label: 'Start backend with PM2',
      command: `cd ~/${slug}/Backend && (pm2 restart ${slug}-api || pm2 start server.js --name ${slug}-api) && (pm2 restart ${slug}-socket || pm2 start socket.js --name ${slug}-socket) && pm2 save`,
      continueOnError: true,
    },
    {
      label: 'Install frontend dependencies',
      command: `cd ~/${slug}/Frontend && npm install`,
    },
    {
      label: 'Write frontend .env',
      command: heredocWrite(`~/${slug}/Frontend/.env`, frontendEnv || 'VITE_API_BASE_URL=/api'),
    },
    {
      label: 'Build frontend',
      command: `cd ~/${slug}/Frontend && npm run build`,
    },
    {
      label: 'Deploy frontend build to /var/www',
      command: `sudo mkdir -p /var/www/${slug} && sudo rm -rf /var/www/${slug}/* && sudo cp -r ~/${slug}/Frontend/dist/* /var/www/${slug}/`,
    },
    {
      label: 'Write Nginx config',
      command: heredocWrite(`/tmp/${slug}.conf`, buildNginxConfig(slug, domainClean || 'example.com')) +
        ` && sudo mv /tmp/${slug}.conf /etc/nginx/sites-available/${slug}.conf`,
    },
    {
      label: 'Enable Nginx site',
      command: `sudo ln -sf /etc/nginx/sites-available/${slug}.conf /etc/nginx/sites-enabled/${slug}.conf && sudo rm -f /etc/nginx/sites-enabled/default`,
    },
    {
      label: 'Test & reload Nginx',
      command: 'sudo nginx -t && sudo systemctl restart nginx',
    },
    {
      label: 'Prepare uploads directory',
      command: 'sudo mkdir -p /var/www/uploads && sudo chown -R www-data:www-data /var/www/uploads && sudo chmod -R 755 /var/www/uploads',
    }
  );

  if (email && domainClean) {
    steps.push({
      label: 'Install certbot & request SSL certificate',
      command: `sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d ${shQuote(domainClean)} -d ${shQuote(`www.${domainClean}`)} --non-interactive --agree-tos -m ${shQuote(email)} --redirect`,
      continueOnError: true,
    });
  }

  steps.push({
    label: 'Write deploy.sh for future pushes',
    command: heredocWrite(
      '~/deploy.sh',
      `#!/bin/bash
set -e
cd ~/${slug}
git pull origin main
cd Frontend
npm install
npm run build
sudo rm -rf /var/www/${slug}/*
sudo cp -r dist/* /var/www/${slug}/
cd ../Backend
npm install
pm2 restart ${slug}-api
pm2 restart ${slug}-socket
echo "Deploy finished"`
    ) + ' && chmod +x ~/deploy.sh',
  });

  return { slug, steps, ip: (ip || '').trim() };
}

module.exports = { buildDeploymentSteps, slugify };
