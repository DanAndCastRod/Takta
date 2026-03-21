import ApiClient from '../services/api.client.js';

import { setModuleContext } from '../services/module-context.service.js';
import uiFeedback from '../services/ui-feedback.service.js';

function getHashParams() {
    const hash = window.location.hash || '';
    const idx = hash.indexOf('?');
    if (idx === -1) return {};
    const params = {};
    new URLSearchParams(hash.substring(idx + 1)).forEach((value, key) => {
        params[key] = value;
    });
    return params;
}

function firstNonEmpty(...values) {
    for (const value of values) {
        if (value === undefined || value === null) continue;
        const normalized = String(value).trim();
        if (normalized) return normalized;
    }
    return '';
}

function normalizeDocumentsParams(raw = {}) {
    return {
        asset_id: firstNonEmpty(raw.asset_id, raw.assetId),
        document_id: firstNonEmpty(raw.document_id, raw.documentId),
    };
}

function buildDocumentsHash(params = {}) {
    const query = new URLSearchParams();
    if (params.asset_id) query.set('asset_id', params.asset_id);
    if (params.document_id) query.set('document_id', params.document_id);
    const search = query.toString();
    return search ? `#/documents?${search}` : '#/documents';
}

function syncCanonicalDocumentsHash(params = {}) {
    const canonical = buildDocumentsHash(params);
    if (canonical !== (window.location.hash || '#/documents')) {
        window.history.replaceState(null, '', canonical);
    }
}

function formatDate(value) {
    if (!value) return 'N/A';
    try {
        return new Date(value).toLocaleString('es-CO');
    } catch {
        return value;
    }
}

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function buildEditorLink(doc) {
    let base = `#/editor?document_id=${encodeURIComponent(doc.id)}&template_id=${encodeURIComponent(doc.template_id)}`;
    if (doc.asset_id) base += `&asset_id=${encodeURIComponent(doc.asset_id)}`;
    return base;
}

