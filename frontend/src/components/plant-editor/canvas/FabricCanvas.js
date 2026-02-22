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

        document.addEventListener('keydown', (e) => {
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
        });

        // Save state on object modifications for undo
        this.canvas.on('object:modified', () => this.saveState());
        this.canvas.on('object:added', () => this.saveState());
        this.canvas.on('object:removed', () => this.saveState());
    }

    saveState() {
        // Remove states after current index if we're in the middle of history
        if (this._historyIndex < this._history.length - 1) {
            this._history = this._history.slice(0, this._historyIndex + 1);
        }

        const json = this.canvas.toJSON(['layerId', 'assetId', 'zoneType', 'arrowId', 'objectType', 'flowData']);
        this._history.push(JSON.stringify(json));

        // Limit history size
        if (this._history.length > this._maxHistory) {
            this._history.shift();
        } else {
            this._historyIndex++;
        }
    }

    undo() {
        if (this._historyIndex > 0) {
            this._historyIndex--;
            const json = JSON.parse(this._history[this._historyIndex]);
            this.canvas.loadFromJSON(json, () => {
                this.canvas.renderAll();
            });
        }
    }

    redo() {
        if (this._historyIndex < this._history.length - 1) {
            this._historyIndex++;
            const json = JSON.parse(this._history[this._historyIndex]);
            this.canvas.loadFromJSON(json, () => {
                this.canvas.renderAll();
            });
        }
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
        if (!this.canvas) return;
        this.canvas.loadFromJSON(json, () => {
            this.canvas.renderAll();
            console.log('[FabricCanvas] JSON Loaded');
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
                    strokeWidth: objData.strokeWidth
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
                    strokeWidth: objData.strokeWidth
                });
                break;

            case 'image':
                return this.addImageObject(objData);
        }

        if (fabricObj) {
            this.canvas.add(fabricObj);
            this.canvas.renderAll();
        }
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
                scaleY: (objData.height || img.height) / img.height
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
        return this.canvas.toJSON();
    }

    clear() {
        if (!this.canvas) return;
        this.canvas.clear();
        this.canvas.backgroundColor = this.options.backgroundColor;
        this.canvas.renderAll();
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
        if (this.canvas) {
            this.canvas.dispose();
            this.canvas = null;
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}
