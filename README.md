<p align="center">
  <img src="./assets/banner/jasper_header_1200.webp" alt="Jasper — The Purrfect Discord Music & Utility Bot" width="100%">
</p>

# Jasper Music Bot 🐈‍⬛🎵

Jasper is a robust Discord music bot themed after a big black Persian cat.
It uses **yt-dlp** (an external command-line tool) to stream high-quality audio, making it highly resilient to YouTube's frequent anti-bot updates.

## Features

- **Stable Streaming:** Uses `yt-dlp` to bypass 403 Forbidden errors and "Decipher" issues.
- **Slash Commands:** Modern, easy-to-use interface.
- **Reliable Search:** Uses `yt-search` for accurate video results.
- **Direct URL Support:** Plays YouTube links directly, skipping search.
- **Queue System:** View, skip, stop, and manage music queues per server.
- **Autoplay:** Automatically finds and plays related songs when the queue ends.
- **Voice Status Updates:** Updates the voice channel status to show the currently playing song.
- **Now Playing:** Shows rich embeds with video thumbnails, duration, and interactive controls.
- **Multi-Client Support:** "One Mind, Many Bodies" architecture allows multiple bots (Jasper + Workers) to play music simultaneously in different channels of the same server.
- **Automatic Feline Rotation (AFR):** 🆕 Smart, probabilistic bot selection with configurable Jasper presence and unique entry messages for each cat!
- **Database & Statistics:** 🆕 Tracks song plays, user activity, and global stats using SQLite (default) or PostgreSQL.
- **Plugin System:** 🆕 Extend functionality with custom commands, hooks, and web routes. See [PLUGINS.md](PLUGINS.md).
- **Web Dashboard:** Real-time monitoring of queues, workers, and statistics.

## Sponsorship & Licensing

This project is classified under the **Purrfect Universe Licensing Directive** as:

**🟧 Company-Supported Personal IP (CSP-IP)**
A category for employee-created projects that are:

- Built by the employee as their personal intellectual property
- Actively supported, enhanced, or resourced by **Purrfect Software Limited**
- Strategically aligned with the broader **Purrfect Universe** ecosystem
- Recognized as dual-heritage work belonging to the creator and the company

Under this classification:

- **Primary Author:** **Nazmus Sakib Tamim** The employee developer (repo owner, original creator & maintainer)
- **Strategic Stewardship:** **Arafat Zahan** — Universe Architect & PU Founder
- **Support:** **Purrfect Software Limited** — Engineering, DevOps & Infrastructure
- **Usage Rights:** Community-friendly, zero-penalty experimentation encouraged
- **Disclosure:** Reuse, forks, or derivative tools should mention this CSP-IP origin

This ensures the project remains open, resilient, supported, and future-proof while preserving individual authorship and PU-aligned governance.

<p align="center">
  <img src="./assets/badges/mit_shields_pu_mm.svg" height="32" alt="MIT License" />
  &nbsp;&nbsp;
  <img src="./assets/badges/cspip_psl_badge.svg" height="32" alt="CSP-IP Certified" />
</p>

## Commands

| Command               | Description                                     |
| :-------------------- | :---------------------------------------------- |
| `/play <query>`       | Play a song from YouTube or search by keywords. |
| `/p <query>`          | Alias for `/play`.                              |
| `/playnext <query>`   | Add a song to the top of the queue.             |
| `/playnow <query>`    | Skip current song and play this immediately.    |
| `/playlist <url>`     | Play a YouTube playlist.                        |
| `/pl <url>`           | Alias for `/playlist`.                          |
| `/radio`              | 🆕 Play random songs from the local cache.      |
| `/pause`              | Pause the current song.                         |
| `/resume`             | Resume the paused song.                         |
| `/skip`               | Skip the current song.                          |
| `/stop`               | Stop playback and clear the queue.              |
| `/queue`              | Show the current music queue.                   |
| `/nowplaying`         | Show the currently playing song.                |
| `/autoplay`           | Toggle autoplay on/off.                         |
| `/music-status`       | Check the status of all music workers.          |
| `/cache-status`       | View cache statistics and storage usage.        |
| `/catastrophic-reset` | Emergency command to reset all bots and queues. |
| `/help`               | Show this help message.                         |

