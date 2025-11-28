import { useEffect, useState } from 'react';
import { fetchQueues } from '../api/client';

interface Song {
    title: string;
    url: string;
    duration: number;
    requestedBy: string;
    thumbnail?: string;
    startTime?: number;
}

interface Queue {
    guildId: string;
    voiceChannelId: string;
    guildName: string;
    workerName: string;
    queueLength: number;
    nowPlaying: Song | null;
    songs: Song[];
    autoplay?: boolean;
}

interface Pagination {
    currentPage: number;
    totalPages: number;
    totalQueues: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export default function QueuesPage() {
    const [queues, setQueues] = useState<Queue[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        currentPage: 1,
        totalPages: 1,
        totalQueues: 0,
        limit: 10,
        hasNextPage: false,
        hasPreviousPage: false
    });
    const [loading, setLoading] = useState(true);
    const [expandedSongs, setExpandedSongs] = useState<Set<string>>(new Set());

    const loadQueues = async (page = pagination.currentPage) => {
        try {
            setLoading(true);
            const limit = window.matchMedia('(min-width: 1024px)').matches ? 20 : 10;
            const data = await fetchQueues(page, limit);
            setQueues(data.queues || []);
            setPagination(data.pagination || { currentPage: page, totalPages: 1, totalQueues: 0, limit });
        } catch (error) {
            console.error('Failed to fetch queues:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQueues(pagination.currentPage);
        const interval = setInterval(() => loadQueues(pagination.currentPage), 3000);
        return () => clearInterval(interval);
    }, [pagination.currentPage]);

    // Initialize Lucide icons
    useEffect(() => {
        if (typeof (window as any).lucide !== 'undefined') {
            (window as any).lucide.createIcons();
        }
    }, [queues]);

    const formatDuration = (seconds: number) => {
        if (!seconds) return '00:00';
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const formatEta = (seconds: number) => {
        if (!seconds || seconds < 60) return 'in <1m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.round((seconds % 3600) / 60);
        if (hours > 0) return `in ${hours}h${minutes}m`;
        return `in ${minutes}m`;
    };

    const toggleSongExpansion = (queueId: string) => {
        setExpandedSongs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(queueId)) {
                newSet.delete(queueId);
            } else {
                newSet.add(queueId);
            }
            return newSet;
        });
    };

    const goToPage = (page: number) => {
        loadQueues(page);
    };

    if (loading && queues.length === 0) {
        return (
            <section id="queues" className="mb-16 scroll-mt-24">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                    <i data-lucide="list-music" className="w-8 h-8 text-brand-secondary"></i>
                    Active Queues
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2].map(i => (
                        <div
                            key={i}
                            className="animate-pulse bg-white dark:bg-gray-800 p-6 rounded-xl h-64"
                        />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section id="queues" className="mb-16 scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <i data-lucide="list-music" className="w-8 h-8 text-brand-secondary"></i>
                Active Queues
            </h2>

            {queues.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <i data-lucide="music-2" className="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p className="text-gray-500">No active queues found</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {queues.map(queue => (
                            <QueueCard
                                key={`${queue.guildId}-${queue.voiceChannelId}`}
                                queue={queue}
                                isExpanded={expandedSongs.has(`${queue.guildId}-${queue.voiceChannelId}`)}
                                onToggle={() => toggleSongExpansion(`${queue.guildId}-${queue.voiceChannelId}`)}
                                formatDuration={formatDuration}
                                formatEta={formatEta}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => goToPage(pagination.currentPage - 1)}
                                disabled={!pagination.hasPreviousPage}
                                className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <i data-lucide="chevron-left" className="w-4 h-4"></i>
                            </button>

                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Page <span className="font-bold text-gray-900 dark:text-white">{pagination.currentPage}</span> of <span className="font-bold">{pagination.totalPages}</span>
                                <span className="text-xs ml-2">({pagination.totalQueues} total queues)</span>
                            </div>

                            <button
                                onClick={() => goToPage(pagination.currentPage + 1)}
                                disabled={!pagination.hasNextPage}
                                className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <i data-lucide="chevron-right" className="w-4 h-4"></i>
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

interface QueueCardProps {
    queue: Queue;
    isExpanded: boolean;
    onToggle: () => void;
    formatDuration: (seconds: number) => string;
    formatEta: (seconds: number) => string;
}

function QueueCard({ queue, isExpanded, onToggle, formatDuration, formatEta }: QueueCardProps) {
    const maxInitialSongs = 10;
    const maxExpandedSongs = 20;

    // Filter out currently playing song if it's at the top of the queue
    let filteredSongs = queue.songs || [];
    if (queue.nowPlaying && filteredSongs.length > 0 && filteredSongs[0].title === queue.nowPlaying.title) {
        filteredSongs = filteredSongs.slice(1);
    }

    const songsToShow = isExpanded ? filteredSongs.slice(0, maxExpandedSongs) : filteredSongs.slice(0, maxInitialSongs);
    const hasMore = filteredSongs.length > maxInitialSongs;
    const canExpand = filteredSongs.length > maxExpandedSongs;

    // Calculate ETA
    let cumulativeEta = 0;
    if (queue.nowPlaying?.duration) {
        const elapsed = queue.nowPlaying.startTime ? (Date.now() - queue.nowPlaying.startTime) / 1000 : 0;
        const remaining = Math.max(0, queue.nowPlaying.duration - elapsed);
        cumulativeEta = remaining;
    }

    return (
        <div id={`queue-${queue.guildId}-${queue.voiceChannelId}`} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:border-brand-primary/30 transition-colors shadow-sm scroll-mt-24">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                        <i data-lucide="list-music" className="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{queue.guildName || queue.guildId}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{queue.voiceChannelId}</span>
                            <span>•</span>
                            <span>{queue.queueLength} songs</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Worker</div>
                    <div className="text-sm text-brand-primary font-medium">{queue.workerName}</div>
                </div>
            </div>

            {/* Now Playing */}
            {queue.nowPlaying && (
                <div className="bg-brand-primary/10 rounded-lg p-3 border-l-4 border-brand-primary mb-3">
                    <div className="text-xs text-brand-primary uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                        <i data-lucide="play-circle" className="w-4 h-4"></i>
                        Now Playing
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                            <a
                                href={queue.nowPlaying.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-900 dark:text-white hover:text-brand-primary transition-colors truncate block"
                            >
                                {queue.nowPlaying.title}
                            </a>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2 mb-1 overflow-hidden">
                                {queue.nowPlaying.startTime && queue.nowPlaying.duration && (
                                    <div
                                        className="bg-brand-primary h-1.5 rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${Math.min(100, Math.max(0, ((Date.now() - queue.nowPlaying.startTime) / 1000 / queue.nowPlaying.duration) * 100))}%`
                                        }}
                                    ></div>
                                )}
                            </div>

                            <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <span>{formatDuration(queue.nowPlaying.duration)}</span>
                                    <span>•</span>
                                    <span>
                                        {queue.nowPlaying.requestedBy === 'Radio'
                                            ? `Enqueued by Radio ${queue.workerName} 📻 🐱`
                                            : `Requested by ${queue.nowPlaying.requestedBy}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Up Next */}
            {filteredSongs.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                        Up Next ({filteredSongs.length} songs)
                    </div>
                    {songsToShow.map((song, index) => {
                        const waitTime = cumulativeEta;
                        cumulativeEta += song.duration || 0;

                        return (
                            <div
                                key={index}
                                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-600 hover:border-brand-secondary/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                        {song.thumbnail ? (
                                            <img src={song.thumbnail} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full">
                                                <i data-lucide="music" className="w-6 h-6 text-gray-400"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <a
                                            href={song.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-medium text-gray-900 dark:text-white hover:text-brand-secondary transition-colors truncate block"
                                        >
                                            {index + 1}. {song.title}
                                        </a>
                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                                            <span>{formatDuration(song.duration)}</span>
                                            <span>•</span>
                                            <span>
                                                {song.requestedBy === 'Radio'
                                                    ? `Radio ${queue.workerName} 📻 🐱`
                                                    : song.requestedBy}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium shrink-0">
                                        ETA {formatEta(waitTime)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Expand/Collapse Button */}
                    {hasMore && (
                        <button
                            onClick={onToggle}
                            className="w-full mt-2 px-3 py-2 text-xs font-medium text-brand-secondary hover:text-brand-primary border border-brand-secondary/30 hover:border-brand-primary rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isExpanded ? (
                                <>
                                    <i data-lucide="chevron-up" className="w-4 h-4"></i>
                                    Show Less
                                </>
                            ) : (
                                <>
                                    <i data-lucide="chevron-down" className="w-4 h-4"></i>
                                    Show {Math.min(maxExpandedSongs - maxInitialSongs, filteredSongs.length - maxInitialSongs)} More Songs
                                    {canExpand && ` (${filteredSongs.length - maxExpandedSongs} more not shown)`}
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
