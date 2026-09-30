# Legacy Deployment Lane Freeze & Rollback Runbook (HJ-OSS-16)

**Stable ID:** HJ-OSS-16  
**Status:** Frozen  
**Target Workflow:** [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)  
**Replacement Stack:** [`docker-compose.yml`](../../docker-compose.yml) & [Production Self-Hosting Guide](self-hosting.md)

---

## 🎯 Executive Summary & Context

Under **HJ-OSS-16**, the legacy in-place PM2 push-deployment pipeline has been **frozen**. Automatic deployment upon pushing to the `deploy` branch is permanently disabled. The pipeline is restricted to manual invocation via `workflow_dispatch` with an explicit owner confirmation gate (`confirm_frozen_deploy: true`).

This decision isolates live environments from unintended mutation while Hosted Jasper foundations, provider contracts, and immutable container runtimes are established.

---

## 🔍 Legacy Lane Scope & Deficiencies

The legacy deployment pipeline was designed as an initial single-host setup with several operational risks:

| Dimension               | Legacy PM2 Pipeline (`deploy.yml`)            | Target Architecture (`docker-compose.yml`)                             |
| :---------------------- | :-------------------------------------------- | :--------------------------------------------------------------------- |
| **Trigger Policy**      | Unattended automatic push on `deploy` branch  | Immutable signed OCI release promotion                                 |
| **Execution User**      | Host-level user (often elevated or root)      | Dedicated non-root user (`10001:10001`)                                |
| **Atomicity**           | Destructive in-place `rm -rf` + SCP file copy | Atomic container swap & zero-downtime restart                          |
| **Network Isolation**   | Single host, open database port exposure      | Isolated internal bridge (`jasper-internal`)                           |
| **Concurrency Control** | None (concurrent runs can race on SCP)        | Advisory locks (`POSTGRES_ADVISORY_LOCK_ID`)                           |
| **Disaster Recovery**   | Manual intervention upon failure              | Automated backup & restore (`scripts/backup.sh`, `scripts/restore.sh`) |
| **Rollback**            | Manual Git checkout and PM2 restart           | Automated image rollback & idempotent restoration                      |

### Scope of the Legacy Lane

- **Host Scope**: Exactly one target host accessed via SSH (`SSH_HOST`, `SSH_TARGET`).
- **Guild Scope**: Single primary guild (`GUILD_ID`) configured for slash command deployment during build.
- **Process Scope**: Monolithic Node.js PM2 process (`ecosystem.config.cjs`) on the target machine.

---

## 🛡️ Enforced Freeze Controls

1. **Push Trigger Removed**:
   The workflow no longer responds to `git push` on `deploy` or any other branch.
2. **Manual `workflow_dispatch` Gate**:
   Manual invocation requires setting:
    ```yaml
    inputs:
        confirm_frozen_deploy: true
    ```
3. **Pre-Flight Execution Halt**:
   The very first step in both `build` and `deploy` jobs checks the `confirm_frozen_deploy` input. If `false` or unset, the workflow immediately fails with a fatal error.
4. **Prominent Deprecation Notice**:
   A prominent header in `.github/workflows/deploy.yml` directs all operators to the OCI container path.

---

## 🚑 Emergency Rollback Procedure (Legacy Host)

If an emergency manual run of the frozen legacy workflow fails or leaves the bot in an unready state on the target server, follow this rollback runbook:

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

- **Dependency / Build Corruption**: Missing modules or syntax errors from incomplete SCP.
- **Port Conflict**: Process crashed but port remains bound.
- **Discord Authentication**: Bad `DISCORD_TOKEN` or permission changes.
- **Database Connection**: PostgreSQL unreachable or SQLite file locked.

### 3. Rollback to Last Known Good State

If a Git checkout or backup artifact exists on the server:

```bash
# 1. Stop current failed process
pm2 stop Jasper

# 2. Checkout previous stable commit
git checkout <PREVIOUS_STABLE_COMMIT>

# 3. Clean and reinstall dependencies
rm -rf node_modules apps/bot/dist
pnpm install --prod --frozen-lockfile
pnpm --filter jasper-bot run postinstall

# 4. Restart process manager
pm2 startOrRestart ecosystem.config.cjs

# 5. Verify process status & logs
pm2 status
pm2 logs Jasper --lines 50
```

### 4. Database Recovery (If Applicable)

If database state was corrupted during the failed deployment, restore from the latest verified backup using the idempotent restoration script:

```bash
./scripts/restore.sh ./backups/latest-backup.tar.gz -f
```

---

## 🚀 Migration Path: Moving to Docker Compose (HJ-OSS-19)

All future deployments should transition to the production Docker Compose stack:

1. **Verify Prerequisites**:
   Ensure Docker and Docker Compose v2+ are installed on the host.
2. **Setup Configuration**:
    ```bash
    cp .env.compose.example .env
    # Edit .env with production credentials
    ```
3. **Deploy with Zero-Downtime Architecture**:
    ```bash
    docker compose up -d
    ```
4. **Health Verification**:
    ```bash
    curl -f http://localhost:3000/health/ready
    ```

Complete operational details, backup automation, and rolling upgrade procedures are documented in the [Production Self-Hosting & Disaster Recovery Guide](self-hosting.md).

The eventual complete retirement of the legacy PM2 workflow is scheduled under **HJ-OSS-18**.
