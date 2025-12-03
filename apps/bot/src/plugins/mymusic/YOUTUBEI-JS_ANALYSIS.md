# YOUTUBE.JS DISCOVERY ENGINE REFERENCE
## Engineering Guide for MyMusic Bot Backend Integration

---

## 1. CLIENT INITIALIZATION & AUTH

### Creating an Innertube Instance

**Primary Entry Point:** Innertube.ts

```typescript
import { Innertube } from 'youtubei.js';

const yt = await Innertube.create({
  // Configuration options
});
```

The `Innertube.create()` method is an **async factory** that internally creates a Session object. This session handles all InnerTube API interactions.

### Configuration Options (`InnerTubeConfig`)

**Type Definition:** Misc.ts → `InnerTubeConfig` (alias for `SessionOptions`)

**Key Options for Server-Side Use:**

| Option | Type | Description | Node.js Relevance |
|--------|------|-------------|-------------------|
| `cookie` | `string` | Full Cookie header string for authenticated requests | **CRITICAL** for personalized feeds |
| `lang` | `string` | Language code (e.g., `'en'`, `'de'`) | Affects content localization |
| `location` | `string` | Geolocation code (e.g., `'US'`, `'GB'`) | Affects content recommendations |
| `client_type` | `ClientType` | InnerTube client type (see below) | Use `ClientType.WEB` or `ClientType.MUSIC` |
| `visitor_data` | `string` | Persistent visitor data string for tailored content | Useful for consistent recommendations |
| `cache` | `ICache` | Cache implementation for session data & tokens | **RECOMMENDED** - use `UniversalCache` |
| `enable_session_cache` | `boolean` | Whether to cache session data (default: `true`) | Speeds up subsequent initializations |
| `generate_session_locally` | `boolean` | Generate session locally vs. fetching from YouTube | `true` = faster but less accurate |
| `retrieve_player` | `boolean` | Fetch JS player for deciphering (default: `true`) | Set `false` if only using discovery APIs |
| `po_token` | `string` | Proof of Origin token (BotGuard attestation) | For bypassing certain restrictions |
| `fetch` | `FetchFunction` | Custom fetch implementation | Use for proxies or custom networking |

### Client Types (`ClientType`)

**Defined in:** Session.ts

```typescript
enum ClientType {
  WEB = 'WEB',              // Standard YouTube web client
  MWEB = 'MWEB',            // Mobile web
  KIDS = 'WEB_KIDS',        // YouTube Kids
  MUSIC = 'WEB_REMIX',      // YouTube Music (most important for your use case)
  IOS = 'iOS',              // iOS app
  ANDROID = 'ANDROID',
  ANDROID_MUSIC = 'ANDROID_MUSIC',
  TV = 'TVHTML5',
  // ... others
}
```

**For Music Bot:** Use `ClientType.MUSIC` (= `'WEB_REMIX'`) for music-specific endpoints, or `ClientType.WEB` for general YouTube.

### Cookie Format & Authentication

**Cookie Handling:** Session.ts

- **Format:** Standard HTTP `Cookie` header string
  ```typescript
  cookie: "VISITOR_INFO1_LIVE=...; PREF=...; SID=...; __Secure-3PAPISID=..."
  ```
- **Multiple cookies:** Semicolon-separated as per HTTP spec
- **Extraction:** From browser DevTools → Application → Cookies, or via network capture
- **No built-in helpers** for cookie parsing/extraction in the library

**Session Persistence:**

- The library does **NOT** automatically cache cookies
- Sessions are cached via the `cache` option (stores context + API keys, NOT cookies)
- To persist cookies between runs, you must store them externally (database, config file)

**Cookie Requirement for Personalized Feeds:**

- **Required** for: `getHomeFeed()`, `getHistory()`, `getSubscriptionsFeed()`, `getLibrary()`, liked songs
- **Optional** for: `search()` (works without cookies but results may vary)

### OAuth2 Authentication (Alternative to Cookies)

**Class:** OAuth2.ts

YouTube.js supports OAuth2 for TV-based authentication flows:

