@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (echo Instalirajte Node.js 22 LTS, pa ponovo otvorite ovaj fajl. & pause & exit /b 1)
if not exist node_modules (call npm ci & if errorlevel 1 goto error)
if not exist .env (call npm run setup & if errorlevel 1 goto error)
call npx playwright install chromium
if errorlevel 1 goto error
call npm start
:error
pause
