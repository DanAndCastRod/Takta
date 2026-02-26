/**
 * EngineeringPage — Sprint 5: Gestión de Estándares
 * Tabbed page: References | Activities | Standards
 */
import ApiClient from '../services/api.client.js';

async function EngineeringPage() {
    const container = document.createElement('div');
    container.className = 'p-6 max-w-7xl mx-auto';

    container.innerHTML = `
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-bold text-slate-900">Ingeniería</h1>
                <p class="text-slate-500 text-sm mt-1">Gestión de Estándares, Actividades y Referencias (SKU)</p>
            </div>
        </div>

        <!-- Tabs -->
        <div class="border-b border-slate-200 mb-6">
            <nav class="flex gap-4" id="eng-tabs">
                <button data-tab="references" class="eng-tab eng-tab-active pb-3 px-1 text-sm font-medium border-b-2 border-brand-orange text-brand-orange transition-all cursor-pointer">
                    Referencias (SKU)
                </button>
                <button data-tab="activities" class="eng-tab pb-3 px-1 text-sm font-medium text-slate-500 border-b-2 border-transparent hover:text-slate-700 transition-all cursor-pointer">
                    Actividades
                </button>
                <button data-tab="standards" class="eng-tab pb-3 px-1 text-sm font-medium text-slate-500 border-b-2 border-transparent hover:text-slate-700 transition-all cursor-pointer">
                    Estándares (Triada)
                </button>
            </nav>
        </div>

        <!-- Tab Content -->
        <div id="eng-tab-content"></div>

        <!-- Modal Container -->
        <div id="eng-modal-overlay" class="hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
            <div id="eng-modal-box" class="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 transform transition-all"></div>
        </div>
    `;

    // ── Wire up tabs ──────────────────────────
    const tabBtns = container.querySelectorAll('.eng-tab');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => {
                b.classList.remove('eng-tab-active', 'border-brand-orange', 'text-brand-orange');
                b.classList.add('text-slate-500', 'border-transparent');
            });
            btn.classList.add('eng-tab-active', 'border-brand-orange', 'text-brand-orange');
            btn.classList.remove('text-slate-500', 'border-transparent');
            renderTab(btn.dataset.tab, container);
        });
    });

    // Load initial tab
    await renderTab('references', container);

    return container;
}


// ─────────────────────────────────────────────
// Tab Renderers
// ─────────────────────────────────────────────

async function renderTab(tab, root) {
    const container = root.querySelector('#eng-tab-content');
    if (!container) return;

    container.innerHTML = `<div class="flex items-center justify-center py-12"><div class="animate-pulse text-slate-400">Cargando...</div></div>`;

    try {
        if (tab === 'references') await renderReferencesTab(container, root);
        else if (tab === 'activities') await renderActivitiesTab(container, root);
        else if (tab === 'standards') await renderStandardsTab(container, root);
    } catch (err) {
        container.innerHTML = `<div class="text-red-500 p-4">Error: ${err.message}</div>`;
    }
}


// ── References Tab ──────────────────────────

