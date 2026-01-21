#!/bin/bash
set -e

echo "===== VPS Deployment Setup ====="

# 1. Setup PostgreSQL Database
echo "Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE USER gulyalyuser WITH PASSWORD 'gulyaly2026secure';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gulyaly TO gulyalyuser;"
sudo -u postgres psql -c "ALTER DATABASE gulyaly OWNER TO gulyalyuser;"

# Configure PostgreSQL to allow password authentication
echo "Configuring PostgreSQL authentication..."
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
if ! grep -q "gulyaly" "$PG_HBA"; then
    echo "local   gulyaly           gulyalyuser                               md5" | sudo tee -a "$PG_HBA"
    echo "host    gulyaly           gulyalyuser       127.0.0.1/32            md5" | sudo tee -a "$PG_HBA"
    echo "host    gulyaly           gulyalyuser       ::1/128                 md5" | sudo tee -a "$PG_HBA"
    sudo systemctl restart postgresql
fi

# 2. Configure Environment Variables
echo "Configuring environment variables..."
cd /var/www/gulyaly

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
# Configure in /admin/sms
EOF

echo ".env file updated successfully"

# 3. Run Database Migration
echo "Running Prisma migrations..."
npx prisma generate
npx prisma db push --accept-data-loss

# 4. Rebuild the application
echo "Rebuilding Next.js application..."
npm run build

# 5. Configure PM2
echo "Setting up PM2..."
pm2 delete gulyaly 2>/dev/null || true
pm2 start npm --name "gulyaly" -- start
pm2 save
pm2 startup systemd -u root --hp /root | tail -n 1 | bash

# 6. Configure Nginx
echo "Configuring Nginx..."
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

# Enable site and restart nginx
ln -sf /etc/nginx/sites-available/gulyaly /etc/nginx/sites-enabled/gulyaly
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "===== Deployment Complete! ====="
echo "Application is now running at: https://gulyaly.com"
echo ""
echo "Useful commands:"
echo "  pm2 status      - Check application status"
echo "  pm2 logs gulyaly  - View application logs"
echo "  pm2 restart gulyaly - Restart application"
echo ""
