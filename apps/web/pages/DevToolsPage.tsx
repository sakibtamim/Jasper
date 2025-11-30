import { React, useState, useEffect } from '@jasper/elements';
import { usePluginContext } from '../context/PluginContext';
import { Trash2, RefreshCw, Upload, HardDrive, Users, Clock, Database, BarChart2, Package } from 'lucide-react';

export default function DevToolsPage() {
    const { plugins } = usePluginContext();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Plugin Upload State
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadTab(activeTab);
    }, [activeTab]);

    const loadTab = async (tab: string) => {
        setLoading(true);
        setMessage(null);
        try {
            let endpoint = '';
            switch (tab) {
                case 'overview': endpoint = '/api/devtools/stats'; break;
                case 'users': endpoint = '/api/devtools/users'; break;
                case 'sessions': endpoint = '/api/devtools/sessions'; break;
                case 'cache': endpoint = '/api/devtools/cache'; break; // Also needs audio cache
                case 'stats': endpoint = '/api/devtools/stats/songs'; break; // Default to songs
                default: break;
            }

            if (endpoint) {
                const res = await fetch(endpoint);
                const json = await res.json();

                if (tab === 'cache') {
                    const audioRes = await fetch('/api/devtools/cache/audio');
                    const audioJson = await audioRes.json();
                    setData({ search: json.entries || [], audio: audioJson.entries || [] });
                } else if (tab === 'stats') {
                    // Load all stats
                    const [songs, users, channels, bots] = await Promise.all([
                        fetch('/api/devtools/stats/songs').then(r => r.json()),
                        fetch('/api/devtools/stats/users').then(r => r.json()),
                        fetch('/api/devtools/stats/channels').then(r => r.json()),
                        fetch('/api/devtools/stats/bots').then(r => r.json())
                    ]);
                    setData({ songs, users, channels, bots });
                } else {
                    setData(json);
                }
            }
        } catch (error) {
            console.error('Failed to load tab data:', error);
            setMessage(`Error loading data: ${error}`);
        } finally {
            setLoading(false);
        }
    };

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

    const deleteItem = async (endpoint: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            const res = await fetch(endpoint, { method: 'DELETE' });
            if (res.ok) {
                loadTab(activeTab);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to delete');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to delete');
        }
    };

    const regenerateThumbnail = async (videoId: string) => {
        if (!confirm('Regenerate thumbnail? This will fetch metadata from YouTube.')) return;
        try {
            const res = await fetch(`/api/devtools/cache/audio/${videoId}/regenerate-thumbnail`, { method: 'POST' });
            if (res.ok) {
                alert('Thumbnail regenerated!');
                loadTab(activeTab);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to regenerate');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to regenerate');
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: HardDrive },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'sessions', label: 'Sessions', icon: Clock },
        { id: 'cache', label: 'Cache', icon: Database },
        { id: 'stats', label: 'Stats', icon: BarChart2 },
        { id: 'plugins', label: 'Plugins', icon: Package },
    ];

    return (
        <div className="max-w-6xl mx-auto mb-16">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <i data-lucide="tool" className="w-8 h-8 text-gray-500"></i>
                Developer Tools
            </h1>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-1">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-white dark:bg-gray-800 text-brand-primary border-t border-l border-r border-gray-200 dark:border-gray-700 -mb-px'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-gray-800 rounded-b-xl rounded-tr-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[400px]">
                {message && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                        {message}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'overview' && data && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Plays</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalPlays?.toLocaleString()}</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Duration</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {Math.floor((data.totalDuration || 0) / 3600)}h {Math.floor(((data.totalDuration || 0) % 3600) / 60)}m
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Search Cache</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.searchCacheSize}</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Audio Cache</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.audioCacheFiles}</div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && data?.users && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th className="px-6 py-3">User</th>
                                            <th className="px-6 py-3">ID</th>
                                            <th className="px-6 py-3">Created At</th>
                                            <th className="px-6 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.users.map((user: any) => (
                                            <tr key={user.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                <td className="px-6 py-4 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} className="w-8 h-8 rounded-full" alt="" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                                                    )}
                                                    {user.username}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs">{user.id}</td>
                                                <td className="px-6 py-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <button onClick={() => deleteItem(`/api/devtools/users/${user.id}`)} className="text-red-600 hover:underline">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'sessions' && data?.sessions && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th className="px-6 py-3">Session ID</th>
                                            <th className="px-6 py-3">User ID</th>
                                            <th className="px-6 py-3">Expires</th>
                                            <th className="px-6 py-3">Created</th>
                                            <th className="px-6 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.sessions.map((session: any) => (
                                            <tr key={session.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                <td className="px-6 py-4 font-mono text-xs">{session.id}</td>
                                                <td className="px-6 py-4 font-mono text-xs">{session.userId}</td>
                                                <td className="px-6 py-4">{new Date(session.expiresAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">{new Date(session.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <button onClick={() => deleteItem(`/api/devtools/sessions/${session.id}`)} className="text-red-600 hover:underline">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'cache' && data && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Search Cache</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                                <tr>
                                                    <th className="px-6 py-3">Query</th>
                                                    <th className="px-6 py-3">Song Title</th>
                                                    <th className="px-6 py-3">Cached At</th>
                                                    <th className="px-6 py-3">Expires</th>
                                                    <th className="px-6 py-3">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.search.map((entry: any) => (
                                                    <tr key={entry.query} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <td className="px-6 py-4 truncate max-w-xs">{entry.query}</td>
                                                        <td className="px-6 py-4 truncate max-w-xs">{entry.songTitle}</td>
                                                        <td className="px-6 py-4">{new Date(entry.cachedAt).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4">{new Date(entry.expiresAt).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4">
                                                            <button onClick={() => deleteItem(`/api/devtools/cache/${encodeURIComponent(entry.query)}`)} className="text-red-600 hover:underline">Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Audio Cache</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                                <tr>
                                                    <th className="px-6 py-3">Video ID</th>
                                                    <th className="px-6 py-3">Title</th>
                                                    <th className="px-6 py-3">Duration</th>
                                                    <th className="px-6 py-3">Cached At</th>
                                                    <th className="px-6 py-3">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.audio.map((entry: any) => (
                                                    <tr key={entry.videoId} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <td className="px-6 py-4 font-mono text-xs">{entry.videoId}</td>
                                                        <td className="px-6 py-4 truncate max-w-xs">{entry.title}</td>
                                                        <td className="px-6 py-4">{Math.floor(entry.duration / 60)}:{(entry.duration % 60).toString().padStart(2, '0')}</td>
                                                        <td className="px-6 py-4">{new Date(entry.cachedAt).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 flex gap-2">
                                                            <button onClick={() => regenerateThumbnail(entry.videoId)} className="text-blue-600 hover:underline">Regen Thumb</button>
                                                            <button onClick={() => deleteItem(`/api/devtools/cache/audio/${entry.videoId}`)} className="text-red-600 hover:underline">Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'stats' && data && (
                            <div className="space-y-8">
                                {/* Songs */}
                                <div>
                                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Top Songs</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                                <tr>
                                                    <th className="px-6 py-3">Title</th>
                                                    <th className="px-6 py-3">Plays</th>
                                                    <th className="px-6 py-3">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.songs.map((song: any) => (
                                                    <tr key={song.songUrl} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <td className="px-6 py-4 truncate max-w-xs">{song.songTitle}</td>
                                                        <td className="px-6 py-4">{song.playCount}</td>
                                                        <td className="px-6 py-4">
                                                            <button onClick={() => deleteItem(`/api/devtools/stats/songs?url=${encodeURIComponent(song.songUrl)}`)} className="text-red-600 hover:underline">Delete Plays</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                {/* Users */}
                                <div>
                                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Top Users</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                                <tr>
                                                    <th className="px-6 py-3">User ID</th>
                                                    <th className="px-6 py-3">Plays</th>
                                                    <th className="px-6 py-3">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.users.map((user: any) => (
                                                    <tr key={user.userId} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <td className="px-6 py-4">{user.userId}</td>
                                                        <td className="px-6 py-4">{user.playCount}</td>
                                                        <td className="px-6 py-4">
                                                            <button onClick={() => deleteItem(`/api/devtools/stats/users/${user.userId}`)} className="text-red-600 hover:underline">Delete Plays</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'plugins' && (
                            <div>
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
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
