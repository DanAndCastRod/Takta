const QUEUE_KEY = 'takta.offline.queue.v1';
const CONFLICTS_KEY = 'takta.offline.conflicts.v1';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function safeJsonParse(raw, fallback) {
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function readQueue() {
    return safeJsonParse(localStorage.getItem(QUEUE_KEY) || '[]', []);
}

function writeQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function readConflicts() {
    return safeJsonParse(localStorage.getItem(CONFLICTS_KEY) || '[]', []);
}

function writeConflicts(rows) {
    localStorage.setItem(CONFLICTS_KEY, JSON.stringify(rows));
}

function emitStatus() {
    window.dispatchEvent(
        new CustomEvent('offline-sync:status', {
            detail: offlineSyncService.getStatus(),
        }),
    );
}

function buildFetchOptions(item) {
    const headers = {
        ...(item.headers || {}),
    };
    if (!headers['Content-Type'] && item.body !== undefined && item.body !== null) {
        headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem('takta_token');
    if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
    }
    return {
        method: item.method,
        headers,
        body: item.body,
    };
}

function asStringBody(payload) {
    if (payload === undefined || payload === null) return undefined;
    if (typeof payload === 'string') return payload;
    return JSON.stringify(payload);
}

async function processQueueItem(item) {
    const response = await fetch(`${API_BASE_URL}${item.endpoint}`, buildFetchOptions(item));
    if (response.status === 409) {
        const conflict = {
            ...item,
            conflictAt: new Date().toISOString(),
            status: response.status,
        };
        const conflicts = readConflicts();
        conflicts.unshift(conflict);
        writeConflicts(conflicts.slice(0, 300));
        return { ok: true, conflict: true };
    }
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `HTTP ${response.status}`);
    }
    return { ok: true, conflict: false };
}

let flushPromise = null;

export const offlineSyncService = {
    init() {
        window.addEventListener('online', () => {
            void this.flushQueue();
        });
        emitStatus();
    },

    enqueueRequest({ method, endpoint, body, headers }) {
        const queue = readQueue();
        const item = {
            id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            method: String(method || 'POST').toUpperCase(),
            endpoint,
            body: asStringBody(body),
            headers: headers || {},
            queuedAt: new Date().toISOString(),
            attempts: 0,
            strategy: 'last-write-wins',
        };
        queue.push(item);
        writeQueue(queue);
        emitStatus();
        return item;
    },

    async flushQueue() {
        if (flushPromise) return flushPromise;
        if (!navigator.onLine) return { flushed: 0, conflicts: 0, remaining: readQueue().length };

        flushPromise = (async () => {
            const queue = readQueue();
            const nextQueue = [];
            let flushed = 0;
            let conflicts = 0;

            for (const item of queue) {
                try {
                    const result = await processQueueItem(item);
                    if (result.conflict) {
                        conflicts += 1;
                        continue;
                    }
                    flushed += 1;
                } catch {
                    nextQueue.push({
                        ...item,
                        attempts: Number(item.attempts || 0) + 1,
                        lastAttemptAt: new Date().toISOString(),
                    });
                }
            }

            writeQueue(nextQueue);
            emitStatus();
            return { flushed, conflicts, remaining: nextQueue.length };
        })();

        try {
            return await flushPromise;
        } finally {
            flushPromise = null;
        }
    },

    clearQueue() {
        writeQueue([]);
        emitStatus();
    },

    clearConflicts() {
        writeConflicts([]);
        emitStatus();
    },

    getStatus() {
        const queue = readQueue();
        const conflicts = readConflicts();
        return {
            pending: queue.length,
            conflicts: conflicts.length,
            online: navigator.onLine,
        };
    },

    getQueue() {
        return readQueue();
    },

    getConflicts() {
        return readConflicts();
    },
};

export default offlineSyncService;
