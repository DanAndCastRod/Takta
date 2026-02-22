/**
 * LayerManager - Gestiona capas lógicas del editor de planta.
 * Cada objeto de Fabric.js tiene una propiedad `layerId` que lo asocia a una capa.
 */

export const LAYER_TYPES = {
    BASE: 'base',
    ZONES: 'zones',
    ASSETS: 'assets',
    CONNECTIONS: 'connections',
    HEATMAP: 'heatmap'
};

export class LayerManager {
    constructor(fabricCanvas) {
        this.fabricCanvas = fabricCanvas;
        this.layers = [];
        this.activeLayerId = null;
        this.onChangeCallbacks = [];

        // Crear capas por defecto
        this.initDefaultLayers();
    }

    initDefaultLayers() {
        this.layers = [
            {
                id: 'base',
                name: 'Plano Base',
                type: LAYER_TYPES.BASE,
                visible: true,
                locked: true,
                color: '#6366f1' // indigo
            },
            {
                id: 'zones',
                name: 'Zonificación',
                type: LAYER_TYPES.ZONES,
                visible: true,
                locked: false,
                color: '#10b981' // emerald
            },
            {
                id: 'assets',
                name: 'Máquinas/Puestos',
                type: LAYER_TYPES.ASSETS,
                visible: true,
                locked: false,
                color: '#f59e0b' // amber
            },
            {
                id: 'connections',
                name: 'Conexiones',
                type: LAYER_TYPES.CONNECTIONS,
                visible: true,
                locked: false,
                color: '#8b5cf6' // violet
            }
        ];

        this.activeLayerId = 'zones';
    }

    /**
     * Obtiene todas las capas
     */
    getLayers() {
        return this.layers;
    }

    /**
     * Obtiene una capa por ID
     */
    getLayer(id) {
        return this.layers.find(l => l.id === id);
    }

    /**
     * Obtiene la capa activa
     */
    getActiveLayer() {
        return this.getLayer(this.activeLayerId);
    }

    /**
     * Establece la capa activa
     */
    setActiveLayer(id) {
        const layer = this.getLayer(id);
        if (layer && !layer.locked) {
            this.activeLayerId = id;
            this.notifyChange();
        }
    }

    /**
     * Alterna visibilidad de una capa
     */
    toggleVisibility(id) {
        const layer = this.getLayer(id);
        if (layer) {
            layer.visible = !layer.visible;
            this.updateCanvasVisibility();
            this.notifyChange();
        }
    }

    /**
     * Actualiza la visibilidad de objetos en el canvas según el estado de las capas
     */
    updateCanvasVisibility() {
        if (!this.fabricCanvas.canvas) return;

        this.fabricCanvas.canvas.forEachObject(obj => {
            const layerId = obj.layerId || 'base';
            const layer = this.getLayer(layerId);
            if (layer) {
                obj.visible = layer.visible;
                // Si la capa está bloqueada, el objeto no es seleccionable
                obj.selectable = !layer.locked && layer.visible;
                obj.evented = !layer.locked && layer.visible;
            }
        });

        this.fabricCanvas.canvas.requestRenderAll();
    }

    /**
     * Alterna bloqueo de una capa
     */
    toggleLock(id) {
        const layer = this.getLayer(id);
        if (layer && layer.type !== LAYER_TYPES.BASE) { // Base siempre bloqueada
            layer.locked = !layer.locked;
            this.updateCanvasVisibility();
            this.notifyChange();
        }
    }

    /**
     * Agrega una capa personalizada
     */
    addLayer(name, type = 'custom') {
        const id = `layer-${Date.now()}`;
        const layer = {
            id,
            name,
            type,
            visible: true,
            locked: false,
            color: '#64748b' // slate
        };
        this.layers.push(layer);
        this.notifyChange();
        return layer;
    }

    /**
     * Elimina una capa (solo custom)
     */
    removeLayer(id) {
        const layer = this.getLayer(id);
        if (layer && layer.type === 'custom') {
            this.layers = this.layers.filter(l => l.id !== id);

            // Eliminar objetos de esa capa del canvas
            if (this.fabricCanvas.canvas) {
                const toRemove = this.fabricCanvas.canvas.getObjects()
                    .filter(o => o.layerId === id);
                toRemove.forEach(o => this.fabricCanvas.canvas.remove(o));
                this.fabricCanvas.canvas.requestRenderAll();
            }

            this.notifyChange();
        }
    }

    /**
     * Asigna un objeto a una capa
     */
    assignToLayer(fabricObject, layerId) {
        fabricObject.layerId = layerId;
        this.updateCanvasVisibility();
    }

    /**
     * Obtiene objetos de una capa específica
     */
    getObjectsInLayer(layerId) {
        if (!this.fabricCanvas.canvas) return [];
        return this.fabricCanvas.canvas.getObjects()
            .filter(o => (o.layerId || 'base') === layerId);
    }

    /**
     * Suscribe un callback a cambios
     */
    onChange(callback) {
        this.onChangeCallbacks.push(callback);
    }

    notifyChange() {
        this.onChangeCallbacks.forEach(cb => cb(this.layers, this.activeLayerId));
    }
}
