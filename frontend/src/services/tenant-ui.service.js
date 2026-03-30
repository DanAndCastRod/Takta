import platformService from './platform.service.js';

const STORAGE_KEY = 'takta.runtime.v2';
const TENANT_KEY = 'takta.tenant_code';

const FEATURE_BY_ROUTE = {
    '/': 'core.dashboard',
    '/assets': 'module.assets',
    '/engineering': 'module.engineering',
    '/timing': 'module.timing',
    '/capacity': 'module.capacity',
    '/execution': 'module.execution',
    '/mobile': 'module.execution.mobile',
    '/weight-sampling': 'module.quality',
    '/excellence': 'module.excellence',
    '/meetings': 'module.meetings',
    '/documents': 'module.documents',
    '/editor': 'module.documents.editor',
    '/plant-editor': 'module.diagram',
    '/settings': 'module.white_label_admin',
};

const DEFAULT_RUNTIME = {
    tenant: { code: 'default', name: 'DEFAULT', profile: 'full' },
    theme: null,
    ui_config: { menu: [], modules: {} },
    feature_flags: {},
};

const API_MENU_ROUTE_MAP = [
    { pattern: /^\/api\/assets(\/|$)/i, route: '#/assets' },
    { pattern: /^\/api\/engineering\/capacity(\/|$)/i, route: '#/capacity' },
    { pattern: /^\/api\/engineering(\/|$)/i, route: '#/engineering' },
    { pattern: /^\/api\/execution(\/|$)/i, route: '#/execution' },
    { pattern: /^\/api\/quality(\/|$)/i, route: '#/weight-sampling' },
    { pattern: /^\/api\/(ci|audits|logistics)(\/|$)/i, route: '#/excellence' },
    { pattern: /^\/api\/meetings(\/|$)/i, route: '#/meetings' },
    { pattern: /^\/api\/documents(\/|$)/i, route: '#/documents' },
    { pattern: /^\/api\/templates(\/|$)/i, route: '#/editor' },
    { pattern: /^\/api\/plant-layouts(\/|$)/i, route: '#/plant-editor' },
    { pattern: /^\/api\/platform(\/|$)/i, route: '#/settings' },
];

const DEFAULT_MENU_LABELS = {
    dashboard: 'Dashboard',
    landing: 'Vista consolidada',
    docs: 'Docs',
    assets: 'Árbol de activos',
    engineering: 'Ingeniería',
    timing: 'Cronómetro',
    capacity: 'Capacidad',
    execution: 'Ejecución',
    mobile: 'Piso móvil',
    weight: 'Muestreo de peso',
    excellence: 'Excelencia',
    meetings: 'Actas IP',
    editor: 'Editor docs',
    documents: 'Documentos',
    diagram: 'Diagram Studio',
    settings: 'Configuración',
};

const DEFAULT_GROUP_TITLES = {
    'dashboard|landing|docs': 'Inicio',
    'assets|engineering|timing|capacity': 'Ingeniería',
    'execution|mobile': 'Operación',
    'weight|excellence|meetings': 'Calidad y Mejora',
    'editor|documents|diagram': 'Documentación y Diseño',
};

function hasSuspiciousMojibake(value = '') {
    return /[ÃÂâ�\u0081\u008d\u008f\u0090\u009d]/.test(String(value ?? ''));
}

function repairMojibakeText(value = '') {
    const text = String(value ?? '');
    if (!hasSuspiciousMojibake(text)) return text.replace(/\u00ad/g, '');
    try {
        const bytes = Uint8Array.from(Array.from(text), (char) => char.charCodeAt(0) & 0xff);
        return (new TextDecoder('utf-8').decode(bytes) || text).replace(/\u00ad/g, '');
    } catch {
        return text.replace(/\u00ad/g, '');
    }
}

function sanitizeRuntimeValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeRuntimeValue(item));
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [repairMojibakeText(key), sanitizeRuntimeValue(item)]),
        );
    }
    if (typeof value === 'string') {
        return repairMojibakeText(value);
    }
    return value;
}

