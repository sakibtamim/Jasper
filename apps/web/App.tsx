import { React, useEffect, useState } from '@jasper/elements';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import WorkersPage from './pages/WorkersPage';
import QueuesPage from './pages/QueuesPage';
import StatsPage from './pages/StatsPage';
import CachePage from './pages/CachePage';
import LogsPage from './pages/LogsPage';
import DevToolsPage from './pages/DevToolsPage';
import { PluginProvider, usePluginContext } from './context/PluginContext';
import { AppProvider } from './context/AppContext';
import { componentRegistry } from './core/ComponentRegistry';

function PluginRoute({ pluginId, componentName }: { pluginId: string, componentName: string }) {
    const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);

    useEffect(() => {
        // Components should be registered by now since PluginProvider loads them
        const Comp = componentRegistry.get(pluginId, componentName);
        setComponent(Comp);
    }, [pluginId, componentName]);

    if (!Component) return <div className="p-8 text-center text-gray-500">Component not found: {pluginId}:{componentName}</div>;
    return <Component />;
}

function AppContent() {
    const { plugins, loading } = usePluginContext();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">
                Loading Jasper...
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/workers" replace />} />
                <Route path="workers" element={<WorkersPage />} />
                <Route path="queues" element={<QueuesPage />} />
                <Route path="stats" element={<StatsPage />} />
                <Route path="cache" element={<CachePage />} />
                <Route path="logs" element={<LogsPage />} />
                <Route path="devtools" element={<DevToolsPage />} />

                {/* Plugin Routes */}
                {plugins.map(plugin =>
                    plugin.web?.pages?.map(page => (
                        <Route
                            key={`${plugin.id}-${page.id}`}
                            path={page.path.startsWith('/') ? page.path.substring(1) : page.path}
                            element={<PluginRoute pluginId={plugin.id} componentName={page.component} />}
                        />
                    ))
                )}
            </Route>
        </Routes>
    );
}

export default function App() {
    return (
        <AppProvider>
            <PluginProvider>
                <BrowserRouter basename="/">
                    <AppContent />
                </BrowserRouter>
            </PluginProvider>
        </AppProvider>
    );
}
