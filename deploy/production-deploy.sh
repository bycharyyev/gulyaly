#!/bin/bash

# =================================================================
# PRODUCTION DEPLOY SCRIPT - GULYAL.COM
# Server: 89.104.74.7
# OS: Ubuntu 22.04 LTS
# =================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# =================================================================
# SERVER CONNECTION AND BASIC SETUP
# =================================================================

log "Starting production deployment to 89.104.74.7"

# Check if we're on the server
if [ "$SSH_CONNECTION" ]; then
    log "Connected via SSH to server"
else
    error "This script must be run on the server via SSH"
fi

# Update system
log "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log "Installing essential packages..."
apt install -y curl wget git unzip software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release \
    build-essential python3 python3-pip nodejs npm

# =================================================================
# INSTALL DOCKER AND DOCKER COMPOSE
# =================================================================

log "Installing Docker..."

# Remove old versions
apt remove -y docker docker-engine docker.io containerd runc

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add current user to docker group
usermod -aG docker $USER

# Install Docker Compose
log "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# =================================================================
# INSTALL NODE.JS 18 LTS
# =================================================================

log "Installing Node.js 18 LTS..."

# Remove existing Node.js
apt remove -y nodejs npm

# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Install Node.js
apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 globally
npm install -g pm2

# =================================================================
# INSTALL AND CONFIGURE POSTGRESQL
# =================================================================

log "Installing PostgreSQL 15..."

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
log "Creating database and user..."
sudo -u postgres psql -c "CREATE USER gulyaly_app WITH PASSWORD 'gulyaly_secure_db_password_2024';"
sudo -u postgres psql -c "CREATE DATABASE gulyaly_prod OWNER gulyaly_app;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gulyaly_prod TO gulyaly_app;"
sudo -u postgres psql -c "ALTER USER gulyaly_app CREATEDB;"

# Configure PostgreSQL for security
log "Configuring PostgreSQL security..."
cp /etc/postgresql/15/main/postgresql.conf /etc/postgresql/15/main/postgresql.conf.backup

# PostgreSQL configuration
cat > /etc/postgresql/15/main/postgresql.conf << 'EOF'
# Connection settings
listen_addresses = 'localhost'
port = 5432
max_connections = 100

# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Security settings
ssl = off
password_encryption = scram-sha-256

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'mod'
log_min_duration_statement = 1000
EOF

# Configure pg_hba.conf for security
cat > /etc/postgresql/15/main/pg_hba.conf << 'EOF'
# PostgreSQL Client Authentication Configuration File
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             postgres                                peer

# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256

# IPv6 local connections:
host    all             all             ::1/128                 scram-sha-256

# Allow replication connections from localhost
host    replication     all             127.0.0.1/32            scram-sha-256
host    replication     all             ::1/128                 scram-sha-256
EOF

# Restart PostgreSQL
systemctl restart postgresql

# =================================================================
# INSTALL AND CONFIGURE NGINX
# =================================================================

log "Installing Nginx..."
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Create Nginx configuration for Gulyaly
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/gulyaly << 'EOF'
server {
    listen 80;
    server_name gulyaly.com www.gulyaly.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gulyaly.com www.gulyaly.com;

    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/ssl/certs/gulyaly-self-signed.crt;
    ssl_certificate_key /etc/ssl/private/gulyaly-self-signed.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Main application proxy
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
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

    # Login Rate Limiting
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
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
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/gulyaly /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# =================================================================
# CREATE SELF-SIGNED SSL CERTIFICATE (temporary)
# =================================================================

log "Creating self-signed SSL certificate..."
mkdir -p /etc/ssl/private
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/gulyaly-self-signed.key \
    -out /etc/ssl/certs/gulyaly-self-signed.crt \
    -subj "/C=TM/ST=Ashgabat/L=Ashgabat/O=Gulyaly/OU=IT/CN=gulyaly.com"

# =================================================================
# FIREWALL CONFIGURATION
# =================================================================

log "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# =================================================================
# CREATE APPLICATION DIRECTORY AND USER
# =================================================================

log "Setting up application directory..."
mkdir -p /var/www/gulyaly
useradd -m -s /bin/bash gulyaly || true
usermod -aG sudo gulyaly
usermod -aG docker gulyaly

# Set ownership
chown -R gulyaly:gulyaly /var/www/gulyaly

# =================================================================
# CLONE AND SETUP APPLICATION
# =================================================================

log "Setting up application..."
cd /var/www/gulyaly

# Create production environment file
log "Creating production environment file..."
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://gulyaly_app:gulyaly_secure_db_password_2024@localhost:5432/gulyaly_prod"

# NextAuth
NEXTAUTH_SECRET="gulyaly-super-secret-key-256-bits-minimum-production-2024"
NEXTAUTH_URL="https://gulyaly.com"

# Stripe
STRIPE_SECRET_KEY="sk_live_YOUR_STRIPE_SECRET_KEY_HERE"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET_HERE"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_PUBLISHABLE_KEY_HERE"

# Telegram
TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
TELEGRAM_ADMIN_CHAT_ID="YOUR_ADMIN_CHAT_ID"

# Security
CORS_ORIGIN="https://gulyaly.com"
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Application
NODE_ENV="production"
PORT=3000

# Monitoring
LOG_LEVEL="info"
EOF

# Set secure permissions
chmod 600 .env
chown gulyaly:gulyaly .env

# =================================================================
# CREATE PM2 CONFIGURATION
# =================================================================

log "Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'gulyaly',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/gulyaly',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/gulyaly/error.log',
    out_file: '/var/log/gulyaly/out.log',
    log_file: '/var/log/gulyaly/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Create log directory
mkdir -p /var/log/gulyaly
chown -R gulyaly:gulyaly /var/log/gulyaly

# =================================================================
# CREATE DOCKER COMPOSE FOR DATABASE
# =================================================================

log "Creating Docker Compose configuration..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: gulyaly-postgres
    environment:
      POSTGRES_DB: gulyaly_prod
      POSTGRES_USER: gulyaly_app
      POSTGRES_PASSWORD: gulyaly_secure_db_password_2024
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migration.sql:/docker-entrypoint-initdb.d/migration.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - gulyaly-network

  redis:
    image: redis:7-alpine
    container_name: gulyaly-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - gulyaly-network

volumes:
  postgres_data:
  redis_data:

networks:
  gulyaly-network:
    driver: bridge
EOF

# =================================================================
# SECURITY HARDENING
# =================================================================

log "Installing security tools..."
apt install -y fail2ban ufw

# Configure fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
EOF

systemctl enable fail2ban
systemctl start fail2ban

# =================================================================
# SETUP LOGROTATE
# =================================================================

log "Setting up log rotation..."
cat > /etc/logrotate.d/gulyaly << 'EOF'
/var/log/gulyaly/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 gulyaly gulyaly
    postrotate
        pm2 reload gulyaly
    endscript
}
EOF

