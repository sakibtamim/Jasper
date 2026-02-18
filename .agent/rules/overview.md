---
trigger: model_decision
---

# Jasper Music Bot - Project Overview

> **Note**: This document provides a comprehensive overview of the Jasper Music Bot project for AI agents and developers.

## Project Description

**Jasper** is a Discord music bot themed after a big black Persian cat, featuring a "Multi-Cat" architecture that allows concurrent playback across multiple voice channels. It includes a web dashboard for monitoring and statistics tracking.

## Key Technologies

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript (strict mode)
- **Architecture**: Monorepo (Turborepo + pnpm workspaces)
- **Module System**: ES Modules (`import`/`export`)
- **Framework**: discord.js v14
- **Voice Library**: @discordjs/voice
- **Audio Source**: `yt-dlp` (spawned as a child process)
- **Search**: `yt-search`
- **Web Server**: Fastify
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: SQLite (default) / PostgreSQL (production)
- **Architecture**: Multi-bot Worker Pool (supports multiple simultaneous voice channels)
- **Dev Tooling**: tsx, Turbo

## Architecture Overview

### Core Components

1. **Controller Bot (Jasper)**: Handles slash commands and orchestrates workers
2. **Worker Bots**: Dedicated bot instances for audio playback in different channels
3. **Worker Pool**: Manages worker allocation using AFR (Automatic Feline Rotation)
4. **Music Player**: Facade for audio operations
5. **Database**: Tracks plays, stats, and caching metadata
6. **Web Dashboard**: Real-time monitoring of bot status and statistics (React-based)

### Directory Structure

```
Jasper/
├── apps/
│   ├── bot/            # Discord bot (Node.js)
│   │   ├── src/
│   │   │   ├── commands/   # Slash command definitions
│   │   │   ├── config/     # Configuration
│   │   │   ├── core/       # Core logic
│   │   │   ├── api/        # Fastify server
│   │   │   └── ...
│   └── web/            # React Dashboard (Vite)
│       ├── src/
│       ├── public/
│       └── ...
├── packages/           # Shared packages
│   ├── ui/             # UI components
│   └── ...
├── .agent/             # Agent instructions and workflows
├── turbo.json          # Turborepo config
└── scripts/            # Maintenance scripts
```

## Development Setup

### Prerequisites

- Node.js v18+
- FFmpeg
- `yt-dlp` binary (auto-downloaded by postinstall script)

### Environment Variables

Required:

- `DISCORD_TOKEN` - Main bot token
- `DISCORD_CLIENT_ID` - Discord application ID
- `COOKIE_SECRET` - For web dashboard sessions
- `ENCRYPTION_KEY` - For encrypting OAuth tokens (32+ characters)

Optional:

- `<NAME>_TOKEN` - Additional worker bot tokens (e.g., `MISTY_TOKEN`)
- `DATABASE_URL` - PostgreSQL connection string (defaults to SQLite)
- `BASE_URL` - For OAuth callbacks (defaults to `http://localhost:3000`)
- `FRONTEND_URL` - For React frontend redirects (defaults to `http://localhost:5173` in dev)

### Installation

```bash
pnpm install
cp .env.example .env
# Edit .env with your tokens
pnpm run deploy:commands
pnpm run dev
```

## Key Features

- Multi-channel concurrent playback
- Web dashboard with real-time stats
- Discord OAuth authentication
- Play tracking and statistics
- Audio caching system
- Automatic worker rotation (AFR)
- YouTube playlist support
- Interactive player controls
