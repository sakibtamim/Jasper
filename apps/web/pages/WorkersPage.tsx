import { useEffect, useState } from '@jasper/elements';

import ExtensionSlot from '../components/ExtensionSlot';
import { fetchWorkers } from '../services/client';

interface Requester {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
}

interface NowPlaying {
    title: string;
    thumbnail: string;
    requester?: Requester;
}

interface Worker {
    name: string;
    role: 'controller' | 'worker';
    busy: boolean;
    guildId: string | null;
    voiceChannelId: string | null;
    status: string;
    activity: string;
    avatarUrl: string | null;
    guildName: string | null;
    guildIconUrl: string | null;
    channelName: string | null;
    nowPlaying: NowPlaying | null;
}

export default function WorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadWorkers = async () => {
            try {
                const data = await fetchWorkers();
                setWorkers(data.workers || []);
            } catch (error) {
                console.error('Failed to fetch workers:', error);
            } finally {
                setLoading(false);
            }
        };

        loadWorkers();
        const interval = setInterval(loadWorkers, 3000);
        return () => clearInterval(interval);
    }, []);

    // Initialize Lucide icons after workers update
    useEffect(() => {
        if (typeof window.lucide !== 'undefined') {
            window.lucide.createIcons();
        }
    }, [workers]);

    if (loading) {
        return (
            <section>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                    <i data-lucide="users" className="w-8 h-8 text-brand-primary"></i>
                    Heavenly Council
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="animate-pulse bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 h-48"
                        />
                    ))}
                </div>
            </section>
        );
    }
    return (
        <section id="workers" className="mb-16 scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <i data-lucide="users" className="w-8 h-8 text-brand-primary"></i>
                Heavenly Council
            </h2>

            <div className="mb-8">
                <ExtensionSlot slot="dashboard:main" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workers.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No workers available
                    </div>
                ) : (
                    workers.map((worker) => <WorkerCard key={worker.name} worker={worker} />)
                )}
            </div>
        </section>
    );
}

function WorkerCard({ worker }: { worker: Worker }) {
    const isOnline = worker.status !== 'offline';
    const isBusy = worker.busy;

    let statusColor = 'text-gray-400';
    let statusDot = 'bg-gray-400';
    let borderColor = 'border-gray-200 dark:border-gray-700';
    let statusText = 'Offline';

    if (isOnline) {
        if (isBusy) {
            statusColor = 'text-brand-secondary';
            statusDot = 'bg-brand-secondary';
            borderColor = 'border-brand-secondary';
            statusText = 'Busy';
        } else {
            statusColor = 'text-brand-primary';
            statusDot = 'bg-brand-primary';
            borderColor = 'border-brand-primary';
            statusText = 'Idle';
        }
    }

    return (
        <div
            className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 ${borderColor} transition-all hover:scale-[1.02] relative overflow-hidden group dark:border-t-0 dark:border-r-0 dark:border-b-0`}
        >
            {/* Music Note BG */}
            <div className="absolute top-2 right-2 text-6xl opacity-5 pointer-events-none select-none transform rotate-12">
                🎵
            </div>

            <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="relative">
                    {worker.avatarUrl ? (
                        <img
                            src={worker.avatarUrl}
                            alt={worker.name}
                            className={`w-16 h-16 rounded-full border-2 ${borderColor} shadow-md object-cover bg-gray-100 dark:bg-gray-700`}
                        />
                    ) : (
                        <div
                            className={`w-16 h-16 rounded-full border-2 ${borderColor} shadow-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center`}
                        >
                            <i data-lucide="bot" className="w-8 h-8 text-gray-400"></i>
                        </div>
                    )}
                    <div
                        className={`absolute bottom-0 right-0 w-4 h-4 rounded-full ${statusDot} border-2 border-white dark:border-gray-800`}
                    ></div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                                {worker.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                {worker.role}
                            </p>
                        </div>
                        <span
                            className={`text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 ${statusColor}`}
                        >
                            {statusText}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <i data-lucide="activity" className="w-4 h-4 text-brand-primary shrink-0"></i>
                    <span className="truncate">
                        {(worker.activity === 'Custom Status'
                            ? 'Playing Music'
                            : worker.activity) || 'None'}
                    </span>
                </div>

                {worker.guildId && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        {worker.guildIconUrl ? (
                            <img
                                src={worker.guildIconUrl}
                                className="w-4 h-4 rounded-full object-cover"
                                alt=""
                            />
                        ) : (
                            <i data-lucide="server" className="w-4 h-4 text-gray-400 shrink-0"></i>
                        )}
                        <span className="truncate font-medium">
                            {worker.guildName || worker.guildId}
                            {worker.voiceChannelId && (
                                <>
                                    <span className="text-gray-400 mx-1">•</span>
                                    {worker.channelName || worker.voiceChannelId}
                                </>
                            )}
                        </span>
                    </div>
                )}

                {worker.nowPlaying && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span className="text-brand-secondary font-bold uppercase tracking-wider">
                                Now Playing
                            </span>
                            {worker.nowPlaying.requester && (
                                <div
                                    className="flex items-center gap-1.5"
                                    title={`Requested by ${worker.nowPlaying.requester.username}`}
                                >
                                    <span className="text-[10px] uppercase tracking-wider opacity-70">
                                        Req by
                                    </span>
                                    <span className="text-[10px] font-medium truncate max-w-[80px]">
                                        {worker.nowPlaying.requester.displayName ||
                                            worker.nowPlaying.requester.username}
                                    </span>
                                    <img
                                        src={
                                            worker.nowPlaying.requester.avatarUrl ||
                                            'https://cdn.discordapp.com/embed/avatars/0.png'
                                        }
                                        className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                                        alt={worker.nowPlaying.requester.username}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                {worker.nowPlaying.thumbnail ? (
                                    <img
                                        src={worker.nowPlaying.thumbnail}
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full">
                                        <i
                                            data-lucide="music"
                                            className="w-6 h-6 text-gray-400"
                                        ></i>
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p
                                    className="text-sm font-medium text-gray-900 dark:text-white truncate"
                                    title={worker.nowPlaying.title}
                                >
                                    {worker.nowPlaying.title}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {isBusy && worker.guildId && (
                    <button
                        onClick={() => {
                            const queueElement = document.getElementById(
                                `queue-${worker.guildId}-${worker.voiceChannelId}`,
                            );
                            if (queueElement) {
                                queueElement.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                });
                            }
                        }}
                        className="w-full mt-2 px-3 py-2 text-xs font-medium text-brand-primary hover:text-white border border-brand-primary hover:bg-brand-primary rounded-lg transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                        <i data-lucide="list-music" className="w-3 h-3"></i>
                        Jump to Queue
                    </button>
                )}
            </div>
        </div>
    );
}
