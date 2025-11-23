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

// Render Workers
function renderWorkers() {
    const container = document.getElementById('workers-grid');
    if (!container) return;

    container.innerHTML = workers.map(worker => {
        const isOnline = worker.status !== 'offline';
        const statusColor = isOnline ? (worker.busy ? 'text-yellow-500' : 'text-green-500') : 'text-gray-400';
        const statusText = isOnline ? (worker.busy ? 'Busy' : 'Idle') : 'Offline';
        const borderColor = isOnline ? (worker.busy ? 'border-yellow-500' : 'border-green-500') : 'border-gray-200 dark:border-gray-700';

        return `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 ${borderColor} transition-all hover:scale-[1.02]">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white">${worker.name}</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 capitalize">${worker.role}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full ${isOnline ? (worker.busy ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-400'}"></span>
                        <span class="text-sm font-medium ${statusColor}">${statusText}</span>
                    </div>
                </div>
                
                <div class="space-y-2">
                    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <i data-lucide="activity" class="w-4 h-4"></i>
                        <span>${worker.activity}</span>
                    </div>
                    ${worker.guildId ? `
                    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <i data-lucide="server" class="w-4 h-4"></i>
                        <span>Guild: ${worker.guildId}</span>
                    </div>
                    ` : ''}
                    ${worker.voiceChannelId ? `
                    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <i data-lucide="mic" class="w-4 h-4"></i>
                        <span>Channel: ${worker.voiceChannelId}</span>
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
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div class="flex items-center gap-3">
                    <div class="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-lg">
                        <i data-lucide="music" class="w-6 h-6 text-pink-500"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white">Channel: ${queue.voiceChannelId}</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Managed by ${queue.workerName}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        ${queue.queueLength} songs
                    </span>
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${queue.autoplay ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}">
                        Autoplay: ${queue.autoplay ? 'ON' : 'OFF'}
                    </span>
                </div>
            </div>

            ${queue.nowPlaying ? `
            <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                <div class="flex items-start gap-3">
                    <div class="mt-1">
                        <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Now Playing</p>
                        <a href="${queue.nowPlaying.url}" target="_blank" class="text-base font-semibold text-gray-900 dark:text-white hover:text-indigo-500 truncate block">
                            ${queue.nowPlaying.title}
                        </a>
                        <div class="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span class="flex items-center gap-1">
                                <i data-lucide="clock" class="w-3 h-3"></i>
                                ${formatDuration(queue.nowPlaying.duration)}
                            </span>
                            <span class="flex items-center gap-1">
                                <i data-lucide="user" class="w-3 h-3"></i>
                                ${queue.nowPlaying.requestedBy}
                            </span>
                        </div>
                    </div>
                </div>
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

    if (logs.length === 0) {
        container.innerHTML = '<div class="text-gray-500 italic">No logs available.</div>';
        return;
    }

    container.innerHTML = logs.map(log => {
        let colorClass = 'text-gray-300';
        if (log.includes('[ERROR]')) colorClass = 'text-red-400';
        else if (log.includes('[WARN]')) colorClass = 'text-yellow-400';
        else if (log.includes('[DEBUG]')) colorClass = 'text-blue-400';

        return `<div class="${colorClass}">${log}</div>`;
    }).join('');
}

// Helper: Format Duration
function formatDuration(seconds) {
    if (!seconds) return '00:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Initial Fetch and Polling
fetchData();
setInterval(fetchData, 3000);
