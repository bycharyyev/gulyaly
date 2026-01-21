# PowerShell Script to deploy the application to VPS
# Usage: scripts\deploy-vps.ps1

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deploying application to VPS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SSH is available
if (!(Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] SSH not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install OpenSSH Client:" -ForegroundColor Yellow
    Write-Host "  Windows: Install OpenSSH from Windows Features" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "[OK] SSH found" -ForegroundColor Green
Write-Host ""

$SERVER_HOST = "89.104.74.7"
$SERVER_USER = "root"
$LOCAL_PATH = "$(Get-Location)"
$REMOTE_PATH = "/var/www/gulyaly"

Write-Host "Connecting to $SERVER_USER@$SERVER_HOST..." -ForegroundColor Yellow
Write-Host ""

# Sync the code to the server using tar to pack and transfer
Write-Host "Syncing code to server..." -ForegroundColor Yellow

# Create a tar archive excluding node_modules, .git, and .next
$excludeArgs = @(
    "--exclude=node_modules",
    "--exclude=.git", 
    "--exclude=.next",
    "--exclude=*.log",
    "--exclude=tmp",
    "--exclude=.vscode",
    "--exclude=.idea"
)

$tarCmd = "tar", "cf", "-", "-C", $LOCAL_PATH, "." + $excludeArgs
$rsyncCmd = "ssh $SERVER_USER@$SERVER_HOST 'cd $REMOTE_PATH && tar -xf - && ls -la'"
$fullCmd = "$tarCmd | ssh $SERVER_USER@$SERVER_HOST 'cd $REMOTE_PATH && tar -xf -'"

Invoke-Expression $fullCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to sync code to server" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Code synced successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Installing dependencies on server..." -ForegroundColor Yellow

$installResult = ssh "$SERVER_USER@$SERVER_HOST" "cd $REMOTE_PATH && npm install"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
    Write-Host $installResult
    exit 1
}

Write-Host "[OK] Dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "Building application..." -ForegroundColor Yellow

$buildResult = ssh "$SERVER_USER@$SERVER_HOST" "cd $REMOTE_PATH && npm run build"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed" -ForegroundColor Red
    Write-Host $buildResult
    exit 1
}

Write-Host "[OK] Build completed" -ForegroundColor Green
Write-Host ""

Write-Host "Restarting PM2 process..." -ForegroundColor Yellow

$restartResult = ssh "$SERVER_USER@$SERVER_HOST" "cd $REMOTE_PATH && pm2 restart gulyaly || pm2 start npm --name 'gulyaly' -- run start"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to restart PM2 process" -ForegroundColor Red
    Write-Host $restartResult
    exit 1
}

Write-Host "[OK] PM2 process restarted" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Application is now running on $SERVER_HOST" -ForegroundColor Green
Write-Host "Visit: http://$SERVER_HOST or https://$SERVER_HOST" -ForegroundColor Green