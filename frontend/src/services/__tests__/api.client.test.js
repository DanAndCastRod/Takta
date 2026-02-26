import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiClient from '../api.client.js';

// Mock the global fetch
global.fetch = vi.fn();

describe('ApiClient', () => {
    beforeEach(() => {
        // Reset mocks and localStorage before each test
        vi.resetAllMocks();
        localStorage.clear();

        // Define default mock response to avoid unhandled rejections
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ data: 'success' })
        });
    });

    it('should inject Authorization header when token is in localStorage', async () => {
        // Arrange
        localStorage.setItem('takta_token', 'mock-jwt-token');

        // Act
        await ApiClient.get('/test');

        // Assert
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/test'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Bearer mock-jwt-token',
                    'Content-Type': 'application/json'
                })
            })
        );
    });

    it('should not inject Authorization header if no token exists', async () => {
        // Arrange (localStorage is cleared in beforeEach)

        // Act
        await ApiClient.get('/test');

        // Assert
        const callArgs = global.fetch.mock.calls[0][1];
        expect(callArgs.headers.Authorization).toBeUndefined();
    });

    it('should throw an ApiError if response is not ok', async () => {
        // Arrange
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: async () => ({ detail: 'Invalid parameters' })
        });

        // Act & Assert
        await expect(ApiClient.get('/test')).rejects.toThrow('Invalid parameters');
    });

    it('should handle 401 Unauthorized globally by clearing token and throwing', async () => {
        // Arrange
        localStorage.setItem('takta_token', 'expired-token');
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({ detail: 'Not authenticated' }) // Will likely be skipped by ApiClient due to throw
        });

        // Mock custom event dipatch
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

        // Act & Assert
        await expect(ApiClient.get('/test')).rejects.toThrow('Unauthorized');

        // Assert token is removed
        expect(localStorage.getItem('takta_token')).toBeNull();

        // Assert custom event was fired
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'auth:unauthorized' })
        );
    });

    it('should handle 204 No Content returning an empty object', async () => {
        // Arrange
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 204,
            json: async () => { throw new Error('Cannot parse JSON on 204'); }
        });

        // Act
        const res = await ApiClient.delete('/test');

        // Assert
        expect(res).toEqual({});
    });
});
