import { FabricCanvas } from './canvas/FabricCanvas.js';
import * as fabric from 'fabric';
import { plantLayoutService } from '../../services/plant-layout.service.js';
import { importManager } from './import/ImportManager.js';
import { LayerManager } from './layers/LayerManager.js';
import { ArrowConnector } from './tools/ArrowConnector.js';
import { PropertiesPanel } from './panels/PropertiesPanel.js';
import { ContextMenu } from './tools/ContextMenu.js';
import { FileManager } from './tools/FileManager.js';
import { ResourceManager } from './modals/ResourceManager.js';
import { capacityService } from '../../services/capacity.service.js';
import { qualityService } from '../../services/quality.service.js';
import { meetingService } from '../../services/meeting.service.js';
import { improvementService } from '../../services/improvement.service.js';
import platformService from '../../services/platform.service.js';
import { getTenantCode } from '../../services/tenant-ui.service.js';

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
    arrowRight: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    pan: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m17 7-5-5-5 5"/><path d="m17 17-5 5-5-5"/><path d="M2 12h20"/><path d="m7 17-5-5 5-5"/><path d="m17 17 5-5-5-5"/></svg>`,
    diamond: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l9 9-9 9-9-9 9-9z"/></svg>`,
    text: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16"/><path d="M12 6v14"/></svg>`,
    route: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="2"/><path d="M9 19h6a2 2 0 0 0 2-2V5"/><circle cx="18" cy="5" r="2"/></svg>`,
    heat: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14A3.5 3.5 0 0 0 12 17.5 3.5 3.5 0 0 0 15.5 14c0-2.5-2-3.5-2-6 0-1.2.6-2.3 1.5-3-.2-.1-.4-.1-.6-.1-1.9 0-3.4 1.5-3.4 3.4V9C9.8 8.2 9 7 9 5.5c-2.4 1.4-4 4-4 6.9A7 7 0 0 0 12 19.5 7 7 0 0 0 19 12.4c0-3.8-2.1-6.3-4.6-8.4"/></svg>`,
    plug: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M5 8h14"/><path d="M6 8v2a6 6 0 0 0 12 0V8"/></svg>`,
    play: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 4 20 12 6 20 6 4"/></svg>`,
    pause: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    stop: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"/></svg>`,
    undo: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-6.7L3 9"/></svg>`,
    redo: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M21 13a9 9 0 1 1-3-6.7L21 9"/></svg>`,
    fit: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/></svg>`,
    center: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/></svg>`
};

