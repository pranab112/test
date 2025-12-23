#!/bin/bash

# GitHub Secrets Setup Script
# This script adds all required secrets to your GitHub repository

REPO="pranab112/test"
RENDER_API_KEY="rnd_fNz7RHC04kesLR5io8s2TOf8AaK1"

echo "🔐 Setting up GitHub Secrets for: $REPO"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo ""
    echo "Install it from: https://cli.github.com/"
    echo ""
    echo "Or install via:"
    echo "  Windows: winget install --id GitHub.cli"
    echo "  Mac: brew install gh"
    echo "  Linux: sudo apt install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo ""
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Add Render API Key
echo "Adding RENDER_API_KEY..."
echo "$RENDER_API_KEY" | gh secret set RENDER_API_KEY --repo $REPO
if [ $? -eq 0 ]; then
    echo "✅ RENDER_API_KEY added successfully"
else
    echo "❌ Failed to add RENDER_API_KEY"
    exit 1
fi

echo ""
echo "🎉 GitHub Secrets setup complete!"
echo ""
echo "Next steps:"
echo "1. Add RENDER_URL secret (your Render service URL)"
echo "2. Add CODECOV_TOKEN secret (optional, for coverage reports)"
echo ""
echo "Manual setup:"
echo "  gh secret set RENDER_URL --repo $REPO"
echo "  gh secret set CODECOV_TOKEN --repo $REPO"
echo ""
echo "Or via GitHub web interface:"
echo "  https://github.com/$REPO/settings/secrets/actions"
