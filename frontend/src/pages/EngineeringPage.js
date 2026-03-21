import ApiClient from '../services/api.client.js';

import {
    getHashContext,
    getModuleContext,
    setModuleContext,
    withModuleContext,
} from '../services/module-context.service.js';
import uiFeedback from '../services/ui-feedback.service.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const ACTIVITY_TYPES = ['Operation', 'Transport', 'Inspection', 'Delay', 'Storage'];

const TYPE_COLORS = {
    Operation: 'bg-green-100 text-green-700',
    Transport: 'bg-blue-100 text-blue-700',
    Inspection: 'bg-amber-100 text-amber-700',
    Delay: 'bg-red-100 text-red-700',
    Storage: 'bg-slate-100 text-slate-700',
};

function getAuthHeaders(extra = {}) {
    const token = localStorage.getItem('takta_token');
    return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getHashParams() {
    const hash = window.location.hash || '';
    const index = hash.indexOf('?');
    if (index === -1) return {};
    const params = {};
    new URLSearchParams(hash.substring(index + 1)).forEach((value, key) => {
        params[key] = value;
    });
    return params;
}

async function downloadBlob(path, filename) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
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

async function uploadXlsx(entity, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/engineering/xlsx/import?entity=${entity}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.detail || `Error importando archivo (${response.status})`);
    }
    return payload;
}

function formatImportSummary(result) {
    const base = `Creados: ${result.created} | Actualizados: ${result.updated}`;
    if (!result.errors_count) return `${base} | Sin errores`;
    return `${base} | Errores: ${result.errors_count}`;
}

