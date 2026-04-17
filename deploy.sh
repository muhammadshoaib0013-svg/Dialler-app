#!/bin/bash
# NGINX & SSL Auto-Deployment Script
# Note: Must be run on the Linux Server using 'sudo ./deploy.sh yourdomain.com'

if [ "$EUID" -ne 0 ]
  then echo "Please run as root (or use sudo)"
  exit
fi

if [ -z "$1" ]; then
  echo "Error: Domain name required. Usage: sudo ./deploy.sh dialer.yourdomain.com"
  exit 1
fi

DOMAIN=$1

echo "==> [1/5] Updating system and installing dependencies..."
apt update && apt install -y nginx certbot python3-certbot-nginx nodejs

echo "==> [2/5] Configuring Permissions for /var/www/dialer..."
chown -R www-data:www-data /var/www/dialer
chmod -R 755 /var/www/dialer

echo "==> [3/5] Writing Nginx Protocol Configuration..."
cat <<EOF > /etc/nginx/sites-available/dialer
server {
    listen 80;
    server_name $DOMAIN;

    root /var/www/dialer;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA Routing boundary
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

echo "==> [4/5] Enabling Server and Restarting Engine..."
ln -sf /etc/nginx/sites-available/dialer /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "==> [5/5] Hooking Let's Encrypt SSL Domain Layer..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN || echo "WARNING: Certbot failed. Verify DNS A-Records map to this VPS IP."

echo "==> Deployment Routine Completed Successfully!"
