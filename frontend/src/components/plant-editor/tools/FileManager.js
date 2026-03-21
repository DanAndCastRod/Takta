/**
 * FileManager - Gestión de archivos: Guardar, Cargar, Exportar, Autosave.
 */

export class FileManager {
    constructor(fabricCanvas, options = {}) {
        this.fabricCanvas = fabricCanvas;
        this.autoSaveKey = options.autoSaveKey || 'plant-editor-autosave';
        this.autoSaveInterval = options.autoSaveInterval || 30000; // 30s
        this._autoSaveTimer = null;
        this._onCanvasModified = null;
        this.onAutoSave = typeof options.onAutoSave === 'function' ? options.onAutoSave : null;

        // Start autosave
        if (options.enableAutoSave !== false) {
            this.startAutoSave();
        }
    }

    /**
     * Guarda el canvas como JSON
     */
    toJSON() {
        if (!this.fabricCanvas.canvas) return null;

        if (typeof this.fabricCanvas.toSerializableJSON === 'function') {
            return this.fabricCanvas.toSerializableJSON();
        }

        // Fallback for legacy wrappers
        const json = this.fabricCanvas.canvas.toJSON([
            'layerId', 'assetId', 'zoneType', 'customData', 'data',
            'arrowId', 'objectType', 'flowData', 'connectedArrows',
            'fromObjectId', 'toObjectId', 'excludeFromExport',
        ]);
        if (Array.isArray(json.objects)) {
            json.objects = json.objects.filter((obj) => !obj.excludeFromExport
                && obj.objectType !== 'heatmapOverlay'
                && obj.objectType !== 'signalOverlayBadge');
        }
        return json;
    }

    /**
     * Carga JSON en el canvas
     */
    async loadFromJSON(json) {
        if (!this.fabricCanvas.canvas) return;

        return new Promise((resolve) => {
            this.fabricCanvas.canvas.loadFromJSON(json, () => {
                this.fabricCanvas.canvas.renderAll();
                resolve();
            });
        });
    }

    /**
     * Descarga el canvas como archivo JSON
     */
    downloadJSON(filename = 'plant-layout.json') {
        const json = this.toJSON();
        if (!json) return;

        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, filename);
    }

    /**
     * Exporta el canvas como imagen PNG
     */
    downloadPNG(filename = 'plant-layout.png') {
        if (!this.fabricCanvas.canvas) return;

        const dataURL = this.fabricCanvas.canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 2 // 2x resolution
        });

        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;
        link.click();
    }

    /**
     * Exporta el canvas como SVG
     */
    downloadSVG(filename = 'plant-layout.svg') {
        if (!this.fabricCanvas.canvas) return;

        const svg = this.fabricCanvas.canvas.toSVG();
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        this.downloadBlob(blob, filename);
    }

    /**
     * Helper para descargar un Blob
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Guarda en localStorage
     */
    saveToLocalStorage() {
        const json = this.toJSON();
        if (!json) return false;

        try {
            localStorage.setItem(this.autoSaveKey, JSON.stringify(json));
            return true;
        } catch (e) {
            console.warn('[FileManager] LocalStorage save failed:', e);
            return false;
        }
    }

    /**
     * Carga desde localStorage
     */
    async loadFromLocalStorage() {
        try {
            const data = localStorage.getItem(this.autoSaveKey);
            if (data) {
                const json = JSON.parse(data);
                await this.loadFromJSON(json);
                return true;
            }
        } catch (e) {
            console.warn('[FileManager] LocalStorage load failed:', e);
        }
        return false;
    }

    /**
     * Verifica si hay datos guardados en localStorage
     */
    hasLocalStorageData() {
        return !!localStorage.getItem(this.autoSaveKey);
    }

    /**
     * Limpia datos de localStorage
     */
    clearLocalStorage() {
        localStorage.removeItem(this.autoSaveKey);
    }

    /**
     * Inicia autosave con intervalo
     */
    startAutoSave() {
        if (this._autoSaveTimer) return;

        this._autoSaveTimer = setInterval(() => {
            if (this.saveToLocalStorage()) {
                console.log('[FileManager] Autosaved');
                if (this.onAutoSave) this.onAutoSave({ source: 'interval', at: new Date() });
            }
        }, this.autoSaveInterval);

        // También guardar en cada modificación importante
        if (this.fabricCanvas.canvas && !this._onCanvasModified) {
            this._onCanvasModified = () => {
                if (!this.saveToLocalStorage()) return;
                if (this.onAutoSave) this.onAutoSave({ source: 'event', at: new Date() });
            };
            this.fabricCanvas.canvas.on('object:modified', this._onCanvasModified);
            this.fabricCanvas.canvas.on('object:added', this._onCanvasModified);
            this.fabricCanvas.canvas.on('object:removed', this._onCanvasModified);
        }
    }

    /**
     * Detiene autosave
     */
    stopAutoSave() {
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
        if (this.fabricCanvas?.canvas && this._onCanvasModified) {
            this.fabricCanvas.canvas.off('object:modified', this._onCanvasModified);
            this.fabricCanvas.canvas.off('object:added', this._onCanvasModified);
            this.fabricCanvas.canvas.off('object:removed', this._onCanvasModified);
        }
        this._onCanvasModified = null;
    }
}

