#!/bin/bash
set -e

echo "=========================================================="
echo "   Jasper GitHub App Auth Configuration Script"
echo "=========================================================="
echo ""

echo "👉 Step 1: Register a new GitHub App manually:"
echo "   1. Go to: https://github.com/settings/apps/new"
echo "      (Or for an organization: https://github.com/organizations/<your-org>/settings/apps/new)"
echo "   2. Configure the following fields:"
echo "      - GitHub App name: Jasper Deployment App (or any unique name)"
echo "      - Homepage URL: https://github.com/sakibtamim/Jasper"
echo "      - Webhook -> Active: Uncheck / Disable"
echo "      - Repository permissions -> Contents: Read-only"
echo "   3. Click 'Create GitHub App' at the bottom."
echo "   4. Scroll down to 'Private keys' and click 'Generate a private key' to download the .pem file."
echo ""

echo "👉 Step 2: Install the App on:"
echo "   - Organization 'Purrfectsoft' (submodule repo: jasper-plugin-garage-band)"
echo "   - Account/Org 'sakibtamim' (host repo: Jasper)"
echo ""

read -p "Enter the generated App ID: " APP_ID
read -p "Enter the path to the downloaded Private Key (.pem) file: " PEM_PATH

# Expand tilde or relative paths
PEM_PATH="${PEM_PATH/#\~/$HOME}"

if [ ! -f "$PEM_PATH" ]; then
    echo "❌ Error: Private key file not found at $PEM_PATH"
    exit 1
fi

echo ""
echo "🚀 Configuring GitHub Secrets on sakibtamim/Jasper..."

# Set secrets using GitHub CLI
gh secret set DEPLOY_APP_ID -b "$APP_ID"
gh secret set DEPLOY_APP_PRIVATE_KEY < "$PEM_PATH"

echo "✅ Secrets DEPLOY_APP_ID and DEPLOY_APP_PRIVATE_KEY set successfully!"
echo ""

read -p "Do you want to delete the legacy PAT_TOKEN secret? (y/n): " DELETE_PAT
if [[ "$DELETE_PAT" =~ ^[Yy]$ ]]; then
    gh secret remove PAT_TOKEN || echo "⚠️ Could not find or delete PAT_TOKEN (it might already be removed)"
    echo "✅ PAT_TOKEN secret removed."
fi

echo ""
echo "🎉 Setup complete! You're ready to deploy."
