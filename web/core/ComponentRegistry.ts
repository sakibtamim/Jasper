import React from 'react';

export type ComponentMap = Map<string, React.ComponentType<any>>;

class ComponentRegistry {
    private components: ComponentMap = new Map();

    register(pluginId: string, componentName: string, component: React.ComponentType<any>) {
        const key = `${pluginId}:${componentName}`;
        this.components.set(key, component);
        console.log(`[ComponentRegistry] Registered ${key}`);
    }

    get(pluginId: string, componentName: string): React.ComponentType<any> | null {
        const key = `${pluginId}:${componentName}`;
        return this.components.get(key) || null;
    }
}

export const componentRegistry = new ComponentRegistry();
