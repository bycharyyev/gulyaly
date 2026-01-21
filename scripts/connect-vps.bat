@echo off
REM Скрипт для подключения к VPS и проверки состояния
REM Использование: scripts\connect-vps.bat

echo ==========================================
echo Подключение к VPS и проверка состояния
echo ==========================================
echo.

REM Проверка наличия SSH
where ssh >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] SSH не найден!
    echo.
    echo Установите OpenSSH Client:
    echo   1. Откройте PowerShell от администратора
    echo   2. Выполните: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
    echo   3. Или запустите: powershell -ExecutionPolicy Bypass -File scripts\install-openssh.ps1
    echo.
    pause
    exit /b 1
)

echo [OK] SSH найден
echo.
echo Подключение к root@89.104.74.7...
echo.

REM Создаем временный файл с командами
set TEMP_SCRIPT=%TEMP%\vps-check.sh
(
echo echo === System Info ===
echo uname -a
echo echo ''
echo echo === Node.js ===
echo node -v 2^>^&1 ^|^| echo 'Node.js не установлен'
echo echo ''
echo echo === NPM ===
echo npm -v 2^>^&1 ^|^| echo 'NPM не установлен'
echo echo ''
echo echo === PM2 ===
echo pm2 -v 2^>^&1 ^|^| echo 'PM2 не установлен'
echo if command -v pm2 ^&^> /dev/null; then
echo     echo ''
echo     echo 'PM2 процессы:'
echo     pm2 list
echo fi
echo echo ''
echo echo === PostgreSQL ===
echo psql --version 2^>^&1 ^|^| echo 'PostgreSQL не установлен'
echo echo ''
echo echo === Nginx ===
echo nginx -v 2^>^&1 ^|^| echo 'Nginx не установлен'
echo echo ''
echo echo === Application Directory ===
echo if [ -d "/var/www/gulyaly" ]; then
echo     echo '[OK] /var/www/gulyaly существует'
echo     echo ''
echo     echo 'Содержимое:'
echo     ls -la /var/www/gulyaly ^| head -10
echo     echo ''
echo     if [ -f "/var/www/gulyaly/package.json" ]; then
echo         echo '[OK] package.json найден'
echo     else
echo         echo '[ERROR] package.json не найден'
echo     fi
echo     if [ -f "/var/www/gulyaly/.env" ]; then
echo         echo '[OK] .env файл существует'
echo     else
echo         echo '[WARNING] .env файл не найден'
echo     fi
echo else
echo     echo '[ERROR] /var/www/gulyaly не существует'
echo fi
echo echo ''
echo echo === Ports ===
echo netstat -tulpn 2^>^&1 ^| grep -E ':(80^|3000^|5432^|443)' ^|^| ss -tulpn 2^>^&1 ^| grep -E ':(80^|3000^|5432^|443)' ^|^| echo 'Порты не найдены'
echo echo ''
echo echo === Disk Space ===
echo df -h / ^| tail -1
echo echo ''
echo ==========================================
echo Проверка завершена
echo ==========================================
) > "%TEMP_SCRIPT%"

REM Подключаемся и выполняем команды
ssh -o StrictHostKeyChecking=no root@89.104.74.7 "bash -s" < "%TEMP_SCRIPT%"

REM Удаляем временный файл
del "%TEMP_SCRIPT%" >nul 2>&1

echo.
echo.
pause

