#!/bin/bash
#################################################
# GULYALY.COM FULL PRODUCTION DEPLOYMENT
# VPS: 83.166.244.79 (Ubuntu)
# Domain: gulyaly.com
# 
# This script MUST be run as root on the VPS
# Usage: ssh root@83.166.244.79 'bash -s' < deploy-vps-full.sh
#################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

echo "============================================"
echo "GULYALY.COM PRODUCTION DEPLOYMENT"
echo "Starting at: $(date)"
echo "============================================"

#################################################
# STEP 1: SYSTEM PREPARATION
#################################################
echo ""
echo "[1/10] System Preparation..."
apt update
apt upgrade -y
apt install -y curl git build-essential ufw certbot python3-certbot-nginx

#################################################
# STEP 2: INSTALL NODE.JS 20.x
#################################################
echo ""
echo "[2/10] Installing Node.js 20.x LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

node --version
npm --version

#################################################
# STEP 3: INSTALL PM2
#################################################
echo ""
echo "[3/10] Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
pm2 --version

#################################################
# STEP 4: INSTALL & CONFIGURE POSTGRESQL
#################################################
echo ""
echo "[4/10] Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

echo "Creating PostgreSQL database and user..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS gulyaly;" || true
sudo -u postgres psql -c "DROP USER IF EXISTS gulyaly_user;" || true

# Generate secure random password
PG_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)

sudo -u postgres psql <<EOF
CREATE USER gulyaly_user WITH ENCRYPTED PASSWORD '${PG_PASSWORD}';
CREATE DATABASE gulyaly OWNER gulyaly_user;
GRANT ALL PRIVILEGES ON DATABASE gulyaly TO gulyaly_user;
\c gulyaly
GRANT ALL ON SCHEMA public TO gulyaly_user;
ALTER DATABASE gulyaly OWNER TO gulyaly_user;
EOF

echo "✓ PostgreSQL database created with password: ${PG_PASSWORD}"

#################################################
# STEP 5: CREATE DEPLOYMENT DIRECTORY
#################################################
echo ""
echo "[5/10] Creating deployment directory..."

# Remove old deployment if exists
if [ -d "/var/www/gulyaly" ]; then
    echo "Backing up old deployment..."
    mv /var/www/gulyaly "/var/www/gulyaly.backup.$(date +%Y%m%d%H%M%S)"
fi

mkdir -p /var/www/gulyaly
mkdir -p /var/log/gulyaly

# Verify /var/www/aimeos is untouched
if [ -d "/var/www/aimeos" ]; then
    echo "✓ Legacy /var/www/aimeos preserved"
fi

#################################################
# STEP 6: GENERATE SECURE ENVIRONMENT VARIABLES
#################################################
echo ""
echo "[6/10] Generating secure .env file..."

NEXTAUTH_SECRET=$(openssl rand -base64 32)
ADMIN_PASSWORD_PLAIN="Admin$(openssl rand -base64 12 | tr -d '=+/')"
ADMIN_PASSWORD_HASH=$(node -e "console.log(require('bcryptjs').hashSync('${ADMIN_PASSWORD_PLAIN}', 10))")

cat > /var/www/gulyaly/.env <<EOF
# ============================================
# GULYALY PRODUCTION ENVIRONMENT
# Auto-generated: $(date)
# ============================================

# Database
DATABASE_URL="postgresql://gulyaly_user:${PG_PASSWORD}@localhost:5432/gulyaly?schema=public"

# NextAuth
NEXTAUTH_URL="https://gulyaly.com"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# Admin Credentials
ADMIN_EMAIL="admin@gulyaly.com"
ADMIN_PASSWORD_HASH="${ADMIN_PASSWORD_HASH}"

# Application URLs
NEXT_PUBLIC_APP_URL="https://gulyaly.com"
NEXT_PUBLIC_URL="https://gulyaly.com"

# Stripe (MUST BE CONFIGURED MANUALLY)
STRIPE_SECRET_KEY="sk_live_REPLACE_WITH_REAL_KEY"
STRIPE_PUBLIC_KEY="pk_live_REPLACE_WITH_REAL_KEY"
STRIPE_WEBHOOK_SECRET="whsec_REPLACE_WITH_REAL_SECRET"

# SMS Gateway (Optional)
SMS_DEVICE_ID=""
SMS_SECRET=""
SMS_GATEWAY_URL="https://sms.ibnux.net/"
SMS_SIM_NUMBER="0"

# Telegram Notifications (Optional)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# Environment
NODE_ENV="production"
PORT=3000
NEXT_TELEMETRY_DISABLED="1"
EOF

chmod 600 /var/www/gulyaly/.env

echo "✓ Environment file created"
echo "✓ Admin password: ${ADMIN_PASSWORD_PLAIN}"
echo "✓ IMPORTANT: Save this password securely!"
echo "✓ IMPORTANT: Update Stripe keys in /var/www/gulyaly/.env"

