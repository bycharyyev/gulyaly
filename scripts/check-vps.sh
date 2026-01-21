#!/bin/bash

echo "=========================================="
echo "🔍 Проверка состояния VPS"
echo "=========================================="
echo ""

# System Info
echo "📦 Система:"
uname -a
echo ""

# Node.js
echo "📦 Node.js:"
if command -v node &> /dev/null; then
    node -v
    which node
else
    echo "❌ Node.js не установлен"
fi
echo ""

# NPM
echo "📦 NPM:"
if command -v npm &> /dev/null; then
    npm -v
    which npm
else
    echo "❌ NPM не установлен"
fi
echo ""

# PM2
echo "📦 PM2:"
if command -v pm2 &> /dev/null; then
    pm2 -v
    echo ""
    echo "PM2 процессы:"
    pm2 list
else
    echo "❌ PM2 не установлен"
fi
echo ""

# PostgreSQL
echo "📦 PostgreSQL:"
if command -v psql &> /dev/null; then
    psql --version
    echo ""
    echo "PostgreSQL статус:"
    systemctl status postgresql --no-pager -l | head -5 || service postgresql status | head -5
else
    echo "❌ PostgreSQL не установлен"
fi
echo ""

# Nginx
echo "📦 Nginx:"
if command -v nginx &> /dev/null; then
    nginx -v
    echo ""
    echo "Nginx статус:"
    systemctl status nginx --no-pager -l | head -5 || service nginx status | head -5
    echo ""
    echo "Nginx конфигурация:"
    ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "Конфигурация не найдена"
else
    echo "❌ Nginx не установлен"
fi
echo ""

# Application directory
echo "📁 Директория приложения:"
if [ -d "/var/www/gulyaly" ]; then
    echo "✅ /var/www/gulyaly существует"
    echo ""
    echo "Содержимое:"
    ls -la /var/www/gulyaly | head -10
    echo ""
    if [ -f "/var/www/gulyaly/package.json" ]; then
        echo "✅ package.json найден"
        echo "Версия из package.json:"
        grep '"version"' /var/www/gulyaly/package.json || echo "Версия не указана"
    else
        echo "❌ package.json не найден"
    fi
    echo ""
    if [ -f "/var/www/gulyaly/.env" ]; then
        echo "✅ .env файл существует"
        echo "Переменные окружения (без значений):"
        grep -E '^[A-Z_]+=' /var/www/gulyaly/.env | cut -d'=' -f1 | head -10
    else
        echo "⚠️  .env файл не найден"
    fi
else
    echo "❌ /var/www/gulyaly не существует"
fi
echo ""

# Git
echo "📦 Git:"
if command -v git &> /dev/null; then
    git --version
    if [ -d "/var/www/gulyaly/.git" ]; then
        echo ""
        echo "Git репозиторий:"
        cd /var/www/gulyaly && git remote -v 2>/dev/null || echo "Нет remote репозитория"
        cd /var/www/gulyaly && git branch 2>/dev/null || echo "Не git репозиторий"
    fi
else
    echo "❌ Git не установлен"
fi
echo ""

# Ports
echo "🌐 Открытые порты:"
if command -v netstat &> /dev/null; then
    netstat -tulpn | grep -E ':(80|3000|5432|443)' || echo "Порты не найдены"
elif command -v ss &> /dev/null; then
    ss -tulpn | grep -E ':(80|3000|5432|443)' || echo "Порты не найдены"
else
    echo "Утилиты для проверки портов не найдены"
fi
echo ""

# Disk space
echo "💾 Дисковое пространство:"
df -h / | tail -1
echo ""

# Memory
echo "💾 Память:"
free -h 2>/dev/null || echo "Информация о памяти недоступна"
echo ""

echo "=========================================="
echo "✅ Проверка завершена"
echo "=========================================="

