import { useEffect, useState } from "@jasper/elements";
import {
  fetchPluginRegistry,
  PluginRegistryEntry,
} from "../services/pluginRegistry";
import { componentRegistry } from "../core/ComponentRegistry";

export function usePlugins() {
  const [plugins, setPlugins] = useState<PluginRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Glob all potential plugin entry points for dev mode
  // Glob all potential plugin entry points for dev mode
  const pluginEntries = (import.meta as any).glob(
    "@plugins/*/web/index.{ts,tsx,js,jsx}",
  );

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

                if (import.meta.env.DEV) {
                  // Development: Load source directly via Vite HMR
                  console.log(
                    `[PluginLoader] Loading ${plugin.id} from source...`,
                  );

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
                  if (typeof entryImport === "function") {
                    module = await entryImport();
                  }
                } else {
                  // Production: Load built script via script tag
                  const entryUrl = `/plugins/${plugin.id}/web/index.js`;
                  console.log(
                    `[PluginLoader] Loading ${plugin.id} from ${entryUrl}`,
                  );

                  await new Promise<void>((resolve, reject) => {
                    const script = document.createElement("script");
                    script.src = entryUrl;
                    script.onload = () => resolve();
                    script.onerror = () =>
                      reject(new Error(`Failed to load script ${entryUrl}`));
                    document.body.appendChild(script);
                  });

                  // Get the plugin module from the global variable
                  const varName =
                    "JasperPlugin_" + plugin.id.replace(/-/g, "_");
                  module = (window as any)[varName];
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