function makeModal(root, title, body, onConfirm, confirmLabel = 'Guardar') {
    const overlay = root.querySelector('#eng-modal-overlay');
    const box = root.querySelector('#eng-modal-box');
    if (!overlay || !box) return;

    box.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-slate-900">${title}</h3>
            <button class="modal-close-btn w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Cerrar">✕</button>
        </div>
        <div>${body}</div>
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button class="modal-cancel-btn px-4 py-2 rounded-lg border border-slate-200 text-slate-600">Cancelar</button>
            <button class="modal-confirm-btn px-4 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600">${confirmLabel}</button>
        </div>
    `;

    overlay.classList.remove('hidden');

    box.querySelector('.modal-close-btn')?.addEventListener('click', () => overlay.classList.add('hidden'));
    box.querySelector('.modal-cancel-btn')?.addEventListener('click', () => overlay.classList.add('hidden'));
    box.querySelector('.modal-confirm-btn')?.addEventListener('click', onConfirm);
    overlay.addEventListener(
        'click',
        (event) => {
            if (event.target === overlay) overlay.classList.add('hidden');
        },
        { once: true },
    );
}

function hideModal(root) {
    root.querySelector('#eng-modal-overlay')?.classList.add('hidden');
}

async function EngineeringPage() {
    const root = document.createElement('div');
    root.className = 'p-4 md:p-6 max-w-7xl mx-auto';
    const hashParams = getHashParams();
    const hashContext = getHashContext();
    const storedContext = getModuleContext();
    const standardsContext = {
        asset_id: hashParams.asset_id || hashParams.assetId || hashContext.asset_id || storedContext.asset_id || '',
        product_reference_id: hashParams.product_reference_id || hashParams.reference_id || hashParams.referenceId || hashContext.product_reference_id || storedContext.product_reference_id || '',
        process_standard_id: hashParams.process_standard_id || hashParams.standard_id || hashParams.standardId || hashContext.process_standard_id || storedContext.process_standard_id || '',
    };
    const hasContext = standardsContext.asset_id || standardsContext.product_reference_id || standardsContext.process_standard_id;
    const initialTab = ['references', 'activities', 'context', 'standards'].includes(hashParams.tab)
        ? hashParams.tab
        : (hasContext ? 'standards' : 'references');
    if (hasContext) {
        setModuleContext(
            {
                asset_id: standardsContext.asset_id || null,
                product_reference_id: standardsContext.product_reference_id || null,
                process_standard_id: standardsContext.process_standard_id || null,
            },
            'engineering',
        );
    }

    root.innerHTML = `
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-900">Ingeniería</h1>
            <p class="text-slate-500 text-sm mt-1">Gestión de Referencias (SKU), Actividades, Estándares y carga masiva XLSX.</p>
            <p class="text-xs text-slate-500 mt-2">Los estudios de tiempo pueden asociarse a Activo, SKU y Proceso estándar.</p>
        </div>

        <div class="border-b border-slate-200 mb-6">
            <nav class="flex gap-4 overflow-x-auto pb-1" id="eng-tabs">
                <button data-tab="references" class="eng-tab pb-3 px-1 text-sm font-medium border-b-2 ${initialTab === 'references' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500'}">Referencias (SKU)</button>
                <button data-tab="activities" class="eng-tab pb-3 px-1 text-sm font-medium border-b-2 ${initialTab === 'activities' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500'}">Actividades</button>
                <button data-tab="context" class="eng-tab pb-3 px-1 text-sm font-medium border-b-2 ${initialTab === 'context' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500'}">Contexto Activo-Actividad</button>
                <button data-tab="standards" class="eng-tab pb-3 px-1 text-sm font-medium border-b-2 ${initialTab === 'standards' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500'}">Estándares</button>
            </nav>
        </div>

        <div id="eng-tab-content"></div>

        <div id="eng-modal-overlay" class="hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
            <div id="eng-modal-box" class="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6"></div>
        </div>
    `;

    const tabButtons = root.querySelectorAll('.eng-tab');

    tabButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            tabButtons.forEach((item) => {
                item.classList.remove('border-brand-orange', 'text-brand-orange');
                item.classList.add('border-transparent', 'text-slate-500');
            });

            button.classList.add('border-brand-orange', 'text-brand-orange');
            button.classList.remove('border-transparent', 'text-slate-500');
            await renderTab(button.dataset.tab);
        });
    });

    async function renderTab(tab) {
        const container = root.querySelector('#eng-tab-content');
        if (!container) return;

        container.innerHTML = '<div class="py-12 text-center text-slate-400">Cargando...</div>';

        try {
            if (tab === 'references') await renderReferences(container);
            if (tab === 'activities') await renderActivities(container);
            if (tab === 'context') await renderContext(container);
            if (tab === 'standards') await renderStandards(container, standardsContext);
        } catch (error) {
            container.innerHTML = `
                <div class="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                    Error cargando pestaña: ${escapeHtml(error.message)}
                </div>
            `;
        }
    }

    async function renderReferences(container) {
        const references = await ApiClient.get('/engineering/references');
        let currentReferences = [...references];

        container.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <input id="ref-search" type="text" placeholder="Buscar por código o descripción..." class="w-full sm:w-72 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40">
                <div class="flex flex-wrap gap-2">
                    <button id="ref-template" class="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">Plantilla XLSX</button>
                    <button id="ref-export" class="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">Exportar XLSX</button>
                    <input id="ref-import-input" type="file" accept=".xlsx" class="hidden">
                    <button id="ref-import" class="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">Importar XLSX</button>
                    <button id="btn-new-ref" class="tk-btn-primary px-4 py-2 text-sm">+ Nueva Referencia</button>
                </div>
            </div>

            <div id="ref-import-result" class="hidden mb-3 text-xs rounded-lg border px-3 py-2"></div>

            <div class="bg-white rounded-xl border border-slate-200 overflow-auto shadow-sm">
                <table class="w-full text-sm min-w-[860px]">
                    <thead class="bg-slate-50 text-slate-600">
                        <tr>
                            <th class="text-left px-4 py-3 font-medium">Código</th>
                            <th class="text-left px-4 py-3 font-medium">Descripción</th>
                            <th class="text-left px-4 py-3 font-medium">Familia</th>
                            <th class="text-left px-4 py-3 font-medium">Unidad de medida</th>
                            <th class="text-left px-4 py-3 font-medium">Unidad de embalaje</th>
                            <th class="text-right px-4 py-3 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="ref-body" class="divide-y divide-slate-100"></tbody>
                </table>
            </div>
        `;

        const body = container.querySelector('#ref-body');
        const searchInput = container.querySelector('#ref-search');
        const fileInput = container.querySelector('#ref-import-input');
        const resultBox = container.querySelector('#ref-import-result');

        const renderRows = (items) => {
            if (!body) return;

            if (!items.length) {
                body.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">No hay referencias registradas</td></tr>';
                return;
            }

            body.innerHTML = items
                .map(
                    (ref) => `
                        <tr class="hover:bg-slate-50">
                            <td class="px-4 py-3 font-mono text-xs text-slate-700">${escapeHtml(ref.code)}</td>
                            <td class="px-4 py-3 text-slate-800">${escapeHtml(ref.description)}</td>
                            <td class="px-4 py-3">${escapeHtml(ref.family)}</td>
                            <td class="px-4 py-3 text-slate-600">${escapeHtml(ref.uom || '-')}</td>
                            <td class="px-4 py-3 text-slate-600">${escapeHtml(ref.packaging_uom || '-')}</td>
                            <td class="px-4 py-3 text-right">
                                <button data-edit-ref="${ref.id}" class="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 mr-1">Editar</button>
                                <button data-del-ref="${ref.id}" class="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">Eliminar</button>
                            </td>
                        </tr>
                    `,
                )
                .join('');
        };

        renderRows(currentReferences);

        searchInput?.addEventListener('input', async (event) => {
            const search = event.target.value.trim();
            const data = await ApiClient.get(`/engineering/references?search=${encodeURIComponent(search)}`);
            currentReferences = data;
            renderRows(currentReferences);
        });

        body?.addEventListener('click', async (event) => {
            const editBtn = event.target.closest('[data-edit-ref]');
            if (editBtn) {
                const selected = currentReferences.find((item) => item.id === editBtn.dataset.editRef);
                if (!selected) return;

                makeModal(
                    root,
                    `Editar ${escapeHtml(selected.code)}`,
                    `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><label class="text-sm text-slate-600">Código</label><input id="edit-ref-code" value="${escapeHtml(selected.code)}" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                            <div><label class="text-sm text-slate-600">Familia</label><input id="edit-ref-family" value="${escapeHtml(selected.family)}" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                            <div class="md:col-span-2"><label class="text-sm text-slate-600">Descripción</label><input id="edit-ref-description" value="${escapeHtml(selected.description)}" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                            <div><label class="text-sm text-slate-600">Unidad de medida</label><input id="edit-ref-uom" value="${escapeHtml(selected.uom || '')}" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                            <div><label class="text-sm text-slate-600">Unidad de embalaje</label><input id="edit-ref-packaging-uom" value="${escapeHtml(selected.packaging_uom || '')}" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                        </div>
                    `,
                    async () => {
                        await ApiClient.patch(`/engineering/references/${selected.id}`, {
                            code: root.querySelector('#edit-ref-code')?.value?.trim(),
                            family: root.querySelector('#edit-ref-family')?.value?.trim(),
                            description: root.querySelector('#edit-ref-description')?.value?.trim(),
                            uom: root.querySelector('#edit-ref-uom')?.value?.trim() || null,
                            packaging_uom: root.querySelector('#edit-ref-packaging-uom')?.value?.trim() || null,
                        });
                        hideModal(root);
                        await renderReferences(container);
                    },
                    'Actualizar',
                );
                return;
            }

            const deleteBtn = event.target.closest('[data-del-ref]');
            if (!deleteBtn) return;

            if (!confirm('¿Eliminar referencia?')) return;

            try {
                await ApiClient.delete(`/engineering/references/${deleteBtn.dataset.delRef}`);
                await renderReferences(container);
            } catch (error) {
                uiFeedback.error(error.message);
            }
        });

        container.querySelector('#btn-new-ref')?.addEventListener('click', () => {
            makeModal(
                root,
                'Nueva Referencia (SKU)',
                `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label class="text-sm text-slate-600">Código</label><input id="ref-code" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                        <div><label class="text-sm text-slate-600">Familia</label><input id="ref-family" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                        <div class="md:col-span-2"><label class="text-sm text-slate-600">Descripción</label><input id="ref-description" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                        <div><label class="text-sm text-slate-600">Unidad de medida</label><input id="ref-uom" placeholder="kg, und, L..." class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                        <div><label class="text-sm text-slate-600">Unidad de embalaje</label><input id="ref-packaging-uom" placeholder="caja, pallet..." class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                    </div>
                `,
                async () => {
                    const payload = {
                        code: root.querySelector('#ref-code')?.value?.trim(),
                        family: root.querySelector('#ref-family')?.value?.trim(),
                        description: root.querySelector('#ref-description')?.value?.trim(),
                        uom: root.querySelector('#ref-uom')?.value?.trim() || null,
                        packaging_uom: root.querySelector('#ref-packaging-uom')?.value?.trim() || null,
                    };

                    if (!payload.code || !payload.description || !payload.family) {
                        uiFeedback.warning('Código, descripción y familia son obligatorios.');
                        return;
                    }

                    await ApiClient.post('/engineering/references', payload);
                    hideModal(root);
                    await renderReferences(container);
                },
            );
        });

        container.querySelector('#ref-import')?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            try {
                const result = await uploadXlsx('references', file);
                resultBox.className = 'mb-3 text-xs rounded-lg border px-3 py-2 border-green-200 bg-green-50 text-green-700';
                resultBox.textContent = formatImportSummary(result);
                resultBox.classList.remove('hidden');
                await renderReferences(container);
            } catch (error) {
                resultBox.className = 'mb-3 text-xs rounded-lg border px-3 py-2 border-red-200 bg-red-50 text-red-700';
                resultBox.textContent = error.message;
                resultBox.classList.remove('hidden');
            } finally {
                event.target.value = '';
            }
        });

        container.querySelector('#ref-template')?.addEventListener('click', async () => {
            try {
                await downloadBlob('/engineering/xlsx/template?entity=references', 'takta_references_template.xlsx');
            } catch (error) {
                uiFeedback.error(error.message);
            }
        });

        container.querySelector('#ref-export')?.addEventListener('click', async () => {
            try {
                await downloadBlob('/engineering/xlsx/export?entity=references', 'takta_references_export.xlsx');
            } catch (error) {
                uiFeedback.error(error.message);
            }
        });
    }
    async function renderActivities(container) {
        const activities = await ApiClient.get('/engineering/activities');
        let currentActivities = [...activities];

        container.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <select id="act-filter" class="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                    <option value="">Todos los tipos</option>
                    ${ACTIVITY_TYPES.map((type) => `<option value="${type}">${type}</option>`).join('')}
                </select>
                <div class="flex flex-wrap gap-2">
                    <button id="act-template" class="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">Plantilla XLSX</button>
                    <button id="act-export" class="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">Exportar XLSX</button>
                    <input id="act-import-input" type="file" accept=".xlsx" class="hidden">
                    <button id="act-import" class="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">Importar XLSX</button>
                    <button id="btn-new-act" class="tk-btn-primary px-4 py-2 text-sm">+ Nueva Actividad</button>
                </div>
            </div>

            <div class="bg-white rounded-xl border border-slate-200 overflow-auto shadow-sm">
                <table class="w-full text-sm min-w-[860px]">
                    <thead class="bg-slate-50 text-slate-600">
                        <tr>
                            <th class="text-left px-4 py-3 font-medium">Nombre</th>
                            <th class="text-left px-4 py-3 font-medium">Tipo</th>
                            <th class="text-left px-4 py-3 font-medium">Valor agregado</th>
                            <th class="text-right px-4 py-3 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="act-body" class="divide-y divide-slate-100"></tbody>
                </table>
            </div>
        `;

        const body = container.querySelector('#act-body');
        const filterSelect = container.querySelector('#act-filter');
        const fileInput = container.querySelector('#act-import-input');

        const renderRows = (items) => {
            if (!body) return;

            if (!items.length) {
                body.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-slate-400">No hay actividades registradas</td></tr>';
                return;
            }

            body.innerHTML = items
                .map(
                    (activity) => `
                        <tr class="hover:bg-slate-50">
                            <td class="px-4 py-3 text-slate-800 font-medium">${escapeHtml(activity.name)}</td>
                            <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs ${TYPE_COLORS[activity.type] || 'bg-slate-100 text-slate-700'}">${escapeHtml(activity.type)}</span></td>
                            <td class="px-4 py-3 text-slate-600">${activity.is_value_added ? 'Sí' : 'No'}</td>
                            <td class="px-4 py-3 text-right">
                                <button data-edit-act="${activity.id}" class="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 mr-1">Editar</button>
                                <button data-del-act="${activity.id}" class="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">Eliminar</button>
                            </td>
                        </tr>
                    `,
                )
                .join('');
        };

        renderRows(currentActivities);

        filterSelect?.addEventListener('change', async (event) => {
            const type = event.target.value;
            const endpoint = type ? `/engineering/activities?type=${encodeURIComponent(type)}` : '/engineering/activities';
            currentActivities = await ApiClient.get(endpoint);
            renderRows(currentActivities);
        });

        body?.addEventListener('click', async (event) => {
            const editBtn = event.target.closest('[data-edit-act]');
            if (editBtn) {
                const selected = currentActivities.find((item) => item.id === editBtn.dataset.editAct);
                if (!selected) return;

                makeModal(
                    root,
                    `Editar ${escapeHtml(selected.name)}`,
                    `
                        <div class="space-y-3">
                            <div><label class="text-sm text-slate-600">Nombre</label><input id="edit-act-name" value="${escapeHtml(selected.name)}" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                            <div><label class="text-sm text-slate-600">Tipo</label>
                                <select id="edit-act-type" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                                    ${ACTIVITY_TYPES.map((type) => `<option value="${type}" ${selected.type === type ? 'selected' : ''}>${type}</option>`).join('')}
                                </select>
                            </div>
                            <label class="inline-flex items-center gap-2 text-sm text-slate-600"><input id="edit-act-va" type="checkbox" ${selected.is_value_added ? 'checked' : ''}> ¿Agrega valor?</label>
                        </div>
                    `,
                    async () => {
                        const payload = {
                            name: root.querySelector('#edit-act-name')?.value?.trim(),
                            type: root.querySelector('#edit-act-type')?.value,
                            is_value_added: root.querySelector('#edit-act-va')?.checked || false,
                        };

                        if (!payload.name || !payload.type) {
                            uiFeedback.warning('Nombre y tipo son obligatorios.');
                            return;
                        }

                        await ApiClient.patch(`/engineering/activities/${selected.id}`, payload);
                        hideModal(root);
                        await renderActivities(container);
                    },
                    'Actualizar',
                );
                return;
            }

            const deleteBtn = event.target.closest('[data-del-act]');
            if (!deleteBtn) return;

            if (!confirm('¿Eliminar actividad?')) return;

            try {
                await ApiClient.delete(`/engineering/activities/${deleteBtn.dataset.delAct}`);
                await renderActivities(container);
            } catch (error) {
                uiFeedback.error(error.message);
            }
        });

        container.querySelector('#btn-new-act')?.addEventListener('click', () => {
            makeModal(
                root,
                'Nueva Actividad',
                `
                    <div class="space-y-3">
                        <div><label class="text-sm text-slate-600">Nombre</label><input id="act-name" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                        <div><label class="text-sm text-slate-600">Tipo</label>
                            <select id="act-type" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">${ACTIVITY_TYPES.map((type) => `<option value="${type}">${type}</option>`).join('')}</select>
                        </div>
                        <label class="inline-flex items-center gap-2 text-sm text-slate-600"><input id="act-va" type="checkbox"> ¿Agrega valor?</label>
                    </div>
                `,
                async () => {
                    const payload = {
                        name: root.querySelector('#act-name')?.value?.trim(),
                        type: root.querySelector('#act-type')?.value,
                        is_value_added: root.querySelector('#act-va')?.checked || false,
                    };

                    if (!payload.name || !payload.type) {
                        uiFeedback.warning('Nombre y tipo son obligatorios.');
                        return;
                    }

                    await ApiClient.post('/engineering/activities', payload);
                    hideModal(root);
                    await renderActivities(container);
                },
            );
        });

        container.querySelector('#act-import')?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            try {
                const result = await uploadXlsx('activities', file);
                uiFeedback.success(formatImportSummary(result));
                await renderActivities(container);
            } catch (error) {
                uiFeedback.error(error.message);
            } finally {
                event.target.value = '';
            }
        });

        container.querySelector('#act-template')?.addEventListener('click', async () => {
            try {
                await downloadBlob('/engineering/xlsx/template?entity=activities', 'takta_activities_template.xlsx');
            } catch (error) {
                uiFeedback.error(error.message);
            }
        });

        container.querySelector('#act-export')?.addEventListener('click', async () => {
            try {
                await downloadBlob('/engineering/xlsx/export?entity=activities', 'takta_activities_export.xlsx');
            } catch (error) {
                uiFeedback.error(error.message);
            }
        });
    }

    async function renderContext(container) {
        const [assets, activities] = await Promise.all([
            ApiClient.get('/assets'),
            ApiClient.get('/engineering/activities'),
        ]);

        const assetOptions = assets.map((asset) => `<option value="${asset.id}">${escapeHtml(asset.name)} (${escapeHtml(asset.type)})</option>`).join('');
        const activityOptions = activities.map((activity) => `<option value="${activity.id}">${escapeHtml(activity.name)} (${escapeHtml(activity.type)})</option>`).join('');

        container.innerHTML = `
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div class="md:col-span-2">
                        <label class="block text-sm text-slate-600 mb-1">Activo</label>
                        <select id="ctx-asset" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                            <option value="">Selecciona un activo...</option>
                            ${assetOptions}
                        </select>
                    </div>
                    <div class="flex items-end">
                        <button id="ctx-refresh" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">Refrescar</button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <h3 class="text-sm font-semibold text-slate-800 mb-3">Asignar actividad permitida</h3>
                    <form id="ctx-form" class="space-y-3">
                        <select id="ctx-activity" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                            <option value="">Actividad...</option>
                            ${activityOptions}
                        </select>
                        <input id="ctx-source" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value="manual" placeholder="source">
                        <button class="w-full tk-btn-primary px-3 py-2 text-sm">Asignar actividad</button>
                    </form>
                    <p class="text-xs text-slate-500 mt-3">Estas reglas habilitan la creación estricta de estándares por activo en `/standards/strict`.</p>
                </section>

                <section class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div class="px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <h3 class="text-sm font-semibold text-slate-700">Actividades permitidas por activo</h3>
                    </div>
                    <div class="max-h-[360px] overflow-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-slate-50 text-slate-600 sticky top-0">
                                <tr>
                                    <th class="text-left px-3 py-2">Actividad</th>
                                    <th class="text-left px-3 py-2">Tipo</th>
                                    <th class="text-left px-3 py-2">Fuente</th>
                                    <th class="text-right px-3 py-2">Acción</th>
                                </tr>
                            </thead>
                            <tbody id="ctx-body" class="divide-y divide-slate-100">
                                <tr><td colspan="4" class="px-3 py-6 text-center text-slate-400">Selecciona un activo para ver contexto.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        `;

        const assetSelect = container.querySelector('#ctx-asset');
        const body = container.querySelector('#ctx-body');

        const loadContextRows = async () => {
            const assetId = assetSelect?.value;
            if (!assetId) {
                body.innerHTML = '<tr><td colspan="4" class="px-3 py-6 text-center text-slate-400">Selecciona un activo para ver contexto.</td></tr>';
                return;
            }
            const rows = await ApiClient.get(`/engineering/context/${assetId}/activities?include_unrestricted=false`);
            if (!rows.length) {
                body.innerHTML = '<tr><td colspan="4" class="px-3 py-6 text-center text-slate-400">Sin reglas explícitas. Puedes asignar desde el panel izquierdo.</td></tr>';
                return;
            }
            body.innerHTML = rows.map((row) => `
                <tr>
                    <td class="px-3 py-2 text-slate-800">${escapeHtml(row.activity_name)}</td>
                    <td class="px-3 py-2 text-slate-600">${escapeHtml(row.activity_type)}</td>
                    <td class="px-3 py-2 text-slate-600">${escapeHtml(row.source || 'manual')}</td>
                    <td class="px-3 py-2 text-right">
                        <button data-del-ctx="${row.activity_id}" class="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">Eliminar</button>
                    </td>
                </tr>
            `).join('');
        };

        assetSelect?.addEventListener('change', loadContextRows);
        container.querySelector('#ctx-refresh')?.addEventListener('click', loadContextRows);

        container.querySelector('#ctx-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const assetId = assetSelect?.value;
            const activityId = container.querySelector('#ctx-activity')?.value;
            if (!assetId) {
                uiFeedback.warning('Selecciona primero un activo.');
                return;
            }
            if (!activityId) {
                uiFeedback.warning('Selecciona una actividad.');
                return;
            }
            try {
                await ApiClient.post(`/engineering/context/${assetId}/activities`, {
                    activity_id: activityId,
                    source: container.querySelector('#ctx-source')?.value?.trim() || 'manual',
                    is_active: true,
                });
                await loadContextRows();
            } catch (error) {
                uiFeedback.error(error.message);
            }
        });

        body?.addEventListener('click', async (event) => {
            const delBtn = event.target.closest('[data-del-ctx]');
            if (!delBtn) return;
            const assetId = assetSelect?.value;
            if (!assetId) return;
            if (!confirm('¿Eliminar regla de contexto?')) return;
            try {
                await ApiClient.delete(`/engineering/context/${assetId}/activities/${delBtn.dataset.delCtx}`);
                await loadContextRows();
            } catch (error) {
                uiFeedback.error(error.message);
            }
        });
    }

    async function renderStandards(container, initialContext = {}) {
        const initialAssetId = initialContext.asset_id || '';
        const initialReferenceId = initialContext.product_reference_id || '';
        const initialStandardId = initialContext.process_standard_id || '';

        const [standards, assets, activities, references] = await Promise.all([
            ApiClient.get('/engineering/standards'),
            ApiClient.get('/assets'),
            ApiClient.get('/engineering/activities'),
            ApiClient.get('/engineering/references'),
        ]);

        let currentStandards = [...standards];
        const applyContextFilter = (rows) => rows.filter((row) => {
            if (initialReferenceId && row.product_reference_id !== initialReferenceId) return false;
            if (initialStandardId && row.id !== initialStandardId) return false;
            return true;
        });

        container.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <select id="std-filter" class="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                    <option value="">Todos los activos</option>
                    ${assets.map((asset) => `<option value="${asset.id}">${escapeHtml(asset.name)} (${escapeHtml(asset.type)})</option>`).join('')}
                </select>
                <div class="flex flex-wrap gap-2">
                    <a id="std-open-timing" href="${withModuleContext('#/timing', initialContext)}" class="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm hover:bg-blue-100">Abrir Cronómetro</a>
                    <button id="std-template" class="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">Plantilla XLSX</button>
                    <button id="std-export" class="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">Exportar XLSX</button>
                    <input id="std-import-input" type="file" accept=".xlsx" class="hidden">
                    <button id="std-import" class="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">Importar XLSX</button>
                    <button id="btn-new-std" class="tk-btn-primary px-4 py-2 text-sm">+ Asignar Estándar</button>
                </div>
            </div>

            <div class="bg-white rounded-xl border border-slate-200 overflow-auto shadow-sm">
                <table class="w-full text-sm min-w-[1120px]">
                    <thead class="bg-slate-50 text-slate-600">
                        <tr>
                            <th class="text-left px-4 py-3 font-medium">Activo</th>
                            <th class="text-left px-4 py-3 font-medium">Actividad</th>
                            <th class="text-left px-4 py-3 font-medium">Referencia</th>
                            <th class="text-right px-4 py-3 font-medium">Tiempo std (min)</th>
                            <th class="text-left px-4 py-3 font-medium">Frecuencia</th>
                            <th class="text-left px-4 py-3 font-medium">Unidad capacidad</th>
                            <th class="text-center px-4 py-3 font-medium">Estado</th>
                            <th class="text-right px-4 py-3 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="std-body" class="divide-y divide-slate-100"></tbody>
                </table>
            </div>
        `;

        const body = container.querySelector('#std-body');
        const filterSelect = container.querySelector('#std-filter');
        const fileInput = container.querySelector('#std-import-input');
        const timingLink = container.querySelector('#std-open-timing');
        const buildActiveContext = (overrides = {}) => ({
            asset_id: overrides.asset_id !== undefined ? overrides.asset_id : (filterSelect?.value || initialAssetId || null),
            product_reference_id: overrides.product_reference_id !== undefined ? overrides.product_reference_id : (initialReferenceId || null),
            process_standard_id: overrides.process_standard_id !== undefined ? overrides.process_standard_id : (initialStandardId || null),
        });

        const renderRows = (items) => {
            if (!body) return;
            const visibleItems = applyContextFilter(items);

            if (!visibleItems.length) {
                body.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-slate-400">No hay estándares registrados</td></tr>';
                return;
            }

            body.innerHTML = visibleItems
                .map(
                    (std) => `
                        <tr class="${std.is_active ? '' : 'opacity-60'} ${initialStandardId === std.id ? 'bg-orange-50/70' : ''} hover:bg-slate-50">
                            <td class="px-4 py-3 font-medium text-slate-800">${escapeHtml(std.asset_name || '-')}</td>
                            <td class="px-4 py-3">${escapeHtml(std.activity_name || '-')}</td>
                            <td class="px-4 py-3 font-mono text-xs text-slate-600">${escapeHtml(std.reference_code || '(General)')}</td>
                            <td class="px-4 py-3 text-right font-mono">${std.standard_time_minutes != null ? Number(std.standard_time_minutes).toFixed(3) : '-'}</td>
                            <td class="px-4 py-3">${escapeHtml(std.frequency || '-')}</td>
                            <td class="px-4 py-3">${escapeHtml(std.capacity_unit || '-')}</td>
                            <td class="px-4 py-3 text-center">
                                <button data-toggle-std="${std.id}" data-new-state="${!std.is_active}" class="px-2 py-1 rounded-full text-xs ${std.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}">${std.is_active ? 'Activo' : 'Inactivo'}</button>
                            </td>
                            <td class="px-4 py-3 text-right">
                                <a href="${withModuleContext(`#/editor?source_module=engineering&source_route=${encodeURIComponent('#/engineering')}&activity_id=${std.activity_id || ''}`, { asset_id: std.asset_id || null, product_reference_id: std.product_reference_id || null, process_standard_id: std.id })}" class="text-xs px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 mr-1">Documento</a>
                                <button data-edit-std="${std.id}" class="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 mr-1">Editar</button>
                                <button data-del-std="${std.id}" class="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">Eliminar</button>
                            </td>
                        </tr>
                    `,
                )
                .join('');
        };

        renderRows(currentStandards);

        filterSelect?.addEventListener('change', async (event) => {
            const assetId = event.target.value;
            const endpoint = assetId ? `/engineering/standards?asset_id=${assetId}` : '/engineering/standards';
            currentStandards = await ApiClient.get(endpoint);
            setModuleContext(
                {
                    asset_id: assetId || null,
                    product_reference_id: initialReferenceId || null,
                    process_standard_id: null,
                },
                'engineering',
            );
            if (timingLink) {
                timingLink.href = withModuleContext('#/timing', {
                    asset_id: assetId || null,
                    product_reference_id: initialReferenceId || null,
                    process_standard_id: null,
                });
            }
            renderRows(currentStandards);
        });

        if (initialAssetId && assets.some((asset) => asset.id === initialAssetId)) {
            filterSelect.value = initialAssetId;
            currentStandards = await ApiClient.get(`/engineering/standards?asset_id=${initialAssetId}`);
            renderRows(currentStandards);
        }

        body?.addEventListener('click', async (event) => {
            const toggleBtn = event.target.closest('[data-toggle-std]');
            if (toggleBtn) {
                const selected = currentStandards.find((item) => item.id === toggleBtn.dataset.toggleStd);
                if (selected) {
                    setModuleContext(
                        {
                            asset_id: selected.asset_id || null,
                            product_reference_id: selected.product_reference_id || null,
                            process_standard_id: selected.id,
                        },
                        'engineering',
                    );
                }
                await ApiClient.patch(`/engineering/standards/${toggleBtn.dataset.toggleStd}`, {
                    is_active: toggleBtn.dataset.newState === 'true',
                });
                await renderStandards(container, buildActiveContext());
                return;
            }

            const editBtn = event.target.closest('[data-edit-std]');
            if (editBtn) {
                const selected = currentStandards.find((item) => item.id === editBtn.dataset.editStd);
                if (!selected) return;
                setModuleContext(
                    {
                        asset_id: selected.asset_id || null,
                        product_reference_id: selected.product_reference_id || null,
                        process_standard_id: selected.id,
                    },
                    'engineering',
                );

                makeModal(
                    root,
                    'Editar Estándar',
                    `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><label class="text-sm text-slate-600">Tiempo estándar (min)</label><input id="edit-std-time" type="number" step="0.001" value="${selected.standard_time_minutes != null ? escapeHtml(selected.standard_time_minutes) : ''}" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                            <div><label class="text-sm text-slate-600">Frecuencia</label><input id="edit-std-frequency" value="${escapeHtml(selected.frequency || '')}" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                            <div><label class="text-sm text-slate-600">Unidad de capacidad</label><input id="edit-std-capacity" value="${escapeHtml(selected.capacity_unit || '')}" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                            <label class="inline-flex items-center gap-2 text-sm text-slate-600 mt-7"><input id="edit-std-active" type="checkbox" ${selected.is_active ? 'checked' : ''}> Estándar activo</label>
                        </div>
                    `,
                    async () => {
                        const rawTime = root.querySelector('#edit-std-time')?.value;
                        const parsedTime = rawTime === '' ? null : Number(rawTime);
                        if (parsedTime !== null && Number.isNaN(parsedTime)) {
                            uiFeedback.warning('El tiempo estándar debe ser numérico.');
                            return;
                        }

                        await ApiClient.patch(`/engineering/standards/${selected.id}`, {
                            standard_time_minutes: parsedTime,
                            frequency: root.querySelector('#edit-std-frequency')?.value?.trim() || null,
                            capacity_unit: root.querySelector('#edit-std-capacity')?.value?.trim() || null,
                            is_active: root.querySelector('#edit-std-active')?.checked || false,
                        });

                        hideModal(root);
                        await renderStandards(container, buildActiveContext());
                    },
                    'Actualizar',
                );
                return;
            }

            const deleteBtn = event.target.closest('[data-del-std]');
            if (!deleteBtn) return;

            if (!confirm('¿Eliminar estándar?')) return;

            try {
                const selected = currentStandards.find((item) => item.id === deleteBtn.dataset.delStd);
                if (selected) {
                    setModuleContext(
                        {
                            asset_id: selected.asset_id || null,
                            product_reference_id: selected.product_reference_id || null,
                            process_standard_id: selected.id,
                        },
                        'engineering',
                    );
                }
                await ApiClient.delete(`/engineering/standards/${deleteBtn.dataset.delStd}`);
                await renderStandards(container, buildActiveContext());
            } catch (error) {
                uiFeedback.error(error.message);
            }
        });

        container.querySelector('#btn-new-std')?.addEventListener('click', async () => {
            const defaultAssetId = filterSelect?.value || initialAssetId || assets[0]?.id || '';
            const buildActivityOptions = (rows) => rows.map((activity) => `<option value="${activity.activity_id || activity.id}">${escapeHtml(activity.activity_name || activity.name)} (${escapeHtml(activity.activity_type || activity.type)})</option>`).join('');

            let contextualActivities = [];
            if (defaultAssetId) {
                try {
                    contextualActivities = await ApiClient.get(`/engineering/context/${defaultAssetId}/activities?include_unrestricted=false`);
                } catch {
                    contextualActivities = [];
                }
            }

            makeModal(
                root,
                'Asignar Estándar (Triada)',
                `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label class="text-sm text-slate-600">Activo</label>
                            <select id="std-asset" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">${assets.map((asset) => `<option value="${asset.id}" ${asset.id === defaultAssetId ? 'selected' : ''}>${escapeHtml(asset.name)} (${escapeHtml(asset.type)})</option>`).join('')}</select>
                        </div>
                        <div><label class="text-sm text-slate-600">Actividad</label>
                            <select id="std-activity" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                                ${contextualActivities.length ? buildActivityOptions(contextualActivities) : activities.map((activity) => `<option value="${activity.id}">${escapeHtml(activity.name)} (${escapeHtml(activity.type)})</option>`).join('')}
                            </select>
                        </div>
                        <p id="std-context-msg" class="md:col-span-2 text-xs ${contextualActivities.length ? 'text-emerald-700' : 'text-amber-700'}">
                            ${contextualActivities.length
                                ? `Contexto activo: ${contextualActivities.length} actividad(es) permitidas para este activo.`
                                : 'Sin reglas de contexto explícitas para el activo. Se muestran todas las actividades disponibles.'}
                        </p>
                        <div class="md:col-span-2"><label class="text-sm text-slate-600">Referencia SKU (opcional)</label>
                            <select id="std-reference" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"><option value="">Sin referencia específica</option>${references.map((ref) => `<option value="${ref.id}">${escapeHtml(ref.code)} - ${escapeHtml(ref.description)}</option>`).join('')}</select>
                        </div>
                        <div><label class="text-sm text-slate-600">Tiempo estándar (min)</label><input id="std-time" type="number" step="0.001" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                        <div><label class="text-sm text-slate-600">Frecuencia</label><input id="std-frequency" value="Per Unit" class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                        <div><label class="text-sm text-slate-600">Unidad capacidad</label><input id="std-capacity-unit" placeholder="und/h, kg/h..." class="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"></div>
                    </div>
                `,
                async () => {
                    const rawTime = root.querySelector('#std-time')?.value;
                    const parsedTime = rawTime === '' ? null : Number(rawTime);
                    if (parsedTime !== null && Number.isNaN(parsedTime)) {
                        uiFeedback.warning('El tiempo estándar debe ser numérico.');
                        return;
                    }

                    const payload = {
                        asset_id: root.querySelector('#std-asset')?.value,
                        activity_id: root.querySelector('#std-activity')?.value,
                        product_reference_id: root.querySelector('#std-reference')?.value || null,
                        standard_time_minutes: parsedTime,
                        frequency: root.querySelector('#std-frequency')?.value?.trim() || null,
                        capacity_unit: root.querySelector('#std-capacity-unit')?.value?.trim() || null,
                    };
                    const created = await ApiClient.post('/engineering/standards/strict', payload);
                    setModuleContext(
                        {
                            asset_id: payload.asset_id || null,
                            product_reference_id: payload.product_reference_id || null,
                            process_standard_id: created?.id || null,
                        },
                        'engineering',
                    );

                    hideModal(root);
                    await renderStandards(container, {
                        asset_id: payload.asset_id || null,
                        product_reference_id: payload.product_reference_id || null,
                        process_standard_id: created?.id || null,
                    });
                },
            );

            const modalAsset = root.querySelector('#std-asset');
            const modalActivity = root.querySelector('#std-activity');
            const contextMsg = root.querySelector('#std-context-msg');
            const refreshContextActivities = async () => {
                const assetId = modalAsset?.value || '';
                let rows = [];
                if (assetId) {
                    try {
                        rows = await ApiClient.get(`/engineering/context/${assetId}/activities?include_unrestricted=false`);
                    } catch {
                        rows = [];
                    }
                }
                if (rows.length) {
                    modalActivity.innerHTML = buildActivityOptions(rows);
                    if (contextMsg) {
                        contextMsg.className = 'md:col-span-2 text-xs text-emerald-700';
                        contextMsg.textContent = `Contexto activo: ${rows.length} actividad(es) permitidas para este activo.`;
                    }
                } else {
                    modalActivity.innerHTML = activities.map((activity) => `<option value="${activity.id}">${escapeHtml(activity.name)} (${escapeHtml(activity.type)})</option>`).join('');
                    if (contextMsg) {
                        contextMsg.className = 'md:col-span-2 text-xs text-amber-700';
                        contextMsg.textContent = 'Sin reglas de contexto explícitas para el activo. Se muestran todas las actividades disponibles.';
                    }
                }
            };
            modalAsset?.addEventListener('change', refreshContextActivities);
        });

        container.querySelector('#std-import')?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            try {
                const result = await uploadXlsx('standards', file);
                uiFeedback.success(formatImportSummary(result));
                await renderStandards(container, buildActiveContext());
            } catch (error) {
                uiFeedback.error(error.message);
            } finally {
                event.target.value = '';
            }
        });

        container.querySelector('#std-template')?.addEventListener('click', async () => {
            try {
                await downloadBlob('/engineering/xlsx/template?entity=standards', 'takta_standards_template.xlsx');
            } catch (error) {
                uiFeedback.error(error.message);
            }
        });

        container.querySelector('#std-export')?.addEventListener('click', async () => {
            try {
                await downloadBlob('/engineering/xlsx/export?entity=standards', 'takta_standards_export.xlsx');
            } catch (error) {
                uiFeedback.error(error.message);
            }
        });
    }

    await renderTab(initialTab);
    return root;
}

export default EngineeringPage;


