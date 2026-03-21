import ApiClient from '../services/api.client.js';
import { improvementService } from '../services/improvement.service.js';
import { getHashContext, getModuleContext, setModuleContext } from '../services/module-context.service.js';
import uiFeedback from '../services/ui-feedback.service.js';
const CATS = ['Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke'];
const DEFAULT_TEMPLATE_LINES = [
    'seiri|Seiri|Eliminar elementos innecesarios|1',
    'seiton|Seiton|Orden visual y ubicaciones definidas|1',
    'seiso|Seiso|Limpieza y condición del entorno|1',
    'seiketsu|Seiketsu|Estandarización y control visual|1',
    'shitsuke|Shitsuke|Disciplina y sostenimiento|1',
].join('\n');

function esc(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function uid(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function parseNumberOrNull(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseChecklistLines(text) {
    return String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [codeRaw, categoryRaw, questionRaw, weightRaw] = line.split('|').map((item) => item?.trim());
            if (!codeRaw || !categoryRaw || !questionRaw) return null;
            return {
                code: codeRaw,
                category: categoryRaw,
                question: questionRaw,
                weight: Number(weightRaw || 1) || 1,
            };
        })
        .filter(Boolean);
}

async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
    });
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

function densityBadge(density) {
    if (density >= 0.85) return 'bg-red-100 text-red-700';
    if (density >= 0.6) return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
}

function workflowBadge(status = 'Open') {
    if (status === 'Verified') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Approved') return 'bg-blue-100 text-blue-700';
    if (status === 'CloseRequested') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
}

function currentPeriodKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function kpiStatusBadge(status = 'red') {
    if (status === 'green') return 'bg-emerald-100 text-emerald-700';
    if (status === 'yellow') return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
}

function parseKpiActionSource(sourceDocument = '') {
    const match = String(sourceDocument).match(/^KPI_MC:(\d{4}-\d{2}):(.+)$/);
    if (!match) return null;
    return { period: match[1], code: match[2] };
}

function getInitialTabFromHash() {
    const raw = window.location.hash || '#/excellence';
    const query = raw.includes('?') ? raw.split('?')[1] : '';
    const tab = new URLSearchParams(query).get('tab');
    const allowed = new Set(['actions', 'audits', 'kpi-mc', 'kanban', 'vsm']);
    return allowed.has(tab) ? tab : 'actions';
}

