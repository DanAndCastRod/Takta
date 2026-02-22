
const API_BASE = '/api';

class PlantLayoutService {

    // --- Layouts ---

    async getLayouts() {
        try {
            const response = await fetch(`${API_BASE}/plant-layouts/`);
            if (!response.ok) throw new Error('Failed to fetch layouts');
            return await response.json();
        } catch (error) {
            console.error('[PlantLayoutService] Error fetching layouts:', error);
            throw error;
        }
    }

    async getLayout(id) {
        try {
            const response = await fetch(`${API_BASE}/plant-layouts/${id}`);
            if (!response.ok) throw new Error('Failed to fetch layout');
            return await response.json();
        } catch (error) {
            console.error('[PlantLayoutService] Error fetching layout details:', error);
            throw error;
        }
    }

    async saveLayout(data) {
        try {
            const isUpdate = !!data.id;
            const url = isUpdate ? `${API_BASE}/plant-layouts/${data.id}` : `${API_BASE}/plant-layouts/`;
            const method = isUpdate ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Failed to save layout');
            return await response.json();
        } catch (error) {
            console.error('[PlantLayoutService] Error saving layout:', error);
            throw error;
        }
    }

    async deleteLayout(id) {
        try {
            const response = await fetch(`${API_BASE}/plant-layouts/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete layout');
            return await response.json();
        } catch (error) {
            console.error('[PlantLayoutService] Error deleting layout:', error);
            throw error;
        }
    }

    // --- Assets (Machines) ---

    async getAssetsList() {
        try {
            // Asumiendo que existe un endpoint que devuelve lista plana o arbol
            // Si /assets devuelve paginado, aqui podriamos pedir ?limit=1000
            const response = await fetch(`${API_BASE}/assets/?limit=1000`);
            if (!response.ok) throw new Error('Failed to fetch assets');
            return await response.json();
        } catch (error) {
            console.error('[PlantLayoutService] Error fetching assets:', error);
            // Fallback empty list to not break UI
            return [];
        }
    }
}

export const plantLayoutService = new PlantLayoutService();
