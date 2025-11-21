# Jasper Music Bot - Agent Instructions

## 1. Project Overview
**Jasper** is a Discord music bot themed after a big black Persian cat. It is built with **Node.js** and **discord.js v14**.
Its core feature is high-quality audio streaming using **yt-dlp** (an external command-line tool) to bypass YouTube's restrictions, making it more resilient than bots using standard libraries like `ytdl-core`.

### Key Technologies
- **Runtime**: Node.js (v18+)
- **Module System**: ES Modules (`import`/`export`)
- **Framework**: discord.js v14
- **Voice Library**: @discordjs/voice
- **Audio Source**: `yt-dlp` (spawned as a child process)
- **Search**: `yt-search`
- **Architecture**: Multi-bot Worker Pool (supports multiple simultaneous voice channels)

## 2. Setup & Environment

### Prerequisites
- Node.js v18+
- FFmpeg (static binary usually handled by `ffmpeg-static` or system installed)
- **yt-dlp**: This is CRITICAL. The bot searches for a `yt-dlp` (or `yt-dlp.exe`) binary using a custom helper (`src/utils/yt-dlp-helper.js`), first checking the system's PATH, and then falling back to the project's **ROOT** directory.
- **Additional Worker Bots** (Optional): You can add additional worker bots by adding environment variables in the format `<NAME>_TOKEN=...` (e.g., `MISTY_TOKEN=...`). These will be automatically loaded and used to handle multiple voice channels simultaneously.

### Installation
1. `npm install`
   - **Note**: The `postinstall` script (`scripts/install-yt-dlp.js`) attempts to automatically download the correct `yt-dlp` binary for the OS.
   - If this fails, you must manually download `yt-dlp` and place it in the project root.
2. Create `.env` from `.env.example`:
   ```env
   DISCORD_TOKEN=...
   CLIENT_ID=...
   GUILD_ID=... (for dev command deployment)
   ```

### Running the Bot
- **Dev**: `npm run dev` (runs `src/index.js`)
- **Start**: `npm start`
- **Deploy Commands**: `npm run deploy:commands` (Run this after creating or modifying command definitions)

## 3. Architecture

### Directory Structure
```
Jasper/
├── src/
│   ├── commands/       # Slash command definitions (e.g., play.js, stop.js)
│   ├── config/         # Configuration (bots.js - Multi-bot setup)
│   ├── core/           # Core logic
│   │   ├── audio/      # Audio modules (queue-manager.js, playback-engine.js, stream-handler.js)
│   │   ├── ui/         # UI modules (player-controls.js)
│   │   ├── utils/      # Core utilities (voice-utils.js)
│   │   ├── music-player.js # Facade for audio logic
│   │   ├── worker-pool.js  # Worker bot management
│   │   └── logger.js       # Logging utility
│   ├── events/         # Event handlers (ready.js, interaction-create.js)
│   ├── utils/          # General utilities (yt-dlp-helper.js, embed-factory.js)
│   ├── deploy-commands.js # Script to register slash commands
│   └── index.js        # Entry point
├── scripts/            # Maintenance scripts (install-yt-dlp.js)
├── .env                # Environment variables
├── package.json
└── yt-dlp            # (Binary) Required for playback
```

### Core Components

#### 1. Entry Point (`src/index.js`)
- Initializes the `discord.js` Client.
- Dynamically loads commands from `src/commands` using `import()`.
- Dynamically loads events from `src/events` using `import()`.
- Logs in using `DISCORD_TOKEN`.

#### 2. Configuration (`src/config/bots.js`)
Defines the bot configuration for the Worker Pool:
- **Controller Bot**: Jasper (the main bot with slash commands) is defined with `DISCORD_TOKEN`.
- **Worker Bots**: Dynamically loaded from environment variables ending in `_TOKEN` (e.g., `MISTY_TOKEN`, `SHADOW_TOKEN`).
  - Each worker is automatically named based on the env var name.
  - Workers handle playback duties, allowing multiple simultaneous voice channels.

#### 3. Worker Pool (`src/core/worker-pool.js`)
Manages multiple bot instances to enable concurrent playback:
- **Bot Creation**: Creates discord.js Client instances for all configured bots.
- **Login Management**: Logs in the controller first, then all workers in parallel.
- **Worker Allocation**: Assigns workers to voice channels using a priority system:
  1. Reuse worker already in the target channel.
  2. Prioritize idle Controller (Jasper).
  3. Use any idle worker bot.
  4. Return null if all workers are busy.
