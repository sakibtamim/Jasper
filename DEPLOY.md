# Deployment Guide

This guide explains how to deploy the Jasper music bot using GitHub Actions and PM2.

## Prerequisites

The target server must have the following installed:

1.  **Node.js**: Version 24 or higher (as specified in `.nvmrc`).
    - **Important**: If using `nvm` to manage Node.js, ensure it's properly configured in your shell's `.bashrc` or `.bash_profile`.
2.  **pnpm**: Package manager. If not already available, it will be automatically enabled via corepack during deployment. To install manually:
    ```bash
    corepack enable
    corepack prepare pnpm@latest --activate
    ```
3.  **PM2**: Process manager for Node.js. Install globally:
    ```bash
    pnpm install -g pm2
    ```
4.  **FFmpeg**: Required for music playback.
5.  **yt-dlp**: Will be automatically downloaded during deployment.

## Server Setup

1.  Ensure you can SSH into the server.
2.  Create a directory for the bot (e.g., `/home/user/jasper-bot`).
3.  Ensure the user has write permissions to this directory.

## GitHub Secrets

Configure the following secrets in your GitHub repository settings (Settings > Secrets and variables > Actions):

| Secret Name         | Description                                                                                  |
| :------------------ | :------------------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`     | The Discord bot token for production command deployment.                                     |
| `DISCORD_CLIENT_ID` | The Discord application client ID for production command deployment.                         |
| `SSH_HOST`          | The IP address or hostname of your server.                                                   |
| `SSH_USERNAME`      | The SSH username.                                                                            |
| `SSH_KEY`           | The SSH private key (contents of your `.pem` or `id_rsa` file).                              |
| `SSH_PORT`          | (Optional) The SSH port. Defaults to `22`.                                                   |
| `SSH_TARGET`        | The absolute path to the deployment directory on the server (e.g., `/home/user/jasper-bot`). |

## Configuration Files

### ecosystem.config.cjs

This file configures PM2 to manage the bot process. It uses the `.cjs` extension because the project uses ES modules (`"type": "module"` in package.json), but PM2 requires CommonJS format.

- **Name**: `Jasper`
- **Script**: `./apps/bot/dist/index.js` (The compiled entry point)
- **Environment**: Production mode

## Deployment Process

The deployment is handled automatically by GitHub Actions when you push to the `deploy` branch.

1.  **Build**:
    - The workflow installs dependencies (with `YT_DLP_SKIP_POSTINSTALL=1` to skip yt-dlp download during build)
    - Runs `turbo run build` to compile all packages and apps
    - Generates SHA256 checksums for:
        - All files in `apps/bot/dist/` (compiled bot code)
        - All files in `apps/web/dist/` (compiled frontend code)
        - Top-level config files (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `ecosystem.config.cjs`)
2.  **Upload**: The compiled `apps` folder, configuration files, and checksums are uploaded as an artifact.
3.  **Deploy**:
    - The artifact is downloaded and its integrity is verified using the checksums.
    - The existing bot process is stopped via PM2 (if running).
    - Old files are cleaned from the deployment directory.
    - Files are copied to the server via SCP, preserving the monorepo structure.
    - The integrity of the copied files on the server is verified again.
    - `pnpm install --prod --frozen-lockfile` is run on the server to install production dependencies (yt-dlp is downloaded here).
    - `pm2 startOrRestart ecosystem.config.cjs` is executed to start or reload the bot.
    - **Note**: Discord slash commands are deployed during the build phase, not on the server.

### Important Notes

- **nvm Support**: The deployment scripts automatically source nvm if it's installed, ensuring node/pnpm/pm2 are available.
- **yt-dlp**: Skipped during CI build but downloaded on the server during production install.
- **Checksums**: SHA256 verification ensures deployment integrity at multiple stages.

## Troubleshooting

### Node Version & Database Support

Jasper uses Node.js built-in `node:sqlite` for single-instance storage by default, and supports PostgreSQL for multi-instance or scaled production deployments (configured via `DB_TYPE=postgres` and `DATABASE_URL`). Ensure the runtime environment matches Node.js **v24+** (as specified in `.nvmrc`).

- Recommended Node Version: **v24+**
- If using `pnpm`, ensure it uses the same Node version as your runtime.

### Plugin Loading Issues

- Ensure `apps/web/dist/index.html` exists.
- Check that plugins are built correctly in `dist/plugins`.
- Verify that shared dependencies (React, etc.) are exposed globally in `apps/web/main.tsx`.

## Start Command

To start the production server:

```bash
pnpm prod:start
```

Ensure `PORT` is set (e.g., `PORT=3000`; defaults to `0` / disabled if unset).

- **Restart**: `pm2 restart Jasper`
- **Stop**: `pm2 stop Jasper`
- **Status**: `pm2 status`

> **Note on Deployment Architecture**: This PM2 SSH deployment lane represents the legacy single-host manual path. Production-grade containerization with immutable OCI base images, Docker Compose profiles, and signed release promotion are being established under [`HJ-OSS-14`](docs/hosted-jasper/mvp-issue-plan.md#hj-oss-14--publish-jasper-base-image-and-one-container-sqlite-quick-path) and [`HJ-OSS-19`](docs/hosted-jasper/mvp-issue-plan.md#hj-oss-19--publish-production-like-self-host-compose-and-recovery-path).
