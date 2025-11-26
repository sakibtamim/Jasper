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
            if (targetId === '#cache') loadCache();
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
    try {
        const response = await fetch('/api/devtools/cache');
        const data = await response.json();
        const tbody = document.getElementById('cache-table-body');
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
        console.error('Failed to load cache:', error);
    }
}

async function deleteCacheEntry(query) {
    if (!confirm('Are you sure you want to delete this cache entry?')) return;
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

// Expose functions to global scope for onclick handlers
window.deleteUser = deleteUser;
window.deleteSession = deleteSession;
window.deleteCacheEntry = deleteCacheEntry;
