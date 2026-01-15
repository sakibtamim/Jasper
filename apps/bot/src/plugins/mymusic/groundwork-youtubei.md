# YouTube.js Groundwork & Strategy

**Status**: Draft
**Context**: MyMusic Plugin Discovery Engine
**Date**: 2025-12-07

## 1. Executive Summary

Our current implementation of `youtubei.js` in `discovery-engine.ts` is likely suffering from **client misconfiguration** and **lack of bot-detection mitigation**. While the library is powerful, it requires specific setup to behave like a legitimate YouTube Music client, especially for personalized feeds (Supermix, Mixes).

Key identified issues:
1.  **Wrong Client Type**: We are initializing the default `WEB` client but expecting `MUSIC` (YouTube Music) behaviors.
2.  **Missing PO Token**: We lack `po_token` (Proof of Origin), which is now critical for avoiding throttling and 403 errors.
3.  **Session Shortcuts**: Usage of `generate_session_locally: true` bypasses remote sanity checks and can lead to sessions that look "fake" to YouTube.

## 2. Configuration Analysis

### 2.1. Client Type (`client_type`)

**Current**: Default (`WEB`).
**Required**: `ClientType.MUSIC` (mapped to `WEB_REMIX` internally).

YouTube Music endpoints (`music.*`) behave most reliably when the session is initialized explicitly as a Music client. Using the general `WEB` client and accessing `music` props is supported but can lead to inconsistent parsing (e.g., `getHomeFeed` returning generic video info instead of music-specific nodes).

**Recommendation**:
Initialize `Innertube` specifically for music operations:
```typescript
import { Innertube, ClientType } from 'youtubei.js';

const yt = await Innertube.create({
    client_type: ClientType.MUSIC, // CRITICAL for MyMusic
    // ...
});
```
*Note: If we need general video search too, we should maintain two instances or use the generic one for specific fallbacks.*

### 2.2. Proof of Origin (`po_token`)

**Current**: Missing.
**Required**: Valid `po_token` string.

YouTube's BotGuard/DroidGuard system actively blocks requests without a valid `po_token`, or serves restricted results (e.g., stopping playback, empty searches).

**Recommendation**:
We must inject a `po_token`. Since `youtubei.js` cannot generate this solely by itself without a challenging environment (it needs a browser-like environment to run the challenge), we should:
1.  **Short term**: Allow passing `po_token` via env var or config, generated externally (e.g. via `youtube-po-token-generator`).
2.  **Long term**: Integrate a generation service.

### 2.3. Session Generation

**Current**: `generate_session_locally: true`.
**Required**: `generate_session_locally: false` (or carefully tested).

Local generation is fast but skips fetching the latest `innertube_context` from YouTube. If YouTube updates their client context versions, our local generator might produce outdated headers, flagging us as a bot.

**Recommendation**:
Set `generate_session_locally: false` to ensure we get a pristine, valid session from YouTube servers on startup. It costs ~1s of latency but vastly improves stability.

## 3. Cookie Strategy

Our `cookie-manager.ts` correctly handles Netscape-to-Header conversion. However, for `youtubei.js`:
-   **Field Requirements**: `SOCS`, `SAPISID`, `__Secure-3PAPISID`, and `LOGIN_INFO` are the heavy hitters for auth.
-   **Rotation**: Cookies *will* die. We need a way to detect "Soft Death" (empty results) vs "Hard Death" (403s).

**Action**:
-   Implement a "Cookie Health Check" that runs `yt.getGuide()` or `yt.account.getInfo()` on startup. If it fails, mark the cookie as invalid immediately.

## 4. Implementation Plan

The following changes should be applied to `discovery-engine.ts`.

### Step 1: Update `getInnertube` Configuration

Modify the factory method to accept a `clientType` parameter and apply the new config:

```typescript
// Define interfaces
interface DiscoveryOptions {
    cookie: string;
    clientType?: ClientType; // Default to MUSIC
    poToken?: string;
}

// In DiscoveryEngine
const yt = await Innertube.create({
    cookie: options.cookie,
    client_type: ClientType.MUSIC, // Enforce Music client
    generate_session_locally: false, // Ensure valid remote session
    device_category: 'DESKTOP', // Explicitly look like a desktop browser
    po_token: process.env.YOUTUBE_PO_TOKEN, // Add this env var support
    retrieve_player: false, // Keep false for speed, unless we need deciphering
});
```

### Step 2: Split Discovery Modes

Separate "Music Discovery" (Mixes, Supermix, Music Search) from "General Discovery" (YouTube Video Search).

-   **Music Context**: Use `ClientType.MUSIC`.
-   **Video Context**: Use `ClientType.WEB`.

### Step 3: Result Parsing Safety

YouTube Music returns different node types (`MusicResponsiveListItem`, `MusicTwoRowItem`) compared to standard YouTube (`Video`, `CompactVideo`).
Our extraction logic needs to be robust against these specific types.

**Fix**: Update `extractItems` to explicitly look for `item_type` properties available in Music responses.

### Step 4: Debugging & Validation

We should keep `saveDebugResponse` but enhance it to strip sensitive info automatically.
Also, add a "Connectivity Test" script that:
1.  Connects with provided cookie.
2.  Prints `client_name` and `client_version` being used.
3.  Attempts to fetch `getHomeFeed()`.
4.  Reports success/failure.

## 5. Troubleshooting Guide

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| **Empty Results** | Wrong Client Type or Geo-blocking | Switch to `ClientType.MUSIC`; Check server IP/Location settings. |
| **403 Forbidden** | Invalid Cookie or Missing PO Token | Refresh Cookie; Add `po_token`. |
| **"Sign in to confirm"** | Cookie flagged for verification | Cookie is dead. User must re-login and extract new cookie. |
| **Slow Initialization** | Remote session fetching | Enable `enable_session_cache: true` (with proper storage). |

## 6. References

-   **Client Types**: [YouTube.js Documentation - ClientType](https://github.com/LuanRT/YouTube.js)
-   **PO Token**: [YouTube.js Wiki - Proof of Origin](https://github.com/LuanRT/YouTube.js/wiki/Proof-of-Origin-Token)
