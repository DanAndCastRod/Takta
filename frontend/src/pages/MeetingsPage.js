import ApiClient from '../services/api.client.js';
import { meetingService } from '../services/meeting.service.js';
import { getHashContext, getModuleContext, setModuleContext } from '../services/module-context.service.js';
import uiFeedback from '../services/ui-feedback.service.js';
function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function blankAgenda() {
    return { title: '', objective: '', decisions: '' };
}

function blankKpi() {
    return { objective: '', weight_pct: '', target_value: '', current_value: '', unit: '', owner: '' };
}

function blankFocus() {
    return { focus: '', responsible: '', due_date: '' };
}

function blankCommitment() {
    return { description: '', responsible: '', due_date: '', status: 'Open', asset_id: '' };
}

function createDraft() {
    return {
        asset_id: '',
        title: '',
        meeting_date: todayISO(),
        start_time: '',
        end_time: '',
        location: '',
        objective: '',
        scope: '',
        out_of_scope: '',
        risks: '',
        key_decisions: '',
        notes: '',
        next_meeting_date: '',
        status: 'Draft',
        participants_text: '',
        import_text: '',
        agenda: [blankAgenda()],
        kpis: [blankKpi()],
        focuses: [blankFocus()],
        commitments: [blankCommitment()],
    };
}

function participantsToText(participants) {
    return (participants || [])
        .map((p) => [p?.name || '', p?.role || '', p?.attendance || ''].join(' | ').trim())
        .join('\n');
}

function textToParticipants(text) {
    return String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const chunks = line.split('|').map((chunk) => chunk.trim());
            return {
                name: chunks[0] || 'Sin nombre',
                role: chunks[1] || null,
                attendance: chunks[2] || 'Asistente',
            };
        });
}

function normalizeDraftFromMeeting(meeting) {
    return {
        asset_id: meeting.asset_id || '',
        title: meeting.title || '',
        meeting_date: (meeting.meeting_date || '').slice(0, 10),
        start_time: meeting.start_time || '',
        end_time: meeting.end_time || '',
        location: meeting.location || '',
        objective: meeting.objective || '',
        scope: meeting.scope || '',
        out_of_scope: meeting.out_of_scope || '',
        risks: meeting.risks || '',
        key_decisions: meeting.key_decisions || '',
        notes: meeting.notes || '',
        next_meeting_date: (meeting.next_meeting_date || '').slice(0, 10),
        status: meeting.status || 'Draft',
        participants_text: participantsToText(meeting.participants || []),
        import_text: '',
        agenda: (meeting.agenda || []).length
            ? meeting.agenda.map((item) => ({
                title: item.title || '',
                objective: item.objective || '',
                decisions: (item.decisions || []).join('; '),
            }))
            : [blankAgenda()],
        kpis: (meeting.kpis || []).length
            ? meeting.kpis.map((item) => ({
                objective: item.objective || '',
                weight_pct: item.weight_pct ?? '',
                target_value: item.target_value ?? '',
                current_value: item.current_value ?? '',
                unit: item.unit || '',
                owner: item.owner || '',
            }))
            : [blankKpi()],
        focuses: (meeting.focuses || []).length
            ? meeting.focuses.map((item) => ({
                focus: item.focus || '',
                responsible: item.responsible || '',
                due_date: (item.due_date || '').slice(0, 10),
            }))
            : [blankFocus()],
        commitments: (meeting.commitments || []).length
            ? meeting.commitments.map((item) => ({
                description: item.description || '',
                responsible: item.responsible || '',
                due_date: (item.due_date || '').slice(0, 10),
                status: item.status || 'Open',
                asset_id: item.asset_id || '',
            }))
            : [blankCommitment()],
    };
}

