import { React, useEffect, useState } from '@jasper/elements';
import { BarChart2, Clock, Cookie, Database, HardDrive, Package, Users } from 'lucide-react';
import { Lock } from 'lucide-react';

import { useAuth } from '../context/AppContext';
import { CookieManager } from '../src/components/devtools/CookieManager';

// Type definitions for DevTools tab data
interface OverviewData {
    totalPlays: number;
    totalDuration: number;
    searchCacheSize: number;
    audioMetadataCount: number;
}

interface UserData {
    id: string;
    username: string;
    avatar?: string;
    createdAt: string;
}

interface UsersData {
    users: UserData[];
}

interface SessionData {
    id: string;
    userId: string;
    expiresAt: string;
    createdAt: string;
}

interface SessionsData {
    sessions: SessionData[];
}

interface SearchCacheEntry {
    query: string;
    songTitle: string;
    cachedAt: string;
    expiresAt: string;
}

interface AudioCacheEntry {
    videoId: string;
    title: string;
    duration: number;
    cachedAt: string;
}

interface CacheData {
    search: SearchCacheEntry[];
    audio: AudioCacheEntry[];
}

interface SongStat {
    songUrl: string;
    songTitle: string;
    playCount: number;
}

interface UserStat {
    userId: string;
    playCount: number;
}

interface StatsData {
    songs: SongStat[];
    users: UserStat[];
    channels?: unknown[];
    bots?: unknown[];
}

interface PluginData {
    id: string;
    name: string;
    version: string;
    enabled: boolean;
    description?: string;
    web?: { entry: string };
    isTestPlugin?: boolean;
}

interface PluginsData {
    plugins: PluginData[];
}

type DevToolsData =
    | OverviewData
    | UsersData
    | SessionsData
    | CacheData
    | StatsData
    | PluginsData
    | null;

// Type guards
function isOverviewData(data: DevToolsData): data is OverviewData {
    return data !== null && 'totalPlays' in data;
}

function isUsersData(data: DevToolsData): data is UsersData {
    return data !== null && 'users' in data && !('songs' in data);
}

function isSessionsData(data: DevToolsData): data is SessionsData {
    return data !== null && 'sessions' in data;
}

function isCacheData(data: DevToolsData): data is CacheData {
    return data !== null && 'search' in data && 'audio' in data;
}

function isStatsData(data: DevToolsData): data is StatsData {
    return data !== null && 'songs' in data;
}

function isPluginsData(data: DevToolsData): data is PluginsData {
    return data !== null && 'plugins' in data;
}

