# Jasper Plugin Development Guide

> **Note**: This guide assumes you are working within the Jasper monorepo.

## 🚀 Getting Started

Jasper plugins allow you to extend the bot's functionality (Backend) and the dashboard's UI (Frontend). Plugins are located in `apps/bot/src/plugins/`.

### Prerequisites

- Node.js v24+ & pnpm
- Basic knowledge of TypeScript and React

### Directory Structure

A typical full-stack plugin looks like this:

```text
apps/bot/src/plugins/
  └── my-plugin/
      ├── jasper-plugin.json  # Manifest
      ├── index.ts            # Backend Entry
      └── web/                # Frontend Directory
          └── index.tsx       # Frontend Entry
```

---

## 📜 The Manifest (`jasper-plugin.json`)

Every plugin requires a `jasper-plugin.json` file in its root.

```json
{
    "id": "my-plugin",
    "name": "My Plugin",
    "version": "1.0.0",
    "description": "A description of my plugin",
    "entry": "index.ts",
    "web": {
        "entry": "web/index.tsx",
        "navItems": [
            {
                "id": "my-nav",
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
                "order": 10
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

---

## ⚙️ Backend Development

The backend entry point (default `index.ts`) must export an object implementing the `Plugin` interface.

### Basic Structure

```typescript
import { Plugin, PluginContext } from '@jasper/types';

const MyPlugin: Plugin = {
    name: 'My Plugin',
    version: '1.0.0',

    onLoad: async (context: PluginContext) => {
        context.logger.info('My Plugin loaded!');

        // Register an API route
        context.server.get('/hello', async (req, reply) => {
            return { message: 'Hello from backend!' };
        });

        context.registerCommand({
            data: { name: 'hello', description: 'Say hello' },
            execute: async (interaction) => await interaction.reply('Hello!'),
        });
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info('My Plugin unloaded!');
    },
};

export default MyPlugin;
```

### Key Features

- **Logging**: Use `context.logger` for scoped logs.
- **Database**: Use `context.db.plugin` for your plugin's data.
- **Hooks**: Listen to events like `QUEUE_CREATE` or `POST_MUSIC_PLAY` using `context.on()`.
- **API Routes**: Register routes on `context.server`. Routes are automatically namespaced to `/api/plugins/{pluginId}`.
- **Storage**: Use `context.storage` to save and retrieve files.

### Storage API

Plugins have access to a namespaced, persistent storage directory.

```typescript
// Save a file (returns a URI like storage://my-plugin/image.png)
const uri = await context.storage.save('image.png', buffer);

// Get a file
const buffer = await context.storage.get('image.png');

// Delete a file
await context.storage.delete('image.png');

// List files
const files = await context.storage.list();

// Resolve URI to filesystem path and web URL
const { fsPath, webUrl } = context.storage.resolve(uri);
```

### Audio Playback API

Plugins can play audio files in voice channels using `context.playAudio()`:

```typescript
await context.playAudio({
    voiceChannelId: '123456789',
    guildId: '987654321',
    audioPath: '/absolute/path/to/audio.mp3',
    title: '🔊 Sound Effect', // Optional
    requesterId: userId,
    channelId: '123456789', // Optional: Text channel ID for welcome messages
});
```

**How it works:**

- **Existing Queue**: If bot is already in the channel, plays audio directly on existing player
- **New Connection**:
    - Allocates a worker bot
    - Joins voice channel
    - Waits for `VoiceConnectionStatus.Ready` (max 5s) to ensure audio is heard
    - Sends a personalized welcome message to the text channel (if `channelId` provided)
    - Detects audio duration using ffprobe
    - Plays audio
    - Auto-disconnects after duration + 1 second buffer
- **Error Handling**: Automatically cleans up resources on error
- **Requirements**: Requires `ffprobe` in PATH for duration detection (falls back to 10s default)

**Example use cases:**

- Soundboard sound effects
- Join/leave announcement sounds
- Achievement notifications
- Custom bot event sounds

---

## 🖥️ Frontend Development

Plugins can extend the web dashboard using React components.

> [!IMPORTANT]
> **CRITICAL: React Imports**
> Plugins **MUST** import React and hooks from `@jasper/elements` instead of `react`. This ensures your plugin uses the same React instance as the host application.
>
> **✅ Correct:**
>
> ```typescript
> import { useEffect, useState } from '@jasper/elements';
> ```
>
> **❌ Incorrect:**
>
> ```typescript
> import React, { useState } from 'react';
>
> // DO NOT DO THIS
> ```
>
> **Shared Hooks**:
> We provide a set of shared hooks in `@jasper/hooks` to interact with the core system.
>
> ```typescript
> import { useAuth, usePluginContext, usePluginStorage } from '@jasper/hooks';
> ```

### Plugin Loading & HMR

The frontend uses a split loading strategy for development and production:

- **Development (`usePlugins.dev.ts`)**: Uses Vite's `import.meta.glob` to load plugin source code directly. This enables Hot Module Replacement (HMR) for rapid development.
- **Production (`usePlugins.prod.ts`)**: Loads pre-built IIFE bundles via dynamic `<script>` tags. Plugins must access shared dependencies (React, etc.) via global variables exposed on `window`.

#### 1. Entry Point (`web/index.tsx`)

The frontend entry point must export components that you want to register. It does **not** need a default export.

### Basic Structure

```tsx
import React from 'react';

