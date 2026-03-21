import { plantLayoutService } from '../../../services/plant-layout.service.js';

const DEFAULT_SCHEMAS = {
    rect: {
        title: 'Zona',
        fields: [
            { key: 'assetId', label: 'Activo', type: 'asset_ref', required: false },
            { key: 'zoneType', label: 'Tipo de zona', type: 'enum', options: ['production', 'storage', 'office', 'transit'], default: 'production' },
            { key: 'capacity', label: 'Capacidad u/h', type: 'number', min: 0, default: 60 },
            { key: 'wipLimit', label: 'Limite WIP', type: 'number', min: 0, default: 0 },
        ],
    },
    ellipse: {
        title: 'Estacion',
        fields: [
            { key: 'assetId', label: 'Activo', type: 'asset_ref', required: false },
            { key: 'cycleTimeSec', label: 'Tiempo ciclo (s)', type: 'number', min: 1, default: 60 },
            { key: 'capacity', label: 'Capacidad u/h', type: 'number', min: 0, default: 50 },
        ],
    },
    arrowLine: {
        title: 'Conector',
        fields: [
            { key: 'type', label: 'Tipo de flujo', type: 'enum', options: ['material', 'information', 'personnel', 'energy'], default: 'material' },
            { key: 'capacity', label: 'Capacidad', type: 'text', default: '100 u/h' },
            { key: 'variability', label: 'Variabilidad %', type: 'number', min: 0, max: 200, default: 10 },
            { key: 'share', label: 'Participacion', type: 'number', min: 0, max: 1, default: 1 },
            { key: 'fromAssetId', label: 'Activo origen', type: 'asset_ref', required: false },
            { key: 'toAssetId', label: 'Activo destino', type: 'asset_ref', required: false },
        ],
    },
};

