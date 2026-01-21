# Установка OpenSSH Client в Windows
# Запустите от администратора: Set-ExecutionPolicy Bypass -Scope Process; .\scripts\install-openssh.ps1

Write-Host "Установка OpenSSH Client..." -ForegroundColor Yellow

$capability = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'

if ($capability -and $capability.State -ne 'Installed') {
    Write-Host "Установка OpenSSH Client..." -ForegroundColor Green
    Add-WindowsCapability -Online -Name $capability.Name
    Write-Host "✅ OpenSSH Client установлен!" -ForegroundColor Green
} elseif ($capability -and $capability.State -eq 'Installed') {
    Write-Host "✅ OpenSSH Client уже установлен" -ForegroundColor Green
} else {
    Write-Host "❌ Не удалось найти OpenSSH Client" -ForegroundColor Red
}

Write-Host ""
Write-Host "Проверка установки:" -ForegroundColor Yellow
Get-Command ssh -ErrorAction SilentlyContinue | Select-Object Source

