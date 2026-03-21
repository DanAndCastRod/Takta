import ApiClient from '../services/api.client.js';
import { PlantEditor } from '../components/plant-editor/PlantEditor.js';
import { improvementService } from '../services/improvement.service.js';
import { qualityService } from '../services/quality.service.js';
import { meetingService } from '../services/meeting.service.js';
import {
    getHashContext,
    getModuleContext,
    setModuleContext,
    withModuleContext,
} from '../services/module-context.service.js';

function esc(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function buildQuery(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        const normalized = String(value).trim();
        if (!normalized) return;
        query.set(key, normalized);
    });
    return query.toString();
}

function isClosedStatus(status = '') {
    const normalized = String(status || '').trim().toLowerCase();
    return [
        'closed',
        'verified',
        'approved',
        'done',
        'completed',
        'cerrado',
        'verificado',
        'aprobado',
    ].includes(normalized);
}

function toneByThreshold(value, green = 95, amber = 80) {
    const metric = Number(value || 0);
    if (metric >= green) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (metric >= amber) return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-rose-50 border-rose-200 text-rose-700';
}

function overdueCount(rows = [], dateKey = 'due_date') {
    const today = new Date().toISOString().slice(0, 10);
    return rows.filter((row) => {
        const value = String(row?.[dateKey] || '').slice(0, 10);
        if (!value) return false;
        if (isClosedStatus(row?.status)) return false;
        return value < today;
    }).length;
}

