#!/bin/bash
# Rollback to previous version
# Usage: ./rollback.sh

set -e

PROJECT_DIR="/var/www/gulyaly"
PROJECT_NAME="gulyaly"

echo "⏪ Rolling back to previous version..."

cd $PROJECT_DIR

# Show current commit
echo "Current commit:"
git log -1 --oneline

# Reset to previous commit
echo "Rolling back to previous commit..."
git reset --hard HEAD~1

echo "📦 Installing dependencies..."
npm install --production

echo "🔨 Building project..."
npm run build

echo "🗄️ Applying database migrations..."
npx prisma generate
npx prisma db push

echo "♻️ Restarting PM2..."
pm2 restart $PROJECT_NAME

echo "✅ Rollback completed successfully!"
echo ""
echo "New commit:"
git log -1 --oneline
echo ""
echo "Check status: pm2 status"
echo "View logs: pm2 logs $PROJECT_NAME"
