# Jasper Soundboard Plugin

A full-stack plugin that adds a customizable soundboard to Jasper. Users can upload sounds via the web dashboard and play them in voice channels using slash commands or a persistent UI.

## Features

- **Web Dashboard**: Upload, rename, and delete sound files (MP3/WAV).
- **Slash Commands**:
  - `/soundboard menu`: Open an ephemeral selection menu to play a sound.
  - `/soundboard play <sound>`: Play a specific sound directly (with autocomplete).
  - `/soundboard ui`: Post a permanent message with buttons for the top 25 sounds.
- **Concurrency Handling**: Supports multiple users playing sounds simultaneously (queued sequentially) without crashing the bot.
- **Spam Prevention**: Prevents "button mashing" by enforcing a 1-second cooldown after playing a sound.
- **Audio Mixing**: Can play sounds over existing music (pauses music, plays sound, resumes music).

## Commands

### `/soundboard menu`
Opens a private (ephemeral) dropdown menu to select and play a sound. This is useful for quickly browsing available sounds without disturbing the chat.

### `/soundboard play [sound]`
Directly plays a sound.
- **sound**: The name of the sound to play. Supports autocomplete search.

### `/soundboard ui`
Creates a permanent "Soundboard" message in the channel with interactive buttons for the top 25 sounds.
- Anyone in the voice channel can click these buttons to play sounds.
- Buttons are rate-limited per user to prevent spam.

## Technical Details

### Architecture
- **Backend**:
  - `index.ts`: Registers the plugin and global interaction handlers.
  - `commands/soundboard.ts`: Implements the slash command logic and button interaction handling.
  - `services/playback.ts`: Helper to resolve file paths and call the core `playAudio` API.
- **Frontend**:
  - `web/index.tsx`: React application for the dashboard page.
  - Uses `@jasper/hooks` to interact with the plugin storage and database.

### Data Storage
- **Sounds**: Stored in the plugin's scoped database (`context.db.plugin`).
- **Files**: Stored in the plugin's scoped storage directory (`context.storage`).
- **Stats**: Tracks play counts to determine "top sounds" for the UI.

### Concurrency
The plugin uses a **per-channel queue system** implemented in the core `PluginManager`.
1. When a sound is requested, it is added to a queue for that voice channel.
2. If the bot is already playing music, it pauses the music, creates a temporary connection for the sound, plays it, and then resumes the music.
3. If multiple sounds are requested, they play one after another.
4. The voice connection is only destroyed when the queue is empty and has been idle for 1 minute.