## Multi-Client Architecture (Heavenly Council of Fur)

Jasper supports a unique **Controller + Worker** architecture.

- **Jasper (Controller):** The main bot you interact with via Slash Commands (`/play`, `/stop`).
- **Workers (Misty, Tuki, etc.):** Additional bot accounts that handle the actual audio playback.

**How it works:**

1. You send a command to Jasper: `/play song`.
2. With **Automatic Feline Rotation (AFR)**, Jasper has a 50% chance of joining your channel himself.
3. The other 50% of the time, he'll summon a random **Worker Bot** (e.g., Misty or Tuki) to handle the music.
4. Each cat announces their arrival with unique, randomized messages! 🐾
5. This allows multiple voice channels to have music simultaneously, all controlled via Jasper!

### Configuration

To enable this, add tokens for your worker bots in the `.env` file:

```env
# Main Controller
DISCORD_TOKEN=...

# Worker Bots (Add as many as you like)
MISTY_TOKEN=...
TUKI_TOKEN=...
JAFREEN_TOKEN=...

# Announcement Channel (Optional)
ANNOUNCE_CHANNEL_ID=...
```

**Permissions:**
Ensure ALL worker bots are invited to your server and have the following permissions in the voice channels:

- `Connect`
- `Speak`

## Automatic Feline Rotation (AFR)

🆕 **AFR** is a smart bot selection system that adds variety and personality to your music experience!

### What is AFR?

Instead of always using Jasper or following a fixed order, AFR probabilistically selects which cat joins your voice channel:

- **50% chance:** Jasper himself joins (default behavior)
- **50% chance:** A random worker bot (Misty, Tuki, etc.) is selected
- **Unique Entry Messages:** Each cat announces their arrival with personalized, randomized messages

### Configuration

You can customize Jasper's appearance probability by adding to your `.env` file:

```env
# AFR Configuration (optional)
AFR_JASPER_WEIGHT=0.5  # Default: 0.5 (50% chance)
```

**Weight Options:**

- `0.5` (default) - Balanced 50/50 split between Jasper and workers
- `1.0` - Jasper always joins when available (classic behavior)
- `0.0` - Workers always selected, Jasper never joins
- `0.75` - Jasper has 75% chance, workers 25%

### Entry Messages

Each cat has their own personality:

- **Jasper:** "🐾 **Jasper** has arrived, ready to drop some purrfect beats!"
- **Misty:** "🌫️ **Misty** emerges from the fog to bless your ears!"
- **Tuki:** "🔮 **Tuki** arrives with mystical melodies!"
- **Jafreen:** "🎭 **Jafreen** takes the stage!"
- **Other Workers:** Generic messages with their names

> **Note:** Entry messages only appear when a bot first joins, not when reusing an existing connection.

## Caching System (Optional)

🆕 **Jasper now supports optional caching** to improve performance and reduce bandwidth usage!

### What is the Caching System?

The caching system stores:

1. **Search Results**: YouTube search results for `/play` commands
2. **Audio Files**: Downloaded audio files mapped to video IDs

This means:

- Repeated songs play **instantly** without re-downloading
- **Reduced bandwidth** usage on your server
- **Faster response times** for popular requests
- **Less dependency** on YouTube API availability

### ⚡ Visual Feedback

When a song is played from the cache, you'll see **double lightning bolts** (⚡⚡) in the response:

- **Added to queue:** `⚡⚡ ✅ **Jasper** added to queue...`
- **Now Playing:** `⚡⚡ ▶️ **Jasper** is now playing...`

This gives you immediate confirmation that the system is working and saving bandwidth!

### Configuration

To enable caching, add to your `.env` file:

```env
# Enable Caching
CACHE_ENABLED=true

# Optional: Customize cache lifetimes
CACHE_SEARCH_TTL_HOURS=168      # 7 days (default)
CACHE_AUDIO_TTL_HOURS=72        # 3 days (default)
CACHE_CLEANUP_INTERVAL_HOURS=1  # 1 hour (default)
```

### Performance Impact Analysis

#### ✅ Benefits

- **Bandwidth**: 90-95% reduction for repeated songs
- **Response Time**: 2-5s faster for cached songs (no download wait)
- **Reliability**: Works offline for cached songs if YouTube is down
- **First Play**: No delay thanks to async write optimization (streams from memory while writing to disk)

