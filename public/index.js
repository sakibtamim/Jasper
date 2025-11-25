// Tailwind Configuration (FlexTime Style)
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#ff6ad5',
                    secondary: '#00e5ff',
                    dark: '#0f172a',
                    surface: '#1e293b',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        }
    }
};



// Theme Initialization (FlexTime Logic)
if (
    localStorage.getItem('theme') === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// Theme Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');

    const syncIcons = () => {
        if (document.documentElement.classList.contains('dark')) {
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
        } else {
            lightIcon.classList.remove('hidden');
            darkIcon.classList.add('hidden');
        }
    };

    // Initial sync
    syncIcons();

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            syncIcons();
        });
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
let stats = { topSongs: [], topUsers: [], globalStats: { totalPlays: 0, totalDuration: 0 } };
let expandedQueues = new Set();

// Get responsive limit
function getQueueLimit() {
    return window.matchMedia('(min-width: 1024px)').matches ? 20 : 10;
}

// Fetch Data
async function fetchData() {
    try {
        queuesPagination.limit = getQueueLimit();

        const [workersRes, queuesRes, cacheRes, logsRes, statsRes] = await Promise.all([
            fetch(`${API_BASE}/status`),
            fetch(`${API_BASE}/queues?page=${queuesPagination.currentPage}&limit=${queuesPagination.limit}`),
            fetch(`${API_BASE}/cache`),
            fetch(`${API_BASE}/logs`),
            fetch(`${API_BASE}/stats?limit=10`)
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

        if (statsRes.ok) {
            stats = await statsRes.json();
            renderStats();
        }
    } catch (error) {
        console.error('Failed to fetch data:', error);
    }
}

// Helper: Escape HTML
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

        return `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 ${borderColor} transition-all hover:scale-[1.02] relative overflow-hidden group dark:border-t-0 dark:border-r-0 dark:border-b-0">
                <!-- Music Note BG -->
                <div class="absolute top-2 right-2 text-6xl opacity-5 pointer-events-none select-none transform rotate-12">
                    🎵
                </div>

                <div class="flex items-start gap-4 mb-4 relative z-10">
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
                    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                        <i data-lucide="activity" class="w-4 h-4 text-brand-primary shrink-0"></i>
                        <span class="truncate">${escapeHtml((worker.activity === 'Custom Status' ? 'Playing Music' : worker.activity) || 'None')}</span>
                    </div>

                    ${worker.guildId ? `
                    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        ${worker.guildIconUrl ?
                    `<img src="${escapeHtml(worker.guildIconUrl)}" class="w-4 h-4 rounded-full object-cover">` :
                    `<i data-lucide="server" class="w-4 h-4 text-gray-400 shrink-0"></i>`
                }
                        <span class="truncate font-medium">
                            ${escapeHtml(worker.guildName || worker.guildId)}
                            ${worker.voiceChannelId ? ` 
                                <span class="text-gray-400 mx-1">•</span> 
                                ${escapeHtml(worker.channelName || worker.voiceChannelId)}
                            ` : ''}
                        </span>
                    </div>
                    ` : ''}

                    ${worker.nowPlaying ? `
                    <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div class="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span class="text-brand-secondary font-bold uppercase tracking-wider">Now Playing</span>
                            ${worker.nowPlaying.requester ? `
                                <div class="flex items-center gap-1.5" title="Requested by ${escapeHtml(worker.nowPlaying.requester.username)}">
                                    <span class="text-[10px] uppercase tracking-wider opacity-70">Req by</span>
                                    <span class="text-[10px] font-medium truncate max-w-[80px]">${escapeHtml(worker.nowPlaying.requester.displayName || worker.nowPlaying.requester.username)}</span>
                                    <img src="${escapeHtml(worker.nowPlaying.requester.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png')}" 
                                         class="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                                         alt="${escapeHtml(worker.nowPlaying.requester.username)}">
                                </div>
                            ` : ''}
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                ${worker.nowPlaying.thumbnail ?
                    `<img src="${escapeHtml(worker.nowPlaying.thumbnail)}" class="w-full h-full object-cover">` :
                    `<div class="flex items-center justify-center w-full h-full"><i data-lucide="music" class="w-6 h-6 text-gray-400"></i></div>`
                }
                            </div>
                            <div class="min-w-0">
                                <p class="text-sm font-medium text-gray-900 dark:text-white truncate" title="${escapeHtml(worker.nowPlaying.title)}">
                                    ${escapeHtml(worker.nowPlaying.title)}
                                </p>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    ${isBusy && worker.guildId ? `
                        <button onclick="document.getElementById('queue-${worker.guildId}-${worker.voiceChannelId}')?.scrollIntoView({behavior: 'smooth', block: 'center'})" 
                                class="w-full mt-2 px-3 py-2 text-xs font-medium text-brand-primary hover:text-white border border-brand-primary hover:bg-brand-primary rounded-lg transition-colors flex items-center justify-center gap-2 group-hover:opacity-100 opacity-0 transition-opacity duration-200">
                            <i data-lucide="list-music" class="w-3 h-3"></i>
                            Jump to Queue
                        </button>
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
        <div id="queue-${queue.guildId}-${queue.voiceChannelId}" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:border-brand-primary/30 transition-colors shadow-sm scroll-mt-24">
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
                        
                        <!-- Progress Bar -->
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2 mb-1 overflow-hidden">
                            <div class="bg-brand-primary h-1.5 rounded-full transition-all duration-1000" style="width: ${(() => {
                if (!queue.nowPlaying.startTime || !queue.nowPlaying.duration) return '0%';
                const elapsed = (Date.now() - queue.nowPlaying.startTime) / 1000;
                const percent = Math.min(100, Math.max(0, (elapsed / queue.nowPlaying.duration) * 100));
                return `${percent}%`;
            })()}"></div>
                        </div>

                        <div class="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <div class="flex items-center gap-2">
                                <span>${formatDuration(queue.nowPlaying.duration)}</span>
                                <span>•</span>
                                <span>${queue.nowPlaying.requestedBy === 'Radio' ? `Enqueued by Radio ${escapeHtml(queue.workerName)} 📻 🐱` : `Requested by ${escapeHtml(queue.nowPlaying.requestedBy)}`}</span>
                            </div>
                            <!-- Live Progress Timer (Optional, simpler to just show total for now or calculate if needed) -->
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            ${queue.songs && queue.songs.length > 0 ? `
            <div class="space-y-2">
                <div class="text-xs text-gray-500 uppercase tracking-wider font-bold">Up Next (${queue.songs.length - (queue.nowPlaying && queue.songs[0]?.title === queue.nowPlaying.title ? 1 : 0)} songs)</div>
                ${(() => {
                const maxInitialSongs = 10;
                const maxExpandedSongs = 20;
                const queueId = `${queue.guildId}-${queue.voiceChannelId}`;
                const isExpanded = expandedQueues.has(queueId);

                // Filter out currently playing song if it appears at the top of the queue
                let filteredSongs = queue.songs;
                if (queue.nowPlaying && filteredSongs.length > 0 && filteredSongs[0].title === queue.nowPlaying.title) {
                    filteredSongs = filteredSongs.slice(1);
                }

                const songsToShow = isExpanded ? filteredSongs.slice(0, maxExpandedSongs) : filteredSongs.slice(0, maxInitialSongs);
                const hasMore = filteredSongs.length > maxInitialSongs;
                const canExpand = filteredSongs.length > maxExpandedSongs;

                let cumulativeEta = 0; // Start from 0 for "Up Next"
                // If we want accurate ETA relative to *now*, we'd add remaining time of current song.
                // But "ETA in Xm" usually means "wait time from now".
                if (queue.nowPlaying && queue.nowPlaying.duration) {
                    const elapsed = queue.nowPlaying.startTime ? (Date.now() - queue.nowPlaying.startTime) / 1000 : 0;
                    const remaining = Math.max(0, queue.nowPlaying.duration - elapsed);
                    cumulativeEta = remaining;
                }

                const songsHtml = songsToShow.map((song, index) => {
                    const waitTime = cumulativeEta;
                    cumulativeEta += song.duration || 0;

                    return `
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-600 hover:border-brand-secondary/30 transition-colors">
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
                                    <span>${song.requestedBy === 'Radio' ? `Radio ${escapeHtml(queue.workerName)} 📻 🐱` : escapeHtml(song.requestedBy)}</span>
                                </div>
                            </div>
                            <div class="text-[10px] text-gray-400 dark:text-gray-500 font-medium shrink-0">
                                ETA ${formatEta(waitTime)}
                            </div>
                        </div>
                    </div>
                    `;
                }).join('');

                let button = '';
                if (hasMore) {
                    if (isExpanded) {
                        button = `
                            <button 
                                onclick="toggleQueueExpansion('${queueId}')"
                                class="w-full mt-2 px-3 py-2 text-xs font-medium text-brand-secondary hover:text-brand-primary border border-brand-secondary/30 hover:border-brand-primary rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <i data-lucide="chevron-up" class="w-4 h-4"></i>
                                Show Less
                            </button>`;
                    } else {
                        const remainingSongs = filteredSongs.length - maxInitialSongs;
                        const songsToAdd = Math.min(maxExpandedSongs - maxInitialSongs, remainingSongs);
                        button = `
                            <button 
                                onclick="toggleQueueExpansion('${queueId}')"
                                class="w-full mt-2 px-3 py-2 text-xs font-medium text-brand-secondary hover:text-brand-primary border border-brand-secondary/30 hover:border-brand-primary rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <i data-lucide="chevron-down" class="w-4 h-4"></i>
                                Show ${songsToAdd} More ${songsToAdd === 1 ? 'Song' : 'Songs'}${canExpand ? ` (${filteredSongs.length - maxExpandedSongs} more not shown)` : ''}
                            </button>`;
                    }
                }

                return songsHtml + button;
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

// Render Stats
function renderStats() {
    // Global Stats
    document.getElementById('stats-total-plays').textContent = stats.globalStats.totalPlays.toLocaleString();

    // Format total duration
    const totalSeconds = stats.globalStats.totalDuration;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    document.getElementById('stats-total-duration').textContent = `${hours}h ${minutes}m`;

    // Top Songs
    const songsContainer = document.getElementById('stats-top-songs');
    if (songsContainer) {
        if (!stats.topSongs.length) {
            songsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No data yet</div>';
        } else {
            songsContainer.innerHTML = stats.topSongs.map((song, index) => `
                <div class="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div class="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">${index + 1}</div>
                    <div class="flex-1 min-w-0">
                        <a href="${escapeHtml(song.songUrl)}" target="_blank" class="font-medium text-gray-900 dark:text-white hover:text-brand-primary truncate block">
                            ${escapeHtml(song.songTitle)}
                        </a>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            ${formatDuration(song.totalDuration)} total played
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-brand-secondary">${song.playCount}</div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Top Users (already enriched with avatars)
    const usersContainer = document.getElementById('stats-top-users');
    if (usersContainer) {
        if (!stats.topUsers.length) {
            usersContainer.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No data yet</div>';
        } else {
            usersContainer.innerHTML = stats.topUsers.map((user, index) => `
                <div class="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div class="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">${index + 1}</div>
                    ${user.avatarUrl ? `
                        <img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(user.username)}" 
                             class="w-10 h-10 rounded-full border-2 border-brand-primary object-cover">
                    ` : '<div class="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600"></div>'}
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-900 dark:text-white truncate">
                            ${escapeHtml(user.username)}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            ${formatDuration(user.totalDuration)} total listening time
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-brand-primary">${user.playCount}</div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Top Channels (enriched with guild icons and names)
    const channelsContainer = document.getElementById('stats-top-channels');
    if (channelsContainer) {
        if (!stats.topChannels || !stats.topChannels.length) {
            channelsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No data yet</div>';
        } else {
            channelsContainer.innerHTML = stats.topChannels.map((channel, index) => `
                <div class="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" 
                     title="${escapeHtml(channel.guildName)}">
                    <div class="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">${index + 1}</div>
                    ${channel.guildIconUrl ? `
                        <img src="${escapeHtml(channel.guildIconUrl)}" alt="${escapeHtml(channel.guildName)}" 
                             class="w-10 h-10 rounded-full border-2 border-brand-primary object-cover">
                    ` : '<div class="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center"><i data-lucide="hash" class="w-5 h-5 text-gray-500"></i></div>'}
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-900 dark:text-white truncate flex items-center gap-1">
                            <i data-lucide="hash" class="w-3 h-3 text-gray-400"></i>
                            ${escapeHtml(channel.channelName)}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            ${escapeHtml(channel.guildName)}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-brand-primary">${channel.playCount}</div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Top Bots
    const botsContainer = document.getElementById('stats-top-bots');
    if (botsContainer) {
        if (!stats.topBots || !stats.topBots.length) {
            botsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No data yet</div>';
        } else {
            botsContainer.innerHTML = stats.topBots.map((bot, index) => `
                <div class="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div class="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">${index + 1}</div>
                    <div class="w-10 h-10 rounded-full bg-brand-secondary/10 flex items-center justify-center">
                        <i data-lucide="bot" class="w-5 h-5 text-brand-secondary"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-900 dark:text-white truncate">
                            ${escapeHtml(bot.botName)}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Heavenly Council Member
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-brand-secondary">${bot.playCount}</div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-wider">Plays</div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Cache Hits (enriched with avatars)
    const cacheHitsContainer = document.getElementById('stats-cache-hits');
    if (cacheHitsContainer) {
        if (!stats.topCacheHits || !stats.topCacheHits.length) {
            cacheHitsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No cache hits yet</div>';
        } else {
            cacheHitsContainer.innerHTML = stats.topCacheHits.map((hit, index) => `
                <div class="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div class="text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center">${index + 1}</div>
                    ${hit.avatarUrl ? `
                        <img src="${escapeHtml(hit.avatarUrl)}" alt="${escapeHtml(hit.displayName)}" 
                             class="w-10 h-10 rounded-full border-2 border-yellow-500 object-cover">
                    ` : `<div class="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <i data-lucide="${hit.entityType === 'bot' ? 'bot' : 'user'}" class="w-5 h-5 text-yellow-500"></i>
                    </div>`}
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-900 dark:text-white truncate">
                            ${escapeHtml(hit.displayName)}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            ${hit.entityType === 'bot' ? '🤖 Bot' : '👤 User'}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-yellow-500 flex items-center gap-1">
                            <i data-lucide="zap" class="w-4 h-4"></i>
                            ${hit.cacheHits}
                        </div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-wider">Hits</div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Re-initialize Lucide icons for newly rendered content
    lucide.createIcons();
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
        let levelColor = 'text-gray-500 dark:text-gray-400';
        if (log.level === 'error') levelColor = 'text-red-600 dark:text-red-400';
        else if (log.level === 'warn') levelColor = 'text-yellow-600 dark:text-yellow-400';
        else if (log.level === 'debug') levelColor = 'text-blue-600 dark:text-blue-400';
        else if (log.level === 'info') levelColor = 'text-green-600 dark:text-green-400';

        // Format Timestamp
        const date = new Date(log.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const fullDate = date.toLocaleString();

        return `
            <div class="log-entry flex items-start gap-3 hover:bg-gray-200 dark:hover:bg-white/5 p-1 rounded transition-colors">
                <span class="log-level font-bold w-16 uppercase text-xs tracking-wider ${levelColor}">[${escapeHtml(log.level)}]</span>
                <span class="log-timestamp text-gray-500 text-xs" title="${fullDate}">${timeStr}</span>
                ${log.module ? `<span class="log-module text-purple-600 dark:text-purple-400 font-medium">[${escapeHtml(log.module)}]</span>` : ''}
                <span class="log-message text-gray-700 dark:text-gray-300 flex-1 break-all">${escapeHtml(log.message)}</span>
            </div>
        `;
    }).join('');
}

// Toggle queue expansion
window.toggleQueueExpansion = function (queueId) {
    if (expandedQueues.has(queueId)) {
        expandedQueues.delete(queueId);
    } else {
        expandedQueues.add(queueId);
    }
    renderQueues();
};

// Helper: Format Duration
function formatDuration(seconds) {
    if (!seconds) return '00:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Helper: Format ETA
function formatEta(seconds) {
    if (!seconds || seconds < 60) return 'in <1m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);

    if (hours > 0) {
        return `in ${hours}h${minutes}m`;
    }
    return `in ${minutes}m`;
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

// Handle viewport changes
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const newLimit = getQueueLimit();
        if (newLimit !== queuesPagination.limit) {
            queuesPagination.currentPage = 1;
            fetchData();
        }
    }, 250);
});

// Initial Fetch and Polling
fetchData();
checkAuth();
setInterval(fetchData, 3000);

// Auth Logic
async function checkAuth() {
    try {
        const res = await fetch(`${API_BASE}/auth/me`);
        const container = document.getElementById('auth-container');
        if (!container) return;

        if (res.ok) {
            const data = await res.json();
            const user = data.user;

            // Show User Profile & Logout
            container.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2">
                        ${user.avatar
                    ? `<img src="${escapeHtml(user.avatar)}" class="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700">`
                    : `<div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><i data-lucide="user" class="w-4 h-4 text-gray-500"></i></div>`
                }
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:inline">${escapeHtml(user.username)}</span>
                    </div>
                    <button id="logout-btn" class="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Logout">
                        <i data-lucide="log-out" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            lucide.createIcons();
            // Attach logout event listener programmatically
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', logout);
            }
        } else {
            // Show Login Button (Default)
            container.innerHTML = `
                <a href="/api/auth/login"
                    class="px-4 py-2 rounded-full text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 transition-colors flex items-center gap-2">
                    <i data-lucide="log-in" class="w-4 h-4"></i>
                    Login
                </a>
            `;
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
        window.location.reload();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}
