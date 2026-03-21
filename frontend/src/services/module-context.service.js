const STORAGE_KEY = 'takta.module_context.v2';

const CANONICAL_KEYS = ['asset_id', 'product_reference_id', 'process_standard_id'];

const LEGACY_KEYS = {
    asset_id: ['assetId'],
    product_reference_id: ['referenceId', 'reference_id'],
    process_standard_id: ['standardId', 'standard_id'],
};

function isValidUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toContextId(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    if (!normalized) return null;
    return isValidUuid(normalized) ? normalized : null;
}

function normalizeContext(raw = {}) {
    return {
        asset_id: toContextId(raw.asset_id),
        product_reference_id: toContextId(raw.product_reference_id),
        process_standard_id: toContextId(raw.process_standard_id),
    };
}

function areEqual(a, b) {
    return CANONICAL_KEYS.every((key) => (a?.[key] || null) === (b?.[key] || null));
}

function parseHashParams(hashValue = window.location.hash || '') {
    const index = hashValue.indexOf('?');
    if (index === -1) return {};

    const params = {};
    new URLSearchParams(hashValue.substring(index + 1)).forEach((value, key) => {
        params[key] = value;
    });
    return params;
}

function normalizeHashPath(path = '#/') {
    const raw = String(path || '#/').trim();
    if (!raw) return '#/';
    if (raw.startsWith('#')) return raw;
    if (raw.startsWith('/')) return `#${raw}`;
    return `#/${raw.replace(/^\/+/, '')}`;
}

function getFromParams(params, key) {
    if (params[key]) return params[key];
    const legacy = LEGACY_KEYS[key] || [];
    for (const alias of legacy) {
        if (params[alias]) return params[alias];
    }
    return null;
}

function readStoredContext() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return normalizeContext({});
        return normalizeContext(JSON.parse(raw));
    } catch {
        return normalizeContext({});
    }
}

function writeStoredContext(context) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

let currentContext = readStoredContext();
let initialized = false;

function emitContextChange(source = 'unknown', previousContext = null) {
    window.dispatchEvent(
        new CustomEvent('context:changed', {
            detail: {
                source,
                context: { ...currentContext },
                previous: previousContext ? { ...previousContext } : null,
            },
        }),
    );
}

function setCurrentContext(nextContext, source = 'manual') {
    const normalized = normalizeContext(nextContext);
    if (areEqual(currentContext, normalized)) return { ...currentContext };

    const previous = { ...currentContext };
    currentContext = normalized;
    writeStoredContext(currentContext);
    emitContextChange(source, previous);
    return { ...currentContext };
}

export function getModuleContext() {
    return { ...currentContext };
}

export function setModuleContext(partialContext = {}, source = 'manual') {
    const merged = {
        ...currentContext,
        ...partialContext,
    };
    return setCurrentContext(merged, source);
}

export function clearModuleContext(source = 'manual') {
    return setCurrentContext({}, source);
}

export function getHashContext(hashValue = window.location.hash || '') {
    const params = parseHashParams(hashValue);
    return normalizeContext({
        asset_id: getFromParams(params, 'asset_id'),
        product_reference_id: getFromParams(params, 'product_reference_id'),
        process_standard_id: getFromParams(params, 'process_standard_id'),
    });
}

export function withModuleContext(routeOrHash = '#/', context = getModuleContext()) {
    const raw = String(routeOrHash || '#/').trim();
    const [rawPath, rawQuery] = raw.split('?');
    const path = normalizeHashPath(rawPath || '#/');
    const params = new URLSearchParams(rawQuery || '');
    const normalized = normalizeContext(context);

    // Clear canonical and legacy keys first.
    for (const key of CANONICAL_KEYS) {
        params.delete(key);
        for (const alias of LEGACY_KEYS[key] || []) {
            params.delete(alias);
        }
    }

    for (const key of CANONICAL_KEYS) {
        if (normalized[key]) params.set(key, normalized[key]);
    }

    const query = params.toString();
    return query ? `${path}?${query}` : path;
}

export function canonicalizeContextHash(hashValue = window.location.hash || '') {
    const raw = String(hashValue || '#/').trim();
    const [rawPath, rawQuery] = raw.split('?');
    const path = normalizeHashPath(rawPath || '#/');
    if (!rawQuery) return path;

    const params = new URLSearchParams(rawQuery);
    const map = Object.fromEntries(params.entries());
    const context = normalizeContext({
        asset_id: getFromParams(map, 'asset_id'),
        product_reference_id: getFromParams(map, 'product_reference_id'),
        process_standard_id: getFromParams(map, 'process_standard_id'),
    });

    for (const key of CANONICAL_KEYS) {
        params.delete(key);
        for (const alias of LEGACY_KEYS[key] || []) {
            params.delete(alias);
        }
    }
    for (const key of CANONICAL_KEYS) {
        if (context[key]) params.set(key, context[key]);
    }

    const query = params.toString();
    return query ? `${path}?${query}` : path;
}

export function syncContextInHash(context = getModuleContext()) {
    const nextHash = withModuleContext(window.location.hash || '#/', context);
    if (nextHash !== (window.location.hash || '#/')) {
        window.location.hash = nextHash;
    }
}

export function initModuleContextSync() {
    if (initialized) return;
    initialized = true;

    const applyFromHash = () => {
        const canonicalHash = canonicalizeContextHash();
        if (canonicalHash !== (window.location.hash || '#/')) {
            window.history.replaceState(null, '', canonicalHash);
        }

        const fromHash = getHashContext();
        if (
            !fromHash.asset_id &&
            !fromHash.product_reference_id &&
            !fromHash.process_standard_id
        ) {
            return;
        }
        setCurrentContext(fromHash, 'hash');
    };

    applyFromHash();
    window.addEventListener('hashchange', applyFromHash);
}
