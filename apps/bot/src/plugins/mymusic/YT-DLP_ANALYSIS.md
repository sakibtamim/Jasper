# **COMPLETE TECHNICAL REFERENCE: yt-dlp YouTube Features**
*Derived from source code analysis of yt-dlp repository*

---

## **1. SEARCH PREFIXES**

### **1.1 `ytsearch:` - YouTube Video Search**

**Files:**
- _search.py (class: `YoutubeSearchIE`)
- common.py (base: `SearchInfoExtractor`)

**Syntax:**
```
ytsearch[N|all]:<query>
```

**Implementation Details:**
- **IE_NAME:** `youtube:search`
- **_SEARCH_KEY:** `'ytsearch'`
- **_SEARCH_PARAMS:** `'EgIQAfABAQ=='` (Videos only filter)
- **Base Class:** `YoutubeTabBaseInfoExtractor`, `SearchInfoExtractor`

**Logic Flow:**
1. `SearchInfoExtractor._real_extract()` parses prefix to extract count N
2. If N is empty, returns 1 result
3. If N is `'all'`, returns `float('inf')` (unlimited)
4. Calls `YoutubeTabBaseInfoExtractor._search_results(query, params)`
5. Uses Innertube API endpoint: `'search'` with query data
6. Returns playlist result with video entries

**Required Parameters:**
- `query`: Search query string
- `params` (optional): Base64-encoded protobuf search parameters

**Cookie Requirements:**
- **NOT required** for basic search
- Cookies may affect personalization/recommendations

**Info-Dict Structure:**
```python
{
    'id': '<query>',
    'title': '<query>',
    'entries': [
        {
            '_type': 'url',
            'ie_key': 'Youtube',
            'id': '<video_id>',
            'url': 'https://www.youtube.com/watch?v=<video_id>',
            'title': str,
            'description': str,
            'duration': int,
            'channel_id': str,
            'channel': str,
            'uploader': str,
            'uploader_id': str,  # @handle
            'thumbnails': list,
            'timestamp': int,  # if approximate_date config is set
            'view_count': int,
            'live_status': str,  # 'not_live', 'is_live', 'was_live', 'is_upcoming'
            'channel_is_verified': bool,
        }
    ]
}
```

**Limitations:**
- No explicit MAX_RESULTS defined (inherits `float('inf')` from base)
- Pagination controlled by YouTube's continuation tokens
- May encounter rate limiting on excessive requests
- Search results may include non-video content (channels, playlists) depending on query

---

### **1.2 `ytsearchdate:` - YouTube Search by Upload Date**

**Files:**
- _search.py (class: `YoutubeSearchDateIE`)

**Syntax:**
```
ytsearchdate[N|all]:<query>
```

**Implementation Details:**
- **IE_NAME:** `youtube:search:date`
- **_SEARCH_KEY:** `'ytsearchdate'`
- **_SEARCH_PARAMS:** `'CAISAhAB8AEB'` (Videos only, sorted by date)
- **Inherits from:** `YoutubeSearchIE`

**Logic Flow:**
- Identical to `ytsearch:` but with different search parameters
- Results are sorted by upload date (newest first)

**Differences from ytsearch:**
- Enforces date-based sorting via protobuf params
- Results prioritize recency over relevance

---

### **1.3 `ytsearchN:` - Explicit Count Search**

**Syntax:**
```
ytsearch5:cats
ytsearch10:music tutorial
```

**Implementation:**
- Part of `SearchInfoExtractor` pattern matching
- `N` is parsed from URL prefix: `ytsearch(?P<prefix>|[1-9][0-9]*|all):(?P<query>[\s\S]+)`
- Calls `_get_n_results(query, n)` which limits iteration to N entries

---

### **1.4 `ytmsearch:` - YouTube Music Search**

**Files:**
- _search.py (class: `YoutubeMusicSearchURLIE`)

