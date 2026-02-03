#!/bin/bash

#===============================================================================
# GULYALY PRODUCTION DEPLOYMENT SCRIPT
# Target: Ubuntu 22+ VPS with Nginx, PM2, Let's Encrypt SSL
# Domain: gulyaly.com
#===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="gulyaly.com"
APP_DIR="/var/www/gulyaly"
LOG_DIR="/var/log/gulyaly"
SERVER_USER="www-data"

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  GULYALY PRODUCTION DEPLOYMENT${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

#===============================================================================
# PHASE 0: SYSTEM CHECK
#===============================================================================
echo -e "${YELLOW}[PHASE 0] System Check...${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERROR] This script must be run as root${NC}"
   exit 1
fi

# Check OS
if [[ -f /etc/os-release ]]; then
    source /etc/os-release
    echo -e "${GREEN}[OK] OS: $PRETTY_NAME${NC}"
else
    echo -e "${RED}[ERROR] Cannot detect OS version${NC}"
    exit 1
fi

# Check time
echo -e "${GREEN}[OK] System time: $(date)${NC}"

# Update packages
echo -e "${YELLOW}[UPDATE] Updating system packages...${NC}"
apt-get update -qq
apt-get upgrade -y -qq

echo -e "${GREEN}[OK] System ready${NC}"
echo ""

#===============================================================================
# PHASE 1: INSTALL REQUIRED PACKAGES
#===============================================================================
echo -e "${YELLOW}[PHASE 1] Installing required packages...${NC}"

PACKAGES=(
    "nginx"
    "certbot"
    "python3-certbot-nginx"
    "ufw"
    "curl"
    "wget"
    "git"
)

for pkg in "${PACKAGES[@]}"; do
    if dpkg -l | grep -q "^ii  $pkg "; then
        echo -e "${GREEN}[OK] $pkg already installed${NC}"
    else
        echo -e "${YELLOW}[INSTALL] Installing $pkg...${NC}"
        apt-get install -y -qq "$pkg"
        echo -e "${GREEN}[OK] $pkg installed${NC}"
    fi
done

echo -e "${GREEN}[OK] All packages installed${NC}"
echo ""

#===============================================================================
# PHASE 2: FIREWALL HARDENING
#===============================================================================
echo -e "${YELLOW}[PHASE 2] Configuring firewall...${NC}"

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (limit connections to prevent brute force)
ufw allow ssh
ufw limit 22/tcp comment 'SSH with rate limiting'

# Allow HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable UFW
echo "y" | ufw enable

echo -e "${GREEN}[OK] Firewall configured${NC}"
ufw status numbered
echo ""

#===============================================================================
# PHASE 3: CREATE DIRECTORIES AND LOGGING
#===============================================================================
echo -e "${YELLOW}[PHASE 3] Setting up directories...${NC}"

# Create directories
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$LOG_DIR/nginx"

# Set permissions
chown -R $SERVER_USER:$SERVER_USER "$LOG_DIR"
chmod -R 755 "$LOG_DIR"

echo -e "${GREEN}[OK] Directories created${NC}"
echo ""

#===============================================================================
# PHASE 4: NGINX CONFIGURATION
#===============================================================================
echo -e "${YELLOW}[PHASE 4] Configuring Nginx...${NC}"

# Remove default config
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-available/default

# Create rate limit zone
cat > /etc/nginx/conf.d/rate-limits.conf << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=checkout:10m rate=3r/s;

# Connection limit
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
EOF

echo -e "${GREEN}[OK] Rate limiting zones created${NC}"

# Create main nginx config
cat > /etc/nginx/sites-available/gulyaly << 'EOF'
#===============================================================================
# GULYALY PRODUCTION NGINX CONFIGURATION
# Domain: gulyaly.com
#===============================================================================

# HTTP server - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name gulyaly.com www.gulyaly.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    # Redirect to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gulyaly.com www.gulyaly.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/gulyaly.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gulyaly.com/privkey.pem;
    
    # SSL Security - Modern configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/gulyaly.com/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Root directory
    root /var/www/gulyaly/public;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Connection limit
    limit_conn conn_limit 50;

    # Main application proxy
    location / {
        # Rate limiting - general
        limit_req zone=general burst=20 nodelay;

        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # API routes with stricter rate limiting
    location /api/ {
        # Stricter rate limiting for API
        limit_req zone=api burst=30 nodelay;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Auth endpoints - very strict rate limiting
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    # Checkout endpoints - strict rate limiting
    location /api/checkout {
        limit_req zone=checkout burst=10 nodelay;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Stripe webhook - bypass rate limiting for Stripe IPs
    location /api/webhooks/stripe {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Stripe sends from specific IPs, but we verify signature anyway
        proxy_connect_timeout 10s;
        proxy_read_timeout 30s;
    }

    # Health check endpoint - no rate limiting
    location /api/health {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets - aggressive caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff" always;
        
        # Connection limit for static assets
        limit_conn conn_limit 100;
        
        # Serve directly from Next.js public folder
        try_files $uri @nextjs;
    }

    # Next.js fallback
    location @nextjs {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Block common exploits
    location ~* \.(bak|backup|sql|log|ini|conf|txt|md|yml|yaml)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/gulyaly /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

echo -e "${GREEN}[OK] Nginx configured${NC}"
echo ""

#===============================================================================
# PHASE 5: SSL CERTIFICATE (LETS ENCRYPT)
#===============================================================================
echo -e "${YELLOW}[PHASE 5] Obtaining SSL certificate...${NC}"

# Check if certificate already exists
if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    echo -e "${GREEN}[OK] SSL certificate already exists${NC}"
else
    # Obtain certificate
    certbot certonly \
        --nginx \
        --non-interactive \
        --agree-tos \
        --email admin@$DOMAIN \
        -d $DOMAIN -d www.$DOMAIN
    
    if [[ $? -ne 0 ]]; then
        echo -e "${YELLOW}[WARNING] SSL certificate not obtained. Will retry after nginx is running.${NC}"
    else
        echo -e "${GREEN}[OK] SSL certificate obtained${NC}"
    fi
fi

# Enable auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

echo -e "${GREEN}[OK] SSL auto-renewal enabled${NC}"
echo ""

#===============================================================================
# PHASE 6: START SERVICES
#===============================================================================
echo -e "${YELLOW}[PHASE 6] Starting services...${NC}"

# Start nginx
systemctl reload nginx
systemctl enable nginx

echo -e "${GREEN}[OK] Nginx started${NC}"

# Check nginx status
systemctl status nginx --no-pager | head -5
echo ""

#===============================================================================
# PHASE 7: VERIFICATION
#===============================================================================
echo -e "${YELLOW}[PHASE 7] Verifying deployment...${NC}"

# Check if nginx is listening on port 443
if ss -tlnp | grep -q ':443'; then
    echo -e "${GREEN}[OK] Nginx listening on port 443${NC}"
else
    echo -e "${YELLOW}[WARNING] Nginx not listening on port 443${NC}"
fi

# Check if application is running
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health | grep -q "200\|503"; then
    echo -e "${GREEN}[OK] Application health check passed${NC}"
else
    echo -e "${YELLOW}[WARNING] Application health check failed - ensure PM2 is running${NC}"
fi

# Verify SSL (if obtained)
if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    echo -e "${GREEN}[OK] SSL certificate found${NC}"
    echo "Certificate expiry:"
    certbot certificates 2>/dev/null | grep -A2 "Certificate Name: $DOMAIN" || true
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Ensure PM2 is running: pm2 status"
echo "2. If not, start app: pm2 start ecosystem.config.js --env production"
echo "3. If SSL failed, run: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "4. Test HTTPS: https://$DOMAIN"
echo "5. Test rate limiting: curl -I https://$DOMAIN/"
echo ""
