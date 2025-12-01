# Environment Variables Documentation

This document is the single source of truth for all environment variables used by Jasper Music Bot.

## Quick Start

Copy `.env.example` to `.env` and fill in at minimum:
```env
DISCORD_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=your-application-client-id
GUILD_ID=your-development-guild-id
```

## Core Bot Configuration
 
### Required for Bot Startup
 
| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Your Discord bot token from the Developer Portal | `MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.G...` |
 
### Required for Command Deployment / Authentication
 
| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_CLIENT_ID` | Application ID from Discord Developer Portal. Required for command deployment and OAuth2 authentication. | `1234567890123456789` |
| `GUILD_ID` | Guild (server) ID for development command deployment. Required for deploying commands to a specific server. | `9876543210987654321` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `ANNOUNCE_CHANNEL_ID` | Text channel ID for startup/shutdown announcements | (disabled) |
| `NODE_ENV` | Runtime environment (`production` or `development`) | `production` |

## Worker Bots

Jasper supports multiple bot instances (workers) for simultaneous playback in different channels.

### Dynamic Worker Configuration

Add worker bots by creating environment variables ending in `_TOKEN`:

```env
MISTY_TOKEN=worker-bot-token-1
TUKI_TOKEN=worker-bot-token-2
JAFREEN_TOKEN=worker-bot-token-3
```

The bot name is derived from the variable name:
- `MISTY_TOKEN` → Worker named "Misty"
- `MY_COOL_BOT_TOKEN` → Worker named "My Cool Bot"

## Automatic Feline Rotation (AFR)

| Variable | Description | Default |
|----------|-------------|---------|
| `AFR_JASPER_WEIGHT` | Probability (0-1) that Jasper is selected when idle workers are available | `0.5` |

**Weight Options:**
- `0.5` - Balanced 50/50 split between Jasper and workers (default)
- `1.0` - Jasper always joins when available (classic behavior)
- `0.0` - Workers always selected, Jasper never joins
- `0.75` - Jasper has 75% chance, workers 25%

## Caching System

| Variable | Description | Default |
|----------|-------------|---------|
| `CACHE_ENABLED` | Enable caching system (`true`/`false`) | `false` |
| `CACHE_SEARCH_TTL_HOURS` | Search result cache TTL in hours | `168` (7 days) |
| `CACHE_AUDIO_TTL_HOURS` | Audio file cache TTL in hours | `72` (3 days) |
| `CACHE_CLEANUP_INTERVAL_HOURS` | Background cleanup interval in hours | `1` |

## Database Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_TYPE` | Database type: `sqlite` or `postgres` | `sqlite` |
| `DATABASE_URL` | PostgreSQL connection string (required if `DB_TYPE=postgres`) | (none) |

**Example PostgreSQL URL:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/jasper_db
```

## Web Server & Dashboard

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port for the web dashboard. Set to enable Web UI. | (disabled) |
| `BASE_URL` | Public-facing URL of the application (Backend) | `http://localhost:3000` |
| `FRONTEND_URL` | URL of the React Frontend (for redirects) | `http://localhost:5173` (dev) / `BASE_URL` (prod) |

## Authentication (Web UI)

These variables are required when using the Web UI with Discord OAuth2 authentication.

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_CLIENT_SECRET` | Client Secret from Discord Developer Portal | (none) |
| `COOKIE_SECRET` | Secret key for signing cookies | (none) |
| `ENCRYPTION_KEY` | Key for encrypting OAuth tokens (32+ characters recommended) | (none) |
| `PBKDF2_ITERATIONS` | PBKDF2 iterations for key derivation | `100000` |

> **Security Note:** In production, always use strong, unique values for `COOKIE_SECRET` and `ENCRYPTION_KEY`.

## yt-dlp Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `YT_DLP_JS_RUNTIME` | JavaScript runtime for yt-dlp | `node` |
| `YT_DLP_PLAYER_CLIENT` | YouTube player client | `default` |

## Configuration Validation

The bot validates environment variables at startup:

1. **Bot Startup (`validateBotConfig`)**: Requires `DISCORD_TOKEN`
2. **Command Deployment (`validateDeployConfig`)**: Requires `DISCORD_CLIENT_ID`, `GUILD_ID`, `DISCORD_TOKEN`
3. **Authentication (`validateAuthConfig`)**: Requires `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `COOKIE_SECRET`, `ENCRYPTION_KEY`
4. **PostgreSQL (`validatePostgresConfig`)**: Requires `DATABASE_URL` when `DB_TYPE=postgres`

## Migration Notes

### CLIENT_ID → DISCORD_CLIENT_ID

The legacy `CLIENT_ID` environment variable has been replaced with `DISCORD_CLIENT_ID` to avoid confusion with other client IDs and align with Discord's naming conventions. Update your `.env` file accordingly.

## Related Documentation

- [README.md](README.md) - Project overview and installation
- [AUTH.md](AUTH.md) - Authentication system documentation
- [DEPLOY.md](DEPLOY.md) - Deployment guide