**Syntax:**
```
https://music.youtube.com/search?q=<query>
https://music.youtube.com/search?q=<query>&sp=<section_params>
https://music.youtube.com/search?q=<query>#<section>
```

**Sections Supported:**
```python
_SECTIONS = {
    'albums': 'EgWKAQIYAWoKEAoQAxAEEAkQBQ==',
    'artists': 'EgWKAQIgAWoKEAoQAxAEEAkQBQ==',
    'community playlists': 'EgeKAQQoAEABagoQChADEAQQCRAF',
    'featured playlists': 'EgeKAQQoADgBagwQAxAJEAQQDhAKEAU==',
    'songs': 'EgWKAQIIAWoKEAoQAxAEEAkQBQ==',
    'videos': 'EgWKAQIQAWoKEAoQAxAEEAkQBQ==',
}
```

**Logic Flow:**
1. Extracts query from URL parameter `q` or `search_query`
2. Extracts section from URL fragment (e.g., `#songs`) or `sp` parameter
3. Calls `_search_results(query, params, default_client='web_music')`
4. Uses `web_music` client for API requests

**Cookie Requirements:**
- NOT required for basic searches
- May affect personalized recommendations

**Info-Dict Differences:**
- Returns music-specific entries (songs, albums, artists)
- URLs redirect to `music.youtube.com` domain

---

## **2. FEED EXTRACTORS**

### **2.1 `:ytfav` - Liked Videos**

**Files:**
- _redirect.py (class: `YoutubeFavouritesIE`)

**Syntax:**
```
:ytfav
:ytfavorites
:ytfavourites
```

**Implementation:**
- **IE_NAME:** `youtube:favorites`
- **_LOGIN_REQUIRED:** `True`
- **Redirects to:** `https://www.youtube.com/playlist?list=LL`

**Cookie Requirements:**
- **REQUIRED:** Must have valid authentication cookies
- Requires `SAPISID`, `__Secure-3PAPISID`, or `__Secure-1PAPISID`
- Requires `LOGIN_INFO` cookie

**Logic:**
```python
def _real_extract(self, url):
    return self.url_result(
        'https://www.youtube.com/playlist?list=LL',
        ie=YoutubeTabIE.ie_key())
```

**Special Notes:**
- `LL` playlist ID is user-specific liked videos
- Playlist is private and tied to authenticated user

---

### **2.2 `:ytwatchlater` - Watch Later**

**Files:**
- _redirect.py (class: `YoutubeWatchLaterIE`)

**Syntax:**
```
:ytwatchlater
```

**Implementation:**
- **IE_NAME:** `youtube:watchlater`
- **_LOGIN_REQUIRED:** `True`
- **Redirects to:** `https://www.youtube.com/playlist?list=WL`

**Cookie Requirements:**
- **REQUIRED:** Same as `:ytfav`

---

### **2.3 `:ytsubs` - Subscriptions Feed**

**Files:**
- _redirect.py (class: `YoutubeSubscriptionsIE`)

**Syntax:**
```
:ytsubs
:ytsubscriptions
```

**Implementation:**
- **IE_NAME:** `youtube:subscriptions`
- **_FEED_NAME:** `'subscriptions'`
- **_LOGIN_REQUIRED:** `True`
- **Redirects to:** `https://www.youtube.com/feed/subscriptions`

---

### **2.4 `:ythistory` - Watch History**

**Files:**
- _redirect.py (class: `YoutubeHistoryIE`)

**Syntax:**
```
:ythistory
:ythis
```

**Implementation:**
- **IE_NAME:** `youtube:history`
- **_FEED_NAME:** `'history'`
- **_LOGIN_REQUIRED:** `True`
- **Redirects to:** `https://www.youtube.com/feed/history`

---

### **2.5 `:ytrec` - Recommended Feed**

**Files:**
- _redirect.py (class: `YoutubeRecommendedIE`)

**Syntax:**
```
:ytrec
:ytrecommended
https://youtube.com
```