#################################################
# STEP 7: DEPLOY APPLICATION CODE
#################################################
echo ""
echo "[7/10] Deploying application code..."
echo "IMPORTANT: Code must be uploaded via rsync or git"
echo "Run from Windows machine:"
echo ""
echo "rsync -avz --delete --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='.env' c:/Users/miste/Downloads/codeakgus/ root@83.166.244.79:/var/www/gulyaly/"
echo ""
echo "Press ENTER when code upload is complete..."
read -r

# Verify critical files exist
if [ ! -f "/var/www/gulyaly/package.json" ]; then
    echo "ERROR: package.json not found. Code not uploaded properly."
    exit 1
fi

#################################################
# STEP 8: INSTALL DEPENDENCIES & BUILD
#################################################
echo ""
echo "[8/10] Installing dependencies and building..."
cd /var/www/gulyaly

npm ci --production=false

# Generate Prisma client
npx prisma generate

# Run migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy || npx prisma db push --accept-data-loss

# Verify database tables
sudo -u postgres psql -d gulyaly -c "\dt"

# Build Next.js application
echo "Building Next.js application..."
npm run build

if [ ! -d "/var/www/gulyaly/.next" ]; then
    echo "ERROR: Build failed - .next directory not created"
    exit 1
fi

echo "✓ Application built successfully"

#################################################
# STEP 9: START PM2
#################################################
echo ""
echo "[9/10] Starting application with PM2..."

# Stop existing PM2 process if running
pm2 delete gulyaly 2>/dev/null || true

# Start with ecosystem config
cd /var/www/gulyaly
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u root --hp /root
pm2 save

# Wait for app to start
sleep 5

# Verify PM2 status
pm2 status

# Test local connection
echo "Testing local connection..."
curl -f http://localhost:3000/api/health || echo "WARNING: Health check failed"

#################################################
# STEP 10: CONFIGURE NGINX
#################################################
echo ""
echo "[10/10] Configuring Nginx..."

# Backup existing default config
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    mv /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default.backup
fi

# Create rate limit config
cat > /etc/nginx/conf.d/rate-limits.conf <<'NGINX_LIMITS'
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=checkout:10m rate=3r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
NGINX_LIMITS

# Create temporary HTTP-only config for SSL provisioning
cat > /etc/nginx/sites-available/gulyaly-temp <<'NGINX_TEMP'
server {
    listen 80;
    listen [::]:80;
    server_name gulyaly.com www.gulyaly.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_TEMP

ln -sf /etc/nginx/sites-available/gulyaly-temp /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

echo "Obtaining SSL certificate..."
certbot certonly --webroot -w /var/www/html -d gulyaly.com -d www.gulyaly.com \
    --non-interactive --agree-tos -m admin@gulyaly.com --redirect

# Create full HTTPS configuration
cat > /etc/nginx/sites-available/gulyaly <<'NGINX_FULL'
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name gulyaly.com www.gulyaly.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gulyaly.com www.gulyaly.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/gulyaly.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gulyaly.com/privkey.pem;
    
    # SSL Security
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Connection Limits
    limit_conn conn_limit 50;

    # Main Proxy
    location / {
        limit_req zone=general burst=20 nodelay;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }

    # API Routes
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Auth Endpoints - Strict Rate Limiting
    location /api/auth/ {
        limit_req zone=auth burst=10 nodelay;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Checkout - Rate Limiting
    location /api/checkout {
        limit_req zone=checkout burst=10 nodelay;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Stripe Webhook - No Rate Limiting
    location /api/webhooks/stripe {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        client_max_body_size 2m;
    }

    # Static Assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINX_FULL

# Remove temp config and enable full config
rm -f /etc/nginx/sites-enabled/gulyaly-temp
ln -sf /etc/nginx/sites-available/gulyaly /etc/nginx/sites-enabled/

# Test and reload Nginx
nginx -t
systemctl reload nginx

# Enable SSL auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

echo "✓ Nginx configured with SSL"

#################################################
# STEP 11: CONFIGURE FIREWALL
#################################################
echo ""
echo "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status

echo "✓ Firewall configured"

#################################################
# DEPLOYMENT COMPLETE
#################################################
echo ""
echo "============================================"
echo "DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "CREDENTIALS (SAVE THESE SECURELY):"
echo "  PostgreSQL Password: ${PG_PASSWORD}"
echo "  Admin Password: ${ADMIN_PASSWORD_PLAIN}"
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "  1. Update Stripe keys in /var/www/gulyaly/.env"
echo "  2. Restart PM2: pm2 restart gulyaly"
echo ""
echo "VERIFICATION COMMANDS:"
echo "  pm2 status"
echo "  pm2 logs gulyaly --lines 50"
echo "  curl -I https://gulyaly.com"
echo "  systemctl status nginx"
echo "  sudo -u postgres psql -d gulyaly -c '\dt'"
echo ""
echo "Site should be live at: https://gulyaly.com"
echo "============================================"
