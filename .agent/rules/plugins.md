

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
    - Use `@jasper/ui` for primitives (Button, Card, Input).
    - Do not implement custom design systems; match the core look and feel.

## 4. Workflows & Version Control

### Out-of-Tree (Submodule) Strategy
If the user asks to add an external or private plugin:
1.  **DO NOT** clone it manually.
2.  **USE** `git submodule add <url> apps/bot/src/plugins/<id>`.
3.  This ensures the plugin is tracked strictly as a submodule.

### Local Development (Symlink) Strategy
If the user asks to work on a plugin located elsewhere on the disk:
1.  **USE** `pnpm --filter jasper-bot run plugin:link <absolute-path>`.
2.  **DO NOT** copy files manually.

## 5. Coding Standards
- **No Global Scope Pollution**: Do not attach to `global` or `window` (except for expected IIFE exports).
- **Cleanup**: Always implement `onUnload` to clear intervals, listeners, and subscriptions.
- **Async Safety**: Use `try/catch` blocks inside all hook callbacks (`onLoad`, `onUnload`, etc.).