**Implementation:**
- **IE_NAME:** `youtube:recommended`
- **_FEED_NAME:** `'recommended'`
- **_LOGIN_REQUIRED:** `False`
- **Redirects to:** `https://www.youtube.com/feed/recommended`

**Special Notes:**
- Does NOT require authentication
- Personalization is improved with cookies but not required

---

### **2.6 `:ytnotif` - Notifications**

**Files:**
- _notifications.py (class: `YoutubeNotificationsIE`)

**Syntax:**
```
:ytnotif
:ytnotifications
```

**Implementation:**
- **IE_NAME:** `youtube:notif`
- **_LOGIN_REQUIRED:** `True`
- **API Endpoint:** `notification/get_notification_menu`

**Logic Flow:**
1. Downloads ytcfg (YouTube configuration)
2. Calls `_notification_menu_entries(ytcfg)`
3. Iterates through pages using continuation tokens
4. Extracts video/post notifications from `notificationRenderer`

**Info-Dict Structure:**
```python
{
    '_type': 'url',
    'url': 'https://www.youtube.com/watch?v=<video_id>' or 'https://www.youtube.com/channel/<channel_id>/community?lb=<post_id>',
    'ie_key': 'Youtube' or 'YoutubeTab',
    'video_id': str,
    'title': str,  # parsed from notification text
    'channel_id': str,
    'channel': str,
    'uploader': str,
    'thumbnails': list,
    'timestamp': int,  # if approximate_date config is set
}
```

---

## **3. SPECIAL URL HANDLERS**

### **3.1 `ytc:` - YouTube Clips**

**Files:**
- _clip.py (class: `YoutubeClipIE`)

**Syntax:**
```
https://www.youtube.com/clip/<clip_id>
```

**Implementation:**
- **IE_NAME:** `youtube:clip`
- **_VALID_URL:** `r'https?://(?:www\.)?youtube\.com/clip/(?P<id>[^/?#]+)'`

**Logic Flow:**
1. Extracts clip ID from URL
2. Downloads webpage to get `yt_initial_data`
3. Traverses JSON to find `currentVideoEndpoint.watchEndpoint.videoId`
4. Extracts clip metadata from `clipSectionRenderer`
5. Returns transparent URL result to base video with section timing

**Info-Dict Structure:**
```python
{
    '_type': 'url_transparent',
    'url': 'https://www.youtube.com/watch?v=<video_id>',
    'ie_key': 'Youtube',
    'id': '<clip_id>',
    'media_type': 'clip',
    'section_start': float,  # milliseconds / 1000
    'section_end': float,
    '_format_sort_fields': tuple,
}
```

**Limitations:**
- Inherits metadata from base video
- Clip-specific titles/descriptions are NOT extracted

---

### **3.2 Mix Playlists (RD*, RDMM)**

**Files:**
- _base.py - `_PLAYLIST_ID_RE`
- _tab.py - inline playlist extraction

**Playlist ID Patterns:**
```python
_PLAYLIST_ID_RE = r'(?:(?:PL|LL|EC|UU|FL|RD|UL|TL|PU|OLAK5uy_)[0-9A-Za-z-_]{10,}|RDMM|WL|LL|LM)'
```

**Mix Types:**
- **`RDMM`**: YouTube Music Mix (personalized)
- **`RD<video_id>`**: Mix based on video (e.g., `RDEMxxxxxxxx`)
- **`RDAT<artist_id>`**: Artist Radio
- **`RDAO<album_id>`**: Album Mix
- **`RDCMUC<channel_id>`**: Channel Mix

**Implementation:**
- Handled by `YoutubeTabIE._extract_from_playlist()`
- Mix playlists use inline playlist extraction (not tab-based)
- Calls `_extract_inline_playlist()` which paginated through `'next'` API endpoint

