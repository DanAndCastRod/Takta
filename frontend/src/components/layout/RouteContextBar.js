import { getModuleContext, withModuleContext } from '../../services/module-context.service.js';

const ROUTE_META = {
    '/': { label: 'Dashboard', section: 'Inicio', parentPath: null, help: 'Usa accesos rápidos para iniciar un flujo end-to-end por módulo.' },
    '/docs': { label: 'Centro de Ayuda', section: 'Soporte', parentPath: '/', help: 'Consulta la guia completa por modulo, entidad, flujo y soporte operativo.' },
    '/assets': { label: 'Árbol de Activos', section: 'Ingeniería', parentPath: '/', help: 'Selecciona o crea un activo para abrir el resto de módulos en contexto.' },
    '/engineering': { label: 'Ingeniería', section: 'Ingeniería', parentPath: '/', help: 'Define actividad/referencia/estándar para habilitar cronómetro, capacidad y muestreo.' },
    '/timing': { label: 'Cronómetro', section: 'Ingeniería', parentPath: '/engineering', help: 'Captura estudio y luego navega a estándares o capacidad con el mismo contexto.' },
    '/capacity': { label: 'Capacidad', section: 'Ingeniería', parentPath: '/engineering', help: 'Evalúa capacidad/staffing y enlaza decisiones con acciones de mejora.' },
    '/execution': { label: 'Ejecución', section: 'Operación', parentPath: '/', help: 'Registra producción/paros y salta a excelencia o actas para seguimiento.' },
    '/mobile': { label: 'Piso Móvil', section: 'Operación', parentPath: '/execution', help: 'Opera en campo y conserva contexto para análisis posterior.' },
    '/weight-sampling': { label: 'Muestreo de Peso', section: 'Calidad y Mejora', parentPath: '/', help: 'Desde SPC abre NC/CAPA y sincroniza compromisos en Actas IP.' },
    '/excellence': { label: 'Excelencia', section: 'Calidad y Mejora', parentPath: '/', help: 'Conecta KPI, acciones y workflow con la operación contextual.' },
    '/meetings': { label: 'Actas IP', section: 'Calidad y Mejora', parentPath: '/excellence', help: 'Materializa compromisos y sincroniza issues NC/CAPA abiertos.' },
    '/documents': { label: 'Documentos', section: 'Documentación y Diseño', parentPath: '/', help: 'Gestiona documentos creados y abre editor con contexto aplicado.' },
    '/editor': { label: 'Editor Docs', section: 'Documentación y Diseño', parentPath: '/documents', help: 'Crea documento estructurado y vincúlalo a activo/SKU/estándar.' },
    '/plant-editor': { label: 'Diagram Studio', section: 'Documentación y Diseño', parentPath: '/', help: 'Dibuja layouts/diagramas y enlaza activos para trazabilidad.' },
    '/settings': { label: 'Configuración', section: 'Sistema', parentPath: '/', help: 'Ajusta parámetros globales del entorno.' },
};

const QUICK_ACTIONS = {
    '/': [
        { label: 'Nuevo Activo', route: '#/assets' },
        { label: 'Nuevo Estándar', route: '#/engineering' },
        { label: 'Nuevo Documento', route: '#/editor' },
        { label: 'Nueva Muestra', route: '#/weight-sampling' },
    ],
    '/docs': [
        { label: 'Ver Módulos', route: '#/docs?view=modules' },
        { label: 'Ver Entidades', route: '#/docs?view=entities' },
        { label: 'Ver Flujos', route: '#/docs?view=workflows' },
    ],
    '/assets': [
        { label: 'Crear Activo', route: '#/assets' },
        { label: 'Ir a Ingeniería', route: '#/engineering' },
        { label: 'Ir a Documentos', route: '#/documents' },
    ],
    '/engineering': [
        { label: 'Cronometrar', route: '#/timing' },
        { label: 'Ver Capacidad', route: '#/capacity' },
        { label: 'Abrir Muestreo', route: '#/weight-sampling' },
    ],
    '/execution': [
        { label: 'Abrir Excelencia', route: '#/excellence' },
        { label: 'Abrir Actas', route: '#/meetings' },
    ],
    '/weight-sampling': [
        { label: 'Abrir Actas', route: '#/meetings' },
        { label: 'Abrir Excelencia', route: '#/excellence' },
    ],
    '/meetings': [
        { label: 'Abrir Excelencia', route: '#/excellence' },
        { label: 'Abrir Documentos', route: '#/documents' },
    ],
    '/documents': [
        { label: 'Nuevo Documento', route: '#/editor' },
        { label: 'Abrir Activos', route: '#/assets' },
    ],
    '/editor': [
        { label: 'Ver Documentos', route: '#/documents' },
        { label: 'Abrir Activos', route: '#/assets' },
    ],
};

