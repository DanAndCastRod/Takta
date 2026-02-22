import { StorageAdapter } from './StorageAdapter';

/**
 * Adaptador para persistencia basada en archivos JSON (Community Version)
 * En desarrollo, usa LocalStorage para simular persistencia de archivos.
 * En producción, conectaría con un endpoint que lea/escriba .json files.
 */
export class JSONFileAdapter extends StorageAdapter {
    constructor() {
        super();
        this.prefix = 'takta_plant_';
    }

    async save(plantData) {
        console.log('[JSONFileAdapter] Saving plant:', plantData.name);
        try {
            // Simulación LocalStorage por ahora
            // TODO: Reemplazar con fetch POST /api/plants/save-file en integración real
            const key = `${this.prefix}${plantData.id}`;
            const serialized = JSON.stringify(plantData);
            localStorage.setItem(key, serialized);

            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 500));
            return { success: true, id: plantData.id, message: 'Saved to local storage (JSON Mode)' };
        } catch (error) {
            console.error('[JSONFileAdapter] Error saving:', error);
            throw error;
        }
    }

    async load(id) {
        console.log('[JSONFileAdapter] Loading plant:', id);
        try {
            const key = `${this.prefix}${id}`;
            const data = localStorage.getItem(key);

            if (!data) throw new Error(`Plant ${id} not found locally`);

            return JSON.parse(data);
        } catch (error) {
            console.error('[JSONFileAdapter] Error loading:', error);
            throw error;
        }
    }

    async list() {
        // Listar keys del localStorage que coincidan
        const plants = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.prefix)) {
                try {
                    const plant = JSON.parse(localStorage.getItem(key));
                    plants.push({
                        id: plant.id,
                        name: plant.name,
                        updated_at: plant.updated_at
                    });
                } catch (e) { /* ignore invalid json */ }
            }
        }
        return plants;
    }
}