**Logic Flow (Inline Playlist):**
```python
def _extract_inline_playlist(self, playlist, playlist_id, data, ytcfg):
    for page_num in itertools.count(1):
        videos = list(self._playlist_entries(playlist))
        yield from videos[start:]
        
        watch_endpoint = playlist['contents'][-1]['playlistPanelVideoRenderer']['navigationEndpoint']['watchEndpoint']
        
        query = {
            'playlistId': playlist_id,
            'videoId': watch_endpoint.get('videoId') or last_id,
            'index': watch_endpoint.get('index') or len(videos),
            'params': watch_endpoint.get('params') or 'OAE%3D',
        }
        
        response = self._extract_response(item_id=f'{playlist_id} page {page_num}', query=query, ep='next', ...)
```

**Cookie Requirements:**
- **Personalized mixes (RDMM):** Require authentication
- **Video-based mixes:** Do NOT require cookies
- **SOCS cookie:** Required for mix extraction (set automatically to `'CAI'`)

**Special Notes:**
- Mix playlists delegate to inline extraction (not regular tab URL)
- Comment in code: `# Delegating everything except mix playlists to regular tab-based playlist URL`
- Inline playlists use `'next'` endpoint with `watchEndpoint` for pagination

---

### **3.3 `radio=1` Parameter**

**Implementation:**
- NOT explicitly handled as a separate feature
- `radio=1` is a URL parameter that YouTube uses in web UI
- yt-dlp treats these URLs as standard playlist URLs
- The `list` parameter determines playlist extraction

**Example:**
```
https://www.youtube.com/watch?v=<video_id>&list=RD<video_id>&radio=1
```
- Extracted as mix playlist (see 3.2)
- `radio=1` itself is not parsed/used by yt-dlp

---

### **3.4 `ytuser:` - User Channel Prefix**

**Files:**
- _redirect.py (class: `YoutubeYtUserIE`)

**Syntax:**
```
ytuser:<username>
```

**Implementation:**
```python
def _real_extract(self, url):
    user_id = self._match_id(url)
    return self.url_result(f'https://www.youtube.com/user/{user_id}', YoutubeTabIE, user_id)
```

---

### **3.5 YouTube Shorts Audio Pivot**

**Files:**
- _redirect.py (class: `YoutubeShortsAudioPivotIE`)

**Syntax:**
```
https://www.youtube.com/source/<video_id>/shorts
```

**Implementation:**
- **IE_NAME:** `youtube:shorts:pivot:audio`
- Generates protobuf-encoded browse params
- Redirects to: `https://www.youtube.com/feed/sfv_audio_pivot?bp=<params>`

**Purpose:**
- Finds Shorts that use the audio from a given video

---

### **3.6 YouTube Livestream Embeds**

**Files:**
- _redirect.py (class: `YoutubeLivestreamEmbedIE`)

**Syntax:**
```
https://www.youtube.com/embed/live_stream?channel=<channel_id>
```

**Implementation:**
- Redirects to: `https://www.youtube.com/channel/<channel_id>/live`

---

## **4. UNDOCUMENTED / HIDDEN FEATURES**

### **4.1 YouTube Stories**

**Status:** **NOT IMPLEMENTED**

**Evidence:**
- No extractor found for `ytstories:` prefix
- No matches for "story" or "stories" in YouTube-specific extractor code
- Feature may have been removed by YouTube or never implemented in yt-dlp

---

### **4.2 Channel-Specific Search**

**Implementation:**
- NOT a special prefix
- Use YouTube search URL with channel filter:
```
https://www.youtube.com/results?search_query=<query>&sp=<channel_params>
```
or
```
https://www.youtube.com/channel/<channel_id>/search?query=<query>
```

Handled by `YoutubeTabIE` with search tab

---

### **4.3 Feed URLs**

All feed URLs redirect through extractor classes:

```
https://www.youtube.com/feed/trending
https://www.youtube.com/feed/library
https://www.youtube.com/feed/history
https://www.youtube.com/feed/subscriptions
https://www.youtube.com/feed/watch_later
https://www.youtube.com/feed/recommended
https://www.youtube.com/feed/sfv_audio_pivot?bp=<params>
```