function esc(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function isUuidLike(value) {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

export class PlantEditor {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.fabricWrapper = null;
        this.currentPlantId = null;
        this.contextAssetId = options.contextAssetId || null;
        this.container = null;
        this.activeToolBtn = null;
        this.layerManager = null;
        this.arrowConnector = null;
        this.propertiesPanel = null;
        this.contextMenu = null;
        this.fileManager = null;
        this.resourceManager = null;
        this.panelOpen = false;
        this.isAnalyzing = false;
        this.capacityLabels = [];
        this.diagramMode = 'general';
        this.diagramPresets = {
            plant: { label: 'Planta', background: '#f3f4f6', fill: 'rgba(99, 102, 241, 0.45)', stroke: '#4338ca' },
            process: { label: 'Proceso', background: '#eff6ff', fill: 'rgba(14, 116, 144, 0.35)', stroke: '#0e7490' },
            vsm: { label: 'VSM', background: '#f8fafc', fill: 'rgba(234, 88, 12, 0.30)', stroke: '#c2410c' },
            svg: { label: 'SVG', background: '#ffffff', fill: 'rgba(16, 185, 129, 0.30)', stroke: '#047857' },
            general: { label: 'General', background: '#f8fafc', fill: 'rgba(71, 85, 105, 0.30)', stroke: '#334155' }
        };
        this.flowSimulation = {
            open: false,
            running: false,
            rafId: null,
            lastTimestamp: 0,
            speed: 1.2,
            tokens: 5,
            thresholdGreen: 0.85,
            thresholdYellow: 1.15,
            globalDensityRatio: 0,
            connectors: [],
            particles: []
        };
        this.heatmap = {
            enabled: false,
            valuesByAssetId: new Map(),
            overlays: [],
            maxOpacity: 0.42,
            minOpacity: 0.16,
            renderRaf: null,
            rendering: false,
            overlayEl: null,
            d3Root: null,
            d3Defs: null,
            d3Layer: null,
            resizeObserver: null
        };
        this.signalOverlay = {
            enabled: false,
            loading: false,
            polling: false,
            timerId: null,
            intervalMs: 15000,
            valuesByAssetId: new Map(),
            badges: [],
            renderRaf: null,
            lastUpdatedAt: null
        };
        this.realtime = {
            socket: null,
            connected: false,
            shouldReconnect: false,
            reconnectTimer: null,
            reconnectAttempts: 0,
            lastMessageAt: null
        };
        this.routeWatcher = null;
        this.layerTreeSaveTimer = null;
        this.propertySchemas = {};
        this.changeLogSaveTimer = null;
        this.pendingChangeLogs = [];
        this.platformBusy = {
            libraries: false,
            simulation: false,
            schemas: false,
        };
        this.libraryState = {
            domain: 'all',
            search: '',
            onlyTemplates: false,
            showFavoritesOnly: false,
            items: [],
            guides: [],
            selectedGuideId: null,
        };
        this.librarySearchTimer = null;
        this.simulationState = {
            scenarios: [],
            selectedScenarioId: null,
            results: [],
            selectedResultId: null,
            comparison: null,
            latestRun: null,
            decisions: [],
            lastExport: null,
            lastSync: null,
        };
        this.hasUnsavedChanges = false;
        this.persistedSignature = '';
        this.currentSignature = '';
        this.signatureTimer = null;
        this.lastSavedAt = null;
        this.lastAutoSavedAt = null;
        this.statusResetTimer = null;
        this.beforeUnloadHandler = null;
        this.dragDropBindings = [];
        this.keyboardHandler = null;
        this.isDestroyed = false;
    }

    render() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) return;
        this.isDestroyed = false;
        this.hasUnsavedChanges = false;
        this.persistedSignature = '';
        this.currentSignature = '';
        this.lastSavedAt = null;
        this.lastAutoSavedAt = null;

        // Estructura del Editor "Premium" con iconos SVG
        this.container.innerHTML = `
            <div class="plant-editor-layout h-full flex flex-col bg-slate-50 relative">
                <!-- Top Navigation Bar -->
                <div class="pe-toolbar h-14 glass-panel z-20 flex items-center px-4 justify-between border-b-0 m-2 rounded-xl">
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-2 text-indigo-900">
                            <span class="text-indigo-600">${ICONS.factory}</span>
                            <span class="font-bold tracking-tight">Diagram Studio</span>
                            <span class="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">PRO</span>
                        </div>
                        
                        <div class="h-6 w-px bg-slate-200 mx-2"></div>
                        
                        <div class="flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg flex-wrap">
                            <button id="pe-btn-import-local" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600" title="Importar archivo local (.drawio, .json, imagen)">
                                ${ICONS.folderOpen}
                            </button>
                            <input type="file" id="pe-file-input" accept=".drawio,.xml,.json,.svg,.png,.jpg,.jpeg" class="hidden" />
                            <button id="pe-btn-load-db" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600" title="Abrir diagrama guardado">
                                ${ICONS.layers}
                            </button>
                            <button id="pe-btn-save-db" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600" title="Guardar diagrama en base de datos">
                                ${ICONS.save}
                            </button>
                            <button id="pe-btn-undo" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed" title="Deshacer (Ctrl+Z)">
                                ${ICONS.undo}
                            </button>
                            <button id="pe-btn-redo" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed" title="Rehacer (Ctrl+Y)">
                                ${ICONS.redo}
                            </button>
                            <button id="pe-btn-fit" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600" title="Ajustar contenido a la vista">
                                ${ICONS.fit}
                            </button>
                            <button id="pe-btn-reset-view" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600" title="Centrar vista al 100%">
                                ${ICONS.center}
                            </button>
                            <button id="pe-btn-export-json" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600 text-[11px] font-semibold" title="Exportar JSON">
                                JSON
                            </button>
                            <button id="pe-btn-export-png" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600 text-[11px] font-semibold" title="Exportar PNG">
                                PNG
                            </button>
                            <button id="pe-btn-export-svg" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600 text-[11px] font-semibold" title="Exportar SVG">
                                SVG
                            </button>
                            <button id="pe-btn-clear" class="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-red-500" title="Limpiar lienzo">
                                ${ICONS.eraser}
                            </button>
                            <div class="h-4 w-px bg-slate-200 mx-1"></div>
                            <select id="pe-diagram-mode" class="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200" title="Tipo de diagrama">
                                <option value="general">General</option>
                                <option value="plant">Planta</option>
                                <option value="process">Proceso</option>
                                <option value="vsm">VSM</option>
                                <option value="svg">SVG técnico</option>
                            </select>
                            <select id="pe-example-case" class="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200" title="Casos de ejemplo">
                                <option value="">Casos de ejemplo</option>
                                <option value="line-flow">Flujo lineal</option>
                                <option value="u-cell">Célula en U</option>
                                <option value="vsm-basic">VSM básico</option>
                                <option value="food-line">Línea alimentos</option>
                            </select>
                            <button id="pe-btn-load-example" class="h-8 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition-all text-xs font-bold" title="Cargar caso de ejemplo">
                                Cargar
                            </button>
                            <button id="pe-btn-analyze" class="flex items-center gap-2 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition-all text-xs font-bold" title="Analizar Capacidad">
                                ${ICONS.activity}
                                <span>Analizar</span>
                            </button>
                            <button id="pe-btn-heatmap" class="flex items-center gap-2 px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded transition-all text-xs font-bold" title="Activar mapa de calor">
                                ${ICONS.heat}
                                <span>Calor OFF</span>
                            </button>
                            <button id="pe-btn-live" class="flex items-center gap-2 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-all text-xs font-bold" title="Conectar WebSocket en tiempo real">
                                ${ICONS.plug}
                                <span>Live OFF</span>
                            </button>
                            <button id="pe-btn-signals" class="flex items-center gap-2 px-2 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded transition-all text-xs font-bold" title="Señales SPC/CAPA para overlay y simulación">
                                ${ICONS.activity}
                                <span>Señales OFF</span>
                            </button>
                            <button id="pe-btn-flow-panel" class="flex items-center gap-2 px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded transition-all text-xs font-bold" title="Simulador de flujo">
                                ${ICONS.route}
                                <span>Flujo</span>
                            </button>
                            <button id="pe-btn-toggle-panel" class="md:hidden p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600" title="Mostrar panel de capas y propiedades">
                                ${ICONS.settings}
                            </button>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <span id="pe-save-state" class="hidden md:inline-flex text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                            Sin cambios
                        </span>
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
                        <button id="pe-tool-select" class="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 transition-all hover:scale-105 active:scale-95" title="Seleccionar">
                            ${ICONS.pointer}
                        </button>
                        <button id="pe-tool-pan" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all" title="Mover lienzo">
                            ${ICONS.pan}
                        </button>
                        <div class="w-8 h-px bg-slate-200/60"></div>
                        <button id="pe-tool-rect" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all" title="Rectángulo">
                            ${ICONS.square}
                        </button>
                        <button id="pe-tool-circle" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all" title="Círculo">
                            ${ICONS.circle}
                        </button>
                        <button id="pe-tool-diamond" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all" title="Rombo">
                            ${ICONS.diamond}
                        </button>
                        <button id="pe-tool-text" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all" title="Texto">
                            ${ICONS.text}
                        </button>
                        <button id="pe-tool-marker" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all" title="Marcador">
                            ${ICONS.mapPin}
                        </button>
                        <button id="pe-tool-arrow" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 hover:text-violet-600 transition-all" title="Conexión">
                            ${ICONS.arrowRight}
                        </button>

                        <div class="flex-grow"></div>

                        <button id="pe-tool-delete" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Eliminar">
                            ${ICONS.trash}
                        </button>
                    </div>

                    <!-- Canvas Area with Drop Zone -->
                    <div id="pe-canvas-container" class="flex-grow bg-slate-100 rounded-xl shadow-inner relative overflow-hidden bg-grid-pattern ml-16 mr-0 md:mr-72">
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
                        <div id="pe-zoom-level" class="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs font-mono text-slate-500 pointer-events-none">
                            100%
                        </div>
                    </div>

                    <!-- Properties/Layers Panel (Right) -->
                    <div id="pe-right-panel" class="hidden md:flex absolute right-4 top-0 bottom-4 w-72 flex-col gap-2">
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

                    <div id="pe-flow-panel" class="hidden absolute bottom-4 left-20 z-30 w-[min(340px,calc(100%-6rem))] rounded-xl border border-amber-200 bg-white/95 backdrop-blur-sm shadow-lg p-4">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="font-semibold text-slate-800 flex items-center gap-2">
                                <span class="text-amber-600">${ICONS.route}</span>
                                Simulador de Flujo
                            </h3>
                            <button id="pe-flow-close" class="text-slate-400 hover:text-slate-600 text-xs font-semibold">Cerrar</button>
                        </div>
                        <p class="text-xs text-slate-500 mb-3">Simula circulación de producto sobre conexiones del diagrama.</p>
                        <div class="space-y-3">
                            <label class="block">
                                <span class="text-xs text-slate-600 font-medium">Velocidad</span>
                                <input id="pe-flow-speed" type="range" min="0.5" max="4" step="0.1" value="1.2" class="w-full mt-1 accent-amber-500" />
                            </label>
                            <label class="block">
                                <span class="text-xs text-slate-600 font-medium">Unidades simultáneas</span>
                                <input id="pe-flow-tokens" type="number" min="1" max="30" value="5" class="w-full mt-1 h-9 rounded border border-slate-200 px-2 text-sm" />
                            </label>
                            <div class="grid grid-cols-2 gap-2">
                                <label class="block">
                                    <span class="text-xs text-slate-600 font-medium">Umbral verde ≤</span>
                                    <input id="pe-flow-threshold-green" type="number" min="0.1" max="2.5" step="0.05" value="0.85" class="w-full mt-1 h-9 rounded border border-slate-200 px-2 text-sm" />
                                </label>
                                <label class="block">
                                    <span class="text-xs text-slate-600 font-medium">Umbral amarillo ≤</span>
                                    <input id="pe-flow-threshold-yellow" type="number" min="0.1" max="3" step="0.05" value="1.15" class="w-full mt-1 h-9 rounded border border-slate-200 px-2 text-sm" />
                                </label>
                            </div>
                            <div id="pe-flow-density" class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                                Densidad global: sin datos
                            </div>
                            <div id="pe-flow-signal-note" class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                                Señales SPC/CAPA: OFF
                            </div>
                            <div class="text-[11px] text-slate-500 flex items-center gap-2">
                                <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Fluido</span>
                                <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span>Carga media</span>
                                <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500"></span>Congestión</span>
                            </div>
                        </div>
                        <div class="mt-4 flex items-center gap-2">
                            <button id="pe-flow-start" class="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2">${ICONS.play}<span>Iniciar</span></button>
                            <button id="pe-flow-pause" class="h-9 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold inline-flex items-center justify-center gap-2">${ICONS.pause}<span>Pausar</span></button>
                            <button id="pe-flow-stop" class="h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-2">${ICONS.stop}<span>Detener</span></button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Inicializar Canvas
        this.fabricWrapper = new FabricCanvas('pe-canvas-container', {
            onHistoryChanged: () => this.refreshHistoryButtons(),
        });
        this.fabricWrapper.init();
        this.initHeatmapOverlay();

        // Base listeners
        this.container.querySelector('#pe-btn-import-local')?.addEventListener('click', () => this.triggerFileInput());
        this.container.querySelector('#pe-file-input')?.addEventListener('change', (e) => this.handleFileSelected(e));
        this.container.querySelector('#pe-btn-clear')?.addEventListener('click', () => this.handleClear());
        this.container.querySelector('#pe-btn-toggle-panel')?.addEventListener('click', () => this.toggleRightPanel());

        // Drag & Drop
        this.setupDragAndDrop();

        // Initialize Layer Manager
        this.layerManager = new LayerManager(this.fabricWrapper);
        this.layerManager.onChange((layers, activeId, payload) => {
            this.renderLayersPanel(layers, activeId, payload);
            this.scheduleLayerTreePersist(payload);
        });
        this.renderLayersPanel(this.layerManager.getLayers(), this.layerManager.activeLayerId, {
            tree: this.layerManager.getLayerTree(),
            uiState: this.layerManager.getUiState(),
        });

        // Initialize Arrow Connector
        this.arrowConnector = new ArrowConnector(this.fabricWrapper);

        // Initialize Properties Panel
        this.propertiesPanel = new PropertiesPanel(this.fabricWrapper, 'pe-properties-content', {
            getSchemas: () => this.propertySchemas,
            onObjectChanged: (change) => {
                this.queueDiagramChange(change.changeType || 'property', change);
                this.scheduleSignatureRefresh(80);
            },
        });

        // Initialize Context Menu (right-click)
        this.contextMenu = new ContextMenu(this.fabricWrapper);

        // Initialize File Manager with autosave
        this.fileManager = new FileManager(this.fabricWrapper, {
            autoSaveKey: `plant-editor-${this.currentPlantId || 'default'}`,
            enableAutoSave: true,
            onAutoSave: (meta) => this.handleAutoSave(meta),
        });

        // Check for recovered autosave
        if (this.fileManager.hasLocalStorageData()) {
            this.setStatus('Autosave local detectado', 'warn');
            this.lastAutoSavedAt = new Date();
        }

        // Initialize Resource Manager
        this.resourceManager = new ResourceManager({
            contextAssetId: this.contextAssetId,
            onLoad: async (layout) => {
                if (!this.confirmDiscardChanges('cargar otro diagrama')) return;
                this.stopFlowSimulation();
                await this.fileManager.loadFromJSON(JSON.parse(layout.json_content));
                this.currentPlantId = layout.id;
                this.fileManager.autoSaveKey = `plant-editor-${layout.id}`; // Update autosave key
                this.contextAssetId = layout.plant_id || this.contextAssetId;
                this.resourceManager.setContextAsset(this.contextAssetId);
                await this.loadLayerTreeState();
                await this.loadSimulationScenarios();
                await this.loadSimulationResults();
                await this.loadSimulationDecisions();
                this.renderSimulationPanel();
                this.markPersistedSnapshot('load');
                this.refreshZoomBadge();
                this.refreshHistoryButtons();

                this.setStatus(`${layout.name} cargado`, 'ok');
            },
            onSave: async (data, isNew) => {
                // Construct payload
                const payload = {
                    name: data.name,
                    description: data.description,
                    json_content: data.json,
                    thumbnail: data.screenshot,
                    plant_id: data.plant_id || this.contextAssetId || null,
                    id: this.currentPlantId,
                };

                if (isNew) {
                    delete payload.id;
                }

                // Call service
                const savedLayout = await plantLayoutService.savePlantLayout(payload);
                this.currentPlantId = savedLayout.id;
                this.fileManager.autoSaveKey = `plant-editor-${savedLayout.id}`;
                this.contextAssetId = savedLayout.plant_id || payload.plant_id || this.contextAssetId;
                this.resourceManager.setContextAsset(this.contextAssetId);
                this.scheduleLayerTreePersist();
                await this.loadSimulationScenarios();
                this.renderSimulationPanel();

                // Update header
                this.setStatus(`${savedLayout.name} guardado`, 'ok');
                this.markPersistedSnapshot('save');
                this.refreshHistoryButtons();

                return savedLayout;
            },
        });

        // Setup Toolbar actions (including Save to DB)
        this.setupToolbar();
        this.setupExampleCases();
        this.setupFlowPanel();
        this.setupRealtimeControls();
        this.setupHeatmapHooks();
        this.setupSignalControls();
        this.setupPlatformPanels();
        this.setupCanvasChangeHooks();
        void this.bootstrapPlatformData();

        // Mode listeners
        const btnPointer = this.container.querySelector('#pe-tool-select');
        btnPointer?.addEventListener('click', () => this.setMode('select', btnPointer));

        const btnPan = this.container.querySelector('#pe-tool-pan');
        btnPan?.addEventListener('click', () => this.setMode('pan', btnPan));

        const btnRect = this.container.querySelector('#pe-tool-rect');
        btnRect?.addEventListener('click', () => this.addShape('rect'));

        const btnCircle = this.container.querySelector('#pe-tool-circle');
        btnCircle?.addEventListener('click', () => this.addShape('circle'));

        const btnDiamond = this.container.querySelector('#pe-tool-diamond');
        btnDiamond?.addEventListener('click', () => this.addShape('diamond'));

        const btnText = this.container.querySelector('#pe-tool-text');
        btnText?.addEventListener('click', () => this.addTextNode());

        const btnMarker = this.container.querySelector('#pe-tool-marker');
        btnMarker?.addEventListener('click', () => this.addShape('marker'));

        const btnArrow = this.container.querySelector('#pe-tool-arrow');
        btnArrow?.addEventListener('click', () => this.toggleConnectionMode(btnArrow));

        const btnDelete = this.container.querySelector('#pe-tool-delete');
        btnDelete?.addEventListener('click', () => this.deleteSelected());

        // Default mode
        this.activeToolBtn = btnPointer;
        if (btnPointer) {
            this.setMode('select', btnPointer);
        }
        this.applyDiagramMode(this.diagramMode);
        this.updateHeatmapButtonState();
        this.updateRealtimeButtonState();
        this.setupBeforeUnloadGuard();
        this.setupGlobalShortcuts();
        this.refreshZoomBadge();
        this.refreshHistoryButtons();
        this.captureBaselineSnapshot();
        this.updateSaveStateIndicator();
    }

    setContextAsset(assetId) {
        this.contextAssetId = assetId || null;
        if (this.resourceManager) {
            this.resourceManager.setContextAsset(this.contextAssetId);
        }
        if (this.signalOverlay.enabled) {
            this.scheduleSignalRefresh(120);
        }
        void this.loadSimulationScenarios();
        this.renderSimulationPanel();
    }

    getTenantQueryString(extra = {}) {
        const params = new URLSearchParams();
        const tenantCode = getTenantCode();
        if (tenantCode) params.set('tenant_code', tenantCode);
        Object.entries(extra || {}).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            params.set(key, String(value));
        });
        return params.toString();
    }

    getCurrentDiagramUuid() {
        return isUuidLike(this.currentPlantId) ? String(this.currentPlantId) : null;
    }

    setupBeforeUnloadGuard() {
        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        }
        this.beforeUnloadHandler = (event) => {
            if (!this.hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }

    setupGlobalShortcuts() {
        if (this.keyboardHandler) {
            window.removeEventListener('keydown', this.keyboardHandler);
        }
        this.keyboardHandler = (event) => {
            const targetTag = String(event?.target?.tagName || '').toUpperCase();
            const isTyping = targetTag === 'INPUT'
                || targetTag === 'TEXTAREA'
                || event?.target?.isContentEditable;
            if (isTyping) return;

            const isCtrl = event.ctrlKey || event.metaKey;
            if (isCtrl && String(event.key || '').toLowerCase() === 's') {
                event.preventDefault();
                this.container?.querySelector('#pe-btn-save-db')?.click();
                return;
            }
            if (isCtrl && event.shiftKey && String(event.key || '').toLowerCase() === 'f') {
                event.preventDefault();
                this.fabricWrapper?.fitToContent?.();
                this.refreshZoomBadge();
                return;
            }
            if (isCtrl && String(event.key || '') === '0') {
                event.preventDefault();
                this.fabricWrapper?.resetView?.();
                this.refreshZoomBadge();
            }
        };
        window.addEventListener('keydown', this.keyboardHandler);
    }

    handleAutoSave(meta = {}) {
        if (!meta?.at) return;
        this.lastAutoSavedAt = meta.at instanceof Date ? meta.at : new Date(meta.at);
        this.updateSaveStateIndicator('autosave');
    }

    confirmDiscardChanges(actionLabel = 'continuar') {
        if (!this.hasUnsavedChanges) return true;
        return window.confirm(`Hay cambios sin guardar. ¿Deseas ${actionLabel}?`);
    }

    getCanvasSignature() {
        if (!this.fileManager) return '';
        try {
            const payload = this.fileManager.toJSON();
            if (!payload) return '';
            return JSON.stringify(payload);
        } catch (error) {
            console.warn('[PlantEditor] signature serialization failed', error);
            return '';
        }
    }

    scheduleSignatureRefresh(delayMs = 140) {
        if (this.isDestroyed) return;
        if (this.signatureTimer) {
            clearTimeout(this.signatureTimer);
        }
        this.signatureTimer = setTimeout(() => {
            this.signatureTimer = null;
            this.refreshDirtyState();
        }, delayMs);
    }

    refreshDirtyState() {
        if (this.isDestroyed) return;
        const signature = this.getCanvasSignature();
        this.currentSignature = signature;
        this.hasUnsavedChanges = signature !== this.persistedSignature;
        this.updateSaveStateIndicator();
        this.refreshHistoryButtons();
    }

    captureBaselineSnapshot() {
        const signature = this.getCanvasSignature();
        this.persistedSignature = signature;
        this.currentSignature = signature;
        this.hasUnsavedChanges = false;
    }

    markPersistedSnapshot(source = 'save') {
        const signature = this.getCanvasSignature();
        this.persistedSignature = signature;
        this.currentSignature = signature;
        this.hasUnsavedChanges = false;
        if (source !== 'init') {
            this.lastSavedAt = new Date();
        }
        this.updateSaveStateIndicator(source);
    }

    formatTimeLabel(date) {
        if (!(date instanceof Date) || Number.isNaN(date.valueOf())) return '--:--';
        return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }

    updateSaveStateIndicator(source = '') {
        const chip = this.container?.querySelector('#pe-save-state');
        if (!chip) return;

        if (this.hasUnsavedChanges) {
            const autoPart = this.lastAutoSavedAt
                ? ` | autosave ${this.formatTimeLabel(this.lastAutoSavedAt)}`
                : '';
            chip.className = 'hidden md:inline-flex text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200';
            chip.textContent = `Cambios sin guardar${autoPart}`;
            return;
        }

        if (this.lastSavedAt) {
            chip.className = 'hidden md:inline-flex text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200';
            chip.textContent = `Guardado ${this.formatTimeLabel(this.lastSavedAt)}`;
            return;
        }

        if (this.lastAutoSavedAt && !this.lastSavedAt) {
            chip.className = 'hidden md:inline-flex text-[11px] font-medium text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200';
            chip.textContent = `Autosave ${this.formatTimeLabel(this.lastAutoSavedAt)}`;
            return;
        }

        chip.className = 'hidden md:inline-flex text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200';
        chip.textContent = 'Sin cambios';
    }

    refreshZoomBadge() {
        const badge = this.container?.querySelector('#pe-zoom-level');
        const canvas = this.fabricWrapper?.canvas;
        if (!badge || !canvas) return;
        const zoom = Number(canvas.getZoom?.() || 1);
        const pct = Math.max(1, Math.round(zoom * 100));
        badge.textContent = `${pct}%`;
    }

    refreshHistoryButtons() {
        const undoButton = this.container?.querySelector('#pe-btn-undo');
        const redoButton = this.container?.querySelector('#pe-btn-redo');
        if (!undoButton || !redoButton || !this.fabricWrapper) return;
        undoButton.disabled = !this.fabricWrapper.canUndo?.();
        redoButton.disabled = !this.fabricWrapper.canRedo?.();
    }

    clearStatusResetTimer() {
        if (!this.statusResetTimer) return;
        clearTimeout(this.statusResetTimer);
        this.statusResetTimer = null;
    }

    setupCanvasChangeHooks() {
        const canvas = this.fabricWrapper?.canvas;
        if (!canvas) return;
        const isTransient = (target) => {
            if (!target) return true;
            if (target.excludeFromExport) return true;
            return target.objectType === 'heatmapOverlay'
                || target.objectType === 'signalOverlayBadge';
        };

        canvas.on('object:added', (event) => {
            const target = event?.target;
            if (isTransient(target)) return;
            this.queueDiagramChange('object_added', {
                objectId: target.id || target.arrowId || null,
                after: {
                    type: target.type || target.objectType || 'object',
                    layerId: target.layerId || 'base',
                },
            });
            this.scheduleSignatureRefresh();
        });

        canvas.on('object:removed', (event) => {
            const target = event?.target;
            if (isTransient(target)) return;
            this.queueDiagramChange('object_removed', {
                objectId: target.id || target.arrowId || null,
                before: {
                    type: target.type || target.objectType || 'object',
                    layerId: target.layerId || 'base',
                },
            });
            this.scheduleSignatureRefresh();
        });

        canvas.on('object:modified', (event) => {
            const target = event?.target;
            if (isTransient(target)) return;
            this.scheduleSignatureRefresh();
        });

        canvas.on('mouse:wheel', () => this.refreshZoomBadge());
        canvas.on('mouse:up', () => this.refreshZoomBadge());
    }

    setupPlatformPanels() {
        const layersHost = this.container?.querySelector('#pe-layers-list')?.parentElement;
        if (layersHost && !layersHost.querySelector('#pe-library-panel')) {
            const libraryPanel = document.createElement('section');
            libraryPanel.id = 'pe-library-panel';
            libraryPanel.className = 'mb-3 rounded-lg border border-slate-200 bg-white p-2.5';
            layersHost.insertBefore(libraryPanel, this.container.querySelector('#pe-layers-list'));
        }

        const flowPanel = this.container?.querySelector('#pe-flow-panel');
        if (flowPanel && !flowPanel.querySelector('#pe-simulation-panel')) {
            const simulationPanel = document.createElement('section');
            simulationPanel.id = 'pe-simulation-panel';
            simulationPanel.className = 'mt-3 border-t border-slate-200 pt-3';
            flowPanel.appendChild(simulationPanel);
        }
    }

    async bootstrapPlatformData() {
        await Promise.allSettled([
            this.loadPropertySchemas(),
            this.loadLibraryCatalog(),
            this.loadLibraryGuides(),
            this.loadSimulationScenarios(),
            this.loadLayerTreeState(),
        ]);
        this.renderLibraryPanel();
        this.renderSimulationPanel();
    }

    async loadPropertySchemas() {
        this.platformBusy.schemas = true;
        try {
            let rows = await platformService.listPropertySchemas(this.getTenantQueryString());
            if (!Array.isArray(rows) || rows.length === 0) {
                await platformService.seedPropertySchemas(this.getTenantQueryString());
                rows = await platformService.listPropertySchemas(this.getTenantQueryString());
            }
            const schemaByType = {};
            (rows || []).forEach((row) => {
                if (!row?.element_type || schemaByType[row.element_type]) return;
                schemaByType[row.element_type] = row.schema || {};
            });
            this.propertySchemas = schemaByType;
            this.propertiesPanel?.setSchemas(this.propertySchemas);
        } catch (error) {
            console.warn('[PlantEditor] could not load property schemas', error);
        } finally {
            this.platformBusy.schemas = false;
        }
    }

    async loadLibraryCatalog() {
        this.platformBusy.libraries = true;
        try {
            const query = this.getTenantQueryString({
                domain: this.libraryState.domain === 'all' ? null : this.libraryState.domain,
                search: this.libraryState.search || null,
                only_templates: this.libraryState.onlyTemplates ? 'true' : null,
            });
            const items = await platformService.listDiagramLibraries(query);
            this.libraryState.items = Array.isArray(items) ? items : [];
        } catch (error) {
            console.warn('[PlantEditor] could not load diagram libraries', error);
            this.libraryState.items = [];
        } finally {
            this.platformBusy.libraries = false;
            this.renderLibraryPanel();
        }
    }

    async loadLibraryGuides() {
        try {
            const query = this.getTenantQueryString({
                domain: this.libraryState.domain === 'all' ? null : this.libraryState.domain,
            });
            const guides = await platformService.listDiagramGuides(query);
            this.libraryState.guides = Array.isArray(guides) ? guides : [];
        } catch (error) {
            console.warn('[PlantEditor] could not load library guides', error);
            this.libraryState.guides = [];
        }
    }

    renderLibraryPanel() {
        const host = this.container?.querySelector('#pe-library-panel');
        if (!host) return;

        const favoriteFiltered = this.libraryState.showFavoritesOnly
            ? this.libraryState.items.filter((item) => item.favorite)
            : this.libraryState.items;
        const selectedGuide = this.libraryState.guides.find((guide) => String(guide.id) === String(this.libraryState.selectedGuideId))
            || null;

        host.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Libreria</h4>
                <button id="pe-lib-seed" class="text-[11px] px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50">Sembrar</button>
            </div>
            <div class="grid grid-cols-2 gap-1.5 mb-2">
                <select id="pe-lib-domain" class="h-8 rounded border border-slate-200 px-1.5 text-xs bg-white">
                    <option value="all" ${this.libraryState.domain === 'all' ? 'selected' : ''}>Todo</option>
                    <option value="plant" ${this.libraryState.domain === 'plant' ? 'selected' : ''}>Planta</option>
                    <option value="process" ${this.libraryState.domain === 'process' ? 'selected' : ''}>Proceso</option>
                    <option value="vsm" ${this.libraryState.domain === 'vsm' ? 'selected' : ''}>VSM</option>
                    <option value="vector" ${this.libraryState.domain === 'vector' ? 'selected' : ''}>Vectorial</option>
                </select>
                <input id="pe-lib-search" type="text" value="${esc(this.libraryState.search || '')}" placeholder="Buscar..."
                    class="h-8 rounded border border-slate-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300">
            </div>
            <div class="flex items-center justify-between mb-2 text-[11px] text-slate-500">
                <label class="inline-flex items-center gap-1">
                    <input id="pe-lib-templates" type="checkbox" class="h-3.5 w-3.5" ${this.libraryState.onlyTemplates ? 'checked' : ''}>
                    Solo plantillas
                </label>
                <label class="inline-flex items-center gap-1">
                    <input id="pe-lib-favorites-only" type="checkbox" class="h-3.5 w-3.5" ${this.libraryState.showFavoritesOnly ? 'checked' : ''}>
                    Favoritos
                </label>
            </div>
            <div id="pe-lib-list" class="max-h-40 overflow-y-auto space-y-1 pr-1">
                ${this.platformBusy.libraries
                    ? '<p class="text-xs text-slate-500">Cargando libreria...</p>'
                    : (favoriteFiltered.length
                        ? favoriteFiltered.map((item) => `
                            <article class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                                <div class="flex items-start justify-between gap-2">
                                    <button data-lib-add="${item.id}" class="text-left flex-1">
                                        <p class="text-xs font-semibold text-slate-700">${esc(item.name)}</p>
                                        <p class="text-[10px] text-slate-500">${esc(item.code)} · v${esc(item.version || '1.0.0')}</p>
                                    </button>
                                    <div class="flex items-center gap-1">
                                        <button data-lib-guide="${item.id}" class="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100">Guia</button>
                                        <button data-lib-fav="${item.id}" class="text-[10px] px-1.5 py-0.5 rounded border ${item.favorite ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500'}">★</button>
                                    </div>
                                </div>
                            </article>
                        `).join('')
                        : '<p class="text-xs text-slate-500">No hay elementos para este filtro.</p>')}
            </div>
            ${selectedGuide
                ? `<div class="mt-2 rounded-md border border-blue-100 bg-blue-50 px-2 py-1.5">
                        <p class="text-[10px] uppercase font-semibold text-blue-700 mb-1">${esc(selectedGuide.name)}</p>
                        <p class="text-[11px] text-blue-800 whitespace-pre-wrap">${esc(selectedGuide.guide_markdown || '')}</p>
                    </div>`
                : ''}
        `;

        host.querySelector('#pe-lib-seed')?.addEventListener('click', async () => {
            try {
                await platformService.seedDiagramLibraries(this.getTenantQueryString());
                await this.loadLibraryCatalog();
                await this.loadLibraryGuides();
            } catch (error) {
                console.warn('[PlantEditor] seed diagram libraries failed', error);
            }
        });

        host.querySelector('#pe-lib-domain')?.addEventListener('change', async (event) => {
            this.libraryState.domain = event.target.value || 'all';
            await this.loadLibraryGuides();
            await this.loadLibraryCatalog();
        });

        host.querySelector('#pe-lib-search')?.addEventListener('input', (event) => {
            this.libraryState.search = event.target.value || '';
            window.clearTimeout(this.librarySearchTimer);
            this.librarySearchTimer = window.setTimeout(() => {
                void this.loadLibraryCatalog();
            }, 260);
        });

        host.querySelector('#pe-lib-templates')?.addEventListener('change', (event) => {
            this.libraryState.onlyTemplates = Boolean(event.target.checked);
            void this.loadLibraryCatalog();
        });

        host.querySelector('#pe-lib-favorites-only')?.addEventListener('change', (event) => {
            this.libraryState.showFavoritesOnly = Boolean(event.target.checked);
            this.renderLibraryPanel();
        });

        host.querySelectorAll('[data-lib-fav]').forEach((node) => {
            node.addEventListener('click', async () => {
                const itemId = node.dataset.libFav;
                const item = this.libraryState.items.find((row) => String(row.id) === String(itemId));
                if (!item) return;
                try {
                    if (item.favorite) {
                        await platformService.unfavoriteDiagramLibrary(item.id);
                    } else {
                        await platformService.favoriteDiagramLibrary(item.id);
                    }
                    await this.loadLibraryCatalog();
                } catch (error) {
                    console.warn('[PlantEditor] favorite toggle failed', error);
                }
            });
        });

        host.querySelectorAll('[data-lib-guide]').forEach((node) => {
            node.addEventListener('click', () => {
                this.libraryState.selectedGuideId = node.dataset.libGuide || null;
                this.renderLibraryPanel();
            });
        });

        host.querySelectorAll('[data-lib-add]').forEach((node) => {
            node.addEventListener('click', () => {
                const itemId = node.dataset.libAdd;
                const item = this.libraryState.items.find((row) => String(row.id) === String(itemId));
                if (!item) return;
                this.insertLibraryItem(item);
            });
        });
    }

    insertLibraryItem(item) {
        if (!item || !this.fabricWrapper?.canvas) return;
        const shape = item.shape || {};
        if (item.element_type === 'template') {
            const templateKey = shape.template_key || shape.case_id || null;
            if (templateKey) {
                this.loadExampleCase(templateKey);
                return;
            }
        }

        const center = this.fabricWrapper.canvas.getVpCenter();
        const preset = this.diagramPresets[this.diagramMode] || this.diagramPresets.general;
        const sharedData = {
            data: {
                ...(shape.data || {}),
                libraryItemId: item.id,
                libraryCode: item.code,
            },
        };

        if (item.element_type === 'textbox' || shape.type === 'textbox') {
            const textNode = new fabric.Textbox(shape.text || item.name || 'Nodo', {
                left: center.x,
                top: center.y,
                width: Number(shape.width || 160),
                fontSize: Number(shape.fontSize || 16),
                fontFamily: shape.fontFamily || 'Arial',
                fill: shape.fill || '#0f172a',
                backgroundColor: shape.backgroundColor || 'rgba(255,255,255,0.85)',
                stroke: shape.stroke || '#cbd5e1',
                strokeWidth: Number(shape.strokeWidth || 1),
                padding: Number(shape.padding || 8),
                ...sharedData,
            });
            this.fabricWrapper.canvas.add(textNode);
            this.assignObjectToActiveLayer(textNode);
            this.fabricWrapper.canvas.setActiveObject(textNode);
            this.fabricWrapper.canvas.requestRenderAll();
            this.queueDiagramChange('library_insert', {
                objectId: textNode.id || null,
                after: { libraryCode: item.code, elementType: item.element_type },
            });
            return;
        }

        if (item.element_type === 'arrowLine') {
            const line = new fabric.Line([
                center.x - 90,
                center.y,
                center.x + 90,
                center.y,
            ], {
                stroke: shape.stroke || '#8b5cf6',
                strokeWidth: Number(shape.strokeWidth || 3),
                objectType: 'arrowLine',
                flowData: {
                    ...(shape.flowData || {}),
                    type: 'material',
                    capacity: shape.capacity || '100 u/h',
                },
                ...sharedData,
            });
            this.fabricWrapper.canvas.add(line);
            this.assignObjectToActiveLayer(line);
            this.fabricWrapper.canvas.setActiveObject(line);
            this.fabricWrapper.canvas.requestRenderAll();
            this.queueDiagramChange('library_insert', {
                objectId: line.id || null,
                after: { libraryCode: item.code, elementType: item.element_type },
            });
            return;
        }

        const objectType = shape.type || (item.element_type === 'ellipse' ? 'ellipse' : 'rect');
        const request = {
            type: objectType,
            left: center.x,
            top: center.y,
            width: Number(shape.width || 120),
            height: Number(shape.height || 80),
            rx: Number(shape.rx || 50),
            ry: Number(shape.ry || 50),
            fill: shape.fill || preset.fill,
            stroke: shape.stroke || preset.stroke,
            strokeWidth: Number(shape.strokeWidth || 2),
            ...sharedData,
        };
        Promise.resolve(this.fabricWrapper.addObject(request)).then((created) => {
            if (!created) return;
            this.assignObjectToActiveLayer(created);
            this.fabricWrapper.canvas.setActiveObject(created);
            this.fabricWrapper.canvas.requestRenderAll();
            this.queueDiagramChange('library_insert', {
                objectId: created.id || null,
                after: { libraryCode: item.code, elementType: item.element_type },
            });
        });
    }

    queueDiagramChange(changeType, payload = {}) {
        const diagramId = this.getCurrentDiagramUuid();
        if (!diagramId) return;
        this.pendingChangeLogs.push({
            diagram_id: diagramId,
            object_id: payload.objectId || null,
            change_type: changeType || 'update',
            before: payload.before || null,
            after: payload.after || null,
        });
        if (this.changeLogSaveTimer) {
            clearTimeout(this.changeLogSaveTimer);
        }
        this.changeLogSaveTimer = setTimeout(() => {
            this.changeLogSaveTimer = null;
            void this.flushPendingChanges();
        }, 750);
    }

    async flushPendingChanges() {
        if (!this.pendingChangeLogs.length) return;
        const queue = [...this.pendingChangeLogs];
        this.pendingChangeLogs = [];
        await Promise.allSettled(queue.map((entry) => platformService.createDiagramChange(entry, this.getTenantQueryString())));
    }

    scheduleLayerTreePersist(payload = null) {
        if (this.layerTreeSaveTimer) {
            clearTimeout(this.layerTreeSaveTimer);
        }
        this.layerTreeSaveTimer = setTimeout(() => {
            this.layerTreeSaveTimer = null;
            void this.saveLayerTreeState(payload);
        }, 800);
    }

    async saveLayerTreeState(payload = null) {
        const body = payload || {
            tree: this.layerManager.getLayerTree(),
            uiState: this.layerManager.getUiState(),
        };
        const nextPayload = {
            diagram_id: this.getCurrentDiagramUuid(),
            tree: body.tree || this.layerManager.getLayerTree(),
            ui_state: body.uiState || this.layerManager.getUiState(),
        };
        try {
            await platformService.saveLayerTree(nextPayload, this.getTenantQueryString());
        } catch (error) {
            console.warn('[PlantEditor] layer-tree save failed', error);
        }
    }

    async loadLayerTreeState() {
        try {
            const diagramId = this.getCurrentDiagramUuid();
            const query = this.getTenantQueryString({ diagram_id: diagramId || null });
            const row = await platformService.getLayerTree(query);
            if (row?.tree && Array.isArray(row.tree.layers) && row.tree.layers.length) {
                this.layerManager.importTree(row.tree, row.ui_state || {});
            }
        } catch (error) {
            console.warn('[PlantEditor] layer-tree load failed', error);
        }
    }

    async loadSimulationScenarios() {
        this.platformBusy.simulation = true;
        try {
            const query = this.getTenantQueryString({
                asset_id: this.contextAssetId || null,
            });
            const rows = await platformService.listSimulationScenarios(query);
            this.simulationState.scenarios = Array.isArray(rows) ? rows : [];
            const selectedExists = this.simulationState.scenarios.some(
                (row) => String(row.id) === String(this.simulationState.selectedScenarioId || ''),
            );
            if (!selectedExists) {
                this.simulationState.selectedScenarioId = null;
                this.simulationState.selectedResultId = null;
            }
            if (!this.simulationState.selectedScenarioId && this.simulationState.scenarios.length) {
                this.simulationState.selectedScenarioId = this.simulationState.scenarios[0].id;
                await this.loadSimulationResults();
                await this.loadSimulationDecisions();
            }
        } catch (error) {
            console.warn('[PlantEditor] simulation scenarios load failed', error);
            this.simulationState.scenarios = [];
        } finally {
            this.platformBusy.simulation = false;
            this.renderSimulationPanel();
        }
    }

    buildSimulationConfigFromCanvas() {
        const nodes = this.collectAssetObjects().map((obj, idx) => {
            const payload = obj.data || {};
            const label = payload.label || obj.text || `Nodo ${idx + 1}`;
            const capacity = Number(payload.capacity || payload.capacity_per_hour || 60);
            const cycleTimeSec = Number(payload.cycleTimeSec || payload.cycle_time_sec || 60);
            return {
                id: String(payload.assetId || obj.assetId || `node-${idx + 1}`),
                label: String(label),
                capacity_per_hour: Number.isFinite(capacity) ? capacity : 60,
                process_time_sec: Number.isFinite(cycleTimeSec) ? cycleTimeSec : 60,
                availability: Number(payload.availability || 1),
            };
        });
        const connectors = this.getFlowConnectors();
        const routes = connectors
            .filter((connector) => connector.fromAssetId && connector.toAssetId)
            .map((connector) => ({
                from: String(connector.fromAssetId),
                to: String(connector.toAssetId),
                share: Number(connector.line?.flowData?.share || 1),
            }));
        return {
            hours: 8,
            demand_per_hour: Math.max(10, this.flowSimulation.tokens * 16),
            variability: { coefficient: 0.12 },
            thresholds: {
                green: Number(this.flowSimulation.thresholdGreen || 0.85),
                yellow: Number(this.flowSimulation.thresholdYellow || 1.15),
            },
            nodes,
            routes,
        };
    }

    async createOrUpdateSimulationScenario() {
        const nameInput = this.container?.querySelector('#pe-sim-name');
        const name = String(nameInput?.value || '').trim() || `Escenario ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
        const config = this.buildSimulationConfigFromCanvas();
        const selectedId = this.simulationState.selectedScenarioId;

        if (selectedId) {
            await platformService.updateSimulationScenario(selectedId, {
                name,
                config,
                mode: 'flow',
                is_active: true,
            });
        } else {
            const created = await platformService.createSimulationScenario({
                name,
                asset_id: this.contextAssetId || null,
                diagram_id: this.getCurrentDiagramUuid(),
                mode: 'flow',
                config,
            }, this.getTenantQueryString());
            this.simulationState.selectedScenarioId = created?.id || null;
        }
        await this.loadSimulationScenarios();
    }

    async loadSimulationResults() {
        const scenarioId = this.simulationState.selectedScenarioId;
        if (!scenarioId) {
            this.simulationState.results = [];
            return;
        }
        try {
            const rows = await platformService.listSimulationResults(scenarioId, 'limit=30');
            this.simulationState.results = Array.isArray(rows) ? rows : [];
            if (!this.simulationState.selectedResultId && this.simulationState.results.length) {
                this.simulationState.selectedResultId = this.simulationState.results[0].id;
            }
        } catch (error) {
            console.warn('[PlantEditor] simulation results load failed', error);
            this.simulationState.results = [];
        }
    }

    async loadSimulationDecisions() {
        const scenarioId = this.simulationState.selectedScenarioId;
        if (!scenarioId) {
            this.simulationState.decisions = [];
            return;
        }
        try {
            const rows = await platformService.listSimulationDecisions(scenarioId);
            this.simulationState.decisions = Array.isArray(rows) ? rows : [];
        } catch (error) {
            console.warn('[PlantEditor] simulation decisions load failed', error);
            this.simulationState.decisions = [];
        }
    }

    async runSelectedScenario() {
        const scenarioId = this.simulationState.selectedScenarioId;
        if (!scenarioId) return;
        const runLabelInput = this.container?.querySelector('#pe-sim-run-label');
        const runLabel = String(runLabelInput?.value || '').trim() || `run-${Date.now()}`;
        const response = await platformService.runSimulationScenario(scenarioId, {
            run_label: runLabel,
            is_baseline: false,
            config_override: {
                thresholds: {
                    green: this.flowSimulation.thresholdGreen,
                    yellow: this.flowSimulation.thresholdYellow,
                },
            },
        });
        this.simulationState.latestRun = response?.result || null;
        await this.loadSimulationResults();
        this.renderSimulationPanel();
    }

    async compareScenarioResults() {
        const scenarioId = this.simulationState.selectedScenarioId;
        if (!scenarioId) return;
        try {
            this.simulationState.comparison = await platformService.compareSimulationResults(scenarioId);
        } catch (error) {
            console.warn('[PlantEditor] compare simulation failed', error);
            this.simulationState.comparison = null;
        }
    }

    async syncSimulationActions() {
        const scenarioId = this.simulationState.selectedScenarioId;
        if (!scenarioId) return;
        const selectedResult = this.simulationState.selectedResultId;
        const query = selectedResult ? `result_id=${encodeURIComponent(selectedResult)}` : '';
        this.simulationState.lastSync = await platformService.syncSimulationActions(scenarioId, query);
    }

    async exportSimulationExecutive() {
        const scenarioId = this.simulationState.selectedScenarioId;
        if (!scenarioId) return;
        const selectedResult = this.simulationState.selectedResultId;
        const query = selectedResult ? `result_id=${encodeURIComponent(selectedResult)}` : '';
        this.simulationState.lastExport = await platformService.exportSimulationExecutive(scenarioId, query);
    }

    async addSimulationDecision() {
        const scenarioId = this.simulationState.selectedScenarioId;
        if (!scenarioId) return;
        const titleInput = this.container?.querySelector('#pe-sim-decision-title');
        const notesInput = this.container?.querySelector('#pe-sim-decision-notes');
        const title = String(titleInput?.value || '').trim();
        if (!title) return;
        await platformService.createSimulationDecision(scenarioId, {
            result_id: this.simulationState.selectedResultId || null,
            title,
            notes: String(notesInput?.value || '').trim() || null,
            expected_impact: {},
            status: 'proposed',
        });
        if (titleInput) titleInput.value = '';
        if (notesInput) notesInput.value = '';
        await this.loadSimulationDecisions();
    }

    renderSimulationPanel() {
        const host = this.container?.querySelector('#pe-simulation-panel');
        if (!host) return;

        const selectedScenario = this.simulationState.scenarios.find((row) => String(row.id) === String(this.simulationState.selectedScenarioId)) || null;
        const selectedResult = this.simulationState.results.find((row) => String(row.id) === String(this.simulationState.selectedResultId))
            || this.simulationState.results[0]
            || null;
        const resultPayload = selectedResult?.result || this.simulationState.latestRun || null;
        const criticalPoints = Array.isArray(resultPayload?.critical_points) ? resultPayload.critical_points.slice(0, 5) : [];
        const recommendations = Array.isArray(resultPayload?.recommendations) ? resultPayload.recommendations.slice(0, 4) : [];

        host.innerHTML = `
            <div class="space-y-2">
                <h4 class="text-xs uppercase font-semibold tracking-wide text-slate-500">Simulacion avanzada</h4>
                <div class="grid grid-cols-1 gap-1.5">
                    <input id="pe-sim-name" value="${esc(selectedScenario?.name || '')}" placeholder="Nombre escenario"
                        class="h-8 rounded border border-slate-200 px-2 text-xs">
                    <select id="pe-sim-scenario" class="h-8 rounded border border-slate-200 px-2 text-xs bg-white">
                        <option value="">(Nuevo escenario)</option>
                        ${this.simulationState.scenarios.map((row) => `<option value="${row.id}" ${String(row.id) === String(this.simulationState.selectedScenarioId) ? 'selected' : ''}>${esc(row.name)}</option>`).join('')}
                    </select>
                    <div class="grid grid-cols-2 gap-1.5">
                        <button id="pe-sim-save" class="h-8 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">Guardar</button>
                        <button id="pe-sim-run" class="h-8 rounded bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600">Ejecutar</button>
                    </div>
                    <input id="pe-sim-run-label" placeholder="Etiqueta run" class="h-8 rounded border border-slate-200 px-2 text-xs">
                    <select id="pe-sim-result" class="h-8 rounded border border-slate-200 px-2 text-xs bg-white">
                        <option value="">Ultimo resultado</option>
                        ${this.simulationState.results.map((row) => `<option value="${row.id}" ${String(row.id) === String(this.simulationState.selectedResultId) ? 'selected' : ''}>${esc(row.run_label || row.created_at || row.id)}</option>`).join('')}
                    </select>
                    <div class="grid grid-cols-3 gap-1.5">
                        <button id="pe-sim-compare" class="h-8 rounded border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-50">Comparar</button>
                        <button id="pe-sim-sync" class="h-8 rounded border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-50">Sync acciones</button>
                        <button id="pe-sim-export" class="h-8 rounded border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-50">Export</button>
                    </div>
                </div>
                ${resultPayload ? `
                    <div class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                        <p class="text-[11px] text-slate-500">KPI</p>
                        <p class="text-xs text-slate-700">Throughput: <span class="font-semibold">${esc(resultPayload.kpis?.throughput_per_hour || 0)}</span> u/h</p>
                        <p class="text-xs text-slate-700">Lead time: <span class="font-semibold">${esc(resultPayload.kpis?.lead_time_min || 0)}</span> min</p>
                        <p class="text-xs text-slate-700">WIP: <span class="font-semibold">${esc(resultPayload.kpis?.wip_units || 0)}</span></p>
                        <p class="text-xs text-slate-700">Cumplimiento: <span class="font-semibold">${esc(resultPayload.kpis?.compliance_pct || 0)}%</span></p>
                    </div>
                ` : '<p class="text-xs text-slate-500">Sin corridas aun.</p>'}
                ${criticalPoints.length ? `
                    <div class="rounded-md border border-red-200 bg-red-50 px-2 py-1.5">
                        <p class="text-[11px] font-semibold text-red-700 mb-1">Ranking puntos criticos</p>
                        ${criticalPoints.map((point, idx) => `<p class="text-[11px] text-red-800">${idx + 1}. ${esc(point.label || point.node_id)} · score ${esc(point.criticality_score || '-')}</p>`).join('')}
                    </div>
                ` : ''}
                ${recommendations.length ? `
                    <div class="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
                        <p class="text-[11px] font-semibold text-amber-700 mb-1">Recomendaciones</p>
                        ${recommendations.map((row) => `<p class="text-[11px] text-amber-800">- ${esc(row.message || row.type || '')}</p>`).join('')}
                    </div>
                ` : ''}
                ${this.simulationState.comparison ? `
                    <div class="rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5">
                        <p class="text-[11px] font-semibold text-blue-700 mb-1">Comparacion</p>
                        ${this.simulationState.comparison.comparison.map((row) => `<p class="text-[11px] text-blue-800">${esc(row.metric)}: ${esc(row.left)} -> ${esc(row.right)} (Δ ${esc(row.delta)})</p>`).join('')}
                    </div>
                ` : ''}
                <div class="rounded-md border border-slate-200 bg-white px-2 py-1.5">
                    <p class="text-[11px] font-semibold text-slate-600 mb-1">Decisiones</p>
                    <input id="pe-sim-decision-title" placeholder="Titulo decision" class="h-7 w-full rounded border border-slate-200 px-2 text-xs mb-1.5">
                    <input id="pe-sim-decision-notes" placeholder="Notas" class="h-7 w-full rounded border border-slate-200 px-2 text-xs mb-1.5">
                    <button id="pe-sim-decision-add" class="h-7 w-full rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-50">Agregar decision</button>
                    <div class="mt-1.5 max-h-20 overflow-y-auto space-y-1">
                        ${this.simulationState.decisions.slice(0, 6).map((row) => `<p class="text-[11px] text-slate-700">${esc(row.title)} · <span class="text-slate-500">${esc(row.status || 'proposed')}</span></p>`).join('') || '<p class="text-[11px] text-slate-500">Sin decisiones registradas.</p>'}
                    </div>
                </div>
            </div>
        `;

        host.querySelector('#pe-sim-scenario')?.addEventListener('change', async (event) => {
            this.simulationState.selectedScenarioId = event.target.value || null;
            this.simulationState.selectedResultId = null;
            this.simulationState.comparison = null;
            await this.loadSimulationResults();
            await this.loadSimulationDecisions();
            this.renderSimulationPanel();
        });

        host.querySelector('#pe-sim-result')?.addEventListener('change', (event) => {
            this.simulationState.selectedResultId = event.target.value || null;
            this.renderSimulationPanel();
        });

        host.querySelector('#pe-sim-save')?.addEventListener('click', async () => {
            try {
                await this.createOrUpdateSimulationScenario();
            } catch (error) {
                console.warn('[PlantEditor] save scenario failed', error);
            }
        });

        host.querySelector('#pe-sim-run')?.addEventListener('click', async () => {
            try {
                await this.runSelectedScenario();
                this.setStatus('Simulacion ejecutada', 'ok');
            } catch (error) {
                console.warn('[PlantEditor] run scenario failed', error);
                this.setStatus('Error ejecutando simulacion', 'warn');
            }
        });

        host.querySelector('#pe-sim-compare')?.addEventListener('click', async () => {
            await this.compareScenarioResults();
            this.renderSimulationPanel();
        });

        host.querySelector('#pe-sim-sync')?.addEventListener('click', async () => {
            try {
                await this.syncSimulationActions();
                this.setStatus('Acciones sincronizadas', 'ok');
            } catch (error) {
                console.warn('[PlantEditor] sync simulation actions failed', error);
                this.setStatus('No se pudo sincronizar acciones', 'warn');
            }
        });

        host.querySelector('#pe-sim-export')?.addEventListener('click', async () => {
            try {
                await this.exportSimulationExecutive();
                if (this.simulationState.lastExport?.summary) {
                    const blob = new Blob([this.simulationState.lastExport.summary], { type: 'text/plain;charset=utf-8' });
                    this.fileManager.downloadBlob(blob, `simulacion-${Date.now()}.txt`);
                }
            } catch (error) {
                console.warn('[PlantEditor] export simulation failed', error);
            }
        });

        host.querySelector('#pe-sim-decision-add')?.addEventListener('click', async () => {
            try {
                await this.addSimulationDecision();
                this.renderSimulationPanel();
            } catch (error) {
                console.warn('[PlantEditor] add simulation decision failed', error);
            }
        });
    }

    setupToolbar() {
        const btnLoadDB = this.container.querySelector('#pe-btn-load-db');
        btnLoadDB?.addEventListener('click', () => {
            this.resourceManager.open('load', null, { contextAssetId: this.contextAssetId });
        });

        const btnSaveDB = this.container.querySelector('#pe-btn-save-db');
        btnSaveDB?.addEventListener('click', () => {
            const json = this.fileManager.toJSON();
            const png = this.fabricWrapper.canvas.toDataURL({
                format: 'png',
                multiplier: 0.5,
                quality: 0.8
            });
            this.resourceManager.open('save', { json: JSON.stringify(json), screenshot: png }, { contextAssetId: this.contextAssetId });
        });

        const btnUndo = this.container.querySelector('#pe-btn-undo');
        btnUndo?.addEventListener('click', () => {
            this.fabricWrapper?.undo?.();
            this.scheduleSignatureRefresh(80);
            this.refreshZoomBadge();
            this.refreshHistoryButtons();
        });

        const btnRedo = this.container.querySelector('#pe-btn-redo');
        btnRedo?.addEventListener('click', () => {
            this.fabricWrapper?.redo?.();
            this.scheduleSignatureRefresh(80);
            this.refreshZoomBadge();
            this.refreshHistoryButtons();
        });

        const btnFit = this.container.querySelector('#pe-btn-fit');
        btnFit?.addEventListener('click', () => {
            this.fabricWrapper?.fitToContent?.();
            this.refreshZoomBadge();
            this.setStatus('Vista ajustada al contenido', 'info');
        });

        const btnResetView = this.container.querySelector('#pe-btn-reset-view');
        btnResetView?.addEventListener('click', () => {
            this.fabricWrapper?.resetView?.();
            this.refreshZoomBadge();
            this.setStatus('Vista restablecida', 'ready');
        });

        const btnExportJson = this.container.querySelector('#pe-btn-export-json');
        btnExportJson?.addEventListener('click', () => {
            this.fileManager.downloadJSON(`diagram-${Date.now()}.json`);
        });

        const btnExportPng = this.container.querySelector('#pe-btn-export-png');
        btnExportPng?.addEventListener('click', () => {
            this.fileManager.downloadPNG(`diagram-${Date.now()}.png`);
        });

        const btnExportSvg = this.container.querySelector('#pe-btn-export-svg');
        btnExportSvg?.addEventListener('click', () => {
            this.fileManager.downloadSVG(`diagram-${Date.now()}.svg`);
        });

        const btnAnalyze = this.container.querySelector('#pe-btn-analyze');
        if (btnAnalyze) {
            btnAnalyze.addEventListener('click', () => this.toggleCapacityAnalysis(btnAnalyze));
        }

        const btnFlowPanel = this.container.querySelector('#pe-btn-flow-panel');
        btnFlowPanel?.addEventListener('click', () => this.toggleFlowPanel());

        const modeSelect = this.container.querySelector('#pe-diagram-mode');
        if (modeSelect) {
            modeSelect.value = this.diagramMode;
            modeSelect.addEventListener('change', (event) => {
                this.applyDiagramMode(event.target.value);
            });
        }
    }

    setupHeatmapHooks() {
        const canvas = this.fabricWrapper?.canvas;
        if (!canvas) return;

        const rerender = () => {
            this.scheduleHeatmapRender();
            this.scheduleSignalOverlayRender();
        };
        canvas.on('object:moving', rerender);
        canvas.on('object:modified', rerender);
        canvas.on('object:removed', (event) => {
            if (event?.target?.objectType === 'heatmapOverlay') return;
            if (event?.target?.objectType === 'signalOverlayBadge') return;
            rerender();
        });
        canvas.on('mouse:wheel', rerender);
        canvas.on('mouse:up', rerender);
        canvas.on('object:added', (event) => {
            if (this.heatmap.rendering) return;
            if (event?.target?.objectType === 'heatmapOverlay') return;
            if (event?.target?.objectType === 'signalOverlayBadge') return;
            rerender();
        });
    }

    getD3Instance() {
        return window.d3 || null;
    }

    initHeatmapOverlay() {
        const container = this.container?.querySelector('#pe-canvas-container');
        if (!container || this.heatmap.overlayEl) return;

        const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        overlay.id = 'pe-heatmap-overlay';
        overlay.setAttribute('class', 'absolute inset-0 pointer-events-none hidden');
        overlay.setAttribute('style', 'z-index: 7;');
        container.appendChild(overlay);
        this.heatmap.overlayEl = overlay;
        this.syncHeatmapOverlaySize();

        const d3 = this.getD3Instance();
        if (d3) {
            const root = d3.select(overlay);
            root.selectAll('*').remove();
            this.heatmap.d3Root = root;
            this.heatmap.d3Defs = root.append('defs');
            this.heatmap.d3Layer = root.append('g').attr('data-layer', 'heatmap');
        }

        if (!this.heatmap.resizeObserver) {
            this.heatmap.resizeObserver = new ResizeObserver(() => {
                this.syncHeatmapOverlaySize();
                this.scheduleHeatmapRender();
            });
            this.heatmap.resizeObserver.observe(container);
        }
    }

    syncHeatmapOverlaySize() {
        const container = this.container?.querySelector('#pe-canvas-container');
        const overlay = this.heatmap.overlayEl;
        if (!container || !overlay) return;
        overlay.setAttribute('width', String(container.clientWidth || 0));
        overlay.setAttribute('height', String(container.clientHeight || 0));
        overlay.setAttribute('viewBox', `0 0 ${container.clientWidth || 0} ${container.clientHeight || 0}`);
    }

    setHeatmapOverlayVisible(visible) {
        const overlay = this.heatmap.overlayEl;
        if (!overlay) return;
        if (visible) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    scheduleHeatmapRender() {
        if (!this.heatmap.enabled) return;
        if (this.heatmap.renderRaf) {
            cancelAnimationFrame(this.heatmap.renderRaf);
        }
        this.heatmap.renderRaf = requestAnimationFrame(() => {
            this.heatmap.renderRaf = null;
            this.renderHeatmapLayer();
        });
    }

    setupSignalControls() {
        const button = this.container?.querySelector('#pe-btn-signals');
        button?.addEventListener('click', () => this.toggleSignals());
        this.updateSignalsButtonState();
        this.updateFlowSignalNote();
    }

    updateSignalsButtonState() {
        const button = this.container?.querySelector('#pe-btn-signals');
        if (!button) return;
        const label = button.querySelector('span');
        if (label) {
            if (!this.signalOverlay.enabled) label.textContent = 'Señales OFF';
            else label.textContent = this.signalOverlay.loading ? 'Señales...' : 'Señales ON';
        }

        button.classList.toggle('bg-sky-100', this.signalOverlay.enabled);
        button.classList.toggle('text-sky-800', this.signalOverlay.enabled);
        button.classList.toggle('ring-2', this.signalOverlay.enabled);
        button.classList.toggle('ring-sky-300', this.signalOverlay.enabled);
        button.classList.toggle('bg-sky-50', !this.signalOverlay.enabled);
        button.classList.toggle('text-sky-700', !this.signalOverlay.enabled);
    }

    updateFlowSignalNote() {
        const note = this.container?.querySelector('#pe-flow-signal-note');
        if (!note) return;

        if (!this.signalOverlay.enabled) {
            note.className = 'rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600';
            note.textContent = 'Señales SPC/CAPA: OFF';
            return;
        }

        if (this.signalOverlay.loading) {
            note.className = 'rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-xs text-sky-700';
            note.textContent = 'Señales SPC/CAPA: actualizando...';
            return;
        }

        const count = this.signalOverlay.valuesByAssetId.size;
        const updated = this.signalOverlay.lastUpdatedAt
            ? new Date(this.signalOverlay.lastUpdatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            : '--:--';
        note.className = 'rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-xs text-sky-700';
        note.textContent = `Señales SPC/CAPA: ON (${count} activos, ${updated})`;
    }

    toggleSignals(forceState) {
        const nextState = typeof forceState === 'boolean' ? forceState : !this.signalOverlay.enabled;
        this.signalOverlay.enabled = nextState;
        this.updateSignalsButtonState();
        this.updateFlowSignalNote();

        if (!nextState) {
            this.stopSignalPolling();
            this.clearSignalOverlays();
            this.restoreAssetStatusStrokes();
            this.signalOverlay.valuesByAssetId.clear();
            this.signalOverlay.lastUpdatedAt = null;
            this.heatmap.valuesByAssetId.clear();
            if (this.heatmap.enabled) {
                this.renderHeatmapLayer();
            }
            if (this.flowSimulation.running) {
                this.flowSimulation.connectors = this.getFlowConnectors();
                this.updateFlowSemaforo();
            }
            this.setStatus('Señales SPC/CAPA desactivadas', 'ready');
            return;
        }

        this.startSignalPolling();
        this.scheduleSignalRefresh(0);
        this.setStatus('Señales SPC/CAPA activas', 'info');
    }

    buildSignalQuery() {
        if (!this.contextAssetId) return '';
        const params = new URLSearchParams({ asset_id: String(this.contextAssetId) });
        return params.toString();
    }

    scheduleSignalRefresh(delayMs = this.signalOverlay.intervalMs) {
        if (!this.signalOverlay.enabled) return;
        if (this.signalOverlay.timerId) {
            clearTimeout(this.signalOverlay.timerId);
            this.signalOverlay.timerId = null;
        }
        const wait = Math.max(0, Number(delayMs) || 0);
        this.signalOverlay.timerId = setTimeout(() => {
            this.signalOverlay.timerId = null;
            void this.refreshSignalSnapshot();
        }, wait);
    }

    startSignalPolling() {
        if (this.signalOverlay.polling) return;
        this.signalOverlay.polling = true;
        this.scheduleSignalRefresh(0);
    }

    stopSignalPolling() {
        this.signalOverlay.polling = false;
        if (this.signalOverlay.timerId) {
            clearTimeout(this.signalOverlay.timerId);
            this.signalOverlay.timerId = null;
        }
    }

    normalizeSignalStatus(pressure, entry) {
        if ((entry.ncCritical || 0) > 0 || (entry.capaOverdue || 0) > 0 || (entry.spcRed || 0) > 0) {
            return 'red';
        }
        if (pressure >= 0.7) return 'red';
        if (pressure >= 0.35 || (entry.spcYellow || 0) > 0) return 'yellow';
        return 'green';
    }

    async refreshSignalSnapshot() {
        if (!this.signalOverlay.enabled || this.signalOverlay.loading) return;
        this.signalOverlay.loading = true;
        this.updateSignalsButtonState();
        this.updateFlowSignalNote();

        try {
            const query = this.buildSignalQuery();
            const [issuesRes, specsRes, actionsRes] = await Promise.allSettled([
                meetingService.qualityIssues(query),
                qualityService.getWeightSpecs(query),
                improvementService.getActions(query),
            ]);

            const issues = issuesRes.status === 'fulfilled' && Array.isArray(issuesRes.value) ? issuesRes.value : [];
            const specs = specsRes.status === 'fulfilled' && Array.isArray(specsRes.value) ? specsRes.value : [];
            const actions = actionsRes.status === 'fulfilled' && Array.isArray(actionsRes.value) ? actionsRes.value : [];
            const today = new Date().toISOString().slice(0, 10);
            const byAssetId = new Map();

            const ensureEntry = (assetId) => {
                const key = String(assetId || '').trim();
                if (!key) return null;
                if (!byAssetId.has(key)) {
                    byAssetId.set(key, {
                        assetId: key,
                        ncOpen: 0,
                        ncCritical: 0,
                        capaOpen: 0,
                        capaOverdue: 0,
                        spcGreen: 0,
                        spcYellow: 0,
                        spcRed: 0,
                        actionsOpen: 0,
                        actionsOverdue: 0,
                        pressure: 0,
                        status: 'green',
                    });
                }
                return byAssetId.get(key);
            };

            issues.forEach((issue) => {
                const entry = ensureEntry(issue.asset_id);
                if (!entry) return;
                const issueType = String(issue.issue_type || '').toLowerCase();
                const severity = String(issue.severity || '').toLowerCase();
                if (issueType === 'non_conformity') {
                    entry.ncOpen += 1;
                    if (severity === 'critical') entry.ncCritical += 1;
                } else if (issueType === 'capa_action') {
                    entry.capaOpen += 1;
                    const dueDate = String(issue.due_date || '').slice(0, 10);
                    if (dueDate && dueDate < today) {
                        entry.capaOverdue += 1;
                    }
                }
            });

            specs.forEach((spec) => {
                const entry = ensureEntry(spec.asset_id);
                if (!entry) return;
                const color = String(spec.last_status_color || '').toLowerCase();
                if (color === 'red') entry.spcRed += 1;
                else if (color === 'yellow') entry.spcYellow += 1;
                else if (color === 'green') entry.spcGreen += 1;
            });

            actions.forEach((action) => {
                const assetId = String(action.asset_id || '').trim();
                if (!assetId || this.isClosedStatus(action.status)) return;
                const entry = ensureEntry(assetId);
                if (!entry) return;
                entry.actionsOpen += 1;
                const dueDate = String(action.due_date || '').slice(0, 10);
                if (dueDate && dueDate < today) entry.actionsOverdue += 1;
            });

            byAssetId.forEach((entry) => {
                const spcRisk = (entry.spcRed * 0.55) + (entry.spcYellow * 0.28);
                const ncRisk = (entry.ncOpen * 0.22) + (entry.ncCritical * 0.4);
                const capaRisk = (entry.capaOpen * 0.2) + (entry.capaOverdue * 0.36);
                const actionRisk = (Math.min(entry.actionsOpen, 8) * 0.04) + (entry.actionsOverdue * 0.12);
                const raw = spcRisk + ncRisk + capaRisk + actionRisk;
                const pressure = Math.max(0, Math.min(1, raw / 2.0));
                entry.pressure = pressure;
                entry.status = this.normalizeSignalStatus(pressure, entry);
            });

            this.signalOverlay.valuesByAssetId = byAssetId;
            this.signalOverlay.lastUpdatedAt = new Date().toISOString();
            this.applySignalDataToVisuals();
        } catch (error) {
            console.warn('[PlantEditor] signal polling failed', error);
        } finally {
            this.signalOverlay.loading = false;
            this.updateSignalsButtonState();
            this.updateFlowSignalNote();
            if (this.signalOverlay.polling && this.signalOverlay.enabled) {
                this.scheduleSignalRefresh(this.signalOverlay.intervalMs);
            }
        }
    }

    isClosedStatus(status = '') {
        const normalized = String(status || '').trim().toLowerCase();
        return ['closed', 'verified', 'approved', 'done', 'completed', 'cerrado', 'verificado', 'aprobado'].includes(normalized);
    }

    applySignalDataToVisuals() {
        this.heatmap.valuesByAssetId.clear();
        this.signalOverlay.valuesByAssetId.forEach((entry, assetId) => {
            this.setHeatmapValue(assetId, Number(entry.pressure || 0));
            this.applyRealtimeAssetStatus(assetId, entry.status);
        });
        if (this.heatmap.enabled) {
            this.scheduleHeatmapRender();
        }
        this.scheduleSignalOverlayRender();
        if (this.flowSimulation.running) {
            this.flowSimulation.connectors = this.getFlowConnectors();
            this.updateFlowSemaforo();
        }
        this.updateFlowSignalNote();
    }

    scheduleSignalOverlayRender() {
        if (!this.signalOverlay.enabled) return;
        if (this.signalOverlay.renderRaf) {
            cancelAnimationFrame(this.signalOverlay.renderRaf);
        }
        this.signalOverlay.renderRaf = requestAnimationFrame(() => {
            this.signalOverlay.renderRaf = null;
            this.renderSignalOverlays();
        });
    }

    clearSignalOverlays() {
        if (this.signalOverlay.renderRaf) {
            cancelAnimationFrame(this.signalOverlay.renderRaf);
            this.signalOverlay.renderRaf = null;
        }
        const canvas = this.fabricWrapper?.canvas;
        if (!canvas) return;
        this.signalOverlay.badges.forEach((badge) => canvas.remove(badge));
        this.signalOverlay.badges = [];
        canvas.requestRenderAll();
    }

    getSignalTone(status = 'green') {
        const normalized = String(status || 'green').toLowerCase();
        if (normalized === 'red') {
            return { stroke: '#ef4444', fill: 'rgba(254, 226, 226, 0.92)', text: '#b91c1c', short: 'R' };
        }
        if (normalized === 'yellow') {
            return { stroke: '#f59e0b', fill: 'rgba(254, 243, 199, 0.92)', text: '#b45309', short: 'A' };
        }
        return { stroke: '#22c55e', fill: 'rgba(220, 252, 231, 0.92)', text: '#166534', short: 'V' };
    }

    getSignalEntryForObject(obj) {
        const assetId = this.extractAssetId(obj);
        if (assetId) {
            return this.signalOverlay.valuesByAssetId.get(assetId) || null;
        }
        if (obj?.zoneType && this.contextAssetId) {
            return this.signalOverlay.valuesByAssetId.get(String(this.contextAssetId)) || null;
        }
        return null;
    }

    renderSignalOverlays() {
        if (!this.signalOverlay.enabled) return;
        const canvas = this.fabricWrapper?.canvas;
        if (!canvas) return;

        this.clearSignalOverlays();
        const targets = canvas.getObjects().filter((obj) => {
            if (obj.objectType === 'heatmapOverlay') return false;
            if (obj.objectType === 'signalOverlayBadge') return false;
            return Boolean(this.getSignalEntryForObject(obj));
        });

        targets.forEach((obj) => {
            const signal = this.getSignalEntryForObject(obj);
            if (!signal) return;
            const center = obj.getCenterPoint?.() || { x: obj.left || 0, y: obj.top || 0 };
            const halfW = Math.max(24, Number(obj.getScaledWidth?.() || obj.width || 48) * 0.5);
            const halfH = Math.max(18, Number(obj.getScaledHeight?.() || obj.height || 36) * 0.5);
            const left = center.x + halfW - 8;
            const top = center.y - halfH + 8;
            const tone = this.getSignalTone(signal.status);
            const label = `${tone.short} NC:${signal.ncOpen} CAPA:${signal.capaOverdue || signal.capaOpen}`;

            const text = new fabric.Text(label, {
                left: 6,
                top: 4,
                fontSize: 9,
                fontWeight: '700',
                fill: tone.text,
                selectable: false,
                evented: false,
                originX: 'left',
                originY: 'top',
            });
            const width = Math.max(64, Number(text.width || 56) + 12);
            const background = new fabric.Rect({
                left: 0,
                top: 0,
                width,
                height: 18,
                rx: 8,
                ry: 8,
                fill: tone.fill,
                stroke: tone.stroke,
                strokeWidth: 1.2,
                selectable: false,
                evented: false,
                originX: 'left',
                originY: 'top',
            });
            const badge = new fabric.Group([background, text], {
                left,
                top,
                selectable: false,
                evented: false,
                objectType: 'signalOverlayBadge',
                excludeFromExport: true,
                lockMovementX: true,
                lockMovementY: true,
                layerId: 'signals',
            });
            canvas.add(badge);
            if (typeof canvas.bringObjectToFront === 'function') {
                canvas.bringObjectToFront(badge);
            } else if (typeof canvas.bringToFront === 'function') {
                canvas.bringToFront(badge);
            }
            this.signalOverlay.badges.push(badge);
        });

        canvas.requestRenderAll();
    }

    getSignalPressure(assetId) {
        const key = String(assetId || '').trim();
        if (!key) return 0;
        const row = this.signalOverlay.valuesByAssetId.get(key);
        return Number.isFinite(Number(row?.pressure)) ? Number(row.pressure) : 0;
    }

    computeConnectorSignalFactor(fromAssetId, toAssetId) {
        if (!this.signalOverlay.enabled) return 1;
        const fromPressure = this.getSignalPressure(fromAssetId);
        const toPressure = this.getSignalPressure(toAssetId);
        const pressure = Math.max(fromPressure, toPressure);
        const factor = 1 - Math.min(0.55, pressure * 0.5);
        return Math.max(0.45, Math.min(1, factor));
    }

    updateHeatmapButtonState() {
        const button = this.container?.querySelector('#pe-btn-heatmap');
        if (!button) return;
        const label = button.querySelector('span');
        if (label) {
            label.textContent = this.heatmap.enabled ? 'Calor ON' : 'Calor OFF';
        }

        button.classList.toggle('bg-rose-100', this.heatmap.enabled);
        button.classList.toggle('text-rose-800', this.heatmap.enabled);
        button.classList.toggle('ring-2', this.heatmap.enabled);
        button.classList.toggle('ring-rose-300', this.heatmap.enabled);
        button.classList.toggle('bg-rose-50', !this.heatmap.enabled);
        button.classList.toggle('text-rose-700', !this.heatmap.enabled);
    }

    toggleHeatmap(forceState) {
        const nextState = typeof forceState === 'boolean' ? forceState : !this.heatmap.enabled;
        this.heatmap.enabled = nextState;
        this.updateHeatmapButtonState();
        this.setHeatmapOverlayVisible(nextState);

        if (!nextState) {
            this.clearHeatmapLayer();
            this.setStatus('Mapa de calor desactivado', 'ready');
            return;
        }

        const heatmapLayer = this.layerManager?.getLayer('heatmap');
        if (heatmapLayer && !heatmapLayer.visible) {
            this.layerManager.toggleVisibility('heatmap');
        }
        this.renderHeatmapLayer();
        this.setStatus('Mapa de calor activo', 'info');
    }

    extractAssetId(obj) {
        if (!obj) return null;
        const id = obj.data?.assetId || obj.assetId || null;
        if (!id) return null;
        return String(id);
    }

    findClosestAssetIdToPoint(x, y, maxDistance = 180) {
        const canvas = this.fabricWrapper?.canvas;
        if (!canvas || !Number.isFinite(x) || !Number.isFinite(y)) return null;
        let best = null;

        canvas.getObjects().forEach((obj) => {
            if (obj.objectType === 'heatmapOverlay' || obj.objectType === 'signalOverlayBadge') return;
            const assetId = this.extractAssetId(obj);
            if (!assetId) return;
            const center = obj.getCenterPoint?.() || { x: obj.left || 0, y: obj.top || 0 };
            const dx = center.x - x;
            const dy = center.y - y;
            const distance = Math.sqrt((dx * dx) + (dy * dy));
            if (!Number.isFinite(distance)) return;
            if (best == null || distance < best.distance) {
                best = { assetId, distance };
            }
        });

        if (!best || best.distance > maxDistance) return null;
        return best.assetId;
    }

    collectAssetObjects() {
        const canvas = this.fabricWrapper?.canvas;
        if (!canvas) return [];
        return canvas.getObjects().filter((obj) => {
            if (obj.objectType === 'heatmapOverlay') return false;
            return Boolean(this.extractAssetId(obj));
        });
    }

    setHeatmapValue(assetId, value) {
        if (!assetId) return;
        const normalized = Math.max(0, Math.min(1, value));
        this.heatmap.valuesByAssetId.set(String(assetId), normalized);
    }

    getHeatColor(value) {
        const normalized = Math.max(0, Math.min(1, value));
        const hue = Math.round((1 - normalized) * 120); // 120 green -> 0 red
        const opacity = this.heatmap.minOpacity + ((this.heatmap.maxOpacity - this.heatmap.minOpacity) * normalized);
        return `hsla(${hue}, 90%, 48%, ${opacity.toFixed(3)})`;
    }

    clearHeatmapLayer() {
        const canvas = this.fabricWrapper?.canvas;
        if (!canvas) return;
        if (this.heatmap.renderRaf) {
            cancelAnimationFrame(this.heatmap.renderRaf);
            this.heatmap.renderRaf = null;
        }

        const overlays = canvas.getObjects().filter((obj) => obj.objectType === 'heatmapOverlay' || obj.layerId === 'heatmap');
        overlays.forEach((obj) => canvas.remove(obj));
        this.heatmap.overlays = [];

        if (this.heatmap.d3Layer) {
            this.heatmap.d3Layer.selectAll('*').remove();
        }
        if (this.heatmap.d3Defs) {
            this.heatmap.d3Defs.selectAll('*').remove();
        }
        canvas.requestRenderAll();
    }

    renderHeatmapLayer() {
        if (!this.heatmap.enabled) return;
        const canvas = this.fabricWrapper?.canvas;
        if (!canvas) return;

        const heatmapLayer = this.layerManager?.getLayer('heatmap');
        if (heatmapLayer && !heatmapLayer.visible) return;

        this.heatmap.rendering = true;
        try {
            this.clearHeatmapLayer();
            const assetObjects = this.collectAssetObjects();
            if (!assetObjects.length) return;

            const d3 = this.getD3Instance();
            if (d3 && this.heatmap.d3Layer && this.heatmap.d3Defs) {
                this.renderD3HeatmapLayer(assetObjects, d3);
            } else {
                this.renderFabricHeatmapLayer(assetObjects);
                canvas.requestRenderAll();
            }
        } finally {
            this.heatmap.rendering = false;
        }
    }

    renderFabricHeatmapLayer(assetObjects = []) {
        const canvas = this.fabricWrapper?.canvas;
        if (!canvas) return;

        assetObjects.forEach((obj) => {
            const assetId = this.extractAssetId(obj);
            if (!assetId) return;
            const metric = this.heatmap.valuesByAssetId.get(assetId);
            if (metric === undefined) return;

            const bounds = obj.getBoundingRect?.(true, true) || { width: 80, height: 80 };
            const center = obj.getCenterPoint?.() || { x: obj.left || 0, y: obj.top || 0 };
            const radius = Math.max(18, Math.min(85, Math.max(bounds.width, bounds.height) * 0.46));

            const overlay = new fabric.Circle({
                left: center.x,
                top: center.y,
                radius,
                originX: 'center',
                originY: 'center',
                fill: this.getHeatColor(metric),
                selectable: false,
                evented: false,
                objectType: 'heatmapOverlay',
                layerId: 'heatmap'
            });

            canvas.add(overlay);
            if (typeof canvas.sendObjectToBack === 'function') {
                canvas.sendObjectToBack(overlay);
            } else if (typeof canvas.sendToBack === 'function') {
                canvas.sendToBack(overlay);
            }
            this.heatmap.overlays.push(overlay);
        });
    }

    renderD3HeatmapLayer(assetObjects = [], d3) {
        const canvas = this.fabricWrapper?.canvas;
        if (!canvas || !this.heatmap.d3Layer || !this.heatmap.d3Defs) return;

        this.syncHeatmapOverlaySize();
        const zoom = canvas.getZoom?.() || 1;
        const vpt = canvas.viewportTransform || fabric.iMatrix;
        const points = [];

        assetObjects.forEach((obj) => {
            const assetId = this.extractAssetId(obj);
            if (!assetId) return;
            const metric = this.heatmap.valuesByAssetId.get(assetId);
            if (metric === undefined) return;

            const center = obj.getCenterPoint?.() || { x: obj.left || 0, y: obj.top || 0 };
            const transformed = fabric.util.transformPoint(new fabric.Point(center.x, center.y), vpt);
            const width = Number(obj.getScaledWidth?.() || obj.width || 80);
            const height = Number(obj.getScaledHeight?.() || obj.height || 80);
            const baseRadius = Math.max(22, Math.min(160, Math.max(width, height) * 0.62 * zoom));
            const color = d3.interpolateRdYlGn(1 - Math.max(0, Math.min(1, metric)));

            points.push({
                id: `${assetId}-${Math.round(transformed.x)}-${Math.round(transformed.y)}`,
                gradientId: `pe-hm-grad-${assetId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
                x: transformed.x,
                y: transformed.y,
                radius: baseRadius,
                color,
                metric
            });
        });

        if (!points.length) return;

        const blurId = 'pe-hm-blur';
        const blur = this.heatmap.d3Defs.append('filter').attr('id', blurId);
        blur.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 18);

        points.forEach((point) => {
            const gradient = this.heatmap.d3Defs
                .append('radialGradient')
                .attr('id', point.gradientId)
                .attr('cx', '50%')
                .attr('cy', '50%')
                .attr('r', '50%');
            const alphaCore = (0.28 + (point.metric * 0.55)).toFixed(3);
            const alphaMid = (0.12 + (point.metric * 0.38)).toFixed(3);
            gradient.append('stop').attr('offset', '0%').attr('stop-color', point.color).attr('stop-opacity', alphaCore);
            gradient.append('stop').attr('offset', '62%').attr('stop-color', point.color).attr('stop-opacity', alphaMid);
            gradient.append('stop').attr('offset', '100%').attr('stop-color', point.color).attr('stop-opacity', 0);
        });

        this.heatmap.d3Layer
            .attr('filter', `url(#${blurId})`)
            .selectAll('circle')
            .data(points, (d) => d.id)
            .join('circle')
            .attr('cx', (d) => d.x)
            .attr('cy', (d) => d.y)
            .attr('r', (d) => d.radius)
            .attr('fill', (d) => `url(#${d.gradientId})`);
    }

    seedHeatmapFromCapacity(entries = []) {
        if (!Array.isArray(entries) || entries.length === 0) return;
        const sanitized = entries
            .map((row) => ({ assetId: String(row.assetId || ''), value: Number(row.value) }))
            .filter((row) => row.assetId && Number.isFinite(row.value) && row.value >= 0);
        if (!sanitized.length) return;

        const maxValue = Math.max(...sanitized.map((row) => row.value), 1);
        sanitized.forEach((row) => {
            this.setHeatmapValue(row.assetId, row.value / maxValue);
        });
        if (this.heatmap.enabled) {
            this.renderHeatmapLayer();
        }
    }

    setupRealtimeControls() {
        const heatmapBtn = this.container?.querySelector('#pe-btn-heatmap');
        heatmapBtn?.addEventListener('click', () => this.toggleHeatmap());

        const liveBtn = this.container?.querySelector('#pe-btn-live');
        liveBtn?.addEventListener('click', () => this.toggleRealtime());

        if (!this.routeWatcher) {
            this.routeWatcher = () => {
                const path = (window.location.hash || '#/').split('?')[0];
                if (path !== '#/plant-editor') {
                    this.disconnectRealtimeSocket(false);
                    this.stopSignalPolling();
                    this.clearSignalOverlays();
                    this.restoreAssetStatusStrokes();
                    if (this.routeWatcher) {
                        window.removeEventListener('hashchange', this.routeWatcher);
                        this.routeWatcher = null;
                    }
                }
            };
            window.addEventListener('hashchange', this.routeWatcher);
        }
    }

    updateRealtimeButtonState() {
        const button = this.container?.querySelector('#pe-btn-live');
        if (!button) return;
        const label = button.querySelector('span');
        if (label) {
            label.textContent = this.realtime.connected ? 'Live ON' : 'Live OFF';
        }
        button.classList.toggle('bg-emerald-100', this.realtime.connected);
        button.classList.toggle('text-emerald-800', this.realtime.connected);
        button.classList.toggle('ring-2', this.realtime.connected);
        button.classList.toggle('ring-emerald-300', this.realtime.connected);
        button.classList.toggle('bg-slate-100', !this.realtime.connected);
        button.classList.toggle('text-slate-700', !this.realtime.connected);
    }

    getRealtimeUrl() {
        const fromEnv = String(import.meta.env.VITE_PLANT_WS_URL || '').trim();
        const rawUrl = fromEnv || `${window.location.pathname.replace(/\/$/, '')}/api/plant-layouts/ws`;
        const fallbackBase = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
        const parsed = new URL(rawUrl, fallbackBase);
        if (!parsed.protocol.startsWith('ws')) {
            parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        }
        const token = localStorage.getItem('takta_token');
        if (token && !parsed.searchParams.has('token')) {
            parsed.searchParams.set('token', token);
        }
        return parsed.toString();
    }

    toggleRealtime(forceState) {
        const nextState = typeof forceState === 'boolean' ? forceState : !this.realtime.connected;
        if (!nextState) {
            this.disconnectRealtimeSocket(true);
            return;
        }
        this.connectRealtimeSocket();
    }

    connectRealtimeSocket() {
        const url = this.getRealtimeUrl();
        if (!url) {
            this.setStatus('Configura VITE_PLANT_WS_URL para usar tiempo real', 'warn');
            return;
        }

        this.disconnectRealtimeSocket(false);
        this.realtime.shouldReconnect = true;

        try {
            const socket = new WebSocket(url);
            this.realtime.socket = socket;

            socket.addEventListener('open', () => {
                this.realtime.connected = true;
                this.realtime.reconnectAttempts = 0;
                this.updateRealtimeButtonState();
                this.setStatus('WebSocket conectado', 'ok');
            });

            socket.addEventListener('message', (event) => {
                const payload = this.parseRealtimePayload(event.data);
                if (!payload) return;
                this.realtime.lastMessageAt = new Date().toISOString();
                this.applyRealtimePayload(payload);
            });

            socket.addEventListener('error', () => {
                this.setStatus('WebSocket con error', 'warn');
            });

            socket.addEventListener('close', () => {
                const wasConnected = this.realtime.connected;
                this.realtime.connected = false;
                this.realtime.socket = null;
                this.updateRealtimeButtonState();
                if (wasConnected) {
                    this.setStatus('WebSocket desconectado', 'warn');
                }
                if (this.realtime.shouldReconnect) {
                    this.scheduleRealtimeReconnect();
                }
            });
        } catch (error) {
            console.error('WebSocket init failed', error);
            this.setStatus('No fue posible abrir WebSocket', 'error');
        }
    }

    disconnectRealtimeSocket(updateStatus = false) {
        this.realtime.shouldReconnect = false;
        if (this.realtime.reconnectTimer) {
            clearTimeout(this.realtime.reconnectTimer);
            this.realtime.reconnectTimer = null;
        }
        if (this.realtime.socket) {
            this.realtime.socket.close();
            this.realtime.socket = null;
        }
        this.realtime.connected = false;
        this.updateRealtimeButtonState();
        if (updateStatus) {
            this.setStatus('WebSocket desactivado', 'ready');
        }
    }

    scheduleRealtimeReconnect() {
        if (!this.realtime.shouldReconnect) return;
        const attempt = Math.min(this.realtime.reconnectAttempts + 1, 8);
        this.realtime.reconnectAttempts = attempt;
        const waitMs = Math.min(15000, 800 * (2 ** (attempt - 1)));
        this.setStatus(`Reconectando WebSocket en ${Math.round(waitMs / 1000)}s`, 'warn');
        this.realtime.reconnectTimer = setTimeout(() => {
            this.connectRealtimeSocket();
        }, waitMs);
    }

    parseRealtimePayload(rawMessage) {
        try {
            return JSON.parse(rawMessage);
        } catch {
            return null;
        }
    }

    normalizeMetricValue(metric) {
        const numeric = Number(metric);
        if (!Number.isFinite(numeric)) return null;
        if (numeric <= 1) return Math.max(0, numeric);
        if (numeric <= 100) return Math.max(0, Math.min(1, numeric / 100));
        return 1;
    }

    applyRealtimeAssetStatus(assetId, status) {
        const id = String(assetId || '').trim();
        if (!id) return;
        const tone = String(status || '').toLowerCase();
        const palette = tone === 'red' || tone === 'critical'
            ? '#ef4444'
            : tone === 'yellow' || tone === 'warning'
                ? '#f59e0b'
                : '#22c55e';

        const canvas = this.fabricWrapper?.canvas;
        if (!canvas) return;
        canvas.getObjects().forEach((obj) => {
            const currentAssetId = this.extractAssetId(obj);
            if (!currentAssetId || currentAssetId !== id) return;
            if (!obj._statusStrokeBackup) {
                obj._statusStrokeBackup = obj.stroke;
                obj._statusStrokeWidthBackup = obj.strokeWidth;
            }
            obj.set({
                stroke: palette,
                strokeWidth: Math.max(2, Number(obj.strokeWidth || 2))
            });
        });
        canvas.requestRenderAll();
    }

    restoreAssetStatusStrokes() {
        const canvas = this.fabricWrapper?.canvas;
        if (!canvas) return;
        canvas.getObjects().forEach((obj) => {
            if (!obj?._statusStrokeBackup) return;
            obj.set({
                stroke: obj._statusStrokeBackup,
                strokeWidth: obj._statusStrokeWidthBackup ?? obj.strokeWidth,
            });
            delete obj._statusStrokeBackup;
            delete obj._statusStrokeWidthBackup;
        });
        canvas.requestRenderAll();
    }

    applyRealtimeSignalPatch(assetId, payload = {}) {
        if (!this.signalOverlay.enabled) return;
        const id = String(assetId || '').trim();
        if (!id) return;

        const hasSignalData = payload.signal_pressure != null
            || payload.signalPressure != null
            || payload.nc_open != null
            || payload.ncOpen != null
            || payload.capa_open != null
            || payload.capaOpen != null
            || payload.capa_overdue != null
            || payload.capaOverdue != null
            || payload.spc_status != null
            || payload.spcStatus != null;
        if (!hasSignalData) return;

        const current = this.signalOverlay.valuesByAssetId.get(id) || {
            assetId: id,
            ncOpen: 0,
            ncCritical: 0,
            capaOpen: 0,
            capaOverdue: 0,
            spcGreen: 0,
            spcYellow: 0,
            spcRed: 0,
            actionsOpen: 0,
            actionsOverdue: 0,
            pressure: 0,
            status: 'green',
        };

        if (payload.nc_open != null || payload.ncOpen != null) {
            current.ncOpen = Number(payload.nc_open ?? payload.ncOpen) || 0;
        }
        if (payload.capa_open != null || payload.capaOpen != null) {
            current.capaOpen = Number(payload.capa_open ?? payload.capaOpen) || 0;
        }
        if (payload.capa_overdue != null || payload.capaOverdue != null) {
            current.capaOverdue = Number(payload.capa_overdue ?? payload.capaOverdue) || 0;
        }
        const spcStatus = String(payload.spc_status ?? payload.spcStatus ?? '').toLowerCase();
        if (spcStatus === 'red') {
            current.spcRed = Math.max(1, Number(current.spcRed || 0));
        } else if (spcStatus === 'yellow') {
            current.spcYellow = Math.max(1, Number(current.spcYellow || 0));
        } else if (spcStatus === 'green') {
            current.spcGreen = Math.max(1, Number(current.spcGreen || 0));
        }

        const realtimePressure = Number(payload.signal_pressure ?? payload.signalPressure);
        if (Number.isFinite(realtimePressure)) {
            current.pressure = Math.max(0, Math.min(1, realtimePressure <= 1 ? realtimePressure : realtimePressure / 100));
        } else {
            const raw = (current.spcRed * 0.55) + (current.spcYellow * 0.28) + (current.ncOpen * 0.2) + (current.capaOpen * 0.2) + (current.capaOverdue * 0.36);
            current.pressure = Math.max(0, Math.min(1, raw / 2));
        }
        current.status = this.normalizeSignalStatus(current.pressure, current);
        this.signalOverlay.valuesByAssetId.set(id, current);
        this.signalOverlay.lastUpdatedAt = new Date().toISOString();
        this.applySignalDataToVisuals();
    }

    applyRealtimePayload(payload) {
        if (Array.isArray(payload)) {
            payload.forEach((item) => this.applyRealtimePayload(item));
            return;
        }
        if (!payload || typeof payload !== 'object') return;
        if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
            this.applyRealtimePayload(payload.data);
            return;
        }

        if (payload.type === 'bulk_metrics' && Array.isArray(payload.metrics)) {
            payload.metrics.forEach((row) => {
                const assetId = row.asset_id || row.assetId;
                const metric = this.normalizeMetricValue(
                    row.value ?? row.intensity ?? row.utilization ?? row.utilization_pct,
                );
                if (assetId && metric !== null) this.setHeatmapValue(assetId, metric);
            });
            if (this.heatmap.enabled) this.renderHeatmapLayer();
            return;
        }

        const assetId = payload.asset_id || payload.assetId;
        if (assetId) {
            const metric = this.normalizeMetricValue(
                payload.value ?? payload.intensity ?? payload.utilization ?? payload.utilization_pct,
            );
            if (metric !== null) {
                this.setHeatmapValue(assetId, metric);
                if (this.heatmap.enabled) {
                    this.scheduleHeatmapRender();
                }
            }
            if (payload.status) {
                this.applyRealtimeAssetStatus(assetId, payload.status);
            }
            this.applyRealtimeSignalPatch(assetId, payload);
        }
    }

    setupExampleCases() {
        const select = this.container?.querySelector('#pe-example-case');
        const button = this.container?.querySelector('#pe-btn-load-example');
        if (!select || !button) return;

        button.addEventListener('click', () => {
            this.loadExampleCase(select.value);
        });
    }

    buildExampleNode({
        left,
        top,
        label,
        shape = 'process',
        width = 132,
        height = 58,
        fill = 'rgba(99, 102, 241, 0.45)',
        stroke = '#4338ca'
    }) {
        if (shape === 'inventory') {
            const diamond = new fabric.Polygon([
                { x: 0, y: -30 },
                { x: 54, y: 0 },
                { x: 0, y: 30 },
                { x: -54, y: 0 }
            ], {
                fill,
                stroke,
                strokeWidth: 2,
                originX: 'center',
                originY: 'center'
            });
            const text = new fabric.Textbox(label, {
                width: 90,
                left: 0,
                top: 0,
                fontSize: 12,
                fontWeight: '700',
                textAlign: 'center',
                fill: '#1e293b',
                originX: 'center',
                originY: 'center'
            });
            return new fabric.Group([diamond, text], { left, top, objectType: 'exampleNode' });
        }

        const rect = new fabric.Rect({
            width,
            height,
            rx: 12,
            ry: 12,
            fill,
            stroke,
            strokeWidth: 2,
            originX: 'center',
            originY: 'center'
        });
        const text = new fabric.Textbox(label, {
            width: width - 20,
            left: 0,
            top: 0,
            fontSize: 12,
            fontWeight: '700',
            textAlign: 'center',
            fill: '#0f172a',
            originX: 'center',
            originY: 'center'
        });
        return new fabric.Group([rect, text], { left, top, objectType: 'exampleNode' });
    }

    loadExampleCase(caseId) {
        if (!caseId) {
            this.setStatus('Selecciona un caso de ejemplo', 'warn');
            return;
        }
        if (!this.confirmDiscardChanges('reemplazar el diagrama con un caso de ejemplo')) {
            return;
        }
        if (!this.fabricWrapper?.canvas || !this.arrowConnector) return;

        this.stopFlowSimulation(false);
        this.fabricWrapper.clear();

        const cases = {
            'line-flow': {
                mode: 'process',
                nodes: [
                    { key: 'n1', label: 'Recepción MP', left: 140, top: 220 },
                    { key: 'n2', label: 'Corte', left: 310, top: 220 },
                    { key: 'n3', label: 'Ensamble', left: 480, top: 220 },
                    { key: 'n4', label: 'Empaque', left: 650, top: 220 },
                ],
                edges: [
                    ['n1', 'n2', 7],
                    ['n2', 'n3', 5],
                    ['n3', 'n4', 4],
                ],
            },
            'u-cell': {
                mode: 'plant',
                nodes: [
                    { key: 'n1', label: 'Corte', left: 170, top: 120 },
                    { key: 'n2', label: 'Preparación', left: 340, top: 120 },
                    { key: 'n3', label: 'Ensamble', left: 520, top: 220 },
                    { key: 'n4', label: 'Calidad', left: 340, top: 320 },
                    { key: 'n5', label: 'Empaque', left: 170, top: 320 },
                ],
                edges: [
                    ['n1', 'n2', 6],
                    ['n2', 'n3', 4],
                    ['n3', 'n4', 3],
                    ['n4', 'n5', 4],
                ],
            },
            'vsm-basic': {
                mode: 'vsm',
                nodes: [
                    { key: 'supplier', label: 'Proveedor', left: 120, top: 120, width: 118, height: 52 },
                    { key: 'inv1', label: 'Inv MP', left: 250, top: 120, shape: 'inventory', width: 108, height: 56 },
                    { key: 'proc1', label: 'Proceso A', left: 390, top: 120, width: 132, height: 56 },
                    { key: 'inv2', label: 'WIP', left: 540, top: 120, shape: 'inventory', width: 108, height: 56 },
                    { key: 'proc2', label: 'Proceso B', left: 680, top: 120, width: 132, height: 56 },
                    { key: 'customer', label: 'Cliente', left: 820, top: 120, width: 112, height: 52 },
                    { key: 'timeline', label: 'Lead Time total', left: 500, top: 280, width: 220, height: 52 },
                ],
                edges: [
                    ['supplier', 'inv1', 9],
                    ['inv1', 'proc1', 5],
                    ['proc1', 'inv2', 4],
                    ['inv2', 'proc2', 3],
                    ['proc2', 'customer', 6],
                ],
            },
            'food-line': {
                mode: 'plant',
                nodes: [
                    { key: 'recepcion', label: 'Recepcion', left: 140, top: 210, width: 128, height: 54 },
                    { key: 'preparacion', label: 'Preparacion', left: 320, top: 210, width: 132, height: 54 },
                    { key: 'coccion', label: 'Coccion', left: 500, top: 210, width: 118, height: 54 },
                    { key: 'empaque', label: 'Empaque', left: 680, top: 210, width: 122, height: 54 },
                    { key: 'despacho', label: 'Despacho', left: 860, top: 210, width: 122, height: 54 },
                ],
                edges: [
                    ['recepcion', 'preparacion', 9],
                    ['preparacion', 'coccion', 7],
                    ['coccion', 'empaque', 6],
                    ['empaque', 'despacho', 8],
                ],
            },
        };

        const selectedCase = cases[caseId];
        if (!selectedCase) {
            this.setStatus('Caso de ejemplo no disponible', 'error');
            return;
        }

        this.applyDiagramMode(selectedCase.mode);
        const preset = this.diagramPresets[this.diagramMode] || this.diagramPresets.general;
        const nodeMap = {};
        const canvas = this.fabricWrapper.canvas;

        selectedCase.nodes.forEach((nodeDef) => {
            const node = this.buildExampleNode({
                ...nodeDef,
                fill: nodeDef.fill || preset.fill,
                stroke: nodeDef.stroke || preset.stroke,
            });
            node.flowData = { caseId };
            node.data = {
                ...(node.data || {}),
                assetId: nodeDef.key,
                label: nodeDef.label,
                capacity: Number(nodeDef.capacity || 60),
                cycleTimeSec: Number(nodeDef.cycleTimeSec || 60),
            };
            node.assetId = nodeDef.key;
            nodeMap[nodeDef.key] = node;
            canvas.add(node);
            if (this.layerManager) {
                this.layerManager.assignToLayer(node, 'assets');
            }
        });

        selectedCase.edges.forEach(([fromKey, toKey, capacity]) => {
            const fromObj = nodeMap[fromKey];
            const toObj = nodeMap[toKey];
            if (!fromObj || !toObj) return;
            const arrowId = this.arrowConnector.createArrow(fromObj, toObj);
            const arrow = this.arrowConnector.arrows.get(arrowId);
            if (arrow?.line) {
                arrow.line.flowData = {
                    capacity,
                    share: 1,
                    fromAssetId: fromObj?.data?.assetId || null,
                    toAssetId: toObj?.data?.assetId || null,
                };
                if (this.layerManager) {
                    this.layerManager.assignToLayer(arrow.line, 'connections');
                }
                if (arrow.head) {
                    if (this.layerManager) {
                        this.layerManager.assignToLayer(arrow.head, 'connections');
                    }
                }
            }
        });

        const firstNode = nodeMap[selectedCase.nodes[0]?.key];
        if (firstNode) {
            canvas.setActiveObject(firstNode);
        }
        canvas.requestRenderAll();
        this.scheduleLayerTreePersist();
        this.scheduleSignatureRefresh(80);
        this.refreshHistoryButtons();
        this.refreshZoomBadge();
        this.setStatus(`Caso "${selectCaseLabel(caseId)}" cargado`, 'ok');

        function selectCaseLabel(id) {
            if (id === 'line-flow') return 'Flujo lineal';
            if (id === 'u-cell') return 'Célula en U';
            if (id === 'vsm-basic') return 'VSM básico';
            if (id === 'food-line') return 'Línea alimentos';
            return id;
        }
    }

    setStatus(message, tone = 'ready') {
        if (this.isDestroyed) return;
        const statusEl = this.container?.querySelector('#pe-status');
        if (!statusEl) return;
        this.clearStatusResetTimer();

        const toneMap = {
            ready: 'bg-green-500',
            info: 'bg-indigo-500',
            warn: 'bg-amber-500',
            ok: 'bg-emerald-500',
            error: 'bg-red-500',
            flow: 'bg-orange-500'
        };
        const colorClass = toneMap[tone] || toneMap.ready;
        statusEl.innerHTML = `<span class="w-1.5 h-1.5 ${colorClass} rounded-full animate-pulse"></span> ${message}`;
    }

    applyDiagramMode(mode) {
        const preset = this.diagramPresets[mode] || this.diagramPresets.general;
        this.diagramMode = mode in this.diagramPresets ? mode : 'general';

        if (this.fabricWrapper?.canvas) {
            this.fabricWrapper.canvas.backgroundColor = preset.background;
            this.fabricWrapper.canvas.requestRenderAll();
        }

        this.setStatus(`Modo ${preset.label}`, 'info');
    }

    setupFlowPanel() {
        this.container?.querySelector('#pe-flow-close')?.addEventListener('click', () => this.toggleFlowPanel(false));
        this.container?.querySelector('#pe-flow-start')?.addEventListener('click', () => this.startFlowSimulation());
        this.container?.querySelector('#pe-flow-pause')?.addEventListener('click', () => this.pauseFlowSimulation());
        this.container?.querySelector('#pe-flow-stop')?.addEventListener('click', () => this.stopFlowSimulation());
        this.container?.querySelector('#pe-flow-speed')?.addEventListener('input', () => this.getFlowSettings());
        this.container?.querySelector('#pe-flow-tokens')?.addEventListener('change', () => this.getFlowSettings());
        this.container?.querySelector('#pe-flow-threshold-green')?.addEventListener('change', () => this.getFlowSettings());
        this.container?.querySelector('#pe-flow-threshold-yellow')?.addEventListener('change', () => this.getFlowSettings());
        this.renderGlobalDensityBadge(null, 'Sin simulación');
        this.updateFlowSignalNote();
    }

    toggleFlowPanel(forceState) {
        const panel = this.container?.querySelector('#pe-flow-panel');
        if (!panel) return;

        const nextState = typeof forceState === 'boolean' ? forceState : !this.flowSimulation.open;
        this.flowSimulation.open = nextState;

        panel.classList.toggle('hidden', !nextState);
        if (nextState) {
            this.setStatus('Panel de flujo abierto', 'info');
        } else if (!this.flowSimulation.running) {
            this.setStatus('Ready', 'ready');
        }
    }

    getFlowSettings() {
        const speedInput = this.container?.querySelector('#pe-flow-speed');
        const tokensInput = this.container?.querySelector('#pe-flow-tokens');
        const greenInput = this.container?.querySelector('#pe-flow-threshold-green');
        const yellowInput = this.container?.querySelector('#pe-flow-threshold-yellow');
        const speed = Number(speedInput?.value || this.flowSimulation.speed || 1.2);
        const tokens = Math.max(1, Math.min(30, Number(tokensInput?.value || this.flowSimulation.tokens || 5)));
        const thresholdGreen = Math.max(0.1, Number(greenInput?.value || this.flowSimulation.thresholdGreen || 0.85));
        const thresholdYellowRaw = Math.max(
            thresholdGreen + 0.05,
            Number(yellowInput?.value || this.flowSimulation.thresholdYellow || 1.15),
        );
        this.flowSimulation.speed = Number.isFinite(speed) ? speed : 1.2;
        this.flowSimulation.tokens = Number.isFinite(tokens) ? tokens : 5;
        this.flowSimulation.thresholdGreen = Number.isFinite(thresholdGreen) ? thresholdGreen : 0.85;
        this.flowSimulation.thresholdYellow = Number.isFinite(thresholdYellowRaw) ? thresholdYellowRaw : 1.15;

        if (greenInput) greenInput.value = String(this.flowSimulation.thresholdGreen);
        if (yellowInput) yellowInput.value = String(this.flowSimulation.thresholdYellow);
    }

    extractFlowCapacity(rawCapacity) {
        if (!rawCapacity && rawCapacity !== 0) return null;
        if (typeof rawCapacity === 'number' && Number.isFinite(rawCapacity)) {
            return rawCapacity > 0 ? rawCapacity : null;
        }
        const matched = String(rawCapacity).replace(',', '.').match(/(\d+(\.\d+)?)/);
        if (!matched) return null;
        const parsed = Number(matched[1]);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    getFlowConnectors() {
        if (!this.fabricWrapper?.canvas) return [];
        const canvas = this.fabricWrapper.canvas;
        const objects = canvas.getObjects();
        const arrows = this.arrowConnector?.arrows || new Map();
        const headsByArrowId = new Map(
            objects
                .filter((obj) => obj.objectType === 'arrowHead' && obj.arrowId)
                .map((obj) => [obj.arrowId, obj]),
        );

        return objects
            .filter((obj) => obj.objectType === 'arrowLine' && typeof obj.x1 === 'number' && typeof obj.y1 === 'number')
            .map((line) => {
                const arrowRef = line.arrowId ? arrows.get(line.arrowId) : null;
                const fromAssetId = this.extractAssetId(arrowRef?.fromObj)
                    || line.flowData?.fromAssetId
                    || this.findClosestAssetIdToPoint(line.x1, line.y1);
                const toAssetId = this.extractAssetId(arrowRef?.toObj)
                    || line.flowData?.toAssetId
                    || this.findClosestAssetIdToPoint(line.x2, line.y2);
                const capacity = this.extractFlowCapacity(line.flowData?.capacity);
                const signalFactor = this.computeConnectorSignalFactor(fromAssetId, toAssetId);
                const effectiveCapacity = capacity ? Math.max(0.5, capacity * signalFactor) : null;

                return {
                    line,
                    head: line.arrowId ? headsByArrowId.get(line.arrowId) : null,
                    capacity,
                    effectiveCapacity,
                    signalFactor,
                    fromAssetId,
                    toAssetId,
                };
            });
    }

    getDensityTone(ratio) {
        if (ratio <= this.flowSimulation.thresholdGreen) {
            return { label: 'VERDE', color: '#22c55e', panelClass: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
        }
        if (ratio <= this.flowSimulation.thresholdYellow) {
            return { label: 'AMARILLO', color: '#f59e0b', panelClass: 'border-amber-200 bg-amber-50 text-amber-700' };
        }
        return { label: 'ROJO', color: '#ef4444', panelClass: 'border-red-200 bg-red-50 text-red-700' };
    }

    renderGlobalDensityBadge(ratio, fallbackText = '') {
        const badge = this.container?.querySelector('#pe-flow-density');
        if (!badge) return;

        if (ratio == null || !Number.isFinite(ratio)) {
            badge.className = 'rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600';
            badge.textContent = `Densidad global: ${fallbackText || 'sin datos'}`;
            return;
        }

        const tone = this.getDensityTone(ratio);
        badge.className = `rounded-lg border px-2.5 py-2 text-xs font-semibold ${tone.panelClass}`;
        badge.textContent = `Densidad global: ${ratio.toFixed(2)} (${tone.label})${this.signalOverlay.enabled ? ' · con señales' : ''}`;
    }

    resetConnectorSemaforo() {
        if (!this.flowSimulation.connectors?.length) return;
        this.flowSimulation.connectors.forEach((connector) => {
            const line = connector.line;
            if (line?._flowOriginalStroke) {
                line.set({
                    stroke: line._flowOriginalStroke,
                    strokeWidth: line._flowOriginalStrokeWidth ?? 2,
                });
                delete line._flowOriginalStroke;
                delete line._flowOriginalStrokeWidth;
            }
            if (connector.head?._flowOriginalFill) {
                connector.head.set({ fill: connector.head._flowOriginalFill });
                delete connector.head._flowOriginalFill;
            }
        });
    }

    updateFlowSemaforo() {
        const connectors = this.flowSimulation.connectors || [];
        if (!connectors.length) return;

        const connectorLoads = new Array(connectors.length).fill(0);
        this.flowSimulation.particles.forEach((entry) => {
            if (entry.connectorIndex >= 0 && entry.connectorIndex < connectorLoads.length) {
                connectorLoads[entry.connectorIndex] += 1;
            }
        });

        const fallbackCapacity = Math.max(1, this.flowSimulation.tokens / connectors.length);
        let maxDensity = 0;

        connectors.forEach((connector, idx) => {
            const line = connector.line;
            const head = connector.head;
            if (!line) return;

            if (!line._flowOriginalStroke) {
                line._flowOriginalStroke = line.stroke || '#8b5cf6';
                line._flowOriginalStrokeWidth = line.strokeWidth || 2;
            }
            if (head && !head._flowOriginalFill) {
                head._flowOriginalFill = head.fill || '#8b5cf6';
            }

            const capacity = connector.effectiveCapacity || connector.capacity || fallbackCapacity;
            const densityRatio = connectorLoads[idx] / Math.max(capacity, 0.001);
            maxDensity = Math.max(maxDensity, densityRatio);
            const tone = this.getDensityTone(densityRatio);
            line.set({
                stroke: tone.color,
                strokeWidth: densityRatio > this.flowSimulation.thresholdYellow ? 4 : densityRatio > this.flowSimulation.thresholdGreen ? 3 : 2.5,
            });
            if (head) {
                head.set({ fill: tone.color });
            }
        });

        this.flowSimulation.globalDensityRatio = maxDensity;
        this.renderGlobalDensityBadge(maxDensity);
    }

    startFlowSimulation() {
        this.getFlowSettings();
        this.stopFlowSimulation(false);

        const connectors = this.getFlowConnectors();
        if (!connectors.length) {
            this.setStatus('Crea conexiones para simular flujo', 'warn');
            return;
        }

        this.flowSimulation.connectors = connectors;
        this.flowSimulation.particles = [];
        this.flowSimulation.running = true;
        this.flowSimulation.lastTimestamp = 0;

        const canvas = this.fabricWrapper.canvas;
        for (let i = 0; i < this.flowSimulation.tokens; i += 1) {
            const particle = new fabric.Circle({
                radius: 5,
                fill: '#f97316',
                stroke: '#fff',
                strokeWidth: 1.25,
                selectable: false,
                evented: false,
                excludeFromExport: true,
                shadow: {
                    color: 'rgba(249, 115, 22, 0.45)',
                    blur: 8,
                    offsetX: 0,
                    offsetY: 0
                }
            });
            const entry = {
                shape: particle,
                connectorIndex: i % connectors.length,
                progress: (i / this.flowSimulation.tokens) % 1,
                speedFactor: 0.85 + (Math.random() * 0.3),
            };
            this.positionFlowParticle(entry);
            canvas.add(particle);
            this.flowSimulation.particles.push(entry);
        }

        this.updateFlowSemaforo();
        this.setStatus('Simulando flujo de producto', 'flow');
        this.flowSimulation.rafId = requestAnimationFrame((timestamp) => this.animateFlow(timestamp));
    }

    pauseFlowSimulation() {
        if (!this.flowSimulation.running) return;
        this.flowSimulation.running = false;
        if (this.flowSimulation.rafId) {
            cancelAnimationFrame(this.flowSimulation.rafId);
            this.flowSimulation.rafId = null;
        }
        this.setStatus('Simulación en pausa', 'warn');
    }

    stopFlowSimulation(resetStatus = true) {
        this.flowSimulation.running = false;
        this.flowSimulation.lastTimestamp = 0;

        if (this.flowSimulation.rafId) {
            cancelAnimationFrame(this.flowSimulation.rafId);
            this.flowSimulation.rafId = null;
        }

        if (this.fabricWrapper?.canvas && this.flowSimulation.particles.length) {
            this.flowSimulation.particles.forEach(({ shape }) => {
                this.fabricWrapper.canvas.remove(shape);
            });
            this.fabricWrapper.canvas.requestRenderAll();
        }

        this.resetConnectorSemaforo();
        this.flowSimulation.particles = [];
        this.flowSimulation.connectors = [];
        this.flowSimulation.globalDensityRatio = 0;
        this.renderGlobalDensityBadge(null, 'sin simulación');
        if (resetStatus) {
            this.setStatus('Ready', 'ready');
        }
    }

    animateFlow(timestamp) {
        if (!this.flowSimulation.running) return;

        if (!this.flowSimulation.lastTimestamp) {
            this.flowSimulation.lastTimestamp = timestamp;
        }

        const elapsed = timestamp - this.flowSimulation.lastTimestamp;
        this.flowSimulation.lastTimestamp = timestamp;
        const speedFactor = 0.00024 * this.flowSimulation.speed;

        this.flowSimulation.particles.forEach((entry) => {
            entry.progress += elapsed * speedFactor * (entry.speedFactor || 1);
            while (entry.progress >= 1) {
                entry.progress -= 1;
                entry.connectorIndex = (entry.connectorIndex + 1) % this.flowSimulation.connectors.length;
            }
            this.positionFlowParticle(entry);
        });

        this.updateFlowSemaforo();
        this.fabricWrapper.canvas.requestRenderAll();
        this.flowSimulation.rafId = requestAnimationFrame((nextTimestamp) => this.animateFlow(nextTimestamp));
    }

    positionFlowParticle(entry) {
        const connector = this.flowSimulation.connectors[entry.connectorIndex];
        if (!connector) return;

        const line = connector.line || connector;
        const x1 = line.x1 ?? 0;
        const y1 = line.y1 ?? 0;
        const x2 = line.x2 ?? x1;
        const y2 = line.y2 ?? y1;
        const x = x1 + (x2 - x1) * entry.progress;
        const y = y1 + (y2 - y1) * entry.progress;
        entry.shape.set({
            left: x,
            top: y,
            originX: 'center',
            originY: 'center'
        });
    }

    async toggleCapacityAnalysis(btn) {
        if (this.isAnalyzing) {
            // Stop Analysis
            this.isAnalyzing = false;
            btn.classList.remove('bg-indigo-100', 'text-indigo-800', 'ring-2', 'ring-indigo-500');
            btn.classList.add('bg-indigo-50', 'text-indigo-700');
            btn.innerHTML = `${ICONS.activity} <span>Analizar</span>`;
            this.setStatus('Análisis detenido', 'ready');

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
            this.setStatus('Calculando capacidad por activo...', 'info');

            this.capacityLabels = [];

            // 1. Find objects with connected Assets
            const objects = this.fabricWrapper.canvas.getObjects();
            const assetObjects = objects.filter(obj => obj.data && obj.data.assetId);

            if (assetObjects.length === 0) {
                this.setStatus('Asigna activos a los nodos para analizar capacidad', 'warn');
                this.toggleCapacityAnalysis(btn); // Reset
                return;
            }

            btn.innerHTML = `${ICONS.activity} <span>Resultados</span>`;
            const capacityEntries = [];

            for (const obj of assetObjects) {
                try {
                    // Fetch capacity from backend
                    const result = await capacityService.getAssetCapacity(obj.data.assetId);
                    capacityEntries.push({
                        assetId: obj.data.assetId,
                        value: Number(result.capacity_uph || 0)
                    });

                    // Visualize Result
                    if (!obj._originalStroke) {
                        obj._originalStroke = obj.stroke;
                        obj._originalStrokeWidth = obj.strokeWidth;
                    }

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

            this.seedHeatmapFromCapacity(capacityEntries);
            this.fabricWrapper.canvas.requestRenderAll();
            this.setStatus(`Resultados de capacidad: ${assetObjects.length} activo(s)`, 'ok');
        }
    }

    toggleConnectionMode(btn) {
        if (this.arrowConnector.isConnecting) {
            this.arrowConnector.stopConnecting();
            btn.classList.remove('bg-violet-50', 'text-violet-600', 'border-violet-100');
            btn.classList.add('hover:bg-slate-50', 'text-slate-500');
            this.setStatus('Ready', 'ready');
        } else {
            this.setMode('select', this.container.querySelector('#pe-tool-select'));
            this.arrowConnector.startConnecting();
            btn.classList.add('bg-violet-50', 'text-violet-600', 'border-violet-100');
            btn.classList.remove('hover:bg-slate-50', 'text-slate-500');
            this.setStatus('Conectando: click en origen y destino', 'info');
        }
    }

    renderLayersPanel(layers, activeLayerId, payload = null) {
        const container = document.getElementById('pe-layers-list');
        if (!container) return;

        const state = payload || {
            tree: this.layerManager.getLayerTree(),
            uiState: this.layerManager.getUiState(),
        };

        const toolbar = `
            <div id="pe-layer-actions" class="mb-2 flex items-center justify-between gap-1.5">
                <button data-layer-global="add-root" class="h-7 px-2 rounded border border-slate-200 text-[11px] text-slate-600 hover:bg-slate-50">+ Capa</button>
                <button data-layer-global="persist" class="h-7 px-2 rounded border border-slate-200 text-[11px] text-slate-600 hover:bg-slate-50">Persistir</button>
            </div>
        `;

        const rows = layers.map((layer) => {
            const isActive = layer.id === activeLayerId;
            const canEdit = !layer.system && layer.type !== 'base';
            const depthPadding = 8 + (Math.max(0, Number(layer.depth || 0)) * 16);
            return `
                <div class="layer-item rounded-md border ${isActive ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-white'} ${!layer.visible ? 'opacity-60' : ''}"
                    data-layer-id="${layer.id}" style="padding-left:${depthPadding}px">
                    <div class="flex items-center gap-1.5 px-1.5 py-1.5">
                        ${layer.hasChildren
                            ? `<button data-layer-action="expand" class="h-5 w-5 rounded text-slate-400 hover:bg-slate-100">${layer.expanded ? '▾' : '▸'}</button>`
                            : '<span class="inline-block h-5 w-5"></span>'}
                        <button data-layer-action="visibility" class="h-5 w-5 rounded ${layer.visible ? 'text-indigo-500' : 'text-slate-400'} hover:bg-slate-100" style="color:${layer.color || '#64748b'}">${layer.visible ? ICONS.eye : ICONS.eyeOff}</button>
                        <button data-layer-action="select" class="text-left flex-1 min-w-0">
                            <span class="block truncate text-xs font-medium ${isActive ? 'text-slate-800' : 'text-slate-600'}">${esc(layer.name)}</span>
                        </button>
                        <button data-layer-action="lock" class="h-5 w-5 rounded ${layer.locked ? 'text-slate-700' : 'text-slate-400'} hover:bg-slate-100">${ICONS.lock}</button>
                        <button data-layer-action="up" class="h-5 w-5 rounded text-slate-400 hover:bg-slate-100 ${canEdit ? '' : 'hidden'}">↑</button>
                        <button data-layer-action="down" class="h-5 w-5 rounded text-slate-400 hover:bg-slate-100 ${canEdit ? '' : 'hidden'}">↓</button>
                        <button data-layer-action="indent" class="h-5 w-5 rounded text-slate-400 hover:bg-slate-100 ${canEdit ? '' : 'hidden'}">↳</button>
                        <button data-layer-action="outdent" class="h-5 w-5 rounded text-slate-400 hover:bg-slate-100 ${canEdit ? '' : 'hidden'}">↰</button>
                        <button data-layer-action="add-child" class="h-5 w-5 rounded text-slate-400 hover:bg-slate-100">+</button>
                        <button data-layer-action="clone" class="h-5 w-5 rounded text-slate-400 hover:bg-slate-100 ${canEdit ? '' : 'hidden'}">⧉</button>
                        <button data-layer-action="delete" class="h-5 w-5 rounded text-red-400 hover:bg-red-50 ${canEdit ? '' : 'hidden'}">×</button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `${toolbar}<div class="space-y-1">${rows}</div>`;

        container.querySelector('[data-layer-global="add-root"]')?.addEventListener('click', () => {
            this.layerManager.addLayer('Nueva capa', 'custom', null);
        });
        container.querySelector('[data-layer-global="persist"]')?.addEventListener('click', () => {
            this.scheduleLayerTreePersist(state);
            this.setStatus('Capas persistidas', 'ok');
        });

        container.querySelectorAll('.layer-item').forEach((item) => {
            const layerId = item.dataset.layerId;
            item.querySelectorAll('[data-layer-action]').forEach((actionBtn) => {
                actionBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const action = actionBtn.dataset.layerAction;
                    if (!action) return;
                    if (action === 'select') this.layerManager.setActiveLayer(layerId);
                    if (action === 'visibility') this.layerManager.toggleVisibility(layerId);
                    if (action === 'lock') this.layerManager.toggleLock(layerId);
                    if (action === 'expand') this.layerManager.toggleExpanded(layerId);
                    if (action === 'add-child') {
                        this.layerManager.addLayer('Subcapa', 'custom', layerId);
                        this.layerManager.setExpanded(layerId, true);
                    }
                    if (action === 'clone') this.layerManager.cloneLayer(layerId);
                    if (action === 'delete') this.layerManager.removeLayer(layerId);
                    if (action === 'up') this.layerManager.moveLayerUp(layerId);
                    if (action === 'down') this.layerManager.moveLayerDown(layerId);
                    if (action === 'indent') this.layerManager.indentLayer(layerId);
                    if (action === 'outdent') this.layerManager.outdentLayer(layerId);
                });
            });
        });
    }

    setMode(mode, btn) {
        // Update UI
        if (this.activeToolBtn && this.activeToolBtn !== btn) {
            this.activeToolBtn.classList.remove('bg-indigo-50', 'text-indigo-600', 'border-indigo-100');
            this.activeToolBtn.classList.add('hover:bg-slate-50', 'text-slate-500');
        }

        if (btn) {
            btn.classList.add('bg-indigo-50', 'text-indigo-600', 'border-indigo-100');
            btn.classList.remove('hover:bg-slate-50', 'text-slate-500');
            this.activeToolBtn = btn;
        }

        if (mode !== 'select' && this.arrowConnector?.isConnecting) {
            this.arrowConnector.stopConnecting();
            const arrowBtn = this.container?.querySelector('#pe-tool-arrow');
            arrowBtn?.classList.remove('bg-violet-50', 'text-violet-600', 'border-violet-100');
            arrowBtn?.classList.add('hover:bg-slate-50', 'text-slate-500');
        }

        // Update Canvas Mode
        if (mode === 'select') {
            this.fabricWrapper.setPanMode(false);
            this.setStatus('Modo selección', 'ready');
        } else if (mode === 'pan') {
            this.fabricWrapper.setPanMode(true);
            this.setStatus('Modo mover lienzo', 'info');
        }
    }

    toggleRightPanel() {
        const panel = this.container?.querySelector('#pe-right-panel');
        if (!panel) return;
        this.panelOpen = !this.panelOpen;
        if (this.panelOpen) {
            panel.classList.remove('hidden');
            panel.classList.add('flex');
            panel.classList.add('z-20', 'bg-white/95', 'backdrop-blur-sm', 'rounded-xl', 'p-2');
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('flex');
            panel.classList.remove('z-20', 'bg-white/95', 'backdrop-blur-sm', 'rounded-xl', 'p-2');
        }
    }

    assignObjectToActiveLayer(object) {
        if (!object || !this.layerManager) return;
        const activeLayer = this.layerManager.getActiveLayer();
        const layerId = activeLayer?.id || 'zones';
        this.layerManager.assignToLayer(object, layerId);
        if (layerId === 'assets' && !object.data) {
            object.data = {};
        }
    }

    addShape(type) {
        const center = this.fabricWrapper.canvas.getVpCenter();
        const preset = this.diagramPresets[this.diagramMode] || this.diagramPresets.general;
        let objData = {
            left: center.x,
            top: center.y,
            fill: preset.fill,
            stroke: preset.stroke,
            strokeWidth: 2
        };

        if (type === 'rect') {
            objData = { ...objData, type: 'rect', width: 100, height: 100 };
        } else if (type === 'circle') {
            objData = { ...objData, type: 'ellipse', rx: 50, ry: 50 };
        } else if (type === 'diamond') {
            const diamond = new fabric.Polygon([
                { x: 0, y: -50 },
                { x: 50, y: 0 },
                { x: 0, y: 50 },
                { x: -50, y: 0 }
            ], {
                ...objData,
                left: center.x,
                top: center.y
            });
            this.fabricWrapper.canvas.add(diamond);
            this.assignObjectToActiveLayer(diamond);
            this.fabricWrapper.canvas.setActiveObject(diamond);
            this.fabricWrapper.canvas.requestRenderAll();
            return;
        } else if (type === 'marker') {
            const marker = new fabric.Circle({
                ...objData,
                radius: 18,
                fill: 'rgba(249, 115, 22, 0.45)',
                stroke: '#ea580c',
                strokeWidth: 2
            });
            const markerLabel = new fabric.Textbox('P', {
                left: center.x,
                top: center.y,
                fontSize: 18,
                fontWeight: '700',
                fill: '#9a3412',
                originX: 'center',
                originY: 'center'
            });
            const grouped = new fabric.Group([marker, markerLabel], {
                left: center.x,
                top: center.y,
                objectType: 'markerNode'
            });
            this.fabricWrapper.canvas.add(grouped);
            this.assignObjectToActiveLayer(grouped);
            this.fabricWrapper.canvas.setActiveObject(grouped);
            this.fabricWrapper.canvas.requestRenderAll();
            return;
        }

        const created = this.fabricWrapper.addObject(objData);
        Promise.resolve(created).then((shape) => {
            if (shape) {
                this.assignObjectToActiveLayer(shape);
                this.fabricWrapper.canvas.setActiveObject(shape);
                this.fabricWrapper.canvas.requestRenderAll();
            }
        });
    }

    addTextNode() {
        const center = this.fabricWrapper.canvas.getVpCenter();
        const textNode = new fabric.Textbox('Nuevo nodo', {
            left: center.x,
            top: center.y,
            width: 160,
            fontSize: 18,
            fontFamily: 'Arial',
            fill: '#0f172a',
            backgroundColor: 'rgba(255,255,255,0.75)',
            stroke: '#cbd5e1',
            strokeWidth: 1,
            padding: 8
        });
        this.fabricWrapper.canvas.add(textNode);
        this.assignObjectToActiveLayer(textNode);
        this.fabricWrapper.canvas.setActiveObject(textNode);
        this.fabricWrapper.canvas.requestRenderAll();
    }

    deleteSelected() {
        const active = this.fabricWrapper.getActiveObject();
        if (active && this.arrowConnector) {
            this.arrowConnector.removeArrowsForObject(active);
        }
        this.fabricWrapper.removeActiveObject();
        if (this.flowSimulation.running) {
            this.startFlowSimulation();
        }
    }

    /**
     * Configura eventos de Drag & Drop en el canvas
     */
    setupDragAndDrop() {
        const canvasContainer = document.getElementById('pe-canvas-container');
        const dropZone = document.getElementById('pe-drop-zone');
        if (!canvasContainer || !dropZone) return;

        this.dragDropBindings = [];
        const bind = (target, eventName, handler) => {
            target.addEventListener(eventName, handler);
            this.dragDropBindings.push({ target, eventName, handler });
        };

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
            bind(canvasContainer, eventName, (event) => {
                event.preventDefault();
                event.stopPropagation();
            });
        });

        bind(canvasContainer, 'dragenter', () => {
            dropZone.classList.remove('hidden');
            dropZone.classList.add('flex');
        });

        bind(canvasContainer, 'dragleave', (event) => {
            if (!canvasContainer.contains(event.relatedTarget)) {
                dropZone.classList.add('hidden');
                dropZone.classList.remove('flex');
            }
        });

        bind(dropZone, 'dragleave', (event) => {
            if (!dropZone.contains(event.relatedTarget)) {
                dropZone.classList.add('hidden');
                dropZone.classList.remove('flex');
            }
        });

        bind(canvasContainer, 'drop', async (event) => {
            dropZone.classList.add('hidden');
            dropZone.classList.remove('flex');
            const files = event.dataTransfer?.files || [];
            if (files.length > 0) {
                await this.handleFileImport(files[0]);
            }
        });
    }

    /**
     * Abre el selector de archivos
     */
    triggerFileInput() {
        this.container?.querySelector('#pe-file-input')?.click();
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
        try {
            this.stopFlowSimulation(false);
            this.setStatus('Importando archivo...', 'warn');

            const result = await importManager.importFile(file);

            switch (result.type) {
                case 'drawio':
                    await this.loadDrawioData(result);
                    break;
                case 'json':
                    await this.fabricWrapper.loadFromJSON(result.data);
                    break;
                case 'svg':
                    await this.fabricWrapper.loadSVGString(result.svgString);
                    this.applyDiagramMode('svg');
                    break;
                case 'image':
                    await this.fabricWrapper.addBackgroundImage(result.src);
                    break;
            }

            this.scheduleSignatureRefresh(90);
            this.refreshHistoryButtons();
            this.refreshZoomBadge();
            this.setStatus(`${file.name} cargado`, 'ok');
            this.statusResetTimer = setTimeout(() => {
                this.statusResetTimer = null;
                this.setStatus('Ready', 'ready');
            }, 3000);

        } catch (error) {
            console.error('Import error:', error);
            this.setStatus(`Error: ${error.message}`, 'error');
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
            const background = await this.fabricWrapper.addBackgroundImage(firstPage.backgroundImage.src, {
                left: firstPage.backgroundImage.left,
                top: firstPage.backgroundImage.top,
                scaleX: 1,
                scaleY: 1
            });
            if (background && this.layerManager) {
                this.layerManager.assignToLayer(background, 'base');
            }
        }

        // Cargar objetos adicionales
        for (const obj of firstPage.fabricObjects) {
            const created = await this.fabricWrapper.addObject(obj);
            if (created && this.layerManager) {
                this.layerManager.assignToLayer(created, obj.layerId || 'zones');
            }
        }
    }

    handleClear() {
        if (!this.confirmDiscardChanges('limpiar el lienzo')) return;
        this.stopFlowSimulation(false);
        this.heatmap.valuesByAssetId.clear();
        this.clearHeatmapLayer();
        this.clearSignalOverlays();
        this.fabricWrapper.clear();
        this.applyDiagramMode(this.diagramMode);
        if (this.heatmap.enabled) {
            this.renderHeatmapLayer();
        }
        if (this.signalOverlay.enabled) {
            this.scheduleSignalRefresh(180);
        }
        this.scheduleSignatureRefresh(80);
        this.refreshHistoryButtons();
        this.refreshZoomBadge();
        this.setStatus('Lienzo limpio', 'ready');
    }

    teardownDragAndDrop() {
        if (!Array.isArray(this.dragDropBindings) || !this.dragDropBindings.length) return;
        this.dragDropBindings.forEach((binding) => {
            binding.target?.removeEventListener(binding.eventName, binding.handler);
        });
        this.dragDropBindings = [];
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        this.clearStatusResetTimer();
        if (this.signatureTimer) {
            clearTimeout(this.signatureTimer);
            this.signatureTimer = null;
        }
        if (this.librarySearchTimer) {
            clearTimeout(this.librarySearchTimer);
            this.librarySearchTimer = null;
        }
        if (this.layerTreeSaveTimer) {
            clearTimeout(this.layerTreeSaveTimer);
            this.layerTreeSaveTimer = null;
        }
        if (this.changeLogSaveTimer) {
            clearTimeout(this.changeLogSaveTimer);
            this.changeLogSaveTimer = null;
        }
        this.pendingChangeLogs = [];
        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
        }
        if (this.keyboardHandler) {
            window.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
        if (this.routeWatcher) {
            window.removeEventListener('hashchange', this.routeWatcher);
            this.routeWatcher = null;
        }

        this.teardownDragAndDrop();
        this.stopFlowSimulation(false);
        this.stopSignalPolling();
        this.disconnectRealtimeSocket(false);
        this.clearSignalOverlays();
        this.restoreAssetStatusStrokes();
        this.signalOverlay.valuesByAssetId.clear();
        this.signalOverlay.lastUpdatedAt = null;
        if (this.signalOverlay.renderRaf) {
            cancelAnimationFrame(this.signalOverlay.renderRaf);
            this.signalOverlay.renderRaf = null;
        }
        if (this.heatmap.renderRaf) {
            cancelAnimationFrame(this.heatmap.renderRaf);
            this.heatmap.renderRaf = null;
        }
        if (this.heatmap.resizeObserver) {
            this.heatmap.resizeObserver.disconnect();
            this.heatmap.resizeObserver = null;
        }
        if (this.heatmap.overlayEl?.parentNode) {
            this.heatmap.overlayEl.parentNode.removeChild(this.heatmap.overlayEl);
        }
        this.heatmap.overlayEl = null;
        this.heatmap.d3Root = null;
        this.heatmap.d3Defs = null;
        this.heatmap.d3Layer = null;

        this.resourceManager?.destroy?.();
        this.fileManager?.stopAutoSave?.();
        this.contextMenu?.destroy?.();
        this.propertiesPanel?.destroy?.();
        this.arrowConnector?.destroy?.();
        this.fabricWrapper?.destroy?.();

        this.resourceManager = null;
        this.fileManager = null;
        this.contextMenu = null;
        this.propertiesPanel = null;
        this.arrowConnector = null;
        this.layerManager = null;
        this.fabricWrapper = null;
    }
}








