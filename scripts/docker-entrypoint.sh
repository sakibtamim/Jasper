#!/usr/bin/env bash
set -eo pipefail

# ==============================================================================
# Jasper Container Entrypoint (HJ-OSS-14)
# Supports: migrate, start, migrate-and-start, deploy-commands
# ==============================================================================

# Locate bot directory in container or repository root
APP_DIR="${APP_DIR:-/app}"
if [ -d "$APP_DIR/apps/bot/dist" ]; then
    BOT_DIR="$APP_DIR/apps/bot"
elif [ -d "./apps/bot/dist" ]; then
    BOT_DIR="./apps/bot"
elif [ -d "./dist" ]; then
    BOT_DIR="."
else
    BOT_DIR="/app/apps/bot"
fi

# Default SQLite volume configuration
# Defaults to /data/jasper.sqlite if /data exists and SQLITE_PATH is unset
if [ -z "${SQLITE_PATH:-}" ] && [ -z "${DATABASE_PATH:-}" ]; then
    if [ -d "/data" ] || [ -w "/" ]; then
        export SQLITE_PATH="/data/jasper.sqlite"
        export DATABASE_PATH="/data/jasper.sqlite"
    fi
fi

# Ensure SQLite directory exists and verify write permissions
TARGET_SQLITE="${SQLITE_PATH:-${DATABASE_PATH:-}}"
if [ -n "$TARGET_SQLITE" ]; then
    DB_DIR="$(dirname "$TARGET_SQLITE")"
    if [ ! -d "$DB_DIR" ]; then
        mkdir -p "$DB_DIR" 2>/dev/null || true
    fi
    if [ ! -w "$DB_DIR" ] && [ ! -w "$TARGET_SQLITE" 2>/dev/null ]; then
        echo "[docker-entrypoint] Warning: Directory $DB_DIR is not writable by user $(id -u)." >&2
    fi
fi

run_migrate() {
    echo "[docker-entrypoint] Running database migrations..."
    if [ -f "$BOT_DIR/dist/migrate.js" ]; then
        node "$BOT_DIR/dist/migrate.js"
    elif [ -f "$BOT_DIR/src/migrate.ts" ]; then
        pnpm --filter jasper-bot run db:migrate:dev
    else
        echo "[docker-entrypoint] Error: migrate entrypoint not found at $BOT_DIR/dist/migrate.js" >&2
        exit 1
    fi
    echo "[docker-entrypoint] Database migrations completed."
}

run_deploy_commands() {
    echo "[docker-entrypoint] Deploying slash commands..."
    if [ -f "$BOT_DIR/dist/deploy-commands.js" ]; then
        node "$BOT_DIR/dist/deploy-commands.js" "$@"
    elif [ -f "$BOT_DIR/src/deploy-commands.ts" ]; then
        pnpm --filter jasper-bot run deploy:commands "$@"
    else
        echo "[docker-entrypoint] Error: deploy-commands not found at $BOT_DIR/dist/deploy-commands.js" >&2
        exit 1
    fi
}

run_start() {
    echo "[docker-entrypoint] Starting Jasper..."
    if [ -f "$BOT_DIR/dist/index.js" ]; then
        exec node "$BOT_DIR/dist/index.js" "$@"
    elif [ -f "$BOT_DIR/src/index.ts" ]; then
        exec pnpm --filter jasper-bot run dev "$@"
    else
        echo "[docker-entrypoint] Error: start entrypoint not found at $BOT_DIR/dist/index.js" >&2
        exit 1
    fi
}

run_migrate_and_start() {
    run_migrate
    run_start "$@"
}

# Determine action
ACTION="${1:-migrate-and-start}"

case "$ACTION" in
    migrate)
        shift
        run_migrate "$@"
        ;;
    deploy-commands)
        shift
        run_deploy_commands "$@"
        ;;
    start)
        shift
        run_start "$@"
        ;;
    migrate-and-start)
        shift
        run_migrate_and_start "$@"
        ;;
    -*)
        # Arguments starting with hyphen passed directly to migrate-and-start
        run_migrate_and_start "$@"
        ;;
    *)
        # Custom command (e.g. bash, sh, pnpm, node)
        exec "$@"
        ;;
esac