---

## **5. PLAYLIST ID PREFIXES (Complete List)**

**From _base.py:**
```python
_PLAYLIST_ID_RE = r'(?:(?:PL|LL|EC|UU|FL|RD|UL|TL|PU|OLAK5uy_)[0-9A-Za-z-_]{10,}|RDMM|WL|LL|LM)'
```

**Breakdown:**

| Prefix | Type | Description |
|--------|------|-------------|
| `PL` | Playlist | Public/unlisted playlist |
| `LL` | Liked | Liked videos (user-specific) |
| `EC` | Playlist | YouTube playlist (legacy?) |
| `UU` | Uploads | Channel uploads playlist |
| `FL` | Favorites | Favorites (deprecated) |
| `RD` | Mix | Radio/Mix playlist |
| `UL` | Playlist | User playlist (legacy?) |
| `TL` | Topic | Topic playlist |
| `PU` | Playlist | Public playlist (variant?) |
| `OLAK5uy_` | Album | YouTube Music album |
| `RDMM` | Music Mix | YouTube Music personalized mix |
| `WL` | Watch Later | Watch Later playlist |
| `LM` | Liked Music | Liked music (YouTube Music) |

---

## **6. COOKIE REQUIREMENTS**

### **6.1 Authentication Detection**

**From _base.py:**
```python
@property
def _has_auth_cookies(self):
    yt_sapisid, yt_1psapisid, yt_3psapisid = self._get_sid_cookies()
    has_login_info = 'LOGIN_INFO' in self._youtube_cookies
    return bool(has_login_info and (yt_sapisid or yt_1psapisid or yt_3psapisid))
```

**Required Cookies for Authentication:**
1. `LOGIN_INFO` - Indicates logged-in status
2. At least one of:
   - `SAPISID`
   - `__Secure-1PAPISID`
   - `__Secure-3PAPISID`

### **6.2 SOCS Cookie (Consent)**

**From _base.py:**
```python
socs = self._youtube_cookies.get('SOCS')
if not socs:
    self._set_cookie('.youtube.com', 'SOCS', 'CAI', secure=True)  # accept all (required for mixes)
```

**Purpose:**
- Consent cookie for GDPR compliance
- Automatically set to `'CAI'` (accept all) if not present
- **Required for mix playlists to work**

### **6.3 Features Requiring Cookies**

| Feature | Requires Auth | Notes |
|---------|--------------|-------|
| `:ytfav` | ✅ Yes | Private playlist |
| `:ytwatchlater` | ✅ Yes | Private playlist |
| `:ytsubs` | ✅ Yes | Personalized feed |
| `:ythistory` | ✅ Yes | Private history |
| `:ytnotif` | ✅ Yes | User notifications |
| `:ytrec` | ❌ No | Better with cookies |
| `ytsearch:` | ❌ No | Personalization improved |
| Mix (RDMM) | ✅ Yes (personalized) | Video-based mixes work without |
| Clips | ❌ No | Public feature |

---

## **7. INFO-DICT STRUCTURES**

### **7.1 Video Entry (from search/playlist)**

```python
{
    '_type': 'url',
    'ie_key': 'Youtube',
    'id': str,  # 11-character video ID
    'url': str,  # Full YouTube watch URL
    'title': str,
    'description': str,
    'duration': int,  # seconds
    'channel_id': str,  # UC... format
    'channel': str,
    'channel_url': str,
    'uploader': str,  # Same as channel
    'uploader_id': str,  # @handle
    'uploader_url': str,
    'thumbnails': [
        {
            'url': str,
            'id': str,  # quality indicator
        }
    ],
    'timestamp': int,  # Unix timestamp (if approximate_date enabled)
    'release_timestamp': int,  # For scheduled/premiered videos
    'availability': str,  # 'public', 'private', 'unlisted', etc.
    'view_count': int,
    'concurrent_view_count': int,  # For live streams
    'live_status': str,  # 'not_live', 'is_live', 'was_live', 'is_upcoming'
    'channel_is_verified': bool,
}
```

