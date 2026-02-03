# 🤖 ПРОМПТ ДЛЯ AI IDE (Cursor, Windsurf, Cline и др.)

## ГЛАВНАЯ ЗАДАЧА

Ты - эксперт DevOps инженер и fullstack разработчик. Твоя задача - автоматически развернуть Next.js проект на VPS с полной безопасностью.

---

## КОНТЕКСТ ПРОЕКТА

**Проект:** Gulyaly Digital Shop (интернет-магазин)
**Репозиторий:** https://github.com/bycharyyev/gulyaly
**Домен:** gulyaly.com (уже подключен к DNS)
**VPS:** 83.166.244.79 (Ubuntu, SSH доступ через root)
**Стек:** Next.js 16 + React 19 + TypeScript + PostgreSQL + Prisma + NextAuth

---

## ТВОИ ЗАДАЧИ (ВЫПОЛНЯТЬ ПОСЛЕДОВАТЕЛЬНО)

### ФАЗА 1: АНАЛИЗ И ИСПРАВЛЕНИЕ БЕЗОПАСНОСТИ

```
Задача: Найти и исправить все проблемы безопасности в коде

Шаги:
1. Проверить наличие чувствительных файлов в репозитории:
   - cookies.txt ❌ (удалить)
   - .env файлы ❌ (удалить если есть)
   - hardcoded пароли ❌ (убрать)
   - API ключи в коде ❌ (переместить в переменные окружения)

2. Проверить security headers в next.config.ts:
   - Strict-Transport-Security
   - X-Content-Type-Options
   - X-Frame-Options
   - X-XSS-Protection
   - Referrer-Policy
   
3. Добавить валидацию input'ов:
   - Установить zod: npm install zod
   - Создать lib/validation.ts
   - Добавить схемы валидации для всех API endpoints

4. Обновить middleware.ts:
   - Добавить security headers
   - Добавить rate limiting логику
   - Защитить admin роуты

5. Проверить API routes:
   - Добавить try-catch блоки
   - Валидировать входные данные
   - Санитайзить user input
   - Правильно обрабатывать ошибки

Создай файл: SECURITY_FIXES.md с описанием всех изменений
```

### ФАЗА 2: ПОДГОТОВКА К ДЕПЛОЮ

```
Задача: Подготовить код для production

Шаги:
1. Обновить .env.example:
   - Убрать все реальные значения
   - Оставить только плейсхолдеры
   - Добавить комментарии

2. Создать production .gitignore:
   .env
   .env.local
   .env.production
   cookies.txt
   *.log
   node_modules/
   .next/
   out/
   .vercel
   .DS_Store
   *.pem

3. Обновить package.json scripts:
   "scripts": {
     "dev": "next dev --turbopack",
     "build": "prisma generate && next build",
     "start": "next start",
     "lint": "next lint",
     "db:generate": "prisma generate",
     "db:push": "prisma db push",
     "db:migrate": "prisma migrate deploy",
     "db:seed": "tsx prisma/seed.ts"
   }

4. Создать deployment скрипт: scripts/deploy.sh

Создай файл: PRE_DEPLOY_CHECKLIST.md
```

### ФАЗА 3: VPS SETUP (АВТОМАТИЧЕСКИЙ СКРИПТ)

