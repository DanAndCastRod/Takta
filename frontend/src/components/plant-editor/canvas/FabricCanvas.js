import * as fabric from 'fabric';

export class FabricCanvas {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.canvas = null;
        this.options = {
            width: 800,
            height: 600,
            backgroundColor: '#f3f4f6', // gray-100
            selection: true,
            preserveObjectStacking: true, // Capas mantienen orden visual al seleccionar
            ...options
        };
    }

    isEphemeralObject(target) {
        if (!target) return false;
        if (target.excludeFromExport) return true;
        return target.objectType === 'heatmapOverlay'
            || target.objectType === 'signalOverlayBadge';
    }

    toSerializableJSON(extraProps = []) {
        if (!this.canvas) return {};
        const json = this.canvas.toJSON([
            'layerId', 'assetId', 'zoneType', 'arrowId', 'objectType', 'flowData', 'data',
            'customData', 'connectedArrows', 'fromObjectId', 'toObjectId',
            ...extraProps,
        ]);
        if (Array.isArray(json.objects)) {
            json.objects = json.objects.filter((obj) => !obj.excludeFromExport
                && obj.objectType !== 'heatmapOverlay'
                && obj.objectType !== 'signalOverlayBadge');
        }
        return json;
    }

    notifyHistoryChanged() {
        if (typeof this.options.onHistoryChanged === 'function') {
            this.options.onHistoryChanged({
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
            });
        }
    }

    init() {
        if (this.canvas) return;

        // Crear elemento canvas si no existe dentro del contenedor
        const container = document.getElementById(this.containerId);
        if (!container) throw new Error(`Container #${this.containerId} not found`);

        const canvasEl = document.createElement('canvas');
        canvasEl.id = `${this.containerId}-el`;
        container.appendChild(canvasEl);

        // Inicializar Fabric
        // Nota: En Fabric v6+ la inicialización puede variar ligeramente, asumimos API estándar v5/v6 compat.
        this.canvas = new fabric.Canvas(canvasEl.id, {
            width: this.options.width,
            height: this.options.height,
            backgroundColor: this.options.backgroundColor
        });

        // Configurar Pan & Zoom
        this.setupInteractions();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Responsive resize
        this.resizeObserver = new ResizeObserver(() => this.fitToContainer());
        this.resizeObserver.observe(container);

        console.log('[FabricCanvas] Initialized');
    }

    setupKeyboardShortcuts() {
        // Clipboard for copy/paste
        this._clipboard = null;
        // History for undo/redo
        this._history = [];
        this._historyIndex = -1;
        this._maxHistory = 50;
        this._isRestoringState = false;

        this._boundKeydown = (e) => {
            // Don't intercept if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const activeObj = this.canvas.getActiveObject();

            // Delete or Backspace to remove selected object
            if ((e.key === 'Delete' || e.key === 'Backspace') && activeObj) {
                this.removeActiveObject();
                e.preventDefault();
                return;
            }

            // Escape to deselect
            if (e.key === 'Escape') {
                this.canvas.discardActiveObject();
                this.canvas.requestRenderAll();
                return;
            }

            // Ctrl+C - Copy
            if (e.ctrlKey && e.key === 'c' && activeObj) {
                activeObj.clone().then(cloned => {
                    this._clipboard = cloned;
                });
                e.preventDefault();
                return;
            }

            // Ctrl+V - Paste
            if (e.ctrlKey && e.key === 'v' && this._clipboard) {
                this._clipboard.clone().then(cloned => {
                    cloned.set({
                        left: cloned.left + 20,
                        top: cloned.top + 20,
                        evented: true
                    });
                    // Copy custom props
                    if (this._clipboard.layerId) cloned.layerId = this._clipboard.layerId;
                    if (this._clipboard.assetId) cloned.assetId = this._clipboard.assetId;
                    if (this._clipboard.zoneType) cloned.zoneType = this._clipboard.zoneType;

                    this.canvas.add(cloned);
                    this.canvas.setActiveObject(cloned);
                    this.canvas.requestRenderAll();
                });
                e.preventDefault();
                return;
            }

            // Ctrl+Z - Undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                this.undo();
                e.preventDefault();
                return;
            }

            // Ctrl+Y or Ctrl+Shift+Z - Redo
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
                this.redo();
                e.preventDefault();
                return;
            }

            // Arrow keys - Nudge selected object
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && activeObj) {
                const step = e.shiftKey ? 10 : 1;
                switch (e.key) {
                    case 'ArrowUp':
                        activeObj.top -= step;
                        break;
                    case 'ArrowDown':
                        activeObj.top += step;
                        break;
                    case 'ArrowLeft':
                        activeObj.left -= step;
                        break;
                    case 'ArrowRight':
                        activeObj.left += step;
                        break;
                }
                activeObj.setCoords();
                this.canvas.requestRenderAll();
                e.preventDefault();
            }
        };
        document.addEventListener('keydown', this._boundKeydown);

        // Save state on object modifications for undo
        this.canvas.on('object:modified', (event) => this.saveState(event));
        this.canvas.on('object:added', (event) => this.saveState(event));
        this.canvas.on('object:removed', (event) => this.saveState(event));
        this.saveState();
    }

    saveState(event = null) {
        if (this._isRestoringState) return;
        const target = event?.target;
        if (this.isEphemeralObject(target)) return;

        // Remove states after current index if we're in the middle of history
        if (this._historyIndex < this._history.length - 1) {
            this._history = this._history.slice(0, this._historyIndex + 1);
        }

        const json = this.toSerializableJSON();
        const serialized = JSON.stringify(json);
        if (this._history[this._history.length - 1] === serialized) return;
        this._history.push(serialized);

        // Limit history size
        if (this._history.length > this._maxHistory) {
            this._history.shift();
        } else {
            this._historyIndex++;
        }
        this.notifyHistoryChanged();
    }

    undo() {
        if (this._historyIndex > 0) {
            this._historyIndex--;
            const json = JSON.parse(this._history[this._historyIndex]);
            this._isRestoringState = true;
            this.canvas.loadFromJSON(json, () => {
                this._isRestoringState = false;
                this.canvas.renderAll();
                this.notifyHistoryChanged();
            });
        }
    }

    redo() {
        if (this._historyIndex < this._history.length - 1) {
            this._historyIndex++;
            const json = JSON.parse(this._history[this._historyIndex]);
            this._isRestoringState = true;
            this.canvas.loadFromJSON(json, () => {
                this._isRestoringState = false;
                this.canvas.renderAll();
                this.notifyHistoryChanged();
            });
        }
    }

    resetView() {
        if (!this.canvas) return;
        this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        this.canvas.setZoom(1);
        this.canvas.requestRenderAll();
    }

    fitToContent(padding = 48) {
        if (!this.canvas) return;
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const exportableObjects = this.canvas.getObjects().filter((obj) => !this.isEphemeralObject(obj));
        if (!exportableObjects.length) {
            this.resetView();
            return;
        }

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        exportableObjects.forEach((obj) => {
            const rect = obj.getBoundingRect?.(true, true);
            if (!rect) return;
            minX = Math.min(minX, rect.left);
            minY = Math.min(minY, rect.top);
            maxX = Math.max(maxX, rect.left + rect.width);
            maxY = Math.max(maxY, rect.top + rect.height);
        });

        if (!Number.isFinite(minX) || !Number.isFinite(minY)
            || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
            this.resetView();
            return;
        }

        const contentWidth = Math.max(1, maxX - minX);
        const contentHeight = Math.max(1, maxY - minY);
        const safePadding = Math.max(12, Number(padding) || 48);
        const canvasWidth = Math.max(1, container.clientWidth);
        const canvasHeight = Math.max(1, container.clientHeight);

        const availableWidth = Math.max(1, canvasWidth - (safePadding * 2));
        const availableHeight = Math.max(1, canvasHeight - (safePadding * 2));
        const zoom = Math.max(0.05, Math.min(8, Math.min(availableWidth / contentWidth, availableHeight / contentHeight)));

        const offsetX = ((canvasWidth - (contentWidth * zoom)) / 2) - (minX * zoom);
        const offsetY = ((canvasHeight - (contentHeight * zoom)) / 2) - (minY * zoom);

        this.canvas.setViewportTransform([zoom, 0, 0, zoom, offsetX, offsetY]);
        this.canvas.requestRenderAll();
    }

    canUndo() {
        return this._historyIndex > 0;
    }

    canRedo() {
        return this._historyIndex >= 0 && this._historyIndex < (this._history.length - 1);
    }

    setupInteractions() {
        this.canvas.on('mouse:wheel', (opt) => {
            const delta = opt.e.deltaY;
            let zoom = this.canvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 20) zoom = 20;
            if (zoom < 0.01) zoom = 0.01;
            this.canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });

        this.canvas.on('mouse:down', (opt) => {
            const evt = opt.e;
            if (evt.altKey === true || this.isDraggingMode) {
                this.isDragging = true;
                this.selection = false;
                this.lastPosX = evt.clientX;
                this.lastPosY = evt.clientY;
            }
        });

        this.canvas.on('mouse:move', (opt) => {
            if (this.isDragging) {
                const e = opt.e;
                const vpt = this.canvas.viewportTransform;
                vpt[4] += e.clientX - this.lastPosX;
                vpt[5] += e.clientY - this.lastPosY;
                this.canvas.requestRenderAll();
                this.lastPosX = e.clientX;
                this.lastPosY = e.clientY;
            }
        });

        this.canvas.on('mouse:up', () => {
            // on mouse up we want to recalculate new interaction
            // for all objects, so we call setViewportTransform
            if (this.isDragging) {
                this.canvas.setViewportTransform(this.canvas.viewportTransform);
                this.isDragging = false;
                this.selection = true;
            }
        });
    }

    setPanMode(enabled) {
        this.isDraggingMode = enabled;
        this.canvas.selection = !enabled;
        this.canvas.defaultCursor = enabled ? 'grab' : 'default';
        this.canvas.hoverCursor = enabled ? 'grab' : 'move';
        this.canvas.forEachObject(o => {
            o.selectable = !enabled;
            o.evented = !enabled;
        });
        this.canvas.requestRenderAll();
    }

    fitToContainer() {
        if (!this.canvas) return;
        const container = document.getElementById(this.containerId);
        if (container) {
            this.canvas.setDimensions({
                width: container.clientWidth,
                height: container.clientHeight
            });
            this.canvas.renderAll();
        }
    }

    loadFromJSON(json) {
        if (!this.canvas) return Promise.resolve();
        return new Promise((resolve) => {
            this.canvas.loadFromJSON(json, () => {
                this.canvas.renderAll();
                console.log('[FabricCanvas] JSON Loaded');
                resolve();
            });
        });
    }

    /**
     * Carga un string SVG en el canvas
     * @param {string} svgString 
     */
    async loadSVGString(svgString) {
        if (!this.canvas) return;

        try {
            const result = await fabric.loadSVGFromString(svgString);
            const objects = result.objects;
            const options = result.options;

            const obj = fabric.util.groupSVGElements(objects, options);
            this.canvas.add(obj);
            this.canvas.renderAll();
        } catch (error) {
            console.error('Error loading SVG:', error);
        }
    }

    /**
     * Agrega una imagen de fondo
     * @param {string} url - URL o dataURL de la imagen
     * @param {Object} options - Opciones de posicionamiento
     */
    async addBackgroundImage(url, options = {}) {
        if (!this.canvas) return;

        try {
            const img = await fabric.Image.fromURL(url, { crossOrigin: 'anonymous' });

            if (!img) {
                console.error('Error loading background image');
                return;
            }

            // Configurar imagen como fondo o como objeto bloqueado en capa inferior
            img.set({
                left: options.left || 0,
                top: options.top || 0,
                scaleX: options.scaleX || 1,
                scaleY: options.scaleY || 1,
                selectable: false,
                evented: false,
                ...options
            });

            // O añadirlo como objeto al fondo (más flexible para capas)
            this.canvas.add(img);

            // Fabric v6+: sendObjectToBack
            if (typeof this.canvas.sendObjectToBack === 'function') {
                this.canvas.sendObjectToBack(img);
            } else if (typeof this.canvas.sendToBack === 'function') {
                this.canvas.sendToBack(img);
            } else {
                // Fallback manual manipulation of _objects
                this.canvas.moveObjectTo(img, 0);
            }

            this.canvas.renderAll();
            return img;
        } catch (error) {
            console.error('Error loading background image:', error);
        }
    }

    /**
     * Agrega un objeto individual al canvas
     * @param {Object} objData - Definición del objeto (tipo, coordenadas, etc)
     */
    async addObject(objData) {
        if (!this.canvas) return;

        let fabricObj;

        switch (objData.type) {
            case 'rect':
                fabricObj = new fabric.Rect({
                    left: objData.left,
                    top: objData.top,
                    width: objData.width,
                    height: objData.height,
                    fill: objData.fill,
                    stroke: objData.stroke,
                    strokeWidth: objData.strokeWidth,
                    layerId: objData.layerId,
                    assetId: objData.assetId,
                    zoneType: objData.zoneType,
                    data: objData.data
                });
                break;

            case 'ellipse':
                fabricObj = new fabric.Ellipse({
                    left: objData.left,
                    top: objData.top,
                    rx: objData.rx,
                    ry: objData.ry,
                    fill: objData.fill,
                    stroke: objData.stroke,
                    strokeWidth: objData.strokeWidth,
                    layerId: objData.layerId,
                    assetId: objData.assetId,
                    zoneType: objData.zoneType,
                    data: objData.data
                });
                break;

            case 'image':
                return this.addImageObject(objData);
        }

        if (fabricObj) {
            this.canvas.add(fabricObj);
            this.canvas.renderAll();
            return fabricObj;
        }
        return null;
    }

    /**
     * Helper para agregar objeto tipo imagen
     */
    async addImageObject(objData) {
        try {
            const img = await fabric.Image.fromURL(objData.src);
            if (!img) return;

            img.set({
                left: objData.left,
                top: objData.top,
                scaleX: (objData.width || img.width) / img.width,
                scaleY: (objData.height || img.height) / img.height,
                layerId: objData.layerId,
                assetId: objData.assetId,
                zoneType: objData.zoneType,
                data: objData.data
            });

            this.canvas.add(img);
            this.canvas.renderAll();
            return img;
        } catch (error) {
            console.error('Error adding image object:', error);
        }
    }

    toJSON() {
        if (!this.canvas) return {};
        return this.toSerializableJSON();
    }

    clear() {
        if (!this.canvas) return;
        this.canvas.clear();
        this.canvas.backgroundColor = this.options.backgroundColor;
        this.canvas.renderAll();
        this.saveState();
    }

    getActiveObject() {
        return this.canvas ? this.canvas.getActiveObject() : null;
    }

    removeActiveObject() {
        if (!this.canvas) return;
        const active = this.canvas.getActiveObject();
        if (active) {
            this.canvas.remove(active);
            this.canvas.renderAll();
        }
    }

    destroy() {
        if (this._boundKeydown) {
            document.removeEventListener('keydown', this._boundKeydown);
            this._boundKeydown = null;
        }
        if (this.canvas) {
            this.canvas.dispose();
            this.canvas = null;
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

