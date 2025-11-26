document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Check
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            window.location.href = '/api/auth/login';
            return;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/api/auth/login';
        return;
    }

    // 2. Tab Switching Logic
    const tabs = document.querySelectorAll('[role="tab"]');
    const tabContents = document.querySelectorAll('[role="tabpanel"]');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all tabs
            tabs.forEach(t => {
                t.setAttribute('aria-selected', 'false');
                t.classList.remove('border-brand-primary', 'text-brand-primary');
                t.classList.add('border-transparent');
            });

            // Hide all contents
            tabContents.forEach(c => c.classList.add('hidden'));

            // Activate clicked tab
            tab.setAttribute('aria-selected', 'true');
            tab.classList.remove('border-transparent');
            tab.classList.add('border-brand-primary', 'text-brand-primary');

            // Show content
            const targetId = tab.getAttribute('data-tabs-target');
            document.querySelector(targetId).classList.remove('hidden');

            // Load data for the tab
            if (targetId === '#overview') loadOverview();
            if (targetId === '#users') loadUsers();
            if (targetId === '#sessions') loadSessions();
            if (targetId === '#sessions') loadSessions();
            if (targetId === '#cache') loadCache();
            if (targetId === '#stats') loadStats();
        });
    });

    // Initial Load
    loadOverview();

    // Dark Mode Toggle (copied from index.js logic)
    const themeToggleBtn = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');

    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        darkIcon.classList.remove('hidden');
    } else {
        lightIcon.classList.remove('hidden');
    }

    themeToggleBtn.addEventListener('click', function () {
        darkIcon.classList.toggle('hidden');
        lightIcon.classList.toggle('hidden');

        if (localStorage.getItem('theme') === 'dark') {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    });
});

async function loadOverview() {
    try {
        const response = await fetch('/api/devtools/stats');
        const stats = await response.json();

        document.getElementById('stats-total-plays').textContent = stats.totalPlays;

        const hours = Math.floor(stats.totalDuration / 3600);
        const minutes = Math.floor((stats.totalDuration % 3600) / 60);
        document.getElementById('stats-total-duration').textContent = `${hours}h ${minutes}m`;

        document.getElementById('stats-search-cache').textContent = stats.searchCacheSize;
        document.getElementById('stats-audio-cache').textContent = stats.audioMetadataCount;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/api/devtools/users');
        const data = await response.json();
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';

        data.users.forEach(user => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
            tr.innerHTML = `
                <td class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white flex items-center gap-2">
                    <img src="${user.avatar || 'assets/images/jasper-logo.png'}" class="w-8 h-8 rounded-full">
                    ${user.username}
                </td>
                <td class="py-4 px-6">${user.id}</td>
                <td class="py-4 px-6">${new Date(user.createdAt).toLocaleDateString()}</td>
                <td class="py-4 px-6">
                    <button onclick="deleteUser('${user.id}')" class="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        const response = await fetch(`/api/devtools/users/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadUsers();
        } else {
            const err = await response.json();
            alert(err.error);
        }
    } catch (error) {
        console.error('Failed to delete user:', error);
    }
}

async function loadSessions() {
    try {
        const response = await fetch('/api/devtools/sessions');
        const data = await response.json();
        const tbody = document.getElementById('sessions-table-body');
        tbody.innerHTML = '';

        data.sessions.forEach(session => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
            tr.innerHTML = `
                <td class="py-4 px-6 font-mono text-xs">${session.id}</td>
                <td class="py-4 px-6">${session.userId}</td>
                <td class="py-4 px-6">${new Date(session.expiresAt).toLocaleDateString()}</td>
                <td class="py-4 px-6">${new Date(session.createdAt).toLocaleDateString()}</td>
                <td class="py-4 px-6">
                    <button onclick="deleteSession('${session.id}')" class="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to load sessions:', error);
    }
}

async function deleteSession(id) {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
        const response = await fetch(`/api/devtools/sessions/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadSessions();
        } else {
            const err = await response.json();
            alert(err.error);
        }
    } catch (error) {
        console.error('Failed to delete session:', error);
    }
}

