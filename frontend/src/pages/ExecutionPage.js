import ApiClient from '../services/api.client.js';
import { executionService } from '../services/execution.service.js';
import { getHashContext, getModuleContext, setModuleContext } from '../services/module-context.service.js';
import uiFeedback from '../services/ui-feedback.service.js';

async function downloadExecutionFile(path, filename) {
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

function parseShiftPlanBulk(text) {
    const lines = (text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    if (!lines.length) return [];
    return lines.map((line, idx) => {
        const cols = line.split(',').map((col) => col.trim());
        if (cols.length < 4) {
            throw new Error(`Linea ${idx + 1}: se esperaban al menos 4 columnas (fecha, turno, asset_id, operator_id opcional).`);
        }
        return {
            plan_date: cols[0],
            shift: cols[1],
            asset_id: cols[2],
            operator_id: cols[3] || null,
            target_quantity: cols[4] ? Number(cols[4]) : null,
            notes: cols[5] || null,
        };
    });
}

async function ExecutionPage() {
    const container = document.createElement('div');
    container.className = 'p-4 md:p-6 max-w-7xl mx-auto';
    const hashContext = getHashContext();
    const storedContext = getModuleContext();
    const initialAssetId = hashContext.asset_id || storedContext.asset_id || '';

    const state = {
        tab: 'logs',
        assets: [],
        operators: [],
        activities: [],
        logs: [],
        downtimes: [],
        context: null,
        skillsByOperator: {},
        assignments: [],
        shiftPlans: [],
        contextRules: [],
        failureCatalog: [],
        selectedAssetId: initialAssetId,
        isMobileRoute: window.location.hash.startsWith('#/mobile')
    };

    if (initialAssetId) {
        setModuleContext({ asset_id: initialAssetId }, 'execution');
    }

    function setSelectedAsset(assetId, source = 'execution') {
        const normalized = assetId || '';
        state.selectedAssetId = normalized;
        setModuleContext({ asset_id: normalized || null }, source);
    }

    function buildQuery(params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            query.set(key, String(value));
        });
        if (state.selectedAssetId) {
            query.set('asset_id', state.selectedAssetId);
        }
        return query.toString();
    }

    async function loadSkillsForOperators() {
        const skillsMap = {};
        const tasks = state.operators.map((op) => executionService.getOperatorSkills(op.id));
        const results = await Promise.allSettled(tasks);
        results.forEach((result, index) => {
            const operatorId = state.operators[index]?.id;
            skillsMap[operatorId] = result.status === 'fulfilled' ? result.value : [];
        });
        state.skillsByOperator = skillsMap;
    }

    async function bootstrapData() {
        const tasks = await Promise.allSettled([
            ApiClient.get('/assets'),
            executionService.getOperators(),
            executionService.getLogs(buildQuery({ limit: 80 })),
            executionService.getDowntimes(buildQuery({ limit: 80 })),
            ApiClient.get('/engineering/activities'),
            executionService.getContext(),
            executionService.getAssignments(buildQuery({ limit: 80 })),
            executionService.getShiftPlans(buildQuery()),
            executionService.getContextRules(buildQuery()),
            executionService.getFailureCatalog()
        ]);

        state.assets = tasks[0].status === 'fulfilled' ? tasks[0].value : [];
        if (state.selectedAssetId && !state.assets.some((asset) => asset.id === state.selectedAssetId)) {
            setSelectedAsset('', 'execution');
        }
        state.operators = tasks[1].status === 'fulfilled' ? tasks[1].value : [];
        state.logs = tasks[2].status === 'fulfilled' ? tasks[2].value : [];
        state.downtimes = tasks[3].status === 'fulfilled' ? tasks[3].value : [];
        state.activities = tasks[4].status === 'fulfilled' ? tasks[4].value : [];
        state.context = tasks[5].status === 'fulfilled' ? tasks[5].value : null;
        state.assignments = tasks[6].status === 'fulfilled' ? tasks[6].value : [];
        state.shiftPlans = tasks[7].status === 'fulfilled' ? tasks[7].value : [];
        state.contextRules = tasks[8].status === 'fulfilled' ? tasks[8].value : [];
        state.failureCatalog = tasks[9].status === 'fulfilled' ? tasks[9].value : [];

        await loadSkillsForOperators();
    }

    function renderHeader() {
        return `
            <div class="mb-5">
                <h1 class="text-2xl font-bold text-slate-900">Ejecucion de Piso</h1>
                <p class="text-slate-500 text-sm mt-1">Bitacora, paros y gestion operativa de personal</p>
                <div class="flex flex-wrap items-center gap-2 mt-3">
                    <div class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                        <span class="text-xs font-medium text-slate-500">Activo:</span>
                        <select id="execution-context-asset" class="text-xs border border-slate-200 rounded px-2 py-1 bg-white min-w-[180px]">
                            <option value="">Todos</option>
                            ${optionList(state.assets, 'id', (a) => `${a.name} (${a.type})`, state.selectedAssetId)}
                        </select>
                        <button id="execution-context-clear" type="button" class="text-[11px] px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">Limpiar</button>
                    </div>
                    ${state.context?.area_name ? `<span class="text-xs text-brand-orange bg-orange-50 border border-orange-200 px-2 py-1 rounded-full">Contexto sugerido: ${state.context.area_name}</span>` : ''}
                    ${state.selectedAssetId ? '<span class="text-xs text-sky-700 bg-sky-50 border border-sky-200 px-2 py-1 rounded-full">Filtro por activo aplicado</span>' : ''}
                    ${state.isMobileRoute ? '<span class="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-full">Modo Mobile</span>' : ''}
                </div>
            </div>
        `;
    }

    function renderTabs() {
        const tabs = [
            { id: 'logs', label: 'Bitacora' },
            { id: 'downtimes', label: 'Paros' },
            { id: 'staff', label: 'Personal' },
            { id: 'planning', label: 'Planificacion' },
            { id: 'config', label: 'Configuracion' }
        ];

        const tabBase = state.isMobileRoute
            ? 'execution-tab flex-1 min-h-12 px-3 py-3 text-sm font-semibold rounded-lg border transition-all'
            : 'execution-tab pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer';

        return `
            <div class="${state.isMobileRoute ? 'mb-4' : 'border-b border-slate-200 mb-6'}">
                <nav class="${state.isMobileRoute ? 'grid grid-cols-2 gap-2 sm:grid-cols-4' : 'flex gap-5'}">
                    ${tabs.map(tab => `
                        <button data-tab="${tab.id}" class="${tabBase} ${state.tab === tab.id
                ? (state.isMobileRoute ? 'bg-brand-orange text-white border-brand-orange' : 'border-brand-orange text-brand-orange')
                : (state.isMobileRoute ? 'bg-white text-slate-600 border-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700')}">
                            ${tab.label}
                        </button>
                    `).join('')}
                </nav>
            </div>
        `;
    }

    function optionList(items, valueKey, labelBuilder, selectedValue = '') {
        return items
            .map((item) => {
                const value = item[valueKey];
                const selected = String(value) === String(selectedValue) ? 'selected' : '';
                return `<option value="${value}" ${selected}>${labelBuilder(item)}</option>`;
            })
            .join('');
    }

    function renderLogsTab() {
        return `
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div class="xl:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 class="text-sm font-semibold text-slate-800 mb-4">Nuevo Evento de Produccion</h3>
                    <form id="log-form" class="space-y-3">
                        <select id="log-asset" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" required>
                            <option value="">Activo...</option>
                            ${optionList(state.assets, 'id', (a) => `${a.name} (${a.type})`, state.selectedAssetId)}
                        </select>
                        <select id="log-shift" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                            <option value="Manana">Manana</option>
                            <option value="Tarde">Tarde</option>
                            <option value="Noche">Noche</option>
                        </select>
                        <select id="log-event" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                            <option value="start">Inicio</option>
                            <option value="end">Fin</option>
                            <option value="pause">Pausa</option>
                            <option value="changeover">Cambio Referencia</option>
                        </select>
                        <select id="log-operator" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                            <option value="">Operario (opcional)...</option>
                            ${optionList(state.operators, 'id', (o) => `${o.full_name} (${o.employee_code})`)}
                        </select>
                        <input id="log-qty" type="number" min="0" placeholder="Cantidad producida (opcional)" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <textarea id="log-notes" rows="3" placeholder="Notas..." class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"></textarea>
                        <button class="w-full min-h-12 bg-brand-orange text-white py-3 rounded-lg text-sm font-medium hover:bg-orange-600">Registrar Evento</button>
                    </form>
                </div>
                <div class="xl:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div class="px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <h3 class="text-sm font-semibold text-slate-700">Timeline del Turno (ultimos eventos)</h3>
                    </div>
                    <div class="max-h-[460px] overflow-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-slate-50 text-slate-600 sticky top-0">
                                <tr>
                                    <th class="text-left px-4 py-2">Hora</th>
                                    <th class="text-left px-4 py-2">Activo</th>
                                    <th class="text-left px-4 py-2">Evento</th>
                                    <th class="text-left px-4 py-2">Turno</th>
                                    <th class="text-right px-4 py-2">Cantidad</th>
                                    <th class="text-right px-4 py-2">Accion</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${state.logs.length === 0 ? '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">Sin eventos registrados</td></tr>' : state.logs.map(log => `
                                    <tr class="hover:bg-slate-50">
                                        <td class="px-4 py-2 text-xs text-slate-500">${new Date(log.event_time).toLocaleString('es-CO')}</td>
                                        <td class="px-4 py-2 text-slate-800">${log.asset_name || log.asset_id}</td>
                                        <td class="px-4 py-2"><span class="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">${log.event_type}</span></td>
                                        <td class="px-4 py-2 text-slate-600">${log.shift}</td>
                                        <td class="px-4 py-2 text-right font-mono text-slate-700">${log.quantity_produced ?? '-'}</td>
                                        <td class="px-4 py-2 text-right">
                                            <button data-del-log="${log.id}" class="text-xs px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50">Eliminar</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function renderDowntimesTab() {
        return `
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div class="xl:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 class="text-sm font-semibold text-slate-800 mb-4">Reportar Novedad / Paro</h3>
                    <form id="downtime-form" class="space-y-3">
                        <select id="down-asset" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" required>
                            <option value="">Activo...</option>
                            ${optionList(state.assets, 'id', (a) => `${a.name} (${a.type})`, state.selectedAssetId)}
                        </select>
                        <select id="down-type" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                            <option value="Mecanico">Mecanico</option>
                            <option value="Electrico">Electrico</option>
                            <option value="Calidad">Calidad</option>
                            <option value="Cambio de Ref">Cambio de Ref</option>
                            <option value="Programado">Programado</option>
                        </select>
                        <textarea id="down-diagnosis" rows="4" placeholder="Diagnostico / comentario..." class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"></textarea>
                        <button type="button" id="voice-btn" class="w-full min-h-12 border border-slate-300 text-slate-700 py-3 rounded-lg text-sm hover:bg-slate-50">Dictado por Voz</button>
                        <button class="w-full min-h-12 bg-brand-orange text-white py-3 rounded-lg text-sm font-medium hover:bg-orange-600">Abrir Evento de Paro</button>
                    </form>
                </div>
                <div class="xl:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div class="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-slate-700">Eventos de Paro</h3>
                        <span class="text-xs text-red-500">Abiertos: ${state.downtimes.filter(d => !d.end_time).length}</span>
                    </div>
                    <div class="max-h-[460px] overflow-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-slate-50 text-slate-600 sticky top-0">
                                <tr>
                                    <th class="text-left px-4 py-2">Activo</th>
                                    <th class="text-left px-4 py-2">Tipo</th>
                                    <th class="text-left px-4 py-2">Inicio</th>
                                    <th class="text-right px-4 py-2">Duracion (min)</th>
                                    <th class="text-center px-4 py-2">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${state.downtimes.length === 0 ? '<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400">Sin eventos registrados</td></tr>' : state.downtimes.map(event => `
                                    <tr class="hover:bg-slate-50 ${!event.end_time ? 'bg-red-50/40' : ''}">
                                        <td class="px-4 py-2 text-slate-800">${event.asset_name || event.asset_id}</td>
                                        <td class="px-4 py-2 text-slate-600">${event.downtime_type}</td>
                                        <td class="px-4 py-2 text-xs text-slate-500">${new Date(event.start_time).toLocaleString('es-CO')}</td>
                                        <td class="px-4 py-2 text-right font-mono text-slate-700">${event.duration_minutes ?? '-'}</td>
                                        <td class="px-4 py-2 text-center">
                                            <div class="inline-flex items-center gap-1">
                                                ${!event.end_time ? `<button data-close-id="${event.id}" class="close-down min-h-10 text-xs px-3 py-2 rounded bg-green-100 text-green-700 hover:bg-green-200">Cerrar</button>` : '<span class="text-xs text-slate-400">Cerrado</span>'}
                                                <button data-del-down="${event.id}" class="min-h-10 text-xs px-3 py-2 rounded border border-red-200 text-red-700 hover:bg-red-50">Eliminar</button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function skillBadge(level) {
        if (!level) return 'bg-slate-100 text-slate-400';
        if (level === 1) return 'bg-red-100 text-red-700';
        if (level === 2) return 'bg-amber-100 text-amber-700';
        if (level === 3) return 'bg-blue-100 text-blue-700';
        return 'bg-green-100 text-green-700';
    }

    function renderSkillMatrix() {
        const activities = state.activities.slice(0, 10);
        if (!activities.length || !state.operators.length) {
            return '<p class="text-xs text-slate-400">No hay datos suficientes para matriz de polivalencia.</p>';
        }

        return `
            <div class="overflow-auto">
                <table class="min-w-full text-xs">
                    <thead class="bg-slate-50 text-slate-600">
                        <tr>
                            <th class="text-left px-3 py-2 sticky left-0 bg-slate-50">Operario</th>
                            ${activities.map(a => `<th class="px-3 py-2 text-center">${a.name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${state.operators.map(op => {
                            const skills = state.skillsByOperator[op.id] || [];
                            return `
                                <tr class="hover:bg-slate-50">
                                    <td class="px-3 py-2 sticky left-0 bg-white font-medium text-slate-700">${op.full_name}</td>
                                    ${activities.map(activity => {
                                        const skill = skills.find(s => s.activity_id === activity.id);
                                        const level = skill?.skill_level || 0;
                                        return `
                                            <td class="px-3 py-2 text-center">
                                                <span class="inline-flex min-w-6 justify-center px-2 py-1 rounded-full ${skillBadge(level)}">${level || '-'}</span>
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderSkillsTable() {
        const rows = state.operators.flatMap((operator) => {
            const skills = state.skillsByOperator[operator.id] || [];
            return skills.map((skill) => ({
                ...skill,
                operator_name: skill.operator_name || operator.full_name,
            }));
        });

        if (!rows.length) {
            return '<p class="text-xs text-slate-400">No hay habilidades registradas.</p>';
        }

        return `
            <div class="max-h-[240px] overflow-auto">
                <table class="w-full text-xs">
                    <thead class="bg-slate-50 text-slate-600 sticky top-0">
                        <tr>
                            <th class="text-left px-3 py-2">Operario</th>
                            <th class="text-left px-3 py-2">Actividad</th>
                            <th class="text-center px-3 py-2">Nivel</th>
                            <th class="text-right px-3 py-2">Accion</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${rows.map((skill) => `
                            <tr>
                                <td class="px-3 py-2 text-slate-700">${skill.operator_name || '-'}</td>
                                <td class="px-3 py-2 text-slate-600">${skill.activity_name || skill.activity_id}</td>
                                <td class="px-3 py-2 text-center">
                                    <span class="inline-flex min-w-6 justify-center px-2 py-1 rounded-full ${skillBadge(skill.skill_level)}">${skill.skill_level}</span>
                                </td>
                                <td class="px-3 py-2 text-right">
                                    <button data-del-skill="${skill.id}" class="text-red-600 hover:text-red-700">Eliminar</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderStaffTab() {
    const activeCount = state.operators.filter(op => op.is_active).length;
    const inactiveCount = state.operators.length - activeCount;

    return `
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div class="xl:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
                <div class="grid grid-cols-2 gap-2">
                    <div class="rounded-lg border border-green-100 bg-green-50 p-3">
                        <p class="text-xs text-green-600">Activos</p>
                        <p class="text-xl font-bold text-green-700">${activeCount}</p>
                    </div>
                    <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p class="text-xs text-slate-500">Inactivos</p>
                        <p class="text-xl font-bold text-slate-700">${inactiveCount}</p>
                    </div>
                </div>
                <div>
                    <h3 class="text-sm font-semibold text-slate-800 mb-3">Nuevo Operario</h3>
                    <form id="operator-form" class="space-y-3">
                        <input id="op-code" required placeholder="Codigo empleado" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input id="op-name" required placeholder="Nombre completo" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <select id="op-area" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                            <option value="">Area por defecto...</option>
                            ${optionList(state.assets, 'id', (a) => `${a.name} (${a.type})`, state.selectedAssetId)}
                        </select>
                        <select id="op-shift" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                            <option value="Manana">Manana</option>
                            <option value="Tarde">Tarde</option>
                            <option value="Noche">Noche</option>
                            <option value="Rotativo">Rotativo</option>
                        </select>
                        <button class="w-full min-h-12 bg-brand-orange text-white py-3 rounded-lg text-sm font-medium hover:bg-orange-600">Crear Operario</button>
                    </form>
                </div>
                <div>
                    <h3 class="text-sm font-semibold text-slate-800 mb-3">Asignar Habilidad</h3>
                    <form id="skill-form" class="space-y-3">
                        <select id="skill-operator" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" required>
                            <option value="">Operario...</option>
                            ${optionList(state.operators, 'id', (o) => `${o.full_name} (${o.employee_code})`)}
                        </select>
                        <select id="skill-activity" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" required>
                            <option value="">Actividad...</option>
                            ${optionList(state.activities, 'id', (a) => `${a.name} (${a.type})`)}
                        </select>
                        <select id="skill-level" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                            <option value="1">1 - Aprendiz</option>
                            <option value="2">2 - Competente</option>
                            <option value="3">3 - Experto</option>
                            <option value="4">4 - Puede ensenar</option>
                        </select>
                        <button class="w-full min-h-12 border border-slate-300 text-slate-700 py-3 rounded-lg text-sm hover:bg-slate-50">Asignar Skill</button>
                    </form>
                </div>
            </div>
            <div class="xl:col-span-2 space-y-6">
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div class="px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <h3 class="text-sm font-semibold text-slate-700">Disponibilidad de Personal</h3>
                    </div>
                    <div class="max-h-[280px] overflow-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-slate-50 text-slate-600 sticky top-0">
                                <tr>
                                    <th class="text-left px-4 py-2">Codigo</th>
                                    <th class="text-left px-4 py-2">Nombre</th>
                                    <th class="text-left px-4 py-2">Turno</th>
                                    <th class="text-left px-4 py-2">Area</th>
                                    <th class="text-center px-4 py-2">Estado</th>
                                    <th class="text-right px-4 py-2">Accion</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${state.operators.length === 0 ? '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">Sin operarios</td></tr>' : state.operators.map(op => `
                                    <tr class="hover:bg-slate-50">
                                        <td class="px-4 py-2 font-mono text-xs text-slate-700">${op.employee_code}</td>
                                        <td class="px-4 py-2 text-slate-800">${op.full_name}</td>
                                        <td class="px-4 py-2 text-slate-600">${op.shift}</td>
                                        <td class="px-4 py-2 text-slate-600">${op.default_area_name || '-'}</td>
                                        <td class="px-4 py-2 text-center">
                                            <button data-op-toggle="${op.id}" data-op-state="${!op.is_active}" class="toggle-op min-h-10 px-3 py-2 rounded-full text-xs ${op.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">
                                                ${op.is_active ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                        <td class="px-4 py-2 text-right">
                                            <button data-del-op="${op.id}" class="text-xs px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50">Eliminar</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div class="px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <h3 class="text-sm font-semibold text-slate-700">Matriz de Polivalencia (Operario x Actividad)</h3>
                    </div>
                    <div class="p-4">
                        ${renderSkillMatrix()}
                        <p class="text-[11px] text-slate-500 mt-3">Leyenda: 1=Aprendiz, 2=Competente, 3=Experto, 4=Puede ensenar</p>
                    </div>
                </div>
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div class="px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <h3 class="text-sm font-semibold text-slate-700">Habilidades Registradas</h3>
                    </div>
                    <div class="p-4">
                        ${renderSkillsTable()}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderPlanningTab() {
    return `
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 class="text-sm font-semibold text-slate-800">Asignacion Operario - Estacion</h3>
                <form id="assignment-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select id="assign-operator" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" required>
                        <option value="">Operario...</option>
                        ${optionList(state.operators, 'id', (o) => `${o.full_name} (${o.employee_code})`)}
                    </select>
                    <select id="assign-asset" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" required>
                        <option value="">Estacion/Activo...</option>
                        ${optionList(state.assets, 'id', (a) => `${a.name} (${a.type})`, state.selectedAssetId)}
                    </select>
                    <select id="assign-shift" class="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                        <option value="Manana">Manana</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Noche">Noche</option>
                    </select>
                    <input id="assign-notes" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Notas (opcional)">
                    <button class="md:col-span-2 tk-btn-primary min-h-12 text-sm">Asignar</button>
                </form>
                <div class="max-h-[320px] overflow-auto border border-slate-200 rounded-lg">
                    <table class="w-full text-xs">
                        <thead class="bg-slate-50 text-slate-600 sticky top-0">
                            <tr>
                                <th class="text-left px-3 py-2">Operario</th>
                                <th class="text-left px-3 py-2">Estacion</th>
                                <th class="text-left px-3 py-2">Turno</th>
                                <th class="text-left px-3 py-2">Estado</th>
                                <th class="text-right px-3 py-2">Accion</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${state.assignments.length ? state.assignments.map((row) => `
                                <tr>
                                    <td class="px-3 py-2">${row.operator_name || row.operator_id}</td>
                                    <td class="px-3 py-2">${row.asset_name || row.asset_id}</td>
                                    <td class="px-3 py-2">${row.shift}</td>
                                    <td class="px-3 py-2">${row.status}</td>
                                    <td class="px-3 py-2 text-right">
                                        ${row.status === 'Active' ? `<button data-close-assignment="${row.id}" class="text-green-700 hover:text-green-800 mr-2">Cerrar</button>` : ''}
                                        <button data-del-assignment="${row.id}" class="text-red-700 hover:text-red-800">Eliminar</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="px-3 py-6 text-center text-slate-400">Sin asignaciones</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div class="flex items-center justify-between gap-2">
                    <h3 class="text-sm font-semibold text-slate-800">Plan de Turnos</h3>
                    <div class="flex flex-wrap gap-2">
                        <button id="shift-template" type="button" class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-50">Plantilla XLSX</button>
                        <button id="shift-export" type="button" class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-50">Exportar XLSX</button>
                    </div>
                </div>
                <form id="shift-plan-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input id="plan-date" type="date" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" required>
                    <select id="plan-shift" class="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                        <option value="Manana">Manana</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Noche">Noche</option>
                    </select>
                    <select id="plan-asset" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" required>
                        <option value="">Activo...</option>
                        ${optionList(state.assets, 'id', (a) => `${a.name} (${a.type})`, state.selectedAssetId)}
                    </select>
                    <select id="plan-operator" class="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                        <option value="">Operario (opcional)...</option>
                        ${optionList(state.operators, 'id', (o) => `${o.full_name} (${o.employee_code})`)}
                    </select>
                    <input id="plan-target" type="number" min="0" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Meta cantidad">
                    <input id="plan-notes" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Notas (opcional)">
                    <button class="md:col-span-2 tk-btn-primary min-h-12 text-sm">Guardar plan</button>
                </form>

                <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <h4 class="text-xs font-semibold text-slate-700">Carga masiva (CSV simple)</h4>
                        <button id="shift-bulk-submit" type="button" class="px-2 py-1 rounded bg-brand-orange text-white text-xs">Procesar</button>
                    </div>
                    <p class="text-[11px] text-slate-500 mb-2">Formato por línea: <code>YYYY-MM-DD,Turno,asset_id,operator_id,target,notas</code></p>
                    <textarea id="shift-bulk-text" rows="4" class="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-mono" placeholder="2026-03-03,Manana,asset_uuid,operator_uuid,1200,Linea principal"></textarea>
                </div>

                <div class="max-h-[320px] overflow-auto border border-slate-200 rounded-lg">
                    <table class="w-full text-xs">
                        <thead class="bg-slate-50 text-slate-600 sticky top-0">
                            <tr>
                                <th class="text-left px-3 py-2">Fecha</th>
                                <th class="text-left px-3 py-2">Turno</th>
                                <th class="text-left px-3 py-2">Activo</th>
                                <th class="text-left px-3 py-2">Operario</th>
                                <th class="text-right px-3 py-2">Meta</th>
                                <th class="text-right px-3 py-2">Accion</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${state.shiftPlans.length ? state.shiftPlans.map((row) => `
                                <tr>
                                    <td class="px-3 py-2">${row.plan_date}</td>
                                    <td class="px-3 py-2">${row.shift}</td>
                                    <td class="px-3 py-2">${row.asset_name || row.asset_id}</td>
                                    <td class="px-3 py-2">${row.operator_name || '-'}</td>
                                    <td class="px-3 py-2 text-right">${row.target_quantity ?? '-'}</td>
                                    <td class="px-3 py-2 text-right"><button data-del-shift-plan="${row.id}" class="text-red-700 hover:text-red-800">Eliminar</button></td>
                                </tr>
                            `).join('') : '<tr><td colspan="6" class="px-3 py-6 text-center text-slate-400">Sin planes cargados</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderConfigTab() {
    return `
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 class="text-sm font-semibold text-slate-800">Reglas de Contexto</h3>
                <form id="context-rule-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select id="rule-role" class="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                        <option value="">Rol (opcional)...</option>
                        <option value="admin">admin</option>
                        <option value="engineer">engineer</option>
                        <option value="supervisor">supervisor</option>
                        <option value="viewer">viewer</option>
                    </select>
                    <select id="rule-shift" class="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                        <option value="">Turno (opcional)...</option>
                        <option value="Manana">Manana</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Noche">Noche</option>
                    </select>
                    <select id="rule-asset" class="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                        <option value="">Activo (opcional)...</option>
                        ${optionList(state.assets, 'id', (a) => `${a.name} (${a.type})`, state.selectedAssetId)}
                    </select>
                    <input id="rule-priority" type="number" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" value="100" min="1" max="999" placeholder="Prioridad">
                    <input id="rule-line-name" class="md:col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Contexto: line_name (opcional)">
                    <button class="md:col-span-2 tk-btn-primary min-h-12 text-sm">Crear regla</button>
                </form>
                <div class="max-h-[320px] overflow-auto border border-slate-200 rounded-lg">
                    <table class="w-full text-xs">
                        <thead class="bg-slate-50 text-slate-600 sticky top-0">
                            <tr>
                                <th class="text-left px-3 py-2">Rol</th>
                                <th class="text-left px-3 py-2">Turno</th>
                                <th class="text-left px-3 py-2">Activo</th>
                                <th class="text-right px-3 py-2">Prioridad</th>
                                <th class="text-right px-3 py-2">Accion</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${state.contextRules.length ? state.contextRules.map((rule) => `
                                <tr>
                                    <td class="px-3 py-2">${rule.role || '-'}</td>
                                    <td class="px-3 py-2">${rule.shift || '-'}</td>
                                    <td class="px-3 py-2">${rule.asset_id || '-'}</td>
                                    <td class="px-3 py-2 text-right">${rule.priority}</td>
                                    <td class="px-3 py-2 text-right">
                                        <button data-del-rule="${rule.id}" class="text-red-600 hover:text-red-700">Eliminar</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="px-3 py-6 text-center text-slate-400">Sin reglas</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 class="text-sm font-semibold text-slate-800">Catalogo de Fallas (Voz)</h3>
                <form id="failure-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input id="failure-code" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Codigo" required>
                    <input id="failure-name" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Nombre" required>
                    <select id="failure-type" class="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                        <option value="">Tipo de paro...</option>
                        <option value="Mecanico">Mecanico</option>
                        <option value="Electrico">Electrico</option>
                        <option value="Calidad">Calidad</option>
                        <option value="Cambio de Ref">Cambio de Ref</option>
                        <option value="Programado">Programado</option>
                    </select>
                    <input id="failure-keywords" class="px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Keywords separadas por coma">
                    <input id="failure-root-cause" class="md:col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Causa raiz sugerida (opcional)">
                    <button class="md:col-span-2 tk-btn-primary min-h-12 text-sm">Agregar al catalogo</button>
                </form>
                <div class="max-h-[320px] overflow-auto border border-slate-200 rounded-lg">
                    <table class="w-full text-xs">
                        <thead class="bg-slate-50 text-slate-600 sticky top-0">
                            <tr>
                                <th class="text-left px-3 py-2">Codigo</th>
                                <th class="text-left px-3 py-2">Nombre</th>
                                <th class="text-left px-3 py-2">Tipo</th>
                                <th class="text-right px-3 py-2">Accion</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${state.failureCatalog.length ? state.failureCatalog.map((item) => `
                                <tr>
                                    <td class="px-3 py-2 font-mono text-[11px]">${item.code}</td>
                                    <td class="px-3 py-2">${item.name}</td>
                                    <td class="px-3 py-2">${item.downtime_type || '-'}</td>
                                    <td class="px-3 py-2 text-right">
                                        <button data-del-failure="${item.id}" class="text-red-600 hover:text-red-700">Eliminar</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" class="px-3 py-6 text-center text-slate-400">Sin catalogo</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderBody() {
        if (state.tab === 'downtimes') return renderDowntimesTab();
        if (state.tab === 'staff') return renderStaffTab();
        if (state.tab === 'planning') return renderPlanningTab();
        if (state.tab === 'config') return renderConfigTab();
        return renderLogsTab();
    }

    function render() {
        container.innerHTML = `
            ${renderHeader()}
            ${renderTabs()}
            <div id="execution-body">${renderBody()}</div>
        `;
        wireEvents();
    }

    async function refresh() {
        const [logsRes, downtimesRes, operatorsRes, assignmentRes, shiftPlansRes, rulesRes, failureRes] = await Promise.allSettled([
            executionService.getLogs(buildQuery({ limit: 80 })),
            executionService.getDowntimes(buildQuery({ limit: 80 })),
            executionService.getOperators(),
            executionService.getAssignments(buildQuery({ limit: 80 })),
            executionService.getShiftPlans(buildQuery()),
            executionService.getContextRules(buildQuery()),
            executionService.getFailureCatalog()
        ]);
        if (logsRes.status === 'fulfilled') state.logs = logsRes.value;
        if (downtimesRes.status === 'fulfilled') state.downtimes = downtimesRes.value;
        if (operatorsRes.status === 'fulfilled') state.operators = operatorsRes.value;
        if (assignmentRes?.status === 'fulfilled') state.assignments = assignmentRes.value;
        if (shiftPlansRes?.status === 'fulfilled') state.shiftPlans = shiftPlansRes.value;
        if (rulesRes?.status === 'fulfilled') state.contextRules = rulesRes.value;
        if (failureRes?.status === 'fulfilled') state.failureCatalog = failureRes.value;
        await loadSkillsForOperators();
    }

    function wireVoiceButton() {
        const voiceBtn = container.querySelector('#voice-btn');
        if (!voiceBtn) return;
        voiceBtn.addEventListener('click', () => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                uiFeedback.warning('El navegador no soporta Web Speech API.');
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-CO';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            voiceBtn.textContent = 'Escuchando...';
            recognition.start();
            recognition.onresult = async (event) => {
                const text = event.results?.[0]?.[0]?.transcript || '';
                const textarea = container.querySelector('#down-diagnosis');
                if (textarea) {
                    textarea.value = textarea.value ? `${textarea.value} ${text}` : text;
                }
                try {
                    const normalized = await executionService.normalizeVoice(text);
                    if (normalized?.matched) {
                        const typeSelect = container.querySelector('#down-type');
                        if (typeSelect && normalized.downtime_type) {
                            typeSelect.value = normalized.downtime_type;
                        }
                        if (textarea && normalized.suggested_root_cause) {
                            textarea.value = `${textarea.value}\n[Sugerencia] ${normalized.suggested_root_cause}`.trim();
                        }
                    }
                } catch (error) {
                    console.warn('No se pudo normalizar dictado por voz', error);
                }
                voiceBtn.textContent = 'Dictado por Voz';
            };
            recognition.onerror = () => {
                voiceBtn.textContent = 'Dictado por Voz';
            };
            recognition.onend = () => {
                voiceBtn.textContent = 'Dictado por Voz';
            };
        });
    }

    function wireEvents() {
        container.querySelectorAll('.execution-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                state.tab = btn.dataset.tab;
                render();
            });
        });

        container.querySelector('#execution-context-asset')?.addEventListener('change', async (event) => {
            setSelectedAsset(event.target.value || '', 'execution');
            await refresh();
            render();
        });

        container.querySelector('#execution-context-clear')?.addEventListener('click', async () => {
            setSelectedAsset('', 'execution');
            await refresh();
            render();
        });

        const logForm = container.querySelector('#log-form');
        if (logForm) {
            logForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const payload = {
                    asset_id: container.querySelector('#log-asset').value,
                    shift: container.querySelector('#log-shift').value,
                    event_type: container.querySelector('#log-event').value,
                    operator_id: container.querySelector('#log-operator').value || null,
                    quantity_produced: container.querySelector('#log-qty').value ? Number(container.querySelector('#log-qty').value) : null,
                    notes: container.querySelector('#log-notes').value || null
                };
                setSelectedAsset(payload.asset_id, 'execution');
                await executionService.createLog(payload);
                await refresh();
                render();
            });
        }

        container.querySelectorAll('[data-del-log]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const logId = btn.dataset.delLog;
                if (!logId) return;
                if (!confirm('Deseas eliminar este evento de bitacora?')) return;
                try {
                    await executionService.deleteLog(logId);
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo eliminar el evento: ${error.message}`);
                }
            });
        });

        const downtimeForm = container.querySelector('#downtime-form');
        if (downtimeForm) {
            downtimeForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const payload = {
                    asset_id: container.querySelector('#down-asset').value,
                    downtime_type: container.querySelector('#down-type').value,
                    diagnosis: container.querySelector('#down-diagnosis').value || null
                };
                setSelectedAsset(payload.asset_id, 'execution');
                await executionService.createDowntime(payload);
                await refresh();
                render();
            });
        }

        container.querySelectorAll('.close-down').forEach(btn => {
            btn.addEventListener('click', async () => {
                const rootCause = prompt('Causa raiz (opcional):') || null;
                await executionService.closeDowntime(btn.dataset.closeId, { root_cause: rootCause });
                await refresh();
                render();
            });
        });

        container.querySelectorAll('[data-del-down]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const eventId = btn.dataset.delDown;
                if (!eventId) return;
                if (!confirm('Deseas eliminar este evento de paro?')) return;
                try {
                    await executionService.deleteDowntime(eventId);
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo eliminar el paro: ${error.message}`);
                }
            });
        });

        const operatorForm = container.querySelector('#operator-form');
        if (operatorForm) {
            operatorForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const payload = {
                    employee_code: container.querySelector('#op-code').value,
                    full_name: container.querySelector('#op-name').value,
                    default_area_id: container.querySelector('#op-area').value || null,
                    shift: container.querySelector('#op-shift').value
                };
                if (payload.default_area_id) {
                    setSelectedAsset(payload.default_area_id, 'execution');
                }
                await executionService.createOperator(payload);
                await refresh();
                render();
            });
        }

        const skillForm = container.querySelector('#skill-form');
        if (skillForm) {
            skillForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const payload = {
                    operator_id: container.querySelector('#skill-operator').value,
                    activity_id: container.querySelector('#skill-activity').value,
                    skill_level: Number(container.querySelector('#skill-level').value)
                };
                await executionService.createSkill(payload);
                await refresh();
                render();
            });
        }

        container.querySelectorAll('.toggle-op').forEach(btn => {
            btn.addEventListener('click', async () => {
                await executionService.updateOperator(btn.dataset.opToggle, { is_active: btn.dataset.opState === 'true' });
                await refresh();
                render();
            });
        });

        container.querySelectorAll('[data-del-op]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const operatorId = btn.dataset.delOp;
                if (!operatorId) return;
                if (!confirm('Deseas eliminar este operario?')) return;
                try {
                    await executionService.deleteOperator(operatorId);
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo eliminar el operario: ${error.message}`);
                }
            });
        });

        container.querySelectorAll('[data-del-skill]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const skillId = btn.dataset.delSkill;
                if (!skillId) return;
                if (!confirm('Deseas eliminar esta habilidad?')) return;
                try {
                    await executionService.deleteSkill(skillId);
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo eliminar la habilidad: ${error.message}`);
                }
            });
        });

        const assignmentForm = container.querySelector('#assignment-form');
        if (assignmentForm) {
            assignmentForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                try {
                    const selectedAsset = container.querySelector('#assign-asset').value;
                    setSelectedAsset(selectedAsset, 'execution');
                    await executionService.createAssignment({
                        operator_id: container.querySelector('#assign-operator').value,
                        asset_id: selectedAsset,
                        shift: container.querySelector('#assign-shift').value,
                        notes: container.querySelector('#assign-notes').value || null
                    });
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo crear la asignación: ${error.message}`);
                }
            });
        }

        container.querySelectorAll('[data-close-assignment]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                try {
                    await executionService.closeAssignment(btn.dataset.closeAssignment, {});
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo cerrar la asignación: ${error.message}`);
                }
            });
        });

        container.querySelectorAll('[data-del-assignment]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm('Deseas eliminar esta asignacion?')) return;
                try {
                    await executionService.deleteAssignment(btn.dataset.delAssignment);
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo eliminar la asignación: ${error.message}`);
                }
            });
        });

        const shiftPlanForm = container.querySelector('#shift-plan-form');
        if (shiftPlanForm) {
            shiftPlanForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                try {
                    const selectedAsset = container.querySelector('#plan-asset').value;
                    setSelectedAsset(selectedAsset, 'execution');
                    await executionService.createShiftPlan({
                        plan_date: container.querySelector('#plan-date').value,
                        shift: container.querySelector('#plan-shift').value,
                        asset_id: selectedAsset,
                        operator_id: container.querySelector('#plan-operator').value || null,
                        target_quantity: container.querySelector('#plan-target').value ? Number(container.querySelector('#plan-target').value) : null,
                        notes: container.querySelector('#plan-notes').value || null
                    });
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo guardar el plan de turno: ${error.message}`);
                }
            });
        }

        container.querySelector('#shift-template')?.addEventListener('click', async () => {
            try {
                await downloadExecutionFile('/execution/shifts/plans/template', 'takta_shift_plan_template.xlsx');
            } catch (error) {
                uiFeedback.error(`No se pudo descargar plantilla: ${error.message}`);
            }
        });

        container.querySelector('#shift-export')?.addEventListener('click', async () => {
            try {
                await downloadExecutionFile('/execution/shifts/plans/export', 'takta_shift_plans_export.xlsx');
            } catch (error) {
                uiFeedback.error(`No se pudo exportar planes: ${error.message}`);
            }
        });

        container.querySelector('#shift-bulk-submit')?.addEventListener('click', async () => {
            const raw = container.querySelector('#shift-bulk-text')?.value || '';
            try {
                const plans = parseShiftPlanBulk(raw);
                if (!plans.length) {
                    uiFeedback.warning('No hay lineas para importar.');
                    return;
                }
                await executionService.bulkShiftPlans({ plans });
                await refresh();
                render();
            } catch (error) {
                uiFeedback.error(`No se pudo procesar carga masiva: ${error.message}`);
            }
        });

        container.querySelectorAll('[data-del-shift-plan]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm('Deseas eliminar este plan de turno?')) return;
                try {
                    await executionService.deleteShiftPlan(btn.dataset.delShiftPlan);
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo eliminar plan: ${error.message}`);
                }
            });
        });

        const contextRuleForm = container.querySelector('#context-rule-form');
        if (contextRuleForm) {
            contextRuleForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                try {
                    const role = container.querySelector('#rule-role').value || null;
                    const shift = container.querySelector('#rule-shift').value || null;
                    const assetId = container.querySelector('#rule-asset').value || null;
                    const priority = Number(container.querySelector('#rule-priority').value || 100);
                    const lineName = container.querySelector('#rule-line-name').value?.trim() || null;
                    const context = lineName ? { line_name: lineName } : {};
                    if (assetId) {
                        setSelectedAsset(assetId, 'execution');
                    }
                    await executionService.createContextRule({
                        role,
                        shift,
                        asset_id: assetId,
                        priority,
                        context,
                        is_active: true
                    });
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo crear la regla: ${error.message}`);
                }
            });
        }

        container.querySelectorAll('[data-del-rule]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm('Deseas eliminar esta regla de contexto?')) return;
                try {
                    await executionService.deleteContextRule(btn.dataset.delRule);
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo eliminar la regla: ${error.message}`);
                }
            });
        });

        const failureForm = container.querySelector('#failure-form');
        if (failureForm) {
            failureForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                try {
                    const keywords = (container.querySelector('#failure-keywords').value || '')
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean);
                    await executionService.createFailureCatalog({
                        code: container.querySelector('#failure-code').value?.trim(),
                        name: container.querySelector('#failure-name').value?.trim(),
                        keywords,
                        downtime_type: container.querySelector('#failure-type').value || null,
                        suggested_root_cause: container.querySelector('#failure-root-cause').value?.trim() || null,
                        severity: null,
                        is_active: true
                    });
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo crear item de catálogo: ${error.message}`);
                }
            });
        }

        container.querySelectorAll('[data-del-failure]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm('Deseas eliminar este item del catalogo?')) return;
                try {
                    await executionService.deleteFailureCatalog(btn.dataset.delFailure);
                    await refresh();
                    render();
                } catch (error) {
                    uiFeedback.error(`No se pudo eliminar item: ${error.message}`);
                }
            });
        });

        wireVoiceButton();
    }

    try {
        await bootstrapData();
        render();
    } catch (error) {
        container.innerHTML = `<div class="p-6 bg-red-50 text-red-600 rounded-lg border border-red-100">Error cargando modulo de ejecucion: ${error.message}</div>`;
    }

    return container;
}

export default ExecutionPage;













