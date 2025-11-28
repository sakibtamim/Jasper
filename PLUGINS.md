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
      clear(): Promise<void>;
    };
    core: {
      getTopSongs(limit?: number): Promise<SongStats[]>;
      getTopUsers(limit?: number): Promise<UserStats[]>;
      getGlobalStats(): Promise<{ totalPlays: number; totalDuration: number }>;
    };
  };

  on<T>(hook: HookName, handler: (payload: T) => void | Promise<void>): void;

  registerCommand(def: SlashCommandDefinition): void;
};

type SlashCommandDefinition = {
    data: {
        name: string;
        description: string;
        options?: any[];
    };
    execute: (interaction: ChatInputCommandInteraction) => void | Promise<void>;
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
context.onLoad = async (context) => {
    // This registers: GET /api/plugins/my-cool-plugin/health
    context.server.get("/health", async () => ({ ok: true }));
};
```

You do **not** need to manually add the prefix. The `server` instance provided in the context is already scoped.

---

## 📦 Version Compatibility

Plugins can declare a `jasperVersion` range in their manifest (e.g., `^1.0.0`).
The core will validate this against the running Jasper version using semver.

*   If the version is **compatible**, the plugin loads normally.
*   If the version is **incompatible**, the system will log a warning but still attempt to load the plugin.

This ensures plugins can safely declare their dependencies on core features.

---

## 🖥️ Frontend Extensions

The **Frontend Extension System** allows plugins to contribute UI components to the React Dashboard.

### Manifest Schema (`web`)

Plugins declare frontend capabilities in `jasper-plugin.json` under the `web` key:

```json
{
  "id": "my-plugin",
  "web": {
    "entry": "web/index.tsx",
    "navItems": [
      {
        "id": "my-plugin-nav",
        "label": "My Plugin",
        "icon": "activity",
        "href": "/plugins/my-plugin"
      }
    ],
    "widgets": [
      {
        "id": "my-widget",
        "slot": "dashboard:main",
        "component": "MyWidget",
        "order": 100
      }
    ],
    "pages": [
      {
        "id": "my-page",
        "path": "/plugins/my-plugin",
        "component": "MyPage"
      }
    ]
  }
}
```

### Component Registry

Plugins must export their components from the entry file (e.g., `web/index.tsx`). The system automatically registers them based on the manifest.

```tsx
// web/index.tsx
import React from 'react';

export const MyWidget = () => (
  <div className="p-4 bg-white rounded shadow">
    <h3>My Widget</h3>
  </div>
);

export const MyPage = () => (
  <div className="p-8">
    <h1>My Plugin Page</h1>
  </div>
);
```

### Extension Slots

Plugins can inject widgets into specific slots in the dashboard:

| Slot Name | Description |
| :--- | :--- |
| `nav:main` | Main sidebar navigation. |
| `dashboard:main` | Main dashboard content area. |
| `dashboard:stats` | Statistics section on the dashboard. |
| `pages:*` | Full-page routes under `/plugins/{pluginId}/*`. |

---

## 🎨 UI Component Library

To ensure a consistent look and feel, plugins should use the shared UI library `@jasper/ui`.

### Installation
The library is available globally to plugins. You can import components directly:

```typescript
import { Card, Button, Input, Table, Badge, Loader } from '@jasper/ui';
```

### Available Components
*   **`Card`**: Container with shadow and rounded corners.
*   **`Button`**: Standard button with variants (`primary`, `secondary`, `danger`, `ghost`).
*   **`Input`**: Form input with label and error support.
*   **`Table`**: Styled table components (`Table`, `TableHead`, `TableRow`, `TableCell`).
*   **`Badge`**: Status indicators (`success`, `warning`, `error`, `info`).
*   **`Loader`**: Spinner for loading states.
*   **`Image`**: Image wrapper with fallback support.

---

## 🧠 Plugin Context & State

Widgets rendered in an `ExtensionSlot` receive a `context` prop containing application state.

### Context Object
```typescript
interface PluginWidgetContext {
    user: User | null;          // Current authenticated user
    theme: {
        isDark: boolean;        // Current theme state
        toggleTheme: () => void;
    };
    api: ApiClient;             // Pre-configured API client
}
```

### Usage Example
```tsx
export const MyWidget = ({ context }: { context: PluginWidgetContext }) => {
    const { user } = context;
    
    if (!user) return <div>Please login</div>;
    
    return (
        <Card>
            <h3>Hello, {user.username}!</h3>
        </Card>
    );
};
```

---

## 🛡️ Error Handling

All plugin widgets are automatically wrapped in an **Error Boundary**. If your widget crashes, it will display a fallback UI ("Widget Crashed") with a "Try Again" button, preventing the entire dashboard from breaking.

Ensure you handle async errors (like API failures) gracefully within your components using standard React patterns (e.g., `try/catch` or `react-query`).


