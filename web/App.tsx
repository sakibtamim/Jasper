import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import WorkersPage from './pages/WorkersPage';
import QueuesPage from './pages/QueuesPage';
import StatsPage from './pages/StatsPage';
import CachePage from './pages/CachePage';
import LogsPage from './pages/LogsPage';
import { fetchPluginRegistry } from './api/pluginRegistry';
import { componentRegistry } from './core/ComponentRegistry';

function PluginRoute({ pluginId, componentName, entry }: { pluginId: string, componentName: string, entry?: string }) {
    const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);

    useEffect(() => {
        const load = async () => {
            if (entry) {
                try {
                    const entryUrl = `/plugins/${pluginId}/web/${entry}`;
                    await import(/* @vite-ignore */ entryUrl);
                } catch (e) {
                    console.error(`Failed to load plugin ${pluginId}`, e);
                }
            }
            const Comp = componentRegistry.get(pluginId, componentName);
            setComponent(() => Comp);
        };
        load();
    }, [pluginId, componentName, entry]);

    if (!Component) return <div className="p-8 text-center">Loading plugin...</div>;
    return <Component />;
}

export default function App() {
    const [pluginPages, setPluginPages] = useState<{ path: string, pluginId: string, component: string, entry?: string }[]>([]);

    useEffect(() => {
        fetchPluginRegistry().then(plugins => {
            const pages: { path: string, pluginId: string, component: string, entry?: string }[] = [];
            for (const plugin of plugins) {
                if (plugin.web?.pages) {
                    for (const page of plugin.web.pages) {
                        pages.push({
                            path: page.path,
                            pluginId: plugin.id,
                            component: page.component,
                            entry: plugin.web.entry || 'index.js'
                        });
                    }
                }
            }
            setPluginPages(pages);
        });
    }, []);

    return (
        <BrowserRouter basename="/">
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Navigate to="/workers" replace />} />
                    <Route path="workers" element={<WorkersPage />} />
                    <Route path="queues" element={<QueuesPage />} />
                    <Route path="stats" element={<StatsPage />} />
                    <Route path="cache" element={<CachePage />} />
                    <Route path="logs" element={<LogsPage />} />

                    {/* Plugin Routes */}
                    {pluginPages.map(page => (
                        <Route
                            key={page.path}
                            path={page.path.startsWith('/') ? page.path.substring(1) : page.path}
                            element={<PluginRoute pluginId={page.pluginId} componentName={page.component} entry={page.entry} />}
                        />
                    ))}
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
