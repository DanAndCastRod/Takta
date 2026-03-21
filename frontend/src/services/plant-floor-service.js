import { MSSQLAdapter } from './persistence/MSSQLAdapter.js';
import { JSONFileAdapter } from './persistence/JSONFileAdapter.js';

class PlantFloorService {
    constructor() {
        this.adapter = null;
        this.initAdapter();
    }

    initAdapter() {
        // Detección de estrategia:
        // Si estamos en entorno Enterprise (detectado por TaktaTheme o config), usar MSSQL.
        // Por defecto usar JSONFile (Community/Dev).

        // TODO: Integrar con configuración global real
        const useEnterprise = window.location.hostname.includes('bios') ||
            localStorage.getItem('takta_env') === 'enterprise';

        if (useEnterprise) {
            console.log('[PlantFloorService] Using Enterprise Persistence (MSSQL/DB)');
            this.adapter = new MSSQLAdapter('/plant-layouts');
        } else {
            console.log('[PlantFloorService] Using Community Persistence (JSON/Local)');
            this.adapter = new JSONFileAdapter();
        }
    }

    /**
     * Guarda el estado actual del editor
     * @param {Object} plantData 
     */
    async savePlant(plantData) {
        return await this.adapter.save(plantData);
    }

    /**
     * Carga un plano completo
     * @param {string} id 
     */
    async loadPlant(id) {
        return await this.adapter.load(id);
    }

    /**
     * Obtiene lista de planos recientes
     */
    async listPlants() {
        return await this.adapter.list();
    }
}

export const plantService = new PlantFloorService();