#### ⚠️ Tradeoffs

- **Disk Space**: ~5-10MB per cached song (high quality)
    - Example: 100 cached songs ≈ 500MB-1GB
    - Automatically cleaned up based on TTL every hour (configurable)
- **Memory**: Minimal (~5-15MB for in-memory buffers + search cache metadata)

#### 📊 Recommended Settings by Use Case

**Small Server (1-10 users):**

```env
CACHE_AUDIO_TTL_HOURS=24    # 1 day
```

Expected disk usage: 100-500MB

**Medium Server (10-50 users):**

```env
CACHE_AUDIO_TTL_HOURS=72    # 3 days (default)
```

Expected disk usage: 500MB-2GB

**Large Server (50+ users):**

```env
CACHE_AUDIO_TTL_HOURS=168   # 7 days
```

Expected disk usage: 2-5GB

### Monitoring

Cache statistics are logged on bot startup and during cleanup:

```
[Cache] Audio cache: 42 files, 387MB
[Cache] Search cache: 156 entries
[Cache] Cleaned up 3 expired files (28MB freed)
```

## Database & Statistics

🆕 **Jasper now tracks listening history and statistics!**

### Troubleshooting

- **yt-dlp Issues:** If you encounter "Sign in to confirm you’re not a bot" errors, please refer to our [Cookie Management & Troubleshooting Guide](./YT-DLP_TROUBLESHOOTING.md).
- **Database:** Ensure your database (SQLite or Postgres) is correctly configured in `.env`.

### Supported Databases

1.  **SQLite (Default):** Zero-configuration, stores data in `data/jasper.db`. Perfect for small servers and development.
2.  **PostgreSQL:** Recommended for production and large servers.

### Configuration

To use PostgreSQL, add these to your `.env` file:

```env
# Database Configuration
DB_TYPE=postgres
DATABASE_URL=postgresql://user:password@localhost:5432/jasper_db
```

If `DB_TYPE` is not set or set to `sqlite`, it defaults to SQLite.

### Viewing Statistics

Statistics are displayed on the **Web Dashboard** (see below).

- **Top Songs:** Most played tracks.
- **Top Listeners:** Users with the most playtime.
- **Global Stats:** Total plays and duration across the server.

## Web Dashboard (Opt-in)

🆕 **Jasper now includes a real-time Web UI** for monitoring the bot's status!

### Features

- **Heavenly Council:** View status of all worker bots (Idle/Busy/Offline).
- **Active Queues:** See what's playing in every channel.
- **Cache Stats:** Monitor storage usage and cache hits.
- **Activity Logs:** Real-time stream of bot activities.

### Enabling the Dashboard

The Web UI is **opt-in**. To enable it, you must set the `PORT` environment variable in your `.env` file:

```env
# Web Server Port (Required to enable Web UI)
PORT=3000
```

Once enabled, start the bot and visit:
👉 **http://localhost:3000** (or your server's IP)

## Tech Stack

