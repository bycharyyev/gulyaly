#!/bin/bash
#################################################
# GULYALY.COM DEPLOYMENT VERIFICATION
# Run on VPS after deployment
#################################################

set -e

echo "============================================"
echo "GULYALY.COM DEPLOYMENT VERIFICATION"
echo "============================================"
echo ""

PASS=0
FAIL=0

# Helper function
check() {
    if eval "$2" &>/dev/null; then
        echo "✓ $1"
        ((PASS++))
    else
        echo "✗ $1"
        ((FAIL++))
    fi
}

echo "[1] System Services"
check "PostgreSQL running" "systemctl is-active --quiet postgresql"
check "Nginx running" "systemctl is-active --quiet nginx"
check "PM2 gulyaly online" "pm2 list | grep -q 'gulyaly.*online'"
echo ""

echo "[2] Network & Ports"
check "Port 3000 listening (localhost only)" "netstat -tln | grep -q '127.0.0.1:3000'"
check "Port 80 listening" "netstat -tln | grep -q ':80'"
check "Port 443 listening" "netstat -tln | grep -q ':443'"
echo ""

echo "[3] Application Health"
check "Local health endpoint" "curl -sf http://localhost:3000/api/health"
check "HTTPS site accessible" "curl -sfI https://gulyaly.com | head -1 | grep -q '200'"
check "HTTP redirects to HTTPS" "curl -sI http://gulyaly.com | grep -q '301'"
echo ""

echo "[4] Database"
check "PostgreSQL gulyaly database exists" "sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw gulyaly"
check "User table exists" "sudo -u postgres psql -d gulyaly -c '\dt' | grep -q 'User'"
check "Product table exists" "sudo -u postgres psql -d gulyaly -c '\dt' | grep -q 'Product'"
check "Order table exists" "sudo -u postgres psql -d gulyaly -c '\dt' | grep -q 'Order'"
echo ""

echo "[5] SSL Certificate"
check "SSL certificate valid" "certbot certificates | grep -q 'gulyaly.com'"
check "SSL auto-renewal enabled" "systemctl is-active --quiet certbot.timer"
echo ""

echo "[6] Security"
check "Firewall enabled" "ufw status | grep -q 'Status: active'"
check "SSH allowed in firewall" "ufw status | grep -q 'OpenSSH.*ALLOW'"
check "HTTPS allowed in firewall" "ufw status | grep -q 'Nginx Full.*ALLOW'"
echo ""

echo "[7] File Permissions"
check ".env file secured (600)" "[ $(stat -c %a /var/www/gulyaly/.env 2>/dev/null) = '600' ]"
check "Log directory exists" "[ -d /var/log/gulyaly ]"
check "Legacy aimeos untouched" "[ -d /var/www/aimeos ]"
echo ""

echo "[8] PM2 Configuration"
check "PM2 startup configured" "systemctl list-units | grep -q pm2-root"
check "PM2 save file exists" "[ -f ~/.pm2/dump.pm2 ]"
echo ""

echo "============================================"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "============================================"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 ALL CHECKS PASSED - DEPLOYMENT SUCCESSFUL!"
    echo ""
    echo "Site is live at: https://gulyaly.com"
    echo ""
    echo "Useful commands:"
    echo "  pm2 logs gulyaly --lines 100"
    echo "  pm2 monit"
    echo "  tail -f /var/log/nginx/access.log"
    echo "  tail -f /var/log/gulyaly/error.log"
else
    echo "⚠️  SOME CHECKS FAILED - REVIEW REQUIRED"
    echo ""
    echo "Troubleshooting:"
    echo "  pm2 logs gulyaly --lines 100"
    echo "  journalctl -u nginx -n 50"
    echo "  tail -f /var/log/gulyaly/error.log"
fi

echo ""