function esc(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function trimId(id = '') {
    if (!id) return '';
    return `${id.slice(0, 8)}...`;
}

function getBreadcrumbs(path) {
    const crumbs = [{ label: 'Inicio', href: '#/' }];
    const visited = new Set(['/']);
    let current = ROUTE_META[path];

    while (current?.parentPath) {
        if (visited.has(current.parentPath)) break;
        visited.add(current.parentPath);
        const parentMeta = ROUTE_META[current.parentPath];
        if (!parentMeta) break;
        crumbs.push({ label: parentMeta.label, href: `#${current.parentPath}` });
        current = parentMeta;
    }

    const currentMeta = ROUTE_META[path];
    if (currentMeta && path !== '/') {
        crumbs.push({ label: currentMeta.label, href: `#${path}` });
    }
    return crumbs;
}

function getRelatedLinks(path, context) {
    const links = [];
    const push = (label, route) => {
        if (!route) return;
        links.push(`<a href="${esc(withModuleContext(route, context))}" class="text-xs px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">${esc(label)}</a>`);
    };

    if (path === '/assets') {
        push('Ingeniería', '#/engineering?tab=standards');
        push('Documentos', '#/documents');
    } else if (path === '/engineering') {
        push('Cronómetro', '#/timing');
        push('Capacidad', '#/capacity');
    } else if (path === '/execution') {
        push('Excelencia', '#/excellence');
        push('Actas IP', '#/meetings');
    } else if (path === '/documents' || path === '/editor') {
        push('Editor Docs', '#/editor');
        push('Activos', '#/assets');
    } else if (path === '/plant-editor') {
        push('Diagram Studio', '#/plant-editor');
        push('Activos', '#/assets');
    } else {
        push('Activos', '#/assets');
        push('Ingeniería', '#/engineering');
    }

    return links.join('');
}

function getQuickActions(path, context) {
    const actions = QUICK_ACTIONS[path] || [];
    if (!actions.length) return '';
    return actions
        .map((action) => `<a href="${esc(withModuleContext(action.route, context))}" class="text-xs px-2 py-1 rounded border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100">${esc(action.label)}</a>`)
        .join('');
}

function renderContextChips(context) {
    const chips = [];
    if (context.asset_id) chips.push(`<span class="text-[11px] px-2 py-1 rounded bg-sky-50 border border-sky-200 text-sky-700">Activo: ${esc(trimId(context.asset_id))}</span>`);
    if (context.product_reference_id) chips.push(`<span class="text-[11px] px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">SKU: ${esc(trimId(context.product_reference_id))}</span>`);
    if (context.process_standard_id) chips.push(`<span class="text-[11px] px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700">Std: ${esc(trimId(context.process_standard_id))}</span>`);
    return chips.join('');
}

export function renderRouteContextBar(rootElement, path) {
    if (!rootElement || path === '/login') return;

    rootElement.querySelector('#route-context-bar')?.remove();
    const context = getModuleContext();
    const current = ROUTE_META[path] || { label: 'Módulo', section: 'General', help: 'Navegación contextual activa.' };
    const breadcrumbs = getBreadcrumbs(path);
    const contextChips = renderContextChips(context);
    const relatedLinks = getRelatedLinks(path, context);
    const quickActions = getQuickActions(path, context);

    const bar = document.createElement('div');
    bar.id = 'route-context-bar';
    bar.className = 'sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200';
    bar.innerHTML = `
        <div class="max-w-7xl mx-auto px-3 md:px-6 py-2.5 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <button id="route-back-btn" type="button" class="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-50">Volver</button>
                    <span class="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-600">${esc(current.section || 'General')}</span>
                    <nav class="hidden md:flex items-center text-xs text-slate-500 overflow-x-auto" aria-label="Breadcrumb">
                        ${breadcrumbs.map((crumb, idx) => `
                            ${idx > 0 ? '<span class="px-1.5 text-slate-400">/</span>' : ''}
                            <a href="${esc(crumb.href)}" class="${idx === breadcrumbs.length - 1 ? 'text-slate-700 font-semibold' : 'hover:text-slate-700'}">${esc(crumb.label)}</a>
                        `).join('')}
                    </nav>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                    ${contextChips}
                    ${relatedLinks}
                </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-[11px] text-slate-500">${esc(current.help || 'Navegación contextual activa.')}</p>
                <div class="flex flex-wrap items-center gap-1.5">
                    ${quickActions}
                </div>
            </div>
        </div>
    `;

    bar.querySelector('#route-back-btn')?.addEventListener('click', () => {
        if (window.history.length > 1) {
            window.history.back();
            return;
        }
        window.location.hash = '#/';
    });

    rootElement.prepend(bar);
}

export default renderRouteContextBar;
