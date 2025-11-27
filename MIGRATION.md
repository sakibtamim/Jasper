# Jasper Frontend Extensions Platform – Migration Plan

> **Version:** 1.0  
> **Date:** 2025-11-28  
> **Status:** Planning Phase

---

## 📋 Executive Summary

### Current State
- **Web UI**: Single-file implementation (`public/index.html` + `index.js` + `index.css`)
- **Backend**: Mature plugin system with manifest-based extensions, scoped DB, hooks, and auto-namespaced routes (`/api/plugins/{pluginId}/**`)
- **Tech Stack**: Vanilla JS, Tailwind CSS (vendored), Lucide icons
- **Strengths**: Simple, fast, works well
- **Limitation**: No frontend extensibility for plugins

### Target Architecture
A **React-based dashboard** with clearly defined **extension slots** that mirror the backend's plugin philosophy:
- Plugins can contribute **nav items**, **widgets**, and **full pages** via `jasper-plugin.json`
- A **component registry** dynamically loads and renders plugin components into designated "slots"
- Incremental adoption: start with scaffolding, gradually migrate features
- Simple DX: "Declare in manifest + export component" mental model

### Migration Philosophy
- **Incremental, not big-bang**: Each phase is independently deployable
- **Preserve existing behavior**: No disruption to current users during migration
- **Surgical precision**: File-level granularity, explicit dependencies
- **Developer-friendly**: Clear conventions, reuse existing patterns (TypeScript, logging, etc.)

---

## 🏛️ Target Architecture Overview

### High-Level Data Flow

```mermaid
graph TD
    A[Plugin Manifest<br/>jasper-plugin.json] -->|Loaded by| B[Plugin Manager<br/>Backend]
    B -->|Exposes| C[/api/plugins/registry<br/>Frontend Contributions]
    C -->|Fetched by| D[React App]
    D -->|Builds| E[Component Registry<br/>pluginId + componentId → React Component]
    E -->|Renders into| F[Extension Slots<br/>nav, dashboard, widgets]
    F -->|Displays| G[User-facing UI]
    
    H[Plugin Code<br/>index.tsx] -->|Exports| I[React Components]
    I -->|Registered in| E
```

### Manifest Schema Extension

Plugins will declare frontend contributions in `jasper-plugin.json`:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "entry": "index.js",
  
  "web": {
    "navItems": [
      {
        "id": "my-plugin-dashboard",
        "label": "My Plugin",
        "icon": "activity",
        "href": "/plugins/my-plugin"
      }
    ],
    "widgets": [
      {
        "id": "stats-widget",
        "slot": "dashboard:main",
        "component": "StatsWidget",
        "order": 100
      }
    ],
    "pages": [
      {
        "id": "settings-page",
        "path": "/plugins/my-plugin/settings",
        "component": "SettingsPage"
      }
    ]
  }
}
```

### Component Registry Pattern

Plugins export React components that are dynamically discovered:

```typescript
// In plugin's web/index.tsx
export const StatsWidget = () => <div>Stats here</div>;
export const SettingsPage = () => <div>Settings here</div>;

// Component registry (frontend)
const registry = new Map<string, React.ComponentType>();
registry.set('my-plugin:StatsWidget', StatsWidget);
```

### Extension Slots

Core dashboard defines slots where plugins can inject:
- **`nav:main`** – Sidebar navigation items
- **`dashboard:main`** – Main dashboard area (for widgets/cards)
- **`dashboard:stats`** – Stats section
- **`pages:*`** – Full-page routes

---

## 🛤️ Phase-by-Phase Plan

---

## Phase 0: Scaffold React Shell (No Behavior Change)

**Goal:** Introduce a minimal React + TypeScript setup that mounts inside the existing HTML without changing any user-facing behavior.

**Duration:** ~2-3 hours

### 0.1 Install Dependencies

**Files to Modify:**
- `package.json`

**Changes:**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.3"
  }
}
```

**Tools:**
- Use **Vite** for fast dev server + build
- Use **TypeScript** (already configured in repo)

**Risks:**
- None – just adding dependencies

---

### 0.2 Create Vite Configuration

**Files to Create:**
- `vite.config.ts`

