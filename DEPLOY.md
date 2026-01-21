# 🚀 Инструкция по деплою на VPS

## 📋 Информация о VPS

- **IP адрес:** 89.104.74.7
- **Домен:** gulyaly.com
- **Пользователь:** root
- **SSH ключ:** уже настроен

## 🔍 Шаг 1: Проверка текущего состояния VPS

Подключитесь к VPS и запустите скрипт проверки:

```bash
ssh root@89.104.74.7
cd /var/www/gulyaly 2>/dev/null || echo "Директория не существует"
bash -c "$(curl -fsSL https://raw.githubusercontent.com/bycharyyev/gulyaly/main/scripts/check-vps.sh)" || bash scripts/check-vps.sh
```

Или скопируйте скрипт на VPS:

```bash
# На вашем локальном компьютере
scp scripts/check-vps.sh root@89.104.74.7:/tmp/

# На VPS
ssh root@89.104.74.7
bash /tmp/check-vps.sh
```

## 🛠️ Шаг 2: Первоначальная настройка VPS (если нужно)

Если на VPS еще ничего не установлено, выполните полную настройку:

```bash
ssh root@89.104.74.7

# Скопируйте скрипт на VPS
# (с вашего локального компьютера)
scp scripts/setup-vps-complete.sh root@89.104.74.7:/tmp/

# На VPS запустите
bash /tmp/setup-vps-complete.sh
```

Или выполните вручную:

```bash
# 1. Обновление системы
apt update && apt upgrade -y

# 2. Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Установка PM2
npm install -g pm2

# 4. Установка PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# 5. Настройка PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE gulyaly;"
sudo -u postgres psql -c "CREATE USER gulyalyuser WITH PASSWORD 'gulyaly2026secure';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gulyaly TO gulyalyuser;"
sudo -u postgres psql -c "ALTER DATABASE gulyaly OWNER TO gulyalyuser;"

# 6. Установка Nginx
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# 7. Установка Git
apt install -y git
```

## 📦 Шаг 3: Клонирование и настройка проекта

```bash
ssh root@89.104.74.7

# Создать директорию
mkdir -p /var/www/gulyaly
cd /var/www/gulyaly

# Клонировать репозиторий (если еще не клонирован)
git clone https://github.com/bycharyyev/gulyaly.git . || git pull origin main

# Или если репозиторий уже есть, просто обновить
cd /var/www/gulyaly
git pull origin main
```

## ⚙️ Шаг 4: Настройка окружения

```bash
cd /var/www/gulyaly

# Создать .env файл
cat > .env << 'EOF'
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
EOF
```

## 🔧 Шаг 5: Установка зависимостей и сборка

```bash
cd /var/www/gulyaly

# Установить зависимости
npm install

# Сгенерировать Prisma Client
npm run db:generate

# Применить миграции базы данных
npm run db:push

# Собрать приложение
npm run build
```

## 🚀 Шаг 6: Запуск приложения через PM2

```bash
cd /var/www/gulyaly

# Остановить старый процесс (если есть)
pm2 delete gulyaly 2>/dev/null || true

# Запустить приложение
pm2 start npm --name "gulyaly" -- start

# Сохранить конфигурацию PM2
pm2 save

# Настроить автозапуск при перезагрузке
pm2 startup systemd -u root --hp /root
# Выполните команду, которую выведет PM2

# Проверить статус
pm2 status
pm2 logs gulyaly
```

## 🌐 Шаг 7: Настройка Nginx

```bash
# Создать конфигурацию Nginx
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

# Активировать конфигурацию
ln -sf /etc/nginx/sites-available/gulyaly /etc/nginx/sites-enabled/gulyaly
rm -f /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Перезапустить Nginx
systemctl restart nginx
```

## 🔒 Шаг 8: Настройка SSL (Let's Encrypt)

```bash
# Установить Certbot
apt install -y certbot python3-certbot-nginx

# Получить SSL сертификат
certbot --nginx -d gulyaly.com -d www.gulyaly.com

# Автоматическое обновление сертификата
certbot renew --dry-run
```

После установки SSL, обновите `.env` файл:
```bash
cd /var/www/gulyaly
# Убедитесь, что NEXTAUTH_URL и NEXT_PUBLIC_APP_URL используют https://
```

## 🔄 Шаг 9: Автоматический деплой (обновление)

Для обновления приложения используйте скрипт деплоя:

```bash
cd /var/www/gulyaly
bash scripts/deploy.sh
```

Или вручную:

```bash
cd /var/www/gulyaly
git pull origin main
npm install
npm run db:generate
npm run db:push
npm run build
pm2 restart gulyaly
```

## 📊 Полезные команды

### PM2
```bash
pm2 status              # Статус приложения
pm2 logs gulyaly        # Логи приложения
pm2 restart gulyaly     # Перезапуск
pm2 stop gulyaly        # Остановка
pm2 monit               # Мониторинг в реальном времени
```

### Nginx
```bash
systemctl status nginx   # Статус
systemctl restart nginx # Перезапуск
nginx -t                # Проверка конфигурации
tail -f /var/log/nginx/error.log  # Логи ошибок
```

### PostgreSQL
```bash
systemctl status postgresql
sudo -u postgres psql -d gulyaly  # Подключение к БД
```

### Логи приложения
```bash
# PM2 логи
pm2 logs gulyaly --lines 100

# Nginx логи
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Системные логи
journalctl -u nginx -f
```

## 🐛 Решение проблем

### Приложение не запускается
```bash
# Проверить логи
pm2 logs gulyaly --err

# Проверить переменные окружения
cd /var/www/gulyaly
cat .env

# Проверить подключение к БД
npm run db:push
```

### Nginx не работает
```bash
# Проверить конфигурацию
nginx -t

# Проверить логи
tail -f /var/log/nginx/error.log

# Проверить что приложение запущено
pm2 status
curl http://localhost:3000
```

### Проблемы с базой данных
```bash
# Проверить статус PostgreSQL
systemctl status postgresql

# Подключиться к БД
sudo -u postgres psql -d gulyaly

# Проверить пользователя
sudo -u postgres psql -c "\du"
```

## ✅ Проверка работоспособности

После деплоя проверьте:

1. **Приложение работает:**
   ```bash
   curl http://localhost:3000
   ```

2. **Nginx проксирует запросы:**
   ```bash
   curl http://gulyaly.com
   ```

3. **PM2 процесс запущен:**
   ```bash
   pm2 status
   ```

4. **База данных доступна:**
   ```bash
   cd /var/www/gulyaly
   npm run db:push
   ```

## 📝 Примечания

- Убедитесь, что домен `gulyaly.com` указывает на IP `89.104.74.7`
- После установки SSL обновите переменные окружения на `https://`
- Регулярно обновляйте зависимости: `npm update`
- Делайте бэкапы базы данных перед обновлениями