function mergeQuery(route = '#/', query = '') {
    if (!query) return route;
    const [basePath, baseQuery] = String(route).split('?');
    const merged = new URLSearchParams(baseQuery || '');
    const incoming = new URLSearchParams(query);
    incoming.forEach((value, key) => {
        if (!merged.has(key)) merged.set(key, value);
    });
    const finalQuery = merged.toString();
    return finalQuery ? `${basePath}?${finalQuery}` : basePath;
}

function mapNormalizedRoute(pathname = '/', queryRaw = '') {
    const apiMapped = API_MENU_ROUTE_MAP.find((entry) => entry.pattern.test(pathname));
    if (apiMapped) return mergeQuery(apiMapped.route, queryRaw);

    return null;
}

function normalizeRuntimeMenuPath(rawPath = '') {
    let path = String(rawPath || '').trim();
    if (!path || path === '#') return '#/';

    if (/^https?:\/\//i.test(path)) {
        try {
            const parsed = new URL(path);
            path = `${parsed.pathname}${parsed.search}`;
        } catch {
            return '#/landing';
        }
    }

    // Some tenant configs persist hash routes that incorrectly target API endpoints.
    if (path.startsWith('#/')) {
        const [hashPathnameRaw, hashQueryRaw = ''] = path.slice(1).split('?');
        const hashPathname = String(hashPathnameRaw || '').trim() || '/';
        const mappedHash = mapNormalizedRoute(hashPathname, hashQueryRaw);
        if (mappedHash) return mappedHash;
        return path;
    }

    if (path.startsWith('api/')) path = `/${path}`;
    const [pathnameRaw, queryRaw = ''] = path.split('?');
    const pathname = String(pathnameRaw || '').trim() || '/';

    const mappedRoute = mapNormalizedRoute(pathname, queryRaw);
    if (mappedRoute) return mappedRoute;

    if (/^\/api(\/|$)/i.test(pathname)) {
        return '#/landing';
    }

    if (pathname.startsWith('#/')) return path;
    if (pathname.startsWith('#')) return `#/${pathname.replace(/^#+\/?/, '')}`;
    if (pathname.startsWith('/')) return `#${path}`;
    return `#/${path.replace(/^\/+/, '')}`;
}

function readRuntime() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_RUNTIME };
        const parsed = sanitizeRuntimeValue(JSON.parse(raw));
        return {
            ...DEFAULT_RUNTIME,
            ...parsed,
            tenant: { ...DEFAULT_RUNTIME.tenant, ...(parsed.tenant || {}) },
            ui_config: { ...DEFAULT_RUNTIME.ui_config, ...(parsed.ui_config || {}) },
            feature_flags: parsed.feature_flags || {},
        };
    } catch {
        return { ...DEFAULT_RUNTIME };
    }
}

function writeRuntime(runtime) {
    const sanitizedRuntime = sanitizeRuntimeValue(runtime);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedRuntime));
    const tenantCode = sanitizedRuntime?.tenant?.code || 'default';
    localStorage.setItem(TENANT_KEY, tenantCode);
    window.dispatchEvent(new CustomEvent('tenant:runtime', { detail: sanitizedRuntime }));
}

function applyTheme(theme) {
    if (!theme || typeof theme !== 'object') return;
    const root = document.documentElement;
    const colors = theme.colors || {};
    if (colors.brand_orange) {
        root.style.setProperty('--brand-orange', String(colors.brand_orange));
        root.style.setProperty('--color-brand-orange', String(colors.brand_orange));
    }
    if (colors.brand_orange_dark) {
        root.style.setProperty('--brand-orange-dark', String(colors.brand_orange_dark));
        root.style.setProperty('--color-brand-orange-dark', String(colors.brand_orange_dark));
    }
    if (colors.surface) root.style.setProperty('--surface', String(colors.surface));
    if (colors.surface_soft) root.style.setProperty('--surface-soft', String(colors.surface_soft));
    if (colors.surface_muted) root.style.setProperty('--surface-muted', String(colors.surface_muted));
    if (colors.border_subtle) root.style.setProperty('--border-subtle', String(colors.border_subtle));
    if (colors.text_primary) root.style.setProperty('--text-primary', String(colors.text_primary));
    if (colors.text_secondary) root.style.setProperty('--text-secondary', String(colors.text_secondary));
    if (colors.text_muted) root.style.setProperty('--text-muted', String(colors.text_muted));
    if (theme.typography?.font_family) root.style.setProperty('--font-family-runtime', String(theme.typography.font_family));

    let style = document.getElementById('takta-tenant-custom-css');
    if (!style) {
        style = document.createElement('style');
        style.id = 'takta-tenant-custom-css';
        document.head.appendChild(style);
    }
    style.textContent = theme.custom_css ? String(theme.custom_css) : '';
}

