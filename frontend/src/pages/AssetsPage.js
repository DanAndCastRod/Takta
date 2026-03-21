import ApiClient from '../services/api.client.js';
import AssetTree from '../components/assets/AssetTree.js';
import AssetDetail from '../components/assets/AssetDetail.js';
import { setModuleContext } from '../services/module-context.service.js';
import uiFeedback from '../services/ui-feedback.service.js';

const ASSET_TYPES = ['Sede', 'Planta', 'Area', 'Linea', 'Maquina', 'Puesto', 'Componente'];
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders(extra = {}) {
    const token = localStorage.getItem('takta_token');
    return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

async function downloadAssetBlob(path, filename) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('takta_token');
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function uploadAssetsXlsx(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/assets/xlsx/import`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('takta_token');
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        throw new Error(payload?.detail || `Error importando activos (${response.status})`);
    }
    return payload;
}

function formatImportSummary(result) {
    const base = `Creados: ${result.created} | Actualizados: ${result.updated}`;
    if (!result.errors_count) return `${base} | Sin errores`;
    return `${base} | Errores: ${result.errors_count}`;
}

const AssetsPage = async () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col md:flex-row h-full w-full';

    container.innerHTML = `
        <div class="w-full md:w-96 md:flex-none border-b md:border-b-0 md:border-r border-slate-200 bg-white flex flex-col h-[44vh] md:h-full overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
                <div class="flex justify-between items-center">
                    <h2 class="text-sm font-semibold text-slate-800 uppercase tracking-wide">Árbol de Activos</h2>
                    <button id="asset-toggle-tree-btn" class="p-1.5 hover:bg-slate-200 rounded text-slate-500" title="Expandir todo">
                        <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <button id="asset-template-btn" class="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-100">Plantilla Árbol</button>
                    <button id="asset-export-btn" class="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-100">Exportar Árbol</button>
                    <button id="asset-import-btn" class="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-100">Importar XLSX</button>
                    <input id="asset-import-input" type="file" accept=".xlsx" class="hidden">
                </div>
                <div id="asset-import-result" class="hidden text-xs rounded-lg border px-2 py-1.5"></div>
                <button id="asset-new-root-btn" class="w-full tk-btn-primary px-3 py-2 text-sm shadow-sm">
                    + Nuevo Activo Raíz
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-2" id="asset-tree-container">
                <div class="flex items-center justify-center h-20 text-slate-400 text-sm">
                    <span class="animate-pulse">Cargando árbol...</span>
                </div>
            </div>
        </div>

        <div class="flex-1 bg-slate-50 p-4 md:p-6 overflow-y-auto min-h-[56vh] md:min-h-0" id="asset-detail-container">
            <div class="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                <svg class="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>
                <p class="text-lg font-medium text-slate-500">Selecciona un activo</p>
                <p class="text-sm mb-6">Navega por la jerarquía para ver detalle y operar CRUD.</p>
                <button id="asset-empty-create-btn" class="tk-btn-primary px-4 py-2 text-sm shadow-sm">
                    Crear Primer Activo
                </button>
            </div>
        </div>
    `;

    const treeContainer = container.querySelector('#asset-tree-container');
    const detailContainer = container.querySelector('#asset-detail-container');
    const toggleTreeBtn = container.querySelector('#asset-toggle-tree-btn');
    const newRootBtn = container.querySelector('#asset-new-root-btn');
    const emptyCreateBtn = container.querySelector('#asset-empty-create-btn');
    const templateBtn = container.querySelector('#asset-template-btn');
    const exportBtn = container.querySelector('#asset-export-btn');
    const importBtn = container.querySelector('#asset-import-btn');
    const importInput = container.querySelector('#asset-import-input');
    const importResult = container.querySelector('#asset-import-result');

    const state = {
        selectedAssetId: null,
        expandedAll: false,
    };

    function renderNoSelection() {
        detailContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                <svg class="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>
                <p class="text-lg font-medium text-slate-500">Selecciona un activo</p>
                <p class="text-sm mb-6">Navega por la jerarquía para ver detalle y operar CRUD.</p>
                <button id="asset-empty-create-btn" class="tk-btn-primary px-4 py-2 text-sm shadow-sm">
                    Crear Primer Activo
                </button>
            </div>
        `;
        detailContainer.querySelector('#asset-empty-create-btn')?.addEventListener('click', () => {
            openAssetModal({ mode: 'create' });
        });
    }

    const assetTree = new AssetTree(treeContainer);
    const assetDetail = new AssetDetail(detailContainer, {
        onCreateChild: (asset) => openAssetModal({ mode: 'create', parentAsset: asset }),
        onEditAsset: (asset) => openAssetModal({ mode: 'edit', asset }),
        onDeleteAsset: async (asset) => {
            const nextAssetId = asset?.parent_id || null;
            state.selectedAssetId = nextAssetId;
            setModuleContext({ asset_id: nextAssetId || null }, 'assets');
            await assetTree.load();
            if (nextAssetId) {
                await assetDetail.load(nextAssetId);
            } else {
                renderNoSelection();
            }
        },
    });

    function showImportResult(message, isError = false) {
        if (!importResult) return;
        importResult.classList.remove('hidden', 'border-red-200', 'bg-red-50', 'text-red-700', 'border-green-200', 'bg-green-50', 'text-green-700');
        if (isError) {
            importResult.classList.add('border-red-200', 'bg-red-50', 'text-red-700');
        } else {
            importResult.classList.add('border-green-200', 'bg-green-50', 'text-green-700');
        }
        importResult.textContent = message;
    }

    function typeOptions(selected = '') {
        return ASSET_TYPES.map((type) => `<option value="${type}" ${selected === type ? 'selected' : ''}>${type}</option>`).join('');
    }

    function closeAssetModal() {
        const modal = document.getElementById('asset-crud-modal');
        if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    }

    async function refreshTreeAndDetail(assetId = null) {
        await assetTree.load();
        if (assetId) {
            state.selectedAssetId = assetId;
            await assetDetail.load(assetId);
        } else if (state.selectedAssetId) {
            await assetDetail.load(state.selectedAssetId);
        }
    }

    function openAssetModal({ mode, parentAsset = null, asset = null }) {
        const isEdit = mode === 'edit';
        const modal = document.createElement('div');
        modal.id = 'asset-crud-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4';

        const title = isEdit ? 'Editar Activo' : 'Crear Activo';
        const parentLabel = isEdit
            ? (asset?.parent_id ? 'Mantiene relación de parent actual.' : 'Activo raíz (sin parent).')
            : (parentAsset ? `Se creará como hijo de: ${parentAsset.name}` : 'Se creará como activo raíz.');

        modal.innerHTML = `
            <div class="bg-white w-full max-w-lg rounded-xl border border-slate-200 shadow-xl">
                <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-slate-900">${title}</h3>
                    <button id="asset-modal-close" class="p-1 text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <form id="asset-crud-form" class="p-5 space-y-4">
                    <div class="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">${parentLabel}</div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                        <input id="asset-name" type="text" value="${isEdit ? (asset?.name || '') : ''}" required class="tk-input px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                        <select id="asset-type" class="tk-select px-3 py-2 text-sm">
                            ${typeOptions(isEdit ? (asset?.type || '') : '')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                        <textarea id="asset-description" rows="3" class="tk-textarea px-3 py-2 text-sm">${isEdit ? (asset?.description || '') : ''}</textarea>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" id="asset-modal-cancel" class="px-4 py-2 text-sm tk-btn-secondary">Cancelar</button>
                        <button type="submit" class="px-4 py-2 text-sm font-semibold rounded-lg tk-btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        `;

        const close = () => closeAssetModal();
        modal.querySelector('#asset-modal-close')?.addEventListener('click', close);
        modal.querySelector('#asset-modal-cancel')?.addEventListener('click', close);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) close();
        });

        modal.querySelector('#asset-crud-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();

            const payload = {
                name: modal.querySelector('#asset-name')?.value?.trim(),
                type: modal.querySelector('#asset-type')?.value,
                description: modal.querySelector('#asset-description')?.value?.trim() || null,
                parent_id: isEdit ? (asset?.parent_id || null) : (parentAsset?.id || null),
            };

            if (!payload.name || !payload.type) return;

            try {
                let response = null;
                if (isEdit) {
                    await ApiClient.patch(`/assets/${asset.id}`, payload);
                    response = { id: asset.id };
                } else {
                    response = await ApiClient.post('/assets', payload);
                }

                close();
                if (response?.id) {
                    setModuleContext({ asset_id: response.id }, 'assets');
                }
                await refreshTreeAndDetail(response?.id || null);
                uiFeedback.success('Activo guardado correctamente.');
            } catch (error) {
                uiFeedback.error(`No se pudo guardar el activo: ${error.message}`);
            }
        });

        document.body.appendChild(modal);
    }

    container.addEventListener('assetSelected', async (event) => {
        const assetId = event.detail.assetId;
        state.selectedAssetId = assetId;
        setModuleContext({ asset_id: assetId || null }, 'assets');
        await assetDetail.load(assetId);
    });

    toggleTreeBtn?.addEventListener('click', () => {
        state.expandedAll = !state.expandedAll;
        if (state.expandedAll) {
            assetTree.expandAll();
            toggleTreeBtn.title = 'Contraer todo';
        } else {
            assetTree.collapseAll();
            toggleTreeBtn.title = 'Expandir todo';
        }
    });

    templateBtn?.addEventListener('click', async () => {
        try {
            await downloadAssetBlob('/assets/xlsx/template', 'takta_assets_template.xlsx');
            showImportResult('Plantilla de árbol descargada correctamente.');
        } catch (error) {
            showImportResult(error.message, true);
        }
    });

    exportBtn?.addEventListener('click', async () => {
        try {
            await downloadAssetBlob('/assets/xlsx/export', 'takta_assets_export.xlsx');
            showImportResult('Exportación del árbol descargada correctamente.');
        } catch (error) {
            showImportResult(error.message, true);
        }
    });

    importBtn?.addEventListener('click', () => importInput?.click());
    importInput?.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const result = await uploadAssetsXlsx(file);
            showImportResult(formatImportSummary(result));
            await refreshTreeAndDetail(state.selectedAssetId);
        } catch (error) {
            showImportResult(error.message, true);
        } finally {
            event.target.value = '';
        }
    });

    newRootBtn?.addEventListener('click', () => {
        openAssetModal({ mode: 'create' });
    });

    emptyCreateBtn?.addEventListener('click', () => {
        openAssetModal({ mode: 'create' });
    });

    await assetTree.load();

    return container;
};

export default AssetsPage;
