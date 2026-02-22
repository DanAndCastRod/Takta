import { plantLayoutService } from '../../../services/plant-layout.service.js';

export class PropertiesPanel {
    constructor(fabricCanvas, containerId = 'pe-properties-content') {
        this.fabricCanvas = fabricCanvas;
        this.containerId = containerId;
        this.selectedObject = null;
        this.assetsList = [];

        this.loadAssets();
        this.setupListeners();
    }

    async loadAssets() {
        try {
            this.assetsList = await plantLayoutService.getAssetsList();
        } catch (e) {
            console.warn('Could not load assets list', e);
        }
    }

    setupListeners() {
        // ... same listeners ...
        const canvas = this.fabricCanvas.canvas;

        canvas.on('selection:created', (e) => this.onSelect(e.selected[0]));
        canvas.on('selection:updated', (e) => this.onSelect(e.selected[0]));
        canvas.on('selection:cleared', () => this.onDeselect());
        canvas.on('object:modified', () => {
            if (this.selectedObject) this.render();
        });
    }

    // ... onSelect, onDeselect, render ...
    onSelect(obj) {
        this.selectedObject = obj;
        this.render();
    }

    onDeselect() {
        this.selectedObject = null;
        this.renderEmpty();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container || !this.selectedObject) return;

        const obj = this.selectedObject;
        const isArrow = obj.objectType === 'arrowLine' || obj.arrowId;

        let html = '';

        if (isArrow) {
            html = this.renderArrowProperties(obj);
        } else {
            html = this.renderObjectProperties(obj);
        }