function intOrZero(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function pct(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return '0%';
    return `${parsed.toFixed(1)}%`;
}

function renderTraceabilityPanel(state) {
    const context = {
        asset_id: state.selectedAssetId || null,
        product_reference_id: null,
        process_standard_id: null,
    };
    const quickLinks = [
        {
            label: 'Excelencia KPI',
            href: withModuleContext('#/excellence?tab=kpi-mc', context),
            className: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
        },
        {
            label: 'Muestreo Peso',
            href: withModuleContext('#/weight-sampling', context),
            className: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
        },
        {
            label: 'Actas IP',
            href: withModuleContext('#/meetings', context),
            className: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
        },
    ];

    const cards = state.traceability
        ? [
            {
                title: 'KPI MC Ponderado',
                value: pct(state.traceability.kpiWeightedPct),
                hint: `Cobertura ${pct(state.traceability.kpiCoveragePct)}`,
                tone: toneByThreshold(state.traceability.kpiWeightedPct, 92, 85),
            },
            {
                title: 'KPI en Rojo',
                value: String(state.traceability.kpiRedItems),
                hint: `Período ${esc(state.traceability.kpiPeriod || '-')}`,
                tone: state.traceability.kpiRedItems > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700',
            },
            {
                title: 'Acciones Abiertas',
                value: String(state.traceability.actionsOpen),
                hint: `${state.traceability.actionsOverdue} vencidas`,
                tone: state.traceability.actionsOverdue > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700',
            },
            {
                title: 'NC Abiertas',
                value: String(state.traceability.nonConformitiesOpen),
                hint: `${state.traceability.nonConformitiesCritical} críticas`,
                tone: state.traceability.nonConformitiesCritical > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700',
            },
            {
                title: 'CAPA Abiertas',
                value: String(state.traceability.capaOpen),
                hint: `${state.traceability.capaOverdue} vencidas`,
                tone: state.traceability.capaOverdue > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700',
            },
            {
                title: 'Actas Abiertas',
                value: String(state.traceability.meetingsOpen),
                hint: `${state.traceability.commitmentsOpen} compromisos abiertos`,
                tone: state.traceability.meetingsOpen > 0
                    ? 'bg-sky-50 border-sky-200 text-sky-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700',
            },
        ]
        : [];

    return `
        <section class="tk-card p-4 md:p-5 space-y-4">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div>
                    <h1 class="text-xl md:text-2xl font-bold text-slate-900">Diagram Studio</h1>
                    <p class="text-sm text-slate-500 mt-1">
                        Editor SVG/diagramas con trazabilidad KPI -> acciones -> NC/CAPA -> actas.
                    </p>
                    <p class="text-xs text-slate-500 mt-1">
                        Contexto activo: <span class="font-semibold text-slate-700">${esc(
                            state.selectedAssetName || (state.selectedAssetId ? 'Activo sin nombre' : 'Global'),
                        )}</span>
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <select id="traceability-asset-select" class="tk-select text-sm px-3 py-2 min-w-[240px]">
                        <option value="">Vista global (todos los activos)</option>
                        ${state.assets
                            .map(
                                (asset) => `<option value="${esc(asset.id)}" ${String(asset.id) === String(state.selectedAssetId) ? 'selected' : ''}>${esc(asset.name)} (${esc(asset.type || 'N/A')})</option>`,
                            )
                            .join('')}
                    </select>
                    <button id="traceability-refresh" type="button" class="tk-btn-secondary px-3 py-2 text-sm">Actualizar</button>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                ${quickLinks
                    .map(
                        (item) => `<a href="${esc(item.href)}" class="px-2.5 py-1.5 text-xs rounded border ${item.className}">${esc(item.label)}</a>`,
                    )
                    .join('')}
            </div>

            ${state.loading
                ? '<div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">Cargando trazabilidad cruzada...</div>'
                : ''}
            ${state.error
                ? `<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${esc(state.error)}</div>`
                : ''}

            ${cards.length
                ? `
                <div class="grid grid-cols-2 xl:grid-cols-6 gap-2.5">
                    ${cards
                        .map(
                            (card) => `
                            <article class="rounded-lg border px-3 py-2 ${card.tone}">
                                <p class="text-[11px] uppercase tracking-wide font-semibold opacity-90">${esc(card.title)}</p>
                                <p class="text-lg font-bold mt-1">${esc(card.value)}</p>
                                <p class="text-[11px] mt-1 opacity-90">${esc(card.hint)}</p>
                            </article>
                        `,
                        )
                        .join('')}
                </div>
            `
                : '<div class="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">Sin datos aún para este contexto. Registra KPI, acciones, NC/CAPA o actas para visualizar la trazabilidad.</div>'}
        </section>
    `;
}

async function loadTraceability(selectedAssetId = '') {
    const scopedQuery = buildQuery({ asset_id: selectedAssetId || null });

    const [kpiRes, actionsRes, ncRes, capaRes, meetingsRes] = await Promise.allSettled([
        improvementService.getMcKpiScorecard(),
        improvementService.getActions(scopedQuery),
        qualityService.getNonConformities(scopedQuery),
        qualityService.getCapaDashboard(),
        meetingService.dashboard(),
    ]);

    const kpi = kpiRes.status === 'fulfilled' ? kpiRes.value : null;
    const actions = actionsRes.status === 'fulfilled' ? actionsRes.value : [];
    const nonConformities = ncRes.status === 'fulfilled' ? ncRes.value : [];
    const capaDashboard = capaRes.status === 'fulfilled' ? capaRes.value : null;
    const meetings = meetingsRes.status === 'fulfilled' ? meetingsRes.value : null;

    const openActions = actions.filter((item) => !isClosedStatus(item.status));
    const openNc = nonConformities.filter((item) => !isClosedStatus(item.status));

    const capaFromNc = openNc.reduce(
        (acc, row) => acc + intOrZero(row.open_capa_actions_count),
        0,
    );

    const capaOpen = selectedAssetId
        ? capaFromNc
        : intOrZero(capaDashboard?.capa_actions_open);

    return {
        kpiPeriod: kpi?.period || '-',
        kpiWeightedPct: Number(kpi?.totals?.weighted_kpi_result_pct || 0),
        kpiCoveragePct: Number(kpi?.totals?.completion_rate_pct || 0),
        kpiRedItems: intOrZero(kpi?.status_counts?.red),
        actionsOpen: openActions.length,
        actionsOverdue: overdueCount(openActions, 'due_date'),
        nonConformitiesOpen: openNc.length,
        nonConformitiesCritical: openNc.filter((item) => String(item.severity || '').toLowerCase() === 'critical').length,
        capaOpen,
        capaOverdue: intOrZero(capaDashboard?.capa_actions_overdue),
        meetingsOpen: intOrZero(meetings?.meetings_open),
        commitmentsOpen: intOrZero(meetings?.commitments_open),
    };
}

async function PlantEditorPage() {
    const page = document.createElement('div');
    page.className = 'h-full flex flex-col gap-4 p-4 md:p-6 max-w-[1600px] mx-auto';

    const hashContext = getHashContext();
    const storedContext = getModuleContext();
    const initialAssetId = hashContext.asset_id || storedContext.asset_id || '';

    const state = {
        assets: [],
        selectedAssetId: initialAssetId,
        selectedAssetName: '',
        traceability: null,
        loading: false,
        error: '',
        requestId: 0,
    };

    if (initialAssetId) {
        setModuleContext({ asset_id: initialAssetId }, 'plant-editor');
    }

    page.innerHTML = `
        <div id="plant-traceability-panel"></div>
        <section class="tk-card p-2 md:p-3 flex-1 min-h-[640px]">
            <div id="plant-editor-root" class="h-[68vh] min-h-[620px] w-full rounded-lg overflow-hidden"></div>
        </section>
    `;

    const panelHost = page.querySelector('#plant-traceability-panel');
    const editor = new PlantEditor('plant-editor-root', {
        contextAssetId: state.selectedAssetId || null,
    });
    let cleanedUp = false;

    const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        window.removeEventListener('context:changed', onContextChanged);
        window.removeEventListener('hashchange', onRouteChange);
        editor.destroy?.();
    };

    const mountEditor = () => {
        if (cleanedUp) return;
        const host = document.getElementById('plant-editor-root');
        if (!host) {
            setTimeout(mountEditor, 16);
            return;
        }
        editor.render();
    };
    setTimeout(mountEditor, 0);

    const renderPanel = () => {
        state.selectedAssetName = state.assets.find((asset) => String(asset.id) === String(state.selectedAssetId))?.name || '';
        if (!panelHost) return;
        panelHost.innerHTML = renderTraceabilityPanel(state);

        panelHost.querySelector('#traceability-asset-select')?.addEventListener('change', (event) => {
            const nextAssetId = String(event.target?.value || '').trim();
            state.selectedAssetId = nextAssetId;
            setModuleContext({ asset_id: nextAssetId || null }, 'plant-editor');
            editor.setContextAsset(nextAssetId || null);
            void refreshTraceability();
        });

        panelHost.querySelector('#traceability-refresh')?.addEventListener('click', () => {
            void refreshTraceability();
        });
    };

    const refreshTraceability = async () => {
        const requestId = ++state.requestId;
        state.loading = true;
        state.error = '';
        renderPanel();

        try {
            state.traceability = await loadTraceability(state.selectedAssetId);
        } catch (error) {
            console.error('Traceability panel error', error);
            state.error = 'No se pudo cargar la trazabilidad del diagrama.';
        } finally {
            if (requestId !== state.requestId) return;
            state.loading = false;
            renderPanel();
        }
    };

    const loadAssets = async () => {
        try {
            const rows = await ApiClient.get('/assets');
            state.assets = Array.isArray(rows) ? rows : [];
            if (state.selectedAssetId && !state.assets.some((asset) => String(asset.id) === String(state.selectedAssetId))) {
                state.selectedAssetId = '';
                setModuleContext({ asset_id: null }, 'plant-editor');
                editor.setContextAsset(null);
            }
        } catch (error) {
            console.error('Asset load error on Diagram Studio', error);
            state.assets = [];
            state.error = 'No se pudo cargar la lista de activos para contexto.';
        }
    };

    const onContextChanged = (event) => {
        const assetId = String(event?.detail?.context?.asset_id || '').trim();
        if (assetId === String(state.selectedAssetId || '')) return;
        state.selectedAssetId = assetId;
        editor.setContextAsset(assetId || null);
        void refreshTraceability();
    };

    const onRouteChange = () => {
        const path = (window.location.hash || '#/').split('?')[0];
        if (path !== '#/plant-editor') {
            cleanup();
        }
    };

    window.addEventListener('context:changed', onContextChanged);
    window.addEventListener('hashchange', onRouteChange);

    renderPanel();
    await loadAssets();
    renderPanel();
    await refreshTraceability();

    return page;
}

export default PlantEditorPage;
