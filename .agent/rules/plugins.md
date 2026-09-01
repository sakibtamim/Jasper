---
trigger: always_on
---

# 🔌 Plugin Development Rules

## 1. Directory & File Structure

All plugins live in `apps/bot/src/plugins/<id>/` (using kebab-case IDs).

- **`jasper-plugin.json`** (Mandatory): Must define `id`, `name`, `version`, and `entry` (pointing to the backend entry).
- **Backend Entry (`index.ts`)**: Must default-export an object implementing the core `Plugin` interface.
- **Frontend Entry (`web/index.tsx`)**: The UI interface entry point.

Scaffold new plugins using: `pnpm --filter jasper-bot run plugin:scaffold`

## 2. API & Data Scoping

- **Context**: Access all resources (logger, database, hooks) via `PluginContext`.
- **Database**: Use `context.db.plugin` for plugin tables. Do **not** write directly to core tables.
- **Hooks**: Register to event streams (`QUEUE_CREATE`, `PRE_MUSIC_PLAY`, `POST_MUSIC_PLAY`) using `context.on()`.
- **API Routes**: Register router instances directly on `context.server`. Paths auto-scope to `/api/plugins/<id>`.

## 3. Frontend Development Constraints

- **Imports**: **Never** import from `react` or `react-dom` directly. Import React hooks from `@jasper/elements` and store hooks from `@jasper/hooks`.
- **Components**: Re-use UI elements from `@jasper/ui` to maintain design system consistency. Register components via `ComponentRegistry.register()`.

## 4. Workflows & Security

- **Local Linking**: Run `pnpm --filter jasper-bot run plugin:link <path>` for symlinked development. Do not commit symlinks.
- **Security Check**: Entry files must be strictly contained within the plugin directory (`path.resolve`).
- **Bidirectional Fallbacks**: The plugin loader falls back between `.ts` (dev) and `.js` (prod/compiled) extensions automatically.