function normalizeMenuConfig(groups = []) {
    return groups.map((group) => {
        const seenRootPath = [];
        const items = (group.items || []).map((item) => {
            const label = String(item?.label || '').toLowerCase();
            const id = String(item?.id || '').toLowerCase();
            let path = normalizeRuntimeMenuPath(item?.path || '#/');
            let nextLabel = repairMojibakeText(item?.label || '');

            if (DEFAULT_MENU_LABELS[id] && hasSuspiciousMojibake(nextLabel)) {
                nextLabel = DEFAULT_MENU_LABELS[id];
            }

            // Defensive fix for tenant configs where "Vista consolidada" points to dashboard.
            if ((label.includes('consolid') || id.includes('consolid') || label.includes('landing')) && path === '#/') {
                path = '#/landing';
            }

            // If root route is duplicated inside the same group, keep first as dashboard and move others to landing.
            if (path === '#/' && seenRootPath.length > 0 && !(id === 'dashboard' || label === 'dashboard')) {
                path = '#/landing';
            }

            if (path === '#/') seenRootPath.push(true);
            return { ...item, label: nextLabel, path };
        });
        const groupKey = items
            .map((item) => String(item?.id || '').toLowerCase())
            .filter(Boolean)
            .join('|');
        let title = repairMojibakeText(group?.title || '');
        if (DEFAULT_GROUP_TITLES[groupKey] && hasSuspiciousMojibake(title)) {
            title = DEFAULT_GROUP_TITLES[groupKey];
        }
        return { ...group, title, items };
    });
}

export async function bootstrapTenantRuntime(user = null) {
    const hasToken = Boolean(localStorage.getItem('takta_token'));
    if (!hasToken) {
        // Runtime endpoint is secured; in guest mode use cached/default runtime.
        const runtime = readRuntime();
        applyTheme(runtime.theme);
        return runtime;
    }

    try {
        const params = user?.tenant_id ? `tenant_code=${encodeURIComponent(user.tenant_id)}` : '';
        const runtime = await platformService.getRuntime(params);
        writeRuntime(runtime);
        applyTheme(runtime.theme);
        return runtime;
    } catch {
        const runtime = readRuntime();
        applyTheme(runtime.theme);
        return runtime;
    }
}

export function getTenantRuntime() {
    return readRuntime();
}

export function getTenantCode() {
    const runtime = readRuntime();
    return runtime.tenant?.code || localStorage.getItem(TENANT_KEY) || 'default';
}

export function getRuntimeBrand() {
    const runtime = readRuntime();
    return {
        brandName: runtime.theme?.brand_name || 'TAKTA',
        badgeLabel: runtime.theme?.badge_label || 'OAC-SEO',
        logoUrl: runtime.theme?.logo_url || null,
    };
}

export function canUseFeature(featureKey) {
    if (!featureKey) return true;
    const runtime = readRuntime();
    const flag = runtime.feature_flags?.[featureKey];
    if (!flag) return true;
    return Boolean(flag.enabled);
}

export function canAccessRoute(path = '/') {
    const feature = FEATURE_BY_ROUTE[path];
    if (!feature) return true;
    return canUseFeature(feature);
}

export function getMenuConfig(defaultGroups = []) {
    const runtime = readRuntime();
    const configured = Array.isArray(runtime?.ui_config?.menu) ? runtime.ui_config.menu : [];
    if (!configured.length) return normalizeMenuConfig(defaultGroups);
    return normalizeMenuConfig(configured);
}

export function filterMenuByFeature(groups = []) {
    return groups
        .map((group) => {
            const items = (group.items || []).filter((item) => canUseFeature(item.feature));
            return { ...group, items };
        })
        .filter((group) => (group.items || []).length > 0);
}

export function featureForRoute(path = '/') {
    return FEATURE_BY_ROUTE[path] || null;
}
