/**
 * CapacityPage — Sprint 5.5: Capacity Analysis + Staffing Calculator
 */
import ApiClient from '../services/api.client.js';

async function CapacityPage() {
    const container = document.createElement('div');
    container.className = 'p-6 max-w-7xl mx-auto';

    // Load assets for the selector
    let assets = [];
    try { assets = await ApiClient.get('/assets/'); } catch (e) { /* empty */ }

    container.innerHTML = `
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-900">Capacidad y Tripulación</h1>
            <p class="text-slate-500 text-sm mt-1">Análisis de capacidad jerárquica y cálculo de personal requerido</p>
        </div>

        <!-- Asset Selector -->
        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
            <div class="flex items-end gap-4">
                <div class="flex-1">
                    <label class="block text-sm font-medium text-slate-700 mb-1">Seleccionar Activo</label>
                    <select id="cap-asset-select" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40">
                        <option value="">Seleccionar activo...</option>
                        ${assets.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('')}
                    </select>
                </div>
                <button id="btn-analyze" class="bg-orange-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 shadow-sm transition-all cursor-pointer">
                    Analizar
                </button>
            </div>
        </div>

        <!-- Capacity Result -->
        <div id="capacity-result" class="mb-6 hidden"></div>

        <!-- Staffing Calculator -->
        <div id="staffing-section" class="hidden">
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 class="text-lg font-semibold text-slate-900 mb-4">Calculadora de Tripulación</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Demanda Diaria (unidades)</label>
                        <input id="staff-demand" type="number" step="1" placeholder="1000" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Horas por Turno</label>
                        <input id="staff-hours" type="number" step="0.5" value="8" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Turnos por Día</label>
                        <select id="staff-shifts" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40">
                            <option value="1">1 turno</option>
                            <option value="2">2 turnos</option>
                            <option value="3">3 turnos</option>
                        </select>
                    </div>
                </div>
                <button id="btn-calc-staff" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all cursor-pointer">
                    Calcular Personal
                </button>
                <div id="staffing-result" class="mt-4 hidden"></div>
            </div>
        </div>
    `;

    let selectedAssetId = null;

    container.querySelector('#btn-analyze')?.addEventListener('click', async () => {
        selectedAssetId = container.querySelector('#cap-asset-select')?.value;
        if (!selectedAssetId) { alert('Seleccione un activo'); return; }

        const resultDiv = container.querySelector('#capacity-result');
        resultDiv.innerHTML = '<div class="animate-pulse text-slate-400 text-center py-8">Calculando...</div>';
        resultDiv.classList.remove('hidden');

        try {
            const result = await ApiClient.get(`/engineering/capacity/${selectedAssetId}`);

            const isLine = result.details?.type === 'line';
            const children = result.details?.children_analysis || [];

            resultDiv.innerHTML = `
                <!-- KPI Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="bg-gradient-to-br from-brand-orange to-orange-600 rounded-xl p-5 text-white shadow-lg">
                        <p class="text-orange-200 text-xs uppercase tracking-wider">Capacidad</p>
                        <p class="text-4xl font-bold mt-1">${result.capacity_uph}<span class="text-lg text-orange-200 ml-1">UPH</span></p>
                        <p class="text-orange-200 text-sm mt-2">${result.asset_name}</p>
                    </div>
                    ${isLine ? `
                    <div class="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow-lg">
                        <p class="text-red-200 text-xs uppercase tracking-wider">Cuello de Botella</p>
                        <p class="text-2xl font-bold mt-1">${result.details.bottleneck_asset_name}</p>
                        <p class="text-red-200 text-sm mt-2">${result.details.bottleneck_asset_id}</p>
                    </div>` : `
                    <div class="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-5 text-white shadow-lg">
                        <p class="text-slate-300 text-xs uppercase tracking-wider">Tipo</p>
                        <p class="text-2xl font-bold mt-1">Máquina</p>
                        <p class="text-slate-300 text-sm mt-2">Tiempo std: ${result.details?.standard_time || '—'} min</p>
                    </div>`}
                </div>

                ${isLine && children.length > 0 ? `
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div class="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <h3 class="text-sm font-semibold text-slate-700">Análisis de Sub-activos</h3>
                    </div>
                    <table class="w-full text-sm">
                        <thead class="bg-slate-50 text-slate-600">
                            <tr>
                                <th class="text-left px-4 py-2 font-medium">Activo</th>
                                <th class="text-right px-4 py-2 font-medium">Capacidad (UPH)</th>
                                <th class="text-center px-4 py-2 font-medium">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${children.map(c => `
                                <tr class="hover:bg-slate-50 transition-colors ${c.capacity_uph === result.capacity_uph ? 'bg-red-50' : ''}">
                                    <td class="px-4 py-2 text-slate-800 font-medium">${c.name}</td>
                                    <td class="px-4 py-2 text-right font-mono text-slate-700">${c.capacity_uph}</td>
                                    <td class="px-4 py-2 text-center">${c.capacity_uph === result.capacity_uph
                    ? '<span class="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">Cuello de Botella</span>'
                    : '<span class="text-green-600 text-xs">OK</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>` : ''}
            `;

            // Show staffing section
            container.querySelector('#staffing-section')?.classList.remove('hidden');
        } catch (e) {
            resultDiv.innerHTML = `<div class="p-4 bg-red-50 text-red-600 rounded-lg text-sm">Error: ${e.message || 'No se pudo calcular la capacidad. Verifique que el activo tenga estándares con tiempo definido.'}</div>`;
        }
    });

    container.querySelector('#btn-calc-staff')?.addEventListener('click', async () => {
        if (!selectedAssetId) return;
        const demand = parseFloat(container.querySelector('#staff-demand')?.value);
        const hours = parseFloat(container.querySelector('#staff-hours')?.value) || 8;
        const shifts = parseInt(container.querySelector('#staff-shifts')?.value) || 1;

        if (!demand || demand <= 0) { alert('Ingrese una demanda válida'); return; }

        try {
            const result = await ApiClient.get(`/engineering/capacity/${selectedAssetId}/staffing?demand=${demand}&hours_per_shift=${hours}&shifts_per_day=${shifts}`);

            const resultDiv = container.querySelector('#staffing-result');
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div class="text-center">
                        <p class="text-xs text-blue-500 uppercase">Capacidad</p>
                        <p class="text-xl font-bold text-blue-700">${result.capacity_uph} <span class="text-xs">UPH</span></p>
                    </div>
                    <div class="text-center">
                        <p class="text-xs text-blue-500 uppercase">Capacidad/Día</p>
                        <p class="text-xl font-bold text-blue-700">${result.available_capacity_per_day.toLocaleString()} <span class="text-xs">und</span></p>
                    </div>
                    <div class="text-center">
                        <p class="text-xs text-green-600 uppercase font-semibold">Personal Requerido</p>
                        <p class="text-3xl font-bold text-green-700">${result.personnel_required}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-xs text-blue-500 uppercase">Utilización</p>
                        <p class="text-xl font-bold text-blue-700">${result.utilization_pct}%</p>
                    </div>
                </div>
            `;
        } catch (e) {
            container.querySelector('#staffing-result').innerHTML = `<p class="text-red-500 text-sm mt-2">Error: ${e.message}</p>`;
            container.querySelector('#staffing-result').classList.remove('hidden');
        }
    });

    return container;
}

export default CapacityPage;
