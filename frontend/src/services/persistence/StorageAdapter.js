/**
 * Interfaz Base para adaptadores de persistencia de PlantFloor
 * Strategy Pattern para soportar Multi-DB (MSSQL/Enterprise vs JSON/Files/Community)
 */
export class StorageAdapter {
    constructor(config = {}) {
        this.config = config;
    }

    /**
     * Guarda el plano de planta
     * @param {Object} plantData - Datos completos del plano
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async save(plantData) {
        throw new Error('Method "save" must be implemented');
    }

    /**
     * Carga un plano por ID
     * @param {string} id - ID del plano
     * @returns {Promise<Object>} - Datos del plano
     */
    async load(id) {
        throw new Error('Method "load" must be implemented');
    }

    /**
     * Lista los planos disponibles
     * @returns {Promise<Array>} - Lista de planos (metadata básica)
     */
    async list() {
        throw new Error('Method "list" must be implemented');
    }
}
