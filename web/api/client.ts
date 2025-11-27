const API_BASE = '/api';

export async function fetchWorkers() {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error('Failed to fetch workers');
    return res.json();
}

export async function fetchQueues(page = 1, limit = 10) {
    const res = await fetch(`${API_BASE}/queues?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch queues');
    return res.json();
}

export async function fetchStats(limit = 10) {
    const res = await fetch(`${API_BASE}/stats?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
}

export async function fetchCacheStats() {
    const res = await fetch(`${API_BASE}/cache`);
    if (!res.ok) throw new Error('Failed to fetch cache stats');
    return res.json();
}

export async function fetchLogs() {
    const res = await fetch(`${API_BASE}/logs`);
    if (!res.ok) throw new Error('Failed to fetch logs');
    return res.json();
}

export async function fetchAuthStatus() {
    const res = await fetch(`${API_BASE}/auth/me`);
    if (!res.ok) return null;
    return res.json();
}

export async function logout() {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    window.location.reload();
}