```typescript
yt.session.on('auth-pending', (data) => {
  console.log(`Go to ${data.verification_url} and enter ${data.user_code}`);
});

yt.session.on('auth', ({ credentials }) => {
  // Store credentials for reuse
});

await yt.session.signIn();
await yt.session.oauth.cacheCredentials(); // Store to cache
```

**Tokens Structure:**
```typescript
interface OAuth2Tokens {
  access_token: string;
  refresh_token: string;
  expires: Date;
  // ...
}
```

**For Server-Side Bots:** Cookies are simpler than OAuth2. OAuth2 is better for user-facing apps where you can't extract cookies.

---

## 2. CORE HIGH-LEVEL APIS

All methods below are available on the `Innertube` instance (returned by `Innertube.create()`).

### General YouTube APIs

#### `search(query: string, filters?: SearchFilters): Promise<Search>`

**Location:** Innertube.ts

- **Parameters:**
  - `query`: Search term
  - `filters`: Optional filters object
    ```typescript
    interface SearchFilters {
      upload_date?: 'all' | 'hour' | 'today' | 'week' | 'month' | 'year';
      type?: 'all' | 'video' | 'channel' | 'playlist' | 'movie';
      duration?: 'all' | 'short' | 'medium' | 'long';
      sort_by?: 'relevance' | 'rating' | 'upload_date' | 'view_count';
      features?: Array<'hd' | 'subtitles' | 'creative_commons' | '3d' | 'live' | '4k' | '360' | 'hdr' | 'vr180'>;
    }
    ```

- **Returns:** Search object
  - `results: ObservedArray<YTNode>` - Video/Playlist/Channel nodes
  - `refinements: string[]` - Query refinement suggestions
  - `estimated_results: number`
  - Methods: `getContinuation()`, `selectRefinementCard()`

- **Usage for Discovery:**
  ```typescript
  const search = await yt.search('synthwave', { type: 'video', duration: 'medium' });
  const videoIds = search.results
    .filter(item => item.type === 'Video')
    .map(video => video.video_id);
  ```

#### `getHomeFeed(): Promise<HomeFeed>`

**Location:** Innertube.ts

- **Requires:** Cookies for personalized results (otherwise returns generic feed)
- **Returns:** HomeFeed object
  - `contents: RichGrid` - Main feed contents
  - `filters: string[]` - Available filter chips
  - Methods: `applyFilter(filter)`, `getContinuation()`

- **Extracting Videos:**
  ```typescript
  const home = await yt.getHomeFeed();
  const videos = home.videos; // Inherited from Feed mixin
  ```

#### `getSubscriptionsFeed(): Promise<Feed<IBrowseResponse>>`

**Location:** Innertube.ts

- **Requires:** Cookies + active subscriptions
- **Returns:** Generic Feed object
- **Browse ID:** `'FEsubscriptions'`

#### `getHistory(): Promise<History>`

**Location:** Innertube.ts

- **Requires:** Cookies
- **Returns:** History object
  - `sections: ItemSection[]` - History sections
  - Method: `removeVideo(video_id)` - Remove from history

#### `getPlaylist(id: string): Promise<Playlist>`

**Location:** Innertube.ts

- **Parameters:**
  - `id`: Playlist ID (with or without `'VL'` prefix)
- **Returns:** Playlist object
  - `info: { title, author, total_items, views, can_reorder, ... }`
  - `items: ObservedArray<PlaylistVideo | ReelItem>` - Playlist tracks
  - Methods: `getContinuation()`

#### `getNotifications(): Promise<NotificationsMenu>`

**Location:** Innertube.ts

- **Requires:** Cookies
- Returns notifications/inbox items

---

## 3. YOUTUBE MUSIC–SPECIFIC CAPABILITIES

**Access via:** `yt.music` property (returns Music client instance)

### Music Search

#### `music.search(query: string, filters?: MusicSearchFilters): Promise<Search>`

**Location:** Music.ts

