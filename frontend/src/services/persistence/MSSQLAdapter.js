import { StorageAdapter } from './StorageAdapter';

/**
 * Adaptador para persistencia en SQL Server (Enterprise Version / BIOS)
 * Guarda la estructura del canvas directamente en columna NVARCHAR(MAX)
 */
export class MSSQLAdapter extends StorageAdapter {
    constructor(apiUrl) {
        super();
        this.apiUrl = apiUrl || '/api/engineering/plants'; // Endpoint base
    }

    async save(plantData) {
        console.log('[MSSQLAdapter] Transactional save for:', plantData.name);
        try {
            // Estructura esperada por el backend Enterprise
            const payload = {
                id: plantData.id,
                name: plantData.name,
                asset_id: plantData.asset_id,
                canvas_json: JSON.stringify(plantData.canvas_json), // Serializado para DB
                storage_type: 'db_json',
                layers_config: plantData.layers
            };

            const response = await fetch(`${this.apiUrl}/${plantData.id}`, {
                method: 'PUT', // or POST for new
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': 'Bearer ...' // Token handling here
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Database save failed');
            return await response.json();
        } catch (error) {
            console.error('[MSSQLAdapter] Error:', error);
            throw error;
        }
    }

    async load(id) {
        console.log('[MSSQLAdapter] Fetching from DB:', id);
        try {
            const response = await fetch(`${this.apiUrl}/${id}`);
            if (!response.ok) throw new Error('Database load failed');

            const rawRow = await response.json();

            // Reconstruir objeto PlantFloor
            return {
                id: rawRow.id,
                name: rawRow.name,
                asset_id: rawRow.asset_id,
                canvas_json: typeof rawRow.canvas_json === 'string' ? JSON.parse(rawRow.canvas_json) : rawRow.canvas_json,
                layers: rawRow.layers_config || [],
                updated_at: rawRow.updated_at
            };
        } catch (error) {
            console.error('[MSSQLAdapter] Error:', error);
            throw error;
        }
    }

    async list() {
        // Implementación real
        return [];
    }
}
