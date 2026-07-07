#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR" || exit 1
ENV_TEMPLATE_MERGE_SCRIPT="$ROOT_DIR/scripts/merge-env-template.js"

# OS Detection
if [[ "$OSTYPE" == "msys"* || "$OSTYPE" == "cygwin"* || "$OSTYPE" == "win32"* ]]; then
    IS_WINDOWS=true
else
    IS_WINDOWS=false
fi

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

log_info() { echo -e "${BLUE}INFO:${NC} $1"; }
log_success() { echo -e "${GREEN}SUCCESS:${NC} $1"; }
log_warn() { echo -e "${YELLOW}WARN:${NC} $1"; }
log_error() { echo -e "${RED}ERROR:${NC} $1"; }

source_nvm_if_available() {
    local nvm_sh=$1
    local nvm_source_exit_code

    if [ ! -s "$nvm_sh" ]; then
        return 1
    fi

    set +e
    . "$nvm_sh"
    nvm_source_exit_code=$?
    set -e

    if [ "$nvm_source_exit_code" -eq 0 ]; then
        return 0
    fi

    if [ "$nvm_source_exit_code" -eq 3 ]; then
        log_warn "NVM could not auto-use the version from .nvmrc. Continuing with the currently available Node.js runtime."
        return 0
    fi

    log_error "Failed to source NVM from $nvm_sh (exit code $nvm_source_exit_code)."
    exit 1
}

ensure_supported_node_version() {
    local required_node_range
    required_node_range=$(node -p "require('./package.json').engines?.node || '>=24.0.0'" 2>/dev/null || echo ">=24.0.0")

    if REQUIRED_NODE_RANGE="$required_node_range" node <<'EOF'
const range = (process.env.REQUIRED_NODE_RANGE || ">=24.0.0").trim();
const match = range.match(/^>=\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);

if (!match) {
  process.exit(0);
}

const required = [match[1], match[2] || "0", match[3] || "0"].map((value) => Number.parseInt(value, 10));
const current = process.versions.node.split(".").map((value) => Number.parseInt(value, 10));

for (let index = 0; index < 3; index += 1) {
  const currentPart = current[index] || 0;
  const requiredPart = required[index] || 0;

  if (currentPart > requiredPart) {
    process.exit(0);
  }

  if (currentPart < requiredPart) {
    process.exit(1);
  }
}

process.exit(0);
EOF
    then
        return 0
    fi

    log_error "Node.js $(node -v) is not supported. This repository requires $required_node_range."
    
    if command -v nvm &> /dev/null; then
        echo ""
        log_warn "NVM (Node Version Manager) is installed on your system. You can switch Node.js versions by running:"
        echo -e "  ${GREEN}nvm install ${REQUIRED_NODE_VERSION:-24.9.0}${NC}"
        echo -e "  ${GREEN}nvm use ${REQUIRED_NODE_VERSION:-24.9.0}${NC}"
        echo ""
    fi
    exit 1
}

# 1. Checking Prerequisites
log_info "=== 1. Checking Prerequisites ==="

export NVM_DIR="$HOME/.nvm"
NVM_SH="$NVM_DIR/nvm.sh"
REQUIRED_NODE_VERSION="$(tr -d '[:space:]' < "$ROOT_DIR/.nvmrc" 2>/dev/null || true)"

if [ "$IS_WINDOWS" = false ] && [ -s "$NVM_SH" ]; then
    source_nvm_if_available "$NVM_SH"
elif command -v node &> /dev/null; then
    if [ "$IS_WINDOWS" = false ]; then
        log_warn "NVM not found at $NVM_SH. Continuing with system Node.js $(node -v)."
    else
        log_info "Continuing with system Node.js $(node -v)."
    fi
