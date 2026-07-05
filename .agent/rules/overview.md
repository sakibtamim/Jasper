---
trigger: model_decision
---

# 📖 Project Overview & Architecture

This document provides a cohesive reference for Jasper's technologies, project directory structure, core architectures, and development roadmap.

## 🛠️ Technology Stack

- **Runtime**: Node.js v24+ (ES Modules enabled).
- **Package Manager**: pnpm (with Turborepo monorepo workspaces).
- **Discord Bot**: `discord.js` v14, `@discordjs/voice`.
- **Audio Streaming**: `yt-dlp` (spawned as a child process stream), `yt-search`.
- **API Server**: Fastify (session cookies via `@fastify/cookie`, OAuth via `@fastify/oauth2`).
- **Web Dashboard**: React 18, Vite (dev server and build tool), Tailwind CSS.
- **Database Adapters**: Abstraction layer in `apps/bot/src/core/db/types.ts`.
    - **SQLite**: Local adapter using a lightweight file database.
    - **PostgreSQL**: Production adapter using the `pg` driver (Direct queries, **no Prisma ORM**).

## 🗺️ Workspace Structure Map

```
Jasper/
├── apps/
│   ├── bot/                # Discord bot & Fastify API server
│   │   ├── src/
│   │   │   ├── commands/   # Slash command definitions
│   │   │   ├── api/        # Fastify router & OAuth endpoints
│   │   │   ├── core/       # Music Player, DB adapters, Worker Pool
│   │   │   └── plugins/    # Manifest-based pluggable extensions
│   │   └── scripts/        # yt-dlp installer and plugin helpers
│   └── web/                # React dashboard (Vite + Tailwind)
│       ├── components/     # UI elements
│       └── pages/          # Web dashboard views
└── packages/               # Shared Workspace Packages
    ├── ui/                 # Core React UI primitives (Button, Table, Card)
    ├── elements/           # Shared plugin components and registries
    ├── hooks/              # Shared React hooks (auth, plugin context)
    └── types/              # Unified TypeScript interface definitions
```

## 🏗️ Architecture Details

### 1. Multi-Cat Worker Pool & AFR

- **Controller (Jasper)**: Listens for slash commands, manages worker assignments, and coordinates events. Never handles audio playback directly.
- **Worker Bots**: Spawned dynamically from environment variables ending in `_TOKEN` (e.g., `MISTY_TOKEN`). Each handles one voice channel.
- **AFR (Automatic Feline Rotation)**: Allocates workers. Weighted random selection handles new channels, while reuse logic assigns workers already in the target channel.

### 2. Audio Pipeline

- **Music Player**: Facade orchestrating Queue Manager, Stream Handler (`yt-dlp`), and Playback Engine.
- **Queue Manager**: State-safe queues keyed by `voiceChannelId` (enables multi-channel audio within the same Discord guild).
- **Stream Handler**: Spawns `yt-dlp` processes for audio playback and metadata fetching (truncates auto-generated playlists at 50 songs).

### 3. Database & Encryption

- Adapters translate unified types like `PlayRecord` and `User` to database rows. Date fields fetched from SQLite must be explicitly parsed: `new Date(row.date)`.
- OAuth tokens are encrypted at rest using AES-256-GCM (`apps/bot/src/utils/encryption.ts`). Format: `salt:iv:authTag:encrypted`.

---

## 🗺️ Roadmap & Priorities

- [ ] **Test Coverage**: Unit tests for `QueueManager` state, `WorkerPool` AFR logic, and database adapters.
- [ ] **Real-Time Data**: Transition web dashboard from polling to WebSocket updates.
- [ ] **Security**: Rate limiting on API endpoints, CSRF protection, and token refresh logic.
- [ ] **Audio Enhancements**: Audio equalizer/filters, queue persistence across restarts.
