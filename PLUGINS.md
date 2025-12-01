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

*   **Sample Plugin** (`sample-plugin`): A reference implementation demonstrating frontend widgets and pages.
*   **Sound Effect Plugin** (`sound-effect-plugin`): Plays sound effects when bots join channels.



