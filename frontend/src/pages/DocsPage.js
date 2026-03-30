import {
    DOCS_FAQ,
    DOCS_LAST_UPDATED,
    DOC_MODULES,
    DOCS_OVERVIEW,
    DOCS_WORKFLOWS,
} from '../content/docs-content.js';

function esc(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function normalizeText(value = '') {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function parseDocsQuery() {
    const hash = window.location.hash || '#/docs';
    const queryIndex = hash.indexOf('?');
    return new URLSearchParams(queryIndex === -1 ? '' : hash.slice(queryIndex + 1));
}

function buildDocsHash(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        const text = String(value).trim();
        if (!text) return;
        query.set(key, text);
    });
    const serialized = query.toString();
    return serialized ? `#/docs?${serialized}` : '#/docs';
}

function updateDocsUrl(params, mode = 'replace') {
    const nextHash = buildDocsHash(params);
    if ((window.location.hash || '#/docs') === nextHash) return;
    if (mode === 'push') {
        window.location.hash = nextHash;
        return;
    }
    window.history.replaceState(null, '', nextHash);
}

function moduleArticleSearchText(module) {
    return normalizeText([
        module.title,
        module.category,
        module.summary,
        module.whenToUse,
        ...(module.audience || []),
        ...(module.capabilities || []),
        ...(module.steps || []),
        ...(module.outputs || []),
        ...(module.troubleshooting || []),
        module.keywords || '',
        ...(module.entities || []).flatMap((entity) => [
            entity.name,
            entity.purpose,
            ...(entity.actions || []),
            ...(entity.fields || []),
        ]),
    ].join(' '));
}

function workflowSearchText(workflow) {
    return normalizeText([
        workflow.title,
        workflow.role,
        workflow.outcome,
        ...(workflow.steps || []),
        ...(workflow.modules || []),
    ].join(' '));
}

function faqSearchText(item) {
    return normalizeText(`${item.question} ${item.answer}`);
}

function collectEntities(modules) {
    return modules.flatMap((module) =>
        (module.entities || []).map((entity) => ({
            ...entity,
            moduleId: module.id,
            moduleTitle: module.title,
            moduleRoute: module.route,
            category: module.category,
            searchText: normalizeText([
                entity.name,
                entity.purpose,
                ...(entity.actions || []),
                ...(entity.fields || []),
                module.title,
                module.summary,
            ].join(' ')),
        })),
    );
}

function normalizeArticleId(targetId = '') {
    return String(targetId)
        .replace(/^module-/, '')
        .replace(/^workflow-/, '')
        .replace(/^faq-/, '')
        .replace(/^entity-/, '');
}

function inferArticleView(articleId, indexes) {
    if (!articleId) return 'all';
    if (indexes.moduleIndex[articleId]) return 'modules';
    if (indexes.entityIndex[articleId]) return 'entities';
    if (indexes.workflowIndex[articleId]) return 'workflows';
    if (indexes.faqIndex[articleId]) return 'support';
    return 'all';
}