- **Runtime:** Node.js (v18+)
- **Language:** TypeScript (strict mode)
- **Architecture:** Monorepo (Turborepo + pnpm/pnpm workspaces)
- **Bot Framework:** [discord.js](https://discord.js.org/) v14
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Audio Engine:** `yt-dlp` (via child process) + `@discordjs/voice`
- **Search:** `yt-search`
- **Dev Tooling:** tsx, Turbo

## Prerequisites

Before installing, ensure you have:

1.  **Node.js** (v18 or higher) installed.
    - **Note:** Node.js is also used by yt-dlp for JavaScript execution during YouTube extraction.
2.  **FFmpeg** (The bot attempts to use a static binary, but having it installed globally is recommended).
3.  **yt-dlp.exe** (Required for streaming).

## Installation

### Quick Start

The fastest way to get started is by running the interactive quick-setup script:

```bash
pnpm quick-start
```

This script will verify your Node/pnpm versions, install all dependencies, copy and update your `.env` configuration file, generate cryptographically secure keys for the Web UI, and verify the `yt-dlp` binary.

### Manual Installation

If you prefer to set up the project manually:

### 1\. Clone the Repository

```bash
git clone https://github.com/sakibtamim/Jasper.git
cd Jasper
```

### 2\. Install Dependencies

Install the required packages.

```bash
pnpm install
```

> **Note:** The project is written in TypeScript and requires compilation before running in production.

### 3\. ⚠️ yt-dlp (Downloader)

This bot **requires** the `yt-dlp` executable to function.

- When you run `pnpm install`, the postinstall script will attempt to automatically download the **latest** yt-dlp binary for your platform and place it in the project root.
- It detects the root directory by looking for `turbo.json` or `pnpm-workspace.yaml`.
- In production, this is explicitly triggered via `pnpm run postinstall` during deployment.
- If you prefer to manage the binary manually (or you're offline), you can skip the automatic download by setting the `YT_DLP_SKIP_POSTINSTALL` environment variable before running `pnpm install`:

```bash
YT_DLP_SKIP_POSTINSTALL=1 pnpm install
```

If the postinstall script cannot download yt-dlp (e.g., no network), you can still install it manually:

1.  Go to the **[yt-dlp GitHub Releases](https://github.com/yt-dlp/yt-dlp/releases/latest)**.
2.  Download the executable for your system:

- **Windows:** Download `yt-dlp.exe`.
- **Linux/Mac:** Download `yt-dlp` (and run `chmod +x yt-dlp`).

3.  **Place the file in the ROOT folder** of this project (the same folder where `package.json` is).

**Folder Structure should look like this:**

```text
Jasper/
├── apps/
│   ├── bot/          # Discord bot (Node.js)
│   └── web/          # React Dashboard (Vite)
├── packages/         # Shared packages (@jasper/ui, etc.)
├── node_modules/
├── .env
├── package.json
├── turbo.json (or pnpm-workspace.yaml)
└── yt-dlp.exe        <-- MUST BE HERE (Root)
```

### 4\. Configure Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Fill in your details in the `.env` file:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id
GUILD_ID=your_guild_id_for_testing
```

> **Note:** See [ENV.md](ENV.md) for complete documentation of all environment variables.

### 5. Build the Project

Compile TypeScript to JavaScript:

```bash
pnpm run build
```

This will create a `dist/` directory with the compiled JavaScript files.

### 6. Deploy Commands

Register the slash commands with Discord (run this whenever you add new commands):

```bash
pnpm run deploy:commands
```

### 7. Start the Bot

**Development mode** (with hot-reloading):

```bash
pnpm run dev
```

**Production mode** (runs compiled JavaScript):

```bash
pnpm start
```

## Development

- **Dev Mode**: `pnpm run dev` - Runs TypeScript with hot-reloading using tsx
- **Build**: `pnpm run build` - Compiles TypeScript to JavaScript in `dist/`
- **Lint**: `pnpm run lint` - Runs ESLint with TypeScript rules
- **Deploy Commands**: `pnpm run deploy:commands` - Registers slash commands with Discord

## Deployment

The bot is deployed using GitHub Actions and PM2.
For detailed instructions on how to deploy, server requirements, and configuration, please refer to the [Deployment Guide](DEPLOY.md).

## Maintenance

**If music stops working:**
YouTube frequently updates their website, which can break the downloader. Because we use `yt-dlp`, fixing this is usually easy:

1.  Stop the bot.
2.  Download the **latest** `yt-dlp` executable from their [GitHub](https://www.google.com/search?q=https://github.com/yt-dlp/yt-dlp/releases/latest).
3.  Replace the old `yt-dlp.exe` in your project folder with the new one.
4.  Restart the bot.

## License

MIT

### 🛡️ ICARO-42/B ORDINANCE — COMPLIANCE NOTICE

This project is distributed under the MIT License — designed for maximum freedom, remixability, and interstellar interoperability.

Under the Interstellar Code Appropriation & Redistribution Ordinance (ICARO-42/B),
reuse, modification, and redistribution are fully permitted. Creative divergence is
not a violation — it is an expected evolutionary pathway.

If your fork, derivative, or remix contributes something meaningful to any corner
of the universe, a small nod of acknowledgment helps maintain cosmic symmetry.
Not required. Always appreciated.

<p align="center">
  <img src="./assets/seal/icaro-42_b-seal-512.webp" width="25%" />
</p>
