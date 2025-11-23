// Initialize Lucide icons
lucide.createIcons();

// Theme Toggle Logic
const themeToggleBtn = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;

// Check local storage or system preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    htmlElement.classList.add('dark');
} else {
    htmlElement.classList.remove('dark');
}

themeToggleBtn.addEventListener('click', () => {
    htmlElement.classList.toggle('dark');
    if (htmlElement.classList.contains('dark')) {
        localStorage.theme = 'dark';
    } else {
        localStorage.theme = 'light';
    }
});

// API Endpoints
const API_BASE = '/api';

// State
let workers = [];
let queues = [];
let queuesPagination = { currentPage: 1, totalPages: 1, totalQueues: 0, limit: 10 };
let cacheStats = {};
let logs = [];

// Get responsive limit: 10 for mobile (1 column), 20 for desktop (2 columns)
function getQueueLimit() {
    return window.matchMedia('(min-width: 1024px)').matches ? 20 : 10;
}

// Fetch Data
async function fetchData() {
    try {
        // Update limit based on viewport
        queuesPagination.limit = getQueueLimit();

        const [workersRes, queuesRes, cacheRes, logsRes] = await Promise.all([
            fetch(`${API_BASE}/status`),
            fetch(`${API_BASE}/queues?page=${queuesPagination.currentPage}&limit=${queuesPagination.limit}`),
            fetch(`${API_BASE}/cache`),
            fetch(`${API_BASE}/logs`)
        ]);

        if (workersRes.ok) {
            const data = await workersRes.json();
            workers = data.workers || [];
            renderWorkers();
        }

        if (queuesRes.ok) {
            const data = await queuesRes.json();
            queues = data.queues || [];
            queuesPagination = { ...data.pagination, limit: queuesPagination.limit };
            renderQueues();
            renderQueuesPagination();
        }

        if (cacheRes.ok) {
            const data = await cacheRes.json();
            cacheStats = data.stats || {};
            renderCacheStats();
        }

        if (logsRes.ok) {
            const data = await logsRes.json();
            logs = data.logs || [];
            renderLogs();
        }
    } catch (error) {
        console.error('Failed to fetch data:', error);
    }
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Render Workers
function renderWorkers() {
    const container = document.getElementById('workers-grid');
    if (!container) return;

    container.innerHTML = workers.map(worker => {
        const isOnline = worker.status !== 'offline';
        const isBusy = worker.busy;

        // Status Colors
        let statusColor = 'text-gray-400';
        let statusDot = 'bg-gray-400';
        let borderColor = 'border-gray-200 dark:border-gray-700';
        let statusText = 'Offline';

        if (isOnline) {
            if (isBusy) {
                statusColor = 'text-brand-secondary'; // Cyan for busy
                statusDot = 'bg-brand-secondary';
                borderColor = 'border-brand-secondary';
                statusText = 'Busy';
            } else {
                statusColor = 'text-brand-primary'; // Pink for idle/ready
                statusDot = 'bg-brand-primary';
                borderColor = 'border-brand-primary';
                statusText = 'Idle';
            }
        }

        return `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 ${borderColor} transition-all hover-card relative overflow-hidden group">
                <!-- Background Decoration -->
                <div class="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                    <i data-lucide="music" class="w-24 h-24"></i>
                </div>

                <div class="flex items-start gap-4 mb-4 relative z-10">
                    <!-- Avatar -->
                    <div class="relative">
                        <img src="${escapeHtml(worker.avatarUrl || 'assets/images/jasper-logo.png')}" alt="${escapeHtml(worker.name)}" 
                             class="w-16 h-16 rounded-full border-2 ${borderColor} shadow-md object-cover bg-gray-100 dark:bg-gray-700">
                        <div class="absolute bottom-0 right-0 w-4 h-4 rounded-full ${statusDot} border-2 border-white dark:border-gray-800"></div>
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-xl font-bold text-gray-900 dark:text-white truncate">${escapeHtml(worker.name)}</h3>
                                <p class="text-sm text-gray-500 dark:text-gray-400 capitalize">${escapeHtml(worker.role)}</p>
                            </div>
                            <span class="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 ${statusColor}">
                                ${statusText}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-3 relative z-10">
                    <!-- Activity -->
                    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                        <i data-lucide="activity" class="w-4 h-4 text-brand-primary shrink-0"></i>
                        <span class="truncate">${escapeHtml(worker.activity || 'None')}</span>
                    </div>

                    ${worker.guildId ? `
                    <!-- Guild Info -->
                    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        ${worker.guildIconUrl ?
                    `<img src="${escapeHtml(worker.guildIconUrl)}" class="w-4 h-4 rounded-full object-cover">` :
                    `<i data-lucide="server" class="w-4 h-4 text-gray-400 shrink-0"></i>`
                }
                        <span class="truncate font-medium">${escapeHtml(worker.guildName || worker.guildId)}</span>
                    </div>
                    ` : ''}

                    ${worker.voiceChannelId ? `
                    <!-- Channel Info -->
                    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <i data-lucide="mic" class="w-4 h-4 text-gray-400 shrink-0"></i>
                        <span class="truncate">${escapeHtml(worker.channelName || worker.voiceChannelId)}</span>
                    </div>
                    ` : ''}

                    ${worker.nowPlaying ? `
                    <!-- Now Playing -->
                    <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div class="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span class="text-brand-secondary font-bold uppercase tracking-wider">Now Playing</span>
                            ${worker.nowPlaying.requester ? `
                                <div class="flex items-center gap-1.5" title="Requested by ${escapeHtml(worker.nowPlaying.requester.username)}">
                                    <span class="text-[10px] uppercase tracking-wider opacity-70">Req by</span>
                                    <img src="${escapeHtml(worker.nowPlaying.requester.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png')}" 
                                         class="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                                         alt="${escapeHtml(worker.nowPlaying.requester.username)}">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">${escapeHtml(worker.nowPlaying.requester.displayName)}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                ${worker.nowPlaying.thumbnail ?
                    `<img src="${escapeHtml(worker.nowPlaying.thumbnail)}" class="w-full h-full object-cover">` :
                    `<div class="flex items-center justify-center w-full h-full"><i data-lucide="music" class="w-6 h-6 text-gray-400"></i></div>`
                }
                                <div class="absolute inset-0 bg-black/10"></div>
                            </div>
                            <div class="min-w-0">
                                <p class="text-sm font-medium text-gray-900 dark:text-white truncate" title="${escapeHtml(worker.nowPlaying.title)}">
                                    ${escapeHtml(worker.nowPlaying.title)}
                                </p>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// Render Queues
function renderQueues() {
    const container = document.getElementById('queues-container');
    if (!container) return;

    if (!queues.length) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <i data-lucide="music-2" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                <p>No active queues found</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    container.innerHTML = queues.map(queue => `
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:border-brand-primary/30 transition-colors shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                        <i data-lucide="list-music" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-900 dark:text-white">${escapeHtml(queue.guildName || queue.guildId)}</h3>
                        <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>${escapeHtml(queue.voiceChannelId)}</span>
                            <span>•</span>
                            <span>${queue.queueLength} songs</span>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Worker</div>
                    <div class="text-sm text-brand-primary font-medium">${escapeHtml(queue.workerName)}</div>
                </div>
            </div>

            ${queue.nowPlaying ? `
            <div class="bg-brand-primary/10 rounded-lg p-3 border-l-4 border-brand-primary mb-3">
                <div class="text-xs text-brand-primary uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                    <i data-lucide="play-circle" class="w-4 h-4"></i>
                    Now Playing
                </div>
                <div class="flex items-start gap-3">
                    <div class="flex-1 min-w-0">
                        <a href="${escapeHtml(queue.nowPlaying.url)}" target="_blank" class="text-sm font-medium text-gray-900 dark:text-white hover:text-brand-primary transition-colors truncate block">
                            ${escapeHtml(queue.nowPlaying.title)}
                        </a>
                        <div class="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>${formatDuration(queue.nowPlaying.duration)}</span>
                            <span>•</span>
                            <span>Requested by ${escapeHtml(queue.nowPlaying.requestedBy)}</span>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}


            ${queue.songs && queue.songs.length > 0 ? `
            <div class="space-y-2">
                <div class="text-xs text-gray-500 uppercase tracking-wider font-bold">Up Next (${queue.songs.length} songs)</div>
                ${(() => {
                // Show only first 10 songs initially, max 20 with "Show More"
                const maxInitialSongs = 10;
                const maxExpandedSongs = 20;
                const songsToShow = queue.songs.slice(0, maxInitialSongs);
                const hasMore = queue.songs.length > maxInitialSongs;
                const queueId = queue.guildId + queue.voiceChannelId; // Unique ID for this queue

                // Use cumulative ETA calculation for O(n) performance
                let cumulativeEta = queue.nowPlaying ? queue.nowPlaying.duration : 0;
                const songsHtml = songsToShow.map((song, index) => {
                    const songEta = cumulativeEta;
                    cumulativeEta += song.duration || 0;

                    return `
                    <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-700/50 hover:border-brand-secondary/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                ${song.thumbnail ?
                            `<img src="${escapeHtml(song.thumbnail)}" class="w-full h-full object-cover">` :
                            `<div class="flex items-center justify-center w-full h-full"><i data-lucide="music" class="w-6 h-6 text-gray-400"></i></div>`
                        }
                            </div>
                            <div class="flex-1 min-w-0">
                                <a href="${escapeHtml(song.url)}" target="_blank" class="text-xs font-medium text-gray-900 dark:text-white hover:text-brand-secondary transition-colors truncate block">
                                    ${index + 1}. ${escapeHtml(song.title)}
                                </a>
                                <div class="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                                    <span>${formatDuration(song.duration)}</span>
                                    <span>•</span>
                                    <span>Requested by ${escapeHtml(song.requestedBy)}</span>
                                </div>
                            </div>
                            <div class="text-[10px] text-gray-400 dark:text-gray-500 font-medium shrink-0">
                                ETA ${formatDuration(songEta)}
                            </div>
                        </div>
                    </div>
                    `;
                }).join('');

                const showMoreBtn = hasMore ? `
                    <button 
                        onclick="alert('Show More functionality - TODO: Implement client-side expansion')"
                        class="w-full mt-2 px-3 py-2 text-xs font-medium text-brand-secondary hover:text-brand-primary border border-brand-secondary/30 hover:border-brand-primary rounded-lg transition-colors"
                    >
                        Show ${Math.min(maxExpandedSongs - maxInitialSongs, queue.songs.length - maxInitialSongs)} More Songs
                    </button>` : '';

                return songsHtml + showMoreBtn;
            })()}
            </div>
            ` : ''}
        </div>
    `).join('');

    lucide.createIcons();
}

// Render Cache Stats
function renderCacheStats() {
    document.getElementById('stats-search').textContent = `${cacheStats.searchCacheSize || 0} entries`;
    document.getElementById('stats-files').textContent = `${cacheStats.audioCacheFiles || 0} files`;
    document.getElementById('stats-size').textContent = `${cacheStats.audioCacheSizeMB || 0} MB`;
}

// Render Logs
function renderLogs() {
    const container = document.getElementById('logs-container');
    if (!container) return;

    if (!logs.length) {
        container.innerHTML = '<div class="text-gray-500 italic text-sm">No logs available</div>';
        return;
    }

    container.innerHTML = logs.map(log => {
        // Determine color based on level
        let levelColor = 'text-gray-400';
        if (log.level === 'error') levelColor = 'text-red-400';
        else if (log.level === 'warn') levelColor = 'text-yellow-400';
        else if (log.level === 'debug') levelColor = 'text-blue-400';
        else if (log.level === 'info') levelColor = 'text-green-400';

        // Format Timestamp
        const date = new Date(log.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const fullDate = date.toLocaleString();

        return `
            <div class="log-entry flex items-start gap-3 hover:bg-white/5 p-1 rounded transition-colors">
                <span class="log-level font-bold w-16 uppercase text-xs tracking-wider ${levelColor}">[${escapeHtml(log.level)}]</span>
                <span class="log-timestamp text-gray-500 text-xs" title="${fullDate}">${timeStr}</span>
                ${log.module ? `<span class="log-module text-purple-400 font-medium">[${escapeHtml(log.module)}]</span>` : ''}
                <span class="log-message text-gray-300 flex-1 break-all">${escapeHtml(log.message)}</span>
            </div>
        `;
    }).join('');
}

// Helper: Format Duration
function formatDuration(seconds) {
    if (!seconds) return '00:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Render Queues Pagination Controls
function renderQueuesPagination() {
    const container = document.getElementById('queues-pagination');
    if (!container) return;

    if (queuesPagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const { currentPage, totalPages, totalQueues, hasPreviousPage, hasNextPage } = queuesPagination;

    container.innerHTML = `
        <button 
            id="queues-prev-btn"
            ${!hasPreviousPage ? 'disabled' : ''}
            class="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            <i data-lucide="chevron-left" class="w-4 h-4"></i>
        </button>
        
        <div class="text-sm text-gray-600 dark:text-gray-400">
            Page <span class="font-bold text-gray-900 dark:text-white">${currentPage}</span> of <span class="font-bold">${totalPages}</span>
            <span class="text-xs ml-2">(${totalQueues} total queues)</span>
        </div>
        
        <button 
            id="queues-next-btn"
            ${!hasNextPage ? 'disabled' : ''}
            class="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
        </button>
    `;

    lucide.createIcons();

    // Add event listeners
    const prevBtn = document.getElementById('queues-prev-btn');
    const nextBtn = document.getElementById('queues-next-btn');

    if (prevBtn && hasPreviousPage) {
        prevBtn.addEventListener('click', () => {
            queuesPagination.currentPage--;
            fetchData();
        });
    }

    if (nextBtn && hasNextPage) {
        nextBtn.addEventListener('click', () => {
            queuesPagination.currentPage++;
            fetchData();
        });
    }
}

// Handle viewport changes for responsive pagination
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const newLimit = getQueueLimit();
        if (newLimit !== queuesPagination.limit) {
            queuesPagination.currentPage = 1; // Reset to page 1 when limit changes
            fetchData();
        }
    }, 250); // Debounce resize events
});

// Initial Fetch and Polling
fetchData();
setInterval(fetchData, 3000);
