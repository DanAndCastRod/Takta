import ApiClient from '../../services/api.client.js';

class AssetDetail {
    constructor(container, callbacks = {}) {
        this.container = container;
        this.asset = null;
        this.breadcrumbs = [];
        this.standards = [];
        this.documents = [];
        this.activities = [];
        this.references = [];
        this.callbacks = {
            onCreateChild: callbacks.onCreateChild || null,
            onEditAsset: callbacks.onEditAsset || null,
            onDeleteAsset: callbacks.onDeleteAsset || null,
        };
    }

    async load(assetId) {
        this.renderLoading();
        try {
            // Load detail and breadcrumbs in parallel
            const [assetData, breadcrumbsData, standardsData, documentsData, activitiesData, referencesData] = await Promise.all([
                ApiClient.get(`/assets/${assetId}`),
                ApiClient.get(`/assets/${assetId}/context`),
                ApiClient.get(`/engineering/standards?asset_id=${assetId}`).catch(() => []),
                ApiClient.get(`/documents/asset/${assetId}`).catch(() => []),
                ApiClient.get('/engineering/activities').catch(() => []),
                ApiClient.get('/engineering/references').catch(() => []),
            ]);

            this.asset = assetData;
            this.standards = Array.isArray(standardsData) ? standardsData : [];
            this.documents = Array.isArray(documentsData) ? documentsData : [];
            this.activities = Array.isArray(activitiesData) ? activitiesData : [];
            this.references = Array.isArray(referencesData) ? referencesData : [];
            // /context returns {breadcrumbs: [...], depth, ...} — extract the array
            this.breadcrumbs = Array.isArray(breadcrumbsData)
                ? breadcrumbsData
                : (breadcrumbsData.breadcrumbs || []);

            this.render();
        } catch (error) {
            console.error(`Failed to load asset details for ${assetId}`, error);
            this.renderError(error.message);
        }
    }

    renderLoading() {
        this.container.innerHTML = `
            <div class="flex items-center justify-center h-full text-slate-400">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Cargando detalle...</span>
            </div>
        `;
    }

    renderError(msg) {
        this.container.innerHTML = `
            <div class="p-6">
                <div class="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                    <svg class="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <div>
                        <h3 class="font-medium">Error al cargar el activo</h3>
                        <p class="text-sm mt-1 opacity-90">${msg}</p>
                    </div>
                </div>
            </div>
        `;
    }

    render() {
        if (!this.asset) return;

        // Formato para mostrar fecha (si existe)
        let createdStr = 'N/A';
        let updatedStr = 'N/A';
        try {
            if (this.asset.created_at) createdStr = new Date(this.asset.created_at).toLocaleString('es-CO');
            if (this.asset.updated_at) updatedStr = new Date(this.asset.updated_at).toLocaleString('es-CO');
        } catch (e) { }

        this.container.innerHTML = `
            <div class="max-w-4xl mx-auto pb-12">
                <!-- Breadcrumbs -->
                <nav class="flex mb-6" aria-label="Breadcrumb">
                  <ol role="list" class="flex items-center space-x-2 text-sm text-slate-500">
                    ${this.breadcrumbs.map((crumb, index) => `
                        <li>
                          <div class="flex items-center">
                            ${index > 0 ? '<svg class="flex-shrink-0 h-4 w-4 text-slate-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>' : ''}
                            <span class="${index === this.breadcrumbs.length - 1 ? 'text-slate-900 font-semibold' : ''}">${crumb.name}</span>
                          </div>
                        </li>
                    `).join('')}
                  </ol>
                </nav>

                <!-- Header -->
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                    <div class="p-6 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:justify-between lg:items-start">
                        <div>
                            <div class="flex items-center gap-3">
                                <h1 class="text-2xl font-bold text-slate-900">${this.asset.name}</h1>
                                <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase tracking-wider">
                                    ${this.asset.type}
                                </span>
                            </div>
                            ${this.asset.description ? `<p class="mt-2 text-slate-600">${this.asset.description}</p>` : ''}
                        </div>
                        <div class="flex flex-wrap gap-2">
                             <a href="#/editor?asset_id=${this.asset.id}" class="inline-flex items-center gap-1.5 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 rounded-md transition-colors">
                                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                 Nuevo Documento
                             </a>
                             <a href="#/documents?asset_id=${this.asset.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-200 hover:bg-blue-100 rounded-md transition-colors">
                                 Ver Documentos
                             </a>
                             <a href="#/engineering?tab=standards&asset_id=${this.asset.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-orange-700 bg-orange-50 ring-1 ring-inset ring-orange-200 hover:bg-orange-100 rounded-md transition-colors">
                                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                 Gestionar Estándares
                             </a>
                             <button id="asset-add-child-btn" class="bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 rounded-md">Agregar Hijo</button>
                             <button id="asset-edit-btn" class="bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 rounded-md">Editar Activo</button>
                             <button id="asset-delete-btn" class="bg-white px-3 py-1.5 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-50 rounded-md">Eliminar Activo</button>
                        </div>
                    </div>
                    
                    <div class="bg-slate-50 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <dt class="text-xs font-medium text-slate-500 uppercase tracking-wider">ID del Activo</dt>
                            <dd class="mt-1 text-sm text-slate-900 font-mono">${this.asset.id}</dd>
                        </div>
                        <div>
                            <dt class="text-xs font-medium text-slate-500 uppercase tracking-wider">Creado</dt>
                            <dd class="mt-1 text-sm text-slate-900">${createdStr}</dd>
                        </div>
                         <div>
                            <dt class="text-xs font-medium text-slate-500 uppercase tracking-wider">Última Actualización</dt>
                            <dd class="mt-1 text-sm text-slate-900">${updatedStr}</dd>
                        </div>
                    </div>
                </div>
                
                ${this.renderStandardsTable()}
                ${this.renderDocumentsTable()}

                <!-- Hijos (Si tiene) -->
                ${this.renderChildrenTable()}
            </div>
        `;

        this._wireActions();
    }

