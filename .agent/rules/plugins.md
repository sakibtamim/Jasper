---
trigger: always_on
---

# Plugin Development Rules

> **Context**: These rules apply to the development of plugins for the Jasper platform.

## Plugin Structure
- **Manifest**: Every plugin MUST have a `jasper-plugin.json` file in its root.
  - `id`: Lowercase, alphanumeric, dashes only.
  - `name`: Display name.
  - `version`: Semantic versioning.
  - `entry`: Backend entry point (default: `index.js`).
  - `web`: Frontend entry point (optional, e.g., `web/index.js`).
- **Directory**: Plugins reside in `apps/bot/src/plugins/<id>/`.

## Backend Development
- **Entry Point**: Must export a default object implementing the `Plugin` interface.
- **Context**: Use `PluginContext` for all interactions (logging, DB, hooks).
- **Database**: Use `context.db.plugin` for plugin-specific data. Do NOT access the core database directly unless via `context.db.core` (read-only).
- **Hooks**: Register hooks via `context.on(HookName, callback)`.
  - `QUEUE_CREATE`: Triggered when a queue is created.
  - `PRE_MUSIC_PLAY`: Triggered before a song plays.
  - `POST_MUSIC_PLAY`: Triggered after a song plays.
- **API Routes**: Register routes via `context.server`. All routes are automatically scoped to `/api/plugins/<id>`.

## Frontend Development
- **Entry Point**: `web/index.tsx` (or `.js`).
- **Registration**: Use `ComponentRegistry.register()` to map components to IDs.
- **Slots**: Use `ExtensionSlot` to render widgets in the main UI.
- **Styles**: Use Tailwind CSS. Avoid global CSS files; use CSS modules or Tailwind utility classes.

## Testing
- **Unit Tests**: Place tests in `__tests__` directory within the plugin or core module.
- **Integration Tests**: Verify plugin loads and unloads correctly using the test harness.
- **Mocking**: Mock `PluginContext` for unit testing plugin logic.

## Build & Publish
- **Build**: Run `turbo run build` to compile plugins.
- **Export**: Run `pnpm run export-plugin <id>` to create a distributable `.zip`.