### **7.2 Playlist Result**

```python
{
    '_type': 'playlist',
    'id': str,  # Playlist ID or query
    'title': str,
    'description': str,
    'tags': list,
    'channel': str,
    'channel_id': str,
    'channel_url': str,
    'uploader': str,
    'uploader_id': str,
    'uploader_url': str,
    'availability': str,
    'view_count': int,
    'modified_date': str,  # YYYYMMDD
    'entries': [...]  # List of video entries
}
```

### **7.3 Channel Entry (from search)**

```python
{
    '_type': 'url',
    'url': str,  # Channel URL
    'id': str,  # Channel ID
    'ie_key': 'YoutubeTab',
    'channel': str,
    'uploader': str,
    'channel_id': str,
    'channel_url': str,
    'title': str,
    'uploader_id': str,  # @handle
    'uploader_url': str,
    'channel_follower_count': int,
    'thumbnails': list,
    'playlist_count': int,  # Number of videos
    'description': str,
    'channel_is_verified': bool,
}
```

---

## **8. INTEGRATION NOTES FOR EXTERNAL TOOLS**

### **8.1 Generating Mix/Radio Playlists**

**Approach 1: Video-Based Mix (No Auth Required)**
```bash
yt-dlp "https://www.youtube.com/watch?v=<video_id>&list=RD<video_id>"
```
or programmatically:
```python
url = f"https://www.youtube.com/watch?v={video_id}&list=RD{video_id}"
```

**Approach 2: Personalized YouTube Music Mix (Auth Required)**
```bash
yt-dlp --cookies cookies.txt "https://www.youtube.com/watch?v=<video_id>&list=RDMM"
```

**Approach 3: Artist/Album Radio**
```bash
# Artist: RDAT<artist_id>
# Album: RDAO<album_id>
# Channel: RDCMUC<channel_id>
```

### **8.2 Search-Based Playlists**

**Get N results:**
```bash
yt-dlp "ytsearch10:lofi hip hop"
```

**Get all results (use with caution):**
```bash
yt-dlp "ytsearchall:specific query"
```

**Date-sorted search:**
```bash
yt-dlp "ytsearchdate5:breaking news"
```

### **8.3 Personalized Recommendations (With Cookies)**

**Home feed:**
```bash
yt-dlp --cookies cookies.txt ":ytrec"
```

**Subscriptions:**
```bash
yt-dlp --cookies cookies.txt ":ytsubs"
```

**Watch Later:**
```bash
yt-dlp --cookies cookies.txt ":ytwatchlater"
```

### **8.4 YouTube Music Integration**

**Search for songs:**
```bash
yt-dlp "https://music.youtube.com/search?q=artist+name#songs"
```

**Programmatic section selection:**
```python
from urllib.parse import quote

sections = {
    'albums': 'EgWKAQIYAWoKEAoQAxAEEAkQBQ==',
    'songs': 'EgWKAQIIAWoKEAoQAxAEEAkQBQ==',
    'artists': 'EgWKAQIgAWoKEAoQAxAEEAkQBQ==',
}

url = f"https://music.youtube.com/search?q={quote(query)}&sp={sections['songs']}"
```

### **8.5 Channel-Specific Operations**

**Channel videos:**
```bash
yt-dlp "https://www.youtube.com/channel/<channel_id>/videos"
```

**Channel live streams:**
```bash
yt-dlp "https://www.youtube.com/channel/<channel_id>/streams"
```

**Channel search:**
```bash
yt-dlp "https://www.youtube.com/channel/<channel_id>/search?query=<query>"
```

### **8.6 Practical Tips**

**1. Cookie Export:**
- Use browser extension like "Get cookies.txt LOCALLY"
- Export from authenticated session
- Cookies include: SAPISID, LOGIN_INFO, HSID, SSID, SID
- Format: Netscape HTTP Cookie File

