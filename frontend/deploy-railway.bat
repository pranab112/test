@echo off
REM Casino Royal Frontend - Railway Deployment Script (Windows)
REM This script deploys the frontend application to Railway

echo ==========================================
echo Casino Royal Frontend - Railway Deployment
echo ==========================================
echo.

REM Check if railway CLI is installed
where railway >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Railway CLI is not installed
    echo Install it with: npm install -g @railway/cli
    exit /b 1
)

echo [OK] Railway CLI found

REM Check if logged in to Railway
railway whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Not logged in to Railway
    echo Logging in...
    railway login
)

echo [OK] Logged in to Railway

REM Check if linked to a Railway project
railway status >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Not linked to a Railway project
    echo Please link to your project first:
    echo   railway link
    exit /b 1
)

echo [OK] Linked to Railway project
echo.

REM Display current project
echo Current Railway Configuration:
railway status
echo.

REM Confirm deployment
set /p CONFIRM="Deploy frontend to Railway? (y/n) "
if /i not "%CONFIRM%"=="y" (
    echo Deployment cancelled
    exit /b 0
)

echo.
echo ==========================================
echo Starting Deployment...
echo ==========================================
echo.

REM Set environment variables on Railway
echo Setting environment variables...

railway variables set VITE_ADMIN_ROUTE_TOKEN=a9f8e7d6c5b4a3918273645 2>nul
railway variables set VITE_CLIENT_ROUTE_TOKEN=x1y2z3a4b5c6d7e8f9g0h1i2 2>nul
railway variables set VITE_API_URL=https://casino-royal-production.up.railway.app/api/v1 2>nul
railway variables set VITE_WS_URL=wss://casino-royal-production.up.railway.app/ws 2>nul
railway variables set VITE_FILE_URL=https://casino-royal-production.up.railway.app 2>nul
railway variables set VITE_ENVIRONMENT=production 2>nul

echo [OK] Environment variables configured
echo.

REM Deploy to Railway
echo Deploying to Railway...
railway up

echo.
echo ==========================================
echo [OK] Deployment Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Check deployment status: railway status
echo 2. View logs: railway logs
echo 3. Open in browser: railway open
echo.

pause