**Content:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'web',
  publicDir: '../public/assets',
  build: {
    outDir: '../public/dist-react',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
```

**Rationale:**
- `root: 'web'` – New React code lives in `web/`
- `publicDir: '../public/assets'` – Reuse existing images/icons
- `build.outDir: '../public/dist-react'` – Compiled bundle goes into `public/`
- `proxy` – Dev server forwards API calls to backend

---

### 0.3 Create React Shell Entry Point

**Files to Create:**
- `web/index.html`
- `web/main.tsx`
- `web/App.tsx`

**`web/index.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jasper Dashboard</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/main.tsx"></script>
</body>
</html>
```

**`web/main.tsx`:**
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**`web/App.tsx`:**
```tsx
import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Jasper Dashboard (React)</h1>
      <p>If you see this, React is working!</p>
    </div>
  );
}
```

**Risks:**
- None – this is isolated dev environment

---

### 0.4 Add NPM Scripts

**Files to Modify:**
- `package.json`

**Changes:**
```json
{
  "scripts": {
    "web:dev": "vite",
    "web:build": "vite build",
    "web:preview": "vite preview"
  }
}
```

**Usage:**
```bash
npm run web:dev      # Start React dev server at http://localhost:5173
npm run web:build    # Build production bundle to public/dist-react
```

---

### 0.5 Update Backend to Serve React Build (Production)

**Files to Modify:**
- `src/api/server.ts`

**Changes:**
- Add route to serve `public/dist-react/index.html` at `/react-dashboard`
- Keep existing `/` route for current dashboard

**Code:**
```typescript
// In server.ts, after existing static files setup
server.get('/react-dashboard', async (request, reply) => {
  return reply.sendFile('dist-react/index.html');
});
```

**Risks:**
- None – this is an opt-in route, doesn't affect existing UI

---

### 0.6 Verification

**Test Plan:**
1. Run `npm run web:dev` → Visit http://localhost:5173 → Should see "Jasper Dashboard (React)"
2. Run `npm run web:build` → Verify `public/dist-react/` contains bundle
3. Start bot → Visit http://localhost:3000/react-dashboard → Should see React app
4. Visit http://localhost:3000 → Should still see original dashboard (unchanged)

**Success Criteria:**
- ✅ React renders without errors
- ✅ Original dashboard still works
- ✅ No behavior change for existing users

---

## Phase 1: Core React Dashboard & Routing

**Goal:** Replicate the existing UI functionality in React with proper component structure and routing.

**Duration:** ~8-12 hours

### 1.1 Install Routing Library

**Files to Modify:**
- `package.json`

**Changes:**
```json
{
  "dependencies": {
    "react-router-dom": "^6.28.0"
  }
}
```

**Rationale:**
- React Router is industry standard
- Simpler than TanStack Router for this use case
- Supports nested routes and layouts

---

### 1.2 Define Core Layout Structure

**Files to Create:**
- `web/components/Layout.tsx`
- `web/components/Sidebar.tsx`
- `web/components/Header.tsx`

**`web/components/Layout.tsx`:**
```tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <Outlet /> {/* Child routes render here */}
        </main>
      </div>
    </div>
  );
}
```

**Notes:**
- Reuse existing Tailwind classes from `public/index.css`
- `<Outlet />` is where page content renders

---

### 1.3 Create Page Components

**Files to Create:**
- `web/pages/DashboardPage.tsx`
- `web/pages/WorkersPage.tsx`
- `web/pages/QueuesPage.tsx`
- `web/pages/StatsPage.tsx`
- `web/pages/CachePage.tsx`
- `web/pages/LogsPage.tsx`

**Structure Example (`WorkersPage.tsx`):**
```tsx
import React, { useEffect, useState } from 'react';
import { fetchWorkers } from '../api/client';

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchWorkers();
      setWorkers(data.workers);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section>
      <h2>Heavenly Council</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map(worker => (
          <WorkerCard key={worker.name} worker={worker} />
        ))}
      </div>
    </section>
  );
}
```

**Rationale:**
- Extract logic from `public/index.js` (currently 815 lines)
- Use React patterns (hooks, components)
- Keep API calls in separate `api/client.ts`

---

### 1.4 Create API Client Module

**Files to Create:**
- `web/api/client.ts`

**Content:**
```typescript
const API_BASE = '/api';

export async function fetchWorkers() {
  const res = await fetch(`${API_BASE}/status`);
  return res.json();
}

export async function fetchQueues(page = 1, limit = 10) {
  const res = await fetch(`${API_BASE}/queues?page=${page}&limit=${limit}`);
  return res.json();
}

export async function fetchStats(limit = 10) {
  const res = await fetch(`${API_BASE}/stats?limit=${limit}`);
  return res.json();
}

export async function fetchCacheStats() {
  const res = await fetch(`${API_BASE}/cache`);
  return res.json();
}

