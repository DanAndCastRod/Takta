const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const CRUD_SCHEMA = [
    {
        module: 'Activos',
        route: '#/assets',
        resources: [
            { name: 'Árbol de activos', create: 'POST /api/assets', read: 'GET /api/assets | /api/assets/tree', update: 'PATCH /api/assets/{id}', delete: 'DELETE /api/assets/{id}' },
            { name: 'Importación/Exportación XLSX', create: 'POST /api/assets/xlsx/import', read: 'GET /api/assets/xlsx/template | /xlsx/export', update: 'N/A', delete: 'N/A' },
        ],
    },
    {
        module: 'Ingeniería',
        route: '#/engineering',
        resources: [
            { name: 'Actividades', create: 'POST /api/engineering/activities', read: 'GET /api/engineering/activities', update: 'PATCH /api/engineering/activities/{id}', delete: 'DELETE /api/engineering/activities/{id}' },
            { name: 'Referencias SKU', create: 'POST /api/engineering/references', read: 'GET /api/engineering/references', update: 'PATCH /api/engineering/references/{id}', delete: 'DELETE /api/engineering/references/{id}' },
            { name: 'Estándares', create: 'POST /api/engineering/standards', read: 'GET /api/engineering/standards', update: 'PATCH /api/engineering/standards/{id}', delete: 'DELETE /api/engineering/standards/{id}' },
        ],
    },
    {
        module: 'Muestreo de Peso',
        route: '#/weight-sampling',
        resources: [
            { name: 'Especificaciones de peso', create: 'POST /api/quality/weight-specs', read: 'GET /api/quality/weight-specs', update: 'PATCH /api/quality/weight-specs/{id}', delete: 'DELETE /api/quality/weight-specs/{id}' },
            { name: 'Muestras de peso', create: 'POST /api/quality/weight-specs/{id}/samples', read: 'GET /api/quality/weight-specs/{id}/samples | /summary', update: 'PATCH /api/quality/weight-samples/{id}', delete: 'DELETE /api/quality/weight-samples/{id}' },
            { name: 'SPC y capacidad', create: 'POST /api/quality/weight-specs/{id}/spc/capability/runs | /spc/capability/runs/batch', read: 'GET /api/quality/weight-specs/{id}/spc/chart | /spc/capability | /spc/capability/trend', update: 'N/A', delete: 'N/A' },
            { name: 'No conformidades y CAPA', create: 'POST /api/quality/non-conformities | /{id}/capa-actions', read: 'GET /api/quality/non-conformities | /capa/dashboard', update: 'PATCH /api/quality/non-conformities/{id} | /capa-actions/{id}', delete: 'DELETE /api/quality/non-conformities/{id} | /capa-actions/{id}' },
            { name: 'Carga/descarga XLSX', create: 'POST /api/quality/weights/xlsx/import', read: 'GET /api/quality/weights/xlsx/template | /export', update: 'N/A', delete: 'N/A' },
        ],
    },
    {
        module: 'Cronómetro',
        route: '#/timing',
        resources: [
            { name: 'Estudios de tiempo', create: 'POST /api/engineering/studies', read: 'GET /api/engineering/studies | /{id}', update: 'POST /sessions | /laps | PATCH /laps/{id}', delete: 'DELETE /api/engineering/studies/{id}' },
            { name: 'Work sampling', create: 'POST /api/engineering/studies/{id}/work-samples', read: 'GET /work-samples | /work-sampling/results', update: 'N/A', delete: 'N/A' },
        ],
    },
    {
        module: 'Capacidad',
        route: '#/capacity',
        resources: [
            { name: 'Capacidad y precedencias', create: 'POST /api/engineering/precedence/dependencies', read: 'GET /capacity/{asset} | /precedence', update: 'N/A', delete: 'DELETE /api/engineering/precedence/dependencies/{id}' },
            { name: 'Staffing avanzado', create: 'POST /api/engineering/capacity/{asset}/staffing/advanced', read: 'GET /staffing/history', update: 'N/A', delete: 'N/A' },
        ],
    },
    {
        module: 'Ejecución',
        route: '#/execution',
        resources: [
            { name: 'Bitácora', create: 'POST /api/execution/logs', read: 'GET /api/execution/logs', update: 'N/A', delete: 'DELETE /api/execution/logs/{id}' },
            { name: 'Paros', create: 'POST /api/execution/downtimes', read: 'GET /api/execution/downtimes', update: 'PATCH /api/execution/downtimes/{id}/close', delete: 'DELETE /api/execution/downtimes/{id}' },
            { name: 'Operarios y skills', create: 'POST /api/execution/staff/operators | /skills', read: 'GET /operators | /{id}/skills', update: 'PATCH /operators/{id} | /skills/{id}', delete: 'DELETE /operators/{id} | /skills/{id}' },
        ],
    },
    {
        module: 'Excelencia',
        route: '#/excellence',
        resources: [
            { name: 'Acciones de mejora', create: 'POST /api/ci/actions', read: 'GET /api/ci/actions | /workflow', update: 'PATCH /api/ci/actions/{id}', delete: 'DELETE /api/ci/actions/{id}' },
            { name: 'Auditorías 5S', create: 'POST /api/audits | /api/audits/advanced', read: 'GET /api/audits | /radar/comparison', update: 'N/A', delete: 'DELETE /api/audits/{id}' },
            { name: 'KPI MC', create: 'PUT /api/ci/kpis/mc/measurements', read: 'GET /api/ci/kpis/mc/catalog | /scorecard', update: 'PATCH /api/ci/kpis/mc/catalog/{id}', delete: 'DELETE /api/ci/kpis/mc/measurements/{id}' },
            { name: 'Kanban y VSM', create: 'POST /api/logistics/kanban/calculate | /vsm/canvases', read: 'GET /kanban/loops | /vsm/canvases', update: 'PATCH /api/logistics/vsm/canvases/{id}', delete: 'DELETE /api/logistics/kanban/loops/{id} | /vsm/canvases/{id}' },
        ],
    },
    {
        module: 'Actas IP',
        route: '#/meetings',
        resources: [
            { name: 'Actas y compromisos', create: 'POST /api/meetings/records', read: 'GET /api/meetings/records | /dashboard', update: 'PATCH /api/meetings/records/{id}', delete: 'DELETE /api/meetings/records/{id}' },
            { name: 'Integración NC/CAPA', create: 'POST /api/meetings/records/{id}/sync-quality-commitments', read: 'GET /api/meetings/quality/issues', update: 'N/A', delete: 'N/A' },
        ],
    },
    {
        module: 'Documentos',
        route: '#/documents',
        resources: [
            { name: 'Templates', create: 'POST /api/templates/ingest', read: 'GET /api/templates', update: 'N/A', delete: 'N/A' },
            { name: 'Documentos', create: 'POST /api/documents | /autosave', read: 'GET /api/documents | /render', update: 'PATCH /api/documents/{id}', delete: 'DELETE /api/documents/{id}' },
        ],
    },
    {
        module: 'Diagram Studio',
        route: '#/plant-editor',
        resources: [
            { name: 'Layouts/diagramas', create: 'POST /api/plant-layouts', read: 'GET /api/plant-layouts | /{id}', update: 'PUT /api/plant-layouts/{id}', delete: 'DELETE /api/plant-layouts/{id}' },
        ],
    },
];

