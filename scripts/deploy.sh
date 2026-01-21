#!/bin/bash

# Deployment script for VPS
# Run this script on your VPS to deploy/update the application

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/gulyaly"
APP_NAME="gulyaly"
NODE_VERSION="20"

# Check if running as root or sudo
if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then 
   echo -e "${RED}Please run as root or with sudo${NC}"
   exit 1
fi

# Navigate to app directory
echo -e "${YELLOW}Navigating to app directory...${NC}"
cd "$APP_DIR" || exit 1

# Pull latest code
echo -e "${YELLOW}Pulling latest code from git...${NC}"
git pull origin main || git pull origin master

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm ci --production

# Generate Prisma Client
echo -e "${YELLOW}Generating Prisma Client...${NC}"
npm run db:generate

# Apply database migrations
echo -e "${YELLOW}Applying database migrations...${NC}"
npm run db:push

# Build application
echo -e "${YELLOW}Building application...${NC}"
npm run build

# Restart PM2 process
echo -e "${YELLOW}Restarting PM2 process...${NC}"
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    pm2 restart "$APP_NAME"
else
    pm2 start npm --name "$APP_NAME" -- start
fi

# Save PM2 configuration
pm2 save

# Show PM2 status
echo -e "${GREEN}Deployment complete!${NC}"
pm2 status

# Show logs
echo -e "${YELLOW}Recent logs:${NC}"
pm2 logs "$APP_NAME" --lines 20 --nostream
