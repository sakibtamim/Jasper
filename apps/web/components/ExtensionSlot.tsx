import { React, useMemo } from '@jasper/elements';

import { useAppContext } from '../context/AppContext';
import { usePluginContext } from '../context/PluginContext';
import { componentRegistry } from '../core/ComponentRegistry';
import { PluginErrorBoundary } from './PluginErrorBoundary';

interface ExtensionContext {
    [key: string]: unknown;
}

interface ExtensionSlotProps {
    slot: string;
    context?: ExtensionContext;
}

export default function ExtensionSlot({ slot, context }: ExtensionSlotProps) {
    const { plugins } = usePluginContext();
    const appContext = useAppContext();

    const widgets = useMemo(() => {
        const slotWidgets: {
            id: string;
            Component: React.ComponentType<unknown>;
        }[] = [];

        for (const plugin of plugins) {
            const matchingWidgets =
                plugin.web?.widgets
                    ?.filter((w) => w.slot === slot)
                    .sort((a, b) => a.order - b.order) || [];

            for (const widget of matchingWidgets) {
                const Component = componentRegistry.get(plugin.id, widget.component);
                if (Component) {
                    slotWidgets.push({ id: `${plugin.id}:${widget.id}`, Component });
                } else {
                    console.warn(
                        `[ExtensionSlot] Component "${widget.component}" for plugin "${plugin.id}" not found in registry.`,
                    );
                }
            }
        }
        return slotWidgets;
    }, [plugins, slot]);

    if (widgets.length === 0) return null;

    return (
        <>
            {widgets.map(({ id, Component }) => (
                <PluginErrorBoundary
                    key={id}
                    pluginId={id.split(':')[0]}
                    componentName={id.split(':')[1]}
                >
                    <Component {...({ context: { ...appContext, ...context } } as any)} />
                </PluginErrorBoundary>
            ))}
        </>
    );
}