- **State Tracking**: Maintains each worker's busy status, assigned guild, and voice channel.
- **Cleanup**: Releases workers when playback ends.

#### 4. Music Player (`src/core/music-player.js`)
This is the facade for the audio system. It orchestrates the following modules:
- **Queue Manager** (`src/core/audio/queue-manager.js`): Manages `Map<VoiceChannelId, QueueObject>` state.
- **Stream Handler** (`src/core/audio/stream-handler.js`): Handles `yt-dlp` process spawning and metadata fetching.
- **Playback Engine** (`src/core/audio/playback-engine.js`): Handles the `AudioPlayer`, event listeners, and "Now Playing" UI updates.
- **Player Controls** (`src/core/ui/player-controls.js`): Generates button components.
- **Voice Utils** (`src/core/utils/voice-utils.js`): Helper functions for voice status and validation.

#### 5. Commands (`src/commands/*.js`)
- Each file exports:
  - `data`: A `SlashCommandBuilder` instance.
  - `execute(interaction)`: The function called when the command is used.
  - `autocomplete(interaction)`: (Optional) Handles autocomplete requests (used in `play.js`).
- **Notable Commands**:
  - `play.js`: Supports both keyword search (with autocomplete) and direct YouTube URLs.
  - `playlist.js`: Supports adding YouTube playlists. Automatically truncates autogenerated playlists (e.g., "Mix - ...") to 50 songs for performance.
  - `catastrophic-reset.js`: Emergency command to clear all queues and reset all workers.
  - `music-status.js`: Displays the status of all bots in the cluster.

#### 6. Event Handlers (`src/events/*.js`)
- `ready.js`: Runs once when the bot connects.
- `interaction-create.js`: Routes interactions to the appropriate command or autocomplete handler.

#### 7. Utilities (`src/utils/*.js`)
- `yt-dlp-helper.js`: Encapsulates the logic for finding the `yt-dlp` binary on the system or in the project root.

## 4. Development Workflows

### Adding a New Command
1. Create a new file in `src/commands/` (e.g., `mycommand.js`).
2. Boilerplate (ESM):
   ```javascript
   import { SlashCommandBuilder } from "discord.js";

   export default {
     data: new SlashCommandBuilder()
       .setName("mycommand")
       .setDescription("Does something cool"),
     async execute(interaction) {
       await interaction.reply("Hello!");
     },
   };
   ```
3. Run `npm run deploy:commands` to register it with Discord.
4. Restart the bot.

### Modifying Audio Logic
- Edit `src/core/music-player.js` or its sub-modules in `src/core/audio/`.
- **Important**: `src/core/audio/stream-handler.js` handles the `yt-dlp` process spawning. Use `src/utils/yt-dlp-helper.js` to resolve the binary path.
- **Worker Pool**: Music player requests workers via `workerPool.allocateWorker()` before creating a queue. Always release workers with `workerPool.releaseWorker()` when done.
- **Queue Management**: The `queues` Map is keyed by `voiceChannelId` (not `guildId`) to support multiple channels per guild. Ensure you handle concurrency correctly.

### Handling Interactions
- If you add new UI components (buttons, select menus), handle them in the `interaction-create.js` event or within the command that spawned them (using a `ComponentCollector`).
- `playback-engine.js` currently uses a `ComponentCollector` on the "Now Playing" message to handle playback buttons.

## 5. Common Issues & Debugging

### "yt-dlp not found"
- **Cause**: The binary is missing from the root directory and system PATH.
- **Fix**: Run `npm run postinstall` or manually download `yt-dlp` and place it in the root.

### Audio Stops / 403 Errors
- **Cause**: YouTube has updated their anti-bot measures.
- **Fix**: Update the `yt-dlp` binary.
  - Stop the bot.
  - Replace the `yt-dlp` binary with the latest release.
  - Restart.

### Permissions
- The bot needs `Connect` and `Speak` permissions in voice channels.
- It needs `Send Messages` and `Embed Links` in text channels.
- It needs `Manage Channels` (or specific Voice Channel permissions) to update Voice Channel Status.
- **Worker Bots**: Each worker bot also needs `Connect` and `Speak` permissions. Ensure all worker bots are invited to your server.

## 6. Code Style
- **Format**: Standard JavaScript (ES Modules).
- **Imports**: Use `import` statements. File extensions (`.js`) are mandatory for local imports.
- **Async/Await**: Used extensively for Discord API calls and file I/O.
- **Logging**: Use `src/core/logger.js` instead of raw `console.log` where possible.

---
*Generated by Antigravity*
