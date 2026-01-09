@echo off
cls
echo ==========================================
echo Railway Frontend Setup - Quick Guide
echo ==========================================
echo.

REM Check Railway CLI
where railway >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Railway CLI not installed
    echo Install: npm install -g @railway/cli
    pause
    exit /b 1
)

echo [OK] Railway CLI found
echo.

echo ==========================================
echo OPTION 1: Via Railway Dashboard (Fastest)
echo ==========================================
echo.
echo 1. Opening Railway dashboard...
echo 2. Click "+ New" button
echo 3. Select "GitHub Repo"
echo 4. Choose repository: pranab112/test
echo 5. Set "Root Directory": frontend
echo 6. Set "Service Name": casino-royal-frontend
echo 7. Click "Deploy"
echo.

set /p OPEN="Open Railway Dashboard? (y/n) "
if /i "%OPEN%"=="y" (
    start https://railway.app/project/737397c5-f143-447a-9cd3-6ca364c9fb00
    echo.
    echo Dashboard opened in browser!
    echo.
)

echo ==========================================
echo OPTION 2: Via CLI (After creating service)
echo ==========================================
echo.
echo After creating the service in dashboard:
echo.
echo 1. Link to frontend service:
echo    railway link
echo    (Select: casino-royal ^> casino-royal-frontend)
echo.
echo 2. Deploy:
echo    railway up
echo.

echo ==========================================
echo Environment Variables (Already Set)
echo ==========================================
echo.
echo These are already configured in your Railway project:
echo   VITE_ADMIN_ROUTE_TOKEN
echo   VITE_CLIENT_ROUTE_TOKEN
echo   VITE_API_URL
echo   VITE_WS_URL
echo   VITE_FILE_URL
echo   VITE_ENVIRONMENT
echo.

set /p VERIFY="Verify environment variables? (y/n) "
if /i "%VERIFY%"=="y" (
    echo.
    railway variables --kv | findstr "VITE_"
    echo.
)

echo ==========================================
echo Next Steps
echo ==========================================
echo.
echo 1. Create service using OPTION 1 above
echo 2. Link service: railway link
echo 3. Deploy: railway up
echo 4. Check logs: railway logs
echo 5. Open app: railway open
echo.

pause
