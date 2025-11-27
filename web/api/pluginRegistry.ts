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
    const res = await fetch('/api/plugins/registry');
    const data = await res.json();
    return data.plugins || [];
}