function parseNum(value) {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

async function MeetingsPage() {
    const container = document.createElement('div');
    container.className = 'p-4 md:p-6 max-w-7xl mx-auto space-y-5';
    const hashContext = getHashContext();
    const storedContext = getModuleContext();
    const initialAssetId = hashContext.asset_id || storedContext.asset_id || '';

    const state = {
        assets: [],
        meetings: [],
        dashboard: null,
        qualityIssues: [],
        selectedId: null,
        comparison: null,
        notice: null,
        selectedAssetId: initialAssetId,
        draft: createDraft(),
    };

    if (initialAssetId) {
        state.draft.asset_id = initialAssetId;
        setModuleContext({ asset_id: initialAssetId }, 'meetings');
    }

    function setSelectedAsset(assetId, source = 'meetings') {
        const normalized = assetId || '';
        state.selectedAssetId = normalized;
        setModuleContext({ asset_id: normalized || null }, source);
    }

    async function refresh() {
        const meetingQuery = state.selectedAssetId
            ? `asset_id=${encodeURIComponent(state.selectedAssetId)}`
            : '';
        const qualityQuery = state.selectedAssetId
            ? `asset_id=${encodeURIComponent(state.selectedAssetId)}`
            : '';
        const [assetsRes, meetingsRes, dashboardRes, qualityRes] = await Promise.allSettled([
            ApiClient.get('/assets'),
            meetingService.list(meetingQuery),
            meetingService.dashboard(),
            meetingService.qualityIssues(qualityQuery),
        ]);
        state.assets = assetsRes.status === 'fulfilled' ? assetsRes.value : [];
        if (state.selectedAssetId && !state.assets.some((asset) => asset.id === state.selectedAssetId)) {
            setSelectedAsset('', 'meetings');
        }
        state.meetings = meetingsRes.status === 'fulfilled' ? meetingsRes.value : [];
        state.dashboard = dashboardRes.status === 'fulfilled' ? dashboardRes.value : null;
        state.qualityIssues = qualityRes.status === 'fulfilled' ? qualityRes.value : [];
    }

    function addRow(section) {
        if (section === 'agenda') state.draft.agenda.push(blankAgenda());
        if (section === 'kpis') state.draft.kpis.push(blankKpi());
        if (section === 'focuses') state.draft.focuses.push(blankFocus());
        if (section === 'commitments') state.draft.commitments.push(blankCommitment());
        render();
    }

    function removeRow(section, index) {
        const rows = state.draft[section];
        if (!Array.isArray(rows) || rows.length <= 1) return;
        rows.splice(index, 1);
        render();
    }

    function renderNotice() {
        if (!state.notice) return '';
        const tone = state.notice.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-green-200 bg-green-50 text-green-700';
        return `<div class="rounded-lg border px-3 py-2 text-sm ${tone}">${esc(state.notice.text)}</div>`;
    }

    function setNotice(type, text) {
        state.notice = { type, text };
        if (type === 'error') uiFeedback.error(text);
        else uiFeedback.success(text);
    }

    function renderCards() {
        const d = state.dashboard || {};
        const signed = (value, suffix = '') => {
            if (value == null || Number.isNaN(Number(value))) return '-';
            const number = Number(value);
            const prefix = number > 0 ? '+' : '';
            return `${prefix}${number}${suffix}`;
        };
        const alertTone = (() => {
            const level = String(d.kpi_mc_trend_alert_level || 'none');
            if (level === 'critical') return 'border-red-200 bg-red-50 text-red-700';
            if (level === 'risk') return 'border-amber-200 bg-amber-50 text-amber-700';
            if (level === 'watch') return 'border-sky-200 bg-sky-50 text-sky-700';
            if (level === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
            return 'border-slate-200 bg-slate-50 text-slate-600';
        })();
        const cards = [
            ['Actas 30d', d.meetings_last_30d ?? '-'],
            ['Actas abiertas', d.meetings_open ?? '-'],
            ['Compromisos abiertos', d.commitments_open ?? '-'],
            ['Compromisos vencidos', d.commitments_overdue ?? '-'],
            ['Compromisos cerrados', d.commitments_closed ?? '-'],
            ['Acciones enlazadas', d.linked_actions ?? '-'],
            ['NC abiertas', d.quality_non_conformities_open ?? '-'],
            ['NC criticas', d.quality_non_conformities_critical ?? '-'],
            ['CAPA abiertas', d.quality_capa_open ?? '-'],
            ['CAPA vencidas', d.quality_capa_overdue ?? '-'],
            ['KPI MC período', d.kpi_mc_period ?? '-'],
            ['KPI MC cobertura', d.kpi_mc_completion_rate_pct != null ? `${d.kpi_mc_completion_rate_pct}%` : '-'],
            ['KPI MC ponderado', d.kpi_mc_weighted_kpi_result_pct != null ? `${d.kpi_mc_weighted_kpi_result_pct}%` : '-'],
            ['KPI MC rojos', d.kpi_mc_red_items ?? '-'],
            ['KPI MC período previo', d.kpi_mc_previous_period ?? '-'],
            ['Delta KPI MC', signed(d.kpi_mc_weighted_kpi_result_delta_pct, ' pts')],
            ['Delta cobertura', signed(d.kpi_mc_completion_rate_delta_pct, ' pts')],
            ['Delta rojos', signed(d.kpi_mc_red_items_delta)],
            ['Meta KPI MC', d.kpi_mc_target_pct != null ? `${d.kpi_mc_target_pct}%` : '-'],
            ['Brecha a meta', d.kpi_mc_gap_to_target_pct != null ? `${d.kpi_mc_gap_to_target_pct} pts` : '-'],
        ];
        return `
            <div class="md:col-span-3 xl:col-span-6 rounded-xl border px-3 py-2 ${alertTone}">
                <p class="text-[11px] uppercase tracking-wide">Alerta tendencia KPI MC</p>
                <p class="text-sm font-semibold mt-1">${esc(d.kpi_mc_trend_alert_message || 'Sin alerta de tendencia.')}</p>
                <p class="text-xs mt-1">${esc(d.kpi_mc_trend_recommended_action || '')}</p>
            </div>
            ${cards.map(([label, value]) => `
            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-slate-500">${label}</p>
                <p class="text-xl font-bold text-slate-800">${value}</p>
            </div>
        `).join('')}
        `;
    }

    function renderOptions(items, selectedId = '') {
        return items
            .map((item) => `<option value="${item.id}" ${String(item.id) === String(selectedId) ? 'selected' : ''}>${esc(item.name)} (${esc(item.type)})</option>`)
            .join('');
    }

    function renderRows(section, rows, fields) {
        return rows.map((row, index) => `
            <tr class="border-b border-slate-100">
                ${fields.map((field) => {
                    const value = row[field.key] ?? '';
                    if (field.type === 'select') {
                        return `<td class="px-2 py-1"><select data-section="${section}" data-index="${index}" data-field="${field.key}" class="w-full px-2 py-1 rounded border border-slate-200 text-xs">${field.options(value)}</select></td>`;
                    }
                    return `<td class="px-2 py-1"><input data-section="${section}" data-index="${index}" data-field="${field.key}" type="${field.type || 'text'}" value="${esc(value)}" class="w-full px-2 py-1 rounded border border-slate-200 text-xs" /></td>`;
                }).join('')}
                <td class="px-2 py-1 text-right"><button data-remove="${section}" data-index="${index}" class="text-xs text-red-600 hover:text-red-700">Eliminar</button></td>
            </tr>
        `).join('');
    }

    function renderComparison() {
        const c = state.comparison;
        if (!c) return '<p class="text-xs text-slate-400">Ejecuta comparación para ver continuidad intersemanal.</p>';
        return `
            <div class="space-y-2 text-xs">
                <p><span class="font-semibold text-slate-700">Arrastrados:</span> ${c.carried_over.length}</p>
                <p><span class="font-semibold text-slate-700">Cerrados:</span> ${c.closed_since_last.length}</p>
                <p><span class="font-semibold text-slate-700">Nuevos:</span> ${c.new_commitments.length}</p>
                <p><span class="font-semibold text-slate-700">Vencidos:</span> ${c.overdue_now.length}</p>
                <p><span class="font-semibold text-slate-700">Sin cierre:</span> ${c.dropped_without_close.length}</p>
            </div>
        `;
    }

    function renderQualityIssues() {
        if (!state.qualityIssues.length) {
            return '<p class="text-xs text-slate-400">Sin NC/CAPA abiertas para este contexto.</p>';
        }
        return `
            <div class="space-y-2 max-h-52 overflow-auto">
                ${state.qualityIssues.slice(0, 20).map((issue) => `
                    <div class="rounded-lg border border-slate-200 px-2 py-1.5">
                        <p class="text-xs font-semibold text-slate-700">${esc(issue.title)}</p>
                        <p class="text-[11px] text-slate-500">${esc(issue.issue_type)} · ${esc(issue.status)}${issue.severity ? ` · ${esc(issue.severity)}` : ''}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderMeetingsEmptyState() {
        return `
            <div class="tk-empty-state p-3">
                <p class="text-xs font-semibold text-slate-700">Sin actas registradas</p>
                <p class="text-[11px] mt-1">Crea una nueva acta para iniciar trazabilidad de compromisos.</p>
                <button type="button" id="meeting-empty-create" class="mt-2 tk-btn-primary px-2 py-1.5 text-[11px]">Crear acta</button>
            </div>
        `;
    }

    function render() {
        const selected = state.meetings.find((meeting) => meeting.id === state.selectedId) || null;
        const statusOptions = ['Draft', 'Open', 'Closed'].map((status) => `<option value="${status}" ${state.draft.status === status ? 'selected' : ''}>${status}</option>`).join('');
        container.innerHTML = `
            <div>
                <h1 class="text-2xl font-bold text-slate-900">Actas de Ingeniería</h1>
                <p class="text-sm text-slate-500 mt-1">Gobierno de reuniones, matriz de objetivos/KPI y compromisos con trazabilidad a acciones.</p>
                <div class="flex flex-wrap items-center gap-2 mt-3">
                    <div class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                        <span class="text-xs font-medium text-slate-500">Activo:</span>
                        <select id="meetings-context-asset" class="text-xs border border-slate-200 rounded px-2 py-1 bg-white min-w-[180px]">
                            <option value="">Todos</option>
                            ${renderOptions(state.assets, state.selectedAssetId)}
                        </select>
                        <button id="meetings-context-clear" type="button" class="text-[11px] px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">Limpiar</button>
                    </div>
                    ${state.selectedAssetId ? '<span class="text-xs text-sky-700 bg-sky-50 border border-sky-200 px-2 py-1 rounded-full">Filtro por activo aplicado</span>' : ''}
                </div>
            </div>
            ${renderNotice()}
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">${renderCards()}</div>
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <section class="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                    <div class="flex flex-wrap items-center gap-2 justify-between">
                        <h2 class="text-sm font-semibold text-slate-800">${state.selectedId ? 'Editar acta' : 'Nueva acta'}</h2>
                        <div class="flex gap-2">
                            <button id="meeting-new" class="px-3 py-1.5 text-xs tk-btn-secondary">Nueva</button>
                            <button id="meeting-delete" class="px-3 py-1.5 text-xs tk-btn-danger ${state.selectedId ? '' : 'opacity-50 pointer-events-none'}">Eliminar</button>
                            <button id="meeting-save" class="px-3 py-1.5 rounded tk-btn-primary text-xs font-semibold text-white">${state.selectedId ? 'Actualizar' : 'Crear'}</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select id="meeting-asset" class="tk-select px-3 py-2 text-sm"><option value="">Activo (opcional)</option>${renderOptions(state.assets, state.draft.asset_id || state.selectedAssetId)}</select>
                        <select id="meeting-status" class="tk-select px-3 py-2 text-sm">${statusOptions}</select>
                        <input id="meeting-title" value="${esc(state.draft.title)}" placeholder="Título de la reunión" class="md:col-span-2 tk-input px-3 py-2 text-sm" />
                        <input id="meeting-date" type="date" value="${esc(state.draft.meeting_date)}" class="tk-input px-3 py-2 text-sm" />
                        <input id="meeting-next-date" type="date" value="${esc(state.draft.next_meeting_date)}" class="tk-input px-3 py-2 text-sm" />
                        <input id="meeting-start" value="${esc(state.draft.start_time)}" placeholder="Hora inicio" class="tk-input px-3 py-2 text-sm" />
                        <input id="meeting-end" value="${esc(state.draft.end_time)}" placeholder="Hora fin" class="tk-input px-3 py-2 text-sm" />
                        <input id="meeting-location" value="${esc(state.draft.location)}" placeholder="Lugar" class="md:col-span-2 tk-input px-3 py-2 text-sm" />
                    </div>
                    <textarea id="meeting-objective" rows="2" class="tk-textarea px-3 py-2 text-sm" placeholder="Objetivo">${esc(state.draft.objective)}</textarea>
                    <textarea id="meeting-scope" rows="2" class="tk-textarea px-3 py-2 text-sm" placeholder="Alcance">${esc(state.draft.scope)}</textarea>
                    <textarea id="meeting-out-scope" rows="2" class="tk-textarea px-3 py-2 text-sm" placeholder="Fuera de alcance">${esc(state.draft.out_of_scope)}</textarea>
                    <textarea id="meeting-risks" rows="2" class="tk-textarea px-3 py-2 text-sm" placeholder="Riesgos">${esc(state.draft.risks)}</textarea>
                    <textarea id="meeting-decisions" rows="2" class="tk-textarea px-3 py-2 text-sm" placeholder="Decisiones">${esc(state.draft.key_decisions)}</textarea>
                    <textarea id="meeting-notes" rows="2" class="tk-textarea px-3 py-2 text-sm" placeholder="Notas">${esc(state.draft.notes)}</textarea>
                    <div>
                        <p class="text-xs font-semibold text-slate-700 mb-1">Participantes (1 por línea: Nombre | Rol | Estado)</p>
                        <textarea id="meeting-participants" rows="3" class="tk-textarea px-3 py-2 text-sm">${esc(state.draft.participants_text)}</textarea>
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <p class="text-xs font-semibold text-slate-700">Agenda (Agenda -> Acuerdo -> Acción)</p>
                            <button data-add="agenda" class="text-xs text-brand-orange font-semibold">+ Item</button>
                        </div>
                        <div class="overflow-auto border border-slate-200 rounded">
                            <table class="min-w-full"><tbody>${renderRows('agenda', state.draft.agenda, [{ key: 'title' }, { key: 'objective' }, { key: 'decisions' }])}</tbody></table>
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <p class="text-xs font-semibold text-slate-700">Matriz KPI por objetivo</p>
                            <button data-add="kpis" class="text-xs text-brand-orange font-semibold">+ KPI</button>
                        </div>
                        <div class="overflow-auto border border-slate-200 rounded">
                            <table class="min-w-full"><tbody>${renderRows('kpis', state.draft.kpis, [{ key: 'objective' }, { key: 'weight_pct', type: 'number' }, { key: 'target_value', type: 'number' }, { key: 'current_value', type: 'number' }, { key: 'unit' }, { key: 'owner' }])}</tbody></table>
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <p class="text-xs font-semibold text-slate-700">Focos semanales</p>
                            <button data-add="focuses" class="text-xs text-brand-orange font-semibold">+ Foco</button>
                        </div>
                        <div class="overflow-auto border border-slate-200 rounded">
                            <table class="min-w-full"><tbody>${renderRows('focuses', state.draft.focuses, [{ key: 'focus' }, { key: 'responsible' }, { key: 'due_date', type: 'date' }])}</tbody></table>
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <p class="text-xs font-semibold text-slate-700">Compromisos</p>
                            <button data-add="commitments" class="text-xs text-brand-orange font-semibold">+ Compromiso</button>
                        </div>
                        <div class="overflow-auto border border-slate-200 rounded">
                            <table class="min-w-full"><tbody>${renderRows('commitments', state.draft.commitments, [{ key: 'description' }, { key: 'responsible' }, { key: 'due_date', type: 'date' }, { key: 'status', type: 'select', options: (v) => ['Open', 'In Progress', 'Close Requested', 'Approved', 'Rejected', 'Closed', 'Verified'].map((it) => `<option value="${it}" ${v === it ? 'selected' : ''}>${it}</option>`).join('') }, { key: 'asset_id', type: 'select', options: (v) => `<option value="">(Mismo activo)</option>${state.assets.map((asset) => `<option value="${asset.id}" ${String(v) === String(asset.id) ? 'selected' : ''}>${esc(asset.name)}</option>`).join('')}` }])}</tbody></table>
                        </div>
                    </div>
                    <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p class="text-xs font-semibold text-slate-700 mb-2">Importación asistida (texto)</p>
                        <textarea id="meeting-import-text" rows="4" class="tk-textarea px-3 py-2 text-sm" placeholder="Pega aquí texto de acta/PDF extraído...">${esc(state.draft.import_text)}</textarea>
                        <div class="mt-2 flex justify-end">
                            <button id="meeting-import-btn" class="px-3 py-1.5 text-xs tk-btn-secondary">Generar borrador</button>
                        </div>
                    </div>
                </section>
                <aside class="space-y-4">
                    <div class="rounded-xl border border-slate-200 bg-white p-4">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-sm font-semibold text-slate-800">Actas registradas</h3>
                            <span class="text-xs text-slate-500">${state.meetings.length}</span>
                        </div>
                        <div class="max-h-[360px] overflow-auto space-y-2">
                            ${state.meetings.map((meeting) => `
                                <div class="flex items-start gap-2">
                                    <button data-open-meeting="${meeting.id}" class="flex-1 text-left rounded-lg border px-3 py-2 ${state.selectedId === meeting.id ? 'border-orange-300 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'}">
                                        <p class="text-sm font-semibold text-slate-800">${esc(meeting.title)}</p>
                                        <p class="text-xs text-slate-500">${meeting.meeting_date} · ${meeting.status}</p>
                                        <p class="text-[11px] text-slate-500">Abiertos: ${meeting.open_commitments} · Vencidos: ${meeting.overdue_commitments}</p>
                                    </button>
                                    <button data-delete-meeting="${meeting.id}" class="px-2 py-1.5 text-[11px] tk-btn-danger">
                                        Eliminar
                                    </button>
                                </div>
                            `).join('') || renderMeetingsEmptyState()}
                        </div>
                        <div class="mt-3 flex gap-2">
                            <button id="meeting-materialize" class="flex-1 px-2 py-1.5 rounded tk-btn-primary text-xs text-white font-semibold ${selected ? '' : 'opacity-50 pointer-events-none'}">Generar Acciones</button>
                            <button id="meeting-sync-quality" class="flex-1 px-2 py-1.5 rounded border border-rose-200 text-xs text-rose-700 hover:bg-rose-50 ${selected ? '' : 'opacity-50 pointer-events-none'}">Sincronizar NC/CAPA</button>
                            <button id="meeting-compare" class="flex-1 px-2 py-1.5 text-xs tk-btn-secondary ${selected ? '' : 'opacity-50 pointer-events-none'}">Comparar</button>
                            <button id="meeting-kpi-view" class="flex-1 px-2 py-1.5 rounded border border-amber-200 text-xs text-amber-700 hover:bg-amber-50 ${selected ? '' : 'opacity-50 pointer-events-none'}">Ver KPI MC</button>
                            <button id="meeting-document" class="flex-1 px-2 py-1.5 text-xs tk-btn-secondary ${selected ? '' : 'opacity-50 pointer-events-none'}">Documentar</button>
                        </div>
                    </div>
                    <div class="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 class="text-sm font-semibold text-slate-800 mb-2">Seguimiento intersemanal</h3>
                        ${renderComparison()}
                    </div>
                    <div class="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 class="text-sm font-semibold text-slate-800 mb-2">Calidad abierta (NC/CAPA)</h3>
                        ${renderQualityIssues()}
                    </div>
                </aside>
            </div>
        `;

        const meetingAssetField = container.querySelector('#meeting-asset');
        if (meetingAssetField) {
            meetingAssetField.value = state.draft.asset_id || state.selectedAssetId || '';
            meetingAssetField.addEventListener('change', (event) => {
                if (event.target.value) {
                    setSelectedAsset(event.target.value, 'meetings');
                }
            });
        }

        const contextField = container.querySelector('#meetings-context-asset');
        if (contextField) {
            contextField.value = state.selectedAssetId || '';
            contextField.addEventListener('change', async (event) => {
                const nextAsset = event.target.value || '';
                setSelectedAsset(nextAsset, 'meetings');
                if (!state.selectedId && !state.draft.asset_id) {
                    state.draft.asset_id = nextAsset;
                }
                await refresh();
                render();
            });
        }

        container.querySelector('#meetings-context-clear')?.addEventListener('click', async () => {
            setSelectedAsset('', 'meetings');
            await refresh();
            render();
        });

        container.querySelector('#meeting-empty-create')?.addEventListener('click', () => {
            state.selectedId = null;
            state.comparison = null;
            state.draft = createDraft();
            state.draft.asset_id = state.selectedAssetId || '';
            state.notice = null;
            render();
        });
    }

    function readScalarDraft() {
        state.draft.asset_id = container.querySelector('#meeting-asset')?.value || '';
        if (state.draft.asset_id) {
            setSelectedAsset(state.draft.asset_id, 'meetings');
        }
        state.draft.status = container.querySelector('#meeting-status')?.value || 'Draft';
        state.draft.title = container.querySelector('#meeting-title')?.value?.trim() || '';
        state.draft.meeting_date = container.querySelector('#meeting-date')?.value || '';
        state.draft.next_meeting_date = container.querySelector('#meeting-next-date')?.value || '';
        state.draft.start_time = container.querySelector('#meeting-start')?.value?.trim() || '';
        state.draft.end_time = container.querySelector('#meeting-end')?.value?.trim() || '';
        state.draft.location = container.querySelector('#meeting-location')?.value?.trim() || '';
        state.draft.objective = container.querySelector('#meeting-objective')?.value?.trim() || '';
        state.draft.scope = container.querySelector('#meeting-scope')?.value?.trim() || '';
        state.draft.out_of_scope = container.querySelector('#meeting-out-scope')?.value?.trim() || '';
        state.draft.risks = container.querySelector('#meeting-risks')?.value?.trim() || '';
        state.draft.key_decisions = container.querySelector('#meeting-decisions')?.value?.trim() || '';
        state.draft.notes = container.querySelector('#meeting-notes')?.value?.trim() || '';
        state.draft.participants_text = container.querySelector('#meeting-participants')?.value || '';
        state.draft.import_text = container.querySelector('#meeting-import-text')?.value || '';
    }

    function buildPayload() {
        readScalarDraft();
        return {
            asset_id: state.draft.asset_id || null,
            title: state.draft.title,
            meeting_date: state.draft.meeting_date || todayISO(),
            start_time: state.draft.start_time || null,
            end_time: state.draft.end_time || null,
            location: state.draft.location || null,
            objective: state.draft.objective || null,
            scope: state.draft.scope || null,
            out_of_scope: state.draft.out_of_scope || null,
            risks: state.draft.risks || null,
            key_decisions: state.draft.key_decisions || null,
            notes: state.draft.notes || null,
            next_meeting_date: state.draft.next_meeting_date || null,
            status: state.draft.status || 'Draft',
            participants: textToParticipants(state.draft.participants_text),
            agenda: state.draft.agenda
                .filter((row) => row.title?.trim())
                .map((row, index) => ({
                    order: index + 1,
                    title: row.title.trim(),
                    objective: row.objective?.trim() || null,
                    decisions: String(row.decisions || '').split(';').map((item) => item.trim()).filter(Boolean),
                })),
            kpis: state.draft.kpis
                .filter((row) => row.objective?.trim())
                .map((row) => ({
                    objective: row.objective.trim(),
                    weight_pct: parseNum(row.weight_pct),
                    target_value: parseNum(row.target_value),
                    current_value: parseNum(row.current_value),
                    unit: row.unit?.trim() || null,
                    owner: row.owner?.trim() || null,
                })),
            focuses: state.draft.focuses
                .filter((row) => row.focus?.trim())
                .map((row) => ({
                    focus: row.focus.trim(),
                    responsible: row.responsible?.trim() || null,
                    due_date: row.due_date || null,
                })),
            commitments: state.draft.commitments
                .filter((row) => row.description?.trim())
                .map((row) => ({
                    description: row.description.trim(),
                    responsible: row.responsible?.trim() || 'Pendiente',
                    due_date: row.due_date || null,
                    status: row.status || 'Open',
                    asset_id: row.asset_id || null,
                })),
        };
    }

    container.addEventListener('input', (event) => {
        const input = event.target;
        const section = input?.dataset?.section;
        if (!section) return;
        const index = Number(input.dataset.index);
        const field = input.dataset.field;
        if (!Number.isFinite(index) || !field) return;
        if (!state.draft[section] || !state.draft[section][index]) return;
        state.draft[section][index][field] = input.value;
    });

    container.addEventListener('click', async (event) => {
        const target = event.target;
        const addSection = target?.dataset?.add;
        if (addSection) {
            addRow(addSection);
            return;
        }
        const removeSection = target?.dataset?.remove;
        if (removeSection) {
            removeRow(removeSection, Number(target.dataset.index));
            return;
        }

        if (target.id === 'meeting-new') {
            state.selectedId = null;
            state.comparison = null;
            state.draft = createDraft();
            state.draft.asset_id = state.selectedAssetId || '';
            render();
            return;
        }

        if (target.id === 'meeting-save') {
            try {
                const payload = buildPayload();
                if (!payload.title) throw new Error('El titulo es obligatorio.');
                if (payload.asset_id) {
                    setSelectedAsset(payload.asset_id, 'meetings');
                }
                const saved = state.selectedId
                    ? await meetingService.update(state.selectedId, payload)
                    : await meetingService.create(payload);
                state.selectedId = saved.id;
                await refresh();
                const latest = state.meetings.find((row) => row.id === saved.id);
                if (latest) {
                    state.draft = normalizeDraftFromMeeting(latest);
                    if (latest.asset_id) {
                        setSelectedAsset(latest.asset_id, 'meetings');
                    }
                }
                setNotice('success', 'Acta guardada correctamente.');
                render();
            } catch (error) {
                setNotice('error', `No se pudo guardar: ${error.message}`);
                render();
            }
            return;
        }

        if (target.id === 'meeting-delete' && state.selectedId) {
            const meetingId = state.selectedId;
            if (!confirm('Deseas eliminar esta acta?')) return;
            try {
                await meetingService.remove(meetingId);
                state.selectedId = null;
                state.comparison = null;
                state.draft = createDraft();
                state.draft.asset_id = state.selectedAssetId || '';
                await refresh();
                setNotice('success', 'Acta eliminada correctamente.');
                render();
            } catch (error) {
                setNotice('error', `No se pudo eliminar: ${error.message}`);
                render();
            }
            return;
        }

        if (target.id === 'meeting-import-btn') {
            try {
                readScalarDraft();
                const imported = await meetingService.heuristicImport(
                    state.draft.import_text,
                    state.draft.title || 'Acta de Ingeniería de Procesos',
                    state.draft.asset_id || null,
                );
                state.draft = normalizeDraftFromMeeting(imported.draft);
                if (state.draft.asset_id) {
                    setSelectedAsset(state.draft.asset_id, 'meetings');
                }
                state.draft.import_text = '';
                const warningText = imported.warnings?.length ? ` (${imported.warnings.join(' | ')})` : '';
                setNotice('success', `Borrador generado${warningText}`);
                render();
            } catch (error) {
                setNotice('error', `No se pudo importar: ${error.message}`);
                render();
            }
            return;
        }

        const openMeetingId = target?.dataset?.openMeeting;
        if (openMeetingId) {
            const meeting = state.meetings.find((row) => row.id === openMeetingId);
            if (meeting) {
                state.selectedId = meeting.id;
                state.comparison = null;
                state.draft = normalizeDraftFromMeeting(meeting);
                if (meeting.asset_id) {
                    setSelectedAsset(meeting.asset_id, 'meetings');
                }
                render();
            }
            return;
        }

        const deleteMeetingId = target?.dataset?.deleteMeeting;
        if (deleteMeetingId) {
            if (!confirm('Deseas eliminar esta acta?')) return;
            try {
                await meetingService.remove(deleteMeetingId);
                if (state.selectedId === deleteMeetingId) {
                    state.selectedId = null;
                    state.comparison = null;
                    state.draft = createDraft();
                    state.draft.asset_id = state.selectedAssetId || '';
                }
                await refresh();
                setNotice('success', 'Acta eliminada correctamente.');
                render();
            } catch (error) {
                setNotice('error', `No se pudo eliminar: ${error.message}`);
                render();
            }
            return;
        }

        if (target.id === 'meeting-materialize' && state.selectedId) {
            try {
                const result = await meetingService.materializeActions(state.selectedId, { force: false, default_due_days: 7 });
                await refresh();
                const current = state.meetings.find((row) => row.id === state.selectedId);
                if (current) {
                    state.draft = normalizeDraftFromMeeting(current);
                    if (current.asset_id) {
                        setSelectedAsset(current.asset_id, 'meetings');
                    }
                }
                setNotice('success', `Acciones generadas: ${result.created_actions}. Enlazadas: ${result.linked_actions}.`);
                render();
            } catch (error) {
                setNotice('error', `No se pudieron generar acciones: ${error.message}`);
                render();
            }
            return;
        }

        if (target.id === 'meeting-sync-quality' && state.selectedId) {
            try {
                const result = await meetingService.syncQualityCommitments(state.selectedId);
                await refresh();
                const current = state.meetings.find((row) => row.id === state.selectedId);
                if (current) {
                    state.draft = normalizeDraftFromMeeting(current);
                }
                setNotice('success', `Compromisos NC/CAPA sincronizados. Nuevos: ${result.created_commitments}, actualizados: ${result.linked_existing}.`);
                render();
            } catch (error) {
                setNotice('error', `No se pudo sincronizar NC/CAPA: ${error.message}`);
                render();
            }
            return;
        }

        if (target.id === 'meeting-compare' && state.selectedId) {
            try {
                state.comparison = await meetingService.compare(state.selectedId);
                state.notice = null;
                render();
            } catch (error) {
                setNotice('error', `No se pudo comparar: ${error.message}`);
                render();
            }
            return;
        }

        if (target.id === 'meeting-kpi-view' && state.selectedId) {
            const active = state.meetings.find((row) => row.id === state.selectedId);
            const assetId = active?.asset_id || state.selectedAssetId || '';
            const assetPart = assetId ? `&asset_id=${encodeURIComponent(assetId)}` : '';
            window.location.hash = `#/excellence?tab=kpi-mc${assetPart}`;
            return;
        }

        if (target.id === 'meeting-document' && state.selectedId) {
            const active = state.meetings.find((row) => row.id === state.selectedId);
            if (active?.asset_id) {
                setSelectedAsset(active.asset_id, 'meetings');
            }
            const assetPart = active?.asset_id ? `&asset_id=${encodeURIComponent(active.asset_id)}` : '';
            window.location.hash = `#/editor?source_module=meetings&meeting_id=${encodeURIComponent(state.selectedId)}${assetPart}&source_route=${encodeURIComponent('#/meetings')}`;
        }
    });

    try {
        await refresh();
        render();
    } catch (error) {
        uiFeedback.error(`Error cargando Actas: ${error.message}`);
        container.innerHTML = `<div class="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4 text-sm">Error cargando Actas: ${esc(error.message)}</div>`;
    }

    return container;
}

export default MeetingsPage;





