        container.innerHTML = html;
        this.attachEventListeners();
    }

    renderObjectProperties(obj) {
        // Generate options for assets
        const currentAssetId = obj.data?.assetId || obj.assetId; // Fallback for legacy
        const assetOptions = this.assetsList.map(asset =>
            `<option value="${asset.id}" ${currentAssetId === asset.id ? 'selected' : ''}>${asset.name}</option>`
        ).join('');

        return `
            <div class="space-y-3">
                <div class="text-xs uppercase text-slate-400 font-semibold mb-2">Posición</div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs text-slate-500">X</label>
                        <input type="number" id="prop-left" value="${Math.round(obj.left || 0)}" 
                            class="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                        <label class="text-xs text-slate-500">Y</label>
                        <input type="number" id="prop-top" value="${Math.round(obj.top || 0)}" 
                            class="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                </div>
                
                <div class="text-xs uppercase text-slate-400 font-semibold mt-4 mb-2">Identificación</div>
                <div>
                    <label class="text-xs text-slate-500">Asset (Máquina)</label>
                    <div class="relative">
                        <select id="prop-assetId" class="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white">
                            <option value="">-- Sin Asignar --</option>
                            ${assetOptions}
                        </select>
                        ${this.assetsList.length === 0 ? '<div class="text-[10px] text-amber-500 mt-1">No se cargaron assets del backend</div>' : ''}
                    </div>
                    <!-- Fallback manual input if needed, hidden or secondary? -->
                </div>
                <div>
                    <label class="text-xs text-slate-500">Tipo de Zona</label>
                    <select id="prop-zoneType" class="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                        <option value="" ${!obj.zoneType ? 'selected' : ''}>Sin asignar</option>
                        <option value="production" ${obj.zoneType === 'production' ? 'selected' : ''}>Producción</option>
                        <option value="storage" ${obj.zoneType === 'storage' ? 'selected' : ''}>Almacenamiento</option>
                        <option value="office" ${obj.zoneType === 'office' ? 'selected' : ''}>Oficina</option>
                        <option value="transit" ${obj.zoneType === 'transit' ? 'selected' : ''}>Tránsito</option>
                    </select>
                </div>
                
                <div class="text-xs uppercase text-slate-400 font-semibold mt-4 mb-2">Estilo</div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs text-slate-500">Relleno</label>
                        <input type="color" id="prop-fill" value="${this.rgbaToHex(obj.fill) || '#6366f1'}" 
                            class="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                    </div>
                    <div>
                        <label class="text-xs text-slate-500">Borde</label>
                        <input type="color" id="prop-stroke" value="${obj.stroke || '#4338ca'}" 
                            class="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                    </div>
                </div>
            </div>
        `;
    }

    // ... renderArrowProperties, renderEmpty, attachEventListeners ...

    renderArrowProperties(obj) {
        // Buscar datos de la flecha (puede estar en el grupo o en objetos relacionados)
        const flowData = obj.flowData || {};

        return `
            <div class="space-y-3">
                <div class="text-xs uppercase text-slate-400 font-semibold mb-2">Conexión</div>
                <div class="flex items-center gap-2 mb-3">
                    <span class="w-2 h-2 bg-violet-500 rounded-full"></span>
                    <span class="text-sm text-slate-600">Arrow ID: ${obj.arrowId || 'N/A'}</span>
                </div>
                
                <div>
                    <label class="text-xs text-slate-500">Tipo de Flujo</label>
                    <select id="prop-flowType" class="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-violet-500 focus:outline-none">
                        <option value="material" ${flowData.type === 'material' ? 'selected' : ''}>Material</option>
                        <option value="information" ${flowData.type === 'information' ? 'selected' : ''}>Información</option>
                        <option value="personnel" ${flowData.type === 'personnel' ? 'selected' : ''}>Personal</option>
                        <option value="energy" ${flowData.type === 'energy' ? 'selected' : ''}>Energía</option>
                    </select>
                </div>
                
                <div>
                    <label class="text-xs text-slate-500">Etiqueta</label>
                    <input type="text" id="prop-flowLabel" value="${flowData.label || ''}" placeholder="ej: Insumos"
                        class="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-violet-500 focus:outline-none" />
                </div>
                
                <div>
                    <label class="text-xs text-slate-500">Capacidad</label>
                    <input type="text" id="prop-flowCapacity" value="${flowData.capacity || ''}" placeholder="ej: 100 u/hr"
                        class="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-violet-500 focus:outline-none" />
                </div>
                
                <div class="text-xs uppercase text-slate-400 font-semibold mt-4 mb-2">Estilo</div>
                <div>
                    <label class="text-xs text-slate-500">Color</label>
                    <input type="color" id="prop-arrowColor" value="${obj.stroke || '#8b5cf6'}" 
                        class="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                </div>
            </div>
        `;
    }

    renderEmpty() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="text-xs text-slate-400 text-center mt-8">
                Selecciona un objeto
            </div>
        `;
    }

    attachEventListeners() {
        const obj = this.selectedObject;
        if (!obj) return;

        const isArrow = obj.objectType === 'arrowLine' || obj.arrowId;

        if (isArrow) {
            this.attachArrowListeners(obj);
        } else {
            this.attachObjectListeners(obj);
        }
    }

    attachObjectListeners(obj) {
        // Position
        document.getElementById('prop-left')?.addEventListener('change', (e) => {
            obj.set('left', parseFloat(e.target.value));
            this.fabricCanvas.canvas.renderAll();
        });
        document.getElementById('prop-top')?.addEventListener('change', (e) => {
            obj.set('top', parseFloat(e.target.value));
            this.fabricCanvas.canvas.renderAll();
        });

        // Metadata
        document.getElementById('prop-assetId')?.addEventListener('change', (e) => {
            if (!obj.data) obj.data = {};
            obj.data.assetId = e.target.value;
            // Also set top-level for backwards compat if needed, but 'data' is better for serialization if configured
            obj.assetId = e.target.value;
        });
        document.getElementById('prop-zoneType')?.addEventListener('change', (e) => {
            obj.zoneType = e.target.value;
        });

        // Style
        document.getElementById('prop-fill')?.addEventListener('input', (e) => {
            obj.set('fill', e.target.value);
            this.fabricCanvas.canvas.renderAll();
        });
        document.getElementById('prop-stroke')?.addEventListener('input', (e) => {
            obj.set('stroke', e.target.value);
            this.fabricCanvas.canvas.renderAll();
        });
    }

    // ... attachArrowListeners, rgbaToHex ...
    attachArrowListeners(obj) {
        // Initialize flowData if not exists
        if (!obj.flowData) obj.flowData = {};

        document.getElementById('prop-flowType')?.addEventListener('change', (e) => {
            obj.flowData.type = e.target.value;
        });
        document.getElementById('prop-flowLabel')?.addEventListener('change', (e) => {
            obj.flowData.label = e.target.value;
        });
        document.getElementById('prop-flowCapacity')?.addEventListener('change', (e) => {
            obj.flowData.capacity = e.target.value;
        });
        document.getElementById('prop-arrowColor')?.addEventListener('input', (e) => {
            obj.set('stroke', e.target.value);
            // También actualizar la cabeza si existe
            if (obj.arrowId) {
                this.fabricCanvas.canvas.getObjects().forEach(o => {
                    if (o.arrowId === obj.arrowId) {
                        o.set(o.objectType === 'arrowHead' ? 'fill' : 'stroke', e.target.value);
                    }
                });
            }
            this.fabricCanvas.canvas.renderAll();
        });
    }

    rgbaToHex(rgba) {
        if (!rgba || !rgba.startsWith('rgba')) return rgba;
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return rgba;
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
}
