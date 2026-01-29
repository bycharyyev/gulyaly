# 🛡️ Security Hardening Guide

## 🔥 CRITICAL SECURITY MEASURES

### 1️⃣ Server Security (Ubuntu)

#### Firewall Setup
```bash
# Enable UFW firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

#### SSH Hardening
```bash
# Backup SSH config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Secure SSH configuration
cat > /etc/ssh/sshd_config << 'EOF'
Port 22
Protocol 2
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
MaxSessions 2
Banner /etc/ssh/banner
EOF

# Create SSH banner
cat > /etc/ssh/banner << 'EOF'
***************************************************************************
                            AUTHORIZED ACCESS ONLY
***************************************************************************
This system is for authorized users only. Individual use of this system
and/or network without authority from the system owner is strictly
prohibited.
***************************************************************************
EOF

# Restart SSH service
systemctl restart sshd
```

#### Fail2Ban Setup
```bash
# Install fail2ban
apt update && apt install fail2ban -y

# Configure fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
EOF

systemctl enable fail2ban
systemctl start fail2ban
```

### 2️⃣ Application Security

#### Environment Variables Security
```bash
# Secure .env file permissions
chmod 600 /var/www/gulyaly/.env
chown www-data:www-data /var/www/gulyaly/.env

# Create secure environment template
cat > /var/www/gulyaly/.env.example << 'EOF'
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/gulyaly"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-256-bits-minimum"
NEXTAUTH_URL="https://gulyaly.com"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Telegram
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_ADMIN_CHAT_ID="your-admin-chat-id"

# Security
CORS_ORIGIN="https://gulyaly.com"
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Monitoring
LOG_LEVEL="info"
SENTRY_DSN="your-sentry-dsn"
EOF
```

#### Rate Limiting Configuration
```typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server';

const rateLimitMap = new Map();

export function rateLimit({
  windowMs = 15 * 60 * 1000, // 15 minutes
  maxRequests = 100,
}: {
  windowMs?: number;
  maxRequests?: number;
} = {}) {
  return function (request: NextRequest) {
    const ip = request.ip || 
               request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    
    if (!record) {
      rateLimitMap.set(ip, {
        count: 1,
        resetAt: now + windowMs,
      });
      return { success: true };
    }
    
    if (now > record.resetAt) {
      rateLimitMap.set(ip, {
        count: 1,
        resetAt: now + windowMs,
      });
      return { success: true };
    }
    
    if (record.count >= maxRequests) {
      return { 
        success: false, 
        resetAt: record.resetAt,
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      };
    }
    
    record.count++;
    return { success: true };
  };
}

// Cleanup old entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes
```

#### Security Headers Middleware
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload');
  }

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.stripe.com https://api.telegram.org",
    "frame-src 'self' https://js.stripe.com",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

### 3️⃣ Database Security

#### PostgreSQL Security Configuration
```sql
-- Create dedicated database user
CREATE USER gulyaly_app WITH PASSWORD 'strong-password-here';
CREATE DATABASE gulyaly_prod OWNER gulyaly_app;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE gulyaly_prod TO gulyaly_app;
GRANT USAGE ON SCHEMA public TO gulyaly_app;
GRANT CREATE ON SCHEMA public TO gulyaly_app;

-- Set row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY users_own_data ON users
    FOR ALL TO gulyaly_app
    USING (id = current_setting('app.current_user_id')::uuid);

CREATE POLICY orders_own_data ON orders
    FOR ALL TO gulyaly_app
    USING (userId = current_setting('app.current_user_id')::uuid);
```

#### Database Connection Security
```typescript
// lib/secure-db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection pooling for production
if (process.env.NODE_ENV === 'production') {
  prisma.$connect();
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

### 4️⃣ SSL/TLS Configuration

#### Let's Encrypt Certificate Setup
```bash
# Install Certbot
apt update && apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
certbot --nginx -d gulyaly.com -d www.gulyaly.com --email admin@gulyaly.com --agree-tos --no-eff-email

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# Test renewal
certbot renew --dry-run
```

#### Nginx SSL Configuration
```nginx
# /etc/nginx/sites-available/gulyaly
server {
    listen 443 ssl http2;
    server_name gulyaly.com www.gulyaly.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/gulyaly.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gulyaly.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

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

    # API Rate Limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        # ... same proxy headers
    }

    # Login Rate Limiting
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        # ... same proxy headers
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name gulyaly.com www.gulyaly.com;
    return 301 https://$server_name$request_uri;
}
```

### 5️⃣ Monitoring and Logging

#### Security Monitoring Script
```bash
#!/bin/bash
# /usr/local/bin/security-monitor.sh

# Log file
LOG_FILE="/var/log/security-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check for suspicious SSH activity
SSH_FAILED=$(grep "Failed password" /var/log/auth.log | grep "$DATE" | wc -l)
if [ $SSH_FAILED -gt 10 ]; then
    echo "[$DATE] WARNING: $SSH_FAILED failed SSH attempts detected" >> $LOG_FILE
fi

# Check for suspicious web activity
SUSPICIOUS_REQUESTS=$(grep "401\|403\|404" /var/log/nginx/access.log | grep "$DATE" | wc -l)
if [ $SUSPICIOUS_REQUESTS -gt 100 ]; then
    echo "[$DATE] WARNING: $SUSPICIOUS_REQUESTS suspicious web requests detected" >> $LOG_FILE
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$DATE] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "[$DATE] WARNING: Memory usage is ${MEM_USAGE}%" >> $LOG_FILE
fi

# Check if services are running
if ! systemctl is-active --quiet nginx; then
    echo "[$DATE] CRITICAL: Nginx is not running" >> $LOG_FILE
fi

if ! systemctl is-active --quiet postgresql; then
    echo "[$DATE] CRITICAL: PostgreSQL is not running" >> $LOG_FILE
fi

if ! systemctl is-active --quiet gulyaly; then
    echo "[$DATE] CRITICAL: Gulyaly app is not running" >> $LOG_FILE
fi
```

#### Setup Monitoring Cron Job
```bash
# Add to crontab
echo "*/5 * * * * /usr/local/bin/security-monitor.sh" | crontab -
```

This comprehensive security setup provides:
- ✅ Server hardening (firewall, SSH, fail2ban)
- ✅ Application security (rate limiting, headers, CSP)
- ✅ Database security (RLS, dedicated user)
- ✅ SSL/TLS with automatic renewal
- ✅ Continuous monitoring and logging