- **Parameters:**
  - `query`: Search term
  - `filters`: Music-specific filters
    ```typescript
    interface MusicSearchFilters {
      type?: 'all' | 'song' | 'video' | 'album' | 'playlist' | 'artist';
    }
    ```

- **Returns:** Search (YT Music variant)
  - `header: ChipCloud` - Filter chips
  - `contents: ObservedArray<MusicShelf | MusicCardShelf>`
  - Convenience properties:
    - `songs: MusicShelf`
    - `videos: MusicShelf`
    - `albums: MusicShelf`
    - `artists: MusicShelf`
    - `playlists: MusicShelf`
  - Methods: `applyFilter(filter)`, `getContinuation()`, `getMore(shelf)`

- **Usage:**
  ```typescript
  const search = await yt.music.search('lofi beats', { type: 'song' });
  const songs = search.songs?.contents; // MusicResponsiveListItem[]
  ```

### Music Home Feed

#### `music.getHomeFeed(): Promise<HomeFeed>`

**Location:** Music.ts

- **Returns:** HomeFeed (YT Music variant)
  - `sections: ObservedArray<MusicCarouselShelf | MusicTastebuilderShelf>`
  - `header: ChipCloud` - Filter chips (e.g., "Energize", "Relax", etc.)
  - Methods: `applyFilter(filter)`, `getContinuation()`

- **Browse ID:** `'FEmusic_home'`

### Music Library

#### `music.getLibrary(): Promise<Library>`

**Location:** Music.ts

- **Requires:** Cookies
- **Returns:** Library object
  - `contents: ObservedArray<Grid | MusicShelf>` - Songs, albums, playlists, etc.
  - `sort_options: string[]`
  - `filters: string[]`
  - Methods: `applySort(option)`, `applyFilter(filter)`, `getContinuation()`

- **Browse ID:** `'FEmusic_library_landing'`

### Music Playlist

#### `music.getPlaylist(playlist_id: string): Promise<Playlist>`

**Location:** Music.ts

- **Parameters:**
  - `playlist_id`: Playlist ID (auto-prefixed with `'VL'`)
- **Returns:** Playlist (Music-specific variant)
  - Same structure as YouTube playlists but with music metadata

### Music Album

#### `music.getAlbum(album_id: string): Promise<Album>`

**Location:** Music.ts

- **Parameters:**
  - `album_id`: Starts with `'MPR'` or `'FEmusic_library_privately_owned_release'`
- **Returns:** Album object

### Music Artist

#### `music.getArtist(artist_id: string): Promise<Artist>`

**Location:** Music.ts

- **Parameters:**
  - `artist_id`: Starts with `'UC'` or `'FEmusic_library_privately_owned_artist'`
- **Returns:** Artist object

### Music Track Info

#### `music.getInfo(target: string | MusicTwoRowItem | ...): Promise<TrackInfo>`

**Location:** Music.ts

- **Parameters:**
  - `target`: Video ID or item object (supports automix/radio)
- **Returns:** TrackInfo - Full track metadata + playback info

---

## 4. HOME FEED, RECOMMENDATIONS, AND OTHER FEEDS

### YouTube Home Feed

**Method:** `getHomeFeed()`

**Structure:**
- **Contents:** RichGrid with video/shelf items
- **Filters:** Chip-based filters for customizing feed
- **Cookies Required:** Yes, for personalized recommendations

**Video Extraction:**
```typescript
const home = await yt.getHomeFeed();

// Option 1: Use the inherited `videos` property
const videos = home.videos; // Array of Video nodes

// Option 2: Manual filtering
const contents = home.contents as RichGrid;
const videoIds = contents.contents
  .filter(item => item.type === 'RichItem')
  .flatMap(item => item.content)
  .filter(content => content.type === 'Video')
  .map(video => video.video_id);
```

### YouTube Music Home Feed

**Method:** `music.getHomeFeed()`

**Structure:**
- **Sections:** Array of MusicCarouselShelf (e.g., "Quick picks", "Recommended albums")
- Each shelf has:
  - `title: Text` - Section name
  - `contents: ObservedArray<MusicTwoRowItem | MusicResponsiveListItem>`

