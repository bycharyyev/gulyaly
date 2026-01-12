# CI/CD Setup Instructions

## 🔐 Step 1: Generate SSH Key for GitHub Actions

On your local machine or VPS, generate a new SSH key:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy
```

This creates two files:
- `~/.ssh/github_deploy` (private key) - for GitHub Secrets
- `~/.ssh/github_deploy.pub` (public key) - for VPS

## 📋 Step 2: Add Public Key to VPS

Copy the public key to your VPS:

```bash
# Copy public key content
cat ~/.ssh/github_deploy.pub

# Then on VPS, add to authorized_keys:
ssh user@your-vps-ip
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste the public key and save
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

## 🔑 Step 3: Configure GitHub Secrets

Go to your GitHub repository:
1. Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add these secrets:

### Required Secrets:

**VPS_HOST**
```
your-vps-ip-address
Example: 123.456.78.90
```

**VPS_USER**
```
your-ssh-username
Example: root or ubuntu
```

**VPS_PORT**
```
22
(or your custom SSH port)
```

**VPS_SSH_KEY**
```
# Copy entire private key:
cat ~/.ssh/github_deploy

# Paste everything including:
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

**DATABASE_URL**
```
file:./dev.db
# Or for PostgreSQL:
postgresql://username:password@localhost:5432/database_name
```

**NEXTAUTH_URL**
```
https://your-domain.com
```

**NEXTAUTH_SECRET**
```
# Generate random secret:
openssl rand -base64 32
```

## 🚀 Step 4: Initial VPS Setup

Run these commands on your VPS (one time only):

```bash
# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PM2
sudo npm install -g pm2

# 3. Create app directory
sudo mkdir -p /var/www/akgus
sudo chown $USER:$USER /var/www/akgus

# 4. Clone repository
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git akgus
cd akgus

# 5. Create .env file
nano .env
# Paste your environment variables and save

# 6. Install dependencies
npm install

# 7. Generate Prisma
npm run db:generate
npm run db:push

# 8. Build application
npm run build

# 9. Start with PM2
pm2 start npm --name "akgus" -- start
pm2 save
pm2 startup
# Copy and run the command it outputs

# 10. Make deploy script executable
chmod +x scripts/deploy.sh
```

## 🌐 Step 5: Configure Nginx (if not done)

```bash
sudo nano /etc/nginx/sites-available/akgus
```

Paste:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /var/www/akgus/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/akgus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Step 6: Setup SSL (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## ✅ Step 7: Test CI/CD

1. Make a small change to your code
2. Commit and push:
```bash
git add .
git commit -m "Test CI/CD"
git push origin main
```

3. Go to GitHub → Actions tab
4. Watch the deployment process
5. Check your website after deployment completes

## 📊 Monitoring

Check deployment status:
```bash
# View PM2 status
pm2 status

# View logs
pm2 logs akgus

# View last 50 lines
pm2 logs akgus --lines 50

# Restart if needed
pm2 restart akgus
```

## 🔄 Manual Deployment

If you need to deploy manually without GitHub Actions:

```bash
ssh user@your-vps-ip
cd /var/www/akgus
bash scripts/deploy.sh
```

## 🐛 Troubleshooting

### Deployment fails with permission error:
```bash
# On VPS, ensure correct ownership:
sudo chown -R $USER:$USER /var/www/akgus
```

### SSH connection fails:
- Check VPS firewall allows SSH port
- Verify SSH key is correctly added to authorized_keys
- Test SSH connection manually:
```bash
ssh -i ~/.ssh/github_deploy user@vps-ip
```

### Build fails:
- Check .env file exists on VPS
- Verify all environment variables are set
- Check Node.js version: `node --version`

### PM2 not starting:
```bash
# Check logs
pm2 logs akgus --lines 100

# Delete and restart
pm2 delete akgus
pm2 start npm --name "akgus" -- start
pm2 save
```

## 📝 Workflow Triggers

The CI/CD pipeline runs automatically on:
- Push to `main` or `master` branch
- Manual trigger from GitHub Actions tab

## ⏱️ Deployment Time

Expected deployment time: **2-5 minutes**

Stages:
1. ✓ Checkout code (10s)
2. ✓ Install dependencies (30s)
3. ✓ Build application (60s)
4. ✓ Deploy to VPS (90s)
5. ✓ Restart services (20s)

## 🎉 Success!

Once configured, every push to main branch will automatically:
1. Build your application
2. Deploy to VPS
3. Restart services
4. Notify you of success/failure

Your CI/CD pipeline is now fully automated! 🚀
