# Jasper Extensions API

> **Status**: Stable / Implemented
> **Last Updated**: 2025-11-28

The **Jasper Extensions API** allows developers to extend the functionality of the Jasper Music Bot without modifying the core codebase. Plugins can add new commands, listen to events, expose web routes, and store persistent data.

---

## 🏗️ Architecture Overview

The plugin system is built on four main pillars:

1.  **Plugin Manager** – Discovers, validates, and loads plugins from `src/plugins`.
2.  **Hook System** – Pub/sub bridge between the core bot and plugins.
3.  **Database Abstraction** – Safe, namespaced storage for plugins + read-only core stats.
4.  **Scoped Logging** – Per-plugin log channels for debugging.

> **Note:** If a plugin's manifest is missing or invalid (e.g., missing `id`), the Plugin Manager will log an error and skip loading that plugin.

---

## 📂 Plugin Structure

All plugins **must** reside in the `src/plugins/` directory. Each plugin must be a **directory** containing at least two files:

1.  `jasper-plugin.json`: The manifest file defining metadata.
2.  `index.ts`: The entry point exporting the plugin object.

**Example Structure:**
```text
src/plugins/
  └── my-cool-plugin/
      ├── jasper-plugin.json
      ├── index.ts
      └── assets/ (optional)
```

### Manifest (`jasper-plugin.json`)

```json
{
  "name": "My Cool Plugin",
  "id": "my-cool-plugin",
  "version": "1.0.0",
  "description": "Adds amazing features to Jasper.",
  "entry": "index.ts",
  "author": "example-author",
  "license": "MIT",
  "jasperVersion": "^1.0.0"
}
```

*   **`name`** (Required): Human-readable name.
*   **`id`** (Required): Filesystem-safe, unique identifier (lowercase, alphanumeric, dashes). Used for DB namespacing and web routes.
*   **`version`** (Required): Plugin version.
*   **`entry`** (Optional): Entry file (defaults to `index.ts`).
*   **`jasperVersion`** (Optional): Semver range of compatible Jasper Core versions. The system will warn if the core version doesn't satisfy this range.
*   **`author`, `license`** (Optional): Metadata.

---

## 🧰 PluginContext Cheat Sheet

The `PluginContext` passed to `onLoad` provides access to all core features.

```typescript
type PluginContext = {
  client: Client;            // Discord.js Client
  workers: WorkerState[];    // Worker bot states
  server: FastifyInstance;   // Scoped web server instance

  logger: {
      debug(msg: string): void;
      info(msg: string): void;
      warn(msg: string): void;
      error(msg: string): void;
  };

  db: {
    plugin: {
      get<T = unknown>(key: string): Promise<T | null>;
      set<T = unknown>(key: string, value: T): Promise<void>;
      delete(key: string): Promise<void>;
    };
    core: {
      getTopSongs(limit: number): Promise<SongStats[]>;
      getGlobalStats(): Promise<{ totalPlays: number; totalDuration: number }>;
    };
  };

  on<T>(hook: HookName, handler: (payload: T) => void | Promise<void>): void;

  registerCommand(def: SlashCommandDefinition): void;
};
```

---

## 🔌 The Plugin Interface

Your `index.ts` must default export an object implementing the `Plugin` interface:

```typescript
import { Plugin, PluginContext } from "../../core/plugins/plugin-interface.js";

const MyPlugin: Plugin = {
    name: "My Cool Plugin",
    version: "1.0.0",
    
    onLoad: async (context: PluginContext) => {
        context.logger.info("Plugin loaded!");
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("Plugin unloaded!");
    }
};

export default MyPlugin;
```

---

## 🎣 Hooks Guide

Subscribe to hooks using `context.on(HookName, callback)`.

| Hook Name | Description | Data Payload |
| :--- | :--- | :--- |
| `QUEUE_CREATE` | Fired when a bot joins a channel and creates a queue. | `{ queue: Queue, worker: WorkerState }` |
| `PRE_MUSIC_PLAY` | Fired right before a song starts playing. | `{ queue: Queue, song: Song }` |
| `POST_MUSIC_PLAY` | Fired right after a song starts playing. | `{ queue: Queue, song: Song }` |
| `MUSIC_QUEUE_ADD` | Fired when a song is added to the queue. | `{ queue: Queue, song: Song }` |
| `SERVER_READY` | Fired when the Fastify web server is ready. | `{ server: FastifyInstance }` |
| `WORKER_ASSIGNED` | Fired when a worker bot is assigned to a guild. | `{ worker: WorkerState, guildId: string, voiceChannelId: string }` |
| `VOICE_STATE_UPDATE`| Fired when a voice state changes (join/leave/move). | `{ oldState: VoiceState, newState: VoiceState, client: Client }` |

### When to Use Which Hook
*   **`QUEUE_CREATE`** – Per-guild initialization, analytics, greeting SFX.
*   **`PRE_MUSIC_PLAY`** – Logging, pre-play checks, "now playing" overlays.
*   **`POST_MUSIC_PLAY`** – Scrobbling, stats, dashboards.
*   **`SERVER_READY`** – Registering web routes and dashboards.
*   **`WORKER_ASSIGNED`** – Worker/guild affinity tracking.
*   **`VOICE_STATE_UPDATE`** – AFK detection, auto-disconnect, attendance stats.

---

## 🌐 Web Routes & Namespacing

Plugins can expose web routes using `context.server`.

**Important:** Route namespacing is **auto-enforced**. All routes registered by a plugin are automatically scoped to:
`/api/plugins/{pluginId}/**`

**Example:**
If your plugin ID is `my-cool-plugin`:

```typescript
context.on("SERVER_READY", ({ server }) => {
    // This registers: GET /api/plugins/my-cool-plugin/health
    server.get("/health", async () => ({ ok: true }));
});
```

You do **not** need to manually add the prefix. The `server` instance provided in the context is already scoped.

---

## 📦 Version Compatibility

Plugins can declare a `jasperVersion` range in their manifest (e.g., `^1.0.0`).
The core will validate this against the running Jasper version using semver.

*   If the version is **compatible**, the plugin loads normally.
*   If the version is **incompatible**, the system will log a warning but still attempt to load the plugin.

This ensures plugins can safely declare their dependencies on core features.
