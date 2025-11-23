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

## Tech Stack

  - **Runtime:** Node.js (v18+)
  - **Language:** TypeScript (strict mode)
  - **Framework:** [discord.js](https://discord.js.org/) v14
  - **Audio Engine:** `yt-dlp` (via child process) + `@discordjs/voice`
  - **Search:** `yt-search`
  - **Dev Tooling:** tsx (TypeScript execution with hot-reloading)

## Prerequisites

Before installing, ensure you have:

1.  **Node.js** (v18 or higher) installed.
2.  **FFmpeg** (The bot attempts to use a static binary, but having it installed globally is recommended).
3.  **yt-dlp.exe** (Required for streaming).

## Installation

### 1\. Clone the Repository

```bash
git clone https://github.com/sakibtamim/Jasper.git
cd Jasper
```

### 2\. Install Dependencies

Install the required packages.

```bash
npm install
```

> **Note:** The project is written in TypeScript and requires compilation before running in production.

### 3\. ⚠️ yt-dlp (Downloader)

This bot **requires** the `yt-dlp` executable to function.

- When you run `npm install`, the postinstall script will attempt to automatically download the **latest** yt-dlp binary for your platform and place it in the project root.
- If you prefer to manage the binary manually (or you're offline), you can skip the automatic download by setting the `YT_DLP_SKIP_POSTINSTALL` environment variable before running `npm install`:

```bash
YT_DLP_SKIP_POSTINSTALL=1 npm install
```

If the postinstall script cannot download yt-dlp (e.g., no network), you can still install it manually:

1.  Go to the **[yt-dlp GitHub Releases](https://github.com/yt-dlp/yt-dlp/releases/latest)**.
2.  Download the executable for your system:
  * **Windows:** Download `yt-dlp.exe`.
  * **Linux/Mac:** Download `yt-dlp` (and run `chmod +x yt-dlp`).
3.  **Place the file in the ROOT folder** of this project (the same folder where `package.json` is).

**Folder Structure should look like this:**
```text
Jasper/
├── src/              # TypeScript source files
├── dist/             # Compiled JavaScript (generated by npm run build)
├── node_modules/
├── .env
├── tsconfig.json
├── package.json
└── yt-dlp.exe      <-- MUST BE HERE
```

### 4\. Configure Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Fill in your details in the `.env` file:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id_for_testing
```

### 5. Build the Project

Compile TypeScript to JavaScript:

```bash
npm run build
```

This will create a `dist/` directory with the compiled JavaScript files.

### 6. Deploy Commands

Register the slash commands with Discord (run this whenever you add new commands):

```bash
npm run deploy:commands
```

### 7. Start the Bot

**Development mode** (with hot-reloading):
```bash
npm run dev
```

**Production mode** (runs compiled JavaScript):
```bash
npm start
```

## Development

- **Dev Mode**: `npm run dev` - Runs TypeScript with hot-reloading using tsx
- **Build**: `npm run build` - Compiles TypeScript to JavaScript in `dist/`
- **Lint**: `npm run lint` - Runs ESLint with TypeScript rules
- **Deploy Commands**: `npm run deploy:commands` - Registers slash commands with Discord

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