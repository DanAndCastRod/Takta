function esc(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

const VALUE_PILLARS = [
    {
        title: 'Captura operacional',
        description: 'Registra datos de piso, peso, tiempos y eventos sin romper el flujo del equipo.',
    },
    {
        title: 'Diagnostico integrado',
        description: 'Cruza calidad, ejecucion, excelencia y reuniones con un contexto canonico por activo/SKU/estandar.',
    },
    {
        title: 'Decision accionable',
        description: 'Convierte desviaciones en acciones, CAPA, compromisos y seguimiento con trazabilidad completa.',
    },
];

const MODULE_CATALOG = [
    { name: 'Activos', route: '#/assets', tag: 'Base', description: 'Jerarquia de sede, planta, area, linea, maquina y puesto.' },
    { name: 'Ingenieria', route: '#/engineering', tag: 'Core', description: 'Referencias, actividades y estandares operativos.' },
    { name: 'Cronometro', route: '#/timing', tag: 'Core', description: 'Estudios de tiempo y work sampling para estandarizacion.' },
    { name: 'Capacidad', route: '#/capacity', tag: 'Core', description: 'Modelado de precedencias, cuellos y staffing.' },
    { name: 'Ejecucion', route: '#/execution', tag: 'Operacion', description: 'Bitacora, paros, turnos, skills y asignaciones.' },
    { name: 'Muestreo de peso', route: '#/weight-sampling', tag: 'Calidad', description: 'SPC, capacidad, no conformidades y CAPA.' },
    { name: 'Excelencia', route: '#/excellence', tag: 'Mejora', description: 'KPI MC, acciones, auditorias 5S, Kanban y VSM.' },
    { name: 'Actas IP', route: '#/meetings', tag: 'Gobernanza', description: 'Actas de comite, compromisos y sincronizacion calidad.' },
    { name: 'Documentos', route: '#/documents', tag: 'Conocimiento', description: 'Repositorio y trazabilidad de documentos creados.' },
    { name: 'Editor Docs', route: '#/editor', tag: 'Conocimiento', description: 'Editor tecnico con plantillas por proceso.' },
    { name: 'Diagram Studio', route: '#/plant-editor', tag: 'Visual', description: 'Diagramas operativos, layout y simulacion de flujo.' },
    { name: 'Configuracion', route: '#/settings', tag: 'Plataforma', description: 'White label, integracion, eventos, PWA y offline queue.' },
];

const USER_GUIDE = [
    {
        id: 'inicio',
        title: '1) Inicio rapido',
        audience: 'Todos los usuarios',
        objective: 'Entrar a Takta y comenzar con un flujo productivo en menos de 5 minutos.',
        steps: [
            'Abrir login en #/login y autenticar con tu perfil.',
            'Revisar Dashboard para validar estado de modulos y atajos por rol.',
            'Definir contexto global (activo, SKU y estandar) desde la barra superior.',
            'Entrar al modulo objetivo y confirmar que el breadcrumb de contexto este visible.',
        ],
        checks: [
            'Sin errores 401/403 en llamadas principales.',
            'Tenant activo visible en configuracion.',
            'Sincronizacion online/offline visible en navbar.',
        ],
    },
    {
        id: 'activos',
        title: '2) Gestion de arbol de activos',
        audience: 'Ingenieria, Operacion, Admin',
        objective: 'Construir y mantener la estructura operativa de planta.',
        steps: [
            'Ir a #/assets y crear activo raiz por planta o sede.',
            'Agregar nodos hijos (area, linea, maquina, puesto) desde el detalle del activo.',
            'Editar metadatos criticos: nombre, tipo, descripcion.',
            'Usar plantilla XLSX para carga masiva y exportar para respaldo.',
        ],
        checks: [
            'La jerarquia refleja la estructura real del proceso.',
            'No existen nodos huerfanos despues de importacion.',
            'Los activos criticos se usan como contexto en otros modulos.',
        ],
    },
    {
        id: 'ingenieria',
        title: '3) Ingenieria de referencias, actividades y estandares',
        audience: 'Ingenieria de procesos',
        objective: 'Definir la base tecnica del proceso para operacion y mejora.',
        steps: [
            'Crear referencias SKU y definir unidad de medida y unidad de embalaje.',
            'Registrar actividades con tipo y bandera de valor agregado.',
            'Asignar estandares vinculando activo + actividad + SKU.',
            'Descargar/subir plantillas XLSX para alta o ajuste masivo.',
        ],
        checks: [
            'Cada estandar tiene tiempo y frecuencia definidos.',
            'Actividades activas y estandares vigentes en contexto canonico.',
            'Sin duplicidad de codigos SKU.',
        ],
    },
    {
        id: 'timing',
        title: '4) Cronometro y estudios de tiempo',
        audience: 'Ingenieria de procesos',
        objective: 'Medir y validar tiempos reales para estandarizacion.',
        steps: [
            'Crear estudio seleccionando activo, referencia y proceso.',
            'Iniciar sesion de cronometro y registrar laps por actividad.',
            'Corregir laps atipicos y cerrar estudio.',
            'Usar work sampling para validar distribucion de tiempo VA/NVA.',
        ],
        checks: [
            'Estudio con fecha, responsable y muestra suficientes.',
            'Resultados usados para actualizar estandar.',
            'No quedan sesiones abiertas sin cierre.',
        ],
    },
    {
        id: 'capacidad',
        title: '5) Capacidad, precedencias y staffing',
        audience: 'Ingenieria, Lider de operacion',
        objective: 'Detectar restricciones y definir capacidad objetivo por celda.',
        steps: [
            'Cargar dependencias de precedencia entre actividades.',
            'Calcular capacidad por activo con supuestos de turno.',
            'Comparar escenarios de staffing avanzado.',
            'Publicar resultado para consumo de ejecucion y excelencia.',
        ],
        checks: [
            'Cuello de botella identificado por linea.',
            'Supuestos de personal y turno documentados.',
            'Historial de corridas disponible para auditoria.',
        ],
    },
    {
        id: 'ejecucion',
        title: '6) Ejecucion de piso y disciplina operativa',
        audience: 'Supervision, lideres de turno',
        objective: 'Registrar operacion diaria y reaccionar ante incidentes.',
        steps: [
            'Registrar logs de turno y eventos de produccion.',
            'Abrir y cerrar paros con causa y diagnostico.',
            'Administrar operarios, skills y asignaciones.',
            'Cargar plan de turno por plantilla XLSX cuando aplique.',
        ],
        checks: [
            'Paros abiertos siempre con responsable y seguimiento.',
            'Skills actualizadas para asignacion realista.',
            'Datos de turno disponibles para mejora continua.',
        ],
    },
    {
        id: 'peso',
        title: '8) Muestreo de peso, SPC y CAPA',
        audience: 'Calidad, operacion, mejora continua',
        objective: 'Controlar variacion del proceso y activar respuesta formal.',
        steps: [
            'Crear especificacion de peso (g/kg) con limites y objetivo.',
            'Registrar muestras durante el turno o por lote.',
            'Revisar cartas I-MR, reglas de Western Electric y capacidad Cp/Cpk.',
            'Abrir no conformidad y acciones CAPA cuando exista desvio.',
        ],
        checks: [
            'Tendencia SPC visible para decisiones de corto plazo.',
            'NC y CAPA vinculadas a activo/SKU/proceso.',
            'Compromisos sincronizados con Actas IP.',
        ],
    },
    {
        id: 'excelencia',
        title: '8) Excelencia: KPI MC, acciones y VSM',
        audience: 'Mejora continua, jefaturas',
        objective: 'Gestionar cumplimiento estrategico y cierre de brechas.',
        steps: [
            'Actualizar mediciones KPI MC por periodo.',
            'Monitorear scorecard ponderado individual y KPI.',
            'Crear y mover acciones de mejora en workflow formal.',
            'Usar Kanban/VSM para rediseño de flujo y eliminacion de desperdicio.',
        ],
        checks: [
            'Pesos KPI cerrados y sin pendientes.',
            'Acciones con owner, fecha y estado de workflow.',
            'Tendencia KPI y alertas visibles para comite.',
        ],
    },
    {
        id: 'meetings',
        title: '9) Actas de ingenieria de procesos',
        audience: 'Comites tecnicos y lideres',
        objective: 'Alinear objetivos, alcances, decisiones y compromisos de cada sesion.',
        steps: [
            'Crear acta con objetivo, alcance, riesgos y participantes.',
            'Registrar decisiones clave y acuerdos.',
            'Materializar acciones y sincronizar issues NC/CAPA.',
            'Conectar el acta con KPI MC y documentos de soporte.',
        ],
        checks: [
            'Cada acta contiene fecha, estado y proxima reunion.',
            'Compromisos con responsable y fecha compromiso.',
            'Historico listo para auditoria y seguimiento.',
        ],
    },
    {
        id: 'docs',
        title: '10) Documentos y editor tecnico',
        audience: 'Ingenieria, calidad, documentacion',
        objective: 'Centralizar conocimiento tecnico versionado.',
        steps: [
            'En Editor Docs crear documento desde plantilla.',
            'Relacionar documento con activo/SKU/estandar cuando aplique.',
            'Guardar y luego validar listado en #/documents.',
            'Usar filtros por plantilla, activo y autor para recuperar historial.',
        ],
        checks: [
            'Documentos creados visibles en modulo Documentos.',
            'Sin documentos huerfanos de contexto critico.',
            'Plantillas base actualizadas desde configuracion.',
        ],
    },
    {
        id: 'diagram',
        title: '11) Diagram Studio y simulacion de flujo',
        audience: 'Ingenieria visual y mejora',
        objective: 'Diseñar diagramas operativos y evaluar presion de flujo.',
        steps: [
            'Abrir #/plant-editor y cargar libreria de elementos.',
            'Construir layout, capas y conexiones con propiedades por elemento.',
            'Activar señales SPC/CAPA para semaforizacion por nodo.',
            'Ejecutar simulacion y comparar escenarios.',
        ],
        checks: [
            'Capas organizadas (padre/hijo) y nombres claros.',
            'Conectores con origen/destino de activo.',
            'Resultados de simulacion exportables para decision.',
        ],
    },
    {
        id: 'platform',
        title: '12) Configuracion, white label, PWA y soporte',
        audience: 'Admin de plataforma',
        objective: 'Mantener plataforma, identidad y confiabilidad operacional.',
        steps: [
            'Configurar branding por tenant y feature flags.',
            'Ejecutar validacion de salud de integracion.',
            'Gestionar cola offline y conflictos desde settings.',
            'Aplicar actualizaciones PWA cuando exista nueva version.',
        ],
        checks: [
            'Estado de integracion sin errores criticos.',
            'Queue offline en cero despues de sincronizar.',
            'Eventos de observabilidad disponibles para auditoria.',
        ],
    },
];

function parseHashQuery() {
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) return new URLSearchParams('');
    return new URLSearchParams(hash.slice(qIndex + 1));
}

