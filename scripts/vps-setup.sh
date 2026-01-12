#!/bin/bash

# Initial VPS Setup Script
# Run this once on your VPS to prepare for CI/CD deployment

set -e

echo "🚀 Setting up VPS for deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
APP_DIR="/var/www/akgus"
APP_NAME="akgus"
DOMAIN=""  # Set your domain here if you have one

echo -e "${YELLOW}This script will install and configure:${NC}"
echo "  - Node.js 20"
echo "  - PM2 Process Manager"
echo "  - Nginx Web Server"
echo "  - PostgreSQL (optional)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20
echo -e "${YELLOW}Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo -e "${GREEN}Node.js version:${NC} $(node --version)"
echo -e "${GREEN}NPM version:${NC} $(npm --version)"

# Install PM2
echo -e "${YELLOW}Installing PM2...${NC}"
sudo npm install -g pm2

# Install Nginx
echo -e "${YELLOW}Installing Nginx...${NC}"
sudo apt-get install -y nginx

# Install Git
echo -e "${YELLOW}Installing Git...${NC}"
sudo apt-get install -y git

# Optional: Install PostgreSQL
read -p "Install PostgreSQL? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Installing PostgreSQL...${NC}"
    sudo apt-get install -y postgresql postgresql-contrib
    
    echo -e "${YELLOW}Creating database...${NC}"
    read -p "Enter database name [akgus]: " DB_NAME
    DB_NAME=${DB_NAME:-akgus}
    
    read -p "Enter database user [akgususer]: " DB_USER
    DB_USER=${DB_USER:-akgususer}
    
    read -sp "Enter database password: " DB_PASS
    echo
    
    sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF
    
    echo -e "${GREEN}PostgreSQL setup complete!${NC}"
    echo -e "${YELLOW}Your DATABASE_URL:${NC}"
    echo "postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
fi

# Create app directory
echo -e "${YELLOW}Creating app directory...${NC}"
sudo mkdir -p "$APP_DIR"
sudo chown $USER:$USER "$APP_DIR"

# Ask for repository
echo ""
read -p "Enter your GitHub repository URL: " REPO_URL

if [ -n "$REPO_URL" ]; then
    echo -e "${YELLOW}Cloning repository...${NC}"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
    
    # Create .env file
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env <<EOF
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Stripe (optional)
STRIPE_PUBLIC_KEY=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# SMS Gateway (optional)
# Configure in /admin/sms
EOF
    
    echo -e "${GREEN}.env file created!${NC}"
    echo -e "${YELLOW}Please edit it with your values:${NC} nano .env"
    
    # Install dependencies
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    
    # Generate Prisma
    echo -e "${YELLOW}Setting up database...${NC}"
    npm run db:generate
    npm run db:push
    
    # Build
    echo -e "${YELLOW}Building application...${NC}"
    npm run build
    
    # Start with PM2
    echo -e "${YELLOW}Starting application...${NC}"
    pm2 start npm --name "$APP_NAME" -- start
    pm2 save
    pm2 startup
    
    echo ""
    echo -e "${GREEN}⚠️  IMPORTANT: Copy and run the command above to enable PM2 on startup${NC}"
    echo ""
fi

# Configure Nginx
echo ""
read -p "Configure Nginx? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your domain name (or press Enter for IP only): " DOMAIN
    
    if [ -n "$DOMAIN" ]; then
        SERVER_NAME="$DOMAIN"
    else
        SERVER_NAME="_"
    fi
    
    echo -e "${YELLOW}Creating Nginx configuration...${NC}"
    sudo tee /etc/nginx/sites-available/akgus > /dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /uploads/ {
        alias $APP_DIR/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/akgus /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload
    sudo nginx -t && sudo systemctl reload nginx
    
    echo -e "${GREEN}Nginx configured!${NC}"
    
    # SSL Setup
    if [ -n "$DOMAIN" ]; then
        echo ""
        read -p "Install SSL certificate with Let's Encrypt? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Installing Certbot...${NC}"
            sudo apt-get install -y certbot python3-certbot-nginx
            
            echo -e "${YELLOW}Obtaining SSL certificate...${NC}"
            sudo certbot --nginx -d "$DOMAIN"
            
            echo -e "${GREEN}SSL configured!${NC}"
        fi
    fi
fi

# Configure firewall
echo ""
read -p "Configure UFW firewall? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Configuring firewall...${NC}"
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    echo -e "${GREEN}Firewall configured!${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ VPS Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Application Status:${NC}"
pm2 status
echo ""
echo -e "${YELLOW}Access your application at:${NC}"
if [ -n "$DOMAIN" ]; then
    echo "  https://$DOMAIN"
else
    echo "  http://$(curl -s ifconfig.me)"
fi
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Edit .env file: nano $APP_DIR/.env"
echo "  2. Configure GitHub Secrets (see CICD_SETUP.md)"
echo "  3. Push code to trigger automatic deployment"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  pm2 logs $APP_NAME       - View logs"
echo "  pm2 restart $APP_NAME    - Restart app"
echo "  pm2 monit                - Monitor app"
echo "  bash $APP_DIR/scripts/deploy.sh  - Manual deploy"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
