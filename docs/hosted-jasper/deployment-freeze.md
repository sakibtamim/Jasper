# Legacy Deployment Lane Retirement & Rollback Record (HJ-OSS-16 / HJ-OSS-18)

**Stable ID:** HJ-OSS-16 (Freeze) / HJ-OSS-18 (Retirement)  
**Status:** Permanently Retired  
**Target Workflow:** `.github/workflows/deploy.yml` (Removed)  
**Replacement Stack:** [`docker-compose.yml`](../../docker-compose.yml), [`docker-compose.quickstart.yml`](../../docker-compose.quickstart.yml) & [Production Self-Hosting Guide](self-hosting.md)

---

## 🎯 Executive Summary & Retirement Decision (HJ-OSS-18)

Under **HJ-OSS-16**, the legacy in-place PM2 push-deployment pipeline was **frozen** to prevent unattended in-place mutation of live bot hosts during hosted evolution.

Following the successful implementation and verification of the immutable container architecture:

- **HJ-OSS-14**: Published the multi-stage OCI base image and zero-config one-container SQLite quick path (`docker-compose.quickstart.yml`).
- **HJ-OSS-19**: Deployed the production multi-container Docker Compose stack (`docker-compose.yml`) with PostgreSQL 16 advisory locking, MinIO asset storage, non-root user execution, and automated backup/restore runbooks (`scripts/backup.sh`, `scripts/restore.sh`).

Under **HJ-OSS-18**, the legacy PM2 deployment lane and its workflow file (`.github/workflows/deploy.yml`) have been **permanently retired and removed** from the repository. All manual and automated deployments must use Docker Compose.

---

## 🔍 Legacy Lane Scope & Deficiencies

The legacy deployment pipeline was designed as an initial single-host setup with several operational risks:

| Dimension               | Legacy PM2 Pipeline (`deploy.yml`)            | Target Architecture (`docker-compose.yml`)                             |
| :---------------------- | :-------------------------------------------- | :--------------------------------------------------------------------- |
| **Status**              | **Permanently Retired (HJ-OSS-18)**           | **Active Production Standard**                                         |
| **Trigger Policy**      | Unattended automatic push on `deploy` branch  | Immutable signed OCI release promotion                                 |
| **Execution User**      | Host-level user (often elevated or root)      | Dedicated non-root user (`10001:10001`)                                |
| **Atomicity**           | Destructive in-place `rm -rf` + SCP file copy | Atomic container swap & zero-downtime restart                          |
| **Network Isolation**   | Single host, open database port exposure      | Isolated internal bridge (`jasper-internal`)                           |
| **Concurrency Control** | None (concurrent runs can race on SCP)        | Advisory locks (`POSTGRES_ADVISORY_LOCK_ID`)                           |
| **Disaster Recovery**   | Manual intervention upon failure              | Automated backup & restore (`scripts/backup.sh`, `scripts/restore.sh`) |
| **Rollback**            | Manual Git checkout and PM2 restart           | Automated image rollback & idempotent restoration                      |

### Scope of the Former Legacy Lane

- **Host Scope**: Single target host accessed via SSH (`SSH_HOST`, `SSH_TARGET`).
- **Guild Scope**: Single primary guild (`GUILD_ID`) configured for slash command deployment during build.
- **Process Scope**: Monolithic Node.js PM2 process (`ecosystem.config.cjs`) on the target machine.

---

## 🛡️ Historical Freeze Controls (HJ-OSS-16)

Prior to complete retirement in HJ-OSS-18, the following controls were enforced during the freeze phase:

1. **Push Trigger Removed**: The workflow no longer responded to `git push` on `deploy` or any branch.
2. **Manual `workflow_dispatch` Gate**: Execution required explicit boolean input `confirm_frozen_deploy: true`.
3. **Pre-Flight Execution Halt**: Both `build` and `deploy` jobs immediately aborted if `confirm_frozen_deploy` was false.
4. **Permanent Retirement (HJ-OSS-18)**: The entire `.github/workflows/deploy.yml` workflow has been deleted from version control.

---

## 🚑 Historical Rollback Procedure & Migration for Legacy Hosts

For hosts that previously ran the legacy PM2 process, operators must migrate to the Docker Compose stack. If an existing host requires emergency rollback prior to completing migration:

### 1. Connect to Host & Assess Process State

```bash
ssh -p ${SSH_PORT:-22} ${SSH_USERNAME}@${SSH_HOST}
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd ${SSH_TARGET}
pm2 status
pm2 logs Jasper --lines 100 --err
```

### 2. Identify the Failure Mode

- **Dependency / Build Corruption**: Missing modules or syntax errors from legacy SCP.
- **Port Conflict**: Process crashed but port remains bound.
- **Discord Authentication**: Bad `DISCORD_TOKEN` or permission changes.
- **Database Connection**: PostgreSQL unreachable or SQLite file locked.

### 3. Decommission PM2 and Migrate to Docker Compose

```bash
# 1. Stop and delete PM2 process permanently
pm2 stop Jasper && pm2 delete Jasper
pm2 save

# 2. Preserve database data
cp "${SQLITE_PATH:-data/jasper.db}" "${SQLITE_PATH:-data/jasper.db}.bak" 2>/dev/null || true

# 3. Launch via Docker Compose (Quickstart or Production)
cp .env.compose.example .env
docker compose -f docker-compose.quickstart.yml up -d
```

### 4. Database Recovery & Restore

If database state was corrupted or needs to be restored from backup, use the idempotent restore script:

```bash
./scripts/restore.sh ./backups/latest-backup.tar.gz -f
```

---

## 🚀 Migration Standard: Docker Compose (HJ-OSS-14 / HJ-OSS-19)

All future deployments exclusively use the containerized stack:

1. **Zero-Config Quickstart (SQLite)**:
    ```bash
    docker compose -f docker-compose.quickstart.yml up -d
    ```
2. **Production Multi-Container Stack (PostgreSQL + MinIO)**:
    ```bash
    cp .env.compose.example .env
    docker compose up -d
    ```
3. **Health Verification**:
    ```bash
    curl -f http://localhost:3000/health/ready
    ```

Complete operational details, backup automation, and rolling upgrade procedures are documented in the [Production Self-Hosting & Disaster Recovery Guide](self-hosting.md).