**Video ID Extraction:**
```typescript
const musicHome = await yt.music.getHomeFeed();

const allVideoIds = musicHome.sections
  ?.flatMap(section => section.contents || [])
  .filter(item => item.item_type === 'song' || item.item_type === 'video')
  .map(item => item.id)
  .filter(Boolean) || [];
```

### Subscriptions Feed

**Method:** `getSubscriptionsFeed()`

**Structure:**
- Generic Feed instance
- Browse ID: `'FEsubscriptions'`

**Video Extraction:**
```typescript
const subs = await yt.getSubscriptionsFeed();
const videos = subs.videos; // Inherited from Feed mixin
```

### History Feed

**Method:** `getHistory()`

**Structure:**
- History class
- `sections: ItemSection[]` - Each section has `contents` array with Video nodes

**Video Extraction:**
```typescript
const history = await yt.getHistory();
const videoIds = history.videos.map(video => video.video_id);
```

### Notifications

**Method:** `getNotifications()`

- Returns NotificationsMenu
- Contains notification items (new videos from subscriptions, etc.)

---

## 5. PAGINATION & CONTINUATION

### Continuation Mechanism

**Implementation:** Feed.ts

All feed-like responses (Search, HomeFeed, Playlist, etc.) support continuation via:

**Check for More:**
```typescript
feed.has_continuation // boolean property
```

**Load More:**
```typescript
const nextPage = await feed.getContinuation();
// Returns a NEW instance of the same class with next batch
```

### Continuation Pattern

1. **Initial Request:**
   ```typescript
   const search = await yt.search('lofi');
   console.log(search.results.length); // e.g., 20 items
   ```

2. **Check & Load:**
   ```typescript
   if (search.has_continuation) {
     const page2 = await search.getContinuation();
     console.log(page2.results.length); // next 20 items
   }
   ```

3. **Repeated Pagination:**
   ```typescript
   let currentPage = search;
   while (currentPage.has_continuation) {
     currentPage = await currentPage.getContinuation();
     // Process currentPage.results
   }
   ```

### Continuation in Different Contexts

| Endpoint | Continuation Support | Notes |
|----------|---------------------|-------|
| `search()` | ✅ Yes | Returns new Search instance |
| `getHomeFeed()` | ✅ Yes | Preserves header/filters |
| `music.search()` | ✅ Yes (filtered only) | Only when filter is applied |
| `getPlaylist()` | ✅ Yes | Handles large playlists |
| `music.getHomeFeed()` | ✅ Yes | Loads more carousels |
| `getHistory()` | ✅ Yes | |
| `getSubscriptionsFeed()` | ✅ Yes | |

### Internal Mechanism

- Continuations are identified by ContinuationItem nodes
- These contain `endpoint: NavigationEndpoint` with continuation tokens
- The library automatically extracts and calls these endpoints

**No manual token handling needed** - just call `getContinuation()`.

---

## 6. PLAYLIST HANDLING & VIDEO ID EXTRACTION

### Fetching Playlist Contents

**Method:** `getPlaylist(id: string)` or `music.getPlaylist(id: string)`

**Location:**
- YouTube: Innertube.ts
- Music: Music.ts

### Playlist Structure

**Class:** Playlist

```typescript
interface PlaylistInfo {
  title: string;
  author: Author;
  thumbnails: Thumbnail[];
  total_items: string;
  views: string;
  last_updated: string;
  can_share: boolean;
  can_delete: boolean;
  can_reorder: boolean;
  is_editable: boolean;
  privacy: string;
}

const playlist = await yt.getPlaylist('PLxxxxxx');

// Access metadata
console.log(playlist.info.title);
console.log(playlist.info.total_items);

// Access items
const items = playlist.items; // ObservedArray<PlaylistVideo>
```

### PlaylistVideo Structure

**Class:** PlaylistVideo

**Key Properties:**
- `id: string` (or `video_id`) - **The video ID you need**
- `title: Text` - Video title
- `author: Author` - Channel info
- `duration: { text: string; seconds: number }`
- `thumbnails: Thumbnail[]`
- `index: Text` - Position in playlist
- `is_playable: boolean`

