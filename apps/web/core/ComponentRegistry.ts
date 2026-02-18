import { React } from "@jasper/elements";

export type ComponentMap = Map<string, React.ComponentType<unknown>>;

class ComponentRegistry {
  private components: ComponentMap = new Map();

  /**
   * Register a component from a plugin.
   * @param pluginId The ID of the plugin.
   * @param componentName The name of the component (must match manifest).
   * @param component The React component.
   */
  register(
    pluginId: string,
    componentName: string,
    component: React.ComponentType<unknown>,
  ) {
    const key = `${pluginId}:${componentName}`;
    this.components.set(key, component);
    console.log(`[ComponentRegistry] Registered ${key}`);
  }

  /**
   * Get a component by plugin ID and component name.
   * @param pluginId The ID of the plugin.
   * @param componentName The name of the component.
   */
  get(
    pluginId: string,
    componentName: string,
  ): React.ComponentType<unknown> | null {
    const key = `${pluginId}:${componentName}`;
    return this.components.get(key) || null;
  }

  /**
   * Get a component by its full key (pluginId:componentName).
   * @param key The full key.
   */
  getByKey(key: string): React.ComponentType<unknown> | null {
    return this.components.get(key) || null;
  }
}

// Singleton instance
export const componentRegistry = new ComponentRegistry();

// Expose on window for plugins to use (since they are loaded as modules but might need global access if not bundled with registry)
// Actually, plugins will import 'react' but how do they access registry?
// In the sample plugin, I used `window.componentRegistry`.
// So we need to expose it.
// (window as any).componentRegistry = componentRegistry;
