# Jasper Extensions API

> **Status**: Stable / Implemented
> **Last Updated**: 2025-11-27

The **Jasper Extensions API** allows developers to extend the functionality of the Jasper Music Bot without modifying the core codebase. Plugins can add new commands, listen to events, expose web routes, and store persistent data.

---

## 🏗️ Architecture Overview

The plugin system is built on four main pillars:

1.  **Plugin Manager**: Handles the lifecycle (loading/unloading) of plugins and enforces strict structure.
2.  **Hook System**: A pub/sub event system allowing plugins to react to core bot events (e.g., music starting, queue creation).
3.  **Database Abstraction**: Provides **scoped** Read-Write access to a plugin's own data and **Read-Only** access to global bot statistics.
4.  **Scoped Logging**: Automatically prefixes log messages with the plugin's name for easier debugging.

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
    "version": "1.0.0",
    "description": "Adds amazing features to Jasper.",
    "entry": "index.ts"
}
```

---

## 🔌 The Plugin Interface

Your `index.ts` must default export an object implementing the `Plugin` interface:

```typescript
import { Plugin, PluginContext } from "../../core/plugins/plugin-interface.js";

const MyPlugin: Plugin = {
    name: "My Cool Plugin",
    version: "1.0.0",
    description: "Optional description",

    onLoad: async (context: PluginContext) => {
        context.logger.info("Plugin loaded!");
        // Initialize your plugin here
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("Plugin unloaded!");
        // Cleanup resources here
    }
};

export default MyPlugin;
```

---

## 🧰 The Plugin Context

The `PluginContext` passed to `onLoad` provides access to all core features.

### 1. Core Access
-   `context.client`: The main Discord.js `Client` (Controller).
-   `context.workers`: Array of `WorkerState` objects (Worker bots).
-   `context.server`: The Fastify web server instance.

### 2. Scoped Logger
Use `context.logger` to log messages. They will be automatically prefixed with `[Plugin Name]`.

```typescript
context.logger.info("Hello"); // Output: [INFO] ... [My Cool Plugin] Hello
context.logger.error("Something went wrong");
```

### 3. Database Access (`context.db`)
*   **Plugin Storage (Read-Write)**: Scoped to your plugin. Keys are prefixed internally.
    ```typescript
    await context.db.plugin.set("config", { enabled: true });
    const config = await context.db.plugin.get("config");
    ```
*   **Core Data (Read-Only)**: Access global stats.
    ```typescript
    const topSongs = await context.db.core.getTopSongs(10);
    ```

### 4. Web Server (`context.server`)
Register new API routes or web pages. **Note**: Use the `SERVER_READY` hook to ensure the server is initialized.

```typescript
context.on("SERVER_READY", ({ server }) => {
    server.get("/api/my-plugin", async (req, reply) => {
        return { message: "Hello from plugin!" };
    });
});
```

### 5. Commands
Register dynamic slash commands.

```typescript
context.registerCommand({
    data: { name: "ping-plugin", description: "Replies with Pong" },
    execute: async (interaction) => await interaction.reply("Pong!")
});
```

---

## 🎣 Hooks Reference

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

**Example:**
```typescript
context.on<SongPlayData>("PRE_MUSIC_PLAY", ({ song }) => {
    context.logger.info(`Now playing: ${song.title}`);
});
```

---

## 🚀 Example Plugin

Here is a complete example of a plugin that greets users when a queue is created and tracks how many times it has greeted them.

```typescript
import { Plugin, PluginContext, QueueCreateData } from "../../core/plugins/plugin-interface.js";

const GreeterPlugin: Plugin = {
    name: "Greeter Plugin",
    version: "1.0.0",

    onLoad: async (context: PluginContext) => {
        context.logger.info("Greeter loaded!");

        context.on<QueueCreateData>("QUEUE_CREATE", async ({ queue }) => {
            // 1. Play a sound (if implemented)
            context.logger.info(`Queue created in ${queue.voiceChannelId}`);

            // 2. Update stats in DB
            const stats = (await context.db.plugin.get("greets")) || { count: 0 };
            stats.count++;
            await context.db.plugin.set("greets", stats);
            
            context.logger.info(`Total greets: ${stats.count}`);
        });
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("Greeter unloaded!");
    }
};

export default GreeterPlugin;
```
