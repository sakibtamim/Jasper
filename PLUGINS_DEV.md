# Jasper Plugin Development Guide

> **Note**: This guide assumes you are working within the Jasper monorepo.

## 🚀 Getting Started

Jasper plugins allow you to extend the bot's functionality (Backend) and the dashboard's UI (Frontend). Plugins are located in `apps/bot/src/plugins/`.

### Prerequisites
- Node.js & pnpm
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
import { Plugin, PluginContext } from "../../core/plugins/plugin-interface.js";

const MyPlugin: Plugin = {
    name: "My Plugin",
    version: "1.0.0",
    
    onLoad: async (context: PluginContext) => {
        context.logger.info("My Plugin loaded!");
        
        // Register an API route
        context.server.get("/hello", async (req, reply) => {
            return { message: "Hello from backend!" };
        });
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("My Plugin unloaded!");
    }
};

export default MyPlugin;
```

### Key Features

- **Logging**: Use `context.logger` for scoped logs.
- **Database**: Use `context.db.plugin` for your plugin's data.
- **Hooks**: Listen to events like `QUEUE_CREATE` or `POST_MUSIC_PLAY` using `context.on()`.
- **API Routes**: Register routes on `context.server`. Routes are automatically namespaced to `/api/plugins/{pluginId}`.

---

## 🖥️ Frontend Development

The frontend entry point (default `web/index.tsx`) exports React components that are registered via the manifest.

### Basic Structure

```tsx
import React from 'react';
import { Card, Button } from '@jasper/ui';

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
    context.server.get("/stats", async () => {
        return { count: 42 };
    });
    ```
    *This creates `GET /api/plugins/my-plugin/stats`*

2.  **Frontend**: Fetch data using the path.
    ```tsx
    // apps/bot/src/plugins/my-plugin/web/index.tsx
    import { useEffect, useState } from 'react';
    
    export const MyWidget = () => {
        const [stats, setStats] = useState(null);
        
        useEffect(() => {
            fetch('/api/plugins/my-plugin/stats')
                .then(res => res.json())
                .then(data => setStats(data));
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
pnpm plugin:export my-plugin

# Export source code (for sharing with devs)
pnpm plugin:export my-plugin --src
```
The zip file will be created in the `exports/` directory.

---

## 🧰 CLI Tools

We provide several scripts to help with plugin development:

| Command | Description |
| :--- | :--- |
| `pnpm plugin:scaffold` | Interactive wizard to create a new plugin. |
| `pnpm plugin:validate` | Checks your plugin for errors and missing files. |
| `pnpm plugin:export <id>` | Packages your plugin into a `.zip` file. Use `--src` to export source code. |
| `pnpm plugin:import <zip>` | Imports a plugin from a zip file. |

---

## 📚 Reference Plugins

We provide several reference plugins in the `apps/bot/src/plugins` directory to help you get started.

### 1. Dashboard Notes (`dashboard-notes`)
**Type**: Full-Stack (Backend + Frontend)

A complete CRUD application that allows users to manage personal notes from the dashboard.

*   **Backend**:
    *   Implements a REST API (`GET`, `POST`, `DELETE`) for managing notes.
    *   Uses `context.db.plugin` to persist data safely.
    *   Demonstrates input validation and error handling.
*   **Frontend**:
    *   **Widget**: Displays a quick view of recent notes on the main dashboard.
    *   **Page**: A full management interface with a table, form, and delete actions.
    *   **UI**: Uses `@jasper/ui` components (`Card`, `Table`, `Button`) for a native look.
*   **DX Tip**: Check `web/index.tsx` to see how to share state logic (hooks) between the Widget and the Page.

### 2. Sound Effect Plugin (`sound-effect-plugin`)
**Type**: Backend Only

Plays a sound effect when the bot joins a voice channel.

*   **Backend**:
    *   Listens to the `QUEUE_CREATE` hook to detect when the bot joins a channel.
    *   Uses `queue.player.play()` to inject audio into the stream.
    *   Demonstrates how to interact with the core audio engine.
*   **DX Tip**: This is a great example of how to build "reactive" plugins that respond to bot events.

### 3. Advanced Hooks Test (`advanced-hooks-test-plugin`)
**Type**: Backend Only

Verifies the functionality of advanced lifecycle hooks.

*   **Backend**:
    *   Logs events for `SERVER_READY`, `WORKER_ASSIGNED`, and `VOICE_STATE_UPDATE`.
    *   Demonstrates how to access the Fastify server instance and Worker state.


