import { useEffect, useState } from 'react';
import { fetchStats } from '../api/client';

export default function StatsPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fetchStats(10);
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
        const interval = setInterval(loadStats, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, []);

    // Initialize Lucide icons
    useEffect(() => {
        if (typeof (window as any).lucide !== 'undefined') {
            (window as any).lucide.createIcons();
        }
    }, [stats]);

    const formatDuration = (seconds: number) => {
        if (!seconds) return '00:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <section id="stats" className="mb-16 scroll-mt-24">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                    <i data-lucide="bar-chart-2" className="w-8 h-8 text-brand-secondary"></i>
                    Statistics
                </h2>
                <div className="animate-pulse space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2].map(i => (
                            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl h-24"></div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    const { globalStats, topSongs, topUsers, topChannels, topBots } = stats || {};

    return (
        <section id="stats" className="mb-16 scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <i data-lucide="bar-chart-2" className="w-8 h-8 text-brand-secondary"></i>
                Statistics
            </h2>

            {/* Global Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-brand-primary dark:border-t-0 dark:border-r-0 dark:border-b-0">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                        Total Plays
                    </h3>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
                        {globalStats?.totalPlays?.toLocaleString() || 0}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-brand-secondary dark:border-t-0 dark:border-r-0 dark:border-b-0">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                        Total Playtime
                    </h3>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
                        {formatDuration(globalStats?.totalDuration || 0)}
                    </p>
                </div>
            </div>

            {/* Top Stats - 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Top Songs */}
                <StatsCard title="Top Songs" icon="music" color="brand-primary">
                    {topSongs?.length > 0 ? (
                        topSongs.map((song: any, index: number) => (
                            <div key={song.songUrl} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <a
                                        href={song.songUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-gray-900 dark:text-white hover:text-brand-primary truncate block"
                                    >
                                        {song.songTitle}
                                    </a>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {formatDuration(song.totalDuration)} total played
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-brand-secondary">{song.playCount}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">No data yet</div>
                    )}
                </StatsCard>

                {/* Top Users */}
                <StatsCard title="Top Listeners" icon="user" color="brand-secondary">
                    {topUsers?.length > 0 ? (
                        topUsers.map((user: any, index: number) => (
                            <div key={user.userId} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">
                                    {index + 1}
                                </div>
                                {user.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user.username}
                                        className="w-10 h-10 rounded-full border-2 border-brand-primary object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">
                                        {user.username}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {formatDuration(user.totalDuration)} total listening time
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-brand-primary">{user.playCount}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">No data yet</div>
                    )}
                </StatsCard>
            </div>

            {/* Second row: Top Channels and Top Bots */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Channels */}
                <StatsCard title="Top Channels" icon="hash" color="brand-primary">
                    {topChannels?.length > 0 ? (
                        topChannels.map((channel: any, index: number) => (
                            <div
                                key={channel.channelId}
                                className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                title={channel.guildName}
                            >
                                <div className="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">
                                    {index + 1}
                                </div>
                                {channel.guildIconUrl ? (
                                    <img
                                        src={channel.guildIconUrl}
                                        alt={channel.guildName}
                                        className="w-10 h-10 rounded-full border-2 border-brand-primary object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                        <i data-lucide="hash" className="w-5 h-5 text-gray-500"></i>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-1">
                                        <i data-lucide="hash" className="w-3 h-3 text-gray-400"></i>
                                        {channel.channelName}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                        {channel.guildName}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-brand-primary">{channel.playCount}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">No data yet</div>
                    )}
                </StatsCard>

                {/* Top Bots */}
                <StatsCard title="Top Bots" icon="bot" color="brand-secondary">
                    {topBots?.length > 0 ? (
                        topBots.map((bot: any, index: number) => (
                            <div key={bot.botName} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">
                                    {index + 1}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-brand-secondary/10 flex items-center justify-center">
                                    <i data-lucide="bot" className="w-5 h-5 text-brand-secondary"></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">
                                        {bot.botName}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Heavenly Council Member
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-brand-secondary">{bot.playCount}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">No data yet</div>
                    )}
                </StatsCard>
            </div>
        </section>
    );
}

const colorClasses: Record<string, string> = {
    'brand-primary': 'text-brand-primary',
    'brand-secondary': 'text-brand-secondary',
};

function StatsCard({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <i data-lucide={icon} className={`w-4 h-4 ${colorClasses[color] || 'text-gray-500'}`}></i>
                    {title}
                </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                {children}
            </div>
        </div>
    );
}
