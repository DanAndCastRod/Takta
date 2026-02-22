import { FabricCanvas } from './canvas/FabricCanvas.js';
import { plantLayoutService } from '../../services/plant-layout.service.js';
import { importManager } from './import/ImportManager.js';
import { LayerManager } from './layers/LayerManager.js';
import { ArrowConnector } from './tools/ArrowConnector.js';
import { PropertiesPanel } from './panels/PropertiesPanel.js';
import { ContextMenu } from './tools/ContextMenu.js';
import { FileManager } from './tools/FileManager.js';
import { ResourceManager } from './modals/ResourceManager.js';
import { capacityService } from '../../services/capacity.service.js';

// Icon names mapping for easy reference
const ICONS = {
    factory: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>`,
    save: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>`,
    folderOpen: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>`,
    eraser: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`,
    pointer: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>`,
    square: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>`,
    circle: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`,
    mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    layers: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>`,
    eye: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`,
    lock: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    plus: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
    activity: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    user: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>`,
    arrowRight: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`
};

export class PlantEditor {
    constructor(containerId) {
        this.containerId = containerId;
        this.fabricWrapper = null;
        this.currentPlantId = null;
        this.container = null;
        this.activeToolBtn = null;
        this.layerManager = null;
        this.arrowConnector = null;
        this.propertiesPanel = null;
        this.contextMenu = null;
        this.fileManager = null;
        this.resourceManager = null;
    }

    render() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) return;

        // Estructura del Editor "Premium" con iconos SVG
        this.container.innerHTML = `
            <div class="plant-editor-layout h-full flex flex-col bg-slate-50 relative">
                <!-- Top Navigation Bar -->
                <div class="pe-toolbar h-14 glass-panel z-20 flex items-center px-4 justify-between border-b-0 m-2 rounded-xl">
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-2 text-indigo-900">
                            <span class="text-indigo-600">${ICONS.factory}</span>
                            <span class="font-bold tracking-tight">PlantaEditor</span>
                            <span class="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">PRO</span>
                        </div>
                        
                        <div class="h-6 w-px bg-slate-200 mx-2"></div>
                        
                        <div class="flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg">
                            <button id="pe-btn-load" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600" title="Cargar archivo (.drawio, .json, imagen)">
                                ${ICONS.folderOpen}
                            </button>
                            <input type="file" id="pe-file-input" accept=".drawio,.xml,.json,.svg,.png,.jpg,.jpeg" class="hidden" />
                            <button id="pe-btn-save" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600" title="Guardar">
                                ${ICONS.save}
                            </button>
                            <button id="pe-btn-clear" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-red-500" title="Limpiar">
                                ${ICONS.eraser}
                            </button>
                            <div class="h-4 w-px bg-slate-200 mx-1"></div>
                            <button id="pe-btn-analyze" class="flex items-center gap-2 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition-all text-xs font-bold" title="Analizar Capacidad">
                                ${ICONS.activity}
                                <span>Analizar</span>
                            </button>
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <span id="pe-status" class="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2">
                            <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Ready
                        </span>
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                            ${ICONS.user}
                        </div>
                    </div>
                </div>

                <!-- Main Content Area -->
                <div class="flex-grow flex relative p-2 pt-0 gap-2 overflow-hidden">

                    <!-- Floating Tools Sidebar (Left) -->
                    <div class="absolute left-4 top-4 bottom-4 w-14 glass-panel rounded-xl z-10 flex flex-col items-center py-4 gap-3">
                        <button class="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 transition-all hover:scale-105 active:scale-95" title="Seleccionar">
                            ${ICONS.pointer}
                        </button>
                        <div class="w-8 h-px bg-slate-200/60"></div>
                        <button class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all" title="Rectángulo">
                            ${ICONS.square}
                        </button>
                        <button class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all" title="Círculo">
                            ${ICONS.circle}
                        </button>
                        <button class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all" title="Marcador">
                            ${ICONS.mapPin}
                        </button>
                        <button class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-violet-600 transition-all" title="Conexión">
                            ${ICONS.arrowRight}
                        </button>

                        <div class="flex-grow"></div>

                        <button class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Eliminar">
                            ${ICONS.trash}
                        </button>
                    </div>

                    <!-- Canvas Area with Drop Zone -->
                    <div id="pe-canvas-container" class="flex-grow bg-slate-100 rounded-xl shadow-inner relative overflow-hidden bg-grid-pattern ml-16 mr-72">
                        <!-- Drop Zone Overlay (hidden by default) -->
                        <div id="pe-drop-zone" class="absolute inset-0 bg-indigo-500/20 backdrop-blur-sm z-50 hidden flex-col items-center justify-center border-4 border-dashed border-indigo-400 rounded-xl transition-all">
                            <div class="text-indigo-600 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" x2="12" y1="3" y2="15" />
                                </svg>
                            </div>
                            <span class="text-lg font-bold text-indigo-700">Soltar archivo aquí</span>
                            <span class="text-sm text-indigo-500 mt-1">(.drawio, .json, .svg, imágenes)</span>
                        </div>
                        <!-- Canvas se inyecta aquí -->
                        <div class="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs font-mono text-slate-500 pointer-events-none">
                            100%
                        </div>
                    </div>

                    <!-- Properties/Layers Panel (Right) -->
                    <div class="absolute right-4 top-0 bottom-4 w-68 flex flex-col gap-2">
                        <!-- Layers Panel -->
                        <div class="glass-panel flex-grow rounded-xl p-4 flex flex-col">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="font-bold text-slate-700 flex items-center gap-2">
                                    <span class="text-indigo-500">${ICONS.layers}</span> Capas
                                </h3>
                                <button class="text-slate-400 hover:text-indigo-600 transition-colors">
                                    ${ICONS.plus}
                                </button>
                            </div>

                            <div id="pe-layers-list" class="space-y-2 overflow-y-auto pr-1">
                                <!-- Layers renderizadas dinámicamente -->
                            </div>
                        </div>

                        <!-- Mini Inspector -->
                        <div class="glass-panel h-1/3 rounded-xl p-4 overflow-y-auto">
                            <h3 class="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                <span class="text-indigo-500">${ICONS.settings}</span> Propiedades
                            </h3>
                            <div id="pe-properties-content">
                                <div class="text-xs text-slate-400 text-center mt-8">
                                    Selecciona un objeto
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Inicializar Canvas
        this.fabricWrapper = new FabricCanvas('pe-canvas-container');
        this.fabricWrapper.init();

        // Event Listeners
        // Removed old handleSave/handleRunListeners content as we now use Toolbar setup below.
        document.getElementById('pe-btn-load').addEventListener('click', () => this.triggerFileInput());
        document.getElementById('pe-file-input').addEventListener('change', (e) => this.handleFileSelected(e));
        document.getElementById('pe-btn-clear').addEventListener('click', () => this.handleClear());

        // Drag & Drop
        this.setupDragAndDrop();

        // Initialize Layer Manager
        this.layerManager = new LayerManager(this.fabricWrapper);
        this.layerManager.onChange((layers, activeId) => this.renderLayersPanel(layers, activeId));
        this.renderLayersPanel(this.layerManager.getLayers(), this.layerManager.activeLayerId);

        // Initialize Arrow Connector
        this.arrowConnector = new ArrowConnector(this.fabricWrapper);

        // Initialize Properties Panel
        this.propertiesPanel = new PropertiesPanel(this.fabricWrapper, 'pe-properties-content');

        // Initialize Context Menu (right-click)
        this.contextMenu = new ContextMenu(this.fabricWrapper);

        // Initialize File Manager with autosave
        this.fileManager = new FileManager(this.fabricWrapper, {
            autoSaveKey: `plant-editor-${this.currentPlantId || 'default'}`,
            enableAutoSave: true
        });

        // Check for recovered autosave
        if (this.fileManager.hasLocalStorageData()) {
            const statusEl = document.getElementById('pe-status');
            if (statusEl) statusEl.innerHTML = '<span class="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Autosave detectado';
        }

        // Initialize Resource Manager
        this.resourceManager = new ResourceManager({
            onLoad: (layout) => {
                this.fileManager.loadFromJSON(JSON.parse(layout.json_content));
                this.currentPlantId = layout.id;
                this.fileManager.autoSaveKey = `plant-editor-${layout.id}`; // Update autosave key

                const statusEl = document.getElementById('pe-status');
                statusEl.innerHTML = `<span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span> ${layout.name}`;
            },
            onSave: async (data, isNew) => {
                // Construct payload
                const payload = {
                    name: data.name,
                    description: data.description,
                    json_content: data.json,
                    thumbnail: data.screenshot,
                    id: this.currentPlantId
                };

                if (isNew) {
                    delete payload.id;
                }

                // Call service
                const savedLayout = await plantLayoutService.savePlantLayout(payload);
                this.currentPlantId = savedLayout.id;
                this.fileManager.autoSaveKey = `plant-editor-${savedLayout.id}`;

                // Update header
                const statusEl = document.getElementById('pe-status');
                statusEl.innerHTML = `<span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span> ${savedLayout.name}`;

                return savedLayout;
            }
        });

        // Setup Toolbar actions (including Save to DB)
        this.setupToolbar();

        // Mode listeners
        const btnPointer = this.container.querySelector('button[title="Seleccionar"]');
        btnPointer.addEventListener('click', () => this.setMode('select', btnPointer));

        const btnRect = this.container.querySelector('button[title="Rectángulo"]');
        btnRect.addEventListener('click', () => this.addShape('rect'));

        const btnCircle = this.container.querySelector('button[title="Círculo"]');
        btnCircle.addEventListener('click', () => this.addShape('circle'));

        const btnArrow = this.container.querySelector('button[title="Conexión"]');
        btnArrow.addEventListener('click', () => this.toggleConnectionMode(btnArrow));

        const btnDelete = this.container.querySelector('button[title="Eliminar"]');
        btnDelete.addEventListener('click', () => this.deleteSelected());

        // Default mode
        this.activeToolBtn = btnPointer;
        this.setMode('select', btnPointer);
    }

    setupToolbar() {
        // Database Load/Save
        const btnLoad = this.container.querySelector('#pe-btn-load');
        // Note: btnLoad might conflict with the one setup in Render() listeners for triggerFileInput if IDs are same?
        // In render: id="pe-btn-load" title="Cargar archivo" -> triggers triggerFileInput (LOCAL load)
        // Wait, "Cargar archivo" usually means local.
        // But user persistence requirement means we need "Load from DB" button too?
        // The toolbar HTML in render() has:
        // load (folderOpen) -> pe-btn-load
        // file-input
        // save -> pe-btn-save

        // In previous code (before I rewrote), SetupToolbar was called.
        // And it added listeners to pe-btn-load and pe-btn-save to open resourceManager.
        // BUT clean HTML also had listeners to triggerFileInput.
        // This causes conflict (double action).

        // Decision: 
        // pe-btn-load -> Resource Manager (DB Load)
        // pe-btn-save -> Resource Manager (DB Save)
        // We need a separate button for "Import Local"? Or Resource Manager handles import?
        // For now, let's Stick to Resource Manager as primary.

        // Overwrite the listener added in render() ?
        // The code above in render: document.getElementById('pe-btn-load').addEventListener(...)
        // I should REMOVE that line if I want this to be DB Load.
        // Or make ResourceManager have an "Import from Disk" option.

        // Let's modify render() cleanup above to NOT add conflicting listeners.
        // I will remove the conflicting listeners in the code block I am writing.

        // Re-selecting them here ensures we attach the DB logic.
        const btnLoadDB = this.container.querySelector('#pe-btn-load');
        // Clone to clear previous listeners if any (simple trick)
        const newBtnLoad = btnLoadDB.cloneNode(true);
        btnLoadDB.parentNode.replaceChild(newBtnLoad, btnLoadDB);

        newBtnLoad.addEventListener('click', () => {
            this.resourceManager.open('load');
        });

        const btnSaveDB = this.container.querySelector('#pe-btn-save');
        const newBtnSave = btnSaveDB.cloneNode(true);
        btnSaveDB.parentNode.replaceChild(newBtnSave, btnSaveDB);

        newBtnSave.addEventListener('click', () => {
            const json = this.fileManager.toJSON();
            // Create thumbnail
            const png = this.fabricWrapper.canvas.toDataURL({
                format: 'png',
                multiplier: 0.5,
                quality: 0.8
            });

            this.resourceManager.open('save', { json: JSON.stringify(json), screenshot: png });
        });

        const btnAnalyze = this.container.querySelector('#pe-btn-analyze');
        if (btnAnalyze) {
            btnAnalyze.addEventListener('click', () => this.toggleCapacityAnalysis(btnAnalyze));
        }
    }

    async toggleCapacityAnalysis(btn) {
        if (this.isAnalyzing) {
            // Stop Analysis
            this.isAnalyzing = false;
            btn.classList.remove('bg-indigo-100', 'text-indigo-800', 'ring-2', 'ring-indigo-500');
            btn.classList.add('bg-indigo-50', 'text-indigo-700');
            btn.innerHTML = `${ICONS.activity} <span>Analizar</span>`;

            // Clear visualization
            this.fabricWrapper.canvas.getObjects().forEach(obj => {
                if (obj._originalStroke) {
                    obj.set({
                        stroke: obj._originalStroke,
                        strokeWidth: obj._originalStrokeWidth,
                        shadow: null
                    });
                    delete obj._originalStroke;
                    delete obj._originalStrokeWidth;
                }
            });

            // Remove labels
            if (this.capacityLabels) {
                this.capacityLabels.forEach(label => this.fabricWrapper.canvas.remove(label));
                this.capacityLabels = [];
            }

            this.fabricWrapper.canvas.requestRenderAll();

        } else {
            // Start Analysis
            this.isAnalyzing = true;
            btn.classList.remove('bg-indigo-50', 'text-indigo-700');
            btn.classList.add('bg-indigo-100', 'text-indigo-800', 'ring-2', 'ring-indigo-500');
            btn.innerHTML = `${ICONS.activity} <span>Calculando...</span>`;

            this.capacityLabels = [];

            // 1. Find objects with connected Assets
            const objects = this.fabricWrapper.canvas.getObjects();
            const assetObjects = objects.filter(obj => obj.data && obj.data.assetId);

            if (assetObjects.length === 0) {
                alert("No hay objetos vinculados a activos (Assets) en este diseño.");
                this.toggleCapacityAnalysis(btn); // Reset
                return;
            }

            btn.innerHTML = `${ICONS.activity} <span>Resultados</span>`;

            for (const obj of assetObjects) {
                try {
                    // Fetch capacity from backend
                    const result = await capacityService.getAssetCapacity(obj.data.assetId);

                    // Visualize Result
                    if (!obj._originalStroke) {
                        obj._originalStroke = obj.stroke;
                        obj._originalStrokeWidth = obj.strokeWidth;
                    }

                    const isBottleneck = result.details && result.details.type === 'machine' && result.details.standard_time > 1.5; // Dummy threshold logic for visual demo if backend logic is simple
                    // Better: The BACKEND should tell us if it's a bottleneck relative to what?
                    // For single machine analysis, we just show capacity.
                    // Green if > 0. Red if 0 (Warning).
                    // Actually, let's color code based on UPH magnitude? 
                    // Or just a standard highlight.

                    // Let's use Blue for Info, Red/Orange if capacity looks low? 
                    // For now: Always Purple highlight + Text Label

                    obj.set({
                        stroke: '#8b5cf6', // Violet
                        strokeWidth: 4,
                        shadow: {
                            color: '#8b5cf6',
                            blur: 10,
                            offsetX: 0,
                            offsetY: 0
                        }
                    });

                    // Add Label
                    const text = new fabric.Text(`${result.capacity_uph} UPH`, {
                        left: obj.left,
                        top: obj.top - 20,
                        fontSize: 14,
                        fontFamily: 'sans-serif',
                        fill: '#fff',
                        backgroundColor: '#8b5cf6',
                        padding: 4,
                        rx: 4,
                        ry: 4,
                        originX: 'center',
                        originY: 'bottom',
                        selectable: false,
                        evented: false
                    });

                    this.fabricWrapper.canvas.add(text);
                    this.capacityLabels.push(text);

                } catch (err) {
                    console.error("Error analyzing asset:", err);
                }
            }

            this.fabricWrapper.canvas.requestRenderAll();
        }
    }

    toggleConnectionMode(btn) {
        if (this.arrowConnector.isConnecting) {
            this.arrowConnector.stopConnecting();
            btn.classList.remove('bg-violet-50', 'text-violet-600', 'border-violet-100');
            btn.classList.add('hover:bg-slate-50', 'text-slate-500');
            const statusEl = document.getElementById('pe-status');
            statusEl.innerHTML = '<span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Ready';
        } else {
            this.arrowConnector.startConnecting();
            btn.classList.add('bg-violet-50', 'text-violet-600', 'border-violet-100');
            btn.classList.remove('hover:bg-slate-50', 'text-slate-500');
            const statusEl = document.getElementById('pe-status');
            statusEl.innerHTML = '<span class="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse"></span> Conectando: Click en origen y destino';
        }
    }

    renderLayersPanel(layers, activeLayerId) {
        const container = document.getElementById('pe-layers-list');
        if (!container) return;

        container.innerHTML = layers.map(layer => {
            const isActive = layer.id === activeLayerId;
            const eyeIcon = layer.visible ? ICONS.eye : ICONS.eyeOff;
            const lockIcon = layer.locked ? ICONS.lock : '';

            return `
                <div class="layer-item group flex items-center gap-3 p-2.5 ${isActive ? 'bg-indigo-50/50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'} rounded-lg cursor-pointer transition-colors ${!layer.visible ? 'opacity-50' : ''}"
data-layer-id="${layer.id}">
                    <span class="layer-visibility-toggle ${layer.visible ? 'text-indigo-500' : 'text-slate-400'}" style="color: ${layer.color}">${eyeIcon}</span>
                    <span class="text-sm font-medium ${isActive ? 'text-slate-700' : 'text-slate-600'}">${layer.name}</span>
                    ${lockIcon ? `<span class="ml-auto text-slate-400">${lockIcon}</span>` : ''}
                </div>
            `;
        }).join('');

        // Add event listeners
        container.querySelectorAll('.layer-item').forEach(item => {
            const layerId = item.dataset.layerId;

            // Click to select layer
            item.addEventListener('click', () => {
                this.layerManager.setActiveLayer(layerId);
            });

            // Click on eye to toggle visibility
            const eyeToggle = item.querySelector('.layer-visibility-toggle');
            eyeToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.layerManager.toggleVisibility(layerId);
            });
        });
    }

    setMode(mode, btn) {
        // Update UI
        if (this.activeToolBtn) {
            this.activeToolBtn.classList.remove('bg-indigo-50', 'text-indigo-600', 'border-indigo-100');
            this.activeToolBtn.classList.add('hover:bg-slate-50', 'text-slate-500');
        }

        btn.classList.add('bg-indigo-50', 'text-indigo-600', 'border-indigo-100');
        btn.classList.remove('hover:bg-slate-50', 'text-slate-500');
        this.activeToolBtn = btn;

        // Update Canvas Mode
        if (mode === 'select') {
            this.fabricWrapper.setPanMode(false);
        } else if (mode === 'pan') {
            this.fabricWrapper.setPanMode(true);
        }
    }

    addShape(type) {
        const center = this.fabricWrapper.canvas.getVpCenter();
        let objData = {
            left: center.x,
            top: center.y,
            fill: 'rgba(99, 102, 241, 0.5)', // indigo-500 @ 50%
            stroke: '#4338ca', // indigo-700
            strokeWidth: 2
        };

        if (type === 'rect') {
            objData = { ...objData, type: 'rect', width: 100, height: 100 };
        } else if (type === 'circle') {
            objData = { ...objData, type: 'ellipse', rx: 50, ry: 50 };
        }

        this.fabricWrapper.addObject(objData);
    }

    deleteSelected() {
        this.fabricWrapper.removeActiveObject();
    }

    /**
     * Configura eventos de Drag & Drop en el canvas
     */
    setupDragAndDrop() {
        const canvasContainer = document.getElementById('pe-canvas-container');
        const dropZone = document.getElementById('pe-drop-zone');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            canvasContainer.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        canvasContainer.addEventListener('dragenter', () => {
            dropZone.classList.remove('hidden');
            dropZone.classList.add('flex');
        });

        canvasContainer.addEventListener('dragleave', (e) => {
            // Solo ocultar si realmente salimos del contenedor
            if (!canvasContainer.contains(e.relatedTarget)) {
                dropZone.classList.add('hidden');
                dropZone.classList.remove('flex');
            }
        });

        dropZone.addEventListener('dragleave', (e) => {
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.add('hidden');
                dropZone.classList.remove('flex');
            }
        });

        canvasContainer.addEventListener('drop', async (e) => {
            dropZone.classList.add('hidden');
            dropZone.classList.remove('flex');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                await this.handleFileImport(files[0]);
            }
        });
    }

    /**
     * Abre el selector de archivos
     */
    triggerFileInput() {
        document.getElementById('pe-file-input').click();
    }

    /**
     * Maneja la selección de archivo desde el input
     */
    async handleFileSelected(event) {
        const file = event.target.files[0];
        if (file) {
            await this.handleFileImport(file);
        }
        // Reset input para permitir seleccionar el mismo archivo de nuevo
        event.target.value = '';
    }

    /**
     * Importa un archivo usando ImportManager
     */
    async handleFileImport(file) {
        const statusEl = document.getElementById('pe-status');
        try {
            statusEl.innerHTML = '<span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Importing...';

            const result = await importManager.importFile(file);

            switch (result.type) {
                case 'drawio':
                    await this.loadDrawioData(result);
                    break;
                case 'json':
                    this.fabricWrapper.loadFromJSON(result.data);
                    break;
                case 'svg':
                    await this.fabricWrapper.loadSVGString(result.svgString);
                    break;
                case 'image':
                    await this.fabricWrapper.addBackgroundImage(result.src);
                    break;
            }

            statusEl.innerHTML = `<span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span> ${file.name} loaded`;
            setTimeout(() => {
                statusEl.innerHTML = '<span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Ready';
            }, 3000);

        } catch (error) {
            console.error('Import error:', error);
            statusEl.innerHTML = `<span class="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Error: ${error.message}`;
        }
    }

    /**
     * Carga datos de un archivo .drawio en el canvas
     */
    async loadDrawioData(drawioResult) {
        const firstPage = drawioResult.pages[0];
        if (!firstPage) return;

        // Cargar imagen de fondo si existe
        if (firstPage.backgroundImage && firstPage.backgroundImage.src) {
            await this.fabricWrapper.addBackgroundImage(firstPage.backgroundImage.src, {
                left: firstPage.backgroundImage.left,
                top: firstPage.backgroundImage.top,
                scaleX: 1,
                scaleY: 1
            });
        }

        // Cargar objetos adicionales
        for (const obj of firstPage.fabricObjects) {
            await this.fabricWrapper.addObject(obj);
        }
    }

    handleClear() {
        this.fabricWrapper.clear();
    }
}
