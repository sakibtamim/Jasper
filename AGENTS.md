# Jasper Music Bot - Agent Instructions

## 1. Project Overview
**Jasper** is a Discord music bot themed after a big black Persian cat. It is built with **Node.js** and **discord.js v14**.
Its core feature is high-quality audio streaming using **yt-dlp** (an external command-line tool) to bypass YouTube's restrictions, making it more resilient than bots using standard libraries like `ytdl-core`.

### Key Technologies
- **Runtime**: Node.js (v18+)
- **Framework**: discord.js v14
- **Voice Library**: @discordjs/voice
- **Audio Source**: `yt-dlp` (spawned as a child process)
- **Search**: `yt-search`

## 2. Setup & Environment

### Prerequisites
- Node.js v18+
- FFmpeg (static binary usually handled by `ffmpeg-static` or system installed)
- **yt-dlp**: This is CRITICAL. The bot expects a `yt-dlp` (or `yt-dlp.exe`) binary in the **ROOT** directory.

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
│   ├── core/           # Core logic (MusicPlayer, Logger)
│   ├── events/         # Event handlers (ready, interactionCreate)
│   ├── utils/          # Utility functions
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
- Loads commands from `src/commands` into `client.commands`.
- Loads events from `src/events`.
- Logs in using `DISCORD_TOKEN`.

#### 2. Music Player (`src/core/musicPlayer.js`)
This is the heart of the bot. It manages:
- **Queues**: A `Map<GuildId, QueueObject>` stores the state for each server.
- **Playback**: Spawns `yt-dlp` processes to stream audio data into an FFmpeg-compatible stream for Discord.
- **Controls**: Handles Play, Pause, Resume, Skip, Stop.
- **Autoplay**: Automatically finds related songs when the queue ends.
- **UI**: Attaches interactive buttons (Pause, Skip, Stop) to the "Now Playing" message.

#### 3. Commands (`src/commands/*.js`)
- Each file exports:
  - `data`: A `SlashCommandBuilder` instance.
  - `execute(interaction)`: The function called when the command is used.
  - `autocomplete(interaction)`: (Optional) Handles autocomplete requests (used in `play.js`).

#### 4. Event Handlers (`src/events/*.js`)
- `ready.js`: Runs once when the bot connects.
- `interactionCreate.js`: Routes interactions to the appropriate command or autocomplete handler.

## 4. Development Workflows

### Adding a New Command
1. Create a new file in `src/commands/` (e.g., `mycommand.js`).
2. Boilerplate:
   ```javascript
   const { SlashCommandBuilder } = require("discord.js");

   module.exports = {
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
- Edit `src/core/musicPlayer.js`.
- **Important**: This file handles the `yt-dlp` process spawning. If you change arguments to `yt-dlp`, ensure they are compatible with streaming to stdout (`-o -`).
- **Queue Management**: The `queues` Map is global within the module. Ensure you handle concurrency correctly (e.g., checking if a queue exists before accessing it).

### Handling Interactions
- If you add new UI components (buttons, select menus), handle them in the `interactionCreate` event or within the command that spawned them (using a `ComponentCollector`).
- `musicPlayer.js` currently uses a `ComponentCollector` on the "Now Playing" message to handle playback buttons.

## 5. Common Issues & Debugging

### "yt-dlp not found"
- **Cause**: The binary is missing from the root directory.
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

## 6. Code Style
- **Format**: Standard JavaScript (CommonJS).
- **Async/Await**: Used extensively for Discord API calls and file I/O.
- **Logging**: Use `src/core/logger.js` instead of raw `console.log` where possible.

---
*Generated by Antigravity*
