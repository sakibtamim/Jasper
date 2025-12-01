import { useEffect, useState } from '@jasper/elements';
import { fetchLogs } from '../services/client';

interface LogEntry {
    level: 'error' | 'warn' | 'info' | 'debug';
    timestamp: string;
    module?: string;
    message: string;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLogs = async () => {
            try {
                const data = await fetchLogs();
                setLogs(data.logs || []);
            } catch (error) {
                console.error('Failed to fetch logs:', error);
            } finally {
                setLoading(false);
            }
        };

        loadLogs();
        const interval = setInterval(loadLogs, 2000); // Refresh every 2 seconds for logs
        return () => clearInterval(interval);
    }, []);

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'text-red-600 dark:text-red-400';
            case 'warn': return 'text-yellow-600 dark:text-yellow-400';
            case 'debug': return 'text-gray-500 dark:text-gray-400';
            case 'info': return 'text-blue-600 dark:text-blue-400';
            default: return 'text-gray-500 dark:text-gray-400';
        }
    };

    if (loading) {
        return (
            <section id="logs" className="mb-16 scroll-mt-24">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                    <i data-lucide="terminal" className="w-8 h-8 text-gray-500"></i>
                    Activity Logs
                </h2>
                <div className="animate-pulse bg-gray-100 dark:bg-gray-900 rounded-2xl h-96"></div>
            </section>
        );
    }

    return (
        <section id="logs" className="mb-16 scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <i data-lucide="terminal" className="w-8 h-8 text-gray-500"></i>
                Activity Logs
            </h2>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 glow-secondary">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-200 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono opacity-70">
                        jasper-bot.log
                    </span>
                </div>
                <div className="logs-container p-4 h-96 overflow-y-auto font-mono text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    {logs.length > 0 ? (
                        logs.map((log, index) => {
                            const timeStr = formatTime(log.timestamp);
                            const fullDate = new Date(log.timestamp).toLocaleString();
                            const levelColor = getLevelColor(log.level);

                            return (
                                <div
                                    key={`${log.timestamp}-${index}`}
                                    className="log-entry flex items-start gap-3 hover:bg-gray-200 dark:hover:bg-white/5 p-1 rounded transition-colors"
                                >
                                    <span className={`log-level font-bold w-16 uppercase text-xs tracking-wider ${levelColor}`}>
                                        [{log.level}]
                                    </span>
                                    <span className="log-timestamp text-gray-500 text-xs" title={fullDate}>
                                        {timeStr}
                                    </span>
                                    {log.module && (
                                        <span className="log-module text-purple-600 dark:text-purple-400 font-medium">
                                            [{log.module}]
                                        </span>
                                    )}
                                    <span className="log-message text-gray-700 dark:text-gray-300 flex-1 break-all">
                                        {log.message}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-gray-500 italic text-sm">Waiting for logs...</div>
                    )}
                </div>
            </div>
        </section>
    );
}