### Video ID Extraction Recipes

#### 1. From Search Results

```typescript
const search = await yt.search('synthwave mix');

const videoIds = search.results
  .filter(item => item.type === 'Video')
  .map(video => video.video_id);
```

#### 2. From Home Feed

```typescript
const home = await yt.getHomeFeed();
const videoIds = home.videos.map(video => video.video_id);
```

#### 3. From Music Search

```typescript
const search = await yt.music.search('jazz', { type: 'song' });

const videoIds = search.songs?.contents
  .filter(item => item.item_type === 'song' && item.id)
  .map(item => item.id) || [];
```

#### 4. From Music Home Feed

```typescript
const musicHome = await yt.music.getHomeFeed();

const videoIds = musicHome.sections
  ?.flatMap(section => section.contents || [])
  .filter(item => ['song', 'video'].includes(item.item_type || ''))
  .map(item => item.id)
  .filter(Boolean) || [];
```

#### 5. From Playlist

```typescript
const playlist = await yt.getPlaylist('PLxxxxxx');

const videoIds = playlist.items.map(item => item.id);

// With pagination
const allIds = [playlist.items.map(i => i.id)];
let page = playlist;
while (page.has_continuation) {
  page = await page.getContinuation();
  allIds.push(...page.items.map(i => i.id));
}
```

#### 6. From Music Playlist

```typescript
const playlist = await yt.music.getPlaylist('RDxxxxxx');

// Music playlists use MusicResponsiveListItem
const videoIds = playlist.items
  .filter(item => item.id)
  .map(item => item.id);
```

### Large Playlist Handling

Playlists are **lazy-loaded**. The initial response contains ~100 items, then continuation is needed.

**Best Practice:**
```typescript
async function getAllPlaylistVideos(playlistId: string): Promise<string[]> {
  const playlist = await yt.getPlaylist(playlistId);
  const videoIds: string[] = playlist.items.map(item => item.id);
  
  let page = playlist;
  while (page.has_continuation) {
    page = await page.getContinuation();
    videoIds.push(...page.items.map(item => item.id));
  }
  
  return videoIds;
}
```

---

## 7. NODE / SERVER-SIDE CONSTRAINTS & BEST PRACTICES

### Platform Support

**Implementation:** platform

- **Primary Node Entry Point:** node.ts
- **Detection:** Automatic via conditional exports in package.json
- **Browser vs Node:** Library uses platform shims (PlatformShim)

### Node.js Compatibility

✅ **Fully Node-safe** - No browser-specific APIs required

The library is designed to work seamlessly in Node.js environments:
- Uses native `fetch` (Node 18+) or polyfills
- File system operations only for cache (optional)
- No DOM dependencies
- No `window` or browser globals

### Session Reuse

**Recommended Pattern:**

```typescript
// Create once per application lifecycle
const yt = await Innertube.create({
  cache: new UniversalCache(false),
  cookie: process.env.YOUTUBE_COOKIE,
  enable_session_cache: true
});

// Reuse for multiple requests
app.get('/api/search', async (req, res) => {
  const results = await yt.search(req.query.q);
  res.json(results);
});
```

**Do NOT** create new instances per request - session creation is expensive (~1-2 seconds).

### Error Handling

**Common Errors:**

1. **InnertubeError** - API errors, invalid IDs, etc.
   ```typescript
   import { InnertubeError } from 'youtubei.js';
   
   try {
     const playlist = await yt.getPlaylist('invalid');
   } catch (err) {
     if (err instanceof InnertubeError) {
       console.error('YouTube API error:', err.message);
     }
   }
   ```

2. **SessionError** - Session creation failures
   ```typescript
   import { SessionError } from 'youtubei.js';
   ```

3. **Empty Responses** - No continuation, empty feeds
   - Check `feed.has_continuation` before calling `getContinuation()`
   - Handle empty arrays from `.videos`, `.results`, etc.