function renderNavLink(id, label, count = null) {
    return `
        <button type="button" data-scroll-target="${esc(id)}" class="docs-nav-link flex w-full items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[13px] leading-5 text-slate-700 hover:border-brand-orange/30 hover:bg-orange-50/40">
            <span class="min-w-0 flex-1">${esc(label)}</span>
            ${count === null ? '' : `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">${esc(count)}</span>`}
        </button>
    `;
}

function renderNavPill(id, label) {
    return `
        <button type="button" data-scroll-target="${esc(id)}" class="docs-nav-link inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-orange/30 hover:bg-orange-50/40">
            ${esc(label)}
        </button>
    `;
}

function renderModuleCard(module) {
    return `
        <article id="module-${esc(module.id)}" class="tk-card p-5 md:p-6 scroll-mt-24" data-doc-kind="module" data-doc-id="${esc(module.id)}">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="inline-flex rounded-full border border-brand-orange/25 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-orange">${esc(module.category)}</span>
                        ${module.audience.map((item) => `<span class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">${esc(item)}</span>`).join('')}
                    </div>
                    <h3 class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">${esc(module.title)}</h3>
                    <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">${esc(module.summary)}</p>
                </div>
                <a href="${esc(module.route)}" class="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Abrir modulo</a>
            </div>
            <div class="mt-6 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
                <section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cuando usarlo</p>
                    <p class="mt-2 text-sm leading-6 text-slate-700">${esc(module.whenToUse)}</p>
                    <div class="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Capacidades</p>
                            <ul class="mt-2 space-y-2">
                                ${module.capabilities.map((item) => `<li class="flex gap-2 text-sm text-slate-700"><span class="mt-1.5 h-2 w-2 flex-none rounded-full bg-cyan-500"></span><span>${esc(item)}</span></li>`).join('')}
                            </ul>
                        </div>
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resultado esperado</p>
                            <ul class="mt-2 space-y-2">
                                ${module.outputs.map((item) => `<li class="flex gap-2 text-sm text-slate-700"><span class="mt-1.5 h-2 w-2 flex-none rounded-full bg-emerald-500"></span><span>${esc(item)}</span></li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </section>
                <section class="rounded-2xl border border-slate-200 bg-white p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Guia de operacion</p>
                    <ol class="mt-2 space-y-2">
                        ${module.steps.map((step, index) => `
                            <li class="flex gap-3 text-sm text-slate-700">
                                <span class="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">${index + 1}</span>
                                <span>${esc(step)}</span>
                            </li>
                        `).join('')}
                    </ol>
                    <div class="mt-4 border-t border-slate-200 pt-4">
                        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Integraciones</p>
                        <div class="mt-2 flex flex-wrap gap-2">
                            ${module.integrations.map((item) => `<span class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">${esc(item)}</span>`).join('')}
                        </div>
                    </div>
                </section>
            </div>
            <section class="mt-6">
                <div class="mb-3 flex items-center justify-between gap-4">
                    <h4 class="text-lg font-semibold text-slate-900">Entidades y funcionalidades</h4>
                    <button type="button" data-scroll-target="entities" class="text-sm font-semibold text-brand-orange hover:text-cyan-700">Ver catalogo completo</button>
                </div>
                <div class="grid gap-4 lg:grid-cols-2">
                    ${module.entities.map((entity) => `
                        <article id="entity-${esc(entity.id)}" class="rounded-2xl border border-slate-200 bg-white p-4 scroll-mt-24" data-doc-kind="entity" data-doc-id="${esc(entity.id)}">
                            <div class="flex items-start justify-between gap-3">
                                <div>
                                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">${esc(module.title)}</p>
                                    <h5 class="mt-1 text-base font-semibold text-slate-900">${esc(entity.name)}</h5>
                                </div>
                                <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">${esc(module.category)}</span>
                            </div>
                            <p class="mt-2 text-sm leading-6 text-slate-600">${esc(entity.purpose)}</p>
                            <div class="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Acciones comunes</p>
                                    <ul class="mt-2 space-y-2">
                                        ${(entity.actions || []).map((item) => `<li class="text-sm text-slate-700">${esc(item)}</li>`).join('')}
                                    </ul>
                                </div>
                                <div>
                                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Campos clave</p>
                                    <ul class="mt-2 space-y-2">
                                        ${(entity.fields || []).map((item) => `<li class="text-sm text-slate-700">${esc(item)}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        </article>
                    `).join('')}
                </div>
            </section>
            <section class="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Errores frecuentes y control</p>
                <ul class="mt-2 space-y-2">
                    ${module.troubleshooting.map((item) => `<li class="flex gap-2 text-sm text-amber-900"><span class="mt-1.5 h-2 w-2 flex-none rounded-full bg-amber-500"></span><span>${esc(item)}</span></li>`).join('')}
                </ul>
            </section>
        </article>
    `;
}

function renderEntityCatalogCard(entity) {
    return `
        <article class="rounded-2xl border border-slate-200 bg-white p-4" data-entity-card="${esc(entity.id)}">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h4 class="text-base font-semibold text-slate-900">${esc(entity.name)}</h4>
                    <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">${esc(entity.moduleTitle)}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" data-scroll-target="entity-${esc(entity.id)}" class="rounded-lg border border-brand-orange/20 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-brand-orange hover:bg-orange-100">Ver detalle</button>
                    <a href="${esc(entity.moduleRoute)}" class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100">Abrir modulo</a>
                </div>
            </div>
            <p class="mt-3 text-sm leading-6 text-slate-600">${esc(entity.purpose)}</p>
            <div class="mt-4">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Acciones</p>
                <div class="mt-2 flex flex-wrap gap-2">
                    ${(entity.actions || []).map((item) => `<span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">${esc(item)}</span>`).join('')}
                </div>
            </div>
        </article>
    `;
}

function renderWorkflowCard(workflow, moduleTitleIndex = {}) {
    return `
        <article id="workflow-${esc(workflow.id)}" class="rounded-2xl border border-slate-200 bg-white p-5 scroll-mt-24" data-doc-kind="workflow" data-doc-id="${esc(workflow.id)}">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">${esc(workflow.role)}</p>
                    <h3 class="mt-1 text-xl font-semibold text-slate-900">${esc(workflow.title)}</h3>
                    <p class="mt-2 text-sm leading-6 text-slate-600">${esc(workflow.outcome)}</p>
                </div>
                <a href="${esc(workflow.route)}" class="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Iniciar flujo</a>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
                ${workflow.modules.map((item) => `<span class="rounded-full border border-brand-orange/20 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-brand-orange">${esc(moduleTitleIndex[item] || item)}</span>`).join('')}
            </div>
            <ol class="mt-5 space-y-3">
                ${workflow.steps.map((step, index) => `
                    <li class="flex gap-3 text-sm text-slate-700">
                        <span class="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">${index + 1}</span>
                        <span>${esc(step)}</span>
                    </li>
                `).join('')}
            </ol>
        </article>
    `;
}

function renderFaqCard(item) {
    return `
        <article id="faq-${esc(item.id)}" class="rounded-2xl border border-slate-200 bg-white p-4 scroll-mt-24" data-doc-kind="faq" data-doc-id="${esc(item.id)}">
            <h4 class="text-base font-semibold text-slate-900">${esc(item.question)}</h4>
            <p class="mt-2 text-sm leading-6 text-slate-600">${esc(item.answer)}</p>
        </article>
    `;
}

async function DocsPage(options = {}) {
    const user = options.user || null;
    const query = parseDocsQuery();
    const initialSearch = query.get('q') || '';
    const initialView = query.get('view') || 'all';
    const requestedArticle = query.get('article') || '';
    const allEntities = collectEntities(DOC_MODULES);
    const moduleIndex = Object.fromEntries(DOC_MODULES.map((module) => [module.id, module]));
    const moduleTitleIndex = Object.fromEntries(DOC_MODULES.map((module) => [module.id, module.title]));
    const workflowIndex = Object.fromEntries(DOCS_WORKFLOWS.map((item) => [item.id, item]));
    const faqIndex = Object.fromEntries(DOCS_FAQ.map((item) => [item.id, item]));
    const entityIndex = Object.fromEntries(allEntities.map((entity) => [entity.id, entity]));
    const requestedArticleView = inferArticleView(requestedArticle, { moduleIndex, workflowIndex, faqIndex, entityIndex });
    const resolvedInitialView = requestedArticle && initialView !== 'all' && requestedArticleView !== 'all'
        ? requestedArticleView
        : initialView;

    const container = document.createElement('div');
    container.className = 'min-h-full bg-slate-50';

    container.innerHTML = `
        <div class="tk-on-dark relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(135deg,_#0f172a,_#111827_55%,_#1e293b)] text-white">
            <div class="relative mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
                <div class="grid gap-8 lg:grid-cols-[1.2fr,0.8fr] lg:items-end">
                    <div>
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="inline-flex rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-100">Centro de ayuda</span>
                            <span class="inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-200">Actualizado ${esc(DOCS_LAST_UPDATED)}</span>
                        </div>
                        <h1 class="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl">${esc(DOCS_OVERVIEW.title)}</h1>
                        <p class="mt-4 max-w-3xl text-sm leading-7 text-slate-200 md:text-base">${esc(DOCS_OVERVIEW.summary)}</p>
                        <div class="mt-6 flex flex-wrap gap-3">
                            <a href="${user ? '#/' : '#/login'}" class="inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100">${user ? 'Ir al dashboard' : 'Iniciar sesion'}</a>
                            <button type="button" data-scroll-target="modules" class="inline-flex rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15">Explorar modulos</button>
                        </div>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <div class="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p class="text-xs uppercase tracking-[0.18em] text-slate-200">Modulos</p><p class="mt-2 text-3xl font-semibold text-white">${DOC_MODULES.length}</p></div>
                        <div class="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p class="text-xs uppercase tracking-[0.18em] text-slate-200">Entidades</p><p class="mt-2 text-3xl font-semibold text-white">${allEntities.length}</p></div>
                        <div class="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p class="text-xs uppercase tracking-[0.18em] text-slate-200">Flujos</p><p class="mt-2 text-3xl font-semibold text-white">${DOCS_WORKFLOWS.length}</p></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
            <div class="grid items-start gap-6 xl:grid-cols-[272px,minmax(0,1fr)]">
                <aside class="space-y-4 xl:self-start">
                    <div class="tk-card p-4">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Buscar</p>
                                <h2 class="mt-1 text-base font-semibold text-slate-900">Navega la guia</h2>
                            </div>
                            <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">${DOC_MODULES.length} modulos</span>
                        </div>
                        <p class="mt-2 text-sm leading-6 text-slate-500">Encuentra entidades, flujos y soporte sin perder el contexto del modulo actual.</p>
                        <label for="docs-search" class="mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Termino</label>
                        <div class="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <input id="docs-search" value="${esc(initialSearch)}" placeholder="CAPA, plantilla, estandar, tenant" class="w-full border-0 bg-transparent p-0 text-sm text-slate-700 outline-none placeholder:text-slate-400">
                        </div>
                        <div class="mt-4">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Vista</p>
                            <div class="mt-2 flex flex-wrap gap-2" id="docs-view-filters"></div>
                        </div>
                    </div>
                    <div class="tk-card p-4">
                        <details open>
                            <summary class="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Secciones principales
                            </summary>
                            <div class="mt-3 flex flex-wrap gap-2">
                                ${renderNavPill('overview', 'Inicio rapido')}
                                ${renderNavPill('modules', 'Modulos')}
                                ${renderNavPill('entities', 'Entidades')}
                                ${renderNavPill('workflows', 'Flujos')}
                                ${renderNavPill('support', 'Soporte')}
                            </div>
                        </details>
                        <details class="mt-4 border-t border-slate-200 pt-4">
                            <summary class="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Indice por modulo
                            </summary>
                            <p class="mt-2 text-xs leading-5 text-slate-500">Abre este indice solo cuando necesites saltar a un articulo concreto.</p>
                            <div id="docs-module-nav" class="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                                ${DOC_MODULES.map((module) => renderNavLink(`module-${module.id}`, module.title)).join('')}
                            </div>
                        </details>
                    </div>
                </aside>
                <main class="min-w-0 space-y-6">
                    <section id="overview" class="grid gap-5 xl:grid-cols-[1.05fr,0.95fr] scroll-mt-24"></section>
                    <section id="modules" class="space-y-6 scroll-mt-24"></section>
                    <section id="entities" class="space-y-4 scroll-mt-24"></section>
                    <section id="workflows" class="space-y-4 scroll-mt-24"></section>
                    <section id="support" class="space-y-4 scroll-mt-24"></section>
                </main>
            </div>
        </div>
    `;

    const viewFilters = [
        ['all', 'Todo'],
        ['modules', 'Modulos'],
        ['entities', 'Entidades'],
        ['workflows', 'Flujos'],
        ['support', 'Soporte'],
    ];
    container.querySelector('#docs-view-filters').innerHTML = viewFilters.map(([value, label]) => `
        <button type="button" data-view="${value}" class="docs-view-btn rounded-full border px-3 py-1.5 text-xs font-semibold ${resolvedInitialView === value ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}">${label}</button>
    `).join('');

    container.querySelector('#overview').innerHTML = `
        <article class="tk-card p-5 md:p-6">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Inicio rapido</p>
            <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Como empezar a usar Takta sin perder contexto</h2>
            <ol class="mt-4 space-y-3">
                ${DOCS_OVERVIEW.quickStart.map((item, index) => `
                    <li class="flex gap-3 text-sm text-slate-700">
                        <span class="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">${index + 1}</span>
                        <span>${esc(item)}</span>
                    </li>
                `).join('')}
            </ol>
        </article>
        <article class="tk-card p-5 md:p-6">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Convenciones de trabajo</p>
            <div class="mt-4 space-y-4">
                ${DOCS_OVERVIEW.principles.map((item) => `
                    <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <h3 class="text-base font-semibold text-slate-900">${esc(item.title)}</h3>
                        <p class="mt-2 text-sm leading-6 text-slate-600">${esc(item.body)}</p>
                    </div>
                `).join('')}
            </div>
            <div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Diccionario minimo</p>
                <ul class="mt-2 space-y-2">
                    ${DOCS_OVERVIEW.conventions.map((item) => `<li class="text-sm text-slate-700">${esc(item)}</li>`).join('')}
                </ul>
            </div>
        </article>
    `;

    container.querySelector('#modules').innerHTML = `
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Modulos</p>
                <h2 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Guia funcional por modulo</h2>
            </div>
            <p id="docs-module-summary" class="text-sm text-slate-500"></p>
        </div>
        <div id="docs-module-list" class="space-y-6">
            ${DOC_MODULES.map((module) => renderModuleCard(module)).join('')}
        </div>
        <div id="docs-module-empty" class="hidden rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No hay modulos que coincidan con el filtro actual.
        </div>
    `;

    container.querySelector('#entities').innerHTML = `
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Entidades</p>
                <h2 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Catalogo de entidades y funciones</h2>
            </div>
            <p id="docs-entity-summary" class="text-sm text-slate-500"></p>
        </div>
        <div id="docs-entity-list" class="grid gap-4 lg:grid-cols-2">
            ${allEntities.map((entity) => renderEntityCatalogCard(entity)).join('')}
        </div>
        <div id="docs-entity-empty" class="hidden rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No hay entidades que coincidan con el filtro actual.
        </div>
    `;

    container.querySelector('#workflows').innerHTML = `
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Flujos</p>
                <h2 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Recorridos recomendados por tarea</h2>
            </div>
            <p id="docs-workflow-summary" class="text-sm text-slate-500"></p>
        </div>
        <div id="docs-workflow-list" class="grid gap-4 xl:grid-cols-2">
            ${DOCS_WORKFLOWS.map((workflow) => renderWorkflowCard(workflow, moduleTitleIndex)).join('')}
        </div>
        <div id="docs-workflow-empty" class="hidden rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No hay flujos que coincidan con el filtro actual.
        </div>
    `;

    container.querySelector('#support').innerHTML = `
        <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Soporte</p>
            <h2 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">FAQ y resolucion de problemas</h2>
        </div>
        <div id="docs-faq-list" class="grid gap-4 lg:grid-cols-2">
            ${DOCS_FAQ.map((item) => renderFaqCard(item)).join('')}
        </div>
        <div id="docs-faq-empty" class="hidden rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No hay respuestas que coincidan con el filtro actual.
        </div>
    `;

    const state = {
        search: initialSearch,
        view: resolvedInitialView,
        article: requestedArticle,
    };

    const searchInput = container.querySelector('#docs-search');
    const moduleItems = DOC_MODULES.map((module) => ({
        module,
        element: container.querySelector(`#module-${module.id}`),
        nav: container.querySelector(`[data-scroll-target="module-${module.id}"]`),
        searchText: moduleArticleSearchText(module),
    }));
    const entityItems = allEntities.map((entity) => ({
        entity,
        element: container.querySelector(`[data-entity-card="${entity.id}"]`),
    }));
    const workflowItems = DOCS_WORKFLOWS.map((workflow) => ({
        workflow,
        element: container.querySelector(`#workflow-${workflow.id}`),
        searchText: workflowSearchText(workflow),
    }));
    const faqItems = DOCS_FAQ.map((item) => ({
        item,
        element: container.querySelector(`#faq-${item.id}`),
        searchText: faqSearchText(item),
    }));

    function sectionVisible(viewName) {
        return state.view === 'all' || state.view === viewName;
    }

    function setView(nextView) {
        state.view = nextView;
        container.querySelectorAll('.docs-view-btn').forEach((button) => {
            const active = button.getAttribute('data-view') === nextView;
            button.className = active
                ? 'docs-view-btn rounded-full border border-brand-orange bg-orange-50 px-3 py-1.5 text-xs font-semibold text-brand-orange'
                : 'docs-view-btn rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50';
        });
        applyFilters();
    }

    function syncArticleHighlight() {
        const activeArticle = state.article || '';
        container.querySelectorAll('[data-doc-kind]').forEach((element) => {
            const isActive = activeArticle && element.getAttribute('data-doc-id') === activeArticle;
            element.classList.toggle('ring-2', !!isActive);
            element.classList.toggle('ring-brand-orange', !!isActive);
            element.classList.toggle('border-brand-orange', !!isActive);
        });
        container.querySelectorAll('[data-entity-card]').forEach((element) => {
            const isActive = activeArticle && element.getAttribute('data-entity-card') === activeArticle;
            element.classList.toggle('ring-2', !!isActive);
            element.classList.toggle('ring-brand-orange', !!isActive);
            element.classList.toggle('border-brand-orange', !!isActive);
        });
    }

    function applyFilters() {
        const queryText = normalizeText(state.search);
        let visibleModules = 0;
        let visibleEntities = 0;
        let visibleWorkflows = 0;
        let visibleFaq = 0;

        moduleItems.forEach((item) => {
            const matches = !queryText || item.searchText.includes(queryText);
            const visible = sectionVisible('modules') && matches;
            item.element.classList.toggle('hidden', !visible);
            item.nav?.classList.toggle('hidden', !matches);
            if (visible) visibleModules += 1;
        });

        entityItems.forEach((item) => {
            const matches = !queryText || item.entity.searchText.includes(queryText);
            const visible = sectionVisible('entities') && matches;
            item.element.classList.toggle('hidden', !visible);
            if (visible) visibleEntities += 1;
        });

        workflowItems.forEach((item) => {
            const matches = !queryText || item.searchText.includes(queryText);
            const visible = sectionVisible('workflows') && matches;
            item.element.classList.toggle('hidden', !visible);
            if (visible) visibleWorkflows += 1;
        });

        faqItems.forEach((item) => {
            const matches = !queryText || item.searchText.includes(queryText);
            const visible = sectionVisible('support') && matches;
            item.element.classList.toggle('hidden', !visible);
            if (visible) visibleFaq += 1;
        });

        container.querySelector('#overview').classList.toggle('hidden', !sectionVisible('all'));
        container.querySelector('#modules').classList.toggle('hidden', !sectionVisible('modules') && state.view !== 'all');
        container.querySelector('#entities').classList.toggle('hidden', !sectionVisible('entities') && state.view !== 'all');
        container.querySelector('#workflows').classList.toggle('hidden', !sectionVisible('workflows') && state.view !== 'all');
        container.querySelector('#support').classList.toggle('hidden', !sectionVisible('support') && state.view !== 'all');

        container.querySelector('#docs-module-empty').classList.toggle('hidden', visibleModules !== 0 || !sectionVisible('modules'));
        container.querySelector('#docs-entity-empty').classList.toggle('hidden', visibleEntities !== 0 || !sectionVisible('entities'));
        container.querySelector('#docs-workflow-empty').classList.toggle('hidden', visibleWorkflows !== 0 || !sectionVisible('workflows'));
        container.querySelector('#docs-faq-empty').classList.toggle('hidden', visibleFaq !== 0 || !sectionVisible('support'));

        container.querySelector('#docs-module-summary').textContent = `${visibleModules} modulo(s) visibles`;
        container.querySelector('#docs-entity-summary').textContent = `${visibleEntities} entidad(es) visibles`;
        container.querySelector('#docs-workflow-summary').textContent = `${visibleWorkflows} flujo(s) visibles`;
        syncArticleHighlight();
    }

    function resolveTarget(targetId) {
        if (!targetId) return null;
        if (['overview', 'modules', 'entities', 'workflows', 'support'].includes(targetId)) {
            return container.querySelector(`#${targetId}`);
        }
        const targetModule = moduleIndex[targetId] ? container.querySelector(`#module-${targetId}`) : null;
        const targetWorkflow = workflowIndex[targetId] ? container.querySelector(`#workflow-${targetId}`) : null;
        const targetFaq = faqIndex[targetId] ? container.querySelector(`#faq-${targetId}`) : null;
        const targetEntity = container.querySelector(`#entity-${targetId}`) || container.querySelector(`[data-entity-card="${targetId}"]`);
        return targetModule || targetEntity || targetWorkflow || targetFaq;
    }

    function focusRequestedArticle(targetId) {
        const target = resolveTarget(targetId);
        if (!target || target.classList.contains('hidden')) return;
        window.setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
    }

    function openArticleTarget(targetId) {
        const articleId = normalizeArticleId(targetId);
        const nextView = inferArticleView(articleId, { moduleIndex, workflowIndex, faqIndex, entityIndex });
        state.article = articleId;
        if (nextView !== 'all') {
            setView(nextView);
        }
        updateDocsUrl({
            q: state.search,
            view: nextView === 'all' ? '' : nextView,
            article: articleId,
        });
        focusRequestedArticle(articleId);
    }

    searchInput?.addEventListener('input', () => {
        state.search = searchInput.value || '';
        updateDocsUrl({ q: state.search, view: state.view === 'all' ? '' : state.view, article: state.article });
        applyFilters();
    });

    container.querySelectorAll('.docs-view-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const nextView = button.getAttribute('data-view') || 'all';
            setView(nextView);
            updateDocsUrl({ q: state.search, view: nextView === 'all' ? '' : nextView });
        });
    });

    container.querySelectorAll('.docs-nav-link').forEach((link) => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-scroll-target') || '';
            if (['modules', 'entities', 'workflows', 'support'].includes(targetId)) {
                state.article = '';
                setView(targetId);
                updateDocsUrl({ q: state.search, view: targetId, article: '' });
                focusRequestedArticle(targetId);
                return;
            }
            if (targetId === 'overview') {
                state.article = '';
                setView('all');
                updateDocsUrl({ q: state.search, view: '', article: '' });
                focusRequestedArticle(targetId);
                return;
            }
            openArticleTarget(targetId);
        });
    });

    container.querySelectorAll('[data-scroll-target]').forEach((button) => {
        if (button.classList.contains('docs-nav-link')) return;
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-scroll-target') || '';
            if (targetId === 'entities') {
                state.article = '';
                setView('entities');
                updateDocsUrl({ q: state.search, view: 'entities', article: '' });
            }
            if (targetId === 'modules') {
                state.article = '';
                setView('modules');
                updateDocsUrl({ q: state.search, view: 'modules', article: '' });
            }
            if (targetId.startsWith('entity-') || targetId.startsWith('module-') || targetId.startsWith('workflow-') || targetId.startsWith('faq-')) {
                openArticleTarget(targetId);
                return;
            }
            focusRequestedArticle(targetId);
        });
    });

    setView(resolvedInitialView);
    applyFilters();
    focusRequestedArticle(requestedArticle);

    return container;
}

export default DocsPage;