async function DocumentsPage() {
    const root = document.createElement('div');
    root.className = 'p-4 md:p-6 max-w-7xl mx-auto';

    const params = normalizeDocumentsParams(getHashParams());
    syncCanonicalDocumentsHash(params);
    const state = {
        docs: [],
        assets: [],
        filtered: [],
        search: '',
        assetFilter: params.asset_id || '',
        selectedDoc: null,
        selectedRenderHtml: '',
        error: '',
    };

    function applyFilters() {
        const search = state.search.trim().toLowerCase();
        state.filtered = state.docs.filter((doc) => {
            const byAsset = !state.assetFilter || String(doc.asset_id || '') === String(state.assetFilter);
            if (!byAsset) return false;
            if (!search) return true;
            const haystack = [
                doc.template_code,
                doc.template_name,
                doc.asset_name || '',
                doc.user_id,
                doc.id,
            ].join(' ').toLowerCase();
            return haystack.includes(search);
        });
    }

    function buildAssetOptions() {
        return state.assets
            .map((asset) => `<option value="${asset.id}" ${String(asset.id) === String(state.assetFilter) ? 'selected' : ''}>${escapeHtml(asset.name)} (${escapeHtml(asset.type)})</option>`)
            .join('');
    }

    function renderRows() {
        if (!state.filtered.length) {
            return `
                <tr>
                    <td colspan="7" class="px-4 py-10 text-center text-slate-400">
                        Sin resultados.
                    </td>
                </tr>
            `;
        }

        return state.filtered.map((doc) => `
            <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 text-xs font-mono text-slate-500">${escapeHtml(doc.template_code)}</td>
                <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(doc.template_name)}</td>
                <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(doc.asset_name || 'General')}</td>
                <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(doc.user_id)}</td>
                <td class="px-4 py-3 text-sm text-slate-600">${formatDate(doc.created_at)}</td>
                <td class="px-4 py-3 text-xs font-mono text-slate-500">${escapeHtml(doc.id)}</td>
                <td class="px-4 py-3 text-right">
                    <button data-view-doc="${doc.id}" class="tk-btn-secondary px-2 py-1 text-xs mr-1">Ver</button>
                    <button data-del-doc="${doc.id}" class="tk-btn-danger px-2 py-1 text-xs mr-1">Eliminar</button>
                    <a href="${buildEditorLink(doc)}" class="px-2 py-1 text-xs rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">Abrir editor</a>
                </td>
            </tr>
        `).join('');
    }

    function hasActiveFilters() {
        return Boolean(state.search.trim() || state.assetFilter);
    }

    function renderEmptyState() {
        if (state.filtered.length) return '';
        const title = hasActiveFilters() ? 'No hay documentos con estos filtros' : 'Aún no hay documentos creados';
        const detail = hasActiveFilters()
            ? 'Limpia filtros o crea un documento nuevo para este activo.'
            : 'Crea tu primer documento en Editor Docs y aquí podrás consultarlo, abrirlo y eliminarlo.';
        return `
            <div class="mt-4 tk-empty-state p-4">
                <h3 class="text-sm font-semibold text-slate-700">${title}</h3>
                <p class="text-xs mt-1">${detail}</p>
                <div class="mt-3 flex flex-wrap gap-2">
                    <a href="#/editor" id="docs-empty-create" class="tk-btn-primary px-3 py-1.5 text-xs">Nuevo documento</a>
                    ${hasActiveFilters() ? '<button type="button" id="docs-clear-filters" class="tk-btn-secondary px-3 py-1.5 text-xs">Limpiar filtros</button>' : ''}
                </div>
            </div>
        `;
    }

    function renderModal() {
        if (!state.selectedDoc) return '';
        const doc = state.selectedDoc;
        let prettyJson = doc.content_json || '';
        try {
            prettyJson = JSON.stringify(JSON.parse(doc.content_json || '{}'), null, 2);
        } catch {
            // keep raw string
        }

        return `
            <div id="docs-modal" class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div class="bg-white w-full max-w-4xl rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                    <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-semibold text-slate-900">${escapeHtml(doc.template_name || 'Documento')}</h3>
                            <p class="text-xs text-slate-500 mt-1">ID: ${escapeHtml(doc.id)}</p>
                        </div>
                        <button id="docs-modal-close" class="p-1 text-slate-400 hover:text-slate-600" aria-label="Cerrar detalle">×</button>
                    </div>
                    <div class="p-5 space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <p class="text-slate-500 uppercase tracking-wide">Plantilla</p>
                                <p class="text-slate-800 font-medium mt-1">${escapeHtml(doc.template_id || 'N/A')}</p>
                            </div>
                            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <p class="text-slate-500 uppercase tracking-wide">Activo</p>
                                <p class="text-slate-800 font-medium mt-1">${escapeHtml(doc.asset_id || 'General')}</p>
                            </div>
                            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <p class="text-slate-500 uppercase tracking-wide">Creado por</p>
                                <p class="text-slate-800 font-medium mt-1">${escapeHtml(doc.user_id || 'N/A')}</p>
                            </div>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-slate-700 mb-2">Vista renderizada</p>
                            <div class="w-full max-h-[30vh] overflow-auto rounded-lg border border-slate-200 bg-white text-slate-800 text-sm p-3">
                                ${state.selectedRenderHtml || '<p class="text-slate-400 text-xs">No se pudo renderizar una vista previa.</p>'}
                            </div>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-slate-700 mb-2">Contenido JSON</p>
                            <pre class="w-full max-h-[50vh] overflow-auto rounded-lg border border-slate-200 bg-slate-950 text-slate-100 text-xs p-3">${escapeHtml(prettyJson)}</pre>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function render() {
        root.innerHTML = `
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-slate-900">Documentos Creados</h1>
                <p class="text-slate-500 text-sm mt-1">Bandeja global de documentos generados desde Editor Docs.</p>
            </div>
            ${state.error ? `<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${escapeHtml(state.error)}</div>` : ''}
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-4">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div class="md:col-span-2">
                        <label class="block text-xs font-medium text-slate-600 mb-1">Buscar</label>
                        <input id="docs-search" value="${escapeHtml(state.search)}" placeholder="Plantilla, activo, usuario o ID..." class="tk-input px-3 py-2 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1">Activo</label>
                        <select id="docs-asset-filter" class="tk-select px-3 py-2 text-sm">
                            <option value="">Todos</option>
                            ${buildAssetOptions()}
                        </select>
                    </div>
                    <div class="flex items-end gap-2">
                        <a href="#/editor" class="w-full text-center px-3 py-2 rounded-lg bg-brand-orange text-white text-sm font-semibold hover:bg-orange-600">Nuevo Documento</a>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 overflow-auto shadow-sm">
                <table class="w-full text-sm min-w-[1100px]">
                    <thead class="bg-slate-50 text-slate-600">
                        <tr>
                            <th class="text-left px-4 py-3 font-medium">Código</th>
                            <th class="text-left px-4 py-3 font-medium">Plantilla</th>
                            <th class="text-left px-4 py-3 font-medium">Activo</th>
                            <th class="text-left px-4 py-3 font-medium">Usuario</th>
                            <th class="text-left px-4 py-3 font-medium">Fecha</th>
                            <th class="text-left px-4 py-3 font-medium">Documento ID</th>
                            <th class="text-right px-4 py-3 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${renderRows()}
                    </tbody>
                </table>
            </div>
            ${renderEmptyState()}
            ${renderModal()}
        `;

        root.querySelector('#docs-search')?.addEventListener('input', (event) => {
            state.search = event.target.value || '';
            applyFilters();
            render();
        });

        root.querySelector('#docs-asset-filter')?.addEventListener('change', async (event) => {
            state.assetFilter = event.target.value || '';
            setModuleContext({ asset_id: state.assetFilter || null }, 'documents');
            syncCanonicalDocumentsHash({ asset_id: state.assetFilter || '', document_id: state.selectedDoc?.id || '' });
            await loadDocuments();
        });

        root.querySelector('#docs-clear-filters')?.addEventListener('click', async () => {
            state.search = '';
            state.assetFilter = '';
            state.selectedDoc = null;
            state.selectedRenderHtml = '';
            setModuleContext({ asset_id: null }, 'documents');
            syncCanonicalDocumentsHash({ asset_id: '', document_id: '' });
            await loadDocuments();
        });

        root.querySelectorAll('[data-view-doc]').forEach((button) => {
            button.addEventListener('click', async () => {
                try {
                    const docId = button.dataset.viewDoc;
                    const [detail, preview] = await Promise.all([
                        ApiClient.get(`/documents/${docId}`),
                        ApiClient.get(`/documents/${docId}/render?output_format=html`).catch(() => null)
                    ]);
                    state.selectedDoc = detail;
                    state.selectedRenderHtml = preview?.content || '';
                    setModuleContext({ asset_id: detail?.asset_id || null }, 'documents');
                    syncCanonicalDocumentsHash({ asset_id: state.assetFilter || '', document_id: detail?.id || '' });
                    render();
                } catch (error) {
                    state.error = `No se pudo cargar el documento: ${error.message}`;
                    uiFeedback.error(state.error);
                    render();
                }
            });
        });

        root.querySelectorAll('[data-del-doc]').forEach((button) => {
            button.addEventListener('click', async () => {
                const docId = button.dataset.delDoc;
                if (!docId) return;
                if (!confirm('Deseas eliminar este documento?')) return;
                try {
                    await ApiClient.delete(`/documents/${docId}`);
                    if (String(state.selectedDoc?.id || '') === String(docId)) {
                        state.selectedDoc = null;
                        state.selectedRenderHtml = '';
                        syncCanonicalDocumentsHash({ asset_id: state.assetFilter || '', document_id: '' });
                    }
                    state.error = '';
                    uiFeedback.success('Documento eliminado correctamente.');
                    await loadDocuments();
                } catch (error) {
                    state.error = `No se pudo eliminar el documento: ${error.message}`;
                    uiFeedback.error(state.error);
                    render();
                }
            });
        });

        root.querySelector('#docs-modal-close')?.addEventListener('click', () => {
            state.selectedDoc = null;
            state.selectedRenderHtml = '';
            syncCanonicalDocumentsHash({ asset_id: state.assetFilter || '', document_id: '' });
            render();
        });

        root.querySelector('#docs-modal')?.addEventListener('click', (event) => {
            if (event.target.id === 'docs-modal') {
                state.selectedDoc = null;
                state.selectedRenderHtml = '';
                syncCanonicalDocumentsHash({ asset_id: state.assetFilter || '', document_id: '' });
                render();
            }
        });
    }

    async function loadDocuments() {
        try {
            const endpoint = state.assetFilter
                ? `/documents?asset_id=${encodeURIComponent(state.assetFilter)}`
                : '/documents';
            state.docs = await ApiClient.get(endpoint);
            applyFilters();
            state.error = '';
        } catch (error) {
            state.docs = [];
            state.filtered = [];
            state.error = `No se pudo cargar la bandeja: ${error.message}`;
            uiFeedback.error(state.error);
        }
        render();
    }

    try {
        const assets = await ApiClient.get('/assets').catch(() => []);
        state.assets = Array.isArray(assets) ? assets : [];
    } catch (error) {
        state.error = error.message;
    }

    await loadDocuments();

    if (params.document_id) {
        try {
            const [detail, preview] = await Promise.all([
                ApiClient.get(`/documents/${params.document_id}`),
                ApiClient.get(`/documents/${params.document_id}/render?output_format=html`).catch(() => null)
            ]);
            state.selectedDoc = detail;
            state.selectedRenderHtml = preview?.content || '';
            render();
        } catch {
            // Ignore deep-link errors
        }
    } else {
        render();
    }

    return root;
}

export default DocumentsPage;