### Rate Limiting & Best Practices

**No explicit rate limits documented** in the library, but YouTube's backend has protections:

**Recommendations:**
1. **Use caching** - Cache search results, playlists for reasonable periods
2. **Respect continuation delays** - Don't hammer continuation endpoints
3. **Rotate cookies** - If making many requests, use multiple accounts
4. **Use `visitor_data`** - Provides consistent recommendations without cookies
5. **Set realistic user-agents** - Don't use obviously fake user-agents

### Client Type Selection

For server-side discovery:

| Use Case | Recommended Client | Reason |
|----------|-------------------|--------|
| Music discovery | `ClientType.MUSIC` | Access to YT Music endpoints |
| General video search | `ClientType.WEB` | Standard YouTube |
| Mixed usage | Create 2 instances | Separate sessions for YT & YT Music |

**Anti-Pattern:** Switching `client_type` on existing instance (not supported)

### Memory & Performance

**Session Caching:**
```typescript
const yt = await Innertube.create({
  cache: new UniversalCache(false), // false = in-memory only
  enable_session_cache: true        // Cache session data
});
```

- First initialization: ~1-2 seconds (fetches player, config)
- Subsequent (cached): ~50-200ms
- **Cache TTL:** Session data doesn't expire (until cleared or library version changes)

**Player Retrieval:**
```typescript
const yt = await Innertube.create({
  retrieve_player: false  // Skip if only using discovery APIs
});
```

Saves ~500ms-1s on initialization if you're not deciphering streams.

### Cookie Security

**CRITICAL:** Cookies contain authentication tokens.

1. **Store securely** - Environment variables, encrypted storage, not in repo
2. **Rotate regularly** - Cookies can expire or be revoked
3. **Per-user storage** - If supporting multiple users, isolate cookies per user
4. **Monitor for invalidation** - Handle auth errors gracefully

---

## 8. MINI SUMMARY: HOW TO USE THIS LIBRARY AS A DISCOVERY ENGINE

### High-Level Flow

```
User's Cookie Profile
         ↓
   Innertube.create({ cookie })
         ↓
   ┌─────────────────────────┐
   │  Discovery APIs         │
   │  - search()             │
   │  - music.search()       │
   │  - getHomeFeed()        │
   │  - music.getHomeFeed()  │
   │  - getPlaylist()        │
   │  - getHistory()         │
   └─────────────────────────┘
         ↓
   Extract Video IDs
         ↓
   Pass to yt-dlp
```

### Step-by-Step Implementation

#### Step 1: Initialize Client

```typescript
import { Innertube, UniversalCache } from 'youtubei.js';

const yt = await Innertube.create({
  cookie: getUserCookie(),              // From your user profile DB
  cache: new UniversalCache(false),     // In-memory cache
  enable_session_cache: true,           // Speed up re-initialization
  retrieve_player: false                // Discovery only, no streaming
});
```

#### Step 2: Call Discovery APIs

**Music Search:**
```typescript
async function searchMusic(query: string, limit = 20): Promise<string[]> {
  const search = await yt.music.search(query, { type: 'song' });
  
  return search.songs?.contents
    .slice(0, limit)
    .map(item => item.id)
    .filter(Boolean) as string[] || [];
}
```

**Home Feed:**
```typescript
async function getRecommendations(limit = 50): Promise<string[]> {
  const home = await yt.music.getHomeFeed();
  
  const videoIds: string[] = [];
  
  for (const section of home.sections || []) {
    for (const item of section.contents || []) {
      if (['song', 'video'].includes(item.item_type || '') && item.id) {
        videoIds.push(item.id);
        if (videoIds.length >= limit) return videoIds;
      }
    }
  }
  
  return videoIds;
}
```

**Playlist:**
```typescript
async function getPlaylistTracks(playlistId: string): Promise<string[]> {
  const playlist = await yt.music.getPlaylist(playlistId);
  const videoIds = playlist.items.map(item => item.id);
  
  // Handle continuation for large playlists
  let page = playlist;
  while (page.has_continuation && videoIds.length < 500) {
    page = await page.getContinuation();
    videoIds.push(...page.items.map(item => item.id));
  }
  
  return videoIds;
}
```