function esc(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export class PropertiesPanel {
    constructor(fabricCanvas, containerId = 'pe-properties-content', options = {}) {
        this.fabricCanvas = fabricCanvas;
        this.containerId = containerId;
        this.selectedObject = null;
        this.assetsList = [];
        this.schemaByType = {};
        this.getSchemas = typeof options.getSchemas === 'function' ? options.getSchemas : null;
        this.onObjectChanged = typeof options.onObjectChanged === 'function' ? options.onObjectChanged : null;
        this.canvasListeners = [];

        this.loadAssets();
        this.setupListeners();
    }

    setSchemas(schemaByType = {}) {
        this.schemaByType = schemaByType && typeof schemaByType === 'object' ? schemaByType : {};
        if (this.selectedObject) {
            this.render();
        }
    }

    async loadAssets() {
        try {
            this.assetsList = await plantLayoutService.getAssetsList();
        } catch (error) {
            console.warn('Could not load assets list', error);
            this.assetsList = [];
        }
    }

    setupListeners() {
        const canvas = this.fabricCanvas.canvas;
        if (!canvas) return;

        const onCreated = (event) => this.onSelect(event.selected?.[0] || null);
        const onUpdated = (event) => this.onSelect(event.selected?.[0] || null);
        const onCleared = () => this.onDeselect();
        const onModified = () => {
            if (this.selectedObject) this.render();
        };

        this.canvasListeners = [
            ['selection:created', onCreated],
            ['selection:updated', onUpdated],
            ['selection:cleared', onCleared],
            ['object:modified', onModified],
        ];
        this.canvasListeners.forEach(([eventName, handler]) => canvas.on(eventName, handler));
    }

    onSelect(obj) {
        this.selectedObject = obj || null;
        this.render();
    }

    onDeselect() {
        this.selectedObject = null;
        this.renderEmpty();
    }

    getElementType(obj) {
        if (!obj) return 'unknown';
        if (obj.objectType === 'arrowLine' || obj.arrowId) return 'arrowLine';
        if (obj.objectType === 'markerNode') return 'marker';
        if (obj.type === 'ellipse' || obj.type === 'circle') return 'ellipse';
        if (obj.type === 'rect') return 'rect';
        if (obj.type === 'textbox' || obj.type === 'text') return 'textbox';
        if (obj.type === 'polygon') return 'polygon';
        return obj.type || 'unknown';
    }

    getSchemaForElementType(elementType) {
        const runtimeSchemas = this.getSchemas ? (this.getSchemas() || {}) : this.schemaByType;
        return runtimeSchemas?.[elementType] || this.schemaByType?.[elementType] || DEFAULT_SCHEMAS[elementType] || null;
    }

    getObjectPayload(obj, elementType) {
        if (!obj) return {};
        if (elementType === 'arrowLine') {
            if (!obj.flowData || typeof obj.flowData !== 'object') obj.flowData = {};
            return obj.flowData;
        }
        if (!obj.data || typeof obj.data !== 'object') obj.data = {};
        return obj.data;
    }

    getSchemaFieldValue(obj, elementType, field) {
        const payload = this.getObjectPayload(obj, elementType);
        const direct = payload[field.key];
        if (direct !== undefined && direct !== null) return direct;
        if (field.key === 'assetId' && obj.assetId) return obj.assetId;
        if (field.key === 'zoneType' && obj.zoneType) return obj.zoneType;
        if (field.default !== undefined) return field.default;
        return '';
    }

    snapshotObject(obj) {
        return {
            left: obj.left,
            top: obj.top,
            fill: obj.fill,
            stroke: obj.stroke,
            assetId: obj.assetId,
            zoneType: obj.zoneType,
            data: obj.data ? { ...obj.data } : {},
            flowData: obj.flowData ? { ...obj.flowData } : {},
        };
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        if (!this.selectedObject) {
            this.renderEmpty();
            return;
        }

        const obj = this.selectedObject;
        const elementType = this.getElementType(obj);
        const schema = this.getSchemaForElementType(elementType);

        container.innerHTML = `
            <div class="space-y-3">
                <div class="text-xs uppercase text-slate-400 font-semibold mb-2">Posicion</div>
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

                <div class="text-xs uppercase text-slate-400 font-semibold mt-4 mb-2">Estilo</div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs text-slate-500">Relleno</label>
                        <input type="color" id="prop-fill" value="${this.normalizeColor(obj.fill) || '#6366f1'}"
                            class="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                    </div>
                    <div>
                        <label class="text-xs text-slate-500">Borde</label>
                        <input type="color" id="prop-stroke" value="${this.normalizeColor(obj.stroke) || '#4338ca'}"
                            class="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                    </div>
                </div>

                ${schema ? this.renderSchemaSection(schema, obj, elementType) : this.renderFallbackSection(obj, elementType)}
            </div>
        `;
        this.attachEventListeners(obj, elementType, schema);
    }

    renderSchemaSection(schema, obj, elementType) {
        const fields = Array.isArray(schema?.fields) ? schema.fields : [];
        const controls = fields.map((field) => this.renderSchemaField(field, obj, elementType)).join('');
        return `
            <div class="text-xs uppercase text-slate-400 font-semibold mt-4 mb-2">${esc(schema.title || 'Propiedades')}</div>
            <div class="space-y-2.5">${controls || '<p class="text-xs text-slate-500">Sin campos configurados.</p>'}</div>
        `;
    }

    renderFallbackSection(obj, elementType) {
        const isArrow = elementType === 'arrowLine';
        if (isArrow) {
            const flow = obj.flowData || {};
            return `
                <div class="text-xs uppercase text-slate-400 font-semibold mt-4 mb-2">Conector</div>
                <div class="space-y-2.5">
                    <label class="block">
                        <span class="text-xs text-slate-500">Tipo de flujo</span>
                        <input data-schema-key="type" data-schema-type="text" value="${esc(flow.type || 'material')}"
                            class="mt-1 w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-violet-500 focus:outline-none">
                    </label>
                    <label class="block">
                        <span class="text-xs text-slate-500">Capacidad</span>
                        <input data-schema-key="capacity" data-schema-type="text" value="${esc(flow.capacity || '')}"
                            class="mt-1 w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-violet-500 focus:outline-none">
                    </label>
                </div>
            `;
        }

        const payload = obj.data || {};
        return `
            <div class="text-xs uppercase text-slate-400 font-semibold mt-4 mb-2">Identificacion</div>
            <div class="space-y-2.5">
                <label class="block">
                    <span class="text-xs text-slate-500">Activo</span>
                    <input data-schema-key="assetId" data-schema-type="text" value="${esc(payload.assetId || obj.assetId || '')}"
                        class="mt-1 w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                </label>
                <label class="block">
                    <span class="text-xs text-slate-500">Tipo de zona</span>
                    <input data-schema-key="zoneType" data-schema-type="text" value="${esc(payload.zoneType || obj.zoneType || '')}"
                        class="mt-1 w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                </label>
            </div>
        `;
    }

    renderSchemaField(field, obj, elementType) {
        const fieldType = String(field.type || 'text');
        const value = this.getSchemaFieldValue(obj, elementType, field);
        const base = `data-schema-key="${esc(field.key)}" data-schema-type="${esc(fieldType)}"`;
        const required = field.required ? 'required' : '';
        const min = field.min !== undefined ? `min="${esc(field.min)}"` : '';
        const max = field.max !== undefined ? `max="${esc(field.max)}"` : '';
        const step = field.step !== undefined ? `step="${esc(field.step)}"` : '';
        const label = esc(field.label || field.key);

        if (fieldType === 'enum') {
            const options = Array.isArray(field.options) ? field.options : [];
            return `
                <label class="block">
                    <span class="text-xs text-slate-500">${label}</span>
                    <select ${base}
                        class="mt-1 w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white">
                        ${options.map((option) => `<option value="${esc(option)}" ${String(value) === String(option) ? 'selected' : ''}>${esc(option)}</option>`).join('')}
                    </select>
                </label>
            `;
        }

        if (fieldType === 'asset_ref') {
            const currentAssetId = String(value || '');
            return `
                <label class="block">
                    <span class="text-xs text-slate-500">${label}</span>
                    <select ${base}
                        class="mt-1 w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white">
                        <option value="">-- Sin asignar --</option>
                        ${this.assetsList.map((asset) => `<option value="${esc(asset.id)}" ${String(asset.id) === currentAssetId ? 'selected' : ''}>${esc(asset.name)}</option>`).join('')}
                    </select>
                </label>
            `;
        }

        if (fieldType === 'number') {
            const numericValue = value === '' || value == null ? '' : Number(value);
            const safeValue = Number.isFinite(numericValue) ? numericValue : '';
            return `
                <label class="block">
                    <span class="text-xs text-slate-500">${label}</span>
                    <input type="number" ${base} ${required} ${min} ${max} ${step}
                        value="${esc(safeValue)}"
                        class="mt-1 w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                </label>
            `;
        }

        return `
            <label class="block">
                <span class="text-xs text-slate-500">${label}</span>
                <input type="text" ${base} ${required}
                    value="${esc(value)}"
                    class="mt-1 w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none">
            </label>
        `;
    }

    attachEventListeners(obj, elementType, schema) {
        const canvas = this.fabricCanvas.canvas;
        if (!canvas) return;

        document.getElementById('prop-left')?.addEventListener('change', (event) => {
            const before = this.snapshotObject(obj);
            obj.set('left', Number(event.target.value) || 0);
            obj.setCoords();
            canvas.requestRenderAll();
            this.notifyChange(obj, before, 'position');
        });

        document.getElementById('prop-top')?.addEventListener('change', (event) => {
            const before = this.snapshotObject(obj);
            obj.set('top', Number(event.target.value) || 0);
            obj.setCoords();
            canvas.requestRenderAll();
            this.notifyChange(obj, before, 'position');
        });

        document.getElementById('prop-fill')?.addEventListener('input', (event) => {
            const before = this.snapshotObject(obj);
            obj.set('fill', event.target.value);
            canvas.requestRenderAll();
            this.notifyChange(obj, before, 'style');
        });

        document.getElementById('prop-stroke')?.addEventListener('input', (event) => {
            const before = this.snapshotObject(obj);
            obj.set('stroke', event.target.value);
            if (elementType === 'arrowLine' && obj.arrowId) {
                canvas.getObjects().forEach((shape) => {
                    if (shape.arrowId !== obj.arrowId) return;
                    if (shape.objectType === 'arrowHead') {
                        shape.set('fill', event.target.value);
                    }
                    if (shape.objectType === 'arrowLine') {
                        shape.set('stroke', event.target.value);
                    }
                });
            }
            canvas.requestRenderAll();
            this.notifyChange(obj, before, 'style');
        });

        const schemaFields = Array.isArray(schema?.fields) ? schema.fields : [];
        const fieldByKey = Object.fromEntries(schemaFields.map((field) => [String(field.key), field]));
        this.getFieldNodes().forEach((node) => {
            const key = String(node.dataset.schemaKey || '');
            if (!key) return;
            const field = fieldByKey[key] || { key, type: String(node.dataset.schemaType || 'text') };
            const eventType = node.tagName === 'SELECT' ? 'change' : 'input';
            node.addEventListener(eventType, () => {
                const before = this.snapshotObject(obj);
                this.applyFieldValue(obj, elementType, field, node.value);
                canvas.requestRenderAll();
                this.notifyChange(obj, before, 'property');
            });
            if (node.tagName !== 'SELECT') {
                node.addEventListener('change', () => {
                    const before = this.snapshotObject(obj);
                    this.applyFieldValue(obj, elementType, field, node.value);
                    canvas.requestRenderAll();
                    this.notifyChange(obj, before, 'property');
                });
            }
        });
    }

    getFieldNodes() {
        const container = document.getElementById(this.containerId);
        if (!container) return [];
        return Array.from(container.querySelectorAll('[data-schema-key]'));
    }

    applyFieldValue(obj, elementType, field, rawValue) {
        const payload = this.getObjectPayload(obj, elementType);
        let nextValue = rawValue;
        const fieldType = String(field.type || 'text');

        if (fieldType === 'number') {
            if (rawValue === '' || rawValue == null) {
                nextValue = null;
            } else {
                const parsed = Number(rawValue);
                if (!Number.isFinite(parsed)) {
                    return;
                }
                nextValue = parsed;
                if (field.min != null) nextValue = Math.max(Number(field.min), nextValue);
                if (field.max != null) nextValue = Math.min(Number(field.max), nextValue);
            }
        }

        payload[field.key] = nextValue;
        if (elementType === 'arrowLine') {
            obj.flowData = payload;
        } else {
            obj.data = payload;
            if (field.key === 'assetId') obj.assetId = nextValue || null;
            if (field.key === 'zoneType') obj.zoneType = nextValue || null;
        }
    }

    notifyChange(obj, before, changeType) {
        if (!this.onObjectChanged) return;
        const after = this.snapshotObject(obj);
        this.onObjectChanged({
            object: obj,
            objectId: obj.id || obj.arrowId || null,
            changeType,
            before,
            after,
        });
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

    normalizeColor(value) {
        if (!value) return '';
        if (typeof value !== 'string') return '';
        if (value.startsWith('#')) return value;
        if (value.startsWith('rgba')) {
            const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
            if (!match) return '';
            const r = Number(match[1]).toString(16).padStart(2, '0');
            const g = Number(match[2]).toString(16).padStart(2, '0');
            const b = Number(match[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }
        return '';
    }

    destroy() {
        const canvas = this.fabricCanvas?.canvas;
        if (canvas && Array.isArray(this.canvasListeners)) {
            this.canvasListeners.forEach(([eventName, handler]) => {
                canvas.off(eventName, handler);
            });
        }
        this.canvasListeners = [];
        this.selectedObject = null;
    }
}