async function renderReferencesTab(container, root) {
    const refs = await ApiClient.get('/engineering/references/');

    container.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <input id="ref-search" type="text" placeholder="Buscar por código o descripción..."
                   class="w-64 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all" />
            <button id="btn-new-ref" class="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 shadow-sm transition-all cursor-pointer">
                + Nueva Referencia
            </button>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table class="w-full text-sm">
                <thead class="bg-slate-50 text-slate-600">
                    <tr>
                        <th class="text-left px-4 py-3 font-medium">Código</th>
                        <th class="text-left px-4 py-3 font-medium">Descripción</th>
                        <th class="text-left px-4 py-3 font-medium">Familia</th>
                    </tr>
                </thead>
                <tbody id="ref-tbody" class="divide-y divide-slate-100">
                    ${refs.length === 0
            ? '<tr><td colspan="3" class="px-4 py-8 text-center text-slate-400">No hay referencias registradas</td></tr>'
            : refs.map(r => refRow(r)).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Search
    container.querySelector('#ref-search')?.addEventListener('input', async (e) => {
        const q = e.target.value;
        const filtered = await ApiClient.get(`/engineering/references/?search=${encodeURIComponent(q)}`);
        const tbody = container.querySelector('#ref-tbody');
        if (tbody) tbody.innerHTML = filtered.length ? filtered.map(r => refRow(r)).join('') : '<tr><td colspan="3" class="px-4 py-8 text-center text-slate-400">Sin resultados</td></tr>';
    });

    // New reference
    container.querySelector('#btn-new-ref')?.addEventListener('click', () => {
        showModal(root, 'Nueva Referencia (SKU)', `
            <div class="space-y-4">
                <div><label class="block text-sm font-medium text-slate-700 mb-1">Código</label>
                    <input id="modal-ref-code" type="text" placeholder="SKU-001" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" /></div>
                <div><label class="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                    <input id="modal-ref-desc" type="text" placeholder="Producto X 1kg" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" /></div>
                <div><label class="block text-sm font-medium text-slate-700 mb-1">Familia</label>
                    <input id="modal-ref-family" type="text" placeholder="Pollo, Cerdo, etc." class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" /></div>
            </div>
        `, async () => {
            const code = root.querySelector('#modal-ref-code')?.value?.trim();
            const description = root.querySelector('#modal-ref-desc')?.value?.trim();
            const family = root.querySelector('#modal-ref-family')?.value?.trim();
            if (!code || !description || !family) { alert('Todos los campos son requeridos'); return; }
            await ApiClient.post('/engineering/references/', { code, description, family });
            hideModal(root);
            renderTab('references', root);
        });
    });
}

function refRow(r) {
    return `<tr class="hover:bg-slate-50 transition-colors">
        <td class="px-4 py-3 font-mono text-xs text-slate-700">${r.code}</td>
        <td class="px-4 py-3 text-slate-800">${r.description}</td>
        <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">${r.family}</span></td>
    </tr>`;
}


// ── Activities Tab ──────────────────────────

const ACTIVITY_TYPES = ['Operation', 'Transport', 'Inspection', 'Delay', 'Storage'];
const TYPE_COLORS = {
    'Operation': 'bg-green-100 text-green-700',
    'Transport': 'bg-blue-100 text-blue-700',
    'Inspection': 'bg-yellow-100 text-yellow-700',
    'Delay': 'bg-red-100 text-red-700',
    'Storage': 'bg-purple-100 text-purple-700',
};

async function renderActivitiesTab(container, root) {
    const activities = await ApiClient.get('/engineering/activities/');

    container.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <select id="act-filter-type" class="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40">
                <option value="">Todos los tipos</option>
                ${ACTIVITY_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
            <button id="btn-new-act" class="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 shadow-sm transition-all cursor-pointer">
                + Nueva Actividad
            </button>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table class="w-full text-sm">
                <thead class="bg-slate-50 text-slate-600">
                    <tr>
                        <th class="text-left px-4 py-3 font-medium">Nombre</th>
                        <th class="text-left px-4 py-3 font-medium">Tipo</th>
                        <th class="text-left px-4 py-3 font-medium">Valor Agregado</th>
                    </tr>
                </thead>
                <tbody id="act-tbody" class="divide-y divide-slate-100">
                    ${actRows(activities)}
                </tbody>
            </table>
        </div>
    `;

    // Filter
    container.querySelector('#act-filter-type')?.addEventListener('change', async (e) => {
        const type = e.target.value;
        const url = type ? `/engineering/activities/?type=${encodeURIComponent(type)}` : '/engineering/activities/';
        const filtered = await ApiClient.get(url);
        const tbody = container.querySelector('#act-tbody');
        if (tbody) tbody.innerHTML = actRows(filtered);
    });

    // New activity
    container.querySelector('#btn-new-act')?.addEventListener('click', () => {
        showModal(root, 'Nueva Actividad', `
            <div class="space-y-4">
                <div><label class="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                    <input id="modal-act-name" type="text" placeholder="Ensamble, Transporte A..." class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" /></div>
                <div><label class="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                    <select id="modal-act-type" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40">
                        ${ACTIVITY_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                    </select></div>
                <div class="flex items-center gap-2">
                    <input id="modal-act-va" type="checkbox" class="rounded border-slate-300" />
                    <label for="modal-act-va" class="text-sm text-slate-700">¿Agrega valor?</label>
                </div>
            </div>
        `, async () => {
            const name = root.querySelector('#modal-act-name')?.value?.trim();
            const type = root.querySelector('#modal-act-type')?.value;
            const is_value_added = root.querySelector('#modal-act-va')?.checked || false;
            if (!name) { alert('El nombre es requerido'); return; }
            await ApiClient.post('/engineering/activities/', { name, type, is_value_added });
            hideModal(root);
            renderTab('activities', root);
        });
    });
}

function actRows(activities) {
    if (!activities.length) return '<tr><td colspan="3" class="px-4 py-8 text-center text-slate-400">No hay actividades registradas</td></tr>';
    return activities.map(a => {
        const color = TYPE_COLORS[a.type] || 'bg-slate-100 text-slate-600';
        return `<tr class="hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3 text-slate-800 font-medium">${a.name}</td>
            <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${color}">${a.type}</span></td>
            <td class="px-4 py-3">${a.is_value_added ? '<span class="text-green-600 font-medium text-xs">✓ Sí</span>' : '<span class="text-slate-400 text-xs">No</span>'}</td>
        </tr>`;
    }).join('');
}


// ── Standards Tab ───────────────────────────

async function renderStandardsTab(container, root) {
    const [standards, assets] = await Promise.all([
        ApiClient.get('/engineering/standards/'),
        ApiClient.get('/assets/'),
    ]);

    container.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <select id="std-filter-asset" class="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40">
                <option value="">Todos los activos</option>
                ${assets.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('')}
            </select>
            <button id="btn-new-std" class="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 shadow-sm transition-all cursor-pointer">
                + Asignar Estándar
            </button>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table class="w-full text-sm">
                <thead class="bg-slate-50 text-slate-600">
                    <tr>
                        <th class="text-left px-4 py-3 font-medium">Activo</th>
                        <th class="text-left px-4 py-3 font-medium">Actividad</th>
                        <th class="text-left px-4 py-3 font-medium">Referencia</th>
                        <th class="text-right px-4 py-3 font-medium">Tiempo Std (min)</th>
                        <th class="text-center px-4 py-3 font-medium">Estado</th>
                    </tr>
                </thead>
                <tbody id="std-tbody" class="divide-y divide-slate-100">
                    ${stdRows(standards)}
                </tbody>
            </table>
        </div>
    `;

    wireStdToggle(container, root);

    // Filter by asset
    container.querySelector('#std-filter-asset')?.addEventListener('change', async (e) => {
        const assetId = e.target.value;
        const url = assetId ? `/engineering/standards/?asset_id=${assetId}` : '/engineering/standards/';
        const filtered = await ApiClient.get(url);
        const tbody = container.querySelector('#std-tbody');
        if (tbody) { tbody.innerHTML = stdRows(filtered); wireStdToggle(container, root); }
    });

    // New standard
    container.querySelector('#btn-new-std')?.addEventListener('click', async () => {
        const [activities, refs] = await Promise.all([
            ApiClient.get('/engineering/activities/'),
            ApiClient.get('/engineering/references/'),
        ]);

        showModal(root, 'Asignar Estándar (Triada)', `
            <div class="space-y-4">
                <div><label class="block text-sm font-medium text-slate-700 mb-1">Activo</label>
                    <select id="modal-std-asset" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40">
                        <option value="">Seleccionar activo...</option>
                        ${assets.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('')}
                    </select></div>
                <div><label class="block text-sm font-medium text-slate-700 mb-1">Actividad</label>
                    <select id="modal-std-activity" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40">
                        <option value="">Seleccionar actividad...</option>
                        ${activities.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('')}
                    </select></div>
                <div><label class="block text-sm font-medium text-slate-700 mb-1">Referencia (SKU) — Opcional</label>
                    <select id="modal-std-ref" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40">
                        <option value="">Sin referencia específica</option>
                        ${refs.map(r => `<option value="${r.id}">${r.code} — ${r.description}</option>`).join('')}
                    </select></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium text-slate-700 mb-1">Tiempo Std (min)</label>
                        <input id="modal-std-time" type="number" step="0.01" placeholder="0.00" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" /></div>
                    <div><label class="block text-sm font-medium text-slate-700 mb-1">Frecuencia</label>
                        <select id="modal-std-freq" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40">
                            <option value="Per Unit">Por Unidad</option>
                            <option value="Per Batch">Por Lote</option>
                            <option value="Per Shift">Por Turno</option>
                            <option value="Once">Única vez</option>
                        </select></div>
                </div>
            </div>
        `, async () => {
            const asset_id = root.querySelector('#modal-std-asset')?.value;
            const activity_id = root.querySelector('#modal-std-activity')?.value;
            const product_reference_id = root.querySelector('#modal-std-ref')?.value || null;
            const standard_time_minutes = parseFloat(root.querySelector('#modal-std-time')?.value) || null;
            const frequency = root.querySelector('#modal-std-freq')?.value;
            if (!asset_id || !activity_id) { alert('Activo y Actividad son requeridos'); return; }
            try {
                await ApiClient.post('/engineering/standards/', { asset_id, activity_id, product_reference_id, standard_time_minutes, frequency });
                hideModal(root);
                renderTab('standards', root);
            } catch (err) {
                alert(err.status === 409 ? 'Ya existe un estándar con esta combinación.' : `Error: ${err.message}`);
            }
        });
    });
}

function stdRows(standards) {
    if (!standards.length) return '<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400">No hay estándares registrados</td></tr>';
    return standards.map(s => `
        <tr class="hover:bg-slate-50 transition-colors ${!s.is_active ? 'opacity-50' : ''}">
            <td class="px-4 py-3 text-slate-800 font-medium">${s.asset_name || '—'}</td>
            <td class="px-4 py-3 text-slate-700">${s.activity_name || '—'}</td>
            <td class="px-4 py-3 font-mono text-xs text-slate-600">${s.reference_code || '(General)'}</td>
            <td class="px-4 py-3 text-right font-mono text-slate-700">${s.standard_time_minutes != null ? s.standard_time_minutes.toFixed(2) : '—'}</td>
            <td class="px-4 py-3 text-center">
                <button data-std-id="${s.id}" data-new-state="${!s.is_active}"
                        class="std-toggle px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${s.is_active
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">
                    ${s.is_active ? 'Activo' : 'Inactivo'}
                </button>
            </td>
        </tr>
    `).join('');
}

function wireStdToggle(container, root) {
    container.querySelectorAll('.std-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.stdId;
            const newState = btn.dataset.newState === 'true';
            try {
                await ApiClient.patch(`/engineering/standards/${id}`, { is_active: newState });
                renderTab('standards', root);
            } catch (err) {
                alert(`Error: ${err.message}`);
            }
        });
    });
}


// ─────────────────────────────────────────────
// Modal system (scoped to root element)
// ─────────────────────────────────────────────

function showModal(root, title, bodyHtml, onConfirm) {
    const overlay = root.querySelector('#eng-modal-overlay');
    const box = root.querySelector('#eng-modal-box');
    if (!overlay || !box) return;

    box.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-slate-900">${title}</h3>
            <button class="modal-close-btn w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        </div>
        <div>${bodyHtml}</div>
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button class="modal-cancel-btn px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer">Cancelar</button>
            <button class="modal-confirm-btn px-4 py-2 rounded-lg text-sm font-medium bg-brand-orange text-white hover:bg-orange-600 shadow-sm transition-all cursor-pointer">Guardar</button>
        </div>
    `;

    overlay.classList.remove('hidden');

    box.querySelector('.modal-close-btn')?.addEventListener('click', () => hideModal(root));
    box.querySelector('.modal-cancel-btn')?.addEventListener('click', () => hideModal(root));
    box.querySelector('.modal-confirm-btn')?.addEventListener('click', onConfirm);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hideModal(root); });
}

function hideModal(root) {
    root.querySelector('#eng-modal-overlay')?.classList.add('hidden');
}

export default EngineeringPage;
