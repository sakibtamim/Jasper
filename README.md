# Jasper Music Bot 🐈‍⬛🎵

Jasper is a robust Discord music bot themed after a big black Persian cat.
It uses **yt-dlp** (an external command-line tool) to stream high-quality audio, making it highly resilient to YouTube's frequent anti-bot updates.

## Features

  - **Stable Streaming:** Uses `yt-dlp` to bypass 403 Forbidden errors and "Decipher" issues.
  - **Slash Commands:** Modern, easy-to-use interface.
  - **Reliable Search:** Uses `yt-search` for accurate video results.
  - **Queue System:** View, skip, stop, and manage music queues per server.
  - **Now Playing:** Shows rich embeds with video thumbnails and duration.

## Tech Stack

  - **Runtime:** Node.js (v18+)
  - **Framework:** [discord.js](https://discord.js.org/) v14
  - **Audio Engine:** `yt-dlp` (via child process) + `@discordjs/voice`
  - **Search:** `yt-search`

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

> **Note for developers:** If you are updating from an older version, ensure you have removed `play-dl` and installed `yt-search`:
> `npm uninstall play-dl`
> `npm install yt-search`

### 3\. ⚠️ Download yt-dlp (Crucial Step)

This bot **requires** the `yt-dlp` executable to function. It is NOT installed by npm.

1.  Go to the **[yt-dlp GitHub Releases](https://www.google.com/search?q=https://github.com/yt-dlp/yt-dlp/releases/latest)**.
2.  Download the executable for your system:
      * **Windows:** Download `yt-dlp.exe`.
      * **Linux/Mac:** Download `yt-dlp` (and run `chmod +x yt-dlp`).
3.  **Place the file in the ROOT folder** of this project (the same folder where `package.json` is).

**Folder Structure should look like this:**

```text
Jasper/
├── src/
├── node_modules/
├── .env
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

### 5\. Deploy Commands

Register the slash commands with Discord (run this whenever you add new commands):

```bash
npm run deploy:commands
```

### 6\. Start the Bot

```bash
npm start
```

## Maintenance

**If music stops working:**
YouTube frequently updates their website, which can break the downloader. Because we use `yt-dlp`, fixing this is usually easy:

1.  Stop the bot.
2.  Download the **latest** `yt-dlp` executable from their [GitHub](https://www.google.com/search?q=https://github.com/yt-dlp/yt-dlp/releases/latest).
3.  Replace the old `yt-dlp.exe` in your project folder with the new one.
4.  Restart the bot.

## License

MIT