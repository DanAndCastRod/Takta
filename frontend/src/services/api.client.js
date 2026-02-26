/**
 * ApiClient - Wrapper for fetch to interact with the backend API.
 * Handles base URL, JSON parsing, error handling, and JWT injection.
 */

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
        return headers;
    }

    /**
     * Core request method
     */
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = this.getHeaders(options.headers);

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Handle 401 Unauthorized globally
            if (response.status === 401) {
                // Clear token and trigger custom event to log out
                localStorage.removeItem('takta_token');
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
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
}

export default ApiClient;
