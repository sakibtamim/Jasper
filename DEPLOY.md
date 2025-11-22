# Deployment Guide

This guide explains how to deploy the Jasper music bot using GitHub Actions and PM2.

## Prerequisites

The target server must have the following installed:

1.  **Node.js**: Version 18 or higher (matching the project's requirement).
2.  **PM2**: Process manager for Node.js. Install globally:
    ```bash
    npm install -g pm2
    ```
3.  **FFmpeg**: Required for music playback.
4.  **Python**: Required for `yt-dlp`.

## Server Setup

1.  Ensure you can SSH into the server.
2.  Create a directory for the bot (e.g., `/home/user/jasper-bot`).
3.  Ensure the user has write permissions to this directory.

## GitHub Secrets

Configure the following secrets in your GitHub repository settings (Settings > Secrets and variables > Actions):

| Secret Name | Description |
| :--- | :--- |
| `SSH_HOST` | The IP address or hostname of your server. |
| `SSH_USERNAME` | The SSH username. |
| `SSH_KEY` | The SSH private key (contents of your `.pem` or `id_rsa` file). |
| `SSH_PORT` | (Optional) The SSH port. Defaults to `22`. |
| `SSH_TARGET` | The absolute path to the deployment directory on the server (e.g., `/home/user/jasper-bot`). |

## Configuration Files

### ecosystem.config.js

This file configures PM2 to manage the bot process.

-   **Name**: `jasper-bot`
-   **Script**: `./dist/index.js` (The compiled entry point)
-   **Instances**: 1
-   **Autorestart**: Enabled
-   **Max Memory**: 1G (Restarts if memory usage exceeds 1GB)

## Deployment Process

The deployment is handled automatically by GitHub Actions when you push to the `deploy` branch.

1.  **Build**: The workflow installs dependencies, compiles the TypeScript code, and generates SHA256 checksums for the artifacts.
2.  **Upload**: The compiled `dist` folder, `scripts`, configuration files, and checksums are uploaded as an artifact.
3.  **Deploy**:
    -   The artifact is downloaded and its integrity is verified using the checksums.
    -   Files are copied to the server via SCP, overwriting the `dist` and `scripts` directories.
    -   The integrity of the copied files on the server is verified again.
    -   `npm ci --production` is run on the server to install production dependencies.
    -   `pm2 startOrRestart ecosystem.config.js` is executed to start or reload the bot.

## Manual Commands (Troubleshooting)

If you need to manually manage the bot on the server:

-   **Logs**: `pm2 logs jasper-bot`
-   **Restart**: `pm2 restart jasper-bot`
-   **Stop**: `pm2 stop jasper-bot`
-   **Status**: `pm2 status`