```
Задача: Создать полностью автоматический скрипт установки на VPS

Создай файл: scripts/auto-setup.sh

Содержание:
#!/bin/bash
set -e

echo "🚀 Начинаем автоматическую установку..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Проверка root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Запустите скрипт с sudo${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Обновление системы...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}✅ Установка необходимого ПО...${NC}"
apt install -y nodejs npm nginx postgresql postgresql-contrib certbot python3-certbot-nginx git ufw fail2ban

echo -e "${GREEN}✅ Установка PM2...${NC}"
npm install -g pm2

echo -e "${GREEN}✅ Создание пользователя deploy...${NC}"
if id "deploy" &>/dev/null; then
    echo "Пользователь deploy уже существует"
else
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
    echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/deploy
fi

echo -e "${GREEN}✅ Настройка PostgreSQL...${NC}"
sudo -u postgres psql <<EOF
SELECT 'CREATE DATABASE gulyaly_shop' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'gulyaly_shop')\gexec
SELECT 'CREATE USER gulyaly_user WITH ENCRYPTED PASSWORD ''$(openssl rand -base64 12)''' 
WHERE NOT EXISTS (SELECT FROM pg_user WHERE usename = 'gulyaly_user')\gexec
GRANT ALL PRIVILEGES ON DATABASE gulyaly_shop TO gulyaly_user;
\q
EOF

echo -e "${GREEN}✅ Настройка Firewall...${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

echo -e "${GREEN}✅ Настройка Fail2ban...${NC}"
systemctl enable fail2ban
systemctl start fail2ban

echo -e "${GREEN}✅ Клонирование проекта...${NC}"
mkdir -p /var/www/gulyaly
cd /var/www/gulyaly
if [ -d ".git" ]; then
    git pull origin main
else
    git clone https://github.com/bycharyyev/gulyaly.git .
fi

chown -R deploy:deploy /var/www/gulyaly

echo -e "${GREEN}✅ Создание .env файла...${NC}"
cat > .env <<EOL
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://gulyaly_user:CHANGE_THIS_PASSWORD@localhost:5432/gulyaly_shop?schema=public"
NEXTAUTH_URL="https://gulyaly.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
EOL

echo -e "${YELLOW}⚠️  ВАЖНО: Отредактируйте .env и замените DATABASE пароль!${NC}"

echo -e "${GREEN}✅ Установка зависимостей...${NC}"
su - deploy -c "cd /var/www/gulyaly && npm install"

echo -e "${GREEN}✅ Сборка проекта...${NC}"
su - deploy -c "cd /var/www/gulyaly && npm run build"

echo -e "${GREEN}✅ Применение миграций БД...${NC}"
su - deploy -c "cd /var/www/gulyaly && npx prisma generate && npx prisma db push"

echo -e "${GREEN}✅ Запуск с PM2...${NC}"
su - deploy -c "cd /var/www/gulyaly && pm2 start npm --name gulyaly -- start"
su - deploy -c "pm2 save"
su - deploy -c "pm2 startup | tail -1 | sudo bash"

echo -e "${GREEN}✅ Настройка Nginx...${NC}"
cat > /etc/nginx/sites-available/gulyaly.com <<'NGINX_EOF'
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=100r/s;

server {
    listen 80;
    listen [::]:80;
    server_name gulyaly.com www.gulyaly.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gulyaly.com www.gulyaly.com;

    ssl_certificate /etc/letsencrypt/live/gulyaly.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gulyaly.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    limit_req zone=general burst=200 nodelay;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
    }

    location /api/auth/ {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:3000;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/gulyaly.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo -e "${GREEN}✅ Получение SSL сертификата...${NC}"
certbot --nginx -d gulyaly.com -d www.gulyaly.com --non-interactive --agree-tos --email admin@gulyaly.com

echo -e "${GREEN}🎉 Установка завершена!${NC}"
echo -e "${YELLOW}Не забудьте:${NC}"
echo "1. Отредактировать /var/www/gulyaly/.env"
echo "2. Проверить сайт: https://gulyaly.com"
echo "3. Проверить PM2: pm2 status"
echo "4. Настроить бэкапы БД"

Сохрани этот файл и сделай его исполняемым:
chmod +x scripts/auto-setup.sh
```

### ФАЗА 4: ЗАПУСК ДЕПЛОЯ

```
Задача: Выполнить все команды автоматически

1. Закоммитить и запушить все изменения:
   git add .
   git commit -m "security: comprehensive security fixes and auto-deploy setup"
   git push origin main

2. SSH команда для запуска установки:
   ssh root@83.166.244.79 "bash -s" < scripts/auto-setup.sh

3. После установки - проверка:
   ssh root@83.166.244.79 "pm2 status && curl -I https://gulyaly.com"

Создай файл: DEPLOY_RESULTS.md с результатами
```

### ФАЗА 5: ПРОВЕРКА И ТЕСТЫ

```
Задача: Протестировать всё работает

1. Проверить security headers:
   curl -I https://gulyaly.com | grep -E "X-Frame|Strict-Transport|X-Content"

2. Проверить rate limiting:
   for i in {1..20}; do curl -I https://gulyaly.com/api/test 2>&1 | head -1; done

3. Проверить SSL:
   curl -vI https://gulyaly.com 2>&1 | grep SSL

4. Проверить приложение:
   ssh deploy@83.166.244.79 "pm2 logs gulyaly --lines 20"

5. Тест базы данных:
   ssh deploy@83.166.244.79 "cd /var/www/gulyaly && npx prisma studio"

Создай файл: TEST_RESULTS.md
```

---

## ДОПОЛНИТЕЛЬНЫЕ СКРИПТЫ

### scripts/quick-deploy.sh (быстрое обновление)
```bash
#!/bin/bash
# Быстрый деплой обновлений
cd /var/www/gulyaly
git pull origin main
npm install
npm run build
pm2 restart gulyaly
echo "✅ Деплой завершен!"
```

### scripts/backup-db.sh (бэкап БД)
```bash
#!/bin/bash
# Бэкап PostgreSQL
BACKUP_DIR="/var/backups/gulyaly"
mkdir -p $BACKUP_DIR
pg_dump -U gulyaly_user gulyaly_shop > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
echo "✅ Бэкап создан: $BACKUP_DIR"

# Удалить старые бэкапы (старше 7 дней)
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

### scripts/rollback.sh (откат на предыдущую версию)
```bash
#!/bin/bash
# Откат на предыдущий коммит
cd /var/www/gulyaly
git reset --hard HEAD~1
npm install
npm run build
pm2 restart gulyaly
echo "✅ Откат выполнен"
```

---

## МОНИТОРИНГ И АЛЕРТЫ

### Создай scripts/health-check.sh
```bash
#!/bin/bash
# Проверка здоровья сайта

