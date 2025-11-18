# Jasper Music Bot 🐈‍⬛🎵

Jasper is a Discord music bot themed after a big black Persian cat.  
It plays music in voice channels using slash commands and YouTube search.

## Features

- Slash commands (no prefix commands needed)
- Play music from YouTube URLs or search keywords
- Queue system (view, skip, stop)
- Pause / resume
- Now playing
- Per‑guild music queues

## Tech Stack

- Node.js
- [discord.js](https://discord.js.org/) v14
- [@discordjs/voice](https://github.com/discordjs/voice)
- [play-dl](https://github.com/play-dl/play-dl) for YouTube streaming/search
- dotenv for environment variables

## Folder Structure

```text
jasper-music-bot/
├─ assets/
│  └─ logo.png
├─ config/
│  └─ config.js
├─ src/
│  ├─ commands/
│  │  ├─ help.js
│  │  ├─ now-playing.js
│  │  ├─ pause.js
│  │  ├─ play.js
│  │  ├─ queue.js
│  │  ├─ resume.js
│  │  ├─ skip.js
│  │  └─ stop.js
│  ├─ core/
│  │  ├─ logger.js
│  │  └─ musicPlayer.js
│  ├─ events/
│  │  ├─ interactionCreate.js
│  │  └─ ready.js
│  ├─ utils/
│  │  └─ embedFactory.js
│  ├─ deploy-commands.js
│  └─ index.js
├─ .env.example
├─ package.json
└─ README.md
```

## Setup

1. **Clone the repo** and install dependencies:

   ```bash
   npm install
   ```

2. **Create your `.env` file** from the example:

   ```bash
   cp .env.example .env
   ```

   Fill in:

   - `DISCORD_TOKEN` – your bot token
   - `CLIENT_ID` – application client ID
   - `GUILD_ID` – development guild ID for registering commands quickly

3. **Register slash commands** (run after every command change):

   ```bash
   npm run deploy:commands
   ```

4. **Start Jasper**:

   ```bash
   npm start
   ```

5. **Invite Jasper** to your server using the OAuth2 URL from the Discord Developer Portal
   with the `bot` and `applications.commands` scopes, and `Connect`, `Speak`,
   and `Use Slash Commands` permissions.

> ⚠️ Note: This code uses YouTube as a source via `play-dl`. Make sure your use
> complies with YouTube's Terms of Service and local laws.
