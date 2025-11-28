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
