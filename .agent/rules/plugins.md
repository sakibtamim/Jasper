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

## 4. Out-of-Tree Development Workflow (External Repos)
> **Goal**: Develop a plugin in a separate git repository (e.g., `../my-plugin`) while running it inside Jasper.

### Phase 1: Infrastructure Setup
1.  **Directory**: Create the plugin directory *outside* the Jasper repo (e.g., `../<plugin-id>`).
2.  **Git**: Initialize `git` in that external directory immediately.
3.  **Link**: Run `pnpm --filter jasper-bot run plugin:link <absolute-path-to-plugin>`.
    - This creates a symlink in `apps/bot/src/plugins/<id>`.

### Phase 2: Monorepo Configuration (Critical)
To allow Vite to serve files from outside the monorepo root, you **MUST** ensure `apps/web/vite.config.ts` is configured correctly:
1.  **FS Allow**: Add `path.resolve(__dirname, '../../..')` to `server.fs.allow` to permit serving sibling directories.
2.  **Aliases**: Ensure `@jasper/elements` and `@jasper/ui` aliases point to `../../packages/<pkg>/src` (not just `node_modules`).
    - *Why?* External files won't find `node_modules` in their parent chain. Explicit aliases force Vite to resolve correctly.

### Phase 3: External Dependencies
1.  **Initialize**: Run `pnpm init` in the external plugin directory to create a `package.json`.
2.  **Install**: Run `pnpm add -D react react-dom @types/react` in the external directory.
    - *Why?* Even though we don't bundle these, the local editor (LSP) and Vite's pre-bundler need to resolve them relative to the file.
3.  **Imports**: In your code, import from `@jasper/*` packages as usual.

### Phase 4: Version Control
1.  **Jasper Repo**: Commit the **symlink** and any `vite.config.ts` changes.
2.  **Plugin Repo**: Commit the actual source code (`index.ts`, `web/`, `package.json`).
3.  **Push**: Push the plugin repo to its own remote (e.g., `purrfectsoft/jasper-plugin-<id>`).

## 5. Coding Standards
- **No Global Scope Pollution**: Do not attach to `global` or `window` (except for expected IIFE exports).
- **Cleanup**: Always implement `onUnload` to clear intervals, listeners, and subscriptions.
- **Async Safety**: Use `try/catch` blocks inside all hook callbacks (`onLoad`, `onUnload`, etc.).
- **Backend Imports**: For out-of-tree plugins, verify backend imports point to `../../Jasper/...` or use appropriate aliases if available.
