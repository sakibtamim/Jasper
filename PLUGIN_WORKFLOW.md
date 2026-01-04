# Jasper Plugin Workflow Guide

> **Context**: This guide focuses on the *workflow* of developing plugins for Jasper, specifically covering strict architectural patterns, out-of-tree development, and git strategies.

## ⚡ Quick Start

Use the CLI scaffold to generate a valid plugin structure.

```bash
# Run from repository root
pnpm --filter jasper-bot run plugin:scaffold
```

Follow the interactive prompts to create your plugin in `apps/bot/src/plugins/<id>`.

---

## 🏗️ Architecture & Fundamentals

### The "One Graph" Principle
Jasper uses a monolithic graph for both the bot and the web dashboard. Plugins are not isolated microservices; they are modules that are:
1.  **Loaded into the Bot** at runtime (Backend).
2.  **Bundled into the Dashboard** at build time (Frontend).

### Frontend: `@plugins` and `usePlugins`
- **`@plugins` Alias**: Resolves to `apps/bot/src/plugins`.
- **`usePlugins` Hook**:
    - **Dev Mode**: Uses `import.meta.glob` to dynamically import source files (`web/index.tsx`) directly from the file system. This enables **Hot Module Replacement (HMR)**.
    - **Prod Mode**: Loads pre-compiled IIFE bundles via `<script>` tags.

> [!IMPORTANT]
> **React Imports**
> Always import React hooks from `@jasper/elements` and custom hooks from `@jasper/hooks` to ensure context sharing with the host app.
> ```typescript
> import { useState } from '@jasper/elements'; // ✅ Correct
> import { useState } from 'react';            // ❌ WRONG
> ```

---

## 🌳 Out-of-Tree Development Workflows

Jasper supports two primary workflows for keeping your plugin code separate from the core repository.

### Workflow A: The "Private Submodule" (Recommended for Teams)
Use this when you want to host your plugin in a private repository but deploy it as part of the main Jasper instance.

**Setup:**
1.  **Create Repo**: Create an empty git repository for your plugin.
2.  **Add Submodule**: Inside the Jasper repo:
    ```bash
    git submodule add <your-private-repo-url> apps/bot/src/plugins/<your-plugin-id>
    ```
3.  **Scaffold**: Run the scaffold command inside the new directory or copy files into it.
4.  **Commit**: Commit the `.gitmodules` change in the Jasper repo.

**Development Loop:**
1.  Work inside `apps/bot/src/plugins/<your-plugin-id>`.
2.  Commit and push changes **inside the plugin directory** to your private repo.
3.  Commit the **submodule pointer update** in the Jasper repo to lock the version.

**Deploying:**
When deploying Jasper, ensure your CI/CD pipeline initializes submodules:
```bash
git submodule update --init --recursive
```

### Workflow B: The "Local Symlink" (Recommended for Prototyping)
Use this when you want to hack on a plugin that lives entirely outside the Jasper folder structure (e.g., `~/my-projects/cool-plugin`).

**Setup:**
1.  Create your plugin directory anywhere on your machine.
2.  Ensure it has a valid `jasper-plugin.json`.
3.  **Link**:
    ```bash
    # From Jasper root
    pnpm --filter jasper-bot run plugin:link /path/to/your/plugin
    ```
    *This creates a symlink in `apps/bot/src/plugins/<id>`.*

**Development Loop:**
- Run `pnpm dev`.
- Edit files in your external directory.
- Changes are reflected immediately via HMR.

**Cleanup:**
```bash
pnpm --filter jasper-bot run plugin:unlink <id>
```

---

## 📦 Dependency Management

Plugins share the `node_modules` of the `jasper-bot` package.

**Rules:**
1.  **Do NOT** have a `package.json` in your plugin directory unless it is for development tooling only.
2.  **Do NOT** install runtime dependencies specific to your plugin that conflict with the core.
3.  If you need a library (e.g., `axios`, `date-fns`), check if it's already in `apps/bot/package.json`. If not, add it to the **monorepo root** or `apps/bot` (if you own the bot instance).

---

## 🚀 Publishing & Distribution

To share your plugin without git access:

**Export:**
```bash
pnpm --filter jasper-bot run plugin:export <id>
```
Creates `exports/<id>.zip`.

**Import:**
```bash
pnpm --filter jasper-bot run plugin:import <zip-file>
```
Extracts into `apps/bot/src/plugins/<id>`.
