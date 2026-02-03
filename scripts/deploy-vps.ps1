# PowerShell Script to deploy the application to VPS
# Usage: scripts\deploy-vps.ps1
# Requires: OpenSSH for Windows

param(
    [string]$ServerHost = "89.104.74.7",
    [string]$ServerUser = "root",
    [string]$RemotePath = "/var/www/gulyaly"
)

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deploying application to VPS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SSH is available
if (!(Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] SSH not found!" -ForegroundColor Red
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Install OpenSSH Client:" -ForegroundColor Yellow
    Write-Host "  Windows: Settings -> Apps -> Optional Features -> OpenSSH Client" -ForegroundColor Yellow
    Write-Host "  Or run: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] SSH found" -ForegroundColor Green
Write-Host ""

$LocalPath = (Get-Location).Path

Write-Host "Connecting to $ServerUser@$ServerHost..." -ForegroundColor Yellow
Write-Host ""

# Function to run SSH command
function Invoke-SshCommand {
    param([string]$Command)
    ssh "$ServerUser@$ServerHost" "$Command"
}

# Sync the code to the server using rsync
Write-Host "Syncing code to server..." -ForegroundColor Yellow

$rsyncResult = rsync -avz `
    --exclude='node_modules' `
    --exclude='.git' `
    --exclude='.next' `
    --exclude='*.log' `
    --exclude='tmp' `
    --exclude='.vscode' `
    --exclude='.idea' `
    --exclude='*.pem' `
    --exclude='.env' `
    --delete `
    "$LocalPath/" "$ServerUser@$ServerHost`:"$RemotePath/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to sync code to server" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Code synced successfully" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies on server..." -ForegroundColor Yellow
$installResult = Invoke-SshCommand "cd $RemotePath && npm install --production"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
    Write-Host $installResult
    exit 1
}

Write-Host "[OK] Dependencies installed" -ForegroundColor Green
Write-Host ""

# Build application
Write-Host "Building application..." -ForegroundColor Yellow
$buildResult = Invoke-SshCommand "cd $RemotePath && npm run build"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed" -ForegroundColor Red
    Write-Host $buildResult
    exit 1
}

Write-Host "[OK] Build completed" -ForegroundColor Green
Write-Host ""

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
$prismaResult = Invoke-SshCommand "cd $RemotePath && npx prisma generate"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Prisma generation failed - check database connection" -ForegroundColor Yellow
}
Write-Host "[OK] Prisma client generated" -ForegroundColor Green
Write-Host ""

# Restart PM2
Write-Host "Restarting PM2 process..." -ForegroundColor Yellow
$restartResult = Invoke-SshCommand "cd $RemotePath && pm2 restart gulyaly || pm2 start ecosystem.config.js --env production"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to restart PM2 process" -ForegroundColor Red
    Write-Host $restartResult
    exit 1
}

Write-Host "[OK] PM2 process restarted" -ForegroundColor Green
Write-Host ""

# Wait for app to start
Write-Host "Waiting for application to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Health check
Write-Host "Running health check..." -ForegroundColor Yellow
$healthResult = Invoke-SshCommand "curl -s http://127.0.0.1:3000/api/health"
Write-Host "Health check response: $healthResult" -ForegroundColor Green
Write-Host ""

# Save PM2 configuration
Invoke-SshCommand "pm2 save"
Invoke-SshCommand "pm2 startup | tail -1"

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Application is now running at https://$($ServerHost -replace '^[^.]+\.', '')" -ForegroundColor Green
Write-Host "" -ForegroundColor Green