# Phase 4 Takeover: Documentation & Advanced Features

## 📋 Context
The **React Dashboard Migration** (Phase 3) is complete. The React app is now the primary UI served at `/`, and the legacy UI is at `/legacy`. The build system supports this, and a `sample-plugin` verifies that the frontend extension system works.

## 🎯 Objectives

### 1. Documentation (Critical Cleanup)
Phase 3 skipped the documentation tasks. You must:
-   **Create `FRONTEND_PLUGINS.md`**: Document the new frontend extension system (Manifest schema, Component Registry, Slots). See `MIGRATION.md` Phase 3 section for the outline.
-   **Update `PLUGINS.md`**: Add a "Frontend Extensions" section linking to the new doc.

### 2. Plugin Compilation (Critical Fix)
-   **Issue**: The current build (`tsc` + `rsync`) copies plugin files but does not compile plugin frontend code (TSX/JSX) to JS.
-   **Current State**: `sample-plugin` works because it uses plain JS (`React.createElement`).
-   **Task**: Configure the build system (likely `vite` or `tsc`) to compile `src/plugins/*/web/*.tsx` into browser-ready JS in `dist/plugins/*/web/`.

### 3. Advanced Features (Next Steps)
Once documentation and compilation are sorted, proceed with "Post-Phase 3" goals from `MIGRATION.md`:
-   **Dynamic Component Loading**: Investigate replacing the current static registration with dynamic `import()` to lazy-load plugin components.
-   **UI Component Library**: Create a shared library of components (Card, Button, etc.) for plugins to use, ensuring visual consistency.

## 🛠️ Key Files
-   `MIGRATION.md`: The master plan.
-   `src/api/server.ts`: Serves the React app and plugin static files.
-   `vite.config.ts`: Frontend build and proxy config.
-   `src/plugins/sample-plugin/`: Working example of a frontend plugin.

## 🚀 Dev Workflow
-   Run `npm run dev:all` to start both the backend (port 3000) and frontend (port 5173) dev servers concurrently.
