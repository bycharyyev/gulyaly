#!/bin/bash
set -e

echo "🚀 Starting automatic installation for Gulyaly Digital Shop..."

# ============================================
# COLORS FOR OUTPUT
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# CONFIGURATION
# ============================================
PROJECT_NAME="gulyaly"
PROJECT_DIR="/var/www/$PROJECT_NAME"
REPO_URL="https://github.com/bycharyyev/gulyaly.git"
DOMAIN="gulyaly.com"
DB_NAME="gulyaly_shop"
DB_USER="gulyaly_user"
DB_PASSWORD=$(openssl rand -base64 16)
DEPLOY_USER="deploy"
NODE_VERSION="20"

# ============================================
# CHECK ROOT
# ============================================
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run this script with sudo${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running as root${NC}"

# ============================================
# SYSTEM UPDATE
# ============================================
echo -e "${BLUE}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# ============================================
# INSTALL REQUIRED SOFTWARE
# ============================================
echo -e "${BLUE}📦 Installing required software...${NC}"
apt install -y curl wget git build-essential nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw fail2ban unzip

# ============================================
# INSTALL NODE.JS
# ============================================
echo -e "${BLUE}📦 Installing Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
fi

node --version
npm --version

# ============================================
# INSTALL PM2
# ============================================
echo -e "${BLUE}📦 Installing PM2...${NC}"
npm install -g pm2

# ============================================
# CREATE DEPLOY USER
# ============================================
echo -e "${BLUE}👤 Creating deploy user...${NC}"
if id "$DEPLOY_USER" &>/dev/null; then
    echo -e "${YELLOW}User $DEPLOY_USER already exists${NC}"
else
    adduser --disabled-password --gecos "" $DEPLOY_USER
    usermod -aG sudo $DEPLOY_USER
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$DEPLOY_USER
    chmod 0440 /etc/sudoers.d/$DEPLOY_USER
fi

# ============================================
# CONFIGURE POSTGRESQL
# ============================================
echo -e "${BLUE}🗄️ Configuring PostgreSQL...${NC}"
sudo -u postgres psql <<EOF
SELECT 'CREATE DATABASE $DB_NAME' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
DO
\$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
      CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
   END IF;
END
\$\$;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
\q
EOF

echo -e "${GREEN}✅ PostgreSQL configured${NC}"
echo -e "${YELLOW}⚠️  Database password: $DB_PASSWORD${NC}"
echo -e "${YELLOW}⚠️  SAVE THIS PASSWORD! You'll need it for .env${NC}"

# ============================================
# CONFIGURE FIREWALL (UFW)
# ============================================
echo -e "${BLUE}🔥 Configuring firewall...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw status

# ============================================
# CONFIGURE FAIL2BAN
# ============================================
echo -e "${BLUE}🛡️ Configuring Fail2ban...${NC}"
systemctl enable fail2ban
systemctl start fail2ban

# Create custom jail for nginx
cat > /etc/fail2ban/jail.local <<'FAIL2BAN_EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
FAIL2BAN_EOF

systemctl restart fail2ban

# ============================================
# CLONE PROJECT
# ============================================
echo -e "${BLUE}📁 Cloning project...${NC}"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

if [ -d ".git" ]; then
    echo -e "${YELLOW}Repository already exists, pulling latest changes...${NC}"
    git pull origin main
else
    git clone $REPO_URL .
fi

chown -R $DEPLOY_USER:$DEPLOY_USER $PROJECT_DIR

# ============================================
# CREATE .ENV FILE
# ============================================
echo -e "${BLUE}📝 Creating .env file...${NC}"
cat > $PROJECT_DIR/.env <<ENV_EOF
# ============================================
# PRODUCTION ENVIRONMENT
# ============================================

NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public"

# NextAuth
NEXTAUTH_URL="https://$DOMAIN"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Admin Credentials (CHANGE THESE!)
ADMIN_EMAIL="admin@$DOMAIN"
ADMIN_PASSWORD_HASH="\$2a\$12\$CHANGE_THIS_HASH"

# Application URLs
NEXT_PUBLIC_APP_URL="https://$DOMAIN"
NEXT_PUBLIC_URL="https://$DOMAIN"

# Stripe (ADD YOUR KEYS)
STRIPE_SECRET_KEY="sk_live_YOUR_KEY_HERE"
STRIPE_PUBLIC_KEY="pk_live_YOUR_KEY_HERE"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET_HERE"

# SMS Gateway (OPTIONAL)
SMS_DEVICE_ID=""
SMS_SECRET=""
SMS_GATEWAY_URL="https://sms.ibnux.net/"
SMS_SIM_NUMBER="0"

# Telegram (OPTIONAL)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""
ENV_EOF

chown $DEPLOY_USER:$DEPLOY_USER $PROJECT_DIR/.env
chmod 600 $PROJECT_DIR/.env

echo -e "${YELLOW}⚠️  IMPORTANT: Edit $PROJECT_DIR/.env and add your API keys!${NC}"

# ============================================
# INSTALL DEPENDENCIES
# ============================================
echo -e "${BLUE}📦 Installing project dependencies...${NC}"
su - $DEPLOY_USER -c "cd $PROJECT_DIR && npm install --production"

# ============================================
# BUILD PROJECT
# ============================================
echo -e "${BLUE}🔨 Building project...${NC}"
su - $DEPLOY_USER -c "cd $PROJECT_DIR && npm run build"

# ============================================
# SETUP DATABASE
# ============================================
echo -e "${BLUE}🗄️ Setting up database...${NC}"
su - $DEPLOY_USER -c "cd $PROJECT_DIR && npx prisma generate"
su - $DEPLOY_USER -c "cd $PROJECT_DIR && npx prisma db push"

# ============================================
# START WITH PM2
# ============================================
echo -e "${BLUE}🚀 Starting application with PM2...${NC}"
su - $DEPLOY_USER -c "cd $PROJECT_DIR && pm2 delete $PROJECT_NAME 2>/dev/null || true"
su - $DEPLOY_USER -c "cd $PROJECT_DIR && pm2 start npm --name $PROJECT_NAME -- start"
su - $DEPLOY_USER -c "pm2 save"
su - $DEPLOY_USER -c "pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER" | tail -1 | bash

# ============================================
# CONFIGURE NGINX
# ============================================
echo -e "${BLUE}🌐 Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/$DOMAIN <<'NGINX_EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=100r/s;

# HTTP Server - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name gulyaly.com www.gulyaly.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gulyaly.com www.gulyaly.com;

    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/gulyaly.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gulyaly.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/gulyaly_access.log;
    error_log /var/log/nginx/gulyaly_error.log;

    # Rate limiting
    limit_req zone=general burst=200 nodelay;
    limit_req_status 429;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # API Rate Limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth Endpoints - Stricter Rate Limiting
    location /api/auth/ {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# ============================================
# GET SSL CERTIFICATE
# ============================================
echo -e "${BLUE}🔒 Obtaining SSL certificate...${NC}"
systemctl start nginx
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

# Restart nginx
systemctl restart nginx

# ============================================
# SETUP CRON JOBS
# ============================================
echo -e "${BLUE}⏰ Setting up cron jobs...${NC}"

# SSL renewal
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

# Daily backup
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/$PROJECT_NAME/scripts/backup-db.sh") | crontab -

# Health check every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/$PROJECT_NAME/scripts/health-check.sh >> /var/log/health-check.log 2>&1") | crontab -

# ============================================
# FINAL CHECKS
# ============================================
echo -e "${BLUE}🔍 Running final checks...${NC}"
sleep 5

# Check PM2 status
su - $DEPLOY_USER -c "pm2 status"

# Check if site is responding
if curl -sSf http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Application is responding${NC}"
else
    echo -e "${RED}❌ Application is not responding${NC}"
fi

# ============================================
# COMPLETION
# ============================================
echo -e "${GREEN}"
echo "============================================"
echo "🎉 INSTALLATION COMPLETED SUCCESSFULLY!"
echo "============================================"
echo -e "${NC}"
echo -e "${YELLOW}Important Information:${NC}"
echo ""
echo "📍 Project Directory: $PROJECT_DIR"
echo "🗄️ Database Name: $DB_NAME"
echo "👤 Database User: $DB_USER"
echo "🔑 Database Password: $DB_PASSWORD"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Edit .env file: nano $PROJECT_DIR/.env"
echo "   - Add admin password hash"
echo "   - Add Stripe API keys"
echo "   - Add other API keys as needed"
echo ""
echo "2. Restart application: pm2 restart $PROJECT_NAME"
echo ""
echo "3. Check your site: https://$DOMAIN"
echo ""
echo "4. Check PM2 status: pm2 status"
echo ""
echo "5. View logs: pm2 logs $PROJECT_NAME"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo "pm2 restart $PROJECT_NAME  - Restart app"
echo "pm2 logs $PROJECT_NAME     - View logs"
echo "pm2 monit                  - Monitor resources"
echo "nginx -t                   - Test nginx config"
echo "systemctl status nginx     - Check nginx status"
echo ""
echo -e "${RED}IMPORTANT: SAVE THE DATABASE PASSWORD!${NC}"
echo ""
