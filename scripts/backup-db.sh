#!/bin/bash
# Database backup script
# Usage: ./backup-db.sh

BACKUP_DIR="/var/backups/gulyaly"
DB_NAME="gulyaly_shop"
DB_USER="gulyaly_user"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"

echo "🗄️ Starting database backup..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
PGPASSWORD=$(grep DATABASE_URL /var/www/gulyaly/.env | cut -d':' -f3 | cut -d'@' -f1) \
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

echo "✅ Backup created: ${BACKUP_FILE}.gz"

# Delete backups older than 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
echo "🧹 Cleaned up old backups (older than 7 days)"

# Show disk usage
echo "💾 Backup directory size:"
du -sh $BACKUP_DIR
