import { useEffect, useState } from 'react';
import { fetchPluginRegistry, PluginRegistryEntry } from '../api/pluginRegistry';

export function usePlugins() {
    const [plugins, setPlugins] = useState<PluginRegistryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const registry = await fetchPluginRegistry();
                setPlugins(registry);

                // Dynamically load plugin scripts
                await Promise.all(registry.map(async (plugin) => {
                    if (plugin.web && plugin.web.entry) {
                        try {
                            // Construct URL for the plugin entry point
                            // Assuming the build output structure: /plugins/<pluginId>/web/index.js
                            // But wait, the server serves static files?
                            // We need to ensure the server serves the plugin web files.
                            // The build script puts them in dist/plugins/<id>/web/index.js
                            // We need a route to serve these.
                            // Assuming /api/plugins/<id>/web/index.js or similar.
                            // Actually, the server serves static files from public/
                            // But plugins are in dist/plugins.
                            // We need to check server.ts to see how it serves plugin files.
                            // The plan mentions: "Update Backend to Serve React Build" but for plugins?
                            // MIGRATION.md says: "The current build (tsc + rsync) copies plugin files but does not compile plugin frontend code".
                            // It doesn't explicitly say how they are served.
                            // But PLUGINS.md says: "All routes registered by a plugin are automatically scoped to: /api/plugins/{pluginId}/**"
                            // That's for API routes.
                            // For static files, we might need to add a static file route for plugins.

                            // Let's assume for now we can access them via a specific path.
                            // I'll check server.ts in a moment.

                            // For now, let's assume /plugins/<id>/web/index.js
                            const entryUrl = `/plugins/${plugin.id}/web/index.js`;

                            console.log(`[PluginLoader] Loading ${plugin.id} from ${entryUrl}`);

                            // Dynamic import
                            // @ts-ignore
                            await import(/* @vite-ignore */ entryUrl);

                            console.log(`[PluginLoader] Loaded ${plugin.id}`);
                        } catch (e) {
                            console.error(`[PluginLoader] Failed to load ${plugin.id}:`, e);
                        }
                    }
                }));

            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    return { plugins, loading, error };
}
