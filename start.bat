@echo off
echo ===================================================
echo   Starting Legacy Lock Platform (Production Build)
echo ===================================================
echo.
echo [1/2] Starting NestJS Backend API on http://localhost:3000 ...
start "LegacyLock Backend" cmd /k "cd /d %~dp0backend && node dist/main"

echo [2/2] Starting Frontend Web Server on http://localhost:5500 ...
start "LegacyLock Frontend" cmd /k "cd /d %~dp0DOC-20260830-WA0017 && python -m http.server 5500"

timeout /t 3 >nul
echo.
echo Opening LegacyLock in default browser...
start http://localhost:5500/legacylock_landing_page.html

echo.
echo ===================================================
echo   LegacyLock is RUNNING!
echo   Frontend: http://localhost:5500/legacylock_landing_page.html
echo   Backend:  http://localhost:3000/api/v1
echo ===================================================
pause
