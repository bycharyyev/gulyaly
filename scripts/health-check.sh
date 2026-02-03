#!/bin/bash
# Health check script
# Runs every 5 minutes via cron

PROJECT_NAME="gulyaly"
SITE_URL="https://gulyaly.com"
LOCAL_URL="http://localhost:3000"

# Check HTTP status
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" $SITE_URL 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "301" ] && [ "$HTTP_STATUS" != "302" ]; then
    echo "[$(date)] ❌ Site is down! HTTP Status: $HTTP_STATUS"
    
    # Try to restart the application
    echo "[$(date)] Attempting to restart application..."
    pm2 restart $PROJECT_NAME
    
    # Wait and check again
    sleep 10
    HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" $SITE_URL 2>/dev/null || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
        echo "[$(date)] ✅ Application restarted successfully"
    else
        echo "[$(date)] ❌ Failed to restart application. Manual intervention required."
    fi
else
    echo "[$(date)] ✅ Site is operational (HTTP $HTTP_STATUS)"
fi

# Check PM2 process status
PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"'$PROJECT_NAME'","pm2_env":{"status":"[^"]*"' | grep -o 'status":"[^"]*' | cut -d'"' -f2)

if [ "$PM2_STATUS" != "online" ]; then
    echo "[$(date)] ❌ PM2 process is not online. Status: $PM2_STATUS"
    pm2 restart $PROJECT_NAME
    echo "[$(date)] PM2 process restarted"
else
    echo "[$(date)] ✅ PM2 process is online"
fi

# Check PostgreSQL
if ! sudo -u postgres psql -c "SELECT 1" gulyaly_shop &>/dev/null; then
    echo "[$(date)] ❌ PostgreSQL connection failed"
    sudo systemctl restart postgresql
    echo "[$(date)] PostgreSQL restarted"
else
    echo "[$(date)] ✅ PostgreSQL is operational"
fi

# Check Nginx
if ! systemctl is-active --quiet nginx; then
    echo "[$(date)] ❌ Nginx is not running"
    sudo systemctl restart nginx
    echo "[$(date)] Nginx restarted"
else
    echo "[$(date)] ✅ Nginx is running"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "[$(date)] ⚠️ WARNING: Disk usage is at ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    echo "[$(date)] ⚠️ WARNING: Memory usage is at ${MEMORY_USAGE}%"
fi

echo "[$(date)] Health check completed"
echo "---"
