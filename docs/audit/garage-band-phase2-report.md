# Garage Band Phase 2 Integration & Audit Report

This report presents a comprehensive audit of the execution, implementation correctness, and deployment configurations for the **Garage Band** plugin (Phase 2). It includes a deep dive into the resolved issues, test coverage gaps, recommendations for production readiness, and a draft plan for Phase 3.

---

## 1. Executive Summary & Epic Status

The **Garage Band** Epic (Phase 2) is **fully implemented, complete, and integrated** into the core Jasper bot platform. All four sub-issues (Issues #63, #64, #65, and #66) have been successfully executed and validated across the codebase.

Key milestones achieved in this phase include:

- **Infrastructure**: Automated GitHub App authentication replacing static developer tokens.
- **Playlist Management**: A React-based drag-and-drop playlist reordering component powered by `@dnd-kit`, fully backed by database persistence via a REST API.
- **Playback Control**: Real-time queue loop, repeat, and Fisher-Yates shuffle controls integrated into the core playback engine and exposed via slash commands.
- **Metadata Richness**: Custom thumbnail support with file type validation, YouTube video details extraction via `yt-dlp -J`, and record-spinning hover aesthetics on the dashboard.

---

## 2. Deep Dive on Sub-issues Execution & Implementation Correctness

### Issue #63: GitHub App Auth for Private Submodules Checkout

- **Implementation Mechanism**: The project replaces the legacy developer Personal Access Token (`PAT_TOKEN`) with an automated GitHub App token generated on the fly inside the deployment CI/CD pipeline.
- **Core Workflow**: On every push to the `deploy` branch, the `Deploy Bot` GitHub Action executes `actions/create-github-app-token@v1` using repository secrets `DEPLOY_APP_ID` and `DEPLOY_APP_PRIVATE_KEY`. The returned token is passed to `actions/checkout@v4` to recursively clone private submodules (such as the `garage-band` plugin repository).
- **Scripts**: The `scripts/setup-github-app-auth.sh` utility is provided to guide developers through the App registration on GitHub, download private keys, install it on target orgs (`Purrfectsoft` and `sakibtamim`), automatically write secrets using the `gh` CLI, and securely purge the legacy `PAT_TOKEN`.

#### Workflow Configuration Snippet (`.github/workflows/deploy.yml`):

```yaml
- name: Generate GitHub App Token
  id: generate-token
  uses: actions/create-github-app-token@v1
  with:
      app-id: ${{ secrets.DEPLOY_APP_ID }}
      private-key: ${{ secrets.DEPLOY_APP_PRIVATE_KEY }}
      owner: purrfectsoft

- name: Checkout code
  uses: actions/checkout@v4
  with:
      submodules: recursive
      token: ${{ steps.generate-token.outputs.token }}
```

---

### Issue #64: Playlist Management & Drag-Drop Reordering

- **Frontend DnD Setup**: Implemented in `web/components/PlaylistDetail.tsx` using `@dnd-kit/core` and `@dnd-kit/sortable` to wrap the list container with a `<DndContext>` and `<SortableContext>`. Tracks are rendered in a custom `<SortableTrackRow>` component using the `useSortable` hook.
- **Keyboard Accessibility**: The drag handle is marked with `tabIndex={0}`, `role="button"`, and `aria-label="Drag to reorder"`. Interaction sensors bind both `PointerSensor` (with an `activationConstraint` of 8px to ensure clicks on buttons don't trigger drag events) and `KeyboardSensor` (with `sortableKeyboardCoordinates` layout mapping).
- **Backend API persistence**: Once a drag completes, the frontend performs an optimistic UI update, then invokes the `PUT /playlists/:id/reorder` endpoint to save the new order.
- **Discord Command Autocomplete**: In `/garage-band playlist remove` and `/garage-band play`, autocomplete dynamically maps options (such as track title matching and track index selections) using the `autocomplete` interaction.

#### DnD Context Setup (`PlaylistDetail.tsx`):

```tsx
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-white/5">
            {entries.map((entry, idx) => (
                <SortableTrackRow
                    key={entry.id}
                    entry={entry}
                    idx={idx}
                    getIconForType={getIconForType}
                    formatDuration={formatDuration}
                    copyPlayCommand={copyPlayCommand}
                    onDelete={handleDeleteEntry}
                />
            ))}
        </div>
    </SortableContext>
</DndContext>
```

#### Reorder Handler (`index.ts`):

```typescript
server.put('/playlists/:id/reorder', async (req: any, reply: any) => {
    const playlistId = req.params.id;
    const { entryIds } = req.body || {};
    if (!Array.isArray(entryIds)) {
        return reply.status(400).send({ error: 'entryIds array is required' });
    }

    const playlists = await getPlaylists();
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return reply.callNotFound();

    const entryMap = new Map(playlist.entries.map((e) => [e.id, e]));
    const sortedEntries: PlaylistEntry[] = [];
    const seen = new Set<string>();

    for (const id of entryIds) {
        if (seen.has(id)) continue;
        const entry = entryMap.get(id);
        if (entry) {
            sortedEntries.push(entry);
            seen.add(id);
        }
    }

    const remaining = playlist.entries.filter((e) => !seen.has(e.id));
    playlist.entries = [...sortedEntries, ...remaining];

    await savePlaylists(playlists);
    return playlist;
});
```

---

### Issue #65: Loop, Shuffle, and Repeat Play Commands

- **State Properties**: Extended the queue state in `apps/bot/src/core/music-player.ts` with `loopTrack` and `loopQueue`.
- **Exclusivity Logic**: Loop (track-level) and Repeat (queue-level) are mutually exclusive. Turning loop on disables repeat, and vice versa.
- **Queue Shuffling**: Employs a classical **Fisher-Yates** shuffle algorithm. If a track is currently playing, it shuffles the upcoming sub-array (`queue.songs.slice(1)`) to avoid stopping the active stream.
- **Commands**: Slash commands `/loop`, `/repeat`, and `/shuffle` are registered to call these toggle functions on the player.

#### Fisher-Yates Shuffling & Queue Management (`music-player.ts`):

```typescript
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function shuffleQueue(interaction: ChatInputCommandInteraction): Promise<void> {
    const voiceChannel = await validateInteraction(interaction);
    if (!voiceChannel) return;
    const queue = getQueue(voiceChannel.id);
    if (!queue) {
        await interaction.reply({
            content: 'There is no active queue to shuffle.',
            ephemeral: true,
        });
        return;
    }

    if (!queue.nowPlaying) {
        if (queue.songs.length < 2) {
            await interaction.reply({
                content: 'There are not enough songs to shuffle.',
                ephemeral: true,
            });
            return;
        }
        queue.songs = shuffleArray(queue.songs);
    } else {
        if (queue.songs.length < 3) {
            await interaction.reply({
                content: 'There are not enough upcoming songs to shuffle.',
                ephemeral: true,
            });
            return;
        }
        const upcoming = queue.songs.slice(1);
        const shuffled = shuffleArray(upcoming);
        queue.songs = [queue.songs[0], ...shuffled];
    }
    await interaction.reply('🔀 **Queue shuffled successfully!**');
}
```

---

### Issue #66: Playlist Thumbnail Options

- **Mimetype Checking**: Restricts thumbnail file uploads to `image/jpeg`, `image/png`, `image/gif`, and `image/webp`. Rejecting any other files at the Fastify level ensures security and compliance.
- **Auto-Resolution**: Spawns `yt-dlp -J` via the host's `fetchVideoData` utility to dump metadata and extract original video thumbnails when adding YouTube links without overriding them.
- **Vinyl Visual Styling**: Renders a black vinyl record layout inside `PlaylistCard.tsx` with a radial gradient representing grooves. The circular record center label displays the first track's resolved thumbnail (or a generic music icon fallback).

#### Vinyl Center Label Setup (`PlaylistCard.tsx`):

```tsx
<div className="absolute inset-0 flex items-center justify-center">
    <div className="w-1/3 h-1/3 rounded-full flex items-center justify-center shadow-inner overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600">
        {playlist.entries.find((e) => e.thumbnail)?.thumbnail ? (
            <img
                src={playlist.entries.find((e) => e.thumbnail).thumbnail}
                alt={playlist.name}
                className="w-full h-full object-cover"
            />
        ) : (
            <Icon name="music" className="text-white w-6 h-6" />
        )}
    </div>
</div>
```

---

## 3. Test Coverage Analysis & Gaps

### Current Status

An analysis of the test suite reveals a substantial coverage gap:

- **Core Host Coverage**: Core modules are covered by tests under `apps/bot/src/core/plugins/__tests__/` (`hook-manager.test.ts` and `plugin-manager.test.ts`).
- **Plugin Coverage**: The Garage Band plugin folder contains **0% test coverage**. There are no unit or integration tests verifying the Fastify REST endpoints, SQLite storage reads/writes, or Slash commands.

### Test Coverage Gaps

1. **API Endpoints**: No automated testing verifies the payload schema validation or the logic for `PUT /playlists/:id/reorder`.
2. **File Processing**: Audio durations from `ffprobe` and uploaded image mimetype checking are not unit tested with mocked file payloads.
3. **Discord Integration**: Autocomplete option retrieval logic lacks mock tests simulating the Discord interaction responses.

---

## 4. Recommendations to Complete Epic & Pitfalls/Mitigations

### Pitfall: Node.js Runtime Version Mismatch

- **Issue**: Developers or CI runners executing the application under newer Node.js releases (e.g. Node v26.2.0) will encounter a native bindings compilation failure for `better-sqlite3`. This occurs because newer V8 runtime releases have deprecated and removed legacy C++ hooks (e.g., `v8::PropertyCallbackInfo<T>::This()`), which the native bindings library depends on.
- **Mitigation**:
    1. Enforce alignment with the target version defined in `.nvmrc` (`24.9.0`) by adding a preinstall script hook in `package.json` to reject execution on unsupported runtimes (e.g. `"preinstall": "node -e \"process.version.startsWith('v24') || process.exit(1)\"`).
    2. Alternatively, upgrade the `better-sqlite3` dependency to a release that compiles against modern V8 API specifications.

### Gaps Resolution

- Introduce a suite of vitest mocks under the plugin directory testing:
    1. The namespaced storage integration using a mocked `PluginContext.db.plugin`.
    2. Fastify endpoint routing using `fastify.inject` to simulate HTTP requests to reorder and upload endpoints without binding live server ports.

---

## 5. Draft Plan for Next Phase (Phase 3)

### Monetization & Premium Integration

- **Stripe Webhooks**: Implement subscription events routing to verify a user's Premium subscription status.
- **Tier Checking**: Add access control middleware to query customer status using core database access.
- **Limits Enforcement**: Restrict playlist limits based on tiers (e.g., Free users are limited to 3 playlists of 50 tracks each; Premium users receive unlimited space).

### Advanced UI Extensions

- **Multi-Track Mixing**: Enable real-time crossfading and basic track gain adjustments between songs.
- **Real-Time Collaboration**: Integrate Fastify WebSockets to sync playlist ordering changes, showing active cursors and reordering animations to all users curating the same playlist simultaneously.
- **Visualizer Dashboard**: Embed an audio visualizer canvas widget matching the vinyl theme.

---

## 6. Test Release Verification

### Export Integrity Check

The test release package was built and exported using:

```bash
pnpm --filter jasper-bot run plugin:export garage-band
```

This successfully output the archive `apps/bot/exports/garage-band-1.0.0.zip`.

### Staged ZIP Archive Layout:

- `jasper-plugin.json` (Plugin manifest metadata and frontend page routes)
- `index.js` (Compiled ESM backend code)
- `web/index.js` (Compiled React frontend assets bundled in IIFE format)

### Release Repository Consistency

This layout perfectly matches the release target rules configured in the automated workflow for the release repository `purrfectsoft/jasper-plugin-garage-band-releases`. The production compiler maps external libraries (`react`, `react-dom`, `@jasper/elements`, and `@jasper/ui`) directly to the host-provided global symbols inside the IIFE bundle wrapper, preventing size bloat and dependency clashes.