else
    if [ "$IS_WINDOWS" = true ]; then
        if command -v nvm &> /dev/null; then
            log_warn "Node.js is not installed, but NVM for Windows is available."
            log_info "Please run 'nvm install $REQUIRED_NODE_VERSION' and 'nvm use $REQUIRED_NODE_VERSION' to set up Node.js."
        else
            log_error "Node.js is not installed. Please install Node.js (>=24.0.0)."
        fi
        exit 1
    else
        log_warn "NVM (Node Version Manager) not found and Node.js is unavailable. Installing NVM..."
        curl -o "$HOME/nvm_install.sh" https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh
        bash "$HOME/nvm_install.sh"
        rm "$HOME/nvm_install.sh"
        export NVM_DIR="$HOME/.nvm"
        NVM_SH="$NVM_DIR/nvm.sh"

        if ! source_nvm_if_available "$NVM_SH"; then
            log_error "NVM installation completed, but $NVM_SH was not found."
            exit 1
        fi

        log_success "NVM installed."
    fi
fi

# Ensure Node is installed
if ! command -v node &> /dev/null; then
    if [ "$IS_WINDOWS" = false ]; then
        if ! command -v nvm &> /dev/null; then
            log_error "Node.js is not installed and NVM is unavailable."
            exit 1
        fi

        if [ -n "$REQUIRED_NODE_VERSION" ]; then
            log_info "Installing Node.js $REQUIRED_NODE_VERSION via NVM..."
            nvm install "$REQUIRED_NODE_VERSION"
            nvm use "$REQUIRED_NODE_VERSION"
        else
            log_info "Installing Node.js (LTS) via NVM..."
            nvm install --lts
            nvm use --lts
        fi
        log_success "Node.js $(node -v) installed."
    else
        log_error "Node.js is not installed."
        exit 1
    fi
fi



ensure_supported_node_version

if ! command -v pnpm &> /dev/null; then
    log_warn "pnpm is not installed."
    echo "Enabling via corepack..."
    corepack enable pnpm
fi

# 2. Install Dependencies
log_info "=== 2. Installing Dependencies ==="
pnpm install || { log_error "Dependency install failed."; exit 1; }
log_success "Dependencies installed."

# 3. Environment Configuration
log_info "=== 3. Configuring Environment ==="
if [ ! -f "$ENV_FILE" ]; then
    log_info "Creating .env from example..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
else
    log_info ".env exists, updating..."
fi

BACKFILLED_ENV_KEYS=$(node "$ENV_TEMPLATE_MERGE_SCRIPT" "$ENV_EXAMPLE" "$ENV_FILE")
if [ -n "$BACKFILLED_ENV_KEYS" ]; then
    log_success "Backfilled missing env keys from .env.example:"
    while IFS= read -r backfilled_key; do
        [ -n "$backfilled_key" ] && echo "  - $backfilled_key"
    done <<< "$BACKFILLED_ENV_KEYS"
else
    log_info "No missing env keys needed backfilling from .env.example."
fi

# Pawthy Secrets Sync
log_info "=== 3.1 Pawthy Secrets Sync ==="
FORCE_MANUAL=false
if pnpm exec pawthy --version &> /dev/null; then
    PAWTHY_CMD="pnpm exec pawthy"
else
    log_warn "Pawthy CLI not found. Proceeding with Manual Mode..."
    FORCE_MANUAL=true
fi

PAWTHY_SUCCESS=false
if [ "$FORCE_MANUAL" = false ]; then
    if [ ! -f "$ROOT_DIR/.pawthyrc" ]; then
        log_info "Project not linked (.pawthyrc missing). Skipping automated sync."
        log_info "Tip: To connect Pawthy, create a project environment and link it using 'pnpm exec pawthy link'."
    else
        pull_and_merge() {
            log_info "Merging Pawthy-managed environment variables into .env..."
            if "$PAWTHY_CMD" pull -f "$ENV_FILE" --merge; then
                return 0
            else
                return 1
            fi
        }

        log_info "Initializing Pawthy secrets pull..."
        if [ ! -f "$ROOT_DIR/.pawthy/config.json" ]; then
            log_warn "No local Pawthy session found."
            echo -e "${YELLOW}Action Required:${NC} Please log in to sync secrets for this project."
            "$PAWTHY_CMD" login --local || true
        else
            log_success "Local Pawthy session found."
        fi

        if pull_and_merge; then
            log_success "Secrets synced successfully!"
            PAWTHY_SUCCESS=true
        else
            log_warn "Failed to pull secrets."
            echo -e "${YELLOW}Reason:${NC} Your session may be expired or you lack permission."
            read -p "Retry login? (Y/n): " LOGIN_YN
            if [[ ! "$LOGIN_YN" =~ ^[Nn]$ ]]; then
                "$PAWTHY_CMD" login --local || true
                if pull_and_merge; then
                    log_success "Secrets synced successfully!"
                    PAWTHY_SUCCESS=true
                fi
            fi
        fi
    fi