# Проверка HTTP статуса
STATUS=$(curl -o /dev/null -s -w "%{http_code}" https://gulyaly.com)

if [ $STATUS -ne 200 ]; then
    echo "❌ Сайт недоступен! Статус: $STATUS"
    # Отправить уведомление (можно добавить Telegram/Email)
    pm2 restart gulyaly
else
    echo "✅ Сайт работает нормально"
fi

# Проверка PM2
PM2_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status')
if [ "$PM2_STATUS" != "online" ]; then
    echo "❌ PM2 проблема: $PM2_STATUS"
    pm2 restart gulyaly
fi

# Проверка PostgreSQL
if ! sudo -u postgres psql -c "SELECT 1" gulyaly_shop &>/dev/null; then
    echo "❌ PostgreSQL проблема"
    sudo systemctl restart postgresql
fi
```

### Добавь в crontab (мониторинг каждые 5 минут):
```bash
*/5 * * * * /var/www/gulyaly/scripts/health-check.sh >> /var/log/health-check.log 2>&1
```

---

## ИТОГОВЫЙ ЧЕКЛИСТ ДЛЯ AI

После выполнения всех задач, создай файл: COMPLETION_REPORT.md

```markdown
# 📋 ОТЧЕТ О ВЫПОЛНЕНИИ

## Выполненные задачи:

### Безопасность:
- [ ] Удален cookies.txt
- [ ] Удалены hardcoded пароли
- [ ] Добавлены security headers
- [ ] Добавлена валидация input'ов
- [ ] Обновлен middleware.ts
- [ ] Защищены API routes

### Код:
- [ ] Обновлен next.config.ts
- [ ] Создан lib/validation.ts
- [ ] Обновлены все API endpoints
- [ ] Добавлены try-catch блоки
- [ ] Санитизация user input

### VPS Setup:
- [ ] Создан auto-setup.sh
- [ ] Создан quick-deploy.sh
- [ ] Создан backup-db.sh
- [ ] Создан rollback.sh
- [ ] Создан health-check.sh

### Деплой:
- [ ] Запущен auto-setup.sh
- [ ] Настроен PostgreSQL
- [ ] Настроен Nginx + SSL
- [ ] Настроен PM2
- [ ] Настроен Firewall
- [ ] Настроен Fail2ban

### Проверка:
- [ ] HTTPS работает
- [ ] Security headers присутствуют
- [ ] Rate limiting работает
- [ ] База данных подключена
- [ ] PM2 online
- [ ] Логи без ошибок

## Результаты тестов:
[Вставь результаты curl команд]

## Проблемы:
[Список проблем если были]

## Следующие шаги:
1. Настроить бэкапы
2. Настроить мониторинг
3. Добавить CI/CD автодеплой
```

---

## КОМАНДЫ ДЛЯ ВЫПОЛНЕНИЯ (КОПИРОВАТЬ И ЗАПУСКАТЬ)

```bash
# 1. Клонировать репозиторий (если еще не клонирован)
git clone https://github.com/bycharyyev/gulyaly.git
cd gulyaly

# 2. Создать все скрипты (AI создаст автоматически)
mkdir -p scripts

# 3. Запустить установку на VPS
chmod +x scripts/auto-setup.sh
scp scripts/auto-setup.sh root@83.166.244.79:/root/
ssh root@83.166.244.79 "bash /root/auto-setup.sh"

# 4. Проверить результат
ssh deploy@83.166.244.79 "pm2 status"
curl -I https://gulyaly.com

# ГОТОВО! 🎉
```

---

## ПРИМЕР ИСПОЛЬЗОВАНИЯ В CURSOR/WINDSURF

Просто вставь это в чат AI IDE:

```
@workspace Я даю тебе полный доступ к проекту. 

Выполни ВСЕ задачи из файла AI_IDE_PROMPT.md последовательно:
1. Анализ безопасности и исправления
2. Подготовка к деплою
3. Создание автоматических скриптов
4. Запуск деплоя
5. Проверка и тесты

После каждой фазы создавай отчет. В конце - полный COMPLETION_REPORT.md

Начинай с ФАЗЫ 1!
```

AI автоматически:
- ✅ Найдет все проблемы
- ✅ Исправит код
- ✅ Создаст скрипты
- ✅ Развернет на VPS
- ✅ Протестирует всё
- ✅ Создаст отчеты

---

## ВРЕМЯ ВЫПОЛНЕНИЯ

- **ФАЗА 1** (Безопасность): 10-15 минут
- **ФАЗА 2** (Подготовка): 5 минут  
- **ФАЗА 3** (VPS Setup): 20-30 минут
- **ФАЗА 4** (Деплой): 5 минут
- **ФАЗА 5** (Тесты): 10 минут

**ИТОГО: 50-65 минут** полностью автоматически!

---

Создано: 03.02.2026
Для: Cursor, Windsurf, Cline, и других AI IDE
Проект: gulyaly.com