import React, { useEffect, useState } from 'react';
import { componentRegistry } from '../core/ComponentRegistry';
import { fetchPluginRegistry } from '../api/pluginRegistry';
import { useAppContext } from '../context/AppContext';
import { PluginErrorBoundary } from './PluginErrorBoundary';

interface ExtensionSlotProps {
    slot: string;
    context?: any;
}

export default function ExtensionSlot({ slot, context }: ExtensionSlotProps) {
    const [widgets, setWidgets] = useState<{ id: string; Component: React.ComponentType<any> }[]>([]);

    useEffect(() => {
        const loadWidgets = async () => {
            try {
                const plugins = await fetchPluginRegistry();
                const slotWidgets: { id: string; Component: React.ComponentType<any> }[] = [];

                for (const plugin of plugins) {
                    if (plugin.web?.widgets) {
                        const matchingWidgets = plugin.web.widgets
                            .filter(w => w.slot === slot)
                            .sort((a, b) => a.order - b.order);

                        if (matchingWidgets.length > 0) {
                            // Load plugin entry if not already loaded
                            // We assume the entry file registers components to the registry
                            const entryFile = plugin.web.entry || 'index.js';
                            const entryUrl = `/plugins/${plugin.id}/web/${entryFile}`;

                            try {
                                // Dynamic import
                                await import(/* @vite-ignore */ entryUrl);
                            } catch (e) {
                                console.error(`Failed to load plugin ${plugin.id}`, e);
                            }

                            for (const widget of matchingWidgets) {
                                const Component = componentRegistry.get(plugin.id, widget.component);
                                if (Component) {
                                    slotWidgets.push({ id: `${plugin.id}:${widget.id}`, Component });
                                }
                            }
                        }
                    }
                }
                setWidgets(slotWidgets);
            } catch (err) {
                console.error("Failed to load extension slot widgets", err);
            }
        };

        loadWidgets();
    }, [slot]);

    const appContext = useAppContext();

    if (widgets.length === 0) return null;

    return (
        <>
            {widgets.map(({ id, Component }) => (
                <PluginErrorBoundary key={id} pluginId={id.split(':')[0]} componentName={id.split(':')[1]}>
                    <Component context={{ ...appContext, ...context }} />
                </PluginErrorBoundary>
            ))}
        </>
    );
}
