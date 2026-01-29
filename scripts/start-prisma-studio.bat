@echo off
echo Starting Prisma Studio with authentication...
echo.
echo URL: http://localhost:5555
echo Login: admin
echo Password: admin123
echo.
echo Press Ctrl+C to stop
echo.

npx prisma studio --browser none --port 5555