import { Button, Card } from '@jasper/ui';

// Component for the dashboard widget
export const MyWidget = () => (
    <Card>
        <h3>My Widget</h3>
        <Button onClick={() => alert('Clicked!')}>Click Me</Button>
    </Card>
);

// Component for the full page
export const MyPage = () => (
    <div className="p-6">
        <h1>My Plugin Page</h1>
        <p>Welcome to my plugin page.</p>
    </div>
);
```

### Available Components

You can import shared UI components from `@jasper/ui`:

- `Card`, `Button`, `Input`, `Table`, `Badge`, `Loader`, etc.

### Context

Components receive a `context` prop with access to:

- `user`: Current user info
- `api`: Pre-configured API client
- `theme`: Dark/light mode state

---

## 🔗 Full-Stack Integration

To build a complete feature, your frontend needs to talk to your backend.

1.  **Backend**: Define a route in `onLoad`.

    ```typescript
    // apps/bot/src/plugins/my-plugin/index.ts
    context.server.get('/stats', async () => {
        return { count: 42 };
    });
    ```

    _This creates `GET /api/plugins/my-plugin/stats`_

2.  **Frontend**: Fetch data using the path.

    ```tsx
    // apps/bot/src/plugins/my-plugin/web/index.tsx
    import { useEffect, useState } from 'react';

    export const MyWidget = () => {
        const [stats, setStats] = useState(null);

        useEffect(() => {
            fetch('/api/plugins/my-plugin/stats')
                .then((res) => res.json())
                .then((data) => setStats(data));
        }, []);

        if (!stats) return <div>Loading...</div>;
        return <div>Count: {stats.count}</div>;
    };
    ```

---

## 🛠️ Building & Exporting

### Building

To build your plugin (specifically the frontend bundle):

```bash
# From the root of the monorepo
pnpm build
```

This runs `apps/bot/scripts/build-plugins.ts`, which compiles the `web/` directory of each plugin into `dist/plugins/{id}/web/`.

### Exporting

To package your plugin for distribution (creates a `.zip` file):

```bash
# Export compiled plugin (for production)
pnpm --filter jasper-bot run plugin:export my-plugin

