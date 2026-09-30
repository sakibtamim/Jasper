# Production Self-Hosting & Disaster Recovery Guide

This guide describes the production-grade Docker Compose architecture, operational runbooks, disaster recovery procedures, and zero-downtime rolling upgrade strategies for self-hosting Jasper.

---

## 🏗️ Architecture Overview

The production self-hosted topology is orchestrated via [`docker-compose.yml`](../../docker-compose.yml). It provides service isolation, dedicated non-root execution, persistent volumes, strict resource limits, and automated health checks.

```
                    ┌────────────────────────┐
                    │     Discord Gateway    │
                    └───────────┬────────────┘
                                │ WebSockets & REST
                                ▼
 ┌───────────────────────────────────────────────────────────────┐
 │                   Public Ingress Network                      │
 │                     (jasper-public)                           │
 └──────────────┬───────────────────────────────┬────────────────┘
                │ :3000                         │ :9001
                ▼                               ▼
    ┌───────────────────────┐       ┌───────────────────────┐
    │      jasper-bot       │       │         minio         │
    │     (Controller)      │       │     (Console UI)      │
    └───────────┬───────────┘       └───────────┬───────────┘
                │                               │
 ┌──────────────┴───────────────────────────────┴────────────────┐
 │                  Internal Isolated Network                    │
 │                      (jasper-internal)                        │
 └──────┬───────────────────────┬───────────────────────┬────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ jasper-worker │       │   postgres    │       │     minio     │
│ (Audio Pool)  │       │ (Database 16) │       │ (S3 Storage)  │
└───────────────┘       └───────────────┘       └───────────────┘
```

### Services Summary

| Service             | Role                                  | Network                        | Health Check                            | User / Security          |
| :------------------ | :------------------------------------ | :----------------------------- | :-------------------------------------- | :----------------------- |
| **`jasper-bot`**    | Primary controller & Web Dashboard    | `public`, `internal`           | `GET /health/ready` (15s)               | Non-root (`10001:10001`) |
| **`jasper-worker`** | Optional audio worker pool            | `internal`                     | `GET /health/live` (15s)                | Non-root (`10001:10001`) |
| **`postgres`**      | Relational state & migration lock     | `internal` (isolated)          | `pg_isready` (10s)                      | `postgres` (`70:70`)     |
| **`minio`**         | S3-compatible media & asset storage   | `public` (console), `internal` | `mc ready local` / `/minio/health/live` | Non-root (`10001:10001`) |
| **`minio-init`**    | Auto-provisions media buckets on boot | `internal`                     | N/A (runs once to completion)           | Non-root                 |

---

## 🚀 Quick Setup & Deployment

### 1. Configure Environment

Copy `.env.compose.example` to `.env`:

```bash
cp .env.compose.example .env
```

Set the required credentials:

- `DISCORD_TOKEN`: Discord Bot Token.
- `DISCORD_CLIENT_ID`: Discord Application Client ID.
- `COOKIE_SECRET`: Random 32+ character string.
- `ENCRYPTION_KEY`: Random 32+ character string.
- `POSTGRES_PASSWORD`: Strong password for PostgreSQL.
- `MINIO_ROOT_PASSWORD`: Strong secret key for MinIO.

### 2. Launch Services

Start the core stack (controller, database, storage):

```bash
docker compose up -d
```

To enable the optional audio worker pool for concurrent playback:

```bash
docker compose --profile workers up -d
```

### 3. Verify Health

Check the status of all running services:

```bash
docker compose ps
```

Verify service readiness:

```bash
curl -f http://localhost:3000/health/ready
# Output: {"status":"ready"}
```

---

## 🛡️ Disaster Recovery Runbook

Jasper includes atomic backup and idempotent restoration scripts with SHA-256 cryptographic verification in [`scripts/`](../../scripts/).

### 📦 1. Automated Backups (`scripts/backup.sh`)

The backup utility dumps the PostgreSQL database, archives object storage assets and plugin state, and generates a cryptographically signed manifest:

```bash
# In Docker Compose environment
./scripts/backup.sh --container

# Or in standalone/native environment
./scripts/backup.sh -o ./backups
```

#### Backup Artifacts Structure

Every backup produces an atomic tarball `jasper-backup_YYYYMMDD_HHMMSS.tar.gz` and an accompanying `.sha256` checksum file. Inside the bundle:

```
jasper-backup_20261001_120000.tar.gz
├── database.dump        # PostgreSQL custom-format atomic binary dump
├── storage.tar.gz       # Tenant assets, cached audio, and plugin storage
├── metadata.json        # Timestamp, version, git commit, and database engine
├── manifest.json        # Structured JSON list of file sizes and SHA-256 hashes
└── manifest.sha256      # Standard sha256sum verification digest
```

---

### ♻️ 2. Idempotent Restoration (`scripts/restore.sh`)

The restore utility enforces **pre-flight cryptographic verification** before touching any database or storage. If any file has been modified or corrupted, restoration immediately terminates with an error code.

```bash
# Restore into Docker Compose services
./scripts/restore.sh ./backups/jasper-backup_20261001_120000.tar.gz --container -f

# Or restore locally
./scripts/restore.sh ./backups/jasper-backup_20261001_120000.tar.gz -f
```

#### Pre-Flight Verification & Idempotency Guarantees

1. **SHA-256 Integrity Gate**: Validates every artifact against `manifest.sha256`. Fails with exit code `2` if checksum mismatch occurs.
2. **Database Readiness**: Pings PostgreSQL with `pg_isready` before initiating restoration.
3. **Clean Restoration**: Uses `pg_restore --clean --if-exists` to drop existing objects before restoring, guaranteeing zero duplicate-key or conflicting table errors.
4. **Atomic Storage Swap**: Unpacks storage into temporary staging before moving to target directories.

---

## 🔄 Zero-Downtime Rolling Upgrade Runbook

Jasper supports rolling upgrades between compatible minor versions without interrupting music playback in active voice channels.

### Upgrade Procedure

1. **Pull or Build New Release Image**:

    ```bash
    docker compose pull || docker compose build
    ```

2. **Trigger Database Migration**:
   Jasper's migration engine automatically acquires an advisory lock (`POSTGRES_ADVISORY_LOCK_ID = 48291048`) and table lock on `schema_migration_lock`. This prevents race conditions when multiple instances start simultaneously.

3. **Rolling Restart of Controller**:
   Restart the controller container with zero downtime for existing workers:

    ```bash
    docker compose up -d --no-deps jasper-bot
    ```

4. **Verify Controller Readiness**:

    ```bash
    docker compose exec jasper-bot curl -f http://localhost:3000/health/ready
    ```

5. **Upgrade Audio Workers Sequentially**:
    ```bash
    docker compose up -d --no-deps jasper-worker
    ```

### ⏪ Rollback Procedure

If a deployed version experiences unexpected runtime regressions:

1. Revert to the previous image tag or commit:

    ```bash
    git checkout <PREVIOUS_STABLE_COMMIT_OR_TAG>
    docker compose build
    ```

2. If schema rollback or data restoration is necessary:

    ```bash
    ./scripts/restore.sh ./backups/pre-upgrade-backup.tar.gz --container -f
    ```

3. Recreate containers with the stable release:
    ```bash
    docker compose up -d --force-recreate
    ```
