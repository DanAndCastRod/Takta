import ApiClient from './api.client.js';

class PlantLayoutService {
    async getLayouts(params = {}) {
        const query = new URLSearchParams();

        if (typeof params === 'string') {
            const normalized = params.trim().replace(/^\?/, '');
            if (normalized) {
                normalized.split('&').forEach((pair) => {
                    const [rawKey, rawValue = ''] = pair.split('=');
                    if (!rawKey) return;
                    query.set(decodeURIComponent(rawKey), decodeURIComponent(rawValue));
                });
            }
        } else if (params && typeof params === 'object') {
            Object.entries(params).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') return;
                query.set(key, String(value));
            });
        }

        const suffix = query.toString();
        return ApiClient.get(`/plant-layouts${suffix ? `?${suffix}` : ''}`);
    }

    async getLayout(id) {
        return ApiClient.get(`/plant-layouts/${id}`);
    }

    async saveLayout(data) {
        const isUpdate = Boolean(data.id);
        const payload = {
            name: data.name,
            description: data.description ?? null,
            json_content: data.json_content ?? data.json ?? '{}',
            thumbnail_data: data.thumbnail_data ?? data.thumbnail ?? null,
            plant_id: data.plant_id ?? data.asset_id ?? null,
            is_active: data.is_active ?? true,
        };

        if (isUpdate) {
            return ApiClient.put(`/plant-layouts/${data.id}`, payload);
        }
        return ApiClient.post('/plant-layouts', payload);
    }

    // Backward-compatible alias used by PlantEditor internals
    async savePlantLayout(data) {
        return this.saveLayout(data);
    }

    async deleteLayout(id) {
        return ApiClient.delete(`/plant-layouts/${id}`);
    }

    async getAssetsList(limit = 1000) {
        return ApiClient.get(`/assets?limit=${limit}`);
    }
}

export const plantLayoutService = new PlantLayoutService();