# Export source code (for sharing with devs)
pnpm --filter jasper-bot run plugin:export my-plugin --src
```

The zip file will be created in the `exports/` directory.

---

## 🧰 CLI Tools

We provide several scripts to help with plugin development. Run these from the root using `pnpm --filter jasper-bot run <command>` or from `apps/bot` directory.

| Command               | Description                                                                 |
| :-------------------- | :-------------------------------------------------------------------------- |
| `plugin:scaffold`     | Interactive wizard to create a new plugin.                                  |
| `plugin:validate`     | Checks your plugin for errors and missing files.                            |
| `plugin:export <id>`  | Packages your plugin into a `.zip` file. Use `--src` to export source code. |
| `plugin:import <zip>` | Imports a plugin from a zip file.                                           |

---

## 🌳 Out-of-Tree Development

You can develop plugins in a separate repository and link them into the Jasper monorepo for testing.

### Workflow 1: Local Linking (Recommended for Dev)

1.  Create your plugin in a separate directory (e.g., `~/my-jasper-plugins/cool-plugin`).
2.  Ensure it has a valid `jasper-plugin.json`.
3.  Run the link command from the Jasper root:

    ```bash
    pnpm --filter jasper-bot run plugin:link ~/my-jasper-plugins/cool-plugin
    ```

4.  Start Jasper (`pnpm dev`). The plugin will be loaded.
5.  To remove the link:

    ```bash
    pnpm --filter jasper-bot run plugin:unlink cool-plugin
    ```

### Workflow 2: Git Submodules (Recommended for Production/Teams)

If you want to include an external plugin in your deployment:

1.  Add the plugin repository as a submodule in `apps/bot/src/plugins/`:

    ```bash
    cd apps/bot/src/plugins
    git submodule add https://github.com/username/my-plugin.git
    ```

2.  Commit the submodule change.
3.  The build system will treat it as a normal directory.

---

## 📚 Reference Plugins

We provide several reference plugins in the `apps/bot/src/plugins` directory to help you get started.

### 1. Dashboard Notes (`dashboard-notes`)

**Type**: Full-Stack (Backend + Frontend)

A complete CRUD application that allows users to manage personal notes from the dashboard.

- **Backend**:
    - Implements a REST API (`GET`, `POST`, `DELETE`) for managing notes.
    - Uses `context.db.plugin` to persist data safely.
    - Demonstrates input validation and error handling.
- **Frontend**:
    - **Widget**: Displays a quick view of recent notes on the main dashboard.
    - **Page**: A full management interface with a table, form, and delete actions.
    - **UI**: Uses `@jasper/ui` components (`Card`, `Table`, `Button`) for a native look.
- **DX Tip**: Check `web/index.tsx` to see how to share state logic (hooks) between the Widget and the Page.

### 2. Sound Effect Plugin (`sound-effect-plugin`)

**Type**: Backend Only

Plays a sound effect when the bot joins a voice channel.

- **Backend**:
    - Listens to the `QUEUE_CREATE` hook to detect when the bot joins a channel.
    - Uses `queue.player.play()` to inject audio into the stream.
    - Demonstrates how to interact with the core audio engine.
- **DX Tip**: This is a great example of how to build "reactive" plugins that respond to bot events.

### 3. Advanced Hooks Test (`advanced-hooks-test-plugin`)

**Type**: Backend Only

Verifies the functionality of advanced lifecycle hooks.

- **Backend**:
    - Logs events for `SERVER_READY`, `WORKER_ASSIGNED`, and `VOICE_STATE_UPDATE`.
    - Demonstrates how to access the Fastify server instance and Worker state.

### 4. Jasper Soundboard (`soundboard`)

**Type**: Full-Stack (Backend + Frontend + Audio)

A complete soundboard system that allows users to upload sounds via the dashboard and play them via slash commands or a persistent UI.

- **Backend**:
    - Registers a complex slash command with subcommands (`menu`, `play`, `ui`).
    - Implements a **concurrency queue** to handle multiple sound requests safely without crashing the bot.
    - Uses `context.playAudio()` with a custom queue management system.
    - Demonstrates how to handle Discord interactions (Buttons, Select Menus, Autocomplete) globally.
- **Frontend**:
    - **Page**: A management interface to upload, rename, and delete sounds.
    - Uses `usePluginStorage` for sound files and `usePluginContext` for database records.
- **DX Tip**: Check `commands/soundboard.ts` and `core/plugins/plugin-manager.ts` to see how to implement safe concurrent audio playback and prevent "button mashing" with rate limits.

### 5. Media Gallery (`media-gallery`)

**Type**: Full-Stack (Storage API Demo)

Demonstrates how to use the Extension Storage API to upload, view, and manage files.

- **Backend**: Minimal (just loads the plugin).
- **Frontend**:
    - Uses `usePluginStorage` hook from `@jasper/hooks`.
    - **Widget**: Displays the latest 3 uploaded images.
    - **Page**: Allows uploading new images and deleting existing ones.
    - Demonstrates how to handle file uploads and display images using the storage URL.

## 🔧 Plugin Management

### Listing Plugins

```bash
pnpm --filter jasper-bot run plugin:list
```

Shows all installed plugins with their enabled/disabled status.

### Enabling/Disabling Plugins

```bash
# Enable a plugin
pnpm --filter jasper-bot run plugin:enable

# Disable a plugin
pnpm --filter jasper-bot run plugin:disable
```

### Production Defaults

In production (`NODE_ENV=production`), test plugins are automatically disabled:

- `advanced-hooks-test-plugin`
- `db-test-plugin`
- `dashboard-notes`
- `media-gallery`

The `soundboard` and `sound-effect-plugin` plugins remain enabled as they are functional features.

You can override these defaults using the CLI commands above.