const JOURNEY_PLAYBOOK = [
    {
        role: 'Ingeniería de procesos',
        title: 'Definir estándar nuevo',
        objective: 'Crear referencia y estándar para operación.',
        steps: ['Activos', 'Ingeniería', 'Cronómetro'],
        route: '#/engineering',
    },
    {
        role: 'Ingeniería de procesos',
        title: 'Cerrar brecha de capacidad',
        objective: 'Evaluar precedencias y plan de staffing.',
        steps: ['Activos', 'Capacidad', 'Excelencia'],
        route: '#/capacity',
    },
    {
        role: 'Calidad',
        title: 'Muestreo + SPC + NC',
        objective: 'Capturar muestra, detectar desvío y abrir NC/CAPA.',
        steps: ['Muestreo de peso', 'Actas IP', 'Excelencia'],
        route: '#/weight-sampling',
    },
    {
        role: 'Calidad',
        title: 'Seguimiento de CAPA',
        objective: 'Controlar avance de acciones y vencimientos.',
        steps: ['Muestreo de peso', 'Actas IP'],
        route: '#/meetings',
    },
    {
        role: 'Líder de mejora',
        title: 'Comité KPI MC',
        objective: 'Actualizar cumplimiento y decidir acciones.',
        steps: ['Excelencia', 'Actas IP', 'Documentos'],
        route: '#/excellence?tab=kpi-mc',
    },
    {
        role: 'Líder de mejora',
        title: 'Auditoría 5S + plan',
        objective: 'Registrar auditoría y generar plan de mejora.',
        steps: ['Excelencia', 'Actas IP'],
        route: '#/excellence?tab=audits',
    },
    {
        role: 'Operación',
        title: 'Bitácora de turno',
        objective: 'Registrar eventos de ejecución y paros.',
        steps: ['Ejecución', 'Excelencia'],
        route: '#/execution',
    },
    {
        role: 'Operación',
        title: 'Gestión de skills',
        objective: 'Actualizar matriz de habilidades y asignaciones.',
        steps: ['Ejecución', 'Capacidad'],
        route: '#/execution?tab=staff',
    },
    {
        role: 'Documentación',
        title: 'Generar documento técnico',
        objective: 'Crear y versionar documento vinculado a activo.',
        steps: ['Editor docs', 'Documentos'],
        route: '#/editor',
    },
    {
        role: 'Ingeniería visual',
        title: 'Diagrama operativo',
        objective: 'Diseñar layout y asociar elementos de planta.',
        steps: ['Diagram Studio', 'Activos', 'Actas IP'],
        route: '#/plant-editor',
    },
];

