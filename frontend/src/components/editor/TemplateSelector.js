/**
 * TemplateSelector.js
 * 
 * Displays a grid of template cards grouped by category.
 * When a template is selected, fires a callback with the template data.
 */
import ApiClient from '../../services/api.client.js';

class TemplateSelector {
    /**
     * @param {HTMLElement} container - DOM element to render into
     * @param {function} onSelect - Callback when a template is selected: (template) => void
     */
    constructor(container, onSelect, options = {}) {
        this.container = container;
        this.onSelect = onSelect;
        this.templates = [];
        this.assetId = options.assetId || null;
        this.assetName = options.assetName || '';
    }

    async load() {
        this.renderLoading();
        try {
            this.templates = await ApiClient.get('/templates');
            const needsSync = !this.templates.length || this.templates.some((tpl) => {
                const markdown = tpl?.markdown_structure || '';
                return !markdown.includes('## Contexto Integrado Takta');
            });
            if (needsSync) {
                // Auto-bootstrap once to avoid forcing manual API calls in fresh environments.
                await ApiClient.post('/templates/ingest', {});
                this.templates = await ApiClient.get('/templates');
            }
            this.render();
        } catch (error) {
            console.error('TemplateSelector: failed to load templates', error);
            this.renderError(error.message);
        }
    }

    renderLoading() {
        this.container.innerHTML = `
            <div class="flex items-center justify-center py-20 text-slate-400">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Cargando plantillas...</span>
            </div>
        `;
    }

    renderError(msg) {
        this.container.innerHTML = `
            <div class="p-6 max-w-2xl mx-auto">
                <div class="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                    <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                        <h3 class="font-medium">Error al cargar plantillas</h3>
                        <p class="text-sm mt-1">${msg}</p>
                        <p class="text-sm mt-2">Asegúrate de haber ejecutado <code class="bg-red-100 px-1 rounded">POST /api/templates/ingest</code> primero.</p>
                    </div>
                </div>
            </div>
        `;
    }

    /** Category display names & icons */
    _getCategoryMeta(category) {
        const map = {
            '01_BPM': { label: 'BPM', icon: '📋', color: 'bg-blue-50 border-blue-200 text-blue-700' },
            '02_Lean': { label: 'Lean', icon: '🎯', color: 'bg-green-50 border-green-200 text-green-700' },
            '03_TPM': { label: 'TPM', icon: '🔧', color: 'bg-orange-50 border-orange-200 text-orange-700' },
            '04_6S': { label: '6S', icon: '✨', color: 'bg-purple-50 border-purple-200 text-purple-700' },
            '05_Kaizen': { label: 'Kaizen', icon: '🚀', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
            '06_Kanban': { label: 'Kanban', icon: '📦', color: 'bg-teal-50 border-teal-200 text-teal-700' },
            'ie_formats': { label: 'General', icon: '📄', color: 'bg-slate-50 border-slate-200 text-slate-700' },
        };
        return map[category] || { label: category, icon: '📄', color: 'bg-slate-50 border-slate-200 text-slate-700' };
    }

    render() {
        // Group templates by category
        const grouped = {};
        this.templates.forEach(t => {
            if (!grouped[t.category]) grouped[t.category] = [];
            grouped[t.category].push(t);
        });

        const categories = Object.keys(grouped).sort();

        this.container.innerHTML = `
            <div class="max-w-5xl mx-auto p-6">
                <!-- Header -->
                <div class="mb-8 space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h1 class="text-2xl font-bold text-slate-900">Crear Nuevo Documento</h1>
                            <p class="text-slate-500 mt-1">Paso 1: selecciona una plantilla. Paso 2: completa contenido. Paso 3: guarda el documento.</p>
                        </div>
                        <button id="ingest-templates-btn" class="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
                            Cargar plantillas base
                        </button>
                    </div>
                    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                        ${this.assetId
                ? `<p class="text-slate-700">Contexto activo: <span class="font-semibold">${this.assetName || this.assetId}</span></p>`
                : `<p class="text-slate-600">Sin activo asociado. El documento se creará como general. Si necesitas asociarlo, abre este flujo desde <a href="#/assets" class="text-blue-600 hover:text-blue-700 font-medium">Árbol de Activos</a>.</p>`}
                    </div>
                </div>

                <!-- Category Sections -->
                ${categories.map(cat => {
            const meta = this._getCategoryMeta(cat);
            const templates = grouped[cat];
            return `
                        <div class="mb-8">
                            <h2 class="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <span>${meta.icon}</span> ${meta.label}
                            </h2>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                ${templates.map(t => `
                                    <button 
                                        data-template-id="${t.id}" 
                                        class="template-card group text-left p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer"
                                    >
                                        <div class="flex items-start justify-between">
                                            <div>
                                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color} border mb-2">
                                                    ${t.code}
                                                </span>
                                                <h3 class="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">${t.name}</h3>
                                            </div>
                                            <svg class="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                            </svg>
                                        </div>
                                        <p class="mt-3 text-xs font-semibold text-blue-600 group-hover:text-blue-700">Crear documento con esta plantilla</p>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `;
        }).join('')}

                ${categories.length === 0 ? `
                    <div class="text-center py-16">
                        <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                        </svg>
                        <h3 class="mt-3 text-sm font-semibold text-slate-900">Sin plantillas</h3>
                        <p class="mt-1 text-sm text-slate-500">Ejecuta la ingesta de plantillas desde el panel de administración.</p>
                    </div>
                ` : ''}
            </div>
        `;

        // Attach click handlers
        this.container.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                const templateId = card.dataset.templateId;
                const template = this.templates.find(t => t.id === templateId);
                if (template && this.onSelect) {
                    this.onSelect(template);
                }
            });
        });

        this.container.querySelector('#ingest-templates-btn')?.addEventListener('click', async () => {
            try {
                await ApiClient.post('/templates/ingest', {});
                await this.load();
                alert('Plantillas cargadas/actualizadas correctamente.');
            } catch (error) {
                alert(`No fue posible cargar plantillas: ${error.message}`);
            }
        });
    }
}

export default TemplateSelector;


