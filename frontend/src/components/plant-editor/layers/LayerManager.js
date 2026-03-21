/**
 * LayerManager
 * Manages logical layers with nesting support.
 * Each Fabric object can be linked with `layerId`.
 */

export const LAYER_TYPES = {
    BASE: 'base',
    ZONES: 'zones',
    ASSETS: 'assets',
    CONNECTIONS: 'connections',
    HEATMAP: 'heatmap',
    SIGNALS: 'signals',
    CUSTOM: 'custom',
};

function uid(prefix = 'layer') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export class LayerManager {
    constructor(fabricCanvas) {
        this.fabricCanvas = fabricCanvas;
        this.layers = [];
        this.activeLayerId = null;
        this.onChangeCallbacks = [];
        this.uiState = { expanded: {} };

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
                color: '#6366f1',
                parentId: null,
                order: 0,
                system: true,
            },
            {
                id: 'zones',
                name: 'Zonificacion',
                type: LAYER_TYPES.ZONES,
                visible: true,
                locked: false,
                color: '#10b981',
                parentId: null,
                order: 1,
                system: true,
            },
            {
                id: 'assets',
                name: 'Maquinas/Puestos',
                type: LAYER_TYPES.ASSETS,
                visible: true,
                locked: false,
                color: '#f59e0b',
                parentId: null,
                order: 2,
                system: true,
            },
            {
                id: 'connections',
                name: 'Conexiones',
                type: LAYER_TYPES.CONNECTIONS,
                visible: true,
                locked: false,
                color: '#8b5cf6',
                parentId: null,
                order: 3,
                system: true,
            },
            {
                id: 'heatmap',
                name: 'Mapa de Calor',
                type: LAYER_TYPES.HEATMAP,
                visible: true,
                locked: true,
                color: '#ef4444',
                parentId: null,
                order: 4,
                system: true,
            },
            {
                id: 'signals',
                name: 'Senales',
                type: LAYER_TYPES.SIGNALS,
                visible: true,
                locked: true,
                color: '#0ea5e9',
                parentId: null,
                order: 5,
                system: true,
            },
        ];

        this.activeLayerId = 'zones';
        this.layers.forEach((layer) => {
            this.uiState.expanded[layer.id] = true;
        });
    }

    getLayer(id) {
        return this.layers.find((layer) => layer.id === id);
    }

    getRootLayers() {
        return this._siblingsOf(null);
    }

    getLayers() {
        const output = [];
        const walk = (parentId, depth) => {
            this._siblingsOf(parentId).forEach((layer) => {
                const children = this._siblingsOf(layer.id);
                output.push({
                    ...layer,
                    depth,
                    hasChildren: children.length > 0,
                    expanded: this.isExpanded(layer.id),
                });
                if (children.length && this.isExpanded(layer.id)) {
                    walk(layer.id, depth + 1);
                }
            });
        };
        walk(null, 0);
        return output;
    }

    getLayerTree() {
        const build = (parentId) => this._siblingsOf(parentId).map((layer) => ({
            id: layer.id,
            name: layer.name,
            type: layer.type,
            visible: layer.visible,
            locked: layer.locked,
            color: layer.color,
            parentId: layer.parentId ?? null,
            order: layer.order ?? 0,
            system: Boolean(layer.system),
            children: build(layer.id),
        }));
        return { layers: build(null) };
    }

    getUiState() {
        return {
            expanded: { ...(this.uiState?.expanded || {}) },
        };
    }

    setUiState(nextState = {}) {
        const expanded = nextState.expanded && typeof nextState.expanded === 'object'
            ? nextState.expanded
            : {};
        this.uiState = { expanded: { ...expanded } };
        this.notifyChange();
    }

    isExpanded(layerId) {
        const expanded = this.uiState?.expanded || {};
        if (!Object.prototype.hasOwnProperty.call(expanded, layerId)) {
            return true;
        }
        return Boolean(expanded[layerId]);
    }

    setExpanded(layerId, expanded) {
        if (!this.getLayer(layerId)) return;
        this.uiState.expanded[layerId] = Boolean(expanded);
        this.notifyChange();
    }

    toggleExpanded(layerId) {
        this.setExpanded(layerId, !this.isExpanded(layerId));
    }

    getActiveLayer() {
        return this.getLayer(this.activeLayerId);
    }

    setActiveLayer(id) {
        const layer = this.getLayer(id);
        if (!layer || this._isLockedByHierarchy(layer)) return;
        this.activeLayerId = id;
        this.notifyChange();
    }

    addLayer(name, type = LAYER_TYPES.CUSTOM, parentId = null) {
        if (parentId && !this.getLayer(parentId)) {
            parentId = null;
        }
        const siblings = this._siblingsOf(parentId);
        const layer = {
            id: uid('layer'),
            name: String(name || 'Nueva capa').trim() || 'Nueva capa',
            type,
            visible: true,
            locked: false,
            color: '#64748b',
            parentId,
            order: siblings.length,
            system: false,
        };
        this.layers.push(layer);
        this.uiState.expanded[layer.id] = true;
        if (parentId) {
            this.uiState.expanded[parentId] = true;
        }
        this.notifyChange();
        return layer;
    }

    cloneLayer(id) {
        const source = this.getLayer(id);
        if (!source) return null;
        const clone = this.addLayer(`${source.name} copia`, LAYER_TYPES.CUSTOM, source.parentId ?? null);
        clone.color = source.color;
        clone.visible = source.visible;
        clone.locked = false;
        this._replaceLayer(clone);
        this._cloneLayerObjects(source.id, clone.id);
        this.notifyChange();
        return clone;
    }

    removeLayer(id) {
        const layer = this.getLayer(id);
        if (!layer || layer.system || layer.type !== LAYER_TYPES.CUSTOM) return false;

        const toRemove = new Set([id, ...this.getDescendantIds(id)]);
        this.layers = this.layers.filter((row) => !toRemove.has(row.id));
        Object.keys(this.uiState.expanded || {}).forEach((key) => {
            if (toRemove.has(key)) {
                delete this.uiState.expanded[key];
            }
        });

        this._removeObjectsForLayers(toRemove);
        this._normalizeOrders();

        if (toRemove.has(this.activeLayerId)) {
            this.activeLayerId = 'zones';
        }
        this.notifyChange();
        return true;
    }

    renameLayer(id, name) {
        const layer = this.getLayer(id);
        if (!layer) return false;
        const nextName = String(name || '').trim();
        if (!nextName) return false;
        layer.name = nextName;
        this._replaceLayer(layer);
        this.notifyChange();
        return true;
    }

    moveLayerUp(id) {
        const layer = this.getLayer(id);
        if (!layer || layer.system) return false;
        const siblings = this._siblingsOf(layer.parentId);
        const idx = siblings.findIndex((item) => item.id === id);
        if (idx <= 0) return false;
        this._swapOrder(siblings[idx], siblings[idx - 1]);
        this._normalizeOrders(layer.parentId);
        this.reorderCanvasObjects();
        this.notifyChange();
        return true;
    }

    moveLayerDown(id) {
        const layer = this.getLayer(id);
        if (!layer || layer.system) return false;
        const siblings = this._siblingsOf(layer.parentId);
        const idx = siblings.findIndex((item) => item.id === id);
        if (idx === -1 || idx >= siblings.length - 1) return false;
        this._swapOrder(siblings[idx], siblings[idx + 1]);
        this._normalizeOrders(layer.parentId);
        this.reorderCanvasObjects();
        this.notifyChange();
        return true;
    }

    indentLayer(id) {
        const layer = this.getLayer(id);
        if (!layer || layer.system) return false;
        const siblings = this._siblingsOf(layer.parentId);
        const idx = siblings.findIndex((item) => item.id === id);
        if (idx <= 0) return false;
        const prevSibling = siblings[idx - 1];
        if (!prevSibling) return false;
        this.moveLayer(id, prevSibling.id, this._siblingsOf(prevSibling.id).length);
        this.uiState.expanded[prevSibling.id] = true;
        return true;
    }

    outdentLayer(id) {
        const layer = this.getLayer(id);
        if (!layer || layer.system || !layer.parentId) return false;
        const parent = this.getLayer(layer.parentId);
        if (!parent) return false;
        const targetParentId = parent.parentId ?? null;
        const targetSiblings = this._siblingsOf(targetParentId);
        const parentIndex = targetSiblings.findIndex((item) => item.id === parent.id);
        const insertIndex = parentIndex < 0 ? targetSiblings.length : parentIndex + 1;
        this.moveLayer(id, targetParentId, insertIndex);
        return true;
    }

    moveLayer(id, parentId = null, index = null) {
        const layer = this.getLayer(id);
        if (!layer || layer.system) return false;
        if (parentId === id) return false;
        if (parentId && this.isDescendant(parentId, id)) return false;
        if (parentId && !this.getLayer(parentId)) return false;

        const oldParentId = layer.parentId ?? null;
        layer.parentId = parentId ?? null;
        this._replaceLayer(layer);

        const siblings = this._siblingsOf(layer.parentId).filter((row) => row.id !== layer.id);
        const safeIndex = index == null
            ? siblings.length
            : Math.max(0, Math.min(Number(index), siblings.length));
        siblings.splice(safeIndex, 0, layer);
        siblings.forEach((row, rowIndex) => {
            row.order = rowIndex;
            this._replaceLayer(row);
        });

        this._normalizeOrders(oldParentId);
        this._normalizeOrders(layer.parentId);
        this.reorderCanvasObjects();
        this.notifyChange();
        return true;
    }

    getDescendantIds(layerId) {
        const results = [];
        const walk = (parentId) => {
            this._siblingsOf(parentId).forEach((child) => {
                results.push(child.id);
                walk(child.id);
            });
        };
        walk(layerId);
        return results;
    }

    isDescendant(candidateId, ancestorId) {
        let current = this.getLayer(candidateId);
        while (current?.parentId) {
            if (current.parentId === ancestorId) return true;
            current = this.getLayer(current.parentId);
        }
        return false;
    }

    toggleVisibility(id) {
        const layer = this.getLayer(id);
        if (!layer) return;
        const next = !layer.visible;
        layer.visible = next;
        this._replaceLayer(layer);
        this.getDescendantIds(id).forEach((descendantId) => {
            const descendant = this.getLayer(descendantId);
            if (!descendant) return;
            descendant.visible = next;
            this._replaceLayer(descendant);
        });
        this.updateCanvasVisibility();
        this.notifyChange();
    }

    toggleLock(id) {
        const layer = this.getLayer(id);
        if (!layer || layer.type === LAYER_TYPES.BASE) return;
        const next = !layer.locked;
        layer.locked = next;
        this._replaceLayer(layer);
        this.getDescendantIds(id).forEach((descendantId) => {
            const descendant = this.getLayer(descendantId);
            if (!descendant) return;
            descendant.locked = next;
            this._replaceLayer(descendant);
        });
        this.updateCanvasVisibility();
        this.notifyChange();
    }

    assignToLayer(fabricObject, layerId) {
        if (!fabricObject) return;
        const layer = this.getLayer(layerId) || this.getLayer('zones');
        fabricObject.layerId = layer?.id || 'zones';
        this.updateCanvasVisibility();
        this.reorderCanvasObjects();
    }

    getObjectsInLayer(layerId) {
        if (!this.fabricCanvas.canvas) return [];
        return this.fabricCanvas.canvas.getObjects()
            .filter((obj) => (obj.layerId || 'base') === layerId);
    }

    updateCanvasVisibility() {
        const canvas = this.fabricCanvas.canvas;
        if (!canvas) return;

        canvas.forEachObject((obj) => {
            const layer = this.getLayer(obj.layerId || 'base') || this.getLayer('base');
            const visible = layer ? this._isVisibleByHierarchy(layer) : true;
            const locked = layer ? this._isLockedByHierarchy(layer) : false;
            obj.visible = visible;
            obj.selectable = visible && !locked;
            obj.evented = visible && !locked;
        });

        canvas.requestRenderAll();
    }

    reorderCanvasObjects() {
        const canvas = this.fabricCanvas.canvas;
        if (!canvas) return;

        const layerRank = new Map(
            this.getLayers().map((layer, index) => [layer.id, index]),
        );

        const objects = [...canvas.getObjects()];
        objects.sort((a, b) => {
            const rankA = layerRank.get(a.layerId || 'base') ?? 0;
            const rankB = layerRank.get(b.layerId || 'base') ?? 0;
            return rankA - rankB;
        });

        objects.forEach((obj, index) => {
            if (typeof canvas.moveTo === 'function') {
                canvas.moveTo(obj, index);
            } else if (typeof canvas.moveObjectTo === 'function') {
                canvas.moveObjectTo(obj, index);
            }
        });
        canvas.requestRenderAll();
    }

    importTree(tree = {}, uiState = {}) {
        const sourceLayers = Array.isArray(tree?.layers) ? tree.layers : [];
        if (!sourceLayers.length) return false;

        const existingById = new Map(this.layers.map((row) => [row.id, row]));
        const rebuilt = [];
        const walk = (nodes, parentId = null) => {
            nodes.forEach((node, index) => {
                const row = existingById.get(node.id) || {
                    id: node.id || uid('layer'),
                    type: node.type || LAYER_TYPES.CUSTOM,
                    system: Boolean(node.system),
                };
                row.name = node.name || row.name || 'Capa';
                row.visible = node.visible !== false;
                row.locked = Boolean(node.locked);
                row.color = node.color || row.color || '#64748b';
                row.parentId = parentId;
                row.order = index;
                row.type = node.type || row.type || LAYER_TYPES.CUSTOM;
                row.system = Boolean(node.system || row.system);
                rebuilt.push(row);
                if (Array.isArray(node.children) && node.children.length) {
                    walk(node.children, row.id);
                }
            });
        };
        walk(sourceLayers, null);

        const hasBase = rebuilt.some((row) => row.id === 'base');
        if (!hasBase) {
            const defaults = new LayerManager(this.fabricCanvas);
            this.layers = defaults.layers;
            this.uiState = defaults.uiState;
            return false;
        }

        this.layers = rebuilt;
        this.activeLayerId = this.getLayer(this.activeLayerId) ? this.activeLayerId : 'zones';
        this.uiState = {
            expanded: {
                ...(this.uiState?.expanded || {}),
                ...((uiState && uiState.expanded) || {}),
            },
        };
        this._normalizeOrders();
        this.updateCanvasVisibility();
        this.reorderCanvasObjects();
        this.notifyChange();
        return true;
    }

    onChange(callback) {
        this.onChangeCallbacks.push(callback);
    }

    notifyChange() {
        const layers = this.getLayers();
        const activeId = this.activeLayerId;
        const payload = {
            layers,
            activeLayerId: activeId,
            tree: this.getLayerTree(),
            uiState: this.getUiState(),
        };
        this.onChangeCallbacks.forEach((callback) => {
            callback(layers, activeId, payload);
        });
    }

    _siblingsOf(parentId = null) {
        const scopedParent = parentId ?? null;
        return this.layers
            .filter((layer) => (layer.parentId ?? null) === scopedParent)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    _replaceLayer(layer) {
        const idx = this.layers.findIndex((row) => row.id === layer.id);
        if (idx >= 0) {
            this.layers[idx] = layer;
        }
    }

    _swapOrder(left, right) {
        const next = left.order;
        left.order = right.order;
        right.order = next;
        this._replaceLayer(left);
        this._replaceLayer(right);
    }

    _normalizeOrders(parentId = undefined) {
        const normalize = (scopeParent) => {
            const siblings = this._siblingsOf(scopeParent);
            siblings.forEach((row, index) => {
                row.order = index;
                this._replaceLayer(row);
                normalize(row.id);
            });
        };
        if (parentId === undefined) {
            normalize(null);
            return;
        }
        normalize(parentId ?? null);
    }

    _isVisibleByHierarchy(layer) {
        let current = layer;
        while (current) {
            if (!current.visible) return false;
            if (!current.parentId) break;
            current = this.getLayer(current.parentId);
        }
        return true;
    }

    _isLockedByHierarchy(layer) {
        let current = layer;
        while (current) {
            if (current.locked) return true;
            if (!current.parentId) break;
            current = this.getLayer(current.parentId);
        }
        return false;
    }

    _removeObjectsForLayers(layerIdsSet) {
        const canvas = this.fabricCanvas.canvas;
        if (!canvas) return;
        const toRemove = canvas.getObjects()
            .filter((obj) => layerIdsSet.has(obj.layerId || 'base'));
        toRemove.forEach((obj) => canvas.remove(obj));
        canvas.requestRenderAll();
    }

    _cloneLayerObjects(fromLayerId, toLayerId) {
        const canvas = this.fabricCanvas.canvas;
        if (!canvas) return;
        const objects = this.getObjectsInLayer(fromLayerId);
        objects.forEach((obj) => {
            if (typeof obj.clone !== 'function') return;
            const applyClone = (cloned) => {
                if (!cloned) return;
                cloned.set({
                    left: (obj.left || 0) + 18,
                    top: (obj.top || 0) + 18,
                    layerId: toLayerId,
                });
                canvas.add(cloned);
            };
            const maybePromise = obj.clone(applyClone);
            if (maybePromise && typeof maybePromise.then === 'function') {
                maybePromise.then(applyClone).catch(() => null);
            }
        });
    }
}