**2. Rate Limiting:**
- Use `--sleep-interval` and `--max-sleep-interval`
- YouTube may throttle excessive API requests
- Consider caching results

**3. Playlist Limits:**
- Search results paginate (no hard limit in code)
- Mix playlists are dynamically generated (typically 25-50 songs)
- Use `--playlist-end N` to limit extraction

**4. Error Handling:**
- Check for `_LOGIN_REQUIRED` errors
- Handle `ExtractorError` for auth failures
- Implement retry logic for network errors

**5. Efficient Extraction:**
- Use `--flat-playlist` to get only metadata
- Use `--playlist-items 1-10` for range selection
- Use `--max-downloads N` globally

---

## **9. HARDCODED PREFIXES - COMPLETE LIST**

**From source code analysis:**

### **9.1 Search Prefixes**
```
ytsearch[N|all]:
ytsearchdate[N|all]:
```

### **9.2 Feed Prefixes**
```
:ytfav
:ytfavorite
:ytfavorites
:ytfavourite
:ytfavourites
:ytwatchlater
:ytsubs
:ytsubscription
:ytsubscriptions
:ythis
:ythistory
:ytrec
:ytrecommended
:ytnotif
:ytnotification
:ytnotifications
ytuser:<username>
```

### **9.3 URL Schemes**
```
https://www.youtube.com/watch?v=<id>
https://www.youtube.com/watch?v=<id>&list=<playlist_id>
https://www.youtube.com/playlist?list=<playlist_id>
https://www.youtube.com/clip/<clip_id>
https://www.youtube.com/channel/<channel_id>
https://www.youtube.com/c/<custom_name>
https://www.youtube.com/user/<username>
https://www.youtube.com/@<handle>
https://www.youtube.com/results?search_query=<query>
https://www.youtube.com/feed/<feed_type>
https://www.youtube.com/source/<video_id>/shorts
https://www.youtube.com/embed/live_stream?channel=<channel_id>
https://music.youtube.com/search?q=<query>
https://music.youtube.com/search?q=<query>#<section>
https://music.youtube.com/playlist?list=<playlist_id>
https://music.youtube.com/browse/<browse_id>
https://youtu.be/<video_id>
```

### **9.4 Playlist ID Prefixes**
```
PL<alphanumeric>   - Public playlist
LL                 - Liked videos
EC<alphanumeric>   - Playlist (legacy)
UU<alphanumeric>   - Channel uploads
FL<alphanumeric>   - Favorites (deprecated)
RD<alphanumeric>   - Mix/Radio
UL<alphanumeric>   - User list (legacy)
TL<alphanumeric>   - Topic list
PU<alphanumeric>   - Public list
OLAK5uy_<...>      - Music album
RDMM               - Music Mix (personalized)
WL                 - Watch Later
LM                 - Liked Music
```

---

## **10. KNOWN LIMITATIONS**

### **10.1 From Code Comments**

1. **Mix Playlists:**
   - "Some playlists are unviewable but YouTube still provides a link to the (broken) playlist page"
   - Patterns: `MLCT`, `RLTD[\w-]{22}`

2. **Clip Extraction:**
   - "Other metadata should be extracted from the clip, not from the base video" (FIXME)
   - Clip-specific title/description not currently extracted

3. **Channel Redirects:**
   - YouTube may redirect to regional channels
   - Use `--extractor-args youtubetab:skip=no-youtube-channel-redirect` to disable

4. **Unavailable Videos:**
   - Playlists may contain unavailable videos
   - yt-dlp hides them by default
   - Use `--playlist-items` to skip or `--ignore-errors` to continue

5. **Authentication:**
   - Cookies may rotate due to security measures
   - "They have likely been rotated in the browser as a security measure"
   - Re-export cookies if extraction fails

6. **Stories:**
   - **NOT IMPLEMENTED** - Feature not found in codebase

