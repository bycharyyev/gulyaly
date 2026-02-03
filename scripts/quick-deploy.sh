#!/bin/bash
# Quick deployment script for updates
# Usage: ./quick-deploy.sh

set -e

PROJECT_DIR="/var/www/gulyaly"
PROJECT_NAME="gulyaly"

echo "🚀 Starting quick deployment..."

cd $PROJECT_DIR

echo "📥 Pulling latest changes from GitHub..."
git pull origin main

echo "📦 Installing dependencies..."
npm install --production

echo "🔨 Building project..."
npm run build

echo "🗄️ Applying database migrations..."
npx prisma generate
npx prisma db push

echo "♻️ Restarting PM2..."
pm2 restart $PROJECT_NAME

echo "✅ Deployment completed successfully!"
echo ""
echo "Check status: pm2 status"
echo "View logs: pm2 logs $PROJECT_NAME"
