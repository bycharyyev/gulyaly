#!/bin/bash

# Script to deploy the application to VPS
# Usage: scripts/deploy-vps.sh

echo "========================================="
echo "Deploying application to VPS"
echo "========================================="
echo

# Check if SSH is available
if ! command -v ssh &> /dev/null; then
    echo "[ERROR] SSH not found!"
    echo
    echo "Install OpenSSH Client:"
    echo "  Windows: Install OpenSSH from Windows Features"
    echo "  macOS: brew install openssh"
    echo "  Linux: sudo apt install openssh-client"
    echo
    exit 1
fi

echo "[OK] SSH found"
echo

SERVER_HOST="89.104.74.7"
SERVER_USER="root"

echo "Connecting to $SERVER_USER@$SERVER_HOST..."
echo

# Sync the code to the server
echo "Syncing code to server..."
rsync -avz --exclude node_modules --exclude .git --exclude .next ./ "$SERVER_USER@$SERVER_HOST:/var/www/gulyaly/"

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to sync code to server"
    exit 1
fi

echo "[OK] Code synced successfully"
echo

echo "Installing dependencies on server..."
ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /var/www/gulyaly
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies"
    exit 1
fi
echo "[OK] Dependencies installed"
EOF

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies on server"
    exit 1
fi

echo
echo "Building application..."
ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /var/www/gulyaly
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Build failed"
    exit 1
fi
echo "[OK] Build completed"
EOF

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to build application on server"
    exit 1
fi

echo
echo "Restarting PM2 process..."
ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /var/www/gulyaly
pm2 restart gulyaly
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to restart PM2 process"
    # Try starting if it doesn't exist
    pm2 start npm --name "gulyaly" -- run start
fi
echo "[OK] PM2 process restarted"
EOF

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to restart PM2 process"
    exit 1
fi

echo
echo "========================================="
echo "Deployment completed successfully!"
echo "========================================="
echo
echo "Application is now running on $SERVER_HOST"
echo "Visit: http://$SERVER_HOST or https://$SERVER_HOST"