function opCell(value) {
    const enabled = value && value !== 'N/A';
    return `<td class="px-3 py-2 text-xs ${enabled ? 'text-slate-700' : 'text-slate-400'}">${value}</td>`;
}

function renderSchemaTables() {
    return CRUD_SCHEMA.map((schema) => `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-800">${schema.module}</h3>
                <a href="${schema.route}" class="text-xs px-2 py-1 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors">Abrir módulo</a>
            </div>
            <div class="overflow-auto">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-50 text-slate-600">
                        <tr>
                            <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Recurso</th>
                            <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Create</th>
                            <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Read</th>
                            <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Update</th>
                            <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Delete</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${schema.resources.map((resource) => `
                            <tr>
                                <td class="px-3 py-2 text-sm font-medium text-slate-800">${resource.name}</td>
                                ${opCell(resource.create)}
                                ${opCell(resource.read)}
                                ${opCell(resource.update)}
                                ${opCell(resource.delete)}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

function renderJourneyCards() {
    return JOURNEY_PLAYBOOK.map((journey) => `
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-[11px] uppercase tracking-wide text-slate-500">${journey.role}</p>
            <h3 class="mt-1 text-sm font-semibold text-slate-800">${journey.title}</h3>
            <p class="mt-1 text-xs text-slate-600">${journey.objective}</p>
            <p class="mt-2 text-[11px] text-slate-500">Flujo: ${journey.steps.join(' -> ')}</p>
            <a href="${journey.route}" class="mt-3 inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100">Iniciar flujo</a>
        </article>
    `).join('');
}

function metricCount(result) {
    if (typeof result === 'string') return result;
    if (result?.__error) return 'ERR';
    if (result?.totals && typeof result.totals.weighted_kpi_result_pct === 'number') {
        return `${Number(result.totals.weighted_kpi_result_pct).toFixed(1)}%`;
    }
    if (Array.isArray(result)) return result.length;
    return '-';
}

function getAuthHeaders() {
    const token = localStorage.getItem('takta_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function safeMetricGet(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'GET', headers: getAuthHeaders() });
        if (!response.ok) return { __error: true };
        return await response.json();
    } catch {
        return { __error: true };
    }
}

async function DashboardPage(user) {
    const container = document.createElement('div');
    container.className = 'p-4 md:p-6 max-w-7xl mx-auto space-y-6';

    container.innerHTML = `
        <div class="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
            <h1 class="text-2xl font-bold">Dashboard</h1>
            <p class="text-slate-200 text-sm mt-1">Bienvenido, ${user?.display_name || user?.username || 'usuario'}.</p>
            <p class="text-slate-300 text-xs mt-2">Estado operativo y cobertura CRUD de módulos v1.</p>
            <div class="mt-4 flex flex-wrap gap-2">
                <a href="#/assets" class="px-3 py-1.5 text-xs rounded-md bg-white/15 hover:bg-white/25 text-white border border-white/20">Activos</a>
                <a href="#/engineering" class="px-3 py-1.5 text-xs rounded-md bg-white/15 hover:bg-white/25 text-white border border-white/20">Ingeniería</a>
                <a href="#/weight-sampling" class="px-3 py-1.5 text-xs rounded-md bg-white/15 hover:bg-white/25 text-white border border-white/20">Muestreo peso</a>
                <a href="#/excellence" class="px-3 py-1.5 text-xs rounded-md bg-white/15 hover:bg-white/25 text-white border border-white/20">Excelencia</a>
                <a href="#/meetings" class="px-3 py-1.5 text-xs rounded-md bg-white/15 hover:bg-white/25 text-white border border-white/20">Actas IP</a>
                <a href="#/documents" class="px-3 py-1.5 text-xs rounded-md bg-white/15 hover:bg-white/25 text-white border border-white/20">Documentos</a>
            </div>
        </div>
        <div id="dashboard-kpis" class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3"></div>
        <div>
            <h2 class="text-lg font-semibold text-slate-900 mb-3">Journeys sugeridos por rol</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">${renderJourneyCards()}</div>
        </div>
        <div>
            <h2 class="text-lg font-semibold text-slate-900 mb-3">Cobertura CRUD por módulo</h2>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">${renderSchemaTables()}</div>
        </div>
    `;

    const kpiContainer = container.querySelector('#dashboard-kpis');
    const metrics = await Promise.all([
        safeMetricGet('/assets?limit=1000'),
        safeMetricGet('/engineering/activities'),
        safeMetricGet('/engineering/standards'),
        safeMetricGet('/quality/weight-specs'),
        safeMetricGet('/engineering/studies'),
        safeMetricGet('/execution/staff/operators'),
        safeMetricGet('/execution/downtimes?limit=200'),
        safeMetricGet('/ci/actions'),
        safeMetricGet('/audits'),
        safeMetricGet('/logistics/kanban/loops'),
        safeMetricGet('/meetings/records'),
        safeMetricGet('/documents'),
        safeMetricGet('/plant-layouts'),
        safeMetricGet('/ci/kpis/mc/scorecard'),
        safeMetricGet('/platform/integration/health/latest'),
        safeMetricGet('/platform/operations/security/isolation-check'),
    ]);

    const cards = [
        ['Activos', metrics[0]],
        ['Actividades', metrics[1]],
        ['Estándares', metrics[2]],
        ['Specs peso', metrics[3]],
        ['Estudios', metrics[4]],
        ['Operarios', metrics[5]],
        ['Paros', metrics[6]],
        ['Acciones', metrics[7]],
        ['Auditorías', metrics[8]],
        ['Kanban', metrics[9]],
        ['Actas IP', metrics[10]],
        ['Documentos', metrics[11]],
        ['Layouts', metrics[12]],
        ['KPI MC', metrics[13]],
        ['Salud Integración', metrics[14]?.status?.toUpperCase?.() || metricCount(metrics[14])],
        ['Aislamiento', metrics[15]?.status?.toUpperCase?.() || metricCount(metrics[15])],
    ];

    kpiContainer.innerHTML = cards.map(([label, metric]) => {
        const value = metricCount(metric);
        const style = value === 'ERR' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-800';
        return `
            <div class="rounded-xl border p-3 ${style}">
                <p class="text-[11px] uppercase tracking-wide">${label}</p>
                <p class="text-2xl font-bold mt-1">${value}</p>
            </div>
        `;
    }).join('');

    return container;
}

export default DashboardPage;
