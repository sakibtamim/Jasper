# My Music Plugin

The **My Music** plugin brings a personalized music experience to Jasper. It allows users to provide their own YouTube cookies (in Netscape format) to unlock personalized playback features like "My Mix" and access age-restricted content that their account has access to.

## Features

*   **Personalized Playback**: Play your YouTube "My Mix" or other personalized playlists.
*   **Cookie Management**: Securely store and manage multiple cookie profiles via Discord commands or the Web Dashboard.
*   **Per-User Isolation**: Your cookies are only used for your requests.

## Commands

### `/mymusic play [term] [profile]`
Plays music using one of your stored cookie profiles.
*   `term`: (Optional) Search term or URL. Defaults to "My Supermix" if omitted.
*   `profile`: (Optional) Name of the cookie profile to use. Defaults to the most recently used one.

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

> **Security Note**: Your cookies contain sensitive session data. Do not share them with others. This plugin stores them securely in the bot's database and only uses them for your requests.
