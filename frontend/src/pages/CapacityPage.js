import ApiClient from '../services/api.client.js';
import uiFeedback from '../services/ui-feedback.service.js';

function esc(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function statusBadge(color) {
    if (color === 'red') return 'bg-red-100 text-red-700';
    if (color === 'yellow') return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
}

async function CapacityPage() {
    const container = document.createElement('div');
    container.className = 'p-4 md:p-6 max-w-7xl mx-auto';

    let assets = [];
    try {
        assets = await ApiClient.get('/assets');
    } catch {
        assets = [];
    }

    let selectedAssetId = '';

    if (!assets.length) {
        container.innerHTML = `
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-slate-900">Capacidad y Staffing Avanzado</h1>
                <p class="text-slate-500 text-sm mt-1">Capacidad, precedencias, semaforización de utilización e histórico de escenarios.</p>
            </div>
            <section class="tk-empty-state p-5">
                <h2 class="text-sm font-semibold text-slate-700">Sin activos disponibles</h2>
                <p class="text-xs mt-1">Primero crea activos y luego vuelve para correr análisis de capacidad y staffing.</p>
                <a href="#/assets" class="inline-flex mt-3 tk-btn-primary px-3 py-1.5 text-xs">Ir a Activos</a>
            </section>
        `;
        return container;
    }

    container.innerHTML = `
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-900">Capacidad y Staffing Avanzado</h1>
            <p class="text-slate-500 text-sm mt-1">Capacidad, precedencias, semaforización de utilización e histórico de escenarios.</p>
        </div>

        <section class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
            <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <div>
                    <label class="block text-sm text-slate-600 mb-1">Activo</label>
                    <select id="cap-asset-select" class="tk-select px-3 py-2 text-sm">
                        <option value="">Seleccionar activo...</option>
                        ${assets.map((asset) => `<option value="${asset.id}">${esc(asset.name)} (${esc(asset.type)})</option>`).join('')}
                    </select>
                </div>
                <button id="cap-analyze" class="tk-btn-primary px-4 py-2 text-sm min-h-11">Analizar</button>
            </div>
        </section>

        <section id="cap-summary" class="hidden mb-6"></section>
        <section id="cap-precedence" class="hidden mb-6"></section>

        <section id="cap-staffing" class="hidden bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
            <div class="flex items-center justify-between gap-3 mb-4">
                <h2 class="text-lg font-semibold text-slate-900">Escenario de Staffing</h2>
                <span class="text-xs text-slate-500">Motor avanzado (factors mecánico/manual)</span>
            </div>
            <form id="staffing-form" class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input id="staff-demand" type="number" min="1" step="1" class="tk-input px-3 py-2 text-sm" placeholder="Demanda diaria" required>
                <input id="staff-hours" type="number" min="1" step="0.5" value="8" class="tk-input px-3 py-2 text-sm" placeholder="Horas por turno">
                <select id="staff-shifts" class="tk-select px-3 py-2 text-sm">
                    <option value="1">1 turno</option>
                    <option value="2">2 turnos</option>
                    <option value="3">3 turnos</option>
                </select>
                <input id="staff-mechanical" type="number" min="0.1" step="0.05" value="1" class="tk-input px-3 py-2 text-sm" placeholder="Factor mecánico">
                <input id="staff-manual" type="number" min="0.1" step="0.05" value="1" class="tk-input px-3 py-2 text-sm" placeholder="Factor manual">
                <input id="staff-label" class="tk-input px-3 py-2 text-sm" placeholder="Etiqueta escenario (opcional)">
                <button class="md:col-span-3 tk-btn-primary px-4 py-2 text-sm min-h-11">Calcular escenario</button>
            </form>
            <div id="staffing-result" class="mt-4 hidden"></div>
        </section>

        <section id="cap-history" class="hidden bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div class="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-700">Histórico de escenarios</h3>
                <span id="history-count" class="text-xs text-slate-500">0</span>
            </div>
            <div class="max-h-[320px] overflow-auto">
                <table class="w-full text-xs">
                    <thead class="bg-slate-50 text-slate-600 sticky top-0">
                        <tr>
                            <th class="text-left px-3 py-2">Fecha</th>
                            <th class="text-left px-3 py-2">Escenario</th>
                            <th class="text-right px-3 py-2">Demanda</th>
                            <th class="text-right px-3 py-2">Personal</th>
                            <th class="text-right px-3 py-2">Utilización</th>
                            <th class="text-center px-3 py-2">Estado</th>
                        </tr>
                    </thead>
                    <tbody id="history-body" class="divide-y divide-slate-100"></tbody>
                </table>
            </div>
        </section>
    `;

    function renderSummary(capacity) {
        const summary = container.querySelector('#cap-summary');
        if (!summary) return;
        const isLine = capacity.details?.type === 'line';
        summary.classList.remove('hidden');
        summary.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="rounded-xl bg-gradient-to-br from-brand-orange to-orange-600 text-white p-5 shadow-lg">
                    <p class="text-xs uppercase tracking-wide text-orange-100">Capacidad</p>
                    <p class="text-4xl font-bold mt-1">${capacity.capacity_uph}<span class="text-lg text-orange-100 ml-1">UPH</span></p>
                    <p class="text-sm text-orange-100 mt-2">${esc(capacity.asset_name || '')}</p>
                </div>
                <div class="rounded-xl ${isLine ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-slate-700 to-slate-800'} text-white p-5 shadow-lg">
                    <p class="text-xs uppercase tracking-wide ${isLine ? 'text-red-100' : 'text-slate-300'}">${isLine ? 'Cuello de botella' : 'Detalle'}</p>
                    <p class="text-2xl font-bold mt-1">${isLine ? esc(capacity.details?.bottleneck_asset_name || '-') : esc(capacity.details?.type || 'activo')}</p>
                    <p class="text-sm ${isLine ? 'text-red-100' : 'text-slate-300'} mt-2">
                        ${isLine ? esc(capacity.details?.bottleneck_asset_id || '') : `Tiempo std: ${capacity.details?.standard_time || '-'}`}
                    </p>
                </div>
            </div>
        `;
    }

    function renderPrecedence(precedence) {
        const panel = container.querySelector('#cap-precedence');
        if (!panel) return;
        panel.classList.remove('hidden');
        panel.innerHTML = `
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div class="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-slate-700">Precedencias y restricciones</h3>
                    <span class="text-xs px-2 py-1 rounded-full ${precedence.has_cycle ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
                        ${precedence.has_cycle ? 'Ciclo detectado' : 'Grafo válido'}
                    </span>
                </div>
                <div class="p-4 space-y-4">
                    <div>
                        <p class="text-xs text-slate-500 mb-1">Orden topológico</p>
                        ${precedence.topological_order?.length
                ? `<div class="flex flex-wrap gap-2">${precedence.topological_order.map((node, idx) => `<span class="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs">#${idx + 1} · ${esc(node.activity_id || node.standard_id)}</span>`).join('')}</div>`
                : '<p class="text-xs text-slate-400">Sin precedencias registradas.</p>'}
                    </div>
                    <div>
                        <p class="text-xs text-slate-500 mb-1">Dependencias</p>
                        ${precedence.dependencies?.length
                ? `<div class="space-y-1">${precedence.dependencies.map((dep) => `<p class="text-xs text-slate-600">${esc(dep.from)} → ${esc(dep.to)}</p>`).join('')}</div>`
                : '<p class="text-xs text-slate-400">No hay dependencias para este activo.</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    function renderHistory(rows) {
        const panel = container.querySelector('#cap-history');
        const body = container.querySelector('#history-body');
        const counter = container.querySelector('#history-count');
        if (!panel || !body || !counter) return;
        panel.classList.remove('hidden');
        counter.textContent = String(rows.length || 0);
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="6" class="px-3 py-6 text-center text-slate-400">Sin escenarios registrados.</td></tr>';
            return;
        }
        body.innerHTML = rows.map((row) => `
            <tr>
                <td class="px-3 py-2 text-slate-500">${new Date(row.created_at).toLocaleString('es-CO')}</td>
                <td class="px-3 py-2 text-slate-700">${esc(row.scenario_label || '-')}</td>
                <td class="px-3 py-2 text-right">${row.demand}</td>
                <td class="px-3 py-2 text-right font-semibold">${row.personnel_required}</td>
                <td class="px-3 py-2 text-right">${row.utilization_pct}%</td>
                <td class="px-3 py-2 text-center"><span class="px-2 py-1 rounded-full ${statusBadge(row.status_color)}">${row.status_color}</span></td>
            </tr>
        `).join('');
    }

    async function refreshHistory() {
        if (!selectedAssetId) return;
        const rows = await ApiClient.get(`/engineering/capacity/${selectedAssetId}/staffing/history`);
        renderHistory(rows || []);
    }

    container.querySelector('#cap-analyze')?.addEventListener('click', async () => {
        selectedAssetId = container.querySelector('#cap-asset-select')?.value || '';
        if (!selectedAssetId) {
            uiFeedback.warning('Seleccione un activo.');
            return;
        }
        try {
            const [capacity, precedence] = await Promise.all([
                ApiClient.get(`/engineering/capacity/${selectedAssetId}`),
                ApiClient.get(`/engineering/capacity/${selectedAssetId}/precedence`),
            ]);
            renderSummary(capacity);
            renderPrecedence(precedence);
            container.querySelector('#cap-staffing')?.classList.remove('hidden');
            await refreshHistory();
        } catch (error) {
            const summary = container.querySelector('#cap-summary');
            if (summary) {
                summary.classList.remove('hidden');
                summary.innerHTML = `<div class="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">No se pudo analizar capacidad: ${esc(error.message)}</div>`;
            }
            uiFeedback.error(`No se pudo analizar capacidad: ${error.message}`);
        }
    });

    container.querySelector('#staffing-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!selectedAssetId) {
            uiFeedback.warning('Primero selecciona y analiza un activo.');
            return;
        }
        const payload = {
            demand: Number(container.querySelector('#staff-demand')?.value || 0),
            hours_per_shift: Number(container.querySelector('#staff-hours')?.value || 8),
            shifts_per_day: Number(container.querySelector('#staff-shifts')?.value || 1),
            mechanical_factor: Number(container.querySelector('#staff-mechanical')?.value || 1),
            manual_factor: Number(container.querySelector('#staff-manual')?.value || 1),
            scenario_label: container.querySelector('#staff-label')?.value?.trim() || null,
        };
        if (!payload.demand || payload.demand <= 0) {
            uiFeedback.warning('Ingrese una demanda válida.');
            return;
        }
        try {
            const result = await ApiClient.post(`/engineering/capacity/${selectedAssetId}/staffing/advanced`, payload);
            const box = container.querySelector('#staffing-result');
            if (box) {
                box.classList.remove('hidden');
                box.innerHTML = `
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
                        <div class="text-center"><p class="text-[11px] text-slate-500 uppercase">Cap. Base</p><p class="text-lg font-bold text-slate-700">${result.base_capacity_uph}</p></div>
                        <div class="text-center"><p class="text-[11px] text-slate-500 uppercase">Cap. Efectiva</p><p class="text-lg font-bold text-slate-700">${result.effective_capacity_uph}</p></div>
                        <div class="text-center"><p class="text-[11px] text-slate-500 uppercase">Cap./día</p><p class="text-lg font-bold text-slate-700">${result.available_capacity_per_day}</p></div>
                        <div class="text-center"><p class="text-[11px] text-slate-500 uppercase">Personal</p><p class="text-2xl font-bold text-brand-orange">${result.personnel_required}</p></div>
                        <div class="text-center"><p class="text-[11px] text-slate-500 uppercase">Utilización</p><p class="text-lg font-bold text-slate-700">${result.utilization_pct}%</p><span class="inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] ${statusBadge(result.status_color)}">${result.status_color}</span></div>
                    </div>
                `;
            }
            await refreshHistory();
            uiFeedback.success('Escenario de staffing calculado.');
        } catch (error) {
            const box = container.querySelector('#staffing-result');
            if (box) {
                box.classList.remove('hidden');
                box.innerHTML = `<div class="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">No se pudo calcular escenario: ${esc(error.message)}</div>`;
            }
            uiFeedback.error(`No se pudo calcular escenario: ${error.message}`);
        }
    });

    return container;
}

export default CapacityPage;