async function ExcellencePage() {
    const container = document.createElement('div');
    container.className = 'p-4 md:p-6 max-w-7xl mx-auto';
    const hashContext = getHashContext();
    const storedContext = getModuleContext();
    const initialAssetId = hashContext.asset_id || storedContext.asset_id || '';

    const state = {
        tab: getInitialTabFromHash(),
        assets: [],
        actions: [],
        workflows: {},
        focusActionId: null,
        audits: [],
        checklists: [],
        selectedChecklistId: '',
        kanbanLoops: [],
        lastKanban: null,
        radarSummary: null,
        mcKpiPeriod: currentPeriodKey(),
        mcKpiScorecard: null,
        mcKpiTrend: null,
        mcKpiTrendMonths: 6,
        mcKpiActionsByCode: {},
        vsmCanvases: [],
        selectedAssetId: initialAssetId,
        vsm: { canvasId: '', name: '', asset_id: initialAssetId || '', nodes: [], edges: [], analysis: null },
    };

    if (initialAssetId) {
        setModuleContext({ asset_id: initialAssetId }, 'excellence');
    }

    function setSelectedAsset(assetId, source = 'excellence') {
        const normalized = assetId || '';
        state.selectedAssetId = normalized;
        if (!state.vsm.asset_id) {
            state.vsm.asset_id = normalized;
        }
        setModuleContext({ asset_id: normalized || null }, source);
    }

    function assetQuery() {
        if (!state.selectedAssetId) return '';
        return `asset_id=${encodeURIComponent(state.selectedAssetId)}`;
    }

    function selectedChecklist() {
        return state.checklists.find((row) => row.id === state.selectedChecklistId) || null;
    }

    function auditRowsFromChecklist() {
        const template = selectedChecklist();
        if (template?.items?.length) {
            return template.items.map((item, idx) => ({
                code: item.code || `row_${idx + 1}`,
                category: item.category || 'General',
                question: item.question || `Pregunta ${idx + 1}`,
            }));
        }
        return CATS.map((cat) => ({
            code: cat.toLowerCase(),
            category: cat,
            question: `Checklist ${cat}`,
        }));
    }

    async function refreshWorkflows(extraActions = []) {
        state.workflows = {};
        const actionMap = new Map();
        state.actions.slice(0, 120).forEach((action) => actionMap.set(action.id, action));
        extraActions.slice(0, 120).forEach((action) => actionMap.set(action.id, action));
        const targets = Array.from(actionMap.values());
        const rows = await Promise.all(
            targets.map((action) =>
                improvementService.getActionWorkflow(action.id)
                    .then((workflow) => ({ id: action.id, workflow }))
                    .catch(() => ({ id: action.id, workflow: null })),
            ),
        );
        rows.forEach((row) => {
            if (row.workflow) state.workflows[row.id] = row.workflow;
        });
    }

    async function refresh() {
        const scopedAssetQuery = assetQuery();
        const kpiActionPrefix = `KPI_MC:${state.mcKpiPeriod}:`;
        const [assetsRes, actionsRes, auditsRes, checklistsRes, kanbanRes, canvasesRes, mcKpiRes, mcKpiTrendRes, mcKpiActionsRes] = await Promise.allSettled([
            ApiClient.get('/assets'),
            improvementService.getActions(scopedAssetQuery),
            improvementService.getAudits(scopedAssetQuery),
            improvementService.getAuditChecklists('type=5S'),
            improvementService.getKanbanLoops(),
            improvementService.getVsmCanvases(scopedAssetQuery),
            improvementService.getMcKpiScorecard(`period=${encodeURIComponent(state.mcKpiPeriod)}`),
            improvementService.getMcKpiTrend(`months=${state.mcKpiTrendMonths}&end_period=${encodeURIComponent(state.mcKpiPeriod)}`),
            improvementService.getActions(`source_prefix=${encodeURIComponent(kpiActionPrefix)}`),
        ]);
        state.assets = assetsRes.status === 'fulfilled' ? assetsRes.value : [];
        if (state.selectedAssetId && !state.assets.some((asset) => asset.id === state.selectedAssetId)) {
            setSelectedAsset('', 'excellence');
        }
        state.actions = actionsRes.status === 'fulfilled' ? actionsRes.value : [];
        state.audits = auditsRes.status === 'fulfilled' ? auditsRes.value : [];
        state.checklists = checklistsRes.status === 'fulfilled' ? checklistsRes.value : [];
        const loops = kanbanRes.status === 'fulfilled' ? kanbanRes.value : [];
        state.kanbanLoops = state.selectedAssetId
            ? loops.filter((loop) => loop.asset_origin_id === state.selectedAssetId || loop.asset_dest_id === state.selectedAssetId)
            : loops;
        state.mcKpiScorecard = mcKpiRes.status === 'fulfilled' ? mcKpiRes.value : null;
        state.mcKpiTrend = mcKpiTrendRes.status === 'fulfilled' ? mcKpiTrendRes.value : null;
        const mcKpiActions = mcKpiActionsRes.status === 'fulfilled' ? mcKpiActionsRes.value : [];
        state.mcKpiActionsByCode = {};
        mcKpiActions.forEach((action) => {
            const parsed = parseKpiActionSource(action.source_document);
            if (!parsed || parsed.period !== state.mcKpiPeriod) return;
            state.mcKpiActionsByCode[parsed.code] = action;
        });
        state.vsmCanvases = canvasesRes.status === 'fulfilled' ? canvasesRes.value : [];
        if (!state.selectedChecklistId && state.checklists[0]) state.selectedChecklistId = state.checklists[0].id;
        if (!state.vsm.canvasId && state.vsmCanvases[0]) state.vsm.canvasId = state.vsmCanvases[0].id;
        if (!state.vsm.asset_id) {
            state.vsm.asset_id = state.selectedAssetId || (state.assets[0]?.id || '');
        }
        try {
            const radarQuery = state.selectedAssetId
                ? `audit_type=5S&asset_id=${encodeURIComponent(state.selectedAssetId)}`
                : 'audit_type=5S';
            state.radarSummary = await improvementService.getAuditRadarComparison(radarQuery);
        } catch {
            state.radarSummary = null;
        }
        await refreshWorkflows(mcKpiActions);
    }

    async function loadVsmCanvas(canvasId) {
        const detail = await improvementService.getVsmCanvas(canvasId);
        state.vsm.canvasId = detail.id;
        state.vsm.name = detail.name || '';
        state.vsm.asset_id = detail.asset_id || '';
        if (detail.asset_id) {
            setSelectedAsset(detail.asset_id, 'excellence');
        }
        state.vsm.nodes = Array.isArray(detail.nodes) ? detail.nodes.map((node) => ({
            id: node.id || uid('node'),
            type: node.type || 'process',
            label: node.label || 'Proceso',
            lead_time: Number(node.lead_time || 0),
            cycle_time: Number(node.cycle_time || 0),
            capacity: Number(node.capacity || 0),
        })) : [];
        state.vsm.edges = Array.isArray(detail.edges) ? detail.edges.map((edge) => ({
            id: edge.id || uid('edge'),
            from: edge.from,
            to: edge.to,
            flow_density: Number(edge.flow_density || 0),
        })) : [];
        state.vsm.analysis = null;
    }

    function resetVsmCanvas() {
        state.vsm.canvasId = '';
        state.vsm.name = '';
        state.vsm.nodes = [];
        state.vsm.edges = [];
        state.vsm.analysis = null;
    }

    function renderTabs() {
        const tabs = [
            ['actions', 'Action Tracker'],
            ['audits', 'Auditorías 5S'],
            ['kpi-mc', 'KPI MC'],
            ['kanban', 'Kanban'],
            ['vsm', 'VSM'],
        ];
        return `
            <div class="border-b border-slate-200 mb-6">
                <nav class="flex gap-5 flex-wrap">
                    ${tabs.map(([id, label]) => `<button data-tab="${id}" class="exc-tab pb-3 text-sm font-medium border-b-2 ${state.tab === id ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500'}">${label}</button>`).join('')}
                </nav>
            </div>
        `;
    }

    function renderActions() {
        return `
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div class="xl:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <form id="action-form" class="space-y-3">
                        <select id="action-asset" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"><option value="">Activo (opcional)</option>${state.assets.map((a) => `<option value="${a.id}">${esc(a.name)} (${esc(a.type)})</option>`).join('')}</select>
                        <input id="action-source" required placeholder="Fuente" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <textarea id="action-desc" required rows="3" placeholder="Descripción" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"></textarea>
                        <input id="action-owner" required placeholder="Responsable" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input id="action-due" type="date" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <button class="w-full tk-btn-primary py-2 rounded-lg text-sm font-medium text-white">Crear Acción</button>
                    </form>
                    <button id="actions-export-pdf" class="w-full mt-3 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100">Exportar Tablero PDF</button>
                </div>
                <div class="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm overflow-auto">
                    <table class="w-full text-xs min-w-[1100px]">
                        <thead class="text-slate-600"><tr><th class="text-left">Fuente</th><th class="text-left">Descripción</th><th class="text-left">Responsable</th><th class="text-left">Estado</th><th class="text-left">Workflow</th><th class="text-left">Notas/Foto</th><th class="text-right">Acciones</th></tr></thead>
                        <tbody class="divide-y divide-slate-100">
                            ${state.actions.map((action) => `
                                <tr data-action-row="${action.id}" class="${state.focusActionId === action.id ? 'bg-amber-50' : ''}">
                                    <td class="py-2">${esc(action.source_document)}</td>
                                    <td class="py-2">${esc(action.description)}</td>
                                    <td class="py-2">${esc(action.responsible)}</td>
                                    <td class="py-2">${esc(action.status)}</td>
                                    <td class="py-2"><span class="px-2 py-0.5 rounded-full ${workflowBadge(state.workflows[action.id]?.workflow_status || 'Open')}">${esc(state.workflows[action.id]?.workflow_status || 'Open')}</span></td>
                                    <td class="py-2"><input data-workflow-notes="${action.id}" placeholder="Notas" class="w-36 px-2 py-1 rounded border border-slate-200 text-xs mb-1"><input data-workflow-photo="${action.id}" type="file" accept="image/*" class="block text-[10px] text-slate-500"></td>
                                    <td class="py-2 text-right whitespace-nowrap">
                                        <button data-action-status="Open" data-action-id="${action.id}" class="text-[11px] px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 mr-1">Open</button>
                                        <button data-action-status="In Progress" data-action-id="${action.id}" class="text-[11px] px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 mr-1">In Progress</button>
                                        <button data-workflow-request="${action.id}" class="text-[11px] px-2 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-50 mr-1">Solicitar</button>
                                        <button data-workflow-approve="${action.id}" class="text-[11px] px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50 mr-1">Aprobar</button>
                                        <button data-workflow-verify="${action.id}" class="text-[11px] px-2 py-1 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 mr-1">Verificar</button>
                                        <button data-action-del="${action.id}" class="text-[11px] px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50">Eliminar</button>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="7" class="py-6 text-center text-slate-400">Sin acciones</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderAudits() {
        const checklist = selectedChecklist();
        const rows = auditRowsFromChecklist();
        return `
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div class="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-3"><h3 class="text-sm font-semibold text-slate-800">Auditoría Avanzada 5S</h3><span class="text-xs px-2 py-1 rounded-full ${checklist?.require_photo ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}">${checklist?.require_photo ? 'Foto obligatoria' : 'Foto opcional'}</span></div>
                    <form id="audit-form" class="space-y-3">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <select id="audit-asset" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">${state.assets.map((a) => `<option value="${a.id}">${esc(a.name)} (${esc(a.type)})</option>`).join('')}</select>
                            <input id="audit-auditor" required placeholder="Auditor" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                            <input id="audit-owner" placeholder="Responsable acción (opcional)" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                            <input id="audit-threshold" type="number" min="1" max="5" value="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                            <select id="audit-template" class="md:col-span-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"><option value="">Checklist base 5S</option>${state.checklists.map((row) => `<option value="${row.id}" ${row.id === state.selectedChecklistId ? 'selected' : ''}>${esc(row.name)}</option>`).join('')}</select>
                        </div>
                        <div class="overflow-auto border border-slate-200 rounded-lg">
                            <table class="w-full text-xs min-w-[900px]">
                                <thead class="bg-slate-50 text-slate-600"><tr><th class="text-left px-3 py-2">Categoría</th><th class="text-left px-3 py-2">Pregunta</th><th class="text-center px-3 py-2">Score</th><th class="text-left px-3 py-2">Notas</th><th class="text-left px-3 py-2">Foto</th></tr></thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${rows.map((row, idx) => `
                                        <tr data-audit-row data-category="${esc(row.category)}" data-question="${esc(row.question)}" data-code="${esc(row.code)}">
                                            <td class="px-3 py-2">${esc(row.category)}</td>
                                            <td class="px-3 py-2">${esc(row.question)}</td>
                                            <td class="px-3 py-2 text-center"><select data-audit-score class="px-2 py-1 rounded border border-slate-200 text-xs"><option value="5">5</option><option value="4">4</option><option value="3" selected>3</option><option value="2">2</option><option value="1">1</option></select></td>
                                            <td class="px-3 py-2"><input data-audit-notes placeholder="Observación ${idx + 1}" class="w-full px-2 py-1 rounded border border-slate-200 text-xs"></td>
                                            <td class="px-3 py-2"><input data-audit-photo type="file" accept="image/*" class="text-[10px] text-slate-500"></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <button class="w-full tk-btn-primary py-2 rounded-lg text-sm font-medium text-white">Guardar Auditoría</button>
                    </form>
                </div>
                <div class="space-y-4">
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <h3 class="text-sm font-semibold text-slate-800 mb-2">Checklist Templates 5S</h3>
                        <form id="checklist-form" class="space-y-2">
                            <input id="checklist-name" required placeholder="Nombre template" class="w-full px-3 py-2 rounded border border-slate-200 text-sm">
                            <select id="checklist-asset" class="w-full px-3 py-2 rounded border border-slate-200 text-sm"><option value="">Global</option>${state.assets.map((a) => `<option value="${a.id}">${esc(a.name)} (${esc(a.type)})</option>`).join('')}</select>
                            <label class="text-xs text-slate-600 flex items-center gap-2"><input id="checklist-photo-required" type="checkbox"> Requerir foto para hallazgos</label>
                            <textarea id="checklist-items" rows="5" class="w-full px-3 py-2 rounded border border-slate-200 text-xs font-mono">${DEFAULT_TEMPLATE_LINES}</textarea>
                            <button class="w-full px-3 py-2 rounded bg-brand-orange text-white text-sm font-semibold hover:bg-orange-600">Guardar Template</button>
                        </form>
                        <div class="mt-2 max-h-40 overflow-auto space-y-1">
                            ${state.checklists.map((row) => `<div class="rounded border px-2 py-1 text-xs ${row.id === state.selectedChecklistId ? 'border-orange-300 bg-orange-50' : 'border-slate-200'} flex items-center justify-between gap-2"><button data-checklist-pick="${row.id}" class="text-left text-slate-700 flex-1">${esc(row.name)} · ${row.require_photo ? 'Foto obligatoria' : 'Foto opcional'}</button><button data-checklist-del="${row.id}" class="text-red-700">Eliminar</button></div>`).join('') || '<p class="text-xs text-slate-400">Sin templates.</p>'}
                        </div>
                    </div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-sm text-slate-600">${state.radarSummary?.categories?.length ? `Radar comparativo ${state.radarSummary.previous_month} vs ${state.radarSummary.current_month}` : 'Sin datos de radar.'}</div>
                    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table class="w-full text-xs">
                            <thead class="bg-slate-50 text-slate-600"><tr><th class="text-left px-3 py-2">Fecha</th><th class="text-left px-3 py-2">Activo</th><th class="text-right px-3 py-2">Cumplimiento</th><th class="text-right px-3 py-2">Acciones</th></tr></thead>
                            <tbody class="divide-y divide-slate-100">
                                ${state.audits.map((audit) => `<tr><td class="px-3 py-2 text-slate-500">${new Date(audit.audit_date).toLocaleDateString('es-CO')}</td><td class="px-3 py-2">${esc(audit.asset_name || audit.asset_id)}</td><td class="px-3 py-2 text-right font-semibold">${audit.compliance_pct}%</td><td class="px-3 py-2 text-right"><button data-audit-del="${audit.id}" class="text-red-700">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="4" class="py-6 text-center text-slate-400">Sin auditorías</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function renderMcKpi() {
        const scorecard = state.mcKpiScorecard;
        const totals = scorecard?.totals || {};
        const categories = scorecard?.categories || [];
        const items = scorecard?.items || [];
        const trend = state.mcKpiTrend;
        const trendPoints = trend?.points || [];
        const maxTrendScore = trendPoints.length
            ? Math.max(...trendPoints.map((point) => Number(point.weighted_kpi_result_pct || 0)), 1)
            : 1;
        const trendDelta = trend?.delta_vs_previous || null;
        const trendAlert = trend?.trend_alert || null;
        const trendDeltaClass = Number(trendDelta?.weighted_kpi_result_delta_pct || 0) >= 0
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-rose-700 bg-rose-50 border-rose-200';
        const trendDeltaLabel = trendDelta
            ? `${Number(trendDelta.weighted_kpi_result_delta_pct || 0).toFixed(2)} pts vs ${trendDelta.previous_period}`
            : 'Sin histórico para delta';
        const trendAlertStyles = {
            critical: 'border-red-200 bg-red-50 text-red-700',
            risk: 'border-amber-200 bg-amber-50 text-amber-700',
            watch: 'border-sky-200 bg-sky-50 text-sky-700',
            healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            none: 'border-slate-200 bg-slate-50 text-slate-600',
        };
        const trendAlertTone = trendAlertStyles[trendAlert?.level] || trendAlertStyles.none;

        return `
            <div class="space-y-4">
                <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div class="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h3 class="text-sm font-semibold text-slate-800">Scorecard KPI - Mejoramiento Continuo</h3>
                            <p class="text-xs text-slate-500 mt-1">Seguimiento ponderado por participación individual y KPI corporativo.</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-slate-500">Periodo</label>
                            <input id="kpi-mc-period" type="month" value="${esc(state.mcKpiPeriod)}" class="h-9 px-2 rounded border border-slate-200 text-xs" />
                            <select id="kpi-mc-trend-months" class="h-9 px-2 rounded border border-slate-200 text-xs">
                                ${[3, 6, 9, 12].map((value) => `<option value="${value}" ${Number(state.mcKpiTrendMonths) === value ? 'selected' : ''}>${value} meses</option>`).join('')}
                            </select>
                            <button id="kpi-mc-seed" class="h-9 px-3 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">Re-sembrar catálogo</button>
                            <button id="kpi-mc-close-pending" class="h-9 px-3 rounded border border-amber-300 text-xs font-semibold text-amber-700 hover:bg-amber-50">Cerrar pesos pendientes</button>
                        </div>
                    </div>
                    <div class="mt-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <p class="text-[11px] text-slate-500 uppercase">Cobertura</p>
                            <p class="text-lg font-bold text-slate-800">${Number(totals.completion_rate_pct || 0).toFixed(1)}%</p>
                        </div>
                        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <p class="text-[11px] text-slate-500 uppercase">Puntaje Individual</p>
                            <p class="text-lg font-bold text-slate-800">${Number(totals.weighted_individual_result_pct || 0).toFixed(2)}</p>
                        </div>
                        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <p class="text-[11px] text-slate-500 uppercase">Puntaje KPI</p>
                            <p class="text-lg font-bold text-slate-800">${Number(totals.weighted_kpi_result_pct || 0).toFixed(2)}</p>
                        </div>
                        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <p class="text-[11px] text-slate-500 uppercase">Peso KPI Total</p>
                            <p class="text-lg font-bold text-slate-800">${Number(totals.kpi_weight_total || 0).toFixed(2)}%</p>
                        </div>
                        <div class="rounded-lg border ${totals.has_pending_kpi_weights ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'} px-3 py-2">
                            <p class="text-[11px] ${totals.has_pending_kpi_weights ? 'text-amber-600' : 'text-emerald-600'} uppercase">Pesos KPI pendientes</p>
                            <p class="text-lg font-bold ${totals.has_pending_kpi_weights ? 'text-amber-700' : 'text-emerald-700'}">${Number(totals.missing_kpi_weight_total || 0).toFixed(2)}%</p>
                        </div>
                        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <p class="text-[11px] text-slate-500 uppercase">Items</p>
                            <p class="text-lg font-bold text-slate-800">${totals.items_with_measurement || 0}/${totals.items_total || 0}</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h4 class="text-sm font-semibold text-slate-800">Tendencia mensual KPI MC</h4>
                        <span class="text-[11px] px-2 py-1 rounded border ${trendDeltaClass}">
                            ${esc(trendDeltaLabel)}
                        </span>
                    </div>
                    <div class="mb-3 rounded-lg border px-3 py-2 text-xs ${trendAlertTone}">
                        <p class="font-semibold">${esc(String(trendAlert?.message || 'Sin alerta de tendencia.'))}</p>
                        <p class="mt-1">${esc(String(trendAlert?.recommended_action || ''))}</p>
                    </div>
                    <div class="space-y-2">
                        ${trendPoints.map((point) => {
                            const weighted = Number(point.weighted_kpi_result_pct || 0);
                            const completion = Number(point.completion_rate_pct || 0);
                            const width = Math.max(4, (weighted / maxTrendScore) * 100);
                            return `
                                <div class="grid grid-cols-[72px_1fr_auto] items-center gap-2">
                                    <span class="text-[11px] text-slate-500">${esc(point.period)}</span>
                                    <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div class="h-2 bg-brand-orange rounded-full" style="width:${width.toFixed(2)}%"></div>
                                    </div>
                                    <span class="text-[11px] text-slate-700">${weighted.toFixed(2)} pts · ${completion.toFixed(1)}% · R${Number(point.red_items || 0)}</span>
                                </div>
                            `;
                        }).join('') || '<p class="text-xs text-slate-400">Sin datos de tendencia.</p>'}
                    </div>
                </div>
                <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm overflow-auto">
                    <h4 class="text-sm font-semibold text-slate-800 mb-2">Contribución por línea de acción</h4>
                    <table class="w-full text-xs min-w-[720px]">
                        <thead class="text-slate-600">
                            <tr>
                                <th class="text-left py-2">Línea</th>
                                <th class="text-right py-2">Peso Individual</th>
                                <th class="text-right py-2">Peso KPI</th>
                                <th class="text-right py-2">Resultado Individual</th>
                                <th class="text-right py-2">Resultado KPI</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${categories.map((row) => `
                                <tr>
                                    <td class="py-2">${esc(row.focus_area)}</td>
                                    <td class="py-2 text-right">${Number(row.individual_weight_total || 0).toFixed(2)}%</td>
                                    <td class="py-2 text-right">${Number(row.kpi_weight_total || 0).toFixed(2)}%</td>
                                    <td class="py-2 text-right font-semibold">${Number(row.weighted_individual_result || 0).toFixed(2)}</td>
                                    <td class="py-2 text-right font-semibold">${Number(row.weighted_kpi_result || 0).toFixed(2)}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="5" class="py-6 text-center text-slate-400">Sin datos.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm overflow-auto">
                    <h4 class="text-sm font-semibold text-slate-800 mb-2">Carga de avance por KPI</h4>
                    <table class="w-full text-xs min-w-[1520px]">
                        <thead class="text-slate-600">
                            <tr>
                                <th class="text-left py-2">Código</th>
                                <th class="text-left py-2">Línea de acción</th>
                                <th class="text-left py-2">Indicador</th>
                                <th class="text-right py-2">Peso Ind.</th>
                                <th class="text-right py-2">Peso KPI</th>
                                <th class="text-right py-2">Meta</th>
                                <th class="text-right py-2">Actual</th>
                                <th class="text-right py-2">Cumpl.</th>
                                <th class="text-left py-2">Estado</th>
                                <th class="text-left py-2">Traza Acción</th>
                                <th class="text-left py-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${items.map((row) => {
                                const linkedAction = state.mcKpiActionsByCode[row.code] || null;
                                const linkedWorkflow = linkedAction ? state.workflows[linkedAction.id] : null;
                                const workflowStatus = linkedWorkflow?.workflow_status || 'Open';
                                const canApprove = workflowStatus === 'CloseRequested' || workflowStatus === 'Approved';
                                const canVerify = workflowStatus === 'Approved' || workflowStatus === 'Verified';
                                return `
                                <tr>
                                    <td class="py-2 font-semibold text-slate-700">${esc(row.code)}</td>
                                    <td class="py-2">${esc(row.action_line)}</td>
                                    <td class="py-2">${esc(row.indicator_name)}</td>
                                    <td class="py-2 text-right">${Number(row.individual_weight_pct || 0).toFixed(2)}%</td>
                                    <td class="py-2 text-right">
                                        ${row.kpi_weight_defined
                                            ? `${Number(row.kpi_weight_pct || 0).toFixed(2)}%`
                                            : `<div class="flex items-center justify-end gap-1"><input data-kpi-weight-input="${row.id}" type="number" min="0" max="100" step="0.01" value="${Number(row.kpi_weight_pct || 0).toFixed(2)}" class="w-20 h-7 px-1 rounded border border-amber-300 text-[11px] text-right"><button data-kpi-weight-save="${row.id}" class="h-7 px-2 rounded border border-amber-300 text-[11px] text-amber-700">Definir</button></div>`}
                                    </td>
                                    <td class="py-2 text-right"><input data-kpi-target="${row.id}" type="number" step="0.01" value="${row.target_value ?? ''}" class="w-20 h-7 px-1 rounded border border-slate-200 text-[11px] text-right"></td>
                                    <td class="py-2 text-right"><input data-kpi-actual="${row.id}" type="number" step="0.01" value="${row.actual_value ?? ''}" class="w-20 h-7 px-1 rounded border border-slate-200 text-[11px] text-right"></td>
                                    <td class="py-2 text-right"><input data-kpi-compliance="${row.id}" type="number" min="0" max="200" step="0.01" value="${Number(row.compliance_pct || 0).toFixed(2)}" class="w-20 h-7 px-1 rounded border border-slate-200 text-[11px] text-right"></td>
                                    <td class="py-2"><span class="px-2 py-0.5 rounded-full ${kpiStatusBadge(row.status_color)}">${esc(row.status_color || 'red')}</span></td>
                                    <td class="py-2">
                                        ${linkedAction
                                            ? `<div class="space-y-1">
                                                <div class="flex flex-wrap items-center gap-1">
                                                    <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">${esc(linkedAction.status)}</span>
                                                    <span class="px-2 py-0.5 rounded-full ${workflowBadge(linkedWorkflow?.workflow_status || 'Open')}">${esc(linkedWorkflow?.workflow_status || 'Open')}</span>
                                                </div>
                                                <div class="text-[10px] text-slate-500">${esc(linkedAction.source_document)}</div>
                                                <div class="flex flex-wrap items-center gap-1">
                                                    <button data-kpi-workflow-request="${linkedAction.id}" class="text-[11px] px-2 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-50">Solicitar</button>
                                                    <button data-kpi-workflow-approve="${linkedAction.id}" ${canApprove ? '' : 'disabled'} class="text-[11px] px-2 py-1 rounded border border-indigo-200 ${canApprove ? 'text-indigo-700 hover:bg-indigo-50' : 'text-slate-400 cursor-not-allowed'}">Aprobar</button>
                                                    <button data-kpi-workflow-verify="${linkedAction.id}" ${canVerify ? '' : 'disabled'} class="text-[11px] px-2 py-1 rounded border border-emerald-200 ${canVerify ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-400 cursor-not-allowed'}">Verificar</button>
                                                </div>
                                                <button data-kpi-trace-open-action="${linkedAction.id}" class="text-[11px] px-2 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-50">Ver en Action Tracker</button>
                                            </div>`
                                            : '<span class="text-[11px] text-slate-400">Sin acción automática</span>'
                                        }
                                    </td>
                                    <td class="py-2">
                                        <button data-kpi-save="${row.id}" class="h-7 px-2 rounded border border-blue-200 text-[11px] text-blue-700 hover:bg-blue-50 mr-1">Guardar</button>
                                        ${row.has_measurement ? `<button data-kpi-del="${row.id}" class="h-7 px-2 rounded border border-red-200 text-[11px] text-red-700 hover:bg-red-50">Eliminar</button>` : ''}
                                    </td>
                                </tr>
                            `;
                            }).join('') || '<tr><td colspan="11" class="py-6 text-center text-slate-400">Sin KPIs.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderKanban() {
        return `
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div class="xl:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <form id="kanban-form" class="space-y-3">
                        <input id="kanban-sku" required placeholder="SKU" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <select id="kanban-origin" required class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"><option value="">Origen...</option>${state.assets.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>
                        <select id="kanban-dest" required class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"><option value="">Destino...</option>${state.assets.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>
                        <input id="kanban-demand" type="number" min="1" placeholder="Demanda diaria" required class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input id="kanban-lead" type="number" min="0.01" step="0.01" placeholder="Lead time (días)" required class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input id="kanban-safety" type="number" min="0" step="0.01" value="0.1" required class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input id="kanban-container" type="number" min="1" placeholder="Capacidad contenedor" required class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <button class="w-full bg-brand-orange text-white py-2 rounded-lg text-sm font-medium">Calcular</button>
                    </form>
                    ${state.lastKanban ? `<div class="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">Resultado: ${state.lastKanban.calculated_cards} tarjetas</div>` : ''}
                </div>
                <div class="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm overflow-auto">
                    <table class="w-full text-sm min-w-[820px]">
                        <thead class="text-slate-600"><tr><th class="text-left">SKU</th><th class="text-left">Origen</th><th class="text-left">Destino</th><th class="text-right">Tarjetas</th><th class="text-right">Acciones</th></tr></thead>
                        <tbody class="divide-y divide-slate-100">
                            ${state.kanbanLoops.map((loop) => `<tr><td class="py-2">${esc(loop.sku_code)}</td><td>${esc(loop.asset_origin_name || loop.asset_origin_id)}</td><td>${esc(loop.asset_dest_name || loop.asset_dest_id)}</td><td class="text-right font-semibold text-brand-orange">${loop.calculated_cards}</td><td class="text-right"><button data-loop-pdf="${loop.id}" class="text-xs px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 mr-1">PDF</button><button data-loop-del="${loop.id}" class="text-xs px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="5" class="py-6 text-center text-slate-400">Sin loops</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderVsm() {
        const density = state.vsm.edges.length ? state.vsm.edges.reduce((acc, edge) => acc + Number(edge.flow_density || 0), 0) / state.vsm.edges.length : 0;
        return `
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div class="xl:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <input id="vsm-name" value="${esc(state.vsm.name)}" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Nombre del canvas">
                    <select id="vsm-asset" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"><option value="">Activo (opcional)</option>${state.assets.map((a) => `<option value="${a.id}" ${a.id === state.vsm.asset_id ? 'selected' : ''}>${esc(a.name)} (${esc(a.type)})</option>`).join('')}</select>
                    <select id="vsm-canvas" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"><option value="">Seleccionar canvas...</option>${state.vsmCanvases.map((c) => `<option value="${c.id}" ${c.id === state.vsm.canvasId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
                    <div class="grid grid-cols-2 gap-2">
                        <button id="vsm-new" class="py-2 rounded border border-slate-300 text-slate-700 text-sm">Nuevo</button>
                        <button id="vsm-load" class="py-2 rounded border border-slate-300 text-slate-700 text-sm">Cargar</button>
                        <button id="vsm-save" class="py-2 rounded bg-brand-orange text-white text-sm">Guardar</button>
                        <button id="vsm-save-as" class="py-2 rounded border border-slate-300 text-slate-700 text-sm">Guardar como</button>
                        <button id="vsm-delete" class="col-span-2 py-2 rounded border border-red-200 text-red-700 text-sm">Eliminar canvas</button>
                        <button id="vsm-analyze" class="col-span-2 py-2 rounded border border-emerald-200 text-emerald-700 text-sm">Analizar rutas</button>
                        <button id="vsm-export" class="col-span-2 py-2 rounded border border-blue-200 text-blue-700 text-sm">Exportar PDF</button>
                    </div>
                    <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Densidad global: <span class="px-2 py-0.5 rounded-full ${densityBadge(density)}">${density.toFixed(2)}</span></div>
                </div>
                <div class="xl:col-span-2 space-y-4">
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <h3 class="text-sm font-semibold text-slate-800 mb-2">Nodos</h3>
                        <div class="flex gap-2 mb-3"><button id="vsm-add-process" class="px-3 py-1.5 rounded border border-indigo-200 text-indigo-700 text-xs">+ Proceso</button><button id="vsm-add-inventory" class="px-3 py-1.5 rounded border border-amber-200 text-amber-700 text-xs">+ Inventario</button></div>
                        <div class="max-h-44 overflow-auto space-y-1">${state.vsm.nodes.map((n) => `<div class="text-xs border border-slate-200 rounded px-2 py-1 flex items-center justify-between"><span>${esc(n.label)} · LT ${Number(n.lead_time || 0).toFixed(2)} · CT ${Number(n.cycle_time || 0).toFixed(2)}</span><button data-node-del="${n.id}" class="text-red-700">Eliminar</button></div>`).join('') || '<p class="text-xs text-slate-400">Sin nodos.</p>'}</div>
                    </div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <h3 class="text-sm font-semibold text-slate-800 mb-2">Enlaces</h3>
                        <form id="vsm-edge-form" class="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3"><select id="edge-from" class="px-2 py-1.5 rounded border border-slate-200 text-xs"><option value="">Desde...</option>${state.vsm.nodes.map((n) => `<option value="${n.id}">${esc(n.label)}</option>`).join('')}</select><select id="edge-to" class="px-2 py-1.5 rounded border border-slate-200 text-xs"><option value="">Hacia...</option>${state.vsm.nodes.map((n) => `<option value="${n.id}">${esc(n.label)}</option>`).join('')}</select><input id="edge-density" type="number" min="0" max="1" step="0.01" value="0" class="px-2 py-1.5 rounded border border-slate-200 text-xs" placeholder="Densidad"><button class="px-2 py-1.5 rounded bg-brand-orange text-white text-xs">Agregar</button></form>
                        <div class="max-h-44 overflow-auto space-y-1">${state.vsm.edges.map((e) => `<div class="text-xs border border-slate-200 rounded px-2 py-1 flex items-center justify-between"><span>${esc(e.from)} -> ${esc(e.to)} <span class="ml-2 px-2 py-0.5 rounded-full ${densityBadge(Number(e.flow_density || 0))}">${Number(e.flow_density || 0).toFixed(2)}</span></span><button data-edge-del="${e.id}" class="text-red-700">Eliminar</button></div>`).join('') || '<p class="text-xs text-slate-400">Sin enlaces.</p>'}</div>
                    </div>
                    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-xs text-slate-600">${state.vsm.analysis ? `Rutas: ${state.vsm.analysis.routes?.length || 0} | Ruta crítica: ${state.vsm.analysis.critical_route?.path?.join(' -> ') || 'N/A'}` : 'Sin análisis de rutas.'}</div>
                </div>
            </div>
        `;
    }

    function renderBody() {
        if (state.tab === 'audits') return renderAudits();
        if (state.tab === 'kpi-mc') return renderMcKpi();
        if (state.tab === 'kanban') return renderKanban();
        if (state.tab === 'vsm') return renderVsm();
        return renderActions();
    }    function applyAssetDefaults() {
        const contextSelect = container.querySelector('#exc-context-asset');
        if (contextSelect) contextSelect.value = state.selectedAssetId || '';
        if (!state.selectedAssetId) return;

        ['#action-asset', '#audit-asset', '#checklist-asset', '#kanban-origin', '#vsm-asset'].forEach((selector) => {
            const field = container.querySelector(selector);
            if (!field || field.value) return;
            const hasOption = Array.from(field.options || []).some((option) => option.value === state.selectedAssetId);
            if (hasOption) field.value = state.selectedAssetId;
        });
    }

    function render() {
        container.innerHTML = `
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-slate-900">Excelencia Operacional</h1>
                <p class="text-slate-500 text-sm mt-1">Acciones, auditorías, Kanban y VSM</p>
                <div class="flex flex-wrap items-center gap-2 mt-3">
                    <div class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                        <span class="text-xs font-medium text-slate-500">Activo:</span>
                        <select id="exc-context-asset" class="text-xs border border-slate-200 rounded px-2 py-1 bg-white min-w-[180px]">
                            <option value="">Todos</option>
                            ${state.assets.map((a) => `<option value="${a.id}">${esc(a.name)} (${esc(a.type)})</option>`).join('')}
                        </select>
                        <button id="exc-context-clear" type="button" class="text-[11px] px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">Limpiar</button>
                    </div>
                    ${state.selectedAssetId ? '<span class="text-xs text-sky-700 bg-sky-50 border border-sky-200 px-2 py-1 rounded-full">Filtro por activo aplicado</span>' : ''}
                </div>
            </div>
            ${renderTabs()}
            ${renderBody()}
        `;
        wireEvents();
        applyAssetDefaults();
    }

    async function workflowPayload(actionId) {
        const notes = container.querySelector(`[data-workflow-notes="${actionId}"]`)?.value?.trim() || null;
        const file = container.querySelector(`[data-workflow-photo="${actionId}"]`)?.files?.[0];
        return { notes, evidence_photo_data: file ? await fileToDataUrl(file) : null };
    }

    async function collectAuditScores(requirePhoto, threshold) {
        const rows = Array.from(container.querySelectorAll('[data-audit-row]'));
        const scores = [];
        for (const row of rows) {
            const score_value = Number(row.querySelector('[data-audit-score]')?.value || 3);
            const notes = row.querySelector('[data-audit-notes]')?.value?.trim() || null;
            const file = row.querySelector('[data-audit-photo]')?.files?.[0];
            const photo_data = file ? await fileToDataUrl(file) : null;
            if (requirePhoto && score_value <= threshold && !photo_data) {
                throw new Error(`La evidencia fotográfica es obligatoria para "${row.dataset.question}".`);
            }
            scores.push({
                category: row.dataset.category || 'General',
                question_text: row.dataset.question || 'Pregunta',
                score_value,
                checklist_item_code: row.dataset.code || null,
                photo_data,
                notes,
            });
        }
        return scores;
    }

    function wireEvents() {
        container.querySelectorAll('.exc-tab').forEach((btn) => {
            btn.addEventListener('click', async () => {
                state.tab = btn.dataset.tab;
                if (state.tab === 'vsm' && state.vsm.canvasId && !state.vsm.nodes.length) {
                    try { await loadVsmCanvas(state.vsm.canvasId); } catch { /* noop */ }
                }
                render();
            });
        });

        container.querySelector('#exc-context-asset')?.addEventListener('change', async (event) => {
            setSelectedAsset(event.target.value || '', 'excellence');
            if (!state.vsm.asset_id) {
                state.vsm.asset_id = state.selectedAssetId;
            }
            await refresh();
            render();
        });

        container.querySelector('#exc-context-clear')?.addEventListener('click', async () => {
            setSelectedAsset('', 'excellence');
            await refresh();
            render();
        });

        container.querySelector('#action-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = {
                asset_id: container.querySelector('#action-asset')?.value || null,
                source_document: container.querySelector('#action-source')?.value,
                description: container.querySelector('#action-desc')?.value,
                responsible: container.querySelector('#action-owner')?.value,
                due_date: container.querySelector('#action-due')?.value || null,
                status: 'Open',
            };
            if (payload.asset_id) {
                setSelectedAsset(payload.asset_id, 'excellence');
            }
            await improvementService.createAction(payload);
            await refresh();
            render();
        });

        container.querySelector('#actions-export-pdf')?.addEventListener('click', async () => {
            await downloadWithAuth('/ci/actions/export/pdf', 'takta_action_board.pdf');
        });

        container.querySelectorAll('[data-action-id][data-action-status]').forEach((btn) => btn.addEventListener('click', async () => {
            await improvementService.updateAction(btn.dataset.actionId, { status: btn.dataset.actionStatus });
            await refresh();
            render();
        }));
        container.querySelectorAll('[data-workflow-request]').forEach((btn) => btn.addEventListener('click', async () => {
            await improvementService.requestCloseAction(btn.dataset.workflowRequest, await workflowPayload(btn.dataset.workflowRequest));
            await refresh();
            render();
        }));
        container.querySelectorAll('[data-workflow-approve]').forEach((btn) => btn.addEventListener('click', async () => {
            await improvementService.approveCloseAction(btn.dataset.workflowApprove, await workflowPayload(btn.dataset.workflowApprove));
            await refresh();
            render();
        }));
        container.querySelectorAll('[data-workflow-verify]').forEach((btn) => btn.addEventListener('click', async () => {
            await improvementService.verifyCloseAction(btn.dataset.workflowVerify, await workflowPayload(btn.dataset.workflowVerify));
            await refresh();
            render();
        }));
        container.querySelectorAll('[data-action-del]').forEach((btn) => btn.addEventListener('click', async () => {
            if (!confirm('¿Eliminar acción?')) return;
            await improvementService.deleteAction(btn.dataset.actionDel);
            await refresh();
            render();
        }));

        container.querySelector('#audit-template')?.addEventListener('change', (event) => {
            state.selectedChecklistId = event.target.value || '';
            render();
        });
        container.querySelector('#checklist-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = container.querySelector('#checklist-name')?.value?.trim();
            const items = parseChecklistLines(container.querySelector('#checklist-items')?.value || '');
            if (!name || !items.length) {
                uiFeedback.warning('Nombre e items de checklist son obligatorios.');
                return;
            }
            const checklistAssetId = container.querySelector('#checklist-asset')?.value || null;
            if (checklistAssetId) {
                setSelectedAsset(checklistAssetId, 'excellence');
            }
            await improvementService.createAuditChecklist({
                name,
                asset_id: checklistAssetId,
                type: '5S',
                require_photo: !!container.querySelector('#checklist-photo-required')?.checked,
                items,
                is_active: true,
            });
            await refresh();
            render();
        });
        container.querySelectorAll('[data-checklist-pick]').forEach((btn) => btn.addEventListener('click', () => {
            state.selectedChecklistId = btn.dataset.checklistPick;
            render();
        }));
        container.querySelectorAll('[data-checklist-del]').forEach((btn) => btn.addEventListener('click', async () => {
            if (!confirm('¿Eliminar template de checklist?')) return;
            await improvementService.deleteAuditChecklist(btn.dataset.checklistDel);
            if (state.selectedChecklistId === btn.dataset.checklistDel) state.selectedChecklistId = '';
            await refresh();
            render();
        }));
        container.querySelector('#audit-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const threshold = Number(container.querySelector('#audit-threshold')?.value || 2);
            const checklist = selectedChecklist();
            const scores = await collectAuditScores(!!checklist?.require_photo, threshold);
            const auditAssetId = container.querySelector('#audit-asset')?.value;
            setSelectedAsset(auditAssetId || '', 'excellence');
            await improvementService.createAdvancedAudit({
                asset_id: auditAssetId,
                type: '5S',
                auditor: container.querySelector('#audit-auditor')?.value,
                checklist_template_id: checklist?.id || null,
                scores,
                auto_create_actions: true,
                action_threshold: threshold,
                action_responsible: container.querySelector('#audit-owner')?.value || null,
            });
            await refresh();
            render();
        });
        container.querySelectorAll('[data-audit-del]').forEach((btn) => btn.addEventListener('click', async () => {
            if (!confirm('¿Eliminar auditoría?')) return;
            await improvementService.deleteAudit(btn.dataset.auditDel);
            await refresh();
            render();
        }));

        container.querySelector('#kanban-form')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = {
                sku_code: container.querySelector('#kanban-sku')?.value,
                asset_origin_id: container.querySelector('#kanban-origin')?.value,
                asset_dest_id: container.querySelector('#kanban-dest')?.value,
                daily_demand: Number(container.querySelector('#kanban-demand')?.value),
                lead_time_days: Number(container.querySelector('#kanban-lead')?.value),
                safety_stock_pct: Number(container.querySelector('#kanban-safety')?.value),
                container_capacity: Number(container.querySelector('#kanban-container')?.value),
            };
            if (payload.asset_origin_id || payload.asset_dest_id) {
                setSelectedAsset(payload.asset_origin_id || payload.asset_dest_id, 'excellence');
            }
            state.lastKanban = await improvementService.calculateKanban(payload);
            await refresh();
            render();
        });
        container.querySelectorAll('[data-loop-pdf]').forEach((btn) => btn.addEventListener('click', async () => {
            await downloadWithAuth(`/logistics/kanban/loops/${btn.dataset.loopPdf}/export/pdf`, `takta_kanban_${btn.dataset.loopPdf}.pdf`);
        }));
        container.querySelectorAll('[data-loop-del]').forEach((btn) => btn.addEventListener('click', async () => {
            if (!confirm('¿Eliminar loop Kanban?')) return;
            await improvementService.deleteKanbanLoop(btn.dataset.loopDel);
            await refresh();
            render();
        }));

        container.querySelector('#kpi-mc-period')?.addEventListener('change', async (event) => {
            state.mcKpiPeriod = event.target.value || currentPeriodKey();
            await refresh();
            render();
        });
        container.querySelector('#kpi-mc-trend-months')?.addEventListener('change', async (event) => {
            const months = Number(event.target.value || 6);
            state.mcKpiTrendMonths = Number.isFinite(months) ? months : 6;
            await refresh();
            render();
        });
        container.querySelector('#kpi-mc-seed')?.addEventListener('click', async () => {
            await improvementService.seedMcKpiCatalog();
            await refresh();
            render();
        });
        container.querySelector('#kpi-mc-close-pending')?.addEventListener('click', async () => {
            await improvementService.closePendingMcKpiWeights();
            await refresh();
            render();
        });
        container.querySelectorAll('[data-kpi-save]').forEach((btn) => btn.addEventListener('click', async () => {
            const kpiId = btn.dataset.kpiSave;
            if (!kpiId) return;
            const targetValue = parseNumberOrNull(container.querySelector(`[data-kpi-target="${kpiId}"]`)?.value);
            const actualValue = parseNumberOrNull(container.querySelector(`[data-kpi-actual="${kpiId}"]`)?.value);
            const complianceValue = parseNumberOrNull(container.querySelector(`[data-kpi-compliance="${kpiId}"]`)?.value);
            await improvementService.upsertMcKpiMeasurement({
                kpi_definition_id: kpiId,
                period: state.mcKpiPeriod,
                target_value: targetValue,
                actual_value: actualValue,
                compliance_pct: complianceValue,
            });
            await refresh();
            render();
        }));
        container.querySelectorAll('[data-kpi-del]').forEach((btn) => btn.addEventListener('click', async () => {
            const kpiId = btn.dataset.kpiDel;
            if (!kpiId) return;
            if (!confirm('¿Eliminar medición del KPI para el periodo actual?')) return;
            const rows = await improvementService.getMcKpiMeasurements(`period=${encodeURIComponent(state.mcKpiPeriod)}`);
            const row = rows.find((item) => item.kpi_definition_id === kpiId);
            if (!row) return;
            await improvementService.deleteMcKpiMeasurement(row.id);
            await refresh();
            render();
        }));
        container.querySelectorAll('[data-kpi-weight-save]').forEach((btn) => btn.addEventListener('click', async () => {
            const kpiId = btn.dataset.kpiWeightSave;
            if (!kpiId) return;
            const weightValue = parseNumberOrNull(container.querySelector(`[data-kpi-weight-input="${kpiId}"]`)?.value);
            if (weightValue === null) return;
            await improvementService.updateMcKpiDefinition(kpiId, {
                kpi_weight_pct: weightValue,
                kpi_weight_defined: true,
            });
            await refresh();
            render();
        }));
        container.querySelectorAll('[data-kpi-workflow-request]').forEach((btn) => btn.addEventListener('click', async () => {
            await improvementService.requestCloseAction(btn.dataset.kpiWorkflowRequest, {});
            await refresh();
            render();
        }));
        container.querySelectorAll('[data-kpi-workflow-approve]').forEach((btn) => btn.addEventListener('click', async () => {
            if (btn.hasAttribute('disabled')) return;
            await improvementService.approveCloseAction(btn.dataset.kpiWorkflowApprove, {});
            await refresh();
            render();
        }));
        container.querySelectorAll('[data-kpi-workflow-verify]').forEach((btn) => btn.addEventListener('click', async () => {
            if (btn.hasAttribute('disabled')) return;
            await improvementService.verifyCloseAction(btn.dataset.kpiWorkflowVerify, {});
            await refresh();
            render();
        }));
        container.querySelectorAll('[data-kpi-trace-open-action]').forEach((btn) => btn.addEventListener('click', async () => {
            if (state.selectedAssetId) {
                setSelectedAsset('', 'excellence');
                await refresh();
            }
            state.tab = 'actions';
            state.focusActionId = btn.dataset.kpiTraceOpenAction;
            render();
            setTimeout(() => {
                const row = container.querySelector(`[data-action-row="${state.focusActionId}"]`);
                if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 0);
        }));

        if (state.tab !== 'vsm') return;

        container.querySelector('#vsm-new')?.addEventListener('click', () => { resetVsmCanvas(); render(); });
        container.querySelector('#vsm-load')?.addEventListener('click', async () => {
            const canvasId = container.querySelector('#vsm-canvas')?.value;
            if (!canvasId) return;
            await loadVsmCanvas(canvasId);
            render();
        });
        container.querySelector('#vsm-asset')?.addEventListener('change', (event) => {
            state.vsm.asset_id = event.target.value || '';
            if (state.vsm.asset_id) {
                setSelectedAsset(state.vsm.asset_id, 'excellence');
            }
        });
        container.querySelector('#vsm-save')?.addEventListener('click', async () => {
            const payload = {
                name: container.querySelector('#vsm-name')?.value?.trim() || 'VSM Canvas',
                asset_id: container.querySelector('#vsm-asset')?.value || null,
                nodes: state.vsm.nodes,
                edges: state.vsm.edges,
                constraints: {},
            };
            state.vsm.asset_id = payload.asset_id || '';
            if (payload.asset_id) {
                setSelectedAsset(payload.asset_id, 'excellence');
            }
            if (state.vsm.canvasId) await improvementService.updateVsmCanvas(state.vsm.canvasId, payload);
            else state.vsm.canvasId = (await improvementService.createVsmCanvas(payload)).id;
            await refresh();
            render();
        });
        container.querySelector('#vsm-save-as')?.addEventListener('click', async () => {
            const duplicatedAssetId = container.querySelector('#vsm-asset')?.value || null;
            if (duplicatedAssetId) {
                setSelectedAsset(duplicatedAssetId, 'excellence');
                state.vsm.asset_id = duplicatedAssetId;
            }
            state.vsm.canvasId = (await improvementService.createVsmCanvas({
                name: `${container.querySelector('#vsm-name')?.value?.trim() || 'VSM Canvas'} (copia)`,
                asset_id: duplicatedAssetId,
                nodes: state.vsm.nodes,
                edges: state.vsm.edges,
                constraints: {},
            })).id;
            await refresh();
            render();
        });
        container.querySelector('#vsm-delete')?.addEventListener('click', async () => {
            if (!state.vsm.canvasId) return;
            if (!confirm('¿Eliminar canvas VSM actual?')) return;
            await improvementService.deleteVsmCanvas(state.vsm.canvasId);
            resetVsmCanvas();
            await refresh();
            render();
        });
        container.querySelector('#vsm-analyze')?.addEventListener('click', async () => {
            if (!state.vsm.canvasId) return;
            state.vsm.analysis = await improvementService.analyzeVsmRoutes(state.vsm.canvasId);
            render();
        });
        container.querySelector('#vsm-export')?.addEventListener('click', async () => {
            if (!state.vsm.canvasId) return;
            await downloadWithAuth(`/logistics/vsm/canvases/${state.vsm.canvasId}/export/pdf`, `takta_vsm_${state.vsm.canvasId}.pdf`);
        });
        container.querySelector('#vsm-add-process')?.addEventListener('click', () => {
            state.vsm.nodes.push({ id: uid('node'), type: 'process', label: `Proceso ${state.vsm.nodes.length + 1}`, lead_time: 1, cycle_time: 1, capacity: 0 });
            render();
        });
        container.querySelector('#vsm-add-inventory')?.addEventListener('click', () => {
            state.vsm.nodes.push({ id: uid('node'), type: 'inventory', label: `Inventario ${state.vsm.nodes.length + 1}`, lead_time: 0.5, cycle_time: 0, capacity: 0 });
            render();
        });
        container.querySelectorAll('[data-node-del]').forEach((btn) => btn.addEventListener('click', () => {
            const id = btn.dataset.nodeDel;
            state.vsm.nodes = state.vsm.nodes.filter((node) => node.id !== id);
            state.vsm.edges = state.vsm.edges.filter((edge) => edge.from !== id && edge.to !== id);
            render();
        }));
        container.querySelector('#vsm-edge-form')?.addEventListener('submit', (event) => {
            event.preventDefault();
            const from = container.querySelector('#edge-from')?.value;
            const to = container.querySelector('#edge-to')?.value;
            const flow_density = Number(container.querySelector('#edge-density')?.value || 0);
            if (!from || !to || from === to) return;
            if (Number.isNaN(flow_density) || flow_density < 0 || flow_density > 1) return;
            state.vsm.edges.push({ id: uid('edge'), from, to, flow_density });
            render();
        });
        container.querySelectorAll('[data-edge-del]').forEach((btn) => btn.addEventListener('click', () => {
            state.vsm.edges = state.vsm.edges.filter((edge) => edge.id !== btn.dataset.edgeDel);
            render();
        }));
    }

    try {
        await refresh();
        render();
    } catch (error) {
        container.innerHTML = `<div class="p-6 bg-red-50 text-red-600 rounded-lg border border-red-100">Error cargando excelencia operacional: ${esc(error.message)}</div>`;
    }

    return container;
}

export default ExcellencePage;


















