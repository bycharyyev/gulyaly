@echo off
REM ============================================
REM GULYALY.COM PRODUCTION DEPLOYMENT
REM Windows PowerShell Script
REM ============================================

echo ============================================
echo GULYALY.COM PRODUCTION DEPLOYMENT
echo ============================================
echo.
echo This script will deploy gulyaly.com to VPS
echo VPS IP: 83.166.244.79
echo Domain: gulyaly.com
echo.
echo PREREQUISITES:
echo   1. SSH access to root@83.166.244.79
echo   2. rsync installed (from Git Bash or WSL)
echo   3. Stripe API keys ready
echo.
pause

REM Step 1: Upload code to VPS
echo.
echo [1/4] Uploading code to VPS...
echo.
bash -c "rsync -avz --delete --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='.env' --exclude='*.log' c:/Users/miste/Downloads/codeakgus/ root@83.166.244.79:/var/www/gulyaly/"

if %errorlevel% neq 0 (
    echo ERROR: Code upload failed
    pause
    exit /b 1
)

echo.
echo Code uploaded successfully!
echo.

REM Step 2: Upload and run deployment script
echo [2/4] Running deployment script on VPS...
echo.

scp c:/Users/miste/Downloads/codeakgus/deploy-vps-full.sh root@83.166.244.79:/root/
ssh root@83.166.244.79 "chmod +x /root/deploy-vps-full.sh && /root/deploy-vps-full.sh"

if %errorlevel% neq 0 (
    echo ERROR: Deployment script failed
    pause
    exit /b 1
)

echo.
echo Deployment script completed!
echo.

REM Step 3: Update Stripe keys
echo [3/4] Update Stripe API keys...
echo.
echo IMPORTANT: You must manually update Stripe keys
echo.
echo Run this command:
echo   ssh root@83.166.244.79
echo   nano /var/www/gulyaly/.env
echo.
echo Update these lines:
echo   STRIPE_SECRET_KEY="sk_live_YOUR_REAL_KEY"
echo   STRIPE_PUBLIC_KEY="pk_live_YOUR_REAL_KEY"
echo   STRIPE_WEBHOOK_SECRET="whsec_YOUR_REAL_SECRET"
echo.
echo Then restart PM2:
echo   pm2 restart gulyaly
echo.
pause

REM Step 4: Verify deployment
echo [4/4] Running verification...
echo.

scp c:/Users/miste/Downloads/codeakgus/verify-deployment.sh root@83.166.244.79:/root/
ssh root@83.166.244.79 "chmod +x /root/verify-deployment.sh && /root/verify-deployment.sh"

echo.
echo ============================================
echo DEPLOYMENT COMPLETE!
echo ============================================
echo.
echo Site should be live at: https://gulyaly.com
echo.
echo Next steps:
echo   1. Update Stripe keys in .env
echo   2. Restart PM2: ssh root@83.166.244.79 "pm2 restart gulyaly"
echo   3. Monitor logs: ssh root@83.166.244.79 "pm2 logs gulyaly"
echo.
pause
