import ApiClient from '../../services/api.client.js';

class AssetDetail {
    constructor(container) {
        this.container = container;
        this.asset = null;
        this.breadcrumbs = [];
    }

    async load(assetId) {
        this.renderLoading();
        try {
            // Load detail and breadcrumbs in parallel
            const [assetData, breadcrumbsData] = await Promise.all([
                ApiClient.get(`/assets/${assetId}`),
                ApiClient.get(`/assets/${assetId}/context`)
            ]);

            this.asset = assetData;
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
                    <div class="p-6 border-b border-slate-100 flex justify-between items-start">
                        <div>
                            <div class="flex items-center gap-3">
                                <h1 class="text-2xl font-bold text-slate-900">${this.asset.name}</h1>
                                <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase tracking-wider">
                                    ${this.asset.type}
                                </span>
                            </div>
                            ${this.asset.description ? `<p class="mt-2 text-slate-600">${this.asset.description}</p>` : ''}
                        </div>
                        <div class="flex gap-2">
                             <button onclick="window.location.hash='/editor?assetId=${this.asset.id}'" class="inline-flex items-center gap-1.5 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 rounded-md transition-colors">
                                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                 Nuevo Documento
                             </button>
                             <button class="bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 rounded-md">Editar</button>
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
                
                <!-- Hijos (Si tiene) -->
                ${this.renderChildrenTable()}
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
                    <button class="text-sm font-medium text-blue-600 hover:text-blue-500">+ Agregar Hijo</button>
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
}

export default AssetDetail;