export async function fetchLogs() {
  const res = await fetch(`${API_BASE}/logs`);
  return res.json();
}
```

**Rationale:**
- Centralize all API calls
- Type-safe (can add TypeScript interfaces later)
- Reusable across components

---

### 1.5 Setup Routing

**Files to Modify:**
- `web/App.tsx`

**Updated Code:**
```tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import WorkersPage from './pages/WorkersPage';
import QueuesPage from './pages/QueuesPage';
import StatsPage from './pages/StatsPage';
import CachePage from './pages/CachePage';
import LogsPage from './pages/LogsPage';

export default function App() {
  return (
    <BrowserRouter basename="/react-dashboard">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/workers" replace />} />
          <Route path="workers" element={<WorkersPage />} />
          <Route path="queues" element={<QueuesPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="cache" element={<CachePage />} />
          <Route path="logs" element={<LogsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**Notes:**
- `basename="/react-dashboard"` ensures routes work under backend prefix
- Index route redirects to `/workers` (default view)

---

### 1.6 Integrate Tailwind CSS

**Files to Create:**
- `web/index.css`

**Content:**
```css
@import '../public/index.css'; /* Reuse existing styles */

/* Additional React-specific styles if needed */
```

**Files to Modify:**
- `web/main.tsx`

**Add:**
```tsx
import './index.css';
```

**Rationale:**
- Reuse existing Tailwind config and brand tokens
- No need to duplicate CSS

---

### 1.7 Migrate Theme Toggle Logic

**Files to Create:**
- `web/hooks/useTheme.ts`

**Content:**
```typescript
import { useEffect, useState } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggleTheme: () => setIsDark(!isDark) };
}
```

**Usage in Header:**
```tsx
import { useTheme } from '../hooks/useTheme';

export default function Header() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme}>
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
```

**Rationale:**
- Extract theme logic from global scope
- Reusable hook
- Preserves localStorage behavior

---

### 1.8 Verification

**Test Plan:**
1. Navigate to `/react-dashboard/workers` → Should show worker cards
2. Navigate to `/react-dashboard/queues` → Should show active queues
3. Toggle theme → Should persist across refreshes
4. Check polling → Data should update every 3 seconds
5. Compare side-by-side with original dashboard → UI should match

**Success Criteria:**
- ✅ All pages render correctly
- ✅ Theme toggle works
- ✅ Live data updates
- ✅ No console errors
- ✅ Visual parity with original dashboard

---

## Phase 2: Frontend Extension Slots (Plugin Contributions)

**Goal:** Design and implement the frontend extension API, allowing plugins to contribute nav items, widgets, and pages.

**Duration:** ~12-16 hours

### 2.1 Extend Plugin Manifest Schema

**Files to Modify:**
- Documentation: Add to `PLUGINS.md`

**New Manifest Fields:**
```json
{
  "id": "my-plugin",
  "web": {
    "entry": "web/index.tsx",
    "navItems": [
      {
        "id": "my-plugin-nav",
        "label": "My Plugin",
        "icon": "activity",
        "href": "/plugins/my-plugin"
      }
    ],
    "widgets": [
      {
        "id": "my-widget",
        "slot": "dashboard:main",
        "component": "MyWidget",
        "order": 100
      }
    ],
    "pages": [
      {
        "id": "my-page",
        "path": "/plugins/my-plugin",
        "component": "MyPage"
      }
    ]
  }
}
```

**Field Descriptions:**
- **`entry`** – Optional. Path to frontend module (relative to plugin dir). Defaults to `web/index.tsx`
- **`navItems`** – Array of sidebar navigation items
  - `id` – Unique within plugin
  - `label` – Display text
  - `icon` – Lucide icon name
  - `href` – Route path
- **`widgets`** – Components to inject into slots
  - `slot` – Target slot (e.g., `dashboard:main`, `stats:top`)
  - `component` – Exported component name
  - `order` – Render priority (lower = earlier)
- **`pages`** – Full-page routes
  - `path` – React Router path
  - `component` – Exported component name

---

### 2.2 Backend: Create Plugin Registry Endpoint

**Files to Create:**
- `src/api/plugins-registry.ts`

**Content:**
```typescript
import { FastifyInstance } from 'fastify';
import pluginManager from '../core/plugins/plugin-manager.js';
import fs from 'node:fs/promises';
import path from 'path';

export default async function pluginsRegistryRoutes(server: FastifyInstance) {
  // GET /api/plugins/registry
  server.get('/registry', async (request, reply) => {
    const plugins = pluginManager.getPlugins(); // New method needed
    const registry = [];

    for (const [name, { metadata, pluginDir }] of plugins) {
      if (metadata.web) {
        registry.push({
          id: metadata.id,
          name: metadata.name,
          version: metadata.version,
          web: metadata.web
        });
      }
    }

    return { plugins: registry };
  });
}
```

**Files to Modify:**
- `src/api/server.ts`

**Changes:**
```typescript
import pluginsRegistryRoutes from './plugins-registry.js';

// Register under /api/plugins
server.register(pluginsRegistryRoutes, { prefix: '/api/plugins' });
```

**Rationale:**
- Exposes plugin manifests to frontend
- No need to duplicate manifest parsing in frontend
- Centralized source of truth

---

### 2.3 Backend: Expose Plugin Metadata in Plugin Manager

**Files to Modify:**
- `src/core/plugins/plugin-manager.ts`

**Changes:**
```typescript
export class PluginManager {
  private plugins: Map<string, { plugin: Plugin, context: PluginContext, metadata: any, pluginDir: string }>;

  // Add getter method
  getPlugins() {
    return this.plugins;
  }

  // In registerPlugin, store metadata and pluginDir
  async registerPlugin(plugin: Plugin, metadata: any, pluginDir: string) {
    // ...existing code...
    this.plugins.set(plugin.name, { plugin, context: pluginContext, metadata, pluginDir });
  }
}
```

**Rationale:**
- Plugin Manager already parses manifests
- Just need to expose the data

---

### 2.4 Frontend: Fetch Plugin Registry

**Files to Create:**
- `web/api/pluginRegistry.ts`

**Content:**
```typescript
export interface PluginRegistryEntry {
  id: string;
  name: string;
  version: string;
  web: {
    entry?: string;
    navItems?: NavItem[];
    widgets?: WidgetContribution[];
    pages?: PageContribution[];
  };
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

export interface WidgetContribution {
  id: string;
  slot: string;
  component: string;
  order: number;
}

export interface PageContribution {
  id: string;
  path: string;
  component: string;
}

export async function fetchPluginRegistry(): Promise<PluginRegistryEntry[]> {
  const res = await fetch('/api/plugins/registry');
  const data = await res.json();
  return data.plugins || [];
}
```

---

### 2.5 Frontend: Create Component Registry

**Files to Create:**
- `web/core/ComponentRegistry.ts`

**Content:**
```typescript
import React from 'react';

export type ComponentMap = Map<string, React.ComponentType<any>>;

export class ComponentRegistry {
  private components: ComponentMap = new Map();

  register(pluginId: string, componentName: string, component: React.ComponentType<any>) {
    const key = `${pluginId}:${componentName}`;
    this.components.set(key, component);
  }

  get(pluginId: string, componentName: string): React.ComponentType<any> | null {
    const key = `${pluginId}:${componentName}`;
    return this.components.get(key) || null;
  }

  getAll(): ComponentMap {
    return this.components;
  }
}

export const componentRegistry = new ComponentRegistry();
```

**Rationale:**
- Simple key-value store: `pluginId:componentName` → React component
- Plugins will import and call `componentRegistry.register()`

---

### 2.6 Frontend: Dynamic Plugin Loading

**Design Decision: Static vs Dynamic Imports**

**Option A (Recommended for Phase 2): Static Registration**
- Plugins manually import and register components
- Simpler, no build complexity
- Example:
  ```typescript
  // In plugin's web/index.tsx
  import { componentRegistry } from '../../../web/core/ComponentRegistry';
  import MyWidget from './MyWidget';

  componentRegistry.register('my-plugin', 'MyWidget', MyWidget);
  ```

**Option B (Future Enhancement): Dynamic Import**
- Use `import()` to lazy-load plugin modules
- Requires bundler config (Vite supports this)
- Example:
  ```typescript
  const module = await import(`/plugins/${pluginId}/web/index.tsx`);
  ```

**Chosen: Option A for Phase 2**
- Simpler to implement
- No risk of bundler issues
- Can upgrade to Option B in Phase 3

---

### 2.7 Frontend: Extension Slot Components

**Files to Create:**
- `web/components/ExtensionSlot.tsx`

**Content:**
```tsx
import React, { useMemo } from 'react';
import { usePluginRegistry } from '../hooks/usePluginRegistry';
import { componentRegistry } from '../core/ComponentRegistry';

interface Props {
  slot: string;
}

export default function ExtensionSlot({ slot }: Props) {
  const plugins = usePluginRegistry();

  const widgets = useMemo(() => {
    const items: Array<{ pluginId: string; component: React.ComponentType; order: number }> = [];

    for (const plugin of plugins) {
      if (!plugin.web.widgets) continue;

      for (const widget of plugin.web.widgets) {
        if (widget.slot !== slot) continue;

        const Component = componentRegistry.get(plugin.id, widget.component);
        if (!Component) {
          console.warn(`[ExtensionSlot] Component not found: ${plugin.id}:${widget.component}`);
          continue;
        }

        items.push({ pluginId: plugin.id, component: Component, order: widget.order });
      }
    }

    return items.sort((a, b) => a.order - b.order);
  }, [plugins, slot]);

  return (
    <>
      {widgets.map(({ pluginId, component: Component }, index) => (
        <Component key={`${pluginId}-${index}`} />
      ))}
    </>
  );
}
```

**Usage in Dashboard:**
```tsx
<section id="dashboard-widgets">
  <ExtensionSlot slot="dashboard:main" />
</section>
```

**Rationale:**
- Declarative: just specify the slot name
- Handles sorting, component resolution, and error handling
- Composable: multiple slots in different locations

---

### 2.8 Frontend: Dynamic Navigation Items

**Files to Modify:**
- `web/components/Sidebar.tsx`

**Changes:**
```tsx
import { usePluginRegistry } from '../hooks/usePluginRegistry';

export default function Sidebar() {
  const plugins = usePluginRegistry();

  const pluginNavItems = plugins.flatMap(p => p.web.navItems || []);

  return (
    <nav>
      {/* Core nav items */}
      <a href="/workers">Workers</a>
      <a href="/queues">Queues</a>
      <a href="/stats">Stats</a>

      {/* Plugin nav items */}
      {pluginNavItems.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h3>Plugins</h3>
          {pluginNavItems.map(item => (
            <a key={item.id} href={item.href}>
              <i data-lucide={item.icon} /> {item.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
```

---

### 2.9 Frontend: Dynamic Routes

**Files to Modify:**
- `web/App.tsx`

**Changes:**
```tsx
import { usePluginRegistry } from './hooks/usePluginRegistry';

export default function App() {
  const plugins = usePluginRegistry();

  const pluginRoutes = plugins.flatMap(p => 
    (p.web.pages || []).map(page => {
      const Component = componentRegistry.get(p.id, page.component);
      if (!Component) return null;
      return <Route key={page.id} path={page.path} element={<Component />} />;
    })
  ).filter(Boolean);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Core routes */}
          <Route path="workers" element={<WorkersPage />} />
          {/* ... */}

          {/* Plugin routes */}
          {pluginRoutes}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

### 2.10 Create Hook for Plugin Registry

**Files to Create:**
- `web/hooks/usePluginRegistry.ts`

**Content:**
```typescript
import { useEffect, useState } from 'react';
import { fetchPluginRegistry, PluginRegistryEntry } from '../api/pluginRegistry';

export function usePluginRegistry(): PluginRegistryEntry[] {
  const [plugins, setPlugins] = useState<PluginRegistryEntry[]>([]);

  useEffect(() => {
    fetchPluginRegistry().then(setPlugins);
  }, []);

  return plugins;
}
```

---

### 2.11 Verification

**Test Plan:**
1. Create a test plugin with `web.navItems`, `widgets`, and `pages`
2. Start bot → Visit `/api/plugins/registry` → Should see plugin metadata
3. Visit React dashboard → Should see plugin nav item in sidebar
4. Click nav item → Should navigate to plugin page
5. Dashboard should render plugin widgets in extension slots

**Success Criteria:**
- ✅ `/api/plugins/registry` returns correct data
- ✅ Plugin nav items appear in sidebar
- ✅ Plugin pages render correctly
- ✅ Extension slots render plugin widgets
- ✅ No errors in console

---

## Phase 3: Example Plugin & Documentation

**Goal:** Implement a real plugin that uses the frontend extension API and document the entire system.

**Duration:** ~6-8 hours

### 3.1 Create Example Plugin: "Greeter UI"

**Files to Create:**
- `src/plugins/greeter-ui-plugin/jasper-plugin.json`
- `src/plugins/greeter-ui-plugin/index.ts`
- `src/plugins/greeter-ui-plugin/web/index.tsx`
- `src/plugins/greeter-ui-plugin/web/GreeterWidget.tsx`
- `src/plugins/greeter-ui-plugin/web/GreeterPage.tsx`

**Manifest:**
```json
{
  "id": "greeter-ui-plugin",
  "name": "Greeter UI Plugin",
  "version": "1.0.0",
  "description": "Example plugin demonstrating frontend extensions",
  "entry": "index.js",
  "web": {
    "entry": "web/index.tsx",
    "navItems": [
      {
        "id": "greeter-dashboard",
        "label": "Greeter",
        "icon": "smile",
        "href": "/plugins/greeter"
      }
    ],
    "widgets": [
      {
        "id": "greeter-widget",
        "slot": "dashboard:main",
        "component": "GreeterWidget",
        "order": 10
      }
    ],
    "pages": [
      {
        "id": "greeter-page",
        "path": "/plugins/greeter",
        "component": "GreeterPage"
      }
    ]
  }
}
```

**Backend (`index.ts`):**
```typescript
import { Plugin, PluginContext } from '../../core/plugins/plugin-interface.js';

const GreeterUIPlugin: Plugin = {
  name: 'Greeter UI Plugin',
  version: '1.0.0',

  onLoad: async (context: PluginContext) => {
    context.logger.info('Loaded!');

    // Expose a simple API endpoint
    context.server.get('/greet', async () => {
      return { message: 'Hello from Greeter Plugin!' };
    });
  },

  onUnload: async (context: PluginContext) => {
    context.logger.info('Unloaded!');
  }
};

export default GreeterUIPlugin;
```

**Frontend Entry (`web/index.tsx`):**
```tsx
import { componentRegistry } from '../../../../web/core/ComponentRegistry';
import GreeterWidget from './GreeterWidget';
import GreeterPage from './GreeterPage';

componentRegistry.register('greeter-ui-plugin', 'GreeterWidget', GreeterWidget);
componentRegistry.register('greeter-ui-plugin', 'GreeterPage', GreeterPage);
```

**Widget (`web/GreeterWidget.tsx`):**
```tsx
import React, { useEffect, useState } from 'react';

export default function GreeterWidget() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/plugins/greeter-ui-plugin/greet')
      .then(res => res.json())
      .then(data => setMessage(data.message));
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        Greeter Widget
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{message || 'Loading...'}</p>
    </div>
  );
}
```

**Page (`web/GreeterPage.tsx`):**
```tsx
import React from 'react';

export default function GreeterPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Greeter Plugin</h1>
      <p>This is a full-page example for a plugin.</p>
      <p className="mt-4 text-gray-600 dark:text-gray-400">
        Explore the plugin system by creating your own components!
      </p>
    </div>
  );
}
```

---

### 3.2 Update Build Process

**Files to Modify:**
- `package.json`

**Changes:**
- Update `build` script to compile plugin TypeScript:
  ```json
  {
    "scripts": {
      "build": "tsc && rsync -avm --include='*/' --include='*.json' --include='*.mp3' --exclude='*' src/plugins/ dist/plugins/ && npm run web:build"
    }
  }
  ```

**Rationale:**
- Compile plugin frontend code as part of build
- Bundle React app into `public/dist-react/`

---

### 3.3 Documentation: Create Frontend Extensions API Doc

**Files to Create:**
- `FRONTEND_PLUGINS.md`

**Content Structure:**
```markdown
# Jasper Frontend Extensions API

