#!/bin/bash
set -e

echo "=========================================================="
echo "   Jasper GitHub App Auth Configuration Script"
echo "=========================================================="
echo ""

MANIFEST='{
  "name": "Jasper Deployment App",
  "url": "https://github.com/sakibtamim/Jasper",
  "public": false,
  "hook_attributes": {
    "active": false
  },
  "default_permissions": {
    "contents": "read"
  }
}'

# URL-encode the manifest JSON
ENCODED_MANIFEST=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$MANIFEST")
REGISTRATION_URL="https://github.com/settings/apps/new?manifest=${ENCODED_MANIFEST}"

echo "👉 Step 1: Create the GitHub App using this pre-filled configuration link:"
echo ""
echo "$REGISTRATION_URL"
echo ""
echo "After creating, download the generated Private Key (.pem file)."
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