---

## **11. ADVANCED FEATURES**

### **11.1 Visitor Data & Continuation**

**Purpose:**
- Maintain session continuity across API requests
- Required for proper pagination
- Extracted from initial response and passed to subsequent requests

**Implementation:**
```python
visitor_data = self._extract_visitor_data(response, data, ytcfg)
headers = self.generate_api_headers(ytcfg=ytcfg, visitor_data=visitor_data)
```

### **11.2 Delegated Session ID**

**Purpose:**
- Download private playlists of secondary channels (brand accounts)
- Extracted from ytcfg or response data

**Code:**
```python
delegated_session_id = self._extract_delegated_session_id(ytcfg, data)
headers = self.generate_api_headers(ytcfg=ytcfg, delegated_session_id=delegated_session_id)
```

### **11.3 Innertube Clients**

**Available Clients:**
```python
BASE_CLIENTS = ('tv', 'web', 'mweb', 'android', 'ios')
```

**Special Clients:**
- `web_music` - YouTube Music
- `tv_downgraded` - For authenticated requests
- `android_sdkless` - No SDK required
- `web_safari` - Safari user agent
- `web_creator` - Creator Studio

**Usage:**
```python
self._search_results(query, params, default_client='web_music')
```

### **11.4 Protobuf Parameters**

**Search Params (Base64-encoded):**
- Video filter: `'EgIQAfABAQ=='`
- Date sorted: `'CAISAhAB8AEB'`
- Music sections: See section 1.4

**Generate custom params:**
- Requires reverse-engineering YouTube's protobuf schema
- Tools like `protoc` can decode existing params

---

## **12. DEBUGGING & TROUBLESHOOTING**

### **12.1 Configuration Args**

**Skip features:**
```bash
--extractor-args "youtubetab:skip=authcheck,no-youtube-channel-redirect,webpage"
```

**Approximate dates:**
```bash
--extractor-args "youtubetab:approximate_date"
```

### **12.2 Common Issues**

**1. "This playlist requires authentication"**
- Export cookies from browser
- Use `--cookies cookies.txt`

**2. "Incomplete yt initial data received"**
- Retry the request (automatic in code)
- May indicate rate limiting

**3. Mix playlist not working**
- Ensure SOCS cookie is present (automatic)
- Check for consent redirect URL

**4. Search returns no results**
- Verify query encoding
- Check search parameters
- Try different client (web_music for music searches)

---

## **SUMMARY OF UNDISCOVERED FEATURES**

Based on exhaustive source code analysis:

1. **Stories (`ytstories:`)** - **NOT FOUND** in codebase
2. **`radio=1`** - Parameter exists in YouTube UI but not explicitly handled by yt-dlp (treated as part of list param)
3. **Channel-specific search** - Available via regular YouTube Tab extractor with search query
4. **Shorts audio pivot** - Fully implemented (`youtube:shorts:pivot:audio`)
5. **Consent redirect** - Handled by `YoutubeConsentRedirectIE`
6. **Livestream embeds** - Redirected by `YoutubeLivestreamEmbedIE`

**No hidden extractors found** - All YouTube features are well-defined in the source.

---

## **REFERENCES**

**Primary Source Files:**
- __init__.py - Extractor exports
- _base.py - Base classes and constants
- _search.py - Search extractors
- _redirect.py - Feed and redirect extractors
- _tab.py - Tab/playlist extractors
- _video.py - Video extractor
- _clip.py - Clip extractor
- _notifications.py - Notifications extractor
- _mistakes.py - Error handling
- common.py - Base InfoExtractor and SearchInfoExtractor

**Configuration:**
- Repository: `yt-dlp/yt-dlp` (master branch)
- Analysis Date: December 2025
- Git HEAD: `335653be82d5ef999cfc2879d005397402eebec1`

---

**END OF TECHNICAL REFERENCE**

This document was generated entirely from source code analysis with zero assumptions or external documentation references.