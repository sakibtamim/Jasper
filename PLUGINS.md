# Jasper Extensions API

> **Status**: Stable / Implemented
> **Last Updated**: 2025-11-28

The **Jasper Extensions API** allows developers to extend the functionality of the Jasper Music Bot without modifying the core codebase. Plugins can add new commands, listen to events, expose web routes, and store persistent data.

---

## 🏗️ Architecture Overview

The plugin system is built on four main pillars:

1.  **Plugin Manager** – Discovers, validates, and loads plugins from `apps/bot/src/plugins`.
2.  **Hook System** – Pub/sub bridge between the core bot and plugins.
3.  **Database Abstraction** – Safe, namespaced storage for plugins + read-only core stats.
4.  **Scoped Logging** – Per-plugin log channels for debugging.

> **Note:** If a plugin's manifest is missing or invalid (e.g., missing `id`), the Plugin Manager will log an error and skip loading that plugin.

---

## 👩‍💻 Developer Guide

For detailed instructions on how to create, build, and publish plugins, please refer to the **[Plugin Development Guide](PLUGINS_DEV.md)**.

It covers:

- **Backend Development**: Hooks, Database, API Routes
- **Frontend Development**: React Widgets, Pages, Navigation
- **Full-Stack Integration**: Connecting Frontend and Backend
- **Building & Exporting**: Packaging your plugin

---

## 📂 Plugin Directory

All plugins reside in the `apps/bot/src/plugins/` directory. Each plugin must be a **directory** containing at least two files:

1.  `jasper-plugin.json`: The manifest file defining metadata.
2.  `index.ts`: The entry point exporting the plugin object.

**Example Structure:**

```text
apps/bot/src/plugins/
  └── my-cool-plugin/
      ├── jasper-plugin.json
      ├── index.ts
      └── web/ (optional frontend)
```

---

## 📦 Available Plugins

- **Sample Plugin** (`sample-plugin`): A reference implementation demonstrating frontend widgets and pages.
- **Sound Effect Plugin** (`sound-effect-plugin`): Plays sound effects when bots join channels.
- **Garage Band** (`garage-band`): Playlist creation and audio enhancement (managed via out-of-tree submodule).
- **Soundboard** (`soundboard`): Sound effect management and playback.

---

## 🛡️ Security & Execution Boundary

> [!IMPORTANT]
> **Plugins are Trusted Node Code**: Plugins run in-process with ordinary Node.js authority and share the process memory and runtime environment. Fastify route encapsulation is an organizational primitive, not a security sandbox.
> In hosted multi-tenant profiles, only build-time allowlisted and integrity-verified plugins are admitted.

### Plugin SDK vNext Roadmap

Under [`HJ-OSS-10`](docs/hosted-jasper/mvp-issue-plan.md#hj-oss-10--version-the-plugin-sdk-for-typed-policy-lifecycle-and-capabilities), the Plugin SDK is evolving to include:

1. **Mandatory `GuildScope`**: Explicit `(guildId, installationId)` scoping on all database, asset, and hook interfaces.
2. **Typed Default-Deny Routes**: JSON Schema validation and action-based access declarations for all plugin HTTP endpoints.
3. **Lifecycle Disposal Handles**: Clean unbind handles for all registered hooks and scheduled tasks upon plugin unload.
4. **Isolated Audio Enqueue**: Stable audio enqueue service ([`HJ-OSS-13`](docs/hosted-jasper/mvp-issue-plan.md#hj-oss-13--expose-stable-plugin-audio-enqueue-service)) replacing direct imports into core music player code.
