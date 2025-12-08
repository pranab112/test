@echo off
REM Railway Deployment Script for Windows
REM This script automates the Railway deployment process

echo ====================================================================
echo CASINO ROYAL - RAILWAY DEPLOYMENT AUTOMATION
echo ====================================================================
echo.

REM Check if Railway CLI is installed
where railway >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Railway CLI not found. Installing...
    call npm install -g @railway/cli
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install Railway CLI
        echo Please install manually: npm install -g @railway/cli
        pause
        exit /b 1
    )
    echo [SUCCESS] Railway CLI installed successfully
    echo.
)

REM Check if token is set
if "%RAILWAY_TOKEN%"=="" (
    echo [ERROR] RAILWAY_TOKEN environment variable not set!
    echo.
    echo Please set your Railway token:
    echo   set RAILWAY_TOKEN=f2155410-17eb-40df-aa2f-5ad81fb28826
    echo.
    echo Or run this script with:
    echo   set RAILWAY_TOKEN=your-token ^& deploy_to_railway.bat
    echo.
    pause
    exit /b 1
)

echo [INFO] Railway token detected: %RAILWAY_TOKEN:~0,8%...
echo.

REM Generate secrets if not already generated
if not exist .secrets.txt (
    echo [INFO] Generating security secrets...
    python generate_secrets.py
    echo.
    echo [PAUSE] Please review the generated secrets above.
    echo Press any key to continue with deployment...
    pause >nul
)

echo ====================================================================
echo STEP 1: Linking to Railway Project
echo ====================================================================
echo.

REM Check if already linked
if exist .railway (
    echo [INFO] Project already linked to Railway
) else (
    echo [INFO] Initializing Railway project...
    railway init
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to initialize Railway project
        pause
        exit /b 1
    )
)
echo.

echo ====================================================================
echo STEP 2: Adding PostgreSQL Database
echo ====================================================================
echo.
echo [INFO] You need to add PostgreSQL database manually:
echo   1. Go to Railway Dashboard
echo   2. Click "New" → "Database" → "Add PostgreSQL"
echo   3. Wait for database to provision
echo   4. DATABASE_URL will be automatically available
echo.
echo Press any key after adding PostgreSQL database...
pause >nul

echo ====================================================================
echo STEP 3: Setting Environment Variables
echo ====================================================================
echo.

REM Read secrets from file
for /f "tokens=1,2 delims==" %%a in (.secrets.txt) do (
    if "%%a"=="SECRET_KEY" set SECRET_KEY=%%b
    if "%%a"=="CREDENTIAL_ENCRYPTION_KEY" set CREDENTIAL_ENCRYPTION_KEY=%%b
)

echo [INFO] Setting required environment variables...

REM Core application settings
railway variables set ENVIRONMENT=production
railway variables set SECRET_KEY=%SECRET_KEY%
railway variables set ALGORITHM=HS256
railway variables set ACCESS_TOKEN_EXPIRE_MINUTES=30
railway variables set CREDENTIAL_ENCRYPTION_KEY=%CREDENTIAL_ENCRYPTION_KEY%

REM Feature flags
railway variables set ENABLE_RATE_LIMITING=True
railway variables set LOG_LEVEL=INFO

echo.
echo [SUCCESS] Core variables set successfully
echo.

echo ====================================================================
echo STEP 4: Setting CORS and Base URL
echo ====================================================================
echo.
echo [INPUT REQUIRED] What is your Railway app URL?
echo Example: https://casino-royal-production.up.railway.app
echo.
set /p RAILWAY_URL="Enter your Railway URL: "

railway variables set BASE_URL=%RAILWAY_URL%
railway variables set CORS_ORIGINS=%RAILWAY_URL%

echo.
echo [SUCCESS] CORS and Base URL configured
echo.

echo ====================================================================
echo STEP 5: AWS S3 Configuration (RECOMMENDED)
echo ====================================================================
echo.
echo Railway has ephemeral storage - uploaded files are deleted on restart.
echo It's HIGHLY RECOMMENDED to configure AWS S3 for persistent storage.
echo.
set /p CONFIGURE_S3="Do you want to configure AWS S3 now? (y/n): "