fi

# Generate Cryptographic Secrets if placeholders exist
log_info "Generating secure random keys in .env..."
node <<'EOF'
const fs = require('fs');
const crypto = require('crypto');
let content = fs.readFileSync('.env', 'utf8');
let updated = false;

if (content.includes('CHANGE_ME_RUN_OPENSSL_RAND_BASE64_32')) {
    const secret = crypto.randomBytes(32).toString('base64');
    content = content.replace(/CHANGE_ME_RUN_OPENSSL_RAND_BASE64_32/g, secret);
    updated = true;
}
if (content.includes('CHANGE_ME_RUN_OPENSSL_RAND_HEX_32')) {
    const secret = crypto.randomBytes(32).toString('hex');
    content = content.replace(/CHANGE_ME_RUN_OPENSSL_RAND_HEX_32/g, secret);
    updated = true;
}

if (updated) {
    fs.writeFileSync('.env', content, 'utf8');
    console.log('Successfully generated random secrets in .env');
} else {
    console.log('Secrets already set or customized.');
}
EOF

# 4. Verify yt-dlp Executable
log_info "=== 4. Verifying yt-dlp (Downloader) ==="
YT_DLP_CANDIDATE=""
if [ "$IS_WINDOWS" = true ]; then
    if [ -f "$ROOT_DIR/yt-dlp.exe" ]; then
        YT_DLP_CANDIDATE="$ROOT_DIR/yt-dlp.exe"
    fi
else
    if [ -f "$ROOT_DIR/yt-dlp" ]; then
        YT_DLP_CANDIDATE="$ROOT_DIR/yt-dlp"
    fi
fi

if [ -n "$YT_DLP_CANDIDATE" ]; then
    log_success "yt-dlp binary is available in root: $YT_DLP_CANDIDATE"
elif command -v yt-dlp &> /dev/null; then
    log_success "yt-dlp binary is available globally: $(which yt-dlp)"
else
    log_warn "yt-dlp binary was not found. Attempting to trigger installation script..."
    pnpm --filter jasper-bot run postinstall || {
        log_error "Failed to automatically download yt-dlp. Please refer to YT-DLP_TROUBLESHOOTING.md."
    }
fi

# 5. Success and Launch Check
log_success "Setup complete!"
echo ""

# Check if Discord configuration is still set to placeholder values
HAS_PLACEHOLDERS=false
if grep -q "your-bot-token-here" "$ENV_FILE"; then
    log_warn "DISCORD_TOKEN is still set to the placeholder value in .env"
    HAS_PLACEHOLDERS=true
fi
if grep -q "your-application-client-id" "$ENV_FILE"; then
    log_warn "DISCORD_CLIENT_ID is still set to the placeholder value in .env"
    HAS_PLACEHOLDERS=true
fi
if grep -q "your-development-guild-id" "$ENV_FILE"; then
    log_warn "GUILD_ID is still set to the placeholder value in .env"
    HAS_PLACEHOLDERS=true
fi

if [ "$HAS_PLACEHOLDERS" = true ]; then
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "1. Open the ${BLUE}.env${NC} file and add your Discord credentials."
    echo -e "2. Once configured, run the following to deploy slash commands to Discord:"
    echo -e "   ${GREEN}pnpm run deploy:commands${NC}"
    echo -e "3. Start the development server:"
    echo -e "   ${GREEN}pnpm run dev${NC}"
    echo ""
else
    read -p "Do you want to start the bot in development mode now? (Y/n): " START_DEV
    if [[ ! "$START_DEV" =~ ^[Nn]$ ]]; then
        log_info "Launching Development Server..."
        pnpm run dev
    fi
fi
