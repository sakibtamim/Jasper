import { React, createContext, useContext, ReactNode } from '@jasper/elements';
import { usePlugins } from '../hooks/usePlugins';
import { PluginRegistryEntry } from '../services/pluginRegistry';

interface PluginContextType {
    plugins: PluginRegistryEntry[];
    loading: boolean;
    error: string | null;
}

const PluginContext = createContext<PluginContextType>({
    plugins: [],
    loading: true,
    error: null
});

export function PluginProvider({ children }: { children: ReactNode }) {
    const { plugins, loading, error } = usePlugins();

    return (
        <PluginContext.Provider value={{ plugins, loading, error }}>
            {children}
        </PluginContext.Provider>
    );
}

export function usePluginContext() {
    return useContext(PluginContext);
}
