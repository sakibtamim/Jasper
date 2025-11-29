import { React, useState } from '@jasper/elements';
import { usePluginContext } from '../context/PluginContext';

export default function DevToolsPage() {
    const { plugins } = usePluginContext();
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.zip')) {
            setMessage('Error: Please upload a .zip file.');
            return;
        }

        setUploading(true);
        setMessage('Uploading...');

        const formData = new FormData();
        formData.append('plugin', file);

        try {
            const res = await fetch('/api/plugins/install', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || res.statusText);
            }

            const data = await res.json();
            setMessage(`Success: ${data.message}. Please restart the bot to apply changes.`);
        } catch (e) {
            setMessage(`Error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Developer Tools</h1>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Plugin Management</h2>

                <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Install Plugin</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Upload a plugin .zip file (exported via <code>npm run export-plugin</code>).
                    </p>
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            accept=".zip"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-brand-primary/10 file:text-brand-primary
                                hover:file:bg-brand-primary/20
                                dark:file:bg-brand-primary/20 dark:file:text-brand-primary-light
                            "
                        />
                        {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
                    </div>
                    {message && (
                        <div className={`mt-4 p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                            {message}
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">Installed Plugins</h3>
                    {plugins.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">No plugins installed.</p>
                    ) : (
                        <div className="grid gap-4">
                            {plugins.map(plugin => (
                                <div key={plugin.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">{plugin.name} <span className="text-xs text-gray-500 ml-2">v{plugin.version}</span></h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">ID: {plugin.id}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {plugin.web?.entry && (
                                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Frontend</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
