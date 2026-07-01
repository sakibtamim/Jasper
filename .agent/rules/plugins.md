---
trigger: always_on
---

# Plugin Development Rules

> **Context**: These rules apply to the AI Agent when creating, modifying, or managing plugins for Jasper.

## 1. File Structure Enforcement

- **Root**: All plugins must reside in `apps/bot/src/plugins/<id>/`.
- **Manifest**: `jasper-plugin.json` is **MANDATORY**.
    - Must contain `id` (kebab-case), `name`, `version`, `entry`.
    - `id` must match the directory name.
- **Backend Entry**: `index.ts` must export a default object complying with the `Plugin` interface.
- **Files**:
    - `web/index.tsx` (Frontend entry)
    - `web/` (Frontend source)

## 2. Command Execution Actions

- **ALWAYS** use the scoped pnpm command: `pnpm --filter jasper-bot run ...`
- **NEVER** run `npm` or `yarn` commands directly inside a plugin folder.
- **Scaffold**: Use `pnpm --filter jasper-bot run plugin:scaffold` to create new plugins if asked to "create a plugin".

## 3. Frontend Development Constraints

- **Imports**:
    - **MUST** import React hooks from `@jasper/elements`.
    - **MUST** import Store hooks from `@jasper/hooks`.
    - **NEVER** import from `react` or `react-dom` directly in plugin code.
- **Components**:
    - Use `@jasper/ui` for primitives (Button, `Icon`, Card, Input).
    - Do not implement custom design systems; match the core look and feel.
- **Registration**: Use `ComponentRegistry.register()` to map components to IDs.
- **Slots**: Use `ExtensionSlot` to render widgets in the main UI.

## 4. Backend Development

- **Context**: Use `PluginContext` for all interactions (logging, DB, hooks).
- **Database**: Use `context.db.plugin` for plugin-specific data. Do NOT access the core database directly unless via `context.db.core` (read-only).
- **Hooks**: Register hooks via `context.on(HookName, callback)`.
    - `QUEUE_CREATE`: Triggered when a queue is created.
    - `PRE_MUSIC_PLAY`: Triggered before a song plays.
    - `POST_MUSIC_PLAY`: Triggered after a song plays.
- **API Routes**: Register routes via `context.server`. All routes are automatically scoped to `/api/plugins/<id>`.

## 5. Out-of-Tree Development Workflow (External Repos)

> **Goal**: Develop a plugin in a separate git repository.

### Workflow A: Shared Plugins (Submodules) - **RECOMMENDED**

Use this for plugins that will be shared with the team.

1.  **Add Submodule**: `git submodule add <url> apps/bot/src/plugins/<id>`
2.  **Commit**: Commit the `.gitmodules` change in the Jasper repo.
3.  **Develop**: Work inside the submodule directory.

### Workflow B: Local Prototyping (Symlinks)

Use this _only_ for local experiments. **DO NOT COMMIT SYMLINKS**.

1.  **Link**: `pnpm --filter jasper-bot run plugin:link <path>`
2.  **Gitignore**: Ensure the symlink is added to `.gitignore` (or just don't commit it).

### Phase 2: Monorepo Configuration (Critical)

To allow Vite to serve files from outside the monorepo root (for symlinked plugins), you **may** need to configure `apps/web/vite.config.ts`.

> [!WARNING]
> Only enable broad FS access in `vite.config.ts` if absolutely necessary for local development. Do not commit unsafe FS allow lists if possible.

### Phase 3: External Dependencies

1.  **Initialize**: Run `pnpm init` in the external plugin directory to create a `package.json`.
2.  **Install**: Run `pnpm add -D react react-dom @types/react` in the external directory.
    - _Why?_ Even though we don't bundle these, the local editor (LSP) and Vite's pre-bundler need to resolve them relative to the file.
3.  **Imports**: In your code, import from `@jasper/*` packages as usual.

### Phase 4: Version Control

1.  **Jasper Repo**: Commit the **symlink** and any `vite.config.ts` changes.
2.  **Plugin Repo**: Commit the actual source code (`index.ts`, `web/`, `package.json`).
3.  **Push**: Push the plugin repo to its own remote (e.g., `purrfectsoft/jasper-plugin-<id>`).

## 6. Coding Standards

- **No Global Scope Pollution**: Do not attach to `global` or `window` (except for expected IIFE exports).
- **Cleanup**: Always implement `onUnload` to clear intervals, listeners, and subscriptions.
- **Async Safety**: Use `try/catch` blocks inside all hook callbacks (`onLoad`, `onUnload`, etc.).

## 7. Testing (Reference)

- **Unit Tests**: Place tests in `__tests__` directory within the plugin or core module.
- **Integration Tests**: Verify plugin loads and unloads correctly using the test harness.
- **Mocking**: Mock `PluginContext` for unit testing plugin logic.

## 8. Build & Publish (Reference)

- **Build**: Run `turbo run build` to compile plugins.
- **Export**: Run `pnpm run export-plugin <id>` to create a distributable `.zip`.

## 9. Security, Extension Fallbacks & Linting

- **Directory Traversal Security**: All plugin loading and toggling mechanisms must resolve `pluginDir` and `entry` file paths using `path.resolve` and enforce that the resolved entry path is strictly contained within the plugin directory:
  `pluginPath.startsWith(resolvedPluginDir + path.sep) || pluginPath === resolvedPluginDir`
  Any paths escaping the plugin root must be rejected immediately to prevent directory traversal.
- **Extension Agnosticism (Bidirectional Fallbacks)**: When resolving the plugin entry file, always implement bidirectional extension fallbacks:
    - If `entry` points to `.ts` but only `.js` exists (compiled/packaged plugins), fall back to `.js`.
    - If `entry` points to `.js` but only `.ts` exists (dev mode source plugins), fall back to `.ts`.
- **ESLint Configuration**: The runtime `apps/bot/plugins/` folder and any compiled JS/IIFE bundles (e.g. `apps/bot/src/plugins/**/web/*.js`) must be excluded from ESLint checks via `ignores` in `eslint.config.mjs` to avoid transpiled code syntax errors.
