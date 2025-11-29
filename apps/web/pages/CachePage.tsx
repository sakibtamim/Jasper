import { useEffect, useState } from '@jasper/elements';
import { fetchCacheStats, fetchStats } from '../services/client';

interface CacheStats {
    searchCacheSize: number;
    audioCacheFiles: number;
    audioCacheSizeMB: number;
}

interface TopCacheHit {
    entityId: string;
    avatarUrl?: string;
    displayName: string;
    entityType: 'bot' | 'user';
    cacheHits: number;
}

export default function CachePage() {
    const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
    const [topCacheHits, setTopCacheHits] = useState<TopCacheHit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCacheData = async () => {
            try {
                const [cache, stats] = await Promise.all([
                    fetchCacheStats(),
                    fetchStats(10)
                ]);
                setCacheStats(cache.stats);
                setTopCacheHits(stats.topCacheHits || []);
            } catch (error) {
                console.error('Failed to fetch cache stats:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCacheData();
        const interval = setInterval(loadCacheData, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, []);

    // Initialize Lucide icons
    useEffect(() => {
        if (typeof (window as any).lucide !== 'undefined') {
            (window as any).lucide.createIcons();
        }
    }, [cacheStats, topCacheHits]);

    if (loading) {
        return (
            <section id="cache" className="mb-16 scroll-mt-24">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                    <i data-lucide="database" className="w-8 h-8 text-brand-primary"></i>
                    Cache Statistics
                </h2>
                <div className="animate-pulse space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl h-24"></div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="cache" className="mb-16 scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <i data-lucide="database" className="w-8 h-8 text-brand-primary"></i>
                Cache Statistics
            </h2>

            {/* Cache Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-brand-primary hover-card dark:border-t-0 dark:border-r-0 dark:border-b-0">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                        Search Cache
                    </h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                        {cacheStats?.searchCacheSize || 0} entries
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-brand-secondary hover-card dark:border-t-0 dark:border-r-0 dark:border-b-0">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                        Audio Files
                    </h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                        {cacheStats?.audioCacheFiles || 0} files
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-purple-500 hover-card dark:border-t-0 dark:border-r-0 dark:border-b-0">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                        Storage Used
                    </h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                        {cacheStats?.audioCacheSizeMB || 0} MB
                    </p>
                </div>
            </div>

            {/* Cache Analytics */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <i data-lucide="zap" className="w-4 h-4 text-yellow-500"></i>
                        Top Cache Recallers
                    </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                    {topCacheHits?.length > 0 ? (
                        topCacheHits.map((hit, index) => (
                            <div key={hit.entityId} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">
                                    {index + 1}
                                </div>
                                {hit.avatarUrl ? (
                                    <img
                                        src={hit.avatarUrl}
                                        alt={hit.displayName}
                                        className="w-10 h-10 rounded-full border-2 border-yellow-500 object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                        <i data-lucide={hit.entityType === 'bot' ? 'bot' : 'user'} className="w-5 h-5 text-yellow-500"></i>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">
                                        {hit.displayName}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {hit.entityType === 'bot' ? '🤖 Bot' : '👤 User'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-yellow-500 flex items-center gap-1">
                                        <i data-lucide="zap" className="w-4 h-4"></i>
                                        {hit.cacheHits}
                                    </div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Hits</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">No cache hits yet</div>
                    )}
                </div>
            </div>
        </section>
    );
}
