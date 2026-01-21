# 🔍 Проверка VPS - Инструкция

## Способ 1: Через командную строку (CMD)

Откройте **командную строку (CMD)** и выполните:

```cmd
cd C:\Users\miste\Downloads\codeakgus
check-vps-now.bat
```

## Способ 2: Через PowerShell

Откройте **PowerShell** и выполните:

```powershell
cd C:\Users\miste\Downloads\codeakgus
.\scripts\check-vps-remote.ps1
```

## Способ 3: Прямая команда SSH

Если SSH доступен, выполните в командной строке или PowerShell:

```bash
ssh root@89.104.74.7 "bash -c \"echo '=== System Info ===' && uname -a && echo '' && echo '=== Node.js ===' && (node -v 2>&1 || echo 'Node.js не установлен') && echo '' && echo '=== PM2 ===' && (pm2 -v 2>&1 || echo 'PM2 не установлен') && echo '' && echo '=== PostgreSQL ===' && (psql --version 2>&1 || echo 'PostgreSQL не установлен') && echo '' && echo '=== Nginx ===' && (nginx -v 2>&1 || echo 'Nginx не установлен') && echo '' && echo '=== Application ===' && if [ -d '/var/www/gulyaly' ]; then echo 'Директория существует'; ls -la /var/www/gulyaly | head -5; else echo 'Директория не существует'; fi\""
```

## Способ 4: Через WSL (если установлен)

```bash
wsl
cd /mnt/c/Users/miste/Downloads/codeakgus
bash scripts/check-vps.sh
```

## Что будет проверено:

- ✅ Системная информация
- ✅ Node.js и NPM
- ✅ PM2 (процессы)
- ✅ PostgreSQL
- ✅ Nginx
- ✅ Директория приложения `/var/www/gulyaly`
- ✅ Файлы проекта (package.json, .env)
- ✅ Открытые порты
- ✅ Дисковое пространство

## Если SSH не работает:

1. Установите OpenSSH Client:
   ```powershell
   # От администратора PowerShell
   Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
   ```

2. Или используйте скрипт:
   ```powershell
   .\scripts\install-openssh.ps1
   ```

3. Перезапустите терминал после установки