async function loadCache() {
    // Load Search Cache
    try {
        const response = await fetch('/api/devtools/cache');
        const data = await response.json();
        const tbody = document.getElementById('cacheTableBody');
        tbody.innerHTML = '';

        data.entries.forEach(entry => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
            tr.innerHTML = `
                <td class="py-4 px-6 truncate max-w-xs" title="${entry.query}">${entry.query}</td>
                <td class="py-4 px-6 truncate max-w-xs" title="${entry.songTitle}">${entry.songTitle}</td>
                <td class="py-4 px-6">${new Date(entry.cachedAt).toLocaleDateString()}</td>
                <td class="py-4 px-6">${new Date(entry.expiresAt).toLocaleDateString()}</td>
                <td class="py-4 px-6">
                    <button onclick="deleteCacheEntry('${encodeURIComponent(entry.query)}')" class="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to load search cache:', error);
    }

    // Load Audio Cache
    try {
        const response = await fetch('/api/devtools/cache/audio');
        const data = await response.json();
        const tbody = document.getElementById('audioCacheTableBody');
        tbody.innerHTML = '';

        data.entries.forEach(entry => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
            const size = entry.duration ? `${Math.floor(entry.duration / 60)}:${(entry.duration % 60).toString().padStart(2, '0')}` : 'Unknown';
            tr.innerHTML = `
                <td class="py-4 px-6 font-mono text-xs">${entry.videoId}</td>
                <td class="py-4 px-6 truncate max-w-xs" title="${entry.title}">${entry.title}</td>
                <td class="py-4 px-6">${size}</td>
                <td class="py-4 px-6">${new Date(entry.cachedAt).toLocaleDateString()}</td>
                <td class="py-4 px-6 flex gap-2">
                    <button onclick="regenerateThumbnail('${entry.videoId}')" class="font-medium text-blue-600 dark:text-blue-500 hover:underline">Regenerate Thumb</button>
                    <button onclick="deleteAudioCacheEntry('${entry.videoId}')" class="font-medium text-red-600 dark:text-red-500 hover:underline">Delete File</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to load audio cache:', error);
    }
}

async function deleteCacheEntry(query) {
    if (!confirm('Are you sure you want to delete this search cache entry?')) return;
    try {
        const response = await fetch(`/api/devtools/cache/${query}`, { method: 'DELETE' });
        if (response.ok) {
            loadCache();
        } else {
            const err = await response.json();
            alert(err.error);
        }
    } catch (error) {
        console.error('Failed to delete cache entry:', error);
    }
}

async function deleteAudioCacheEntry(videoId) {
    if (!confirm('Are you sure you want to delete this audio file and cache entry?')) return;
    try {
        const response = await fetch(`/api/devtools/cache/audio/${videoId}`, { method: 'DELETE' });
        if (response.ok) {
            loadCache();
        } else {
            const err = await response.json();
            alert(err.error);
        }
    } catch (error) {
        console.error('Failed to delete audio cache entry:', error);
    }
}

async function regenerateThumbnail(videoId) {
    if (!confirm('Regenerate thumbnail for this video? This will fetch metadata from YouTube.')) return;
    try {
        const response = await fetch(`/api/devtools/cache/audio/${videoId}/regenerate-thumbnail`, { method: 'POST' });
        if (response.ok) {
            alert('Thumbnail regenerated successfully!');
            loadCache();
        } else {
            const err = await response.json();
            alert(err.error);
        }
    } catch (error) {
        console.error('Failed to regenerate thumbnail:', error);
        alert('Failed to regenerate thumbnail');
    }
}

// Expose functions to global scope for onclick handlers
window.deleteUser = deleteUser;
window.deleteSession = deleteSession;
window.deleteCacheEntry = deleteCacheEntry;
window.deleteAudioCacheEntry = deleteAudioCacheEntry;
window.regenerateThumbnail = regenerateThumbnail;

async function loadStats() {
    // Load Top Songs
    try {
        const response = await fetch('/api/devtools/stats/songs?limit=20');
        const data = await response.json();
        const tbody = document.getElementById('statsSongsTableBody');
        tbody.innerHTML = '';
        data.forEach(song => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
            tr.innerHTML = `
                <td class="py-2 px-2 truncate max-w-xs" title="${song.songTitle}">${song.songTitle}</td>
                <td class="py-2 px-2">${song.playCount}</td>
                <td class="py-2 px-2">
                    <button onclick="deletePlaysForSong('${encodeURIComponent(song.songUrl)}')" class="text-red-600 hover:underline text-xs">Delete Plays</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error('Failed to load top songs', e); }

    // Load Top Users
    try {
        const response = await fetch('/api/devtools/stats/users?limit=20');
        const data = await response.json();
        const tbody = document.getElementById('statsUsersTableBody');
        tbody.innerHTML = '';
        data.forEach(user => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
            tr.innerHTML = `
                <td class="py-2 px-2 truncate max-w-xs">${user.userId}</td>
                <td class="py-2 px-2">${user.playCount}</td>
                <td class="py-2 px-2">
                    <button onclick="deletePlaysForUser('${user.userId}')" class="text-red-600 hover:underline text-xs">Delete Plays</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error('Failed to load top users', e); }

    // Load Top Channels
    try {
        const response = await fetch('/api/devtools/stats/channels?limit=20');
        const data = await response.json();
        const tbody = document.getElementById('statsChannelsTableBody');
        tbody.innerHTML = '';
        data.forEach(channel => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
            tr.innerHTML = `
                <td class="py-2 px-2 truncate max-w-xs" title="${channel.channelName}">${channel.channelName}</td>
                <td class="py-2 px-2">${channel.playCount}</td>
                <td class="py-2 px-2">
                    <button onclick="deletePlaysForChannel('${channel.channelId}')" class="text-red-600 hover:underline text-xs">Delete Plays</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error('Failed to load top channels', e); }

    // Load Top Bots
    try {
        const response = await fetch('/api/devtools/stats/bots?limit=20');
        const data = await response.json();
        const tbody = document.getElementById('statsBotsTableBody');
        tbody.innerHTML = '';
        data.forEach(bot => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
            tr.innerHTML = `
                <td class="py-2 px-2 truncate max-w-xs">${bot.botName}</td>
                <td class="py-2 px-2">${bot.playCount}</td>
                <td class="py-2 px-2">
                    <button onclick="deletePlaysForBot('${bot.botName}')" class="text-red-600 hover:underline text-xs">Delete Plays</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error('Failed to load top bots', e); }
}

async function deletePlaysForSong(url) {
    if (!confirm('Delete all play records for this song?')) return;
    try {
        const response = await fetch(`/api/devtools/stats/songs?url=${url}`, { method: 'DELETE' });
        if (response.ok) loadStats();
        else alert((await response.json()).error);
    } catch (e) { console.error(e); }
}

async function deletePlaysForUser(id) {
    if (!confirm('Delete all play records for this user?')) return;
    try {
        const response = await fetch(`/api/devtools/stats/users/${id}`, { method: 'DELETE' });
        if (response.ok) loadStats();
        else alert((await response.json()).error);
    } catch (e) { console.error(e); }
}

async function deletePlaysForChannel(id) {
    if (!confirm('Delete all play records for this channel?')) return;
    try {
        const response = await fetch(`/api/devtools/stats/channels/${id}`, { method: 'DELETE' });
        if (response.ok) loadStats();
        else alert((await response.json()).error);
    } catch (e) { console.error(e); }
}

async function deletePlaysForBot(name) {
    if (!confirm('Delete all play records for this bot?')) return;
    try {
        const response = await fetch(`/api/devtools/stats/bots/${name}`, { method: 'DELETE' });
        if (response.ok) loadStats();
        else alert((await response.json()).error);
    } catch (e) { console.error(e); }
}

window.deletePlaysForSong = deletePlaysForSong;
window.deletePlaysForUser = deletePlaysForUser;
window.deletePlaysForChannel = deletePlaysForChannel;
window.deletePlaysForBot = deletePlaysForBot;
