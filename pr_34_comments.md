------------------------------------------------------------
Comment #2570882445 by gemini-code-assist[bot] on web/hooks/usePlugins.ts:N/A
State: null | Created: 2025-11-28T08:58:17Z

![critical](https://www.gstatic.com/codereviewagent/critical.svg)

The current implementation dynamically imports the plugin's entry point but doesn't use the returned module to register the exported components. The `import()` call alone only executes the module for its side effects, but the sample plugin's entry file (`sample-plugin/web/index.tsx`) doesn't have any registration side effects.

The loader itself needs to handle the registration by inspecting the imported module's exports and matching them against the plugin's manifest. You'll also need to import `componentRegistry` at the top of this file:
`import { componentRegistry } from '../core/ComponentRegistry';`

```typescript
                            const module = await import(/* @vite-ignore */ entryUrl);

                            // Register components from the imported module based on the manifest
                            const componentsToRegister = [
                                ...(plugin.web.widgets || []).map(w => w.component),
                                ...(plugin.web.pages || []).map(p => p.component)
                            ];

                            for (const componentName of new Set(componentsToRegister)) {
                                if (module[componentName]) {
                                    componentRegistry.register(plugin.id, componentName, module[componentName]);
                                } else {
                                    console.warn(`[PluginLoader] Component "${componentName}" not found in exports for plugin "${plugin.id}"`);
                                }
                            }
```

Code context:
@@ -0,0 +1,47 @@
+import { useEffect, useState } from 'react';
+import { fetchPluginRegistry, PluginRegistryEntry } from '../api/pluginRegistry';
+
+export function usePlugins() {
+    const [plugins, setPlugins] = useState<PluginRegistryEntry[]>([]);
+    const [loading, setLoading] = useState(true);
+    const [error, setError] = useState<string | null>(null);
+
+    useEffect(() => {
+        async function load() {
+            try {
+                const registry = await fetchPluginRegistry();
+                setPlugins(registry);
+
+                // Dynamically load plugin scripts
+                await Promise.all(registry.map(async (plugin) => {
+                    if (plugin.web && plugin.web.entry) {
+                        try {
+                            // Construct URL for the plugin entry point
+                            // See PLUGINS_DEV.md "Frontend Asset Serving" for details on this URL structure.
+                            const entryUrl = `/plugins/${plugin.id}/web/index.js`;
+
+                            console.log(`[PluginLoader] Loading ${plugin.id} from ${entryUrl}`);
+
+                            // Dynamic import
+                            // @ts-ignore
+                            await import(/* @vite-ignore */ entryUrl);


------------------------------------------------------------
Comment #2570882453 by gemini-code-assist[bot] on src/api/server.ts:N/A
State: null | Created: 2025-11-28T08:58:18Z

![high](https://www.gstatic.com/codereviewagent/high-priority.svg)

The custom handler `pluginStaticRoutes` is inefficient as it iterates through all plugins for every asset request, and it serves files from the `src` directory instead of the compiled `dist` directory. It's better to use `fastify-static` to serve the compiled plugin assets from `dist/plugins`. This is more performant, secure, and aligns with the build process.

You can remove the `pluginStaticRoutes` import on line 17 and the `src/api/plugin-static.ts` file itself.

```suggestion
server.register(fastifyStatic, {    root: path.join(__dirname, '../../dist/plugins'),    prefix: '/plugins',    decorateReply: false,});
```

Code context:
@@ -58,7 +68,14 @@ server.addHook('onRequest', async (request, reply) => {
 // Register Auth Routes
 server.register(authRoutes);
 server.register(devtoolsRoutes);
+server.register(pluginsRegistryRoutes, { prefix: '/api/plugins' });
+server.register(pluginsManagementRoutes, { prefix: '/api/plugins' });
+server.register(pluginStaticRoutes);


------------------------------------------------------------
Comment #2570882461 by gemini-code-assist[bot] on src/api/plugins-management.ts:N/A
State: null | Created: 2025-11-28T08:58:18Z

![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)

Exposing raw error messages to the client can be a security risk, as it might leak internal implementation details, file paths, or stack traces. It's better to log the detailed error on the server and return a generic error message to the user.

```suggestion
            return reply.code(500).send({ message: 'Installation failed. Check server logs for details.' });
```

Code context:
@@ -0,0 +1,96 @@
+import { FastifyInstance } from 'fastify';
+import multipart from '@fastify/multipart';
+import fs from 'node:fs';
+import path from 'node:path';
+import { fileURLToPath } from 'node:url';
+import AdmZip from 'adm-zip';
+import logger from '../core/logger.js';
+
+const __dirname = path.dirname(fileURLToPath(import.meta.url));
+const PLUGINS_DIR = path.resolve(__dirname, '../../src/plugins');
+
+export default async function pluginsManagementRoutes(server: FastifyInstance) {
+    // Register multipart support
+    server.register(multipart);
+
+    server.post('/install', async (request, reply) => {
+        // 1. Authentication Check (P0)
+        // The global onRequest hook attaches 'user' to the request if a valid session exists.
+        const user = (request as any).user;
+        if (!user) {
+            return reply.code(401).send({ message: 'Unauthorized: You must be logged in to install plugins.' });
+        }
+
+        // Optional: Add role check here if needed (e.g., if (user.role !== 'admin'))
+
+        const data = await request.file();
+        if (!data) {
+            return reply.code(400).send({ message: 'No file uploaded' });
+        }
+
+        if (!data.filename.endsWith('.zip')) {
+            return reply.code(400).send({ message: 'File must be a .zip archive' });
+        }
+
+        const tempExtractDir = path.join(PLUGINS_DIR, `temp_extract_${Date.now()}`);
+
+        try {
+            const buffer = await data.toBuffer();
+            const zip = new AdmZip(buffer);
+            const zipEntries = zip.getEntries();
+
+            // 2. Zip Slip Prevention (P1)
+            // Validate all entries before extracting
+            for (const entry of zipEntries) {
+                const entryName = entry.entryName;
+                const targetPath = path.join(tempExtractDir, entryName);
+
+                // Prevent directory traversal attacks
+                if (!targetPath.startsWith(tempExtractDir)) {
+                    throw new Error(`Malicious zip entry detected: ${entryName}`);
+                }
+            }
+
+            // If validation passes, extract
+            if (!fs.existsSync(tempExtractDir)) {
+                await fs.promises.mkdir(tempExtractDir, { recursive: true });
+            }
+
+            zip.extractAllTo(tempExtractDir, true);
+
+            // 3. Validate Manifest
+            const manifestPath = path.join(tempExtractDir, 'jasper-plugin.json');
+            if (!fs.existsSync(manifestPath)) {
+                throw new Error('Invalid plugin: jasper-plugin.json not found');
+            }
+
+            const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));
+            if (!manifest.id || !/^[a-z0-9-]+$/.test(manifest.id)) {
+                throw new Error('Invalid plugin ID in manifest');
+            }
+
+            // 4. Move to plugins directory
+            const targetDir = path.join(PLUGINS_DIR, manifest.id);
+
+            // Remove existing if any
+            if (fs.existsSync(targetDir)) {
+                await fs.promises.rm(targetDir, { recursive: true, force: true });
+            }
+
+            await fs.promises.rename(tempExtractDir, targetDir);
+
+            logger.info(`[plugins] Installed plugin: ${manifest.id} v${manifest.version} by ${user.username}`);
+
+            return { success: true, message: `Plugin ${manifest.id} installed successfully` };
+
+        } catch (error) {
+            logger.error(`[plugins] Installation failed: ${error}`);
+            return reply.code(500).send({ message: `Installation failed: ${error instanceof Error ? error.message : String(error)}` });


------------------------------------------------------------
Comment #2570882467 by gemini-code-assist[bot] on PLUGINS.md:N/A
State: null | Created: 2025-11-28T08:58:18Z

![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)

The documentation here states that "The system automatically registers them based on the manifest." This contradicts `PLUGINS_DEV.md`, which says "Plugins register components via `componentRegistry.register()`."

The frontend loading logic in `web/hooks/usePlugins.ts` is also missing the automatic registration part. Please ensure the implementation is corrected to automatically register components, and then update all documentation to be consistent with that behavior.

Code context:
@@ -187,3 +187,144 @@ The core will validate this against the running Jasper version using semver.
 *   If the version is **incompatible**, the system will log a warning but still attempt to load the plugin.
 
 This ensures plugins can safely declare their dependencies on core features.
+
+---
+
+## 🖥️ Frontend Extensions
+
+The **Frontend Extension System** allows plugins to contribute UI components to the React Dashboard.
+
+### Manifest Schema (`web`)
+
+Plugins declare frontend capabilities in `jasper-plugin.json` under the `web` key:
+
+```json
+{
+  "id": "my-plugin",
+  "web": {
+    "entry": "web/index.tsx",
+    "navItems": [
+      {
+        "id": "my-plugin-nav",
+        "label": "My Plugin",
+        "icon": "activity",
+        "href": "/plugins/my-plugin"
+      }
+    ],
+    "widgets": [
+      {
+        "id": "my-widget",
+        "slot": "dashboard:main",
+        "component": "MyWidget",
+        "order": 100
+      }
+    ],
+    "pages": [
+      {
+        "id": "my-page",
+        "path": "/plugins/my-plugin",
+        "component": "MyPage"
+      }
+    ]
+  }
+}
+```
+
+### Component Registry
+
+Plugins must export their components from the entry file (e.g., `web/index.tsx`). The system automatically registers them based on the manifest.
+
+> **Note:** `React` and `ReactDOM` are **not** exposed globally on `window`. Your plugin build process (handled by `scripts/build-plugins.ts`) automatically configures them as externals, ensuring they share the core application's React instance. Do not bundle React in your plugin.
------------------------------------------------------------
Comment #2570885651 by Copilot on src/api/plugins-management.ts:N/A
State: null | Created: 2025-11-28T08:59:23Z

The zip slip prevention check uses `startsWith()` which can be bypassed on case-insensitive filesystems or with path normalization issues. Consider using `path.resolve()` on both paths and checking if the resolved `targetPath` is within the resolved `tempExtractDir`:

```typescript
const resolvedTargetPath = path.resolve(targetPath);
const resolvedTempDir = path.resolve(tempExtractDir);
if (!resolvedTargetPath.startsWith(resolvedTempDir + path.sep)) {
    throw new Error(`Malicious zip entry detected: ${entryName}`);
}
```

The `+ path.sep` ensures that `/temp/foo` doesn't match `/temp/foobar`.
```suggestion
                const resolvedTargetPath = path.resolve(targetPath);
                const resolvedTempDir = path.resolve(tempExtractDir);
                if (!resolvedTargetPath.startsWith(resolvedTempDir + path.sep)) {
```

Code context:
@@ -0,0 +1,96 @@
+import { FastifyInstance } from 'fastify';
+import multipart from '@fastify/multipart';
+import fs from 'node:fs';
+import path from 'node:path';
+import { fileURLToPath } from 'node:url';
+import AdmZip from 'adm-zip';
+import logger from '../core/logger.js';
+
+const __dirname = path.dirname(fileURLToPath(import.meta.url));
+const PLUGINS_DIR = path.resolve(__dirname, '../../src/plugins');
+
+export default async function pluginsManagementRoutes(server: FastifyInstance) {
+    // Register multipart support
+    server.register(multipart);
+
+    server.post('/install', async (request, reply) => {
+        // 1. Authentication Check (P0)
+        // The global onRequest hook attaches 'user' to the request if a valid session exists.
+        const user = (request as any).user;
+        if (!user) {
+            return reply.code(401).send({ message: 'Unauthorized: You must be logged in to install plugins.' });
+        }
+
+        // Optional: Add role check here if needed (e.g., if (user.role !== 'admin'))
+
+        const data = await request.file();
+        if (!data) {
+            return reply.code(400).send({ message: 'No file uploaded' });
+        }
+
+        if (!data.filename.endsWith('.zip')) {
+            return reply.code(400).send({ message: 'File must be a .zip archive' });
+        }
+
+        const tempExtractDir = path.join(PLUGINS_DIR, `temp_extract_${Date.now()}`);
+
+        try {
+            const buffer = await data.toBuffer();
+            const zip = new AdmZip(buffer);
+            const zipEntries = zip.getEntries();
+
+            // 2. Zip Slip Prevention (P1)
+            // Validate all entries before extracting
+            for (const entry of zipEntries) {
+                const entryName = entry.entryName;
+                const targetPath = path.join(tempExtractDir, entryName);
+
+                // Prevent directory traversal attacks
+                if (!targetPath.startsWith(tempExtractDir)) {


------------------------------------------------------------
Comment #2570885681 by Copilot on web/components/Header.tsx:N/A
State: null | Created: 2025-11-28T08:59:23Z

The mobile menu button is placed inside the desktop `nav` element (line 50) but has `lg:hidden` classes, meaning it will be hidden on large screens. This button should be moved outside the desktop nav container to be properly visible on mobile/tablet screens. Consider restructuring:

```tsx
{/* Desktop Nav */}
<nav className="hidden lg:flex items-center space-x-1">
  {/* ... desktop nav items ... */}
</nav>

{/* Mobile Menu Button */}
<button
  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
  className="lg:hidden p-2 rounded-md..."
>
  {/* ... */}
</button>
```
```suggestion
                    </nav>
                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="lg:hidden ml-4 p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary"
                    >
                        <span className="sr-only">Open main menu</span>
                        {isMobileMenuOpen ? (
                            <i data-lucide="x" className="block h-6 w-6" aria-hidden="true" />
                        ) : (
                            <i data-lucide="menu" className="block h-6 w-6" aria-hidden="true" />
                        )}
                    </button>
```

Code context:
@@ -0,0 +1,199 @@
+import { useEffect, useState } from 'react';
+import { Link, useLocation } from 'react-router-dom';
+import { logout } from '../api/client';
+import { NavItem } from '../api/pluginRegistry';
+import { usePluginContext } from '../context/PluginContext';
+import { useAuth } from '../context/AppContext';
+
+export default function Header() {
+    const { user, theme: { isDark, toggleTheme } } = useAuth();
+    const { plugins } = usePluginContext();
+    const [pluginNavItems, setPluginNavItems] = useState<NavItem[]>([]);
+    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
+
+    // Removed local user fetching effect since it's in AppContext
+
+    useEffect(() => {
+        const items: NavItem[] = [];
+        for (const plugin of plugins) {
+            if (plugin.web?.navItems) {
+                items.push(...plugin.web.navItems);
+            }
+        }
+        setPluginNavItems(items);
+    }, [plugins]);
+
+    // Initialize Lucide icons after mount
+    useEffect(() => {
+        if (typeof (window as any).lucide !== 'undefined') {
+            (window as any).lucide.createIcons();
+        }
+    }, [user, isDark, pluginNavItems]);
+
+    return (
+        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 fixed top-0 left-0 right-0 z-50 h-20">
+            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
+                <div className="flex justify-between items-center h-20">
+                    {/* Logo Container */}
+                    <div className="flex items-center gap-3">
+                        <img
+                            src="/assets/images/jasper-logo.png"
+                            alt="Jasper Logo"
+                            className="h-12 w-12 object-contain rounded-full border-2 border-brand-primary glow-primary"
+                        />
+                        <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
+                            Jasper <span className="text-brand-primary">Dashboard</span>
+                        </span>
+                    </div>
+
+                    {/* Desktop Nav */}
+                    <nav className="hidden lg:flex items-center space-x-1">
+                        <NavLink to="/workers" icon="users">Workers</NavLink>
+                        <NavLink to="/queues" icon="list-music">Queues</NavLink>
+                        <NavLink to="/stats" icon="bar-chart-2">Stats</NavLink>
+                        <NavLink to="/cache" icon="database">Cache</NavLink>
+                        <NavLink to="/logs" icon="terminal">Logs</NavLink>
+
+                        {/* Plugin Nav Items */}
+                        {pluginNavItems.map(item => (
+                            <NavLink key={item.id} to={item.href} icon={item.icon}>{item.label}</NavLink>
+                        ))}
+
+                        {/* Auth Button */}
+                        <div className="ml-2">
+                            {user ? (
+                                <div className="flex items-center gap-3">
+                                    <div className="flex items-center gap-2">
+                                        {user.avatar ? (
+                                            <img
+                                                src={user.avatar}
+                                                className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700"
+                                                alt={user.username}
+                                            />
+                                        ) : (
+                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
+                                                <i data-lucide="user" className="w-4 h-4 text-gray-500"></i>
+                                            </div>
+                                        )}
+                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:inline">
+                                            {user.username}
+                                        </span>
+                                    </div>
+                                    <button
+                                        onClick={logout}
+                                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
+                                        title="Logout"
+                                    >
+                                        <i data-lucide="log-out" className="w-4 h-4"></i>
+                                    </button>
+                                </div>
+                            ) : (
+                                <a
+                                    href="/api/auth/login"
+                                    className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 transition-colors flex items-center gap-2"
+                                >
+                                    <i data-lucide="log-in" className="w-4 h-4"></i>
+                                    Login
+                                </a>
+                            )}
+                        </div>
+
+                        {/* Dark Mode Toggle */}
+                        <button
+                            onClick={toggleTheme}
+                            type="button"
+                            className="ml-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2.5 transition-colors"
+                        >
+                            {isDark ? (
+                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
+                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
+                                </svg>
+                            ) : (
+                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
+                                    <path
+                                        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607l-.707-.707a1 1 0 010-1.414 1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414zM4.95 15.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414zM1.414 6.364l.707.707a1 1 0 010 1.414 1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z"
+                                        fillRule="evenodd"
+                                        clipRule="evenodd"
+                                    ></path>
+                                </svg>
+                            )}
+                        </button>
+                        {/* Mobile Menu Button */}
+                        <button
+                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
+                            className="lg:hidden ml-4 p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary"
+                        >
+                            <span className="sr-only">Open main menu</span>
+                            {isMobileMenuOpen ? (
+                                <i data-lucide="x" className="block h-6 w-6" aria-hidden="true" />
+                            ) : (
+                                <i data-lucide="menu" className="block h-6 w-6" aria-hidden="true" />
+                            )}
+                        </button>
+                    </nav>


------------------------------------------------------------
Comment #2570885701 by Copilot on web/pages/StatsPage.tsx:N/A
State: null | Created: 2025-11-28T08:59:24Z

Dynamic class names with Tailwind CSS don't work as expected with template literals. The class `text-${color}` will not be included in the final CSS bundle because Tailwind's PurgeCSS/JIT compiler only detects complete class names.

Use conditional logic or a mapping object instead:

```typescript
const colorClasses = {
  'brand-primary': 'text-brand-primary',
  'brand-secondary': 'text-brand-secondary',
};
// Then use: className={`w-4 h-4 ${colorClasses[color as keyof typeof colorClasses]}`}
```

Code context:
@@ -0,0 +1,251 @@
+import { useEffect, useState } from 'react';
+import { fetchStats } from '../api/client';
+
+export default function StatsPage() {
+    const [stats, setStats] = useState<any>(null);
+    const [loading, setLoading] = useState(true);
+
+    useEffect(() => {
+        const loadStats = async () => {
+            try {
+                const data = await fetchStats(10);
+                setStats(data);
+            } catch (error) {
+                console.error('Failed to fetch stats:', error);
+            } finally {
+                setLoading(false);
+            }
+        };
+
+        loadStats();
+        const interval = setInterval(loadStats, 10000); // Refresh every 10 seconds
+        return () => clearInterval(interval);
+    }, []);
+
+    // Initialize Lucide icons
+    useEffect(() => {
+        if (typeof (window as any).lucide !== 'undefined') {
+            (window as any).lucide.createIcons();
+        }
+    }, [stats]);
+
+    const formatDuration = (seconds: number) => {
+        if (!seconds) return '00:00';
+        const hours = Math.floor(seconds / 3600);
+        const minutes = Math.floor((seconds % 3600) / 60);
+        if (hours > 0) return `${hours}h ${minutes}m`;
+        return `${minutes}m`;
+    };
+
+    if (loading) {
+        return (
+            <section id="stats" className="mb-16 scroll-mt-24">
+                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
+                    <i data-lucide="bar-chart-2" className="w-8 h-8 text-brand-secondary"></i>
+                    Statistics
+                </h2>
+                <div className="animate-pulse space-y-8">
+                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
+                        {[1, 2].map(i => (
+                            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl h-24"></div>
+                        ))}
+                    </div>
+                </div>
+            </section>
+        );
+    }
+
+    const { globalStats, topSongs, topUsers, topChannels, topBots } = stats || {};
+
+    return (
+        <section id="stats" className="mb-16 scroll-mt-24">
+            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
+                <i data-lucide="bar-chart-2" className="w-8 h-8 text-brand-secondary"></i>
+                Statistics
+            </h2>
+
+            {/* Global Stats Cards */}
+            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
+                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-brand-primary dark:border-t-0 dark:border-r-0 dark:border-b-0">
+                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
+                        Total Plays
+                    </h3>
+                    <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
+                        {globalStats?.totalPlays?.toLocaleString() || 0}
+                    </p>
+                </div>
+                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-brand-secondary dark:border-t-0 dark:border-r-0 dark:border-b-0">
+                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
+                        Total Playtime
+                    </h3>
+                    <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
+                        {formatDuration(globalStats?.totalDuration || 0)}
+                    </p>
+                </div>
+            </div>
+
+            {/* Top Stats - 2 columns */}
+            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
+                {/* Top Songs */}
+                <StatsCard title="Top Songs" icon="music" color="brand-primary">
+                    {topSongs?.length > 0 ? (
+                        topSongs.map((song: any, index: number) => (
+                            <div key={song.songUrl} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
+                                <div className="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">
+                                    {index + 1}
+                                </div>
+                                <div className="flex-1 min-w-0">
+                                    <a
+                                        href={song.songUrl}
+                                        target="_blank"
+                                        rel="noopener noreferrer"
+                                        className="font-medium text-gray-900 dark:text-white hover:text-brand-primary truncate block"
+                                    >
+                                        {song.songTitle}
+                                    </a>
+                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
+                                        {formatDuration(song.totalDuration)} total played
+                                    </div>
+                                </div>
+                                <div className="text-right">
+                                    <div className="font-bold text-brand-secondary">{song.playCount}</div>
+                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
+                                </div>
+                            </div>
+                        ))
+                    ) : (
+                        <div className="p-4 text-center text-gray-500 text-sm">No data yet</div>
+                    )}
+                </StatsCard>
+
+                {/* Top Users */}
+                <StatsCard title="Top Listeners" icon="user" color="brand-secondary">
+                    {topUsers?.length > 0 ? (
+                        topUsers.map((user: any, index: number) => (
+                            <div key={user.userId} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
+                                <div className="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">
+                                    {index + 1}
+                                </div>
+                                {user.avatarUrl ? (
+                                    <img
+                                        src={user.avatarUrl}
+                                        alt={user.username}
+                                        className="w-10 h-10 rounded-full border-2 border-brand-primary object-cover"
+                                    />
+                                ) : (
+                                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600"></div>
+                                )}
+                                <div className="flex-1 min-w-0">
+                                    <div className="font-medium text-gray-900 dark:text-white truncate">
+                                        {user.username}
+                                    </div>
+                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
+                                        {formatDuration(user.totalDuration)} total listening time
+                                    </div>
+                                </div>
+                                <div className="text-right">
+                                    <div className="font-bold text-brand-primary">{user.playCount}</div>
+                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
+                                </div>
+                            </div>
+                        ))
+                    ) : (
+                        <div className="p-4 text-center text-gray-500 text-sm">No data yet</div>
+                    )}
+                </StatsCard>
+            </div>
+
+            {/* Second row: Top Channels and Top Bots */}
+            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
+                {/* Top Channels */}
+                <StatsCard title="Top Channels" icon="hash" color="brand-primary">
+                    {topChannels?.length > 0 ? (
+                        topChannels.map((channel: any, index: number) => (
+                            <div
+                                key={channel.channelId}
+                                className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
+                                title={channel.guildName}
+                            >
+                                <div className="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">
+                                    {index + 1}
+                                </div>
+                                {channel.guildIconUrl ? (
+                                    <img
+                                        src={channel.guildIconUrl}
+                                        alt={channel.guildName}
+                                        className="w-10 h-10 rounded-full border-2 border-brand-primary object-cover"
+                                    />
+                                ) : (
+                                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
+                                        <i data-lucide="hash" className="w-5 h-5 text-gray-500"></i>
+                                    </div>
+                                )}
+                                <div className="flex-1 min-w-0">
+                                    <div className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-1">
+                                        <i data-lucide="hash" className="w-3 h-3 text-gray-400"></i>
+                                        {channel.channelName}
+                                    </div>
+                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
+                                        {channel.guildName}
+                                    </div>
+                                </div>
+                                <div className="text-right">
+                                    <div className="font-bold text-brand-primary">{channel.playCount}</div>
+                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
+                                </div>
+                            </div>
+                        ))
+                    ) : (
+                        <div className="p-4 text-center text-gray-500 text-sm">No data yet</div>
+                    )}
+                </StatsCard>
+
+                {/* Top Bots */}
+                <StatsCard title="Top Bots" icon="bot" color="brand-secondary">
+                    {topBots?.length > 0 ? (
+                        topBots.map((bot: any, index: number) => (
+                            <div key={bot.botName} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
+                                <div className="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">
+                                    {index + 1}
+                                </div>
+                                <div className="w-10 h-10 rounded-full bg-brand-secondary/10 flex items-center justify-center">
+                                    <i data-lucide="bot" className="w-5 h-5 text-brand-secondary"></i>
+                                </div>
+                                <div className="flex-1 min-w-0">
+                                    <div className="font-medium text-gray-900 dark:text-white truncate">
+                                        {bot.botName}
+                                    </div>
+                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
+                                        Heavenly Council Member
+                                    </div>
+                                </div>
+                                <div className="text-right">
+                                    <div className="font-bold text-brand-secondary">{bot.playCount}</div>
+                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
+                                </div>
+                            </div>
+                        ))
+                    ) : (
+                        <div className="p-4 text-center text-gray-500 text-sm">No data yet</div>
+                    )}
+                </StatsCard>
+            </div>
+        </section>
+    );
+}
+
+function StatsCard({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) {
+    return (
+        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
+            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
+                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
+                    <i data-lucide={icon} className={`w-4 h-4 text-${color}`}></i>


------------------------------------------------------------
Comment #2570885712 by Copilot on vite.config.ts:N/A
State: null | Created: 2025-11-28T08:59:24Z

The alias path `/web/ui` is an absolute filesystem path that may not work correctly in all environments. Consider using a relative path from the root or using `path.resolve()`:

```typescript
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ...
resolve: {
    alias: {
        '@jasper/ui': path.resolve(__dirname, './web/ui')
    }
}
```

Code context:
@@ -0,0 +1,37 @@
+import { defineConfig } from 'vite';
+import react from '@vitejs/plugin-react';
+
+export default defineConfig({
+    plugins: [react()],
+    root: 'web',
+    publicDir: '../public/assets',
+    base: '/',
+    build: {
+        outDir: '../dist/public',
+        emptyOutDir: true,
+    },
+    server: {
+        port: 5173,
+        proxy: {
+            '/api': {
+                target: 'http://localhost:3000',
+                changeOrigin: true,
+                bypass(req) {
+                    // Don't proxy if it's requesting a .ts or .tsx file
+                    if (req.url?.match(/\.(ts|tsx)$/)) {
+                        return req.url;
+                    }
+                }
+            },
+            '/plugins': {
+                target: 'http://localhost:3000',
+                changeOrigin: true
+            }
+        }
+    },
+    resolve: {
+        alias: {
+            '@jasper/ui': '/web/ui'
------------------------------------------------------------
Comment #2570887702 by chatgpt-codex-connector[bot] on web/hooks/usePlugins.ts:N/A
State: null | Created: 2025-11-28T09:00:02Z

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Register imported plugin components with ComponentRegistry**

The plugin loader imports each plugin bundle but discards the module, so none of the exported widgets/pages ever reach `componentRegistry`. With the registry remaining empty, `ExtensionSlot` and the dynamic `PluginRoute` always render "Component not found" even though the plugin manifest declares UI contributions. Any plugin that relies on `web.widgets` or `web.pages` will therefore never render once the registry is fetched.

Useful? React with 👍 / 👎.

Code context:
@@ -0,0 +1,47 @@
+import { useEffect, useState } from 'react';
+import { fetchPluginRegistry, PluginRegistryEntry } from '../api/pluginRegistry';
+
+export function usePlugins() {
+    const [plugins, setPlugins] = useState<PluginRegistryEntry[]>([]);
+    const [loading, setLoading] = useState(true);
+    const [error, setError] = useState<string | null>(null);
+
+    useEffect(() => {
+        async function load() {
+            try {
+                const registry = await fetchPluginRegistry();
+                setPlugins(registry);
+
+                // Dynamically load plugin scripts
+                await Promise.all(registry.map(async (plugin) => {
+                    if (plugin.web && plugin.web.entry) {
+                        try {
+                            // Construct URL for the plugin entry point
+                            // See PLUGINS_DEV.md "Frontend Asset Serving" for details on this URL structure.
+                            const entryUrl = `/plugins/${plugin.id}/web/index.js`;
+
+                            console.log(`[PluginLoader] Loading ${plugin.id} from ${entryUrl}`);
+
+                            // Dynamic import
+                            // @ts-ignore
+                            await import(/* @vite-ignore */ entryUrl);
+
+                            console.log(`[PluginLoader] Loaded ${plugin.id}`);


------------------------------------------------------------
Comment #2570887712 by chatgpt-codex-connector[bot] on src/api/plugins-management.ts:N/A
State: null | Created: 2025-11-28T09:00:02Z

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Install endpoint writes plugins to unused dist/src path**

The DevTools `/install` route extracts uploads to `path.resolve(__dirname, '../../src/plugins')`, which resolves to `dist/src/plugins` in the compiled build (`npm start` runs `dist/index.js`). The runtime plugin manager loads from `dist/plugins`, so uploaded plugins are saved to a directory the loader never scans and will never be picked up in production. Align the install path with the manager’s `dist/plugins` location to make uploaded plugins load.

Useful? React with 👍 / 👎.

Code context:
@@ -0,0 +1,96 @@
+import { FastifyInstance } from 'fastify';
+import multipart from '@fastify/multipart';
+import fs from 'node:fs';
+import path from 'node:path';
+import { fileURLToPath } from 'node:url';
+import AdmZip from 'adm-zip';
+import logger from '../core/logger.js';
+
+const __dirname = path.dirname(fileURLToPath(import.meta.url));
+const PLUGINS_DIR = path.resolve(__dirname, '../../src/plugins');
