# Скрипт для проверки VPS через SSH
# Использование: .\scripts\check-vps-remote.ps1

$VPS_IP = "89.104.74.7"
$VPS_USER = "root"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔍 Подключение к VPS и проверка состояния" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Проверка наличия SSH
$sshPath = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshPath) {
    Write-Host "❌ SSH не найден!" -ForegroundColor Red
    Write-Host "Установите OpenSSH или используйте WSL" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Для установки OpenSSH в Windows:" -ForegroundColor Yellow
    Write-Host "  Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ SSH найден: $($sshPath.Source)" -ForegroundColor Green
Write-Host ""

# Команды для выполнения на VPS
$checkCommands = @"
echo '=== System Info ==='
uname -a
echo ''
echo '=== Node.js ==='
node -v 2>/dev/null || echo 'Node.js не установлен'
echo ''
echo '=== NPM ==='
npm -v 2>/dev/null || echo 'NPM не установлен'
echo ''
echo '=== PM2 ==='
pm2 -v 2>/dev/null || echo 'PM2 не установлен'
if command -v pm2 &> /dev/null; then
    echo ''
    echo 'PM2 процессы:'
    pm2 list
fi
echo ''
echo '=== PostgreSQL ==='
psql --version 2>/dev/null || echo 'PostgreSQL не установлен'
if command -v psql &> /dev/null; then
    systemctl status postgresql --no-pager -l 2>/dev/null | head -3 || service postgresql status 2>/dev/null | head -3
fi
echo ''
echo '=== Nginx ==='
nginx -v 2>&1 || echo 'Nginx не установлен'
if command -v nginx &> /dev/null; then
    echo ''
    systemctl status nginx --no-pager -l 2>/dev/null | head -3 || service nginx status 2>/dev/null | head -3
    echo ''
    echo 'Nginx конфигурация:'
    ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo 'Конфигурация не найдена'
fi
echo ''
echo '=== Application Directory ==='
if [ -d "/var/www/gulyaly" ]; then
    echo '✅ /var/www/gulyaly существует'
    echo ''
    echo 'Содержимое:'
    ls -la /var/www/gulyaly | head -10
    echo ''
    if [ -f "/var/www/gulyaly/package.json" ]; then
        echo '✅ package.json найден'
        echo 'Версия:'
        grep '"version"' /var/www/gulyaly/package.json || echo 'Версия не указана'
    else
        echo '❌ package.json не найден'
    fi
    echo ''
    if [ -f "/var/www/gulyaly/.env" ]; then
        echo '✅ .env файл существует'
    else
        echo '⚠️  .env файл не найден'
    fi
else
    echo '❌ /var/www/gulyaly не существует'
fi
echo ''
echo '=== Git ==='
git --version 2>/dev/null || echo 'Git не установлен'
if [ -d "/var/www/gulyaly/.git" ]; then
    echo ''
    echo 'Git репозиторий:'
    cd /var/www/gulyaly && git remote -v 2>/dev/null || echo 'Нет remote репозитория'
    cd /var/www/gulyaly && git branch 2>/dev/null || echo 'Не git репозиторий'
fi
echo ''
echo '=== Ports ==='
netstat -tulpn 2>/dev/null | grep -E ':(80|3000|5432|443)' || ss -tulpn 2>/dev/null | grep -E ':(80|3000|5432|443)' || echo 'Порты не найдены'
echo ''
echo '=== Disk Space ==='
df -h / | tail -1
echo ''
echo '=== Memory ==='
free -h 2>/dev/null || echo 'Информация о памяти недоступна'
echo ''
echo '=========================================='
echo '✅ Проверка завершена'
echo '=========================================='
"@

Write-Host "Подключение к $VPS_USER@$VPS_IP..." -ForegroundColor Yellow
Write-Host ""

try {
    $result = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$VPS_USER@$VPS_IP" $checkCommands 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host $result
        Write-Host ""
        Write-Host "✅ Подключение успешно!" -ForegroundColor Green
    } else {
        Write-Host "❌ Ошибка подключения или выполнения команд" -ForegroundColor Red
        Write-Host $result
    }
} catch {
    Write-Host "❌ Ошибка: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Попробуйте подключиться вручную:" -ForegroundColor Yellow
    Write-Host "  ssh $VPS_USER@$VPS_IP" -ForegroundColor Gray
}