## Overview
Extend the Jasper dashboard with custom UI components.

## Quick Start
1. Add `web` field to `jasper-plugin.json`
2. Create `web/index.tsx` and export components
3. Register components in the registry

## Manifest Schema
- `web.entry` – Entry file (default: `web/index.tsx`)
- `web.navItems` – Sidebar navigation
- `web.widgets` – Dashboard widgets
- `web.pages` – Full pages

## Component Registration
```tsx
import { componentRegistry } from '../../../web/core/ComponentRegistry';
import MyWidget from './MyWidget';

componentRegistry.register('my-plugin', 'MyWidget', MyWidget);
```

## Extension Slots
- `dashboard:main` – Main dashboard area
- `stats:top` – Stats section
- Custom slots can be added by plugins

## Example Plugin
See `src/plugins/greeter-ui-plugin/` for a working example.

## Best Practices
- Keep components small and focused
- Use existing Tailwind classes for consistency
- Handle loading and error states
- Test components in isolation
```

---

### 3.4 Update PLUGINS.md

**Files to Modify:**
- `PLUGINS.md`

**Changes:**
- Add section: "## 🎨 Frontend Extensions"
- Link to `FRONTEND_PLUGINS.md`
- Add manifest schema examples

---

### 3.5 Verification

**Test Plan:**
1. Build the bot: `npm run build`
2. Start the bot
3. Visit `/api/plugins/registry` → Should see `greeter-ui-plugin`
4. Visit React dashboard
5. Check sidebar → Should see "Greeter" nav item
6. Check dashboard → Should see "Greeter Widget"
7. Click "Greeter" nav → Should navigate to plugin page
8. API call from widget → Should display message from backend

**Success Criteria:**
- ✅ Example plugin loads without errors
- ✅ Nav item appears
- ✅ Widget renders on dashboard
- ✅ Page renders at `/plugins/greeter`
- ✅ API endpoint works
- ✅ Documentation is clear and complete

---

## 📊 Risk Assessment & Mitigation

### Risk 1: Breaking Existing Backend Plugin API
**Likelihood:** Low  
**Impact:** High  
**Mitigation:**
- Only add new optional fields to manifests (`web`)
- Existing plugins without `web` field continue working
- Backend plugin loading is untouched (just exposing metadata)

### Risk 2: Frontend Build Complexity
**Likelihood:** Medium  
**Impact:** Medium  
**Mitigation:**
- Use Vite (simple, fast, well-documented)
- Keep bundler config minimal
- Document build process clearly
- Provide npm scripts for common tasks

### Risk 3: Plugin Component Loading Errors
**Likelihood:** Medium  
**Impact:** Medium  
**Mitigation:**
- Defensive programming in `ExtensionSlot.tsx` (check for null components)
- Console warnings for missing components
- Validate manifest schema at load time
- Error boundaries in React components

### Risk 4: Route Conflicts
**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:**
- Enforce plugin route prefix: `/plugins/{pluginId}/**`
- Validate routes at registration time
- Document route naming conventions

### Risk 5: Developer Experience Complexity
**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**
- Clear documentation with examples
- Simple mental model: "Declare in manifest + export component"
- Provide example plugin as template
- Keep API surface small

---

## 🔄 Migration Path

### Phase 0 → Phase 1
- Users can opt-in to React dashboard via `/react-dashboard`
- Old dashboard remains default at `/`
- No disruption

### Phase 1 → Phase 2
- Plugin authors can start adding `web` field
- Existing plugins unaffected
- Backward compatible

### Phase 2 → Phase 3
- Example plugin serves as template
- Documentation guides new plugin authors
- No breaking changes

### Post-Phase 3: Full Cutover (Optional)
Once React dashboard is mature:
1. Update `/` route to serve React app
2. Keep old dashboard at `/legacy`
3. Announce migration timeline
4. Deprecate old dashboard after 1-2 releases

---

## 📝 Implementation Checklist

### Phase 0
- [ ] Install React, React DOM, Vite, TypeScript types
- [ ] Create `vite.config.ts`
- [ ] Create `web/index.html`, `web/main.tsx`, `web/App.tsx`
- [ ] Add npm scripts for `web:dev`, `web:build`
- [ ] Update backend to serve `/react-dashboard`
- [ ] Verify React renders without errors

### Phase 1
- [ ] Install React Router
- [ ] Create `Layout`, `Sidebar`, `Header` components
- [ ] Create page components (Workers, Queues, Stats, Cache, Logs)
- [ ] Create `api/client.ts` with fetch functions
- [ ] Setup routing in `App.tsx`
- [ ] Integrate Tailwind CSS
- [ ] Migrate theme toggle logic to `useTheme` hook
- [ ] Verify all pages render and update

### Phase 2
- [ ] Define `web` manifest schema
- [ ] Create `/api/plugins/registry` endpoint
- [ ] Expose plugin metadata in Plugin Manager
- [ ] Create `ComponentRegistry.ts`
- [ ] Create `ExtensionSlot.tsx` component
- [ ] Create `usePluginRegistry.ts` hook
- [ ] Update `Sidebar` to render plugin nav items
- [ ] Update routing to include plugin pages
- [ ] Verify plugin contributions render correctly

### Phase 3
- [ ] Create `greeter-ui-plugin` example
- [ ] Update build script to compile plugin frontend code
- [ ] Write `FRONTEND_PLUGINS.md` documentation
- [ ] Update `PLUGINS.md` with frontend section
- [ ] Verify example plugin works end-to-end
- [ ] Test with multiple plugins to ensure no conflicts

---

## 🎯 Success Metrics

### Phase 0
- React app loads without errors
- Original dashboard unaffected

### Phase 1
- All original dashboard features replicated in React
- Visual parity with existing UI
- No performance regression

### Phase 2
- Plugin registry endpoint working
- At least 1 test plugin using slots
- No breaking changes to backend API

### Phase 3
- Example plugin fully functional
- Documentation complete and clear
- Community can create plugins without help

---

## 🚀 Next Steps (Post-Phase 3)

### Dynamic Component Loading
- Implement `import()` for plugins
- Bundle plugins separately
- Hot-reload plugin components in dev mode

### Plugin Developer Tools
- Devtools page showing registered components
- Component sandbox for testing
- Live reload for plugin changes

### Advanced Slot Features
- **Slot Context:** Pass data to slots (e.g., current user, theme)
- **Slot Composition:** Widgets can contribute to other widgets
- **Conditional Rendering:** Widgets with display rules (e.g., only show if user is admin)

### UI Component Library for Plugins
- Pre-built components (Card, Table, Chart) that match Jasper's design
- Hooks for common patterns (useFetch, useWebSocket)
- TypeScript types for better DX

---

## 📚 Appendices

### A. File Structure (Post-Phase 3)

```
Jasper/
├── public/
│   ├── assets/              # Existing images, icons
│   ├── dist-react/          # Built React app (output)
│   ├── index.html           # Original dashboard
│   ├── index.js
│   └── index.css
├── web/                     # NEW: React app source
│   ├── api/
│   │   ├── client.ts
│   │   └── pluginRegistry.ts
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ExtensionSlot.tsx
│   ├── core/
│   │   └── ComponentRegistry.ts
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   └── usePluginRegistry.ts
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── WorkersPage.tsx
│   │   ├── QueuesPage.tsx
│   │   ├── StatsPage.tsx
│   │   ├── CachePage.tsx
│   │   └── LogsPage.tsx
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.html
│   └── index.css
├── src/
│   ├── api/
│   │   ├── server.ts        # MODIFIED: Add /react-dashboard route
│   │   └── plugins-registry.ts  # NEW
│   ├── core/
│   │   └── plugins/
│   │       ├── plugin-manager.ts  # MODIFIED: Expose metadata
│   │       └── ...
│   └── plugins/
│       ├── greeter-ui-plugin/   # NEW: Example plugin
│       │   ├── jasper-plugin.json
│       │   ├── index.ts
│       │   └── web/
│       │       ├── index.tsx
│       │       ├── GreeterWidget.tsx
│       │       └── GreeterPage.tsx
│       └── ...
├── vite.config.ts           # NEW
├── FRONTEND_PLUGINS.md      # NEW
├── PLUGINS.md               # MODIFIED
└── package.json             # MODIFIED
```

---

### B. Technology Choices Rationale

| Choice | Rationale |
|--------|-----------|
| **React** | Industry standard, large ecosystem, familiar to most devs |
| **Vite** | Fast dev server, simple config, excellent TypeScript support |
| **React Router** | Standard routing library, simpler than TanStack Router |
| **Static Registration** (Phase 2) | Simpler than dynamic imports, avoid bundler complexity |
| **Extension Slots** | Declarative, flexible, easy to understand |
| **Component Registry** | Simple pattern, works with any bundler |

---

### C. Alternative Approaches Considered

#### 1. Use Next.js / Remix
**Pros:** Server-side rendering, batteries-included  
**Cons:** Overkill for dashboard, adds complexity  
**Decision:** Stick with Vite + React for simplicity

#### 2. Use Web Components
**Pros:** Framework-agnostic  
**Cons:** Less ergonomic, poor TypeScript support  
**Decision:** React for better DX

#### 3. iframe-based Plugin Isolation
**Pros:** Strong security boundary  
**Cons:** Poor UX, communication overhead  
**Decision:** Shared context for now, revisit if security becomes concern

---

### D. Open Questions

1. **Plugin Versioning:** How to handle breaking changes in extension API?
   - **Proposed:** Use semantic versioning, deprecation warnings
   
2. **Plugin Dependencies:** Can plugins depend on each other?
   - **Proposed:** Not in Phase 2, consider in future

3. **Plugin Permissions:** Should plugins declare required permissions?
   - **Proposed:** Document recommended pattern, enforce in Phase 4

4. **Theme Customization:** Can plugins override Tailwind theme?
   - **Proposed:** No, plugins must use existing design tokens

---

## 🎉 Conclusion

This plan provides a **clear, incremental path** to evolving Jasper's frontend into a plugin-extensible platform while preserving existing functionality and maintaining backwards compatibility.

**Key Principles:**
- ✅ Incremental: Each phase is independently valuable
- ✅ Backwards Compatible: Existing plugins unaffected
- ✅ Simple DX: "Declare in manifest + export component"
- ✅ Surgical: File-level changes with clear rationale
- ✅ Realistic: Avoids over-engineering, focuses on core needs

**Estimated Total Time:** 26-38 hours (~1 week of focused work)

Ready to execute! 🚀
