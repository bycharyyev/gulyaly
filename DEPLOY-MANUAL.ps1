# GULYALY.COM MANUAL DEPLOYMENT (No rsync required)
# Execute: .\DEPLOY-MANUAL.ps1

Write-Host "============================================" -ForegroundColor Green
Write-Host "GULYALY.COM PRODUCTION DEPLOYMENT" -ForegroundColor Green  
Write-Host "Manual method (no rsync)" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

$VPS = "root@83.166.244.79"
$LOCAL_PATH = "c:\Users\miste\Downloads\codeakgus"
$REMOTE_PATH = "/var/www/gulyaly"

Write-Host "Step 1: Create directory on VPS" -ForegroundColor Yellow
ssh $VPS "mkdir -p $REMOTE_PATH"

Write-Host "Step 2: Create tarball of code" -ForegroundColor Yellow
Write-Host "  Compressing code..." -ForegroundColor Gray

# Use tar to create archive (excluding unnecessary files)
$tarCmd = @"
tar -czf gulyaly-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='.env' \
  --exclude='*.log' \
  --exclude='gulyaly-deploy.tar.gz' \
  .
"@

&"C:\Program Files\Git\bin\bash.exe" -c $tarCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to create tarball" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ Tarball created" -ForegroundColor Green

Write-Host "Step 3: Upload tarball to VPS" -ForegroundColor Yellow
Write-Host "  Uploading (this may take 2-5 minutes)..." -ForegroundColor Gray

scp gulyaly-deploy.tar.gz ${VPS}:/tmp/

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Upload failed" -ForegroundColor Red
    Remove-Item gulyaly-deploy.tar.gz -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "  ✓ Tarball uploaded" -ForegroundColor Green

Write-Host "Step 4: Extract code on VPS" -ForegroundColor Yellow

ssh $VPS @"
cd $REMOTE_PATH
tar -xzf /tmp/gulyaly-deploy.tar.gz
rm -f /tmp/gulyaly-deploy.tar.gz
echo 'Code extracted successfully'
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Extraction failed" -ForegroundColor Red
    Remove-Item gulyaly-deploy.tar.gz -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "  ✓ Code extracted" -ForegroundColor Green

# Cleanup local tarball
Remove-Item gulyaly-deploy.tar.gz -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Step 5: Upload deployment script" -ForegroundColor Yellow

scp deploy-vps-full.sh ${VPS}:/root/

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Script upload failed" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ Deployment script uploaded" -ForegroundColor Green

Write-Host ""
Write-Host "Step 6: Execute deployment on VPS" -ForegroundColor Yellow
Write-Host "  This will take 5-10 minutes..." -ForegroundColor Gray
Write-Host "  Installing: Node.js, PM2, PostgreSQL, Nginx, SSL" -ForegroundColor Gray
Write-Host ""

ssh $VPS "chmod +x /root/deploy-vps-full.sh && /root/deploy-vps-full.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  ✗ Deployment failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Check logs:" -ForegroundColor Yellow
    Write-Host "    ssh $VPS 'tail -100 /var/log/gulyaly/error.log'" -ForegroundColor Gray
    Write-Host "    ssh $VPS 'pm2 logs gulyaly --lines 50'" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "Step 7: Run verification" -ForegroundColor Yellow

scp verify-deployment.sh ${VPS}:/root/
ssh $VPS "chmod +x /root/verify-deployment.sh && /root/verify-deployment.sh"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  CRITICAL: Update Stripe Keys" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. SSH to VPS and edit .env:" -ForegroundColor White
Write-Host "   ssh $VPS" -ForegroundColor Cyan
Write-Host "   nano /var/www/gulyaly/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Update these lines with real Stripe keys:" -ForegroundColor White
Write-Host "   STRIPE_SECRET_KEY=`"sk_live_YOUR_REAL_KEY`"" -ForegroundColor Gray
Write-Host "   STRIPE_PUBLIC_KEY=`"pk_live_YOUR_REAL_KEY`"" -ForegroundColor Gray  
Write-Host "   STRIPE_WEBHOOK_SECRET=`"whsec_YOUR_REAL_SECRET`"" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Restart PM2:" -ForegroundColor White
Write-Host "   pm2 restart gulyaly" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test the site:" -ForegroundColor White
Write-Host "   https://gulyaly.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Configure Stripe webhook:" -ForegroundColor White
Write-Host "   Dashboard: https://dashboard.stripe.com/webhooks" -ForegroundColor Cyan
Write-Host "   Endpoint:  https://gulyaly.com/api/webhooks/stripe" -ForegroundColor Gray
Write-Host "   Events:    checkout.session.completed, payment_intent.*" -ForegroundColor Gray
Write-Host ""
