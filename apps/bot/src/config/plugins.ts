/**
 * Initial production plugins verified and supported for production releases.
 * Garage Band and Soundboard are conditionally enabled production plugins.
 */
export const PRODUCTION_PLUGIN_IDS = ['garage-band', 'soundboard'] as const;

/**
 * Plugins that are considered "test" plugins and should be disabled in production by default.
 */
export const TEST_PLUGINS = [
    'advanced-hooks-test-plugin',
    'db-test-plugin',
    'dashboard-notes',
    'media-gallery',
];

/**
 * Plugins explicitly excluded from production images and release manifests.
 * Excludes sound-effect-plugin and all test/demo plugins.
 */
export const EXCLUDED_PRODUCTION_PLUGIN_IDS = ['sound-effect-plugin', ...TEST_PLUGINS] as const;

export function isProductionPlugin(pluginId: string): boolean {
    return (PRODUCTION_PLUGIN_IDS as readonly string[]).includes(pluginId);
}

export function isExcludedFromProduction(pluginId: string): boolean {
    return (EXCLUDED_PRODUCTION_PLUGIN_IDS as readonly string[]).includes(pluginId);
}

export function getProductionPluginInventory(): readonly string[] {
    return PRODUCTION_PLUGIN_IDS;
}
