import { useEffect, useState } from '@jasper/elements';
import { fetchPluginRegistry, PluginRegistryEntry } from '../api/pluginRegistry';
import { componentRegistry } from '../core/ComponentRegistry';

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
                            // See PLUGINS_DEV.md "Frontend Asset Serving" for details on this URL structure.
                            const entryUrl = `/plugins/${plugin.id}/web/index.js`;

                            console.log(`[PluginLoader] Loading ${plugin.id} from ${entryUrl}`);

                            // Dynamic import

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
