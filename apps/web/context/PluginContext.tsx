import { usePlugins } from '@hooks/usePlugins';
import { React, ReactNode } from '@jasper/elements';
import { PluginContext, usePluginContext } from '@jasper/hooks';

export function PluginProvider({ children }: { children: ReactNode }) {
    const { plugins, loading, error } = usePlugins();

    return (
        <PluginContext.Provider value={{ plugins, loading, error }}>
            {children}
        </PluginContext.Provider>
    );
}

export { usePluginContext };