function renderGuideSection(section) {
    return `
        <article id="guide-${section.id}" data-doc-id="${section.id}" data-doc-search="${esc(
            `${section.title} ${section.audience} ${section.objective} ${section.steps.join(' ')} ${section.checks.join(' ')}`,
        )}" class="tk-card p-5 md:p-6 scroll-mt-24">
            <header class="mb-4">
                <p class="text-xs font-semibold uppercase tracking-wider text-brand-orange">${esc(section.audience)}</p>
                <h3 class="text-lg md:text-xl font-semibold text-slate-900 mt-1">${esc(section.title)}</h3>
                <p class="text-sm text-slate-600 mt-2">${esc(section.objective)}</p>
            </header>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Pasos recomendados</p>
                    <ol class="space-y-2">
                        ${section.steps.map((step) => `
                            <li class="flex items-start gap-2 text-sm text-slate-700">
                                <span class="mt-0.5 inline-flex w-5 h-5 flex-none items-center justify-center rounded-full bg-cyan-100 text-cyan-700 text-[11px] font-semibold">•</span>
                                <span>${esc(step)}</span>
                            </li>
                        `).join('')}
                    </ol>
                </div>
                <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Checklist de validacion</p>
                    <ul class="space-y-2">
                        ${section.checks.map((item) => `
                            <li class="text-sm text-slate-700 flex items-start gap-2">
                                <span class="mt-1 h-2 w-2 rounded-full bg-emerald-500 flex-none"></span>
                                <span>${esc(item)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        </article>
    `;
}

async function LandingPage(options = {}) {
    const user = options.user || null;
    const initialMode = options.mode === 'docs' ? 'docs' : 'landing';
    const query = parseHashQuery();
    const sectionFromQuery = query.get('section');

    const container = document.createElement('div');
    container.className = 'min-h-full bg-slate-50';

    const primaryCta = user
        ? { route: '#/', label: 'Ir al dashboard' }
        : { route: '#/login', label: 'Iniciar sesion' };

    container.innerHTML = `
        <div class="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
            <div class="absolute inset-0 opacity-30 pointer-events-none" style="background-image: radial-gradient(circle at 20% 20%, rgba(0,184,212,0.26), transparent 42%), radial-gradient(circle at 80% 10%, rgba(56,189,248,0.18), transparent 35%);"></div>
            <div class="relative max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
                <div class="flex flex-wrap items-center gap-3 mb-6">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-white/10 text-cyan-200 border border-white/20">Takta Ecosystem</span>
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-white/10 text-sky-200 border border-white/20">Industria · Mejora Continua · Calidad</span>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                    <div class="lg:col-span-7">
                        <h1 class="text-3xl md:text-5xl font-semibold leading-tight tracking-tight">Takta integra captura, diagnostico y centralizacion del proceso en una sola plataforma.</h1>
                        <p class="mt-4 text-sm md:text-base text-slate-200 max-w-2xl">Desde activos y estandares hasta SPC/CAPA, actas y simulacion de flujo. Todo conectado por contexto canonico para ejecutar mejora continua con evidencia real.</p>
                        <div class="mt-6 flex flex-wrap gap-3">
                            <a href="${primaryCta.route}" class="tk-btn-primary px-5 py-2.5 text-sm shadow-lg shadow-cyan-900/25">${primaryCta.label}</a>
                            <a href="#/docs" class="px-5 py-2.5 rounded-lg border border-white/30 bg-white/10 text-sm font-semibold text-white hover:bg-white/20 transition-colors">Abrir guia de usuario</a>
                        </div>
                    </div>
                    <div class="lg:col-span-5">
                        <div class="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5">
                            <p class="text-xs uppercase tracking-wide text-slate-200 mb-3">Alcance principal</p>
                            <ul class="space-y-3">
                                ${VALUE_PILLARS.map((pillar) => `
                                    <li>
                                        <p class="text-sm font-semibold text-white">${esc(pillar.title)}</p>
                                        <p class="text-xs text-slate-200 mt-1">${esc(pillar.description)}</p>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
            <div class="rounded-2xl border border-slate-200 bg-white p-2 flex gap-2 max-w-md" role="tablist" aria-label="Secciones landing">
                <button id="landing-tab-overview" type="button" class="flex-1 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white" role="tab" aria-selected="true">Visión general</button>
                <button id="landing-tab-docs" type="button" class="flex-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100" role="tab" aria-selected="false">Docs</button>
            </div>
        </div>

        <section id="landing-overview" class="max-w-7xl mx-auto px-4 md:px-8 pb-10 md:pb-14">
            <header class="mb-5">
                <h2 class="text-2xl md:text-3xl font-semibold text-slate-900">Mapa funcional del ecosistema Takta</h2>
                <p class="text-sm text-slate-600 mt-2">Cada modulo aporta datos y decisiones a un flujo unico de mejora operacional.</p>
            </header>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                ${MODULE_CATALOG.map((module) => `
                    <article class="tk-card p-4 h-full">
                        <div class="flex items-center justify-between gap-2">
                            <h3 class="text-base font-semibold text-slate-900">${esc(module.name)}</h3>
                            <span class="tk-badge bg-brand-orange/10 text-brand-orange border border-brand-orange">${esc(module.tag)}</span>
                        </div>
                        <p class="text-sm text-slate-600 mt-2">${esc(module.description)}</p>
                        <a href="${module.route}" class="inline-flex mt-4 text-sm font-semibold text-brand-orange hover:text-cyan-700">Abrir modulo</a>
                    </article>
                `).join('')}
            </div>
        </section>

        <section id="landing-docs" class="hidden max-w-7xl mx-auto px-4 md:px-8 pb-10 md:pb-14">
            <div class="mb-5">
                <h2 class="text-2xl md:text-3xl font-semibold text-slate-900">Guia de usuario completa</h2>
                <p class="text-sm text-slate-600 mt-2">Operacion estandar de Takta por modulo y rol. Usa el filtro para ir directo al punto requerido.</p>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-12 gap-5">
                <aside class="xl:col-span-4">
                    <div class="tk-card p-4 sticky top-24">
                        <label for="landing-doc-search" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Buscar en guia</label>
                        <input id="landing-doc-search" class="tk-input px-3 py-2 text-sm" placeholder="Ej: CAPA, estandares, tenant, PWA">
                        <div id="landing-doc-nav" class="mt-4 space-y-1 max-h-[55vh] overflow-auto pr-1">
                            ${USER_GUIDE.map((section) => `
                                <button type="button" data-guide-jump="${section.id}" class="w-full text-left px-2.5 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition-colors">
                                    ${esc(section.title)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </aside>
                <div id="landing-doc-sections" class="xl:col-span-8 space-y-4">
                    ${USER_GUIDE.map((section) => renderGuideSection(section)).join('')}
                </div>
            </div>
        </section>
    `;

    const tabOverview = container.querySelector('#landing-tab-overview');
    const tabDocs = container.querySelector('#landing-tab-docs');
    const overviewSection = container.querySelector('#landing-overview');
    const docsSection = container.querySelector('#landing-docs');
    const docsSearchInput = container.querySelector('#landing-doc-search');
    const docArticles = Array.from(container.querySelectorAll('[data-doc-id]'));

    function setTab(tab) {
        const docsActive = tab === 'docs';
        tabOverview.setAttribute('aria-selected', docsActive ? 'false' : 'true');
        tabDocs.setAttribute('aria-selected', docsActive ? 'true' : 'false');
        tabOverview.className = docsActive
            ? 'flex-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100'
            : 'flex-1 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white';
        tabDocs.className = docsActive
            ? 'flex-1 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white'
            : 'flex-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100';

        overviewSection.classList.toggle('hidden', docsActive);
        docsSection.classList.toggle('hidden', !docsActive);
    }

    function jumpToSection(sectionId) {
        const target = container.querySelector(`#guide-${sectionId}`);
        if (!target || target.classList.contains('hidden')) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function applyGuideFilter() {
        const queryText = String(docsSearchInput?.value || '').trim().toLowerCase();
        const navButtons = Array.from(container.querySelectorAll('[data-guide-jump]'));

        docArticles.forEach((article) => {
            const rawText = String(article.getAttribute('data-doc-search') || '').toLowerCase();
            const visible = !queryText || rawText.includes(queryText);
            article.classList.toggle('hidden', !visible);
        });

        navButtons.forEach((button) => {
            const sectionId = button.getAttribute('data-guide-jump');
            const article = container.querySelector(`#guide-${sectionId}`);
            const visible = article && !article.classList.contains('hidden');
            button.classList.toggle('hidden', !visible);
        });
    }

    tabOverview?.addEventListener('click', () => setTab('landing'));
    tabDocs?.addEventListener('click', () => setTab('docs'));

    docsSearchInput?.addEventListener('input', () => {
        applyGuideFilter();
    });

    container.querySelectorAll('[data-guide-jump]').forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-guide-jump');
            setTab('docs');
            jumpToSection(targetId);
        });
    });

    setTab(initialMode);
    applyGuideFilter();

    if (sectionFromQuery) {
        setTab('docs');
        window.setTimeout(() => {
            jumpToSection(sectionFromQuery);
        }, 0);
    }

    return container;
}

export default LandingPage;