    renderDocumentsTable() {
        if (!Array.isArray(this.documents) || this.documents.length === 0) {
            return `
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <h3 class="text-base font-semibold text-slate-900">Documentos Asociados</h3>
                            <p class="text-sm text-slate-500 mt-1">Este activo aún no tiene documentos guardados.</p>
                        </div>
                        <a href="#/editor?asset_id=${this.asset.id}" class="px-3 py-1.5 text-sm font-semibold rounded-md bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-100">
                            Crear Documento
                        </a>
                    </div>
                </div>
            `;
        }

        return `
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                    <h3 class="text-base font-semibold text-slate-900">Documentos Asociados (${this.documents.length})</h3>
                    <a href="#/documents?asset_id=${this.asset.id}" class="px-3 py-1.5 text-sm font-semibold rounded-md bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-100">
                        Abrir Bandeja
                    </a>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th scope="col" class="py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plantilla</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Documento ID</th>
                                <th scope="col" class="px-3 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200 bg-white">
                            ${this.documents.map((doc) => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="py-3 pl-6 pr-3 text-sm font-medium text-slate-900">${doc.template_name || '-'}</td>
                                    <td class="px-3 py-3 text-sm text-slate-600">${doc.user_id || '-'}</td>
                                    <td class="px-3 py-3 text-sm text-slate-600">${doc.created_at ? new Date(doc.created_at).toLocaleString('es-CO') : '-'}</td>
                                    <td class="px-3 py-3 text-xs font-mono text-slate-500">${doc.id}</td>
                                    <td class="px-3 py-3 text-right">
                                        <a href="#/documents?asset_id=${this.asset.id}&document_id=${doc.id}" class="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">Ver</a>
                                        <button data-del-doc="${doc.id}" class="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 ml-1">Eliminar</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderChildrenTable() {
        if (!this.asset.children || this.asset.children.length === 0) {
            return `
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                    <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 class="mt-2 text-sm font-medium text-slate-900">Sin submódulos</h3>
                    <p class="mt-1 text-sm text-slate-500">Este activo es un nodo hoja y no contiene hijos.</p>
                </div>
            `;
        }

        return `
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                    <h3 class="text-base font-semibold text-slate-900">Dependencias Directas (${this.asset.children.length})</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th scope="col" class="py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200 bg-white">
                            ${this.asset.children.map(child => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="py-3 pl-6 pr-3 text-sm font-medium text-slate-900">${child.name}</td>
                                    <td class="px-3 py-3 text-sm text-slate-500">
                                        <span class="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 uppercase">
                                            ${child.type}
                                        </span>
                                    </td>
                                    <td class="px-3 py-3 text-sm text-slate-500 truncate max-w-[200px]">${child.description || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderStandardsTable() {
        if (!Array.isArray(this.standards) || this.standards.length === 0) {
            return `
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <h3 class="text-base font-semibold text-slate-900">Estándares Asociados</h3>
                            <p class="text-sm text-slate-500 mt-1">Este activo aún no tiene estándares asignados.</p>
                        </div>
                        <a href="#/engineering?tab=standards&asset_id=${this.asset.id}" class="px-3 py-1.5 text-sm font-semibold rounded-md bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 hover:bg-orange-100">
                            Asignar Estándar
                        </a>
                    </div>
                </div>
            `;
        }

        return `
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                    <h3 class="text-base font-semibold text-slate-900">Estándares Asociados (${this.standards.length})</h3>
                    <div class="flex items-center gap-2">
                        <button id="asset-open-standard-form" class="px-3 py-1.5 text-sm font-semibold rounded-md bg-orange-600 text-white hover:bg-orange-700">
                            Asignar Estándar
                        </button>
                        <a href="#/engineering?tab=standards&asset_id=${this.asset.id}" class="px-3 py-1.5 text-sm font-semibold rounded-md bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 hover:bg-orange-100">
                            Abrir Ingeniería
                        </a>
                    </div>
                </div>
                <form id="asset-standard-form" class="hidden p-4 border-b border-slate-200 bg-white">
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <select id="asset-standard-activity" class="px-3 py-2 rounded border border-slate-200 text-sm">
                            <option value="">Actividad...</option>
                            ${this.activities.map((row) => `<option value="${row.id}">${row.name} (${row.type})</option>`).join('')}
                        </select>
                        <select id="asset-standard-reference" class="px-3 py-2 rounded border border-slate-200 text-sm">
                            <option value="">SKU (opcional)</option>
                            ${this.references.map((row) => `<option value="${row.id}">${row.code} - ${row.description}</option>`).join('')}
                        </select>
                        <input id="asset-standard-time" type="number" min="0" step="0.001" placeholder="Tiempo std (min)" class="px-3 py-2 rounded border border-slate-200 text-sm">
                        <input id="asset-standard-unit" placeholder="Unidad capacidad (opcional)" class="px-3 py-2 rounded border border-slate-200 text-sm">
                        <button class="px-3 py-2 rounded bg-brand-orange text-white text-sm font-semibold hover:bg-orange-600">Guardar</button>
                    </div>
                </form>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th scope="col" class="py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actividad</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Referencia</th>
                                <th scope="col" class="px-3 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiempo Std (min)</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unidad</th>
                                <th scope="col" class="px-3 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" class="px-3 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200 bg-white">
                            ${this.standards.map((std) => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="py-3 pl-6 pr-3 text-sm font-medium text-slate-900">${std.activity_name || '-'}</td>
                                    <td class="px-3 py-3 text-sm text-slate-500">${std.reference_code || 'General'}</td>
                                    <td class="px-3 py-3 text-sm text-slate-700 text-right font-mono">${std.standard_time_minutes != null ? Number(std.standard_time_minutes).toFixed(3) : '—'}</td>
                                    <td class="px-3 py-3 text-sm text-slate-500">${std.capacity_unit || '—'}</td>
                                    <td class="px-3 py-3 text-center">
                                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${std.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}">${std.is_active ? 'Activo' : 'Inactivo'}</span>
                                    </td>
                                    <td class="px-3 py-3 text-right">
                                        <button data-del-std="${std.id}" class="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">Eliminar</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    _wireActions() {
        const addChildBtn = this.container.querySelector('#asset-add-child-btn');
        if (addChildBtn && this.callbacks.onCreateChild) {
            addChildBtn.addEventListener('click', () => {
                this.callbacks.onCreateChild(this.asset);
            });
        }

        const editBtn = this.container.querySelector('#asset-edit-btn');
        if (editBtn && this.callbacks.onEditAsset) {
            editBtn.addEventListener('click', () => {
                this.callbacks.onEditAsset(this.asset);
            });
        }

        const deleteBtn = this.container.querySelector('#asset-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (!confirm('Deseas eliminar este activo? Esta accion no se puede deshacer.')) return;
                try {
                    await ApiClient.delete(`/assets/${this.asset.id}`);
                    if (this.callbacks.onDeleteAsset) {
                        await this.callbacks.onDeleteAsset(this.asset);
                    }
                } catch (error) {
                    alert(`No se pudo eliminar el activo: ${error.message}`);
                }
            });
        }

        this.container.querySelectorAll('[data-del-doc]').forEach((button) => {
            button.addEventListener('click', async () => {
                const docId = button.dataset.delDoc;
                if (!docId) return;
                if (!confirm('Deseas eliminar este documento asociado?')) return;
                try {
                    await ApiClient.delete(`/documents/${docId}`);
                    await this.load(this.asset.id);
                } catch (error) {
                    alert(`No se pudo eliminar el documento: ${error.message}`);
                }
            });
        });

        this.container.querySelectorAll('[data-del-std]').forEach((button) => {
            button.addEventListener('click', async () => {
                const standardId = button.dataset.delStd;
                if (!standardId) return;
                if (!confirm('Deseas eliminar este estandar asociado?')) return;
                try {
                    await ApiClient.delete(`/engineering/standards/${standardId}`);
                    await this.load(this.asset.id);
                } catch (error) {
                    alert(`No se pudo eliminar el estandar: ${error.message}`);
                }
            });
        });

        this.container.querySelector('#asset-open-standard-form')?.addEventListener('click', () => {
            this.container.querySelector('#asset-standard-form')?.classList.toggle('hidden');
        });

        this.container.querySelector('#asset-standard-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const activity_id = this.container.querySelector('#asset-standard-activity')?.value;
            if (!activity_id) {
                alert('Selecciona una actividad.');
                return;
            }
            const payload = {
                asset_id: this.asset.id,
                activity_id,
                product_reference_id: this.container.querySelector('#asset-standard-reference')?.value || null,
                standard_time_minutes: Number(this.container.querySelector('#asset-standard-time')?.value || 0) || null,
                capacity_unit: this.container.querySelector('#asset-standard-unit')?.value?.trim() || null,
            };
            try {
                await ApiClient.post('/engineering/standards/strict', payload);
                await this.load(this.asset.id);
            } catch (error) {
                alert(`No se pudo crear el estándar: ${error.message}`);
            }
        });
    }
}

export default AssetDetail;

