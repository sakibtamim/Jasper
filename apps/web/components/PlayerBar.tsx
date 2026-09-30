import { React, useCallback, useEffect, useState } from '@jasper/elements';
import { Badge, SeekBar } from '@jasper/ui';
import { ChevronDown, Disc3, Music, Radio, Volume2 } from 'lucide-react';

import { fetchQueues, seekPlayback } from '../services/client';

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

export function PlayerBar() {
    const [queues, setQueues] = useState<Queue[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekError, setSeekError] = useState<string | null>(null);

    // Fetch active queues periodically
    const loadQueues = useCallback(async () => {
        try {
            const data = await fetchQueues(1, 50);
            const activeQueues: Queue[] = data.queues || [];
            setQueues(activeQueues);

            // Auto-select first queue if none selected or selected is gone
            setSelectedVoiceId((prev) => {
                if (prev && activeQueues.some((q) => q.voiceChannelId === prev)) {
                    return prev;
                }
                const firstPlaying = activeQueues.find((q) => q.nowPlaying);
                return firstPlaying
                    ? firstPlaying.voiceChannelId
                    : activeQueues[0]?.voiceChannelId || null;
            });
        } catch (err: unknown) {
            console.debug('Failed to poll queues for player bar:', err);
        }
    }, []);

    useEffect(() => {
        loadQueues();
        const pollInterval = setInterval(loadQueues, 3000);
        return () => clearInterval(pollInterval);
    }, [loadQueues]);

    const activeQueue = queues.find((q) => q.voiceChannelId === selectedVoiceId) || null;
    const nowPlaying = activeQueue?.nowPlaying || null;

    // Real-time second-by-second progress ticker
    useEffect(() => {
        if (!nowPlaying?.startTime) {
            setCurrentTime(0);
            return;
        }

        const updateElapsed = () => {
            if (nowPlaying.startTime && !isSeeking) {
                const elapsed = Math.max(0, Math.floor((Date.now() - nowPlaying.startTime) / 1000));
                setCurrentTime(elapsed);
            }
        };

        updateElapsed();
        const ticker = setInterval(updateElapsed, 1000);
        return () => clearInterval(ticker);
    }, [nowPlaying?.startTime, isSeeking]);

    const handleSeek = async (targetSeconds: number) => {
        if (!activeQueue || !nowPlaying) return;

        setIsSeeking(true);
        setSeekError(null);

        // Optimistically update current elapsed time and startTime
        setCurrentTime(targetSeconds);
        nowPlaying.startTime = Date.now() - targetSeconds * 1000;

        try {
            await seekPlayback(activeQueue.voiceChannelId, targetSeconds);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setSeekError(msg);
            // Refresh queues from server to restore real state
            await loadQueues();
        } finally {
            setIsSeeking(false);
        }
    };

    const isIdle = !nowPlaying;
    const isLive = Boolean(
        nowPlaying && (nowPlaying.duration <= 0 || nowPlaying.requestedBy === 'Radio'),
    );

    return (
        <aside
            aria-label="Playback Control Bar"
            className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-2xl px-4 py-2.5 sm:px-6 transition-all duration-300"
        >
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-3 max-w-7xl">
                {/* Left: Track Information */}
                <div className="flex items-center gap-3 w-full md:w-1/4 min-w-0">
                    <div className="relative w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                        {nowPlaying?.thumbnail ? (
                            <img
                                src={nowPlaying.thumbnail}
                                alt={nowPlaying.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Music className="w-6 h-6 text-brand-primary opacity-60" />
                        )}
                        {!isIdle && (
                            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-800" />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        {nowPlaying ? (
                            <>
                                <a
                                    href={nowPlaying.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-semibold text-gray-900 dark:text-white truncate block hover:text-brand-primary transition-colors"
                                    title={nowPlaying.title}
                                >
                                    {nowPlaying.title}
                                </a>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                                    <span>
                                        {nowPlaying.requestedBy === 'Radio'
                                            ? '📻 Jasper Radio'
                                            : `by ${nowPlaying.requestedBy}`}
                                    </span>
                                    {activeQueue && (
                                        <>
                                            <span>•</span>
                                            <span className="truncate">
                                                {activeQueue.guildName || activeQueue.guildId}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div>
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    No track playing
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                    Queue music in a Discord channel
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center: Interactive Scrubber / Seek Bar */}
                <div className="w-full md:w-2/4 flex flex-col items-center">
                    <SeekBar
                        currentTime={currentTime}
                        duration={nowPlaying?.duration ?? 0}
                        disabled={isIdle}
                        isLive={isLive}
                        onSeek={handleSeek}
                        onChange={(sec) => setCurrentTime(sec)}
                        showTime={true}
                        size="md"
                        ariaLabel="Player scrubber"
                        className="max-w-2xl"
                    />

                    {seekError && (
                        <span className="text-[11px] text-red-500 mt-0.5 truncate animate-fade-in">
                            {seekError}
                        </span>
                    )}
                </div>

                {/* Right: Worker & Channel Switcher */}
                <div className="hidden md:flex items-center justify-end gap-3 w-1/4">
                    {queues.length > 1 && (
                        <div className="relative">
                            <select
                                value={selectedVoiceId || ''}
                                onChange={(e) => setSelectedVoiceId(e.target.value)}
                                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-1.5 px-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-primary appearance-none cursor-pointer"
                                aria-label="Select active queue"
                            >
                                {queues.map((q) => (
                                    <option key={q.voiceChannelId} value={q.voiceChannelId}>
                                        {q.guildName || q.guildId} ({q.workerName})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-2.5 pointer-events-none text-gray-400" />
                        </div>
                    )}

                    {activeQueue && (
                        <Badge variant="default" className="text-xs font-mono">
                            {activeQueue.workerName}
                        </Badge>
                    )}
                </div>
            </div>
        </aside>
    );
}

export default PlayerBar;
