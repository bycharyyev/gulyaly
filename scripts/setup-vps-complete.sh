#!/bin/bash
set -e

echo "=========================================="
echo "🚀 Полная настройка VPS для Gulyaly"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
APP_DIR="/var/www/gulyaly"
APP_NAME="gulyaly"
DOMAIN="gulyaly.com"
IP="89.104.74.7"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Пожалуйста, запустите скрипт от root${NC}"
   exit 1
fi

echo -e "${YELLOW}Шаг 1: Обновление системы...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Шаг 2: Установка Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo "Node.js уже установлен: $(node -v)"
fi

echo -e "${YELLOW}Шаг 3: Установка PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 уже установлен: $(pm2 -v)"
fi

echo -e "${YELLOW}Шаг 4: Установка PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
else
    echo "PostgreSQL уже установлен: $(psql --version)"
fi

echo -e "${YELLOW}Шаг 5: Настройка PostgreSQL...${NC}"
sudo -u postgres psql -c "CREATE DATABASE gulyaly;" 2>/dev/null || echo "База данных уже существует"
sudo -u postgres psql -c "CREATE USER gulyalyuser WITH PASSWORD 'gulyaly2026secure';" 2>/dev/null || echo "Пользователь уже существует"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gulyaly TO gulyalyuser;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER DATABASE gulyaly OWNER TO gulyalyuser;" 2>/dev/null || true

# Configure PostgreSQL authentication
PG_HBA="/etc/postgresql/*/main/pg_hba.conf"
if [ -f /etc/postgresql/16/main/pg_hba.conf ]; then
    PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
elif [ -f /etc/postgresql/15/main/pg_hba.conf ]; then
    PG_HBA="/etc/postgresql/15/main/pg_hba.conf"
elif [ -f /etc/postgresql/14/main/pg_hba.conf ]; then
    PG_HBA="/etc/postgresql/14/main/pg_hba.conf"
fi

if [ -f "$PG_HBA" ] && ! grep -q "gulyaly" "$PG_HBA"; then
    echo "local   gulyaly           gulyalyuser                               md5" >> "$PG_HBA"
    echo "host    gulyaly           gulyalyuser       127.0.0.1/32            md5" >> "$PG_HBA"
    echo "host    gulyaly           gulyalyuser       ::1/128                 md5" >> "$PG_HBA"
    systemctl restart postgresql
fi

echo -e "${YELLOW}Шаг 6: Установка Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
else
    echo "Nginx уже установлен: $(nginx -v 2>&1)"
fi

echo -e "${YELLOW}Шаг 7: Установка Git...${NC}"
if ! command -v git &> /dev/null; then
    apt install -y git
else
    echo "Git уже установлен: $(git --version)"
fi

echo -e "${YELLOW}Шаг 8: Создание директории приложения...${NC}"
mkdir -p "$APP_DIR"

echo -e "${YELLOW}Шаг 9: Настройка Nginx...${NC}"
cat > /etc/nginx/sites-available/gulyaly << 'NGINX_EOF'
server {
    listen 80;
    server_name gulyaly.com www.gulyaly.com 89.104.74.7;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/gulyaly /etc/nginx/sites-enabled/gulyaly
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo -e "${YELLOW}Шаг 10: Создание .env файла...${NC}"
cd "$APP_DIR"
cat > .env << 'ENV_EOF'
# Database - PostgreSQL
DATABASE_URL="postgresql://gulyalyuser:gulyaly2026secure@localhost:5432/gulyaly?schema=public"

# NextAuth
NEXTAUTH_URL="https://gulyaly.com"
NEXTAUTH_SECRET="yEPSvbFrD+KSmEKH31kStO4ZblN7zZPPg+hzKWEtCt0="

# App URL
NEXT_PUBLIC_APP_URL="https://gulyaly.com"
NEXT_PUBLIC_URL="https://gulyaly.com"

# Stripe (optional)
STRIPE_PUBLIC_KEY=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# SMS Gateway (optional)
SMS_DEVICE_ID=""
SMS_SECRET=""
SMS_GATEWAY_URL="https://sms.ibnux.net/"
SMS_SIM_NUMBER="0"

# Node Environment
NODE_ENV="production"
ENV_EOF

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Настройка VPS завершена!"
echo "==========================================${NC}"
echo ""
echo "Следующие шаги:"
echo "1. Склонируйте репозиторий в /var/www/gulyaly"
echo "2. Запустите: cd /var/www/gulyaly && npm install"
echo "3. Запустите: npm run db:generate && npm run db:push"
echo "4. Запустите: npm run build"
echo "5. Запустите: pm2 start npm --name gulyaly -- start"
echo "6. Запустите: pm2 save"
echo ""
echo "Или используйте скрипт deploy.sh для автоматического деплоя"
echo ""

