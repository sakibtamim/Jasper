import { useEffect, useState } from '@jasper/elements';

import { componentRegistry } from '../core/ComponentRegistry';
import { PluginRegistryEntry, fetchPluginRegistry } from '../services/pluginRegistry';

export function usePlugins() {
    const [plugins, setPlugins] = useState<PluginRegistryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Glob all potential plugin entry points for dev mode
    // Glob all potential plugin entry points for dev mode
    const pluginEntries = (import.meta as any).glob('@plugins/*/web/index.{ts,tsx,js,jsx}');

    useEffect(() => {
        async function load() {
            try {
                const registry = await fetchPluginRegistry();
                setPlugins(registry);

                // Dynamically load plugin scripts
                await Promise.all(
                    registry.map(async (plugin) => {
                        if (plugin.web && plugin.web.entry) {
                            try {
                                let module: any;

                                // Development: Load source directly via Vite HMR
                                console.log(`[PluginLoader] Loading ${plugin.id} from source...`);

                                // Find matching entry
                                const entryPath = Object.keys(pluginEntries).find((path) =>
                                    path.includes(`/${plugin.id}/web/index.`),
                                );

                                if (!entryPath) {
                                    throw new Error(
                                        `Source entry not found for plugin ${plugin.id}`,
                                    );
                                }

                                const entryImport = pluginEntries[entryPath];
                                if (typeof entryImport === 'function') {
                                    module = await entryImport();
                                }

                                if (!module) {
                                    throw new Error(`Plugin module not found`);
                                }

                                // Register components from the imported module based on the manifest
                                const componentsToRegister = [
                                    ...(plugin.web.widgets || []).map((w) => w.component),
                                    ...(plugin.web.pages || []).map((p) => p.component),
                                ];

                                for (const componentName of new Set(componentsToRegister)) {
                                    if (module[componentName]) {
                                        componentRegistry.register(
                                            plugin.id,
                                            componentName,
                                            module[componentName],
                                        );
                                    } else {
                                        console.warn(
                                            `[PluginLoader] Component "${componentName}" not found in exports for plugin "${plugin.id}"`,
                                        );
                                    }
                                }

                                console.log(`[PluginLoader] Loaded ${plugin.id}`);
                            } catch (e) {
                                console.error(`[PluginLoader] Failed to load ${plugin.id}:`, e);
                            }
                        }
                    }),
                );
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
