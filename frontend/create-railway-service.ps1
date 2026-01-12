# PowerShell script to create and deploy Railway frontend service
# Run this with: powershell -ExecutionPolicy Bypass -File create-railway-service.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Railway Frontend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if railway CLI is installed
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Railway CLI is not installed" -ForegroundColor Red
    Write-Host "Install it with: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Railway CLI found" -ForegroundColor Green

# Check if logged in
$whoami = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Not logged in to Railway" -ForegroundColor Red
    Write-Host "Logging in..." -ForegroundColor Yellow
    railway login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Login failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[OK] Logged in to Railway" -ForegroundColor Green
Write-Host ""

# Instructions for manual service creation
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 1: Create Frontend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please follow these steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://railway.app/project/737397c5-f143-447a-9cd3-6ca364c9fb00" -ForegroundColor White
Write-Host "2. Click '+ New' button" -ForegroundColor White
Write-Host "3. Select 'GitHub Repo'" -ForegroundColor White
Write-Host "4. Choose repository: pranab112/test" -ForegroundColor White
Write-Host "5. Set 'Root Directory' to: frontend" -ForegroundColor White
Write-Host "6. Set 'Service Name' to: casino-royal-frontend" -ForegroundColor White
Write-Host "7. Click 'Deploy'" -ForegroundColor White
Write-Host ""

$response = Read-Host "Have you created the service? (y/n)"
if ($response -ne 'y') {
    Write-Host "Please create the service first, then run this script again." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 2: Verify Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Show current status
Write-Host "Current Railway configuration:" -ForegroundColor Yellow
railway status

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 3: Link to Frontend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run this command to link to your frontend service:" -ForegroundColor Yellow
Write-Host "  railway link" -ForegroundColor White
Write-Host ""
Write-Host "Then select:" -ForegroundColor Yellow
Write-Host "  Project: casino-royal" -ForegroundColor White
Write-Host "  Service: casino-royal-frontend" -ForegroundColor White
Write-Host ""

$response = Read-Host "Do you want to run 'railway link' now? (y/n)"
if ($response -eq 'y') {
    railway link
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 4: Deploy Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$response = Read-Host "Ready to deploy? (y/n)"
if ($response -ne 'y') {
    Write-Host "Deployment cancelled. Run 'railway up' when ready." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Deploying frontend to Railway..." -ForegroundColor Yellow
railway up --detach

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Check deployment status:" -ForegroundColor Yellow
Write-Host "  railway status" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  railway logs" -ForegroundColor White
Write-Host ""
Write-Host "Open in browser:" -ForegroundColor Yellow
Write-Host "  railway open" -ForegroundColor White
Write-Host ""
