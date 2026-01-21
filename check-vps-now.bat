@echo off
chcp 65001 >nul
echo ==========================================
echo 🔍 Проверка состояния VPS
echo ==========================================
echo.

REM Проверяем SSH
where ssh >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] SSH не найден в PATH
    echo Попытка найти в стандартном расположении...
    if exist "C:\Windows\System32\OpenSSH\ssh.exe" (
        set SSH_CMD=C:\Windows\System32\OpenSSH\ssh.exe
        echo [OK] Найден: %SSH_CMD%
    ) else (
        echo [ОШИБКА] SSH не найден!
        echo.
        echo Установите OpenSSH или используйте WSL
        pause
        exit /b 1
    )
) else (
    set SSH_CMD=ssh
    echo [OK] SSH найден
)

echo.
echo Подключение к root@89.104.74.7...
echo.

%SSH_CMD% -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@89.104.74.7 "bash -c \"echo '=== System Info ===' && uname -a && echo '' && echo '=== Node.js ===' && (node -v 2>&1 || echo 'Node.js не установлен') && echo '' && echo '=== NPM ===' && (npm -v 2>&1 || echo 'NPM не установлен') && echo '' && echo '=== PM2 ===' && (pm2 -v 2>&1 || echo 'PM2 не установлен') && if command -v pm2 >/dev/null 2>&1; then echo '' && echo 'PM2 процессы:' && pm2 list; fi && echo '' && echo '=== PostgreSQL ===' && (psql --version 2>&1 || echo 'PostgreSQL не установлен') && echo '' && echo '=== Nginx ===' && (nginx -v 2>&1 || echo 'Nginx не установлен') && echo '' && echo '=== Application Directory ===' && if [ -d '/var/www/gulyaly' ]; then echo '[OK] /var/www/gulyaly существует' && echo '' && echo 'Содержимое:' && ls -la /var/www/gulyaly | head -10 && echo '' && if [ -f '/var/www/gulyaly/package.json' ]; then echo '[OK] package.json найден'; else echo '[ERROR] package.json не найден'; fi && if [ -f '/var/www/gulyaly/.env' ]; then echo '[OK] .env файл существует'; else echo '[WARNING] .env файл не найден'; fi; else echo '[ERROR] /var/www/gulyaly не существует'; fi && echo '' && echo '=== Ports ===' && (netstat -tulpn 2>/dev/null | grep -E ':(80|3000|5432|443)' || ss -tulpn 2>/dev/null | grep -E ':(80|3000|5432|443)' || echo 'Порты не найдены') && echo '' && echo '=== Disk Space ===' && df -h / | tail -1 && echo '' && echo '==========================================' && echo '✅ Проверка завершена' && echo '=========================================='\""

if %errorlevel% equ 0 (
    echo.
    echo [OK] Проверка завершена успешно
) else (
    echo.
    echo [ОШИБКА] Не удалось подключиться к VPS
    echo Проверьте:
    echo   1. SSH ключ настроен правильно
    echo   2. VPS доступен (ping 89.104.74.7)
    echo   3. Firewall разрешает SSH подключения
)

echo.
pause

