# Jasper Discord Bot: Plugin Development & Build Workflows

This document outlines the compilation pipelines, loading strategies, developer CLI commands, and testing guidelines for the Jasper plugin system.

---

## 1. Compilation & Bundling Pipeline

The plugin compilation separates backend Node.js code compilation from frontend React component bundling.

### Backend Code Compilation

Backend plugin files (e.g., `src/plugins/my-plugin/index.ts`) are compiled to the `dist/plugins/` directory by the main TypeScript compiler:

- **Config File**: `apps/bot/tsconfig.json`
- **Configuration**:
    ```json
    "include": ["src/**/*"],
    "exclude": ["src/plugins/**/web"]
    ```
    This excludes the `web` directories from core TypeScript bot compiling, as those assets are compiled separately for browser use.

### Frontend Code Bundling

Frontend components (widgets, settings views, and custom pages) are compiled via Vite inside the build script:

- **Build Script**: `apps/bot/scripts/build-plugins.ts`
- **Vite Library Mode**:
  For each plugin with a `web` directory, Vite bundles the entry point (e.g., `web/index.tsx`) into an Immediately Invoked Function Expression (IIFE).
    - **Output Path**: `apps/bot/dist/plugins/{pluginId}/web/index.js`
    - **Format**: `iife`
    - **Global Scope Name**: `JasperPlugin_{pluginId}` (where dashes in the plugin ID are replaced with underscores).
    - **Externalized Dependencies**: To reduce bundle sizes and avoid multiple instances of React or UI frameworks running in the dashboard, Vite externalizes standard packages:
        ```typescript
        external: [
            'react',
            'react-dom',
            'react/jsx-runtime',
            'react-router-dom',
            '@jasper/elements',
            '@jasper/ui',
            '@jasper/hooks',
            'lucide-react',
        ];
        ```
    - **Global Library Resolving**: At runtime, these externalized modules resolve to global window objects provided by the dashboard's core layout framework:
        ```typescript
        globals: {
            react: 'JasperElements.React',
            'react-dom': 'JasperElements.ReactDOM',
            'react/jsx-runtime': 'JasperElements.JSXRuntime',
            'react-router-dom': 'JasperElements.ReactRouterDOM',
            '@jasper/elements': 'JasperElements',
            '@jasper/ui': 'JasperUI',
            '@jasper/hooks': 'JasperHooks',
            'lucide-react': 'LucideReact',
        }
        ```

### Manifest & Asset Staging

- **Manifest**: `jasper-plugin.json` is copied unmodified from `src/plugins/<id>` to `dist/plugins/<id>`.
- **Static Assets**: Staging copies non-code asset directories (e.g., audio clips, images) to `dist/plugins/` while skipping source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.lock`, `.yaml`, `.md`) and temporary build files.

### Plugin Compilation & Bundling Pipeline

```mermaid
graph TD
    subgraph SourcePlugins [src/plugins/]
        Manifest[jasper-plugin.json]
        BackendSrc[index.ts]
        FrontendSrc[web/index.tsx]
        StaticAsset[assets/sound.mp3]
    end

    subgraph BuildProcess [pnpm build / build-plugins.ts]
        TscCompile[tsc Compiler]
        ViteBundle[Vite Bundler IIFE]
        AssetCopy[Asset Staging Filter]
    end

    subgraph TargetDist [dist/plugins/]
        DistManifest[jasper-plugin.json]
        DistBackend[index.js]
        DistFrontend[web/index.js IIFE]
        DistAsset[assets/sound.mp3]
    end

    BackendSrc --> TscCompile
    TscCompile --> DistBackend

    FrontendSrc --> ViteBundle
    Note over ViteBundle: Externalizes React, ReactDOM, UI<br/>Global mappings to JasperElements
    ViteBundle --> DistFrontend

    Manifest --> AssetCopy
    StaticAsset --> AssetCopy
    AssetCopy --> DistManifest
    AssetCopy --> DistAsset
