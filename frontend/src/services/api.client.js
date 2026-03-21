/**
 * ApiClient - Wrapper for fetch to interact with the backend API.
 * Handles base URL, JSON parsing, error handling, and JWT injection.
 */

import offlineSyncService from './offline-sync.service.js';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
    constructor(status, message, details = null) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

class ApiClient {
    /**
     * Helper to get the auth header if a token exists
     */
    static getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };
        const token = localStorage.getItem('takta_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const tenantCode = localStorage.getItem('takta.tenant_code') || 'default';
        headers['X-Takta-Tenant'] = tenantCode;
        return headers;
    }

    /**
     * Normalize endpoint path:
     *   - Strip trailing slashes (except bare "/")
     *   - This prevents FastAPI 307 redirects that break the Vite proxy
     */
    static normalizePath(endpoint) {
        if (!endpoint || endpoint === '/') return endpoint;
        return endpoint.replace(/\/+$/, '');
    }

    /**
     * Core request method
     */
    static async request(endpoint, options = {}) {
        const normalizedEndpoint = this.normalizePath(endpoint);
        const url = `${API_BASE_URL}${normalizedEndpoint}`;
        const headers = this.getHeaders(options.headers);
        const method = String(options.method || 'GET').toUpperCase();
        const hasToken = Boolean(localStorage.getItem('takta_token'));

        // Offline-first write strategy: queue writes when no connectivity.
        if (!navigator.onLine && !['GET', 'HEAD'].includes(method)) {
            const payload = options.body ? JSON.parse(options.body) : null;
            const queued = offlineSyncService.enqueueRequest({
                method,
                endpoint: normalizedEndpoint,
                body: payload,
                headers,
            });
            return {
                queued: true,
                offline: true,
                queue_id: queued.id,
                message: 'Solicitud en cola offline. Se sincronizará al recuperar conexión.',
            };
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Handle 401 Unauthorized globally
            if (response.status === 401) {
                // Trigger global logout only when a session token existed.
                // This avoids unauthorized loops on public/guest bootstrap calls.
                if (hasToken) {
                    localStorage.removeItem('takta_token');
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                }
                throw new ApiError(401, 'Unauthorized');
            }

            if (!response.ok) {
                let errorMsg = 'Error en la petición';
                let details = null;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.detail || errorMsg;
                    details = errorData;
                } catch (e) {
                    errorMsg = response.statusText;
                }
                throw new ApiError(response.status, errorMsg, details);
            }

            // Return empty object for 204 No Content
            if (response.status === 204) {
                return {};
            }

            return await response.json();

        } catch (error) {
            if (!['GET', 'HEAD'].includes(method)) {
                try {
                    const payload = options.body ? JSON.parse(options.body) : null;
                    const queued = offlineSyncService.enqueueRequest({
                        method,
                        endpoint: normalizedEndpoint,
                        body: payload,
                        headers,
                    });
                    return {
                        queued: true,
                        offline: !navigator.onLine,
                        queue_id: queued.id,
                        message: 'Solicitud en cola por fallo de red.',
                    };
                } catch {
                    // If payload parsing fails, preserve previous error behavior.
                }
            }
            console.error(`[ApiClient Error] ${options.method || 'GET'} ${endpoint}`, error);
            throw error;
        }
    }

    static get(endpoint, headers = {}) {
        return this.request(endpoint, { method: 'GET', headers });
    }

    static post(endpoint, data, headers = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            headers
        });
    }

    static put(endpoint, data, headers = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers
        });
    }

    static patch(endpoint, data, headers = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
            headers
        });
    }

    static delete(endpoint, headers = {}) {
        return this.request(endpoint, { method: 'DELETE', headers });
    }

    static flushOfflineQueue() {
        return offlineSyncService.flushQueue();
    }
}

export default ApiClient;

