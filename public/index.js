// Initialize Lucide icons
lucide.createIcons();

// Theme Toggle Logic
const themeToggleBtn = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;

// Check local storage or system preference
if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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
let cacheStats = {};
let logs = [];

// Fetch Data
async function fetchData() {
    try {
        const [workersRes, queuesRes, cacheRes, logsRes] = await Promise.all([
            fetch(`${API_BASE}/status`),
            fetch(`${API_BASE}/queues`),
            fetch(`${API_BASE}/cache`),
            fetch(`${API_BASE}/logs`)
        ]);

        const workersData = await workersRes.json();
        const queuesData = await queuesRes.json();
        const cacheData = await cacheRes.json();
        const logsData = await logsRes.json();

        workers = workersData.workers;
        queues = queuesData.queues;
        cacheStats = cacheData.stats;
        logs = logsData.logs;

        renderWorkers();
        renderQueues();
        renderCacheStats();
        renderLogs();
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
                        <img src="${worker.avatarUrl || 'assets/images/jasper-logo.png'}" alt="${escapeHtml(worker.name)}" 
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
                        <span class="truncate">${escapeHtml(worker.activity)}</span>
                    </div>

                    ${worker.guildId ? `
                    <!-- Guild Info -->
                    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        ${worker.guildIconUrl ?
                    `<img src="${worker.guildIconUrl}" class="w-4 h-4 rounded-full object-cover">` :
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
                        <div class="flex items-center gap-3">
                            <div class="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                ${worker.nowPlaying.thumbnail ?
                    `<img src="${worker.nowPlaying.thumbnail}" class="w-full h-full object-cover">` :
                    `<div class="flex items-center justify-center w-full h-full"><i data-lucide="music" class="w-6 h-6 text-gray-400"></i></div>`
                }
                                <div class="absolute inset-0 bg-black/10"></div>
                            </div>
                            <div class="min-w-0">
                                <p class="text-xs text-brand-secondary font-bold uppercase tracking-wider mb-0.5">Now Playing</p>
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

    if (queues.length === 0) {
        container.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 text-center text-gray-500">
                No active queues right now.
            </div>
            `;
        return;
    }

    container.innerHTML = queues.map(queue => `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover-card">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div class="flex items-center gap-3">
                        <div class="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                            <i data-lucide="music" class="w-6 h-6 text-brand-secondary"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Channel: ${escapeHtml(queue.voiceChannelId)}</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Managed by <span class="text-brand-primary font-medium">${escapeHtml(queue.workerName)}</span></p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            ${queue.queueLength} songs
                        </span>
                        <span class="px-3 py-1 rounded-full text-xs font-medium ${queue.autoplay ? 'bg-brand-secondary/10 text-brand-secondary' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}">
                            Autoplay: ${queue.autoplay ? 'ON' : 'OFF'}
                        </span>
                    </div>
                </div>

            ${queue.nowPlaying ? `
            <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                <div class="flex items-start gap-3">
                    <div class="mt-1">
                        <div class="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Now Playing</p>
                        <a href="${escapeHtml(queue.nowPlaying.url)}" target="_blank" class="text-base font-semibold text-gray-900 dark:text-white hover:text-brand-primary truncate block transition-colors">
                            ${escapeHtml(queue.nowPlaying.title)}
                        </a>
                        <div class="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span class="flex items-center gap-1">
                                <i data-lucide="clock" class="w-3 h-3"></i>
                                ${formatDuration(queue.nowPlaying.duration)}
                            </span>
                            <span class="flex items-center gap-1">
                                <i data-lucide="user" class="w-3 h-3"></i>
                                ${escapeHtml(queue.nowPlaying.requestedBy)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''
        }
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

    if (logs.length === 0) {
        container.innerHTML = '<div class="text-gray-500 italic">No logs available.</div>';
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
    return `${min}:${sec.toString().padStart(2, '0')} `;
}

// Initial Fetch and Polling
fetchData();
setInterval(fetchData, 3000);