export default function DevToolsPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DevToolsData>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Plugin Upload State
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const PROTECTED_TABS = ['users', 'sessions', 'cache', 'stats', 'plugins', 'cookies'];

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated || !PROTECTED_TABS.includes(activeTab)) {
                loadTab(activeTab);
            } else {
                // If active tab is protected and user is not authenticated, clear data and show message
                setData(null);
                setMessage('Please log in to view this tab.');
                setLoading(false);
            }
        }
    }, [activeTab, isAuthenticated, authLoading]);

    const loadTab = async (tab: string) => {
        if (PROTECTED_TABS.includes(tab) && !isAuthenticated) return;

        setLoading(true);
        setMessage(null);
        try {
            let endpoint = '';
            switch (tab) {
                case 'overview':
                    endpoint = '/api/devtools/stats';
                    break;
                case 'users':
                    endpoint = '/api/devtools/users';
                    break;
                case 'sessions':
                    endpoint = '/api/devtools/sessions';
                    break;
                case 'cache':
                    endpoint = '/api/devtools/cache';
                    break; // Also needs audio cache
                case 'stats':
                    endpoint = '/api/devtools/stats/songs';
                    break; // Default to songs
                case 'plugins':
                    endpoint = '/api/devtools/plugins';
                    break;
                case 'cookies':
                    break; // Handled by component
                default:
                    break;
            }

            if (endpoint) {
                const res = await fetch(endpoint);
                if (!res.ok) {
                    if (res.status === 401) {
                        throw new Error('Unauthorized');
                    }
                    throw new Error(`API Error: ${res.statusText}`);
                }
                const json = await res.json();

                if (tab === 'cache') {
                    const audioRes = await fetch('/api/devtools/cache/audio');
                    const audioJson = await audioRes.json();
                    setData({
                        search: json.entries || [],
                        audio: audioJson.entries || [],
                    });
                } else if (tab === 'stats') {
                    // Load all stats
                    const [songs, users, channels, bots] = await Promise.all([
                        fetch('/api/devtools/stats/songs').then((r) => r.json()),
                        fetch('/api/devtools/stats/users').then((r) => r.json()),
                        fetch('/api/devtools/stats/channels').then((r) => r.json()),
                        fetch('/api/devtools/stats/bots').then((r) => r.json()),
                    ]);
                    setData({ songs, users, channels, bots });
                } else if (tab === 'plugins') {
                    setData(json);
                } else {
                    setData(json);
                }
            }
        } catch (error) {
            console.error('Failed to load tab data:', error);
            setMessage(
                `Error loading data: ${error instanceof Error ? error.message : String(error)}`,
            );
            setData(null); // Clear data on error
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        } else {
            setSelectedFile(null);
        }
    };

    const handleInstallClick = async () => {
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.zip')) {
            setMessage('Error: Please select a .zip file.');
            return;
        }

        setUploading(true);
        setMessage('Uploading and installing plugin...');

        const formData = new FormData();
        formData.append('plugin', selectedFile);

        try {
            const res = await fetch('/api/plugins/install', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const text = await res.text();
                let errMessage = res.statusText;
                try {
                    const parsed = JSON.parse(text);
                    errMessage = parsed.message || parsed.error || errMessage;
                } catch {
                    errMessage = text;
                }
                throw new Error(errMessage);
            }

            const data = await res.json();
            setMessage(`Success: ${data.message}`);
            setSelectedFile(null);
            loadTab('plugins'); // Reload plugins tab
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
            const res = await fetch(`/api/devtools/cache/audio/${videoId}/regenerate-thumbnail`, {
                method: 'POST',
            });
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
        { id: 'overview', label: 'Overview', icon: HardDrive, protected: false },
        { id: 'users', label: 'Users', icon: Users, protected: true },
        { id: 'sessions', label: 'Sessions', icon: Clock, protected: true },
        { id: 'cache', label: 'Cache', icon: Database, protected: true },
        { id: 'stats', label: 'Stats', icon: BarChart2, protected: true },
        { id: 'plugins', label: 'Plugins', icon: Package, protected: true },
        { id: 'cookies', label: 'Cookies', icon: Cookie, protected: true },
    ];

    return (
        <div className="max-w-6xl mx-auto mb-16">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <i data-lucide="tool" className="w-8 h-8 text-gray-500"></i>
                Developer Tools
            </h1>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isProtectedAndUnauthenticated =
                        tab.protected && !isAuthenticated && !authLoading;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (isProtectedAndUnauthenticated) {
                                    setMessage('Please log in to view this tab.');
                                    setData(null);
                                    setLoading(false);
                                }
                                setActiveTab(tab.id);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-gray-800 text-brand-primary border-t border-l border-r border-gray-200 dark:border-gray-700 -mb-px'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            } ${isProtectedAndUnauthenticated ? 'opacity-60 cursor-not-allowed' : ''}`}
                            disabled={authLoading && tab.protected}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            {isProtectedAndUnauthenticated && <Lock className="w-3 h-3 ml-1" />}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-gray-800 rounded-b-xl rounded-tr-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[400px]">
                {PROTECTED_TABS.includes(activeTab) && !isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                            <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Authentication Required
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                            This tab contains sensitive information or actions. Please log in to
                            access it.
                        </p>
                        <a
                            href="/api/auth/login"
                            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-colors"
                        >
                            Log In with Discord
                        </a>
                    </div>
                ) : (
                    <>
                        {message && (
                            <div
                                className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}
                            >
                                {message}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'overview' && isOverviewData(data) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                Total Plays
                                            </div>
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {data.totalPlays?.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                Total Duration
                                            </div>
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {Math.floor((data.totalDuration || 0) / 3600)}h{' '}
                                                {Math.floor(
                                                    ((data.totalDuration || 0) % 3600) / 60,
                                                )}
                                                m
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                Search Cache
                                            </div>
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {data.searchCacheSize}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                Audio Cache
                                            </div>
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {data.audioMetadataCount}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'users' && isUsersData(data) && (
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
                                                {data.users.map((user) => (
                                                    <tr
                                                        key={user.id}
                                                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                                    >
                                                        <td className="px-6 py-4 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                                                            {user.avatar ? (
                                                                <img
                                                                    src={user.avatar}
                                                                    className="w-8 h-8 rounded-full"
                                                                    alt=""
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                                                            )}
                                                            {user.username}
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-xs">
                                                            {user.id}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {new Date(
                                                                user.createdAt,
                                                            ).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <button
                                                                onClick={() =>
                                                                    deleteItem(
                                                                        `/api/devtools/users/${user.id}`,
                                                                    )
                                                                }
                                                                className="text-red-600 hover:underline"
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'sessions' && isSessionsData(data) && (
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
                                                {data.sessions.map((session) => (
                                                    <tr
                                                        key={session.id}
                                                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                                    >
                                                        <td className="px-6 py-4 font-mono text-xs">
                                                            {session.id}
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-xs">
                                                            {session.userId}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {new Date(
                                                                session.expiresAt,
                                                            ).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {new Date(
                                                                session.createdAt,
                                                            ).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <button
                                                                onClick={() =>
                                                                    deleteItem(
                                                                        `/api/devtools/sessions/${session.id}`,
                                                                    )
                                                                }
                                                                className="text-red-600 hover:underline"
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'cache' && isCacheData(data) && (
                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                                                Search Cache
                                            </h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                                        <tr>
                                                            <th className="px-6 py-3">Query</th>
                                                            <th className="px-6 py-3">
                                                                Song Title
                                                            </th>
                                                            <th className="px-6 py-3">Cached At</th>
                                                            <th className="px-6 py-3">Expires</th>
                                                            <th className="px-6 py-3">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {data.search?.map((entry) => (
                                                            <tr
                                                                key={entry.query}
                                                                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                                            >
                                                                <td className="px-6 py-4 truncate max-w-xs">
                                                                    {entry.query}
                                                                </td>
                                                                <td className="px-6 py-4 truncate max-w-xs">
                                                                    {entry.songTitle}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {new Date(
                                                                        entry.cachedAt,
                                                                    ).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {new Date(
                                                                        entry.expiresAt,
                                                                    ).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <button
                                                                        onClick={() =>
                                                                            deleteItem(
                                                                                `/api/devtools/cache/${encodeURIComponent(entry.query)}`,
                                                                            )
                                                                        }
                                                                        className="text-red-600 hover:underline"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                                                Audio Cache
                                            </h3>
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
                                                        {data.audio?.map((entry) => (
                                                            <tr
                                                                key={entry.videoId}
                                                                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                                            >
                                                                <td className="px-6 py-4 font-mono text-xs">
                                                                    {entry.videoId}
                                                                </td>
                                                                <td className="px-6 py-4 truncate max-w-xs">
                                                                    {entry.title}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {Math.floor(
                                                                        entry.duration / 60,
                                                                    )}
                                                                    :
                                                                    {(entry.duration % 60)
                                                                        .toString()
                                                                        .padStart(2, '0')}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {new Date(
                                                                        entry.cachedAt,
                                                                    ).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-6 py-4 flex gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            regenerateThumbnail(
                                                                                entry.videoId,
                                                                            )
                                                                        }
                                                                        className="text-blue-600 hover:underline"
                                                                    >
                                                                        Regen Thumb
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            deleteItem(
                                                                                `/api/devtools/cache/audio/${entry.videoId}`,
                                                                            )
                                                                        }
                                                                        className="text-red-600 hover:underline"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'stats' && isStatsData(data) && (
                                    <div className="space-y-8">
                                        {/* Songs */}
                                        <div>
                                            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                                                Top Songs
                                            </h3>
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
                                                        {data.songs?.map((song) => (
                                                            <tr
                                                                key={song.songUrl}
                                                                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                                            >
                                                                <td className="px-6 py-4 truncate max-w-xs">
                                                                    {song.songTitle}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {song.playCount}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <button
                                                                        onClick={() =>
                                                                            deleteItem(
                                                                                `/api/devtools/stats/songs?url=${encodeURIComponent(song.songUrl)}`,
                                                                            )
                                                                        }
                                                                        className="text-red-600 hover:underline"
                                                                    >
                                                                        Delete Plays
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        {/* Users */}
                                        <div>
                                            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                                                Top Users
                                            </h3>
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
                                                        {data.users?.map((user) => (
                                                            <tr
                                                                key={user.userId}
                                                                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                                            >
                                                                <td className="px-6 py-4">
                                                                    {user.userId}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {user.playCount}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <button
                                                                        onClick={() =>
                                                                            deleteItem(
                                                                                `/api/devtools/stats/users/${user.userId}`,
                                                                            )
                                                                        }
                                                                        className="text-red-600 hover:underline"
                                                                    >
                                                                        Delete Plays
                                                                    </button>
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
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                            Plugin Management
                                        </h2>
                                        <div className="mb-6">
                                            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                                                Install Plugin
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                Upload a plugin .zip file (exported via{' '}
                                                <code>pnpm run export-plugin</code>).
                                            </p>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="file"
                                                    accept=".zip"
                                                    onChange={handleFileSelect}
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
                                                <button
                                                    onClick={handleInstallClick}
                                                    disabled={!selectedFile || uploading}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                                                >
                                                    {uploading ? 'Installing...' : 'Install'}
                                                </button>
                                            </div>
                                            {message && message.startsWith('Success') && (
                                                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                                                    {message}
                                                </p>
                                            )}
                                            {message && message.startsWith('Error') && (
                                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                                    {message}
                                                </p>
                                            )}
                                        </div>

                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
                                                Installed Plugins
                                            </h3>
                                            {!isPluginsData(data) || data.plugins.length === 0 ? (
                                                <p className="text-gray-500 dark:text-gray-400">
                                                    No plugins installed.
                                                </p>
                                            ) : (
                                                <div className="grid gap-4">
                                                    {isPluginsData(data) &&
                                                        data.plugins.map((plugin) => (
                                                            <div
                                                                key={plugin.id}
                                                                className={`flex items-center justify-between p-4 rounded-lg border ${plugin.enabled ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-75'}`}
                                                            >
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                                            {plugin.name}
                                                                        </h4>
                                                                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                                                            v{plugin.version}
                                                                        </span>
                                                                        {plugin.isTestPlugin && (
                                                                            <span className="text-xs text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                                                                Test Plugin
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                                                                        ID: {plugin.id}
                                                                    </p>
                                                                    {plugin.description && (
                                                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                                                            {plugin.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    {plugin.web?.entry && (
                                                                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                                            Frontend
                                                                        </span>
                                                                    )}

                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                const res =
                                                                                    await fetch(
                                                                                        `/api/devtools/plugins/${plugin.id}/toggle`,
                                                                                        {
                                                                                            method: 'POST',
                                                                                            headers:
                                                                                                {
                                                                                                    'Content-Type':
                                                                                                        'application/json',
                                                                                                },
                                                                                            body: JSON.stringify(
                                                                                                {
                                                                                                    enabled:
                                                                                                        !plugin.enabled,
                                                                                                },
                                                                                            ),
                                                                                        },
                                                                                    );

                                                                                if (!res.ok) {
                                                                                    const err =
                                                                                        await res.json();
                                                                                    throw new Error(
                                                                                        err.error ||
                                                                                            'Failed to toggle',
                                                                                    );
                                                                                }

                                                                                // Reload list
                                                                                loadTab('plugins');
                                                                            } catch (e) {
                                                                                alert(
                                                                                    `Failed to toggle plugin: ${e instanceof Error ? e.message : String(e)}`,
                                                                                );
                                                                            }
                                                                        }}
                                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${plugin.enabled ? 'bg-brand-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                                    >
                                                                        <span
                                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${plugin.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                                                                        />
                                                                    </button>

                                                                    <button
                                                                        onClick={() =>
                                                                            deleteItem(
                                                                                `/api/devtools/plugins/${plugin.id}`,
                                                                            )
                                                                        }
                                                                        className="ml-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-2 py-1 border border-red-200 dark:border-red-900/50 rounded bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'cookies' && <CookieManager />}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
