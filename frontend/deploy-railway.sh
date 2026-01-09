#!/bin/bash

# Casino Royal Frontend - Railway Deployment Script
# This script deploys the frontend application to Railway

set -e

echo "=========================================="
echo "Casino Royal Frontend - Railway Deployment"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}✗ Railway CLI is not installed${NC}"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

echo -e "${GREEN}✓ Railway CLI found${NC}"

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠ Not logged in to Railway${NC}"
    echo "Logging in..."
    railway login
fi

echo -e "${GREEN}✓ Logged in to Railway${NC}"

# Check if linked to a Railway project
if ! railway status &> /dev/null; then
    echo -e "${YELLOW}⚠ Not linked to a Railway project${NC}"
    echo "Please link to your project first:"
    echo "  railway link"
    exit 1
fi

echo -e "${GREEN}✓ Linked to Railway project${NC}"

# Display current project
echo ""
echo "Current Railway Configuration:"
railway status
echo ""

# Confirm deployment
read -p "Deploy frontend to Railway? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "=========================================="
echo "Starting Deployment..."
echo "=========================================="

# Set environment variables on Railway (if not already set)
echo "Setting environment variables..."

railway variables set VITE_ADMIN_ROUTE_TOKEN=a9f8e7d6c5b4a3918273645 2>/dev/null || true
railway variables set VITE_CLIENT_ROUTE_TOKEN=x1y2z3a4b5c6d7e8f9g0h1i2 2>/dev/null || true
railway variables set VITE_API_URL=https://casino-royal-production.up.railway.app/api/v1 2>/dev/null || true
railway variables set VITE_WS_URL=wss://casino-royal-production.up.railway.app/ws 2>/dev/null || true
railway variables set VITE_FILE_URL=https://casino-royal-production.up.railway.app 2>/dev/null || true
railway variables set VITE_ENVIRONMENT=production 2>/dev/null || true

echo -e "${GREEN}✓ Environment variables configured${NC}"

# Deploy to Railway
echo ""
echo "Deploying to Railway..."
railway up

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check deployment status: railway status"
echo "2. View logs: railway logs"
echo "3. Open in browser: railway open"
echo ""
