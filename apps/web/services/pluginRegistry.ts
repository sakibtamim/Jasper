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

export interface PluginWebManifest {
    entry?: string;
    navItems?: NavItem[];
    widgets?: WidgetContribution[];
    pages?: PageContribution[];
}

export interface PluginRegistryEntry {
    id: string;
    name: string;
    version: string;
    web: PluginWebManifest;
}

export async function fetchPluginRegistry(): Promise<PluginRegistryEntry[]> {
    try {
        const res = await fetch('/api/plugins/registry');
        if (!res.ok) {
            throw new Error(`Failed to fetch registry: ${res.statusText}`);
        }
        const data = await res.json();
        return data.plugins || [];
    } catch (error) {
        console.error('[PluginRegistry] Failed to fetch plugins:', error);
        return [];
    }
}
