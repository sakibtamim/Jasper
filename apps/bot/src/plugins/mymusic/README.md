# My Music Plugin

The **My Music** plugin brings a personalized music experience to Jasper. It allows users to provide their own YouTube cookies (in Netscape format) to unlock personalized playback features like "My Mix" and access age-restricted content that their account has access to.

## Features

*   **Personalized Playback**: Play your YouTube "My Mix" or other personalized playlists.
*   **Cookie Management**: Securely store and manage multiple cookie profiles via Discord commands or the Web Dashboard.
*   **Per-User Isolation**: Your cookies are only used for your requests.

## Commands

### `/mymusic search [term] [profile]`
Search YouTube and queue songs using your personalized cookie profile.
*   `term`: (Required) Search term or direct YouTube/Music URL. Can be a video, playlist, or search query.
*   `profile`: (Optional) Name of the cookie profile to use. Defaults to the most recently used one.
*   `limit`: (Optional) Max songs to queue from search results or playlists (default: 25, max: 50).
*   `radio`: (Optional) Set to `True` to generate a personalized "Mix" based on the first result (e.g., "Mix - Song Name").

**Examples:**
- `/mymusic search term:"lofi hip hop" limit:15` - Queues ~15 lofi search results
- `/mymusic search term:"jazz" radio:true limit:20` - Starts a jazz radio mix
- `/mymusic search term:"https://www.youtube.com/watch?v=..."` - Plays a specific video
- `/mymusic search term:"https://www.youtube.com/playlist?list=..."` - Queues a playlist

### `/mymusic supermix [profile]`
Plays your "My Supermix" - YouTube Music's personalized endless mix of songs tailored to your taste.
*   `profile`: (Optional) Name of the cookie profile to use.
*   `limit`: (Optional) Max songs to queue (default: 25, max: 50).

**Note:** Uses YouTube Music's `RDMM` playlist. Requires a valid, logged-in YouTube cookie.

### `/mymusic mix [number] [profile]`
Searches for one of your numbered "My Mix" playlists (1-7).
*   `number`: The mix number (1-7).
*   `profile`: (Optional) Name of the cookie profile to use.
*   `limit`: (Optional) Max songs to queue (default: 25, max: 50).

**Note:** These are user-specific playlists. Success depends on whether they appear in search results for your account.

### `/mymusic cookie add [file] [name]`
Adds a new cookie profile.
*   `file`: Upload your Netscape formatted cookie file (`.txt`).
*   `name`: (Optional) A name for this profile (e.g., "Premium", "Alt Account").

### `/mymusic cookie list`
Lists your stored cookie profiles and their usage stats.

### `/mymusic cookie delete [name]`
Deletes a stored cookie profile.

## Web Dashboard

This plugin adds a **My Music** section to the Jasper Dashboard settings.
*   **Manage Profiles**: Add, view, and delete cookie profiles with a user-friendly interface.
*   **Stats**: View play counts and last used dates for each profile.

## Setup: Getting your Cookie

To use this plugin, you need a YouTube cookie in Netscape format.

1.  Install a browser extension like **"Get cookies.txt LOCALLY"** (Chrome/Firefox).
2.  Log in to YouTube with the account you want to use.
3.  Open the extension and export your cookies for `youtube.com`.
4.  Copy the content of the exported file.
5.  Use `/mymusic cookie add` or the Web Dashboard to save it.

## How It Works

This plugin uses YT-DLP (YouTube Download Plus) extractors to access YouTube and YouTube Music features:

- **Search**: Uses `ytsearch<N>:` prefix to return N search results
- **Radio/Mix**: Creates personalized mixes using YouTube's `RD*` playlist patterns (e.g., `RD<video_id>`)
- **Supermix**: Accesses your personalized YouTube Music mix via the `RDMM` playlist ID
- **Cookie Authentication**: Your cookies provide access to personalized features, age-restricted content, and private playlists

For full technical details, see `YT-DLP_ANALYSIS.md`.

> **Security Note**: Your cookies contain sensitive session data. Do not share them with others. This plugin stores them securely in the bot's database and only uses them for your requests.