```

---

## 2. Dev/Prod Split Loading Strategies in Dashboard

The frontend dashboard resolves and loads plugin components using environment-specific strategies:

### Development Mode (`usePlugins.dev.ts`)

- Uses Vite's dynamic import helper `import.meta.glob('@plugins/*/web/index.{ts,tsx,js,jsx}')` to load plugin frontend entries directly from the filesystem.
- This integrates the plugin's frontend into Vite's Hot Module Replacement (HMR), enabling changes in React files to render in the browser immediately.

### Production Mode (`usePlugins.prod.ts`)

- Injects a `<script>` tag pointing to `/plugins/{pluginId}/web/index.js` into the DOM.
- Once the script loads, the IIFE exposes its exports on the global scope under `window['JasperPlugin_{pluginId}']`.
- The production hook extracts the exports and registers the views and widgets into the shared `ComponentRegistry`.

### Split Web Loading Strategy

```mermaid
graph TD
    subgraph WebApp [Web Dashboard Frontend]
        Loader[usePlugins Hook]
        Registry[ComponentRegistry]
    end

    subgraph DevEnvironment [Development Mode]
        ImportGlob[import.meta.glob]
        Hmr[Vite HMR Server]
        PluginSrc[src/plugins/*/web/index.tsx]
    end

    subgraph ProdEnvironment [Production Mode]
        ScriptInject[Dynamic Script Tag Injection]
        PluginBundle[/plugins/ID/web/index.js]
        WindowObj[window.JasperPlugin_ID]
    end

    Loader -->|isDev?| ImportGlob
    ImportGlob --> PluginSrc
    Hmr -->|Live Updates| PluginSrc
    PluginSrc -->|Register Pages/Widgets| Registry

    Loader -->|isProd?| ScriptInject
    ScriptInject -->|Load Browser Script| PluginBundle
    PluginBundle -->|Expose on Global Object| WindowObj
    WindowObj -->|Extract & Register| Registry
```

---

## 3. CLI Development Commands

All command scripts are run using `pnpm --filter jasper-bot run <command>` from the monorepo root.

### 1. `plugin:scaffold`

- **Script File**: `apps/bot/scripts/scaffold-plugin.ts`
- **Purpose**: Launches an interactive CLI wizard to scaffold a new plugin.
- **Validation**: Restricts IDs using the regex `/^[a-z0-9-]+$/`.
- **Output**: Generates a plugin folder containing `jasper-plugin.json` and basic typescript templates for the backend (`index.ts`) and frontend (`web/index.tsx`).

### 2. `plugin:link <path>`

- **Script File**: `apps/bot/scripts/plugin-link.ts`
- **Purpose**: Links an out-of-tree plugin folder to the local workspace.
- **Mechanism**: Creates a symbolic link in `apps/bot/src/plugins/<pluginId>`. It will fail if a physical directory already exists at that path to prevent data loss.

### 3. `plugin:unlink <pluginId>`

- **Script File**: `apps/bot/scripts/plugin-unlink.ts`
- **Purpose**: Safely removes a linked out-of-tree plugin.
- **Validation**: Ensures the target directory is a symbolic link before removing it, preventing accidental deletion of source directories.

### 4. `plugin:validate`

- **Script File**: `apps/bot/scripts/validate-plugin.ts`
- **Purpose**: Verifies plugin integrity by verifying that:
    - `jasper-plugin.json` exists and is formatted correctly.
    - The ID declared in the manifest matches the directory name.
    - Required entry files (e.g. backend `entry`, frontend `web.entry`) physically exist.

### 5. `plugin:export <pluginId> [--src]`

- **Script File**: `apps/bot/scripts/export-plugin.ts`
- **Purpose**: Compiles and bundles a plugin into a ZIP file under the `exports/` folder.
- **Flags**:
    - `[Default]`: Compiles backend and bundles frontend, outputting a ZIP containing compiled `index.js`, the bundled `web/` assets, static files, and the manifest.
    - `--src`: Bypasses bundling, packaging only the raw source files (`.ts`, `.tsx`, manifest), skipping `node_modules`.

### 6. `plugin:import <zipPath> [--prod]`

- **Script File**: `apps/bot/scripts/import-plugin.ts`
- **Purpose**: Installs a packaged plugin ZIP file.
- **Target Directory Resolution**:
    - `[Default]`: Extracts the ZIP into `apps/bot/src/plugins/<pluginId>` for local development.
    - `--prod`: Extracts files directly into `apps/bot/dist/plugins/<pluginId>` for immediate production execution.

---

## 4. Unit Testing Guidelines & Setup

### Environment Setup

For external plugins developed out-of-tree, configure `package.json` in the plugin root to include `react` and `react-dom` in `devDependencies`. This enables the IDE's language server to resolve types correctly.

### Vitest Integration

- **Config File**: `apps/bot/vitest.config.ts`
- **Discovery Pattern**: The test runner is configured to scan for `src/**/*.test.ts` files. Placed unit tests within the plugin directories (e.g. `src/plugins/my-plugin/__tests__/my-plugin.test.ts`) are automatically detected and executed during standard `pnpm test` runs.

### Mocking `PluginContext`

When testing plugins, mock the injected `PluginContext` dependencies rather than instantiating the real database or Discord client:

```typescript
import { PluginContext } from '@jasper/types';
import { describe, expect, it, vi } from 'vitest';

import MyPlugin from '../index.js';

describe('My Plugin Lifecycle', () => {
    it('should initialize and load context', async () => {
        const mockContext = {
            logger: {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
                debug: vi.fn(),
            },
            db: {
                plugin: {
                    get: vi.fn().mockResolvedValue(null),
                    set: vi.fn(),
                },
                core: {},
            },
            storage: {
                save: vi.fn(),
                get: vi.fn(),
                delete: vi.fn(),
            },
            registerCommand: vi.fn(),
        } as unknown as PluginContext;

        await MyPlugin.onLoad(mockContext);
        expect(mockContext.logger.info).toHaveBeenCalledWith(expect.stringContaining('Loaded'));
    });
});
```
