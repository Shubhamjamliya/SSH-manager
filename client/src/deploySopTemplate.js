function slugify(name) {
  return (name || 'myapp')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'myapp';
}

export function buildDeploySop({ name, domain, ip, repoUrl }) {
  const slug = slugify(name);
  const d = (domain || 'example.com').trim();
  const www = `www.${d}`;
  const vpsIp = (ip || 'YOUR_VPS_IP').trim();
  const repo = (repoUrl || '<your-repo-url>').trim();

  const nginxConfig = `server {
    server_name ${d} ${www};

    root /var/www/${slug};
    index index.html;

    client_max_body_size 6M;
    keepalive_timeout 65;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        application/xml+rss
        image/svg+xml;

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
        limit_req zone=api_limit burst=60 nodelay;
        limit_conn perip 30;

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

    listen [::]:443 ssl ipv6only=on;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/${d}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${d}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}`;

  const deployScript = `#!/bin/bash
echo "Deploying ${slug}..."

cd ~/${slug}
git pull origin main

# FRONTEND
cd Frontend
npm install
npm run build
sudo rm -rf /var/www/${slug}/*
sudo cp -r dist/* /var/www/${slug}/

# BACKEND
cd ../Backend
npm install
pm2 restart ${slug}-api
pm2 restart ${slug}-socket

echo "Done"`;

  return [
    {
      title: 'Step 0 — Prepare the VPS',
      items: [
        { type: 'command', text: 'sudo apt update' },
        { type: 'command', text: 'sudo apt install nginx git curl unzip -y' },
        { type: 'command', text: 'sudo timedatectl set-timezone Asia/Kolkata' },
        { type: 'command', text: 'timedatectl | grep "Time zone"' },
        { type: 'command', text: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -' },
        { type: 'command', text: 'sudo apt install -y nodejs' },
        { type: 'command', text: 'npm install -g pm2' },
      ],
    },
    {
      title: 'Step 1 — Clone the project',
      items: [
        { type: 'command', text: 'cd ~' },
        { type: 'command', text: `git clone ${repo} ${slug}` },
        { type: 'command', text: `cd ${slug}` },
      ],
    },
    {
      title: 'Step 2 — Backend setup',
      items: [
        { type: 'command', text: 'cd Backend' },
        { type: 'command', text: 'npm install' },
        { type: 'command', text: 'nano .env' },
        { type: 'info', text: 'Fill in MONGODB_URI, JWT secrets, FRONTEND_URL, etc. — see your project README for the full list.' },
        { type: 'command', text: `pm2 start server.js --name ${slug}-api` },
        { type: 'command', text: `pm2 start socket.js --name ${slug}-socket` },
        { type: 'command', text: 'pm2 save' },
      ],
    },
    {
      title: 'Step 3 — Frontend build',
      items: [
        { type: 'command', text: 'cd ../Frontend' },
        { type: 'command', text: 'npm install' },
        { type: 'command', text: 'nano .env' },
        { type: 'block', text: 'VITE_API_BASE_URL=/api' },
        { type: 'command', text: 'npm run build' },
        { type: 'command', text: `sudo mkdir -p /var/www/${slug}` },
        { type: 'command', text: `sudo rm -rf /var/www/${slug}/*` },
        { type: 'command', text: `sudo cp -r dist/* /var/www/${slug}/` },
      ],
    },
    {
      title: 'Step 4 — Nginx config',
      items: [
        { type: 'command', text: `sudo nano /etc/nginx/sites-available/${slug}.conf` },
        { type: 'block', text: nginxConfig },
        { type: 'command', text: `sudo ln -s /etc/nginx/sites-available/${slug}.conf /etc/nginx/sites-enabled/` },
        { type: 'command', text: 'sudo rm /etc/nginx/sites-enabled/default' },
        { type: 'command', text: 'sudo nginx -t' },
        { type: 'command', text: 'sudo systemctl restart nginx' },
      ],
    },
    {
      title: 'Step 5 — Uploads directory',
      items: [
        { type: 'command', text: 'sudo mkdir -p /var/www/uploads' },
        { type: 'command', text: 'sudo chown -R www-data:www-data /var/www/uploads' },
        { type: 'command', text: 'sudo chmod -R 755 /var/www/uploads' },
        { type: 'info', text: `Uploads are served at https://${d}/uploads/<file>` },
      ],
    },
    {
      title: 'Step 6 — Domain DNS',
      items: [
        { type: 'info', text: `Add two A records at your DNS provider:` },
        { type: 'block', text: `A    @      ${vpsIp}\nA    www    ${vpsIp}` },
      ],
    },
    {
      title: 'Step 7 — SSL (HTTPS)',
      items: [
        { type: 'command', text: 'sudo apt install certbot python3-certbot-nginx -y' },
        { type: 'command', text: `sudo certbot --nginx -d ${d} -d ${www}` },
        { type: 'info', text: 'When prompted, choose option 2: Redirect HTTP to HTTPS.' },
      ],
    },
    {
      title: 'Step 8 — Auto deploy script',
      items: [
        { type: 'command', text: 'nano ~/deploy.sh' },
        { type: 'block', text: deployScript },
        { type: 'command', text: 'chmod +x ~/deploy.sh' },
        { type: 'command', text: './deploy.sh' },
      ],
    },
    {
      title: 'Test it',
      items: [
        { type: 'info', text: 'Frontend' },
        { type: 'block', text: `https://${d}` },
        { type: 'info', text: 'API' },
        { type: 'block', text: `https://${d}/api` },
        { type: 'info', text: 'Health / Ready' },
        { type: 'block', text: `https://${d}/health\nhttps://${d}/ready` },
        { type: 'info', text: 'Socket.IO' },
        { type: 'block', text: `wss://${d}/socket.io/` },
      ],
    },
    {
      title: 'Maintenance',
      items: [
        { type: 'command', text: `pm2 logs ${slug}-api` },
        { type: 'command', text: `pm2 restart ${slug}-api` },
        { type: 'command', text: `pm2 restart ${slug}-socket` },
        { type: 'command', text: 'sudo systemctl restart nginx' },
        { type: 'command', text: 'sudo tail -f /var/log/nginx/error.log' },
        { type: 'command', text: `cp -r ~/${slug} ~/backup/${slug}-$(date +%F)` },
      ],
    },
  ];
}
