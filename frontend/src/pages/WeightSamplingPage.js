import ApiClient from '../services/api.client.js';
import { qualityService } from '../services/quality.service.js';
import {
    getHashContext,
    getModuleContext,
    setModuleContext,
} from '../services/module-context.service.js';
import uiFeedback from '../services/ui-feedback.service.js';

function esc(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function parseNum(value, fallback = null) {
    if (value === '' || value === null || value === undefined) return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function toLocalDatetimeInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusBadge(status) {
    if (status === 'red') return 'bg-red-100 text-red-700';
    if (status === 'yellow') return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
}

function num(value, decimals = 3) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    return Number(value).toFixed(decimals);
}

function spcAlertBadge(level) {
    if (level === 'critical') return 'bg-red-100 text-red-700';
    if (level === 'warning') return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
}

function spcAlertText(level) {
    if (level === 'critical') return 'Critico';
    if (level === 'warning') return 'Advertencia';
    return 'Estable';
}

function severityBadge(severity) {
    if (severity === 'critical') return 'bg-red-100 text-red-700';
    if (severity === 'high') return 'bg-amber-100 text-amber-700';
    if (severity === 'medium') return 'bg-sky-100 text-sky-700';
    return 'bg-slate-100 text-slate-700';
}

function workflowBadge(status) {
    if (status === 'Verified') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Approved') return 'bg-sky-100 text-sky-700';
    if (status === 'Close Requested') return 'bg-amber-100 text-amber-700';
    if (status === 'Rejected') return 'bg-rose-100 text-rose-700';
    if (status === 'Closed') return 'bg-indigo-100 text-indigo-700';
    if (status === 'In Progress') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
}

function buildSpcSvg(chart) {
    const points = (chart?.points || []).slice(-80);
    if (!points.length) {
        return '<div class="h-44 flex items-center justify-center text-xs text-slate-400">Sin datos SPC.</div>';
    }

    const values = points.map((point) => Number(point.measured_value || 0));
    const ucl = Number(chart?.ucl ?? Math.max(...values));
    const lcl = Number(chart?.lcl ?? Math.min(...values));
    const center = Number(chart?.center_line ?? ((ucl + lcl) / 2));
    const maxY = Math.max(ucl, ...values);
    const minY = Math.min(lcl, ...values);
    const yRange = Math.max(maxY - minY, 1e-9);
    const width = 740;
    const height = 220;
    const margin = { left: 36, right: 10, top: 12, bottom: 24 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;
    const xAt = (idx) => margin.left + (idx * stepX);
    const yAt = (value) => margin.top + ((maxY - value) / yRange) * plotH;
    const linePath = points
        .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${xAt(idx).toFixed(2)} ${yAt(Number(point.measured_value || 0)).toFixed(2)}`)
        .join(' ');
    const guide = (value, color, label) => `
        <line x1="${margin.left}" y1="${yAt(value).toFixed(2)}" x2="${(width - margin.right).toFixed(2)}" y2="${yAt(value).toFixed(2)}" stroke="${color}" stroke-width="1.2" stroke-dasharray="4 3"></line>
        <text x="${margin.left + 4}" y="${Math.max(10, yAt(value) - 4).toFixed(2)}" fill="${color}" font-size="10">${label}: ${num(value, 3)}</text>
    `;

    return `
        <svg viewBox="0 0 ${width} ${height}" class="w-full h-56 bg-slate-50 border border-slate-200 rounded">
            ${guide(ucl, '#dc2626', 'UCL')}
            ${guide(center, '#0369a1', 'CL')}
            ${guide(lcl, '#dc2626', 'LCL')}
            <path d="${linePath}" fill="none" stroke="#f97316" stroke-width="2"></path>
            ${points.map((point, idx) => {
                const value = Number(point.measured_value || 0);
                const color = point.status_color === 'red' ? '#dc2626' : point.status_color === 'yellow' ? '#d97706' : '#059669';
                return `<circle cx="${xAt(idx).toFixed(2)}" cy="${yAt(value).toFixed(2)}" r="2.6" fill="${color}"></circle>`;
            }).join('')}
        </svg>
    `;
}

async function downloadWithAuth(path, filename) {
    const token = localStorage.getItem('takta_token');
    const response = await fetch(`/api${path}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `HTTP ${response.status}`);
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

async function uploadWithAuth(path, file) {
    const token = localStorage.getItem('takta_token');
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`/api${path}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
    });
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `HTTP ${response.status}`);
    }
    return response.json();
}

function resolveInitialContext() {
    const fromHash = getHashContext();
    if (fromHash.asset_id || fromHash.product_reference_id || fromHash.process_standard_id) {
        return fromHash;
    }
    return getModuleContext();
}

async function WeightSamplingPage() {
    const container = document.createElement('div');
    container.className = 'p-4 md:p-6 max-w-7xl mx-auto';
    const initialContext = resolveInitialContext();

    const state = {
        assets: [],
        references: [],
        standards: [],
        specs: [],
        samples: [],
        summary: null,
        spcChart: null,
        spcCapability: null,
        capabilityRuns: [],
        capabilityTrend: null,
        nonConformities: [],
        selectedNonConformityId: '',
        capaActions: [],
        editCapaActionId: '',
        capaDashboard: null,
        selectedSpecId: '',
        editSpecId: '',
        editSampleId: '',
        context: initialContext,
    };

    function selectedSpec() {
        return state.specs.find((row) => row.id === state.selectedSpecId) || null;
    }

    function selectedSample() {
        return state.samples.find((row) => row.id === state.editSampleId) || null;
    }

    function selectedNonConformity() {
        return state.nonConformities.find((row) => row.id === state.selectedNonConformityId) || null;
    }

    function selectedCapaAction() {
        return state.capaActions.find((row) => row.id === state.editCapaActionId) || null;
    }

    function syncModuleContextFromSpec(spec) {
        if (!spec) return;
        state.context = {
            asset_id: spec.asset_id || null,
            product_reference_id: spec.product_reference_id || null,
            process_standard_id: spec.process_standard_id || null,
        };
        setModuleContext(state.context, 'weight-sampling');
    }

    async function loadCatalogs() {
        const [assetsRes, refsRes, standardsRes] = await Promise.allSettled([
            ApiClient.get('/assets'),
            ApiClient.get('/engineering/references'),
            ApiClient.get('/engineering/standards'),
        ]);
        state.assets = assetsRes.status === 'fulfilled' ? assetsRes.value : [];
        state.references = refsRes.status === 'fulfilled' ? refsRes.value : [];
        state.standards = standardsRes.status === 'fulfilled' ? standardsRes.value : [];
    }

    async function loadSpecs() {
        state.specs = await qualityService.getWeightSpecs();
        if (!state.selectedSpecId && state.specs[0]) {
            const preferred = state.specs.find((row) => {
                if (state.context.asset_id && row.asset_id !== state.context.asset_id) return false;
                if (state.context.product_reference_id && row.product_reference_id !== state.context.product_reference_id) return false;
                if (state.context.process_standard_id && row.process_standard_id !== state.context.process_standard_id) return false;
                return true;
            });
            state.selectedSpecId = preferred?.id || state.specs[0].id;
        }
        if (state.selectedSpecId && !state.specs.some((row) => row.id === state.selectedSpecId)) {
            state.selectedSpecId = state.specs[0]?.id || '';
        }
        syncModuleContextFromSpec(selectedSpec());
    }

    async function loadSamplesAndSummary() {
        if (!state.selectedSpecId) {
            state.samples = [];
            state.summary = null;
            state.spcChart = null;
            state.spcCapability = null;
            state.capabilityRuns = [];
            state.capabilityTrend = null;
            state.nonConformities = [];
            state.selectedNonConformityId = '';
            state.capaActions = [];
            state.editCapaActionId = '';
            state.capaDashboard = null;
            return;
        }
        const [samplesRes, summaryRes, spcRes, capabilityRes, runsRes, trendRes, ncRes, capaDashRes] = await Promise.allSettled([
            qualityService.getWeightSamples(state.selectedSpecId, 'limit=300'),
            qualityService.getWeightSummary(state.selectedSpecId),
            qualityService.getWeightSpcChart(state.selectedSpecId, 'limit=300&include_rules=true'),
            qualityService.getWeightSpcCapability(state.selectedSpecId, 'limit=300'),
            qualityService.getWeightSpcCapabilityRuns(state.selectedSpecId, 'limit=20'),
            qualityService.getWeightSpcCapabilityTrend(state.selectedSpecId, 'bucket=month&points=12'),
            qualityService.getNonConformities(`weight_specification_id=${encodeURIComponent(state.selectedSpecId)}`),
            qualityService.getCapaDashboard(),
        ]);
        state.samples = samplesRes.status === 'fulfilled' ? samplesRes.value : [];
        state.summary = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
        state.spcChart = spcRes.status === 'fulfilled' ? spcRes.value : null;
        state.spcCapability = capabilityRes.status === 'fulfilled' ? capabilityRes.value : null;
        state.capabilityRuns = runsRes.status === 'fulfilled' ? runsRes.value : [];
        state.capabilityTrend = trendRes.status === 'fulfilled' ? trendRes.value : null;
        state.nonConformities = ncRes.status === 'fulfilled' ? ncRes.value : [];
        if (
            state.selectedNonConformityId
            && !state.nonConformities.some((row) => row.id === state.selectedNonConformityId)
        ) {
            state.selectedNonConformityId = '';
            state.editCapaActionId = '';
        }
        if (!state.selectedNonConformityId && state.nonConformities[0]) {
            state.selectedNonConformityId = state.nonConformities[0].id;
        }
        if (state.selectedNonConformityId) {
            try {
                state.capaActions = await qualityService.getCapaActions(state.selectedNonConformityId);
            } catch {
                state.capaActions = [];
            }
        } else {
            state.capaActions = [];
            state.editCapaActionId = '';
        }
        if (state.editCapaActionId && !state.capaActions.some((row) => row.id === state.editCapaActionId)) {
            state.editCapaActionId = '';
        }
        state.capaDashboard = capaDashRes.status === 'fulfilled' ? capaDashRes.value : null;
    }

    async function refreshAll() {
        await loadCatalogs();
        await loadSpecs();
        await loadSamplesAndSummary();
    }

    function renderSpecForm() {
        const editing = state.specs.find((row) => row.id === state.editSpecId) || null;
        return `
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                    <h2 class="text-sm font-semibold text-slate-800">${editing ? 'Editar especificacion' : 'Nueva especificacion'}</h2>
                    ${editing ? '<span class="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Modo edicion</span>' : ''}
                </div>
                <form id="ws-spec-form" class="space-y-3">
                    <input id="ws-spec-name" required class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Nombre especificacion" value="${esc(editing?.name || '')}">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <select id="ws-spec-asset" class="px-3 py-2 rounded-lg border border-slate-200 text-sm"><option value="">Activo (opcional)</option>${state.assets.map((row) => `<option value="${row.id}" ${(editing?.asset_id || state.context.asset_id) === row.id ? 'selected' : ''}>${esc(row.name)} (${esc(row.type)})</option>`).join('')}</select>
                        <select id="ws-spec-reference" class="px-3 py-2 rounded-lg border border-slate-200 text-sm"><option value="">SKU (opcional)</option>${state.references.map((row) => `<option value="${row.id}" ${(editing?.product_reference_id || state.context.product_reference_id) === row.id ? 'selected' : ''}>${esc(row.code)}  -  ${esc(row.description)}</option>`).join('')}</select>
                    </div>
                    <select id="ws-spec-standard" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"><option value="">Estandar (opcional)</option>${state.standards.map((row) => `<option value="${row.id}" ${(editing?.process_standard_id || state.context.process_standard_id) === row.id ? 'selected' : ''}>${esc(row.asset_name || '-')}, ${esc(row.activity_name || '-')}, ${esc(row.reference_code || '-')}</option>`).join('')}</select>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <select id="ws-spec-unit" class="px-3 py-2 rounded-lg border border-slate-200 text-sm"><option value="g" ${(editing?.unit || 'g') === 'g' ? 'selected' : ''}>g</option><option value="kg" ${editing?.unit === 'kg' ? 'selected' : ''}>kg</option></select>
                        <input id="ws-spec-lower" type="number" step="0.0001" required class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Limite inferior" value="${editing?.lower_limit ?? ''}">
                        <input id="ws-spec-target" type="number" step="0.0001" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Objetivo" value="${editing?.target_weight ?? ''}">
                        <input id="ws-spec-upper" type="number" step="0.0001" required class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Limite superior" value="${editing?.upper_limit ?? ''}">
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <input id="ws-spec-warning" type="number" min="0" max="0.49" step="0.01" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Banda alerta (0-0.49)" value="${editing?.warning_band_pct ?? 0.1}">
                        <input id="ws-spec-size" type="number" min="1" step="1" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Tamano muestra" value="${editing?.sample_size ?? 5}">
                    </div>
                    <textarea id="ws-spec-notes" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Notas">${esc(editing?.notes || '')}</textarea>
                    <label class="flex items-center gap-2 text-xs text-slate-600"><input id="ws-spec-active" type="checkbox" ${editing ? (editing.is_active ? 'checked' : '') : 'checked'}> Especificacion activa</label>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="tk-btn-primary py-2 text-sm">${editing ? 'Guardar cambios' : 'Crear especificacion'}</button>
                        <button id="ws-spec-reset" type="button" class="py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">Limpiar</button>
                    </div>
                </form>
            </div>
        `;
    }

    function renderSpecList() {
        return `
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-slate-800">Especificaciones</h2>
                    <span class="text-xs text-slate-500">${state.specs.length}</span>
                </div>
                <div class="overflow-auto max-h-[460px]">
                    <table class="min-w-full text-xs">
                        <thead class="bg-slate-50 text-slate-600 sticky top-0"><tr><th class="text-left px-3 py-2">Nombre</th><th class="text-left px-3 py-2">Rango</th><th class="text-left px-3 py-2">Ultimo</th><th class="text-right px-3 py-2">Acciones</th></tr></thead>
                        <tbody class="divide-y divide-slate-100">
                            ${state.specs.map((row) => `
                                <tr class="${row.id === state.selectedSpecId ? 'bg-orange-50/60' : ''}">
                                    <td class="px-3 py-2">
                                        <p class="font-medium text-slate-700">${esc(row.name)}</p>
                                        <p class="text-[11px] text-slate-500">${esc(row.reference_code || '-')}  -  ${esc(row.asset_name || '-')}</p>
                                    </td>
                                    <td class="px-3 py-2">${row.lower_limit} - ${row.upper_limit} ${esc(row.unit || '')}</td>
                                    <td class="px-3 py-2">${row.last_status_color ? `<span class="px-2 py-0.5 rounded-full ${statusBadge(row.last_status_color)}">${row.last_status_color}</span>` : '<span class="text-slate-400">Sin muestras</span>'}</td>
                                    <td class="px-3 py-2 text-right whitespace-nowrap">
                                        <button data-spec-open="${row.id}" class="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 mr-1">Abrir</button>
                                        <button data-spec-edit="${row.id}" class="px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 mr-1">Editar</button>
                                        <button data-spec-del="${row.id}" class="px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50">Eliminar</button>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="4" class="px-3 py-6 text-center text-slate-400">Sin especificaciones.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderSamples() {
        const spec = selectedSpec();
        const editing = selectedSample();
        const selectedNc = selectedNonConformity();
        const capaEditing = selectedCapaAction();
        const spc = state.spcChart;
        const capability = state.spcCapability;
        const violations = spc?.rules?.violations || [];
        return `
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 class="text-sm font-semibold text-slate-800">Muestreo ${spec ? `- ${esc(spec.name)}` : ''}</h2>
                    ${state.summary ? `<div class="text-xs text-slate-600">Muestras: <strong>${state.summary.samples_count}</strong> - En rango: <strong>${state.summary.in_spec_pct}%</strong></div>` : ''}
                </div>
                ${spec ? `
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        <div class="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"><p class="text-[11px] text-slate-500 uppercase">Promedio</p><p class="text-lg font-semibold text-slate-800">${state.summary?.avg ?? '-'}</p></div>
                        <div class="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"><p class="text-[11px] text-slate-500 uppercase">Desv. estandar</p><p class="text-lg font-semibold text-slate-800">${state.summary?.stddev ?? '-'}</p></div>
                        <div class="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"><p class="text-[11px] text-slate-500 uppercase">Min / Max</p><p class="text-sm font-semibold text-slate-800">${state.summary?.min ?? '-'} / ${state.summary?.max ?? '-'}</p></div>
                        <div class="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"><p class="text-[11px] text-slate-500 uppercase">Semaforo</p><p class="text-sm font-semibold text-slate-800">G:${state.summary?.status_breakdown?.green ?? 0} - Y:${state.summary?.status_breakdown?.yellow ?? 0} - R:${state.summary?.status_breakdown?.red ?? 0}</p></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <p class="text-[11px] text-slate-500 uppercase">Control chart (I-MR)</p>
                            <p class="text-sm font-semibold text-slate-800">CL ${num(spc?.center_line)} | LCL ${num(spc?.lcl)} | UCL ${num(spc?.ucl)}</p>
                        </div>
                        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <p class="text-[11px] text-slate-500 uppercase">Capacidad proceso</p>
                            <p class="text-sm font-semibold text-slate-800">Cp ${num(capability?.cp)} | Cpk ${num(capability?.cpk)} | Pp ${num(capability?.pp)} | Ppk ${num(capability?.ppk)}</p>
                        </div>
                    </div>
                    <div class="mb-4 rounded-lg border border-slate-200 p-3">
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <h3 class="text-sm font-semibold text-slate-800">SPC y reglas Western Electric</h3>
                            <span class="px-2 py-0.5 rounded-full text-xs ${spcAlertBadge(spc?.alert_level || 'healthy')}">${spcAlertText(spc?.alert_level || 'healthy')}</span>
                        </div>
                        ${buildSpcSvg(spc)}
                        <div class="mt-2 max-h-24 overflow-auto space-y-1">
                            ${violations.length ? violations.map((row, idx) => `
                                <div class="text-xs rounded border ${row.severity === 'critical' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'} px-2 py-1">
                                    R${idx + 1} ${esc(row.rule_code)} - ${esc(row.message)}
                                </div>
                            `).join('') : '<div class="text-xs text-slate-500">Sin violaciones activas.</div>'}
                        </div>
                    </div>
                    <div class="mb-4 rounded-lg border border-slate-200 p-3">
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <h3 class="text-sm font-semibold text-slate-800">Ejecucion de capacidad (S5)</h3>
                            <div class="flex items-center gap-2">
                                <button id="ws-run-capability" class="px-2 py-1 rounded border border-sky-300 text-sky-700 text-xs hover:bg-sky-50">Ejecutar ahora</button>
                                <button id="ws-run-capability-batch" class="px-2 py-1 rounded border border-slate-300 text-slate-700 text-xs hover:bg-slate-50">Batch activo</button>
                            </div>
                        </div>
                        ${state.capabilityRuns.length ? `
                            <div class="text-xs text-slate-600 mb-2">
                                Ultima corrida: <strong>${esc(state.capabilityRuns[0].capability_status || '-')}</strong>
                                · ${new Date(state.capabilityRuns[0].triggered_at).toLocaleString('es-CO')}
                                ${state.capabilityRuns[0].improvement_action_id ? `· CI: ${esc(state.capabilityRuns[0].improvement_action_id)}` : ''}
                            </div>
                        ` : '<div class="text-xs text-slate-500 mb-2">Sin corridas historicas. Ejecuta una corrida para iniciar tendencia.</div>'}
                        <div class="max-h-24 overflow-auto border border-slate-200 rounded">
                            <table class="min-w-full text-xs">
                                <thead class="bg-slate-50 text-slate-600"><tr><th class="text-left px-2 py-1">Bucket</th><th class="text-right px-2 py-1">Cp</th><th class="text-right px-2 py-1">Cpk</th><th class="text-left px-2 py-1">Estado</th></tr></thead>
                                <tbody>
                                    ${(state.capabilityTrend?.series || []).map((row) => `
                                        <tr class="border-t border-slate-100">
                                            <td class="px-2 py-1">${esc(row.bucket)}</td>
                                            <td class="px-2 py-1 text-right">${num(row.cp_avg, 3)}</td>
                                            <td class="px-2 py-1 text-right">${num(row.cpk_avg, 3)}</td>
                                            <td class="px-2 py-1">${esc(row.status || '-')}</td>
                                        </tr>
                                    `).join('') || '<tr><td colspan="4" class="px-2 py-3 text-center text-slate-400">Sin tendencia disponible.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="mb-4 rounded-lg border border-slate-200 p-3">
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <h3 class="text-sm font-semibold text-slate-800">No conformidades y CAPA (S6)</h3>
                            <div class="flex items-center gap-2">
                                ${state.capaDashboard ? `<span class="text-[11px] text-slate-600">NC abiertas: <strong>${state.capaDashboard.non_conformities_open}</strong> | CAPA abiertas: <strong>${state.capaDashboard.capa_actions_open}</strong></span>` : ''}
                                <button id="ws-create-nc-from-spc" class="px-2 py-1 rounded border border-amber-300 text-amber-700 text-xs hover:bg-amber-50">Crear NC desde SPC</button>
                                <button id="ws-auto-nc" class="px-2 py-1 rounded border border-rose-300 text-rose-700 text-xs hover:bg-rose-50">Auto NC</button>
                                <button id="ws-open-meetings" class="px-2 py-1 rounded border border-slate-300 text-slate-700 text-xs hover:bg-slate-50">Ir a Actas</button>
                            </div>
                        </div>
                        <div class="max-h-32 overflow-auto space-y-1 mb-3">
                            ${state.nonConformities.length ? state.nonConformities.map((row) => `
                                <div class="text-xs rounded border ${row.id === state.selectedNonConformityId ? 'border-orange-300 bg-orange-50/40' : 'border-slate-200'} px-2 py-1 flex items-center justify-between gap-2">
                                    <div>
                                        <span class="font-semibold text-slate-700">${esc(row.title)}</span>
                                        <span class="ml-2 px-1.5 py-0.5 rounded ${severityBadge(row.severity)}">${esc(row.severity)}</span>
                                        <span class="ml-1 px-1.5 py-0.5 rounded ${workflowBadge(row.status)}">${esc(row.status)}</span>
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <button data-nc-open="${row.id}" class="px-2 py-0.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50">Seleccionar</button>
                                        <button data-nc-progress="${row.id}" class="px-2 py-0.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50">En progreso</button>
                                        <button data-nc-close-request="${row.id}" class="px-2 py-0.5 rounded border border-amber-200 text-amber-700 hover:bg-amber-50">Solicitar cierre</button>
                                        <button data-nc-approve="${row.id}" class="px-2 py-0.5 rounded border border-sky-200 text-sky-700 hover:bg-sky-50">Aprobar</button>
                                        <button data-nc-verify="${row.id}" class="px-2 py-0.5 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50">Verificar</button>
                                        <button data-nc-delete="${row.id}" class="px-2 py-0.5 rounded border border-red-200 text-red-700 hover:bg-red-50">Eliminar</button>
                                    </div>
                                </div>
                            `).join('') : '<div class="text-xs text-slate-500">Sin no conformidades para esta especificacion.</div>'}
                        </div>
                        <div class="rounded-lg border border-slate-200 p-2">
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <p class="text-xs font-semibold text-slate-700">Acciones CAPA ${selectedNc ? `- ${esc(selectedNc.title)}` : ''}</p>
                                ${selectedNc ? `<span class="text-[11px] text-slate-500">NC: ${esc(selectedNc.status)}</span>` : ''}
                            </div>
                            ${selectedNc ? `
                                <form id="ws-capa-form" class="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2">
                                    <input id="ws-capa-title" required class="md:col-span-2 px-2 py-1.5 rounded border border-slate-200 text-xs" placeholder="Titulo CAPA" value="${esc(capaEditing?.title || '')}">
                                    <input id="ws-capa-responsible" required class="px-2 py-1.5 rounded border border-slate-200 text-xs" placeholder="Responsable" value="${esc(capaEditing?.responsible || '')}">
                                    <input id="ws-capa-due" type="date" class="px-2 py-1.5 rounded border border-slate-200 text-xs" value="${esc(capaEditing?.due_date || '')}">
                                    <select id="ws-capa-type" class="px-2 py-1.5 rounded border border-slate-200 text-xs">
                                        <option value="Corrective" ${capaEditing?.action_type === 'Corrective' || !capaEditing ? 'selected' : ''}>Corrective</option>
                                        <option value="Preventive" ${capaEditing?.action_type === 'Preventive' ? 'selected' : ''}>Preventive</option>
                                    </select>
                                    <div class="flex gap-1">
                                        <button class="tk-btn-primary flex-1 py-1.5 text-xs">${capaEditing ? 'Guardar' : 'Crear CAPA'}</button>
                                        <button id="ws-capa-reset" type="button" class="px-2 py-1.5 rounded border border-slate-300 text-slate-700 text-xs">Limpiar</button>
                                    </div>
                                </form>
                                <div class="max-h-24 overflow-auto space-y-1">
                                    ${state.capaActions.length ? state.capaActions.map((action) => `
                                        <div class="text-xs rounded border ${action.id === state.editCapaActionId ? 'border-sky-300 bg-sky-50/50' : 'border-slate-200'} px-2 py-1 flex items-center justify-between gap-2">
                                            <div>
                                                <span class="font-semibold text-slate-700">${esc(action.title)}</span>
                                                <span class="ml-1 px-1.5 py-0.5 rounded ${workflowBadge(action.status)}">${esc(action.status)}</span>
                                                ${action.due_date ? `<span class="ml-1 text-slate-500">Vence: ${esc(action.due_date)}</span>` : ''}
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <button data-capa-edit="${action.id}" class="px-2 py-0.5 rounded border border-blue-200 text-blue-700 hover:bg-blue-50">Editar</button>
                                                <button data-capa-progress="${action.id}" class="px-2 py-0.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50">En progreso</button>
                                                <button data-capa-close-request="${action.id}" class="px-2 py-0.5 rounded border border-amber-200 text-amber-700 hover:bg-amber-50">Solicitar cierre</button>
                                                <button data-capa-approve="${action.id}" class="px-2 py-0.5 rounded border border-sky-200 text-sky-700 hover:bg-sky-50">Aprobar</button>
                                                <button data-capa-verify="${action.id}" class="px-2 py-0.5 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50">Verificar</button>
                                                <button data-capa-delete="${action.id}" class="px-2 py-0.5 rounded border border-red-200 text-red-700 hover:bg-red-50">Eliminar</button>
                                            </div>
                                        </div>
                                    `).join('') : '<div class="text-xs text-slate-500">Sin acciones CAPA para la NC seleccionada.</div>'}
                                </div>
                            ` : '<div class="text-xs text-slate-500">Selecciona una NC para gestionar acciones CAPA.</div>'}
                        </div>
                    </div>
                    <form id="ws-sample-form" class="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
                        <input id="ws-sample-value" type="number" step="0.0001" required class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Valor medido" value="${editing?.measured_value ?? ''}">
                        <input id="ws-sample-at" type="datetime-local" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" value="${toLocalDatetimeInput(editing?.measured_at)}">
                        <input id="ws-sample-by" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Medido por" value="${esc(editing?.measured_by || '')}">
                        <input id="ws-sample-batch" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Lote" value="${esc(editing?.batch_code || '')}">
                        <div class="flex gap-2">
                            <button class="tk-btn-primary flex-1 py-2 text-sm">${editing ? 'Guardar' : 'Registrar'}</button>
                            <button id="ws-sample-reset" type="button" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">Limpiar</button>
                        </div>
                    </form>
                    <div class="overflow-auto max-h-[320px] border border-slate-200 rounded-lg">
                        <table class="min-w-full text-xs">
                            <thead class="bg-slate-50 text-slate-600 sticky top-0"><tr><th class="text-left px-3 py-2">Fecha</th><th class="text-right px-3 py-2">Valor</th><th class="text-right px-3 py-2">Desvio</th><th class="text-center px-3 py-2">Estado</th><th class="text-left px-3 py-2">Usuario</th><th class="text-right px-3 py-2">Acciones</th></tr></thead>
                            <tbody class="divide-y divide-slate-100">
                                ${state.samples.map((row) => `
                                    <tr>
                                        <td class="px-3 py-2 text-slate-600">${new Date(row.measured_at).toLocaleString('es-CO')}</td>
                                        <td class="px-3 py-2 text-right font-semibold text-slate-800">${row.measured_value}</td>
                                        <td class="px-3 py-2 text-right text-slate-600">${row.deviation ?? '-'}</td>
                                        <td class="px-3 py-2 text-center"><span class="px-2 py-0.5 rounded-full ${statusBadge(row.status_color)}">${esc(row.status_color)}</span></td>
                                        <td class="px-3 py-2 text-slate-600">${esc(row.measured_by || '-')}</td>
                                        <td class="px-3 py-2 text-right whitespace-nowrap">
                                            <button data-sample-edit="${row.id}" class="px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 mr-1">Editar</button>
                                            <button data-sample-del="${row.id}" class="px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50">Eliminar</button>
                                        </td>
                                    </tr>
                                `).join('') || '<tr><td colspan="6" class="px-3 py-6 text-center text-slate-400">Sin muestras.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                ` : '<p class="text-sm text-slate-500">Selecciona una especificacion para registrar muestras.</p>'}
            </div>
        `;
    }

    function render() {
        container.innerHTML = `
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-slate-900">Muestreo de Peso</h1>
                <p class="text-slate-500 text-sm mt-1">Control de rango por SKU/proceso con semaforizacion automatica, SPC y soporte XLSX.</p>
                <div class="mt-3 flex flex-wrap gap-2">
                    <button id="ws-template-specs" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">Template specs</button>
                    <button id="ws-export-specs" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">Export specs</button>
                    <button id="ws-import-specs-btn" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">Import specs</button>
                    <button id="ws-template-samples" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">Template samples</button>
                    <button id="ws-export-samples" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">Export samples</button>
                    <button id="ws-export-spc-csv" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm ${state.selectedSpecId ? '' : 'opacity-50 pointer-events-none'}">Export SPC CSV</button>
                    <button id="ws-import-samples-btn" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">Import samples</button>
                    <input id="ws-import-specs" type="file" accept=".xlsx" class="hidden">
                    <input id="ws-import-samples" type="file" accept=".xlsx" class="hidden">
                </div>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-5 gap-5">
                <div class="xl:col-span-2 space-y-5">${renderSpecForm()}</div>
                <div class="xl:col-span-3 space-y-5">${renderSpecList()}${renderSamples()}</div>
            </div>
        `;
        wireEvents();
    }

    function wireEvents() {
        container.querySelector('#ws-spec-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = {
                name: container.querySelector('#ws-spec-name')?.value?.trim(),
                asset_id: container.querySelector('#ws-spec-asset')?.value || null,
                product_reference_id: container.querySelector('#ws-spec-reference')?.value || null,
                process_standard_id: container.querySelector('#ws-spec-standard')?.value || null,
                unit: container.querySelector('#ws-spec-unit')?.value || 'g',
                lower_limit: parseNum(container.querySelector('#ws-spec-lower')?.value),
                target_weight: parseNum(container.querySelector('#ws-spec-target')?.value),
                upper_limit: parseNum(container.querySelector('#ws-spec-upper')?.value),
                warning_band_pct: parseNum(container.querySelector('#ws-spec-warning')?.value, 0.1),
                sample_size: parseNum(container.querySelector('#ws-spec-size')?.value, 5),
                notes: container.querySelector('#ws-spec-notes')?.value?.trim() || null,
                is_active: !!container.querySelector('#ws-spec-active')?.checked,
            };
            if (!payload.name || payload.lower_limit === null || payload.upper_limit === null) {
                uiFeedback.warning('Nombre y límites son obligatorios.');
                return;
            }
            if (state.editSpecId) await qualityService.updateWeightSpec(state.editSpecId, payload);
            else state.selectedSpecId = (await qualityService.createWeightSpec(payload)).id;
            state.editSpecId = '';
            await loadSpecs();
            await loadSamplesAndSummary();
            render();
        });

        container.querySelector('#ws-spec-reset')?.addEventListener('click', () => {
            state.editSpecId = '';
            render();
        });

        container.querySelectorAll('[data-spec-open]').forEach((button) => button.addEventListener('click', async () => {
            state.selectedSpecId = button.dataset.specOpen;
            state.editSampleId = '';
            syncModuleContextFromSpec(selectedSpec());
            await loadSamplesAndSummary();
            render();
        }));

        container.querySelectorAll('[data-spec-edit]').forEach((button) => button.addEventListener('click', () => {
            state.editSpecId = button.dataset.specEdit;
            render();
        }));

        container.querySelectorAll('[data-spec-del]').forEach((button) => button.addEventListener('click', async () => {
            if (!confirm('¿Eliminar especificacion y sus muestras?')) return;
            await qualityService.deleteWeightSpec(button.dataset.specDel);
            if (state.selectedSpecId === button.dataset.specDel) state.selectedSpecId = '';
            if (state.editSpecId === button.dataset.specDel) state.editSpecId = '';
            await loadSpecs();
            await loadSamplesAndSummary();
            render();
        }));

        container.querySelector('#ws-sample-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!state.selectedSpecId) return;
            const payload = {
                measured_value: parseNum(container.querySelector('#ws-sample-value')?.value),
                measured_at: container.querySelector('#ws-sample-at')?.value || null,
                measured_by: container.querySelector('#ws-sample-by')?.value?.trim() || null,
                batch_code: container.querySelector('#ws-sample-batch')?.value?.trim() || null,
            };
            if (payload.measured_value === null) {
                uiFeedback.warning('Ingresa un valor de peso.');
                return;
            }
            if (state.editSampleId) await qualityService.updateWeightSample(state.editSampleId, payload);
            else await qualityService.createWeightSample(state.selectedSpecId, payload);
            state.editSampleId = '';
            await loadSamplesAndSummary();
            render();
        });

        container.querySelector('#ws-sample-reset')?.addEventListener('click', () => {
            state.editSampleId = '';
            render();
        });

        container.querySelectorAll('[data-sample-edit]').forEach((button) => button.addEventListener('click', () => {
            state.editSampleId = button.dataset.sampleEdit;
            render();
        }));

        container.querySelectorAll('[data-sample-del]').forEach((button) => button.addEventListener('click', async () => {
            if (!confirm('¿Eliminar muestra?')) return;
            await qualityService.deleteWeightSample(button.dataset.sampleDel);
            if (state.editSampleId === button.dataset.sampleDel) state.editSampleId = '';
            await loadSamplesAndSummary();
            render();
        }));

        container.querySelector('#ws-create-nc-from-spc')?.addEventListener('click', async () => {
            if (!state.selectedSpecId) return;
            await qualityService.createNonConformityFromSpc(state.selectedSpecId, { limit: 300 });
            await loadSamplesAndSummary();
            render();
        });
        container.querySelector('#ws-auto-nc')?.addEventListener('click', async () => {
            await qualityService.autoGenerateNonConformities({ limit: 300, only_active_specs: true, minimum_alert_level: 'warning' });
            await loadSamplesAndSummary();
            render();
        });
        container.querySelector('#ws-open-meetings')?.addEventListener('click', () => {
            const spec = selectedSpec();
            const assetPart = spec?.asset_id ? `?asset_id=${encodeURIComponent(spec.asset_id)}` : '';
            window.location.hash = `#/meetings${assetPart}`;
        });
        container.querySelector('#ws-run-capability')?.addEventListener('click', async () => {
            if (!state.selectedSpecId) return;
            await qualityService.runWeightSpcCapability(state.selectedSpecId, {
                limit: 300,
                run_type: 'on_demand',
                auto_link_improvement_action: true,
            });
            await loadSamplesAndSummary();
            render();
        });
        container.querySelector('#ws-run-capability-batch')?.addEventListener('click', async () => {
            const spec = selectedSpec();
            await qualityService.runWeightSpcCapabilityBatch({
                limit: 300,
                asset_id: spec?.asset_id || null,
                run_type: 'batch',
                only_active: true,
                auto_link_improvement_action: true,
            });
            await loadSamplesAndSummary();
            render();
        });
        container.querySelectorAll('[data-nc-progress]').forEach((button) => button.addEventListener('click', async () => {
            await qualityService.updateNonConformity(button.dataset.ncProgress, { status: 'In Progress' });
            await loadSamplesAndSummary();
            render();
        }));
        container.querySelectorAll('[data-nc-close-request]').forEach((button) => button.addEventListener('click', async () => {
            await qualityService.updateNonConformity(button.dataset.ncCloseRequest, { status: 'Close Requested' });
            await loadSamplesAndSummary();
            render();
        }));
        container.querySelectorAll('[data-nc-approve]').forEach((button) => button.addEventListener('click', async () => {
            await qualityService.updateNonConformity(button.dataset.ncApprove, { status: 'Approved' });
            await loadSamplesAndSummary();
            render();
        }));
        container.querySelectorAll('[data-nc-verify]').forEach((button) => button.addEventListener('click', async () => {
            await qualityService.updateNonConformity(button.dataset.ncVerify, { status: 'Verified' });
            await loadSamplesAndSummary();
            render();
        }));
        container.querySelectorAll('[data-nc-open]').forEach((button) => button.addEventListener('click', async () => {
            state.selectedNonConformityId = button.dataset.ncOpen;
            state.editCapaActionId = '';
            await loadSamplesAndSummary();
            render();
        }));
        container.querySelectorAll('[data-nc-delete]').forEach((button) => button.addEventListener('click', async () => {
            if (!confirm('¿Eliminar no conformidad y sus CAPA asociadas?')) return;
            await qualityService.deleteNonConformity(button.dataset.ncDelete);
            if (state.selectedNonConformityId === button.dataset.ncDelete) {
                state.selectedNonConformityId = '';
                state.editCapaActionId = '';
            }
            await loadSamplesAndSummary();
            render();
        }));

        container.querySelector('#ws-capa-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!state.selectedNonConformityId) return;
            const payload = {
                action_type: container.querySelector('#ws-capa-type')?.value || 'Corrective',
                title: container.querySelector('#ws-capa-title')?.value?.trim(),
                responsible: container.querySelector('#ws-capa-responsible')?.value?.trim(),
                due_date: container.querySelector('#ws-capa-due')?.value || null,
                status: 'Open',
                auto_link_improvement_action: true,
            };
            if (!payload.title || !payload.responsible) {
                uiFeedback.warning('Título y responsable son obligatorios para CAPA.');
                return;
            }
            if (state.editCapaActionId) {
                await qualityService.updateCapaAction(state.editCapaActionId, payload);
            } else {
                await qualityService.createCapaAction(state.selectedNonConformityId, payload);
            }
            state.editCapaActionId = '';
            await loadSamplesAndSummary();
            render();
        });
        container.querySelector('#ws-capa-reset')?.addEventListener('click', () => {
            state.editCapaActionId = '';
            render();
        });
        container.querySelectorAll('[data-capa-edit]').forEach((button) => button.addEventListener('click', () => {
            state.editCapaActionId = button.dataset.capaEdit;
            render();
        }));
        container.querySelectorAll('[data-capa-delete]').forEach((button) => button.addEventListener('click', async () => {
            if (!confirm('¿Eliminar acción CAPA?')) return;
            await qualityService.deleteCapaAction(button.dataset.capaDelete);
            if (state.editCapaActionId === button.dataset.capaDelete) state.editCapaActionId = '';
            await loadSamplesAndSummary();
            render();
        }));
        container.querySelectorAll('[data-capa-progress]').forEach((button) => button.addEventListener('click', async () => {
            await qualityService.updateCapaAction(button.dataset.capaProgress, { status: 'In Progress' });
            await loadSamplesAndSummary();
            render();
        }));
        container.querySelectorAll('[data-capa-close-request]').forEach((button) => button.addEventListener('click', async () => {
            await qualityService.updateCapaAction(button.dataset.capaCloseRequest, { status: 'Close Requested' });
            await loadSamplesAndSummary();
            render();
        }));
        container.querySelectorAll('[data-capa-approve]').forEach((button) => button.addEventListener('click', async () => {
            await qualityService.updateCapaAction(button.dataset.capaApprove, { status: 'Approved' });
            await loadSamplesAndSummary();
            render();
        }));
        container.querySelectorAll('[data-capa-verify]').forEach((button) => button.addEventListener('click', async () => {
            await qualityService.updateCapaAction(button.dataset.capaVerify, { status: 'Verified' });
            await loadSamplesAndSummary();
            render();
        }));

        container.querySelector('#ws-template-specs')?.addEventListener('click', async () => {
            await downloadWithAuth('/quality/weights/xlsx/template?entity=specs', 'takta_weight_specs_template.xlsx');
        });
        container.querySelector('#ws-export-specs')?.addEventListener('click', async () => {
            await downloadWithAuth('/quality/weights/xlsx/export?entity=specs', 'takta_weight_specs_export.xlsx');
        });
        container.querySelector('#ws-template-samples')?.addEventListener('click', async () => {
            await downloadWithAuth('/quality/weights/xlsx/template?entity=samples', 'takta_weight_samples_template.xlsx');
        });
        container.querySelector('#ws-export-samples')?.addEventListener('click', async () => {
            await downloadWithAuth('/quality/weights/xlsx/export?entity=samples', 'takta_weight_samples_export.xlsx');
        });
        container.querySelector('#ws-export-spc-csv')?.addEventListener('click', async () => {
            if (!state.selectedSpecId) return;
            await downloadWithAuth(`/quality/weight-specs/${state.selectedSpecId}/spc/export/csv?limit=300`, `takta_spc_${state.selectedSpecId}.csv`);
        });

        container.querySelector('#ws-import-specs-btn')?.addEventListener('click', () => container.querySelector('#ws-import-specs')?.click());
        container.querySelector('#ws-import-samples-btn')?.addEventListener('click', () => container.querySelector('#ws-import-samples')?.click());

        container.querySelector('#ws-import-specs')?.addEventListener('change', async (event) => {
            const file = event.target?.files?.[0];
            if (!file) return;
            await uploadWithAuth('/quality/weights/xlsx/import?entity=specs', file);
            await loadSpecs();
            await loadSamplesAndSummary();
            render();
        });
        container.querySelector('#ws-import-samples')?.addEventListener('change', async (event) => {
            const file = event.target?.files?.[0];
            if (!file) return;
            await uploadWithAuth('/quality/weights/xlsx/import?entity=samples', file);
            await loadSamplesAndSummary();
            render();
        });
    }

    try {
        await refreshAll();
        render();
    } catch (error) {
        container.innerHTML = `<div class="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200">Error cargando modulo de muestreo de peso: ${esc(error.message)}</div>`;
    }

    return container;
}

export default WeightSamplingPage;