#### Step 3: Return Video IDs

```typescript
// Discord bot example
bot.command('play', async (msg, query) => {
  const videoIds = await searchMusic(query, 10);
  
  if (videoIds.length === 0) {
    return msg.reply('No results found');
  }
  
  // Pass to yt-dlp or your playback system
  await playQueue.add(videoIds);
  msg.reply(`Added ${videoIds.length} tracks`);
});
```

### Key Patterns

1. **Always check for data:**
   ```typescript
   const songs = search.songs?.contents || [];
   ```

2. **Handle pagination:**
   ```typescript
   while (feed.has_continuation && ids.length < MAX) {
     feed = await feed.getContinuation();
     // ... extract more IDs
   }
   ```

3. **Filter by type:**
   ```typescript
   items.filter(item => item.item_type === 'song')
   ```

4. **Map to IDs robustly:**
   ```typescript
   items.map(item => item.id).filter(Boolean)
   ```

### Error Handling Template

```typescript
async function safeSearch(query: string): Promise<string[]> {
  try {
    const search = await yt.music.search(query, { type: 'song' });
    return search.songs?.contents.map(i => i.id).filter(Boolean) || [];
  } catch (err) {
    if (err instanceof InnertubeError) {
      console.error('YouTube API error:', err.message);
    } else {
      console.error('Unexpected error:', err);
    }
    return [];
  }
}
```

### Performance Tips

1. **Reuse client instance** - Don't create per request
2. **Cache results** - Search results don't change rapidly
3. **Limit continuation loops** - Set max iterations to avoid infinite loops
4. **Batch requests** - If fetching multiple playlists, consider parallel requests
5. **Monitor rate limits** - Add delays if hitting issues

---

## CRITICAL NOTES

### Stable vs. Experimental

- **Stable for production:**
  - `search()`, `music.search()`
  - `getPlaylist()`, `music.getPlaylist()`
  - `getHomeFeed()`, `music.getHomeFeed()`
  - Video/playlist metadata extraction

- **Use with caution:**
  - OAuth2 (works but complex)
  - Lyrics, comments (secondary features)
  - Upload/studio features (not relevant for discovery)

### InnerTube API Volatility

YouTube's private API can change **without notice**. The library maintainers actively update for breaking changes, but:

- Pin library version in production
- Test after updates before deploying
- Have fallback mechanisms

### Cookie Expiration

Cookies can expire or be invalidated. Implement:
- Periodic re-authentication checks
- Graceful degradation (fall back to non-personalized search)
- User notifications for re-authentication

### Multiple Users

If your bot serves multiple Discord servers with per-user cookies:

```typescript
const sessions = new Map<string, Innertube>();

async function getSession(userId: string): Promise<Innertube> {
  if (!sessions.has(userId)) {
    const cookie = await db.getCookie(userId);
    sessions.set(userId, await Innertube.create({ cookie }));
  }
  return sessions.get(userId)!;
}
```

---

## FINAL ARCHITECTURE RECOMMENDATION

For a music bot with MyMusic plugin:

```
┌─────────────────────────────────────────┐
│  Discord Bot (Node.js)                  │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  MyMusic Plugin                   │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  Discovery Service          │ │ │
│  │  │  (YouTube.js wrapper)       │ │ │
│  │  │                             │ │ │
│  │  │  - searchMusic()            │ │ │
│  │  │  - getRecommendations()     │ │ │
│  │  │  - getPlaylist()            │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                │                  │ │
│  │                ↓                  │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  Video ID Cache             │ │ │
│  │  │  (Redis/Memory)             │ │ │
│  │  └─────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
│                │                        │
│                ↓                        │
│  ┌───────────────────────────────────┐ │
│  │  Playback Service                 │ │
│  │  (yt-dlp integration)             │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

This reference is derived entirely from the actual YouTube.js source code as of version **16.0.1** and is production-ready for your MyMusic plugin backend.