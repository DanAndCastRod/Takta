import { StorageAdapter } from './StorageAdapter.js';
import ApiClient from '../api.client.js';

/**
 * Adapter de persistencia Enterprise.
 * Usa el backend unificado de layouts (`/api/plant-layouts`).
 */
export class MSSQLAdapter extends StorageAdapter {
    constructor(apiUrl) {
        super();
        this.apiUrl = apiUrl || '/plant-layouts';
    }

    toLayoutPayload(plantData) {
        const jsonContent = plantData.json_content
            ?? (typeof plantData.canvas_json === 'string'
                ? plantData.canvas_json
                : JSON.stringify(plantData.canvas_json ?? {}));

        return {
            name: plantData.name || 'Planta sin nombre',
            description: plantData.description ?? null,
            json_content: jsonContent,
            thumbnail_data: plantData.thumbnail_data ?? null,
            is_active: plantData.is_active ?? true,
        };
    }

    toPlantData(layout) {
        return {
            id: layout.id,
            name: layout.name,
            description: layout.description ?? '',
            json_content: layout.json_content,
            canvas_json: layout.json_content ? JSON.parse(layout.json_content) : {},
            thumbnail_data: layout.thumbnail_data ?? null,
            updated_at: layout.updated_at,
            created_at: layout.created_at,
        };
    }

    async save(plantData) {
        console.log('[MSSQLAdapter] Saving layout:', plantData.name);
        const payload = this.toLayoutPayload(plantData);
        const layout = plantData.id
            ? await ApiClient.put(`${this.apiUrl}/${plantData.id}`, payload)
            : await ApiClient.post(this.apiUrl, payload);
        return this.toPlantData({ ...layout, json_content: payload.json_content });
    }

    async load(id) {
        console.log('[MSSQLAdapter] Fetching layout from DB:', id);
        const layout = await ApiClient.get(`${this.apiUrl}/${id}`);
        return this.toPlantData(layout);
    }

    async list() {
        const layouts = await ApiClient.get(this.apiUrl);
        return layouts.map((layout) => ({
            id: layout.id,
            name: layout.name,
            description: layout.description ?? '',
            thumbnail_data: layout.thumbnail_data ?? null,
            updated_at: layout.updated_at,
            created_at: layout.created_at,
        }));
    }
}
