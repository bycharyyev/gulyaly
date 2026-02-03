# GULYALY.COM PRODUCTION DEPLOYMENT - PowerShell Edition
# Execute from PowerShell: .\EXECUTE-DEPLOYMENT.ps1

Write-Host "============================================" -ForegroundColor Green
Write-Host "GULYALY.COM PRODUCTION DEPLOYMENT" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Step 1: Check prerequisites
Write-Host "[1/4] Checking prerequisites..." -ForegroundColor Yellow

# Check SSH
try {
    ssh -V 2>&1 | Out-Null
    Write-Host "  ✓ SSH available" -ForegroundColor Green
} catch {
    Write-Host "  ✗ SSH not found. Install Git for Windows or OpenSSH" -ForegroundColor Red
    exit 1
}

# Check rsync (via bash)
try {
    bash -c "which rsync" 2>&1 | Out-Null
    Write-Host "  ✓ rsync available" -ForegroundColor Green
} catch {
    Write-Host "  ✗ rsync not found. Install Git for Windows or WSL" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/4] Uploading code to VPS..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes..." -ForegroundColor Gray

# Upload code via rsync
$rsyncCmd = "rsync -avz --delete --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='.env' --exclude='*.log' c:/Users/miste/Downloads/codeakgus/ root@83.166.244.79:/var/www/gulyaly/"

bash -c $rsyncCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Code upload failed" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ Code uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Upload deployment script
Write-Host "[3/4] Running deployment script on VPS..." -ForegroundColor Yellow

scp c:/Users/miste/Downloads/codeakgus/deploy-vps-full.sh root@83.166.244.79:/root/

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Script upload failed" -ForegroundColor Red
    exit 1
}

# Execute deployment script
Write-Host "  Executing deployment (this will take 5-10 minutes)..." -ForegroundColor Gray
ssh root@83.166.244.79 "chmod +x /root/deploy-vps-full.sh && /root/deploy-vps-full.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Deployment script failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check logs:" -ForegroundColor Yellow
    Write-Host "  ssh root@83.166.244.79 'pm2 logs gulyaly --lines 50'" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "[4/4] Running verification..." -ForegroundColor Yellow

# Upload and run verification script
scp c:/Users/miste/Downloads/codeakgus/verify-deployment.sh root@83.166.244.79:/root/
ssh root@83.166.244.79 "chmod +x /root/verify-deployment.sh && /root/verify-deployment.sh"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Update Stripe keys:" -ForegroundColor White
Write-Host "   ssh root@83.166.244.79" -ForegroundColor Gray
Write-Host "   nano /var/www/gulyaly/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "   Update these lines:" -ForegroundColor White
Write-Host "   STRIPE_SECRET_KEY=`"sk_live_YOUR_KEY`"" -ForegroundColor Gray
Write-Host "   STRIPE_PUBLIC_KEY=`"pk_live_YOUR_KEY`"" -ForegroundColor Gray
Write-Host "   STRIPE_WEBHOOK_SECRET=`"whsec_YOUR_SECRET`"" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Restart PM2:" -ForegroundColor White
Write-Host "   pm2 restart gulyaly" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test site:" -ForegroundColor White
Write-Host "   https://gulyaly.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Configure Stripe webhook:" -ForegroundColor White
Write-Host "   https://dashboard.stripe.com/webhooks" -ForegroundColor Cyan
Write-Host "   Endpoint: https://gulyaly.com/api/webhooks/stripe" -ForegroundColor Gray
Write-Host ""
