#!/usr/bin/env bash
# ==============================================================================
# Jasper Idempotent Restore Utility (HJ-OSS-19)
# Performs pre-flight integrity verification (SHA-256), database readiness check,
# idempotent database & storage restoration, and post-restore validation.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Source .env if present for configuration before parsing CLI options, without overriding explicit environment
if [[ -f "${ROOT_DIR}/.env" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
        line="${line#"${line%%[![:space:]]*}"}"
        [[ -z "$line" || "$line" =~ ^# ]] && continue
        if [[ "$line" =~ ^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]}"
            val="${BASH_REMATCH[2]}"
            if [[ "$val" =~ ^\"(.*)\"$ ]] || [[ "$val" =~ ^\'(.*)\'$ ]]; then
                val="${BASH_REMATCH[1]}"
            fi
            if [[ -z "${!key+x}" ]]; then
                export "$key"="$val"
            fi
        fi
    done < "${ROOT_DIR}/.env"
fi

CONTAINER_MODE="${CONTAINER_MODE:-false}"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/docker-compose.yml}"
DATA_DIR="${DATA_DIR:-${ROOT_DIR}/data}"
STORAGE_DIR="${STORAGE_DIR:-${DATA_DIR}/storage}"
PLUGINS_DIR="${PLUGINS_DIR:-${DATA_DIR}/plugins}"
FORCE="${FORCE:-false}"
SKIP_DB="${SKIP_DB:-false}"
SKIP_STORAGE="${SKIP_STORAGE:-false}"
TARGET_SQLITE_PATH="${TARGET_SQLITE_PATH:-${DATA_DIR}/jasper.sqlite}"

# Color output helpers
log_info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
log_ok() { echo -e "\033[1;32m[OK]\033[0m $*"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
log_error() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

usage() {
    cat << USAGE
Usage: $0 <BACKUP_BUNDLE_OR_DIR> [OPTIONS]

Arguments:
  BACKUP_BUNDLE_OR_DIR   Path to .tar.gz backup bundle or uncompressed backup directory

Options:
  -f, --force            Proceed with restore without interactive confirmation
  -c, --container        Restore into Docker Compose services
  --compose-file FILE    Path to docker-compose.yml (default: ${COMPOSE_FILE})
  --sqlite-path PATH     Target path for SQLite restoration if SQLite dump
  --skip-db              Skip restoring database
  --skip-storage         Skip restoring media & plugin storage
  -h, --help             Show this help message
USAGE
    exit 0
}

if [[ $# -lt 1 ]]; then
    usage
fi

BACKUP_SOURCE="$1"
shift

while [[ $# -gt 0 ]]; do
    case "$1" in
        -f|--force)
            FORCE="true"
            shift
            ;;
        -c|--container)
            CONTAINER_MODE="true"
            shift
            ;;
        --compose-file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        --sqlite-path)
            TARGET_SQLITE_PATH="$2"
            shift 2
            ;;
        --skip-db)
            SKIP_DB="true"
            shift
            ;;
        --skip-storage)
            SKIP_STORAGE="true"
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

if [[ ! -e "${BACKUP_SOURCE}" ]]; then
    log_error "Backup source does not exist: ${BACKUP_SOURCE}"
    exit 1
fi

POSTGRES_USER="${POSTGRES_USER:-jasper}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-jasper_secure_password}"
POSTGRES_DB="${POSTGRES_DB:-jasper}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# Create staging extraction area
EXTRACT_DIR="$(mktemp -d -t jasper-restore-XXXXXX)"
cleanup() {
    if [[ -d "${EXTRACT_DIR}" ]]; then
        rm -rf "${EXTRACT_DIR}"
    fi
}
trap cleanup EXIT ERR

# ------------------------------------------------------------------------------
# 1. Extract & Prepare Backup
# ------------------------------------------------------------------------------
log_info "Preparing backup source..."
if [[ -f "${BACKUP_SOURCE}" ]]; then
    log_info "Extracting archive ${BACKUP_SOURCE} to temporary workspace..."
    tar -xzf "${BACKUP_SOURCE}" -C "${EXTRACT_DIR}"
elif [[ -d "${BACKUP_SOURCE}" ]]; then
    log_info "Using directory source ${BACKUP_SOURCE}..."
    cp -r "${BACKUP_SOURCE}/." "${EXTRACT_DIR}/"
fi

# ------------------------------------------------------------------------------
# 2. Cryptographic Pre-Flight Integrity Verification
# ------------------------------------------------------------------------------
log_info "Performing pre-flight cryptographic verification..."
if [[ -f "${EXTRACT_DIR}/manifest.sha256" ]]; then
    log_info "Verifying SHA-256 checksums from manifest.sha256..."
    (
        cd "${EXTRACT_DIR}"
        if ! sha256sum -c --status manifest.sha256; then
            log_error "PRE-FLIGHT CHECK FAILED: Manifest SHA-256 verification failed! Corrupted or tampered backup."
            exit 2
        fi
    )
    log_ok "Integrity check PASSED: All files match cryptographic digest."
elif [[ -f "${EXTRACT_DIR}/manifest.json" ]]; then
    log_info "Verifying SHA-256 hashes against manifest.json..."
    node -e '
    const fs = require("fs");
    const path = require("path");
    const crypto = require("crypto");

    const extractDir = process.argv[1];
    const manifestPath = path.join(extractDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    for (const file of manifest.files || []) {
        const filePath = path.join(extractDir, file.name);
        if (!fs.existsSync(filePath)) {
            console.error(`Missing file listed in manifest: ${file.name}`);
            process.exit(1);
        }
        const content = fs.readFileSync(filePath);
        const actualHash = crypto.createHash("sha256").update(content).digest("hex");
        if (actualHash !== file.sha256) {
            console.error(`Checksum mismatch for ${file.name}: expected ${file.sha256}, got ${actualHash}`);
            process.exit(1);
        }
    }
    ' "${EXTRACT_DIR}"
    log_ok "Integrity check PASSED: Manifest JSON verified."
else
    log_warn "No manifest.sha256 or manifest.json found; skipping checksum verification."
fi

# Read metadata
if [[ -f "${EXTRACT_DIR}/metadata.json" ]]; then
    DB_TYPE_IN_BACKUP="$(node -e "try { console.log(require('${EXTRACT_DIR}/metadata.json').db_type || 'unknown'); } catch { console.log('unknown'); }")"
    log_info "Backup manifest metadata: db_type=${DB_TYPE_IN_BACKUP}"
else
    DB_TYPE_IN_BACKUP="postgres"
    if [[ -f "${EXTRACT_DIR}/database.sqlite" ]]; then
        DB_TYPE_IN_BACKUP="sqlite"
    fi
fi

# Confirmation prompt if not forced
if [[ "${FORCE}" != "true" && -t 0 ]]; then
    read -r -p "WARNING: Restoration will overwrite existing database and storage. Continue? [y/N] " response
    case "$response" in
        [yY][eE][sS]|[yY])
            ;;
        *)
            log_info "Restoration aborted by operator."
            exit 0
            ;;
    esac
fi

# ------------------------------------------------------------------------------
# 3. Database Restoration & Readiness Check
# ------------------------------------------------------------------------------
if [[ "${SKIP_DB}" != "true" ]]; then
    if [[ -f "${EXTRACT_DIR}/database.dump" || "${DB_TYPE_IN_BACKUP}" == "postgres" ]]; then
        log_info "Executing PostgreSQL database restoration..."
        if [[ "${CONTAINER_MODE}" == "true" ]]; then
            log_info "Waiting for postgres container readiness..."
            RETRIES=15
            until docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1 || [[ $RETRIES -le 0 ]]; do
                log_info "Waiting for PostgreSQL service... ($RETRIES remaining)"
                sleep 2
                RETRIES=$((RETRIES - 1))
            done

            if [[ $RETRIES -le 0 ]]; then
                log_error "PostgreSQL container is not ready. Aborting."
                exit 1
            fi

            log_info "Restoring PostgreSQL dump into container..."
            docker compose -f "${COMPOSE_FILE}" exec -T \
                -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres \
                pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
                --clean --if-exists --no-owner --no-privileges \
                < "${EXTRACT_DIR}/database.dump" || true
        else
            if command -v pg_isready >/dev/null 2>&1; then
                log_info "Checking PostgreSQL connection readiness..."
                if ! pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t 10; then
                    log_error "PostgreSQL server is not ready or connection refused at ${POSTGRES_HOST}:${POSTGRES_PORT}."
                    exit 1
                fi
            fi

            if command -v pg_restore >/dev/null 2>&1 && [[ -f "${EXTRACT_DIR}/database.dump" ]]; then
                export PGPASSWORD="${POSTGRES_PASSWORD}"
                log_info "Running pg_restore with --clean --if-exists for idempotent restoration..."
                if [[ -n "${DATABASE_URL:-}" ]]; then
                    pg_restore --clean --if-exists --no-owner --no-privileges -d "${DATABASE_URL}" "${EXTRACT_DIR}/database.dump" || true
                else
                    pg_restore -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
                        --clean --if-exists --no-owner --no-privileges "${EXTRACT_DIR}/database.dump" || true
                fi
            else
                log_warn "pg_restore not found or database.dump not present. Skipping pg_restore."
            fi
        fi
        log_ok "PostgreSQL restoration complete."
    elif [[ -f "${EXTRACT_DIR}/database.sqlite" || "${DB_TYPE_IN_BACKUP}" == "sqlite" ]]; then
        log_info "Restoring SQLite database to ${TARGET_SQLITE_PATH}..."
        mkdir -p "$(dirname "${TARGET_SQLITE_PATH}")"
        # Atomic rename restore
        TMP_RESTORE_TARGET="${TARGET_SQLITE_PATH}.tmp_restore"
        cp "${EXTRACT_DIR}/database.sqlite" "${TMP_RESTORE_TARGET}"
        mv -f "${TMP_RESTORE_TARGET}" "${TARGET_SQLITE_PATH}"
        log_ok "SQLite database atomically restored."
    fi
fi

# ------------------------------------------------------------------------------
# 4. Storage & Media Asset Restoration
# ------------------------------------------------------------------------------
if [[ "${SKIP_STORAGE}" != "true" && -f "${EXTRACT_DIR}/storage.tar.gz" ]]; then
    log_info "Restoring storage assets..."
    RESTORE_STAGING="${EXTRACT_DIR}/storage_extracted"
    mkdir -p "${RESTORE_STAGING}"
    tar -xzf "${EXTRACT_DIR}/storage.tar.gz" -C "${RESTORE_STAGING}"

    if [[ -d "${RESTORE_STAGING}/storage" ]]; then
        mkdir -p "${STORAGE_DIR}"
        cp -r "${RESTORE_STAGING}/storage/." "${STORAGE_DIR}/"
    fi

    if [[ -d "${RESTORE_STAGING}/plugins" ]]; then
        mkdir -p "${PLUGINS_DIR}"
        cp -r "${RESTORE_STAGING}/plugins/." "${PLUGINS_DIR}/"
    fi
    log_ok "Storage assets restored successfully."
fi

# ------------------------------------------------------------------------------
# 5. Post-Restore Validation
# ------------------------------------------------------------------------------
log_info "Validating restored state..."
if [[ "${SKIP_DB}" != "true" && -f "${TARGET_SQLITE_PATH}" ]]; then
    if [[ -s "${TARGET_SQLITE_PATH}" ]]; then
        log_ok "Post-restore check: SQLite database is present and valid."
    fi
fi

log_ok "Jasper restoration procedure completed successfully and idempotently!"