# =================================================================
# CREATE BACKUP SCRIPT
# =================================================================

log "Creating backup script..."
cat > /usr/local/bin/gulyaly-backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/gulyaly"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="gulyaly_prod"
DB_USER="gulyaly_app"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec gulyaly-postgres pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /var/www/gulyaly .

# Remove old backups (keep last 7 days)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/gulyaly-backup.sh

# Setup backup cron job
echo "0 2 * * * /usr/local/bin/gulyaly-backup.sh" | crontab -

# =================================================================
# START SERVICES
# =================================================================

log "Starting services..."

# Start Docker services
cd /var/www/gulyaly
docker-compose up -d

# Wait for database to be ready
sleep 10

# =================================================================
# DEPLOYMENT INSTRUCTIONS
# =================================================================

log "Creating deployment instructions..."
cat > DEPLOY_INSTRUCTIONS.md << 'EOF'
# 🚀 GULYAL PRODUCTION DEPLOYMENT

## 📋 Manual Steps Required:

### 1. Upload Application Code
```bash
# From your local machine:
scp -r /path/to/gulyaly/* root@89.104.74.7:/var/www/gulyaly/
```

### 2. Install Dependencies
```bash
cd /var/www/gulyaly
chown -R gulyaly:gulyaly .
sudo -u gulyaly npm install --production
```

### 3. Database Migration
```bash
cd /var/www/gulyaly
sudo -u gulyaly npx prisma migrate deploy
sudo -u gulyaly npx prisma generate
```

### 4. Build Application
```bash
sudo -u gulyaly npm run build
```

### 5. Start Application with PM2
```bash
sudo -u gulyaly pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Setup SSL Certificate
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
certbot --nginx -d gulyaly.com -d www.gulyaly.com --email admin@gulyaly.com --agree-tos --no-eff-email

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### 7. Restart Nginx
```bash
systemctl restart nginx
```

## 🔧 Environment Variables to Update:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- TELEGRAM_BOT_TOKEN
- TELEGRAM_ADMIN_CHAT_ID

## 📊 Monitoring Commands:
```bash
# Check application status
pm2 status
pm2 logs gulyaly

# Check database
docker logs gulyaly-postgres

# Check Nginx
systemctl status nginx
tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
free -h
```

## 🔄 Deployment Commands:
```bash
# Update application
cd /var/www/gulyaly
git pull
npm install --production
npm run build
pm2 reload gulyaly

# Database migration
npx prisma migrate deploy
```
EOF

# =================================================================
# FINAL SETUP
# =================================================================

# Restart Nginx
systemctl restart nginx

# Create startup script for application
cat > /usr/local/bin/start-gulyaly.sh << 'EOF'
#!/bin/bash
cd /var/www/gulyaly
docker-compose up -d
sleep 10
sudo -u gulyaly pm2 start ecosystem.config.js
systemctl restart nginx
EOF

chmod +x /usr/local/bin/start-gulyaly.sh

# =================================================================
# DEPLOYMENT COMPLETE
# =================================================================

log "🎉 Production deployment setup complete!"
log "Server: 89.104.74.7"
log "Next steps:"
log "1. Upload application code to /var/www/gulyaly"
log "2. Follow DEPLOY_INSTRUCTIONS.md for manual steps"
log "3. Update environment variables"
log "4. Setup SSL certificate with Let's Encrypt"
log "5. Start the application"

# Display system status
echo ""
info "=== SYSTEM STATUS ==="
systemctl status nginx --no-pager -l
systemctl status postgresql --no-pager -l
docker ps
pm2 list || echo "PM2 not configured yet"

echo ""
log "✅ Server is ready for application deployment!"
log "📖 See DEPLOY_INSTRUCTIONS.md for next steps"
