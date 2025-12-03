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
### `/mymusic search`
Search for music and queue songs using your personalized cookie.
- `term` (required): Search query or URL
- `profile` (optional): Cookie profile to use (autocomplete enabled)
- `limit` (optional): Maximum songs to queue (default: 25, max: 50)
- `radio` (optional): Generate a radio mix from the first result

**Behavior:**
- Without `radio`: Queues up to N tracks from search results
- With `radio=true`: Finds first video → generates RD<videoId> mix playlist

### `/mymusic supermix`
Play your personalized "My Supermix" (formerly Your Mix).
- `profile` (optional): Cookie profile to use (autocomplete enabled)
- `limit` (optional): Maximum songs to queue (default: 25, max: 50)

**Note:** Uses YouTube Recommended Feed (:ytrec) for reliable personalization.
Requires authenticated cookie (LOGIN_INFO + SAPISID).

### `/mymusic mix`
Play one of your numbered "My Mix" playlists (1-7).
- `number` (required): Mix number (1-7)
- `profile` (optional): Cookie profile to use (autocomplete enabled)
- `limit` (optional): Maximum songs to queue (default: 25, max: 50)

**Note:** Uses search-based heuristic since numbered mixes lack direct playlist IDs.

### `/mymusic recommended`
Play your personalized recommended tracks.
- `profile` (optional): Cookie profile to use (autocomplete enabled)
- `limit` (optional): Maximum songs to queue (default: 25, max: 50)

**Note:** User-friendly command for recommendations based on your listening history.

### `/mymusic feed`
[Debug] Test your personalized homepage feed.
- `profile` (optional): Cookie profile to use (autocomplete enabled)
- `limit` (optional): Maximum songs to queue (default: 25, max: 50)

**Note:** Testing command for debugging personalization. Same implementation as `recommended`.

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

## Technical Details

This plugin uses `yt-dlp` for YouTube/Music integration, supporting:

- **Search Patterns:** `ytsearchN:<query>` for N results (max 50, default 15)
- **Feed Extractors:** `:ytrec` (recommendations), `:ytsubs`, `:ythistory`, `:ytfav`
- **Mix Playlists:** RD<videoId> (video-based mixes)
- **Authentication:** Netscape cookie format with LOGIN_INFO + SAPISID
- **Multi-Track Queuing:** Core stream handler conditionally skips `--flat-playlist`

### Cookie Requirements

For personalized features to work, your cookie must include:
- `LOGIN_INFO` - Indicates logged-in status
- `SAPISID` or `__Secure-*PAPISID` - Authentication tokens
- `SOCS=CAI` - Consent (auto-injected by core)

The plugin validates cookies on upload and marks profiles as `suspected_broken` if critical cookies are missing.

### Command Behavior

**Search (`radio=false`):**
- Uses `ytsearchN:<term>` where N = min(limit, 50)
- Returns multiple video entries for queuing

**Search (`radio=true`):**
- Resolves first search result
- Builds `https://www.youtube.com/watch?v=<id>&list=RD<id>` mix URL
- Queues tracks from the generated mix playlist

**Supermix:**
- Uses `:ytrec` (YouTube Recommended Feed) instead of RDMM
- RDMM playlists are unviewable; :ytrec provides reliable recommendations
- Personalized based on watch history, likes, subscriptions

**Mix (Numbered):**
- Uses search→radio pattern: `ytsearch1:My Mix N` → RD<videoId>
- Heuristic approach since numbered mixes lack direct playlist IDs

**Recommended & Feed:**
- Both use `:ytrec` for personalized tracks
- `recommended` is user-facing, `feed` is for debugging

### Profile Health Tracking

Profiles have `status` and `lastError` fields:
- `status: 'valid'` - Cookie passed validation
- `status: 'suspected_broken'` - Missing auth cookies or auth failures
- `lastError` - Human-readable error message

Web dashboard displays health status without exposing cookie content.

For complete technical specification, see `YT-DLP_ANALYSIS.md`.

> **Security Note**: Your cookies contain sensitive session data. Do not share them with others. This plugin stores them securely in the bot's database and only uses them for your requests.