if /i "%CONFIGURE_S3%"=="y" (
    echo.
    set /p AWS_ACCESS_KEY_ID="AWS Access Key ID: "
    set /p AWS_SECRET_ACCESS_KEY="AWS Secret Access Key: "
    set /p AWS_S3_BUCKET_NAME="S3 Bucket Name: "
    set /p AWS_REGION="AWS Region (default: us-east-1): "

    if "%AWS_REGION%"=="" set AWS_REGION=us-east-1

    railway variables set AWS_ACCESS_KEY_ID=%AWS_ACCESS_KEY_ID%
    railway variables set AWS_SECRET_ACCESS_KEY=%AWS_SECRET_ACCESS_KEY%
    railway variables set AWS_S3_BUCKET_NAME=%AWS_S3_BUCKET_NAME%
    railway variables set AWS_REGION=%AWS_REGION%

    echo.
    echo [SUCCESS] AWS S3 configured
) else (
    echo [WARNING] Skipping S3 configuration - files will be ephemeral!
)
echo.

echo ====================================================================
echo STEP 6: Email Service Configuration (AWS SES)
echo ====================================================================
echo.
set /p CONFIGURE_EMAIL="Do you want to configure email service now? (y/n): "

if /i "%CONFIGURE_EMAIL%"=="y" (
    echo.
    set /p SMTP_HOST="SMTP Host (default: email-smtp.us-east-1.amazonaws.com): "
    set /p SMTP_PORT="SMTP Port (default: 587): "
    set /p SMTP_USERNAME="SMTP Username: "
    set /p SMTP_PASSWORD="SMTP Password: "
    set /p SMTP_FROM_EMAIL="From Email: "
    set /p SMTP_FROM_NAME="From Name (default: Casino Royal): "

    if "%SMTP_HOST%"=="" set SMTP_HOST=email-smtp.us-east-1.amazonaws.com
    if "%SMTP_PORT%"=="" set SMTP_PORT=587
    if "%SMTP_FROM_NAME%"=="" set SMTP_FROM_NAME=Casino Royal

    railway variables set SMTP_HOST=%SMTP_HOST%
    railway variables set SMTP_PORT=%SMTP_PORT%
    railway variables set SMTP_USERNAME=%SMTP_USERNAME%
    railway variables set SMTP_PASSWORD=%SMTP_PASSWORD%
    railway variables set SMTP_FROM_EMAIL=%SMTP_FROM_EMAIL%
    railway variables set SMTP_FROM_NAME=%SMTP_FROM_NAME%

    echo.
    echo [SUCCESS] Email service configured
) else (
    echo [WARNING] Email verification will not work without email service!
)
echo.

echo ====================================================================
echo STEP 7: Deploying to Railway
echo ====================================================================
echo.
echo [INFO] Committing changes to git...
git add .
git commit -m "Configure for Railway deployment" 2>nul
echo.

echo [INFO] Deploying to Railway...
railway up

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Deployment failed
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Deployment initiated!
echo.

echo ====================================================================
echo STEP 8: Post-Deployment Setup
echo ====================================================================
echo.
echo [INFO] Waiting for deployment to complete (30 seconds)...
timeout /t 30 /nobreak >nul
echo.

echo [INFO] Running database migrations...
railway run alembic upgrade head

echo.
echo [INFO] Creating admin account...
echo You'll be prompted to enter admin credentials...
railway run python create_admin.py

echo.
echo [INFO] Populating games database...
railway run python populate_games_postgres.py

echo.
echo ====================================================================
echo DEPLOYMENT COMPLETE!
echo ====================================================================
echo.
echo Your Casino Royal application is now deployed on Railway!
echo.
echo Application URL: %RAILWAY_URL%
echo.
echo Quick Links:
echo   - Health Check: %RAILWAY_URL%/health
echo   - Client Dashboard: %RAILWAY_URL%/client
echo   - Player Dashboard: %RAILWAY_URL%/player
echo   - Admin Dashboard: %RAILWAY_URL%/admin
echo.
echo ====================================================================
echo IMPORTANT SECURITY REMINDERS:
echo ====================================================================
echo 1. Delete .secrets.txt file immediately!
echo 2. Rotate your Railway token after deployment
echo 3. Never commit .env or .secrets.txt to git
echo 4. Save your admin credentials securely
echo.
echo ====================================================================
echo NEXT STEPS:
echo ====================================================================
echo 1. Visit %RAILWAY_URL%/health to verify deployment
echo 2. Login to admin dashboard with your credentials
echo 3. Test all functionality (auth, chat, games)
echo 4. Set up custom domain (optional)
echo 5. Configure monitoring and backups
echo.
echo For troubleshooting, see RAILWAY_DEPLOYMENT_GUIDE.md
echo.
pause
