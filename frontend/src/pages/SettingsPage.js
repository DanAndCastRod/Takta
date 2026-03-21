import ApiClient from '../services/api.client.js';
import uiFeedback from '../services/ui-feedback.service.js';
import platformService from '../services/platform.service.js';
import offlineSyncService from '../services/offline-sync.service.js';
import { bootstrapTenantRuntime, getTenantCode } from '../services/tenant-ui.service.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders(extra = {}) {
    const token = localStorage.getItem('takta_token');
    return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

function showStatus(target, message, isError = false) {
    if (!target) return;
    target.className = `text-xs rounded-lg border px-2 py-1.5 ${isError
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-green-200 bg-green-50 text-green-700'}`;
    target.textContent = message;
}

async function downloadFile(path, filename) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('takta_token');
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
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

async function uploadAssetXlsx(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/assets/xlsx/import`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.detail || `Error importando XLSX (${response.status})`);
    return data;
}

function renderFeatureFlags(flags = []) {
    return flags.map((flag) => `
        <label class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <div class="pr-3">
                <p class="text-sm font-medium text-slate-800">${flag.feature_key}</p>
                <p class="text-xs text-slate-500">rollout: ${flag.rollout}</p>
            </div>
            <input type="checkbox" data-flag-toggle="${flag.feature_key}" ${flag.is_enabled ? 'checked' : ''} class="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange">
        </label>
    `).join('');
}

function renderHealthHistory(rows = []) {
    if (!rows.length) {
        return '<p class="text-xs text-slate-500">Sin histórico de validaciones.</p>';
    }
    return `
        <div class="space-y-1.5">
            ${rows.map((row) => `
                <div class="flex items-center justify-between text-xs rounded-lg border border-slate-200 px-2.5 py-1.5">
                    <span class="font-medium text-slate-700">${new Date(row.created_at).toLocaleString('es-CO')}</span>
                    <span class="text-slate-500">orf: ${row.orphan_count} · mis: ${row.mismatch_count} · warn: ${row.warning_count}</span>
                    <span class="px-2 py-0.5 rounded-full ${row.status === 'critical' ? 'bg-red-100 text-red-700' : row.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">${row.status}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderEventCatalog(catalog = {}) {
    const entries = Object.entries(catalog || {});
    if (!entries.length) {
        return '<p class="text-xs text-slate-500">No hay catálogo cargado.</p>';
    }
    return `
        <div class="space-y-2">
            ${entries.map(([module, events]) => `
                <div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                    <p class="text-xs font-semibold text-slate-700">${module}</p>
                    <p class="text-[11px] text-slate-500 mt-1">${Array.isArray(events) ? events.join(' · ') : '-'}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function renderIntegrationEvents(rows = []) {
    if (!rows.length) {
        return '<p class="text-xs text-slate-500">Sin eventos recientes.</p>';
    }
    return `
        <div class="space-y-1.5 max-h-56 overflow-auto pr-1">
            ${rows.map((row) => `
                <div class="rounded-lg border border-slate-200 px-2.5 py-1.5">
                    <div class="flex items-center justify-between gap-2 text-[11px]">
                        <span class="font-semibold text-slate-700">${row.module}</span>
                        <span class="text-slate-500">${new Date(row.created_at).toLocaleString('es-CO')}</span>
                    </div>
                    <p class="text-xs text-slate-600">${row.event_code}</p>
                    <p class="text-[11px] text-slate-500">status: ${row.status} · severity: ${row.severity}</p>
                </div>
            `).join('')}
        </div>
    `;
}

async function SettingsPage() {
    const container = document.createElement('div');
    container.className = 'p-6 max-w-6xl mx-auto';

    container.innerHTML = `
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-900">Configuración</h1>
            <p class="text-slate-500 text-sm mt-1">White-label, integración, PWA/offline y administración operativa.</p>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h2 class="text-sm font-semibold text-slate-800 mb-2">Sesión</h2>
                <p class="text-sm text-slate-600 mb-4">Gestiona la sesión actual del usuario autenticado.</p>
                <div class="flex gap-2">
                    <button id="settings-logout" class="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700">
                        Cerrar sesión
                    </button>
                    <button id="settings-clear-token" class="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                        Limpiar token local
                    </button>
                </div>
            </section>

            <section class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h2 class="text-sm font-semibold text-slate-800 mb-2">Navegación</h2>
                <p class="text-sm text-slate-600 mb-4">Accesos directos a los módulos principales.</p>
                <div class="flex flex-wrap gap-2">
                    <a href="#/" class="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">Dashboard</a>
                    <a href="#/assets" class="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">Activos</a>
                    <a href="#/engineering" class="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">Ingeniería</a>
                    <a href="#/meetings" class="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">Actas IP</a>
                    <a href="#/editor" class="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">Editor Docs</a>
                    <a href="#/documents" class="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">Documentos</a>
                </div>
            </section>

            <section class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm xl:col-span-2">
                <h2 class="text-sm font-semibold text-slate-800 mb-2">Plantillas Base</h2>
                <p class="text-sm text-slate-600 mb-4">Carga o actualiza plantillas de <code class="px-1 py-0.5 rounded bg-slate-100 text-slate-700">templates/ie_formats</code> y librerías Diagram Studio.</p>
                <div class="flex flex-wrap gap-2">
                    <button id="settings-ingest-templates" class="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-orange text-white hover:bg-orange-600">
                        Cargar Plantillas Base
                    </button>
                    <button id="settings-seed-libraries" class="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                        Sembrar Librerías de Diagrama
                    </button>
                    <button id="settings-seed-schemas" class="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                        Sembrar Schemas de Propiedades
                    </button>
                </div>
            </section>

            <section class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm xl:col-span-2">
                <h2 class="text-sm font-semibold text-slate-800 mb-2">Árbol de Activos (XLSX)</h2>
                <p class="text-sm text-slate-600 mb-4">Descarga plantilla, exporta árbol e importa cambios masivos en Excel.</p>
                <div class="flex flex-wrap gap-2">
                    <button id="settings-assets-template-download" class="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                        Descargar Plantilla
                    </button>
                    <button id="settings-assets-export-download" class="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                        Exportar Árbol
                    </button>
                    <button id="settings-assets-import" class="px-4 py-2 text-sm font-semibold rounded-lg tk-btn-primary">
                        Importar XLSX
                    </button>
                    <input id="settings-assets-import-input" type="file" accept=".xlsx" class="hidden">
                </div>
                <div id="settings-assets-result" class="mt-3 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1.5">
                    Usa esta sección para carga/descarga masiva del árbol de activos.
                </div>
            </section>

            <section class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm xl:col-span-2">
                <h2 class="text-sm font-semibold text-slate-800 mb-2">White Label y Feature Flags</h2>
                <p class="text-sm text-slate-600 mb-4">Configura branding por tenant, perfil mínimo/full y habilitación de módulos.</p>
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-3">
                    <div>
                        <label class="block text-xs text-slate-500 mb-1">Tenant</label>
                        <select id="settings-tenant-select" class="w-full tk-select px-3 py-2 text-sm"></select>
                    </div>
                    <div>
                        <label class="block text-xs text-slate-500 mb-1">Marca</label>
                        <input id="settings-theme-brand" class="w-full tk-input px-3 py-2 text-sm" placeholder="TAKTA">
                    </div>
                    <div>
                        <label class="block text-xs text-slate-500 mb-1">Badge</label>
                        <input id="settings-theme-badge" class="w-full tk-input px-3 py-2 text-sm" placeholder="OAC-SEO">
                    </div>
                    <div>
                        <label class="block text-xs text-slate-500 mb-1">Color marca</label>
                        <input type="color" id="settings-theme-color" class="w-full h-10 rounded-md border border-slate-200 p-1">
                    </div>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                    <button id="settings-save-theme" class="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-orange text-white hover:bg-orange-600">Guardar Branding</button>
                    <button id="settings-profile-min" class="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Perfil mínimo</button>
                    <button id="settings-profile-full" class="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Perfil full</button>
                </div>
                <div id="settings-feature-flags" class="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2"></div>
                <div id="settings-theme-status" class="mt-3 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1.5">Sin cambios recientes.</div>
            </section>

            <section class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm xl:col-span-2">
                <h2 class="text-sm font-semibold text-slate-800 mb-2">Salud de Integración y Job Nocturno</h2>
                <p class="text-sm text-slate-600 mb-4">Valida integridad de datos, consulta histórico y eventos estructurados.</p>
                <div class="flex flex-wrap gap-2">
                    <button id="settings-run-health" class="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-orange text-white hover:bg-orange-600">Ejecutar validación</button>
                    <button id="settings-run-nightly" class="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Lanzar job nocturno</button>
                    <button id="settings-run-isolation" class="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Revisar aislamiento</button>
                </div>
                <div id="settings-health-latest" class="mt-3 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1.5">Cargando estado...</div>
                <div id="settings-health-history" class="mt-3"></div>
            </section>

            <section class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm xl:col-span-2">
                <h2 class="text-sm font-semibold text-slate-800 mb-2">Catálogo de Eventos de Integración</h2>
                <p class="text-sm text-slate-600 mb-4">Consulta catálogo por módulo y trazas de eventos estructurados.</p>
                <div class="flex flex-wrap gap-2">
                    <button id="settings-events-refresh" class="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                        Refrescar catálogo/eventos
                    </button>
                    <button id="settings-events-sample" class="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                        Crear evento de prueba
                    </button>
                </div>
                <div id="settings-events-catalog" class="mt-3 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1.5">
                    Cargando catálogo...
                </div>
                <div id="settings-events-list" class="mt-3"></div>
            </section>

            <section class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm xl:col-span-2">
                <h2 class="text-sm font-semibold text-slate-800 mb-2">PWA Offline y Sync Manager</h2>
                <p class="text-sm text-slate-600 mb-4">Gestiona cola offline, conflictos y sincronización de operaciones diferidas.</p>
                <div class="flex flex-wrap gap-2">
                    <button id="settings-sync-flush" class="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-orange text-white hover:bg-orange-600">Sincronizar cola</button>
                    <button id="settings-sync-clear" class="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Vaciar cola</button>
                    <button id="settings-sync-clear-conflicts" class="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Limpiar conflictos</button>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                    <button id="settings-pwa-check-update" class="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Buscar actualización PWA</button>
                    <button id="settings-pwa-apply-update" class="hidden px-4 py-2 text-sm font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50">Aplicar actualización</button>
                </div>
                <div id="settings-sync-status" class="mt-3 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1.5">Sincronización pendiente: 0</div>
                <div id="settings-pwa-status" class="mt-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1.5">Estado PWA: verificando...</div>
                <div class="mt-3 text-xs text-slate-500">
                    Estrategia actual: <span class="font-semibold text-slate-700">last-write-wins</span>.  
                    En conflicto 409, se conserva el registro en historial de conflictos para revisión manual.
                </div>
            </section>
        </div>
    `;

    const tenantSelect = container.querySelector('#settings-tenant-select');
    const featureFlagsContainer = container.querySelector('#settings-feature-flags');
    const themeStatusNode = container.querySelector('#settings-theme-status');
    const healthLatestNode = container.querySelector('#settings-health-latest');
    const healthHistoryNode = container.querySelector('#settings-health-history');
    const eventsCatalogNode = container.querySelector('#settings-events-catalog');
    const eventsListNode = container.querySelector('#settings-events-list');
    const syncStatusNode = container.querySelector('#settings-sync-status');
    const pwaStatusNode = container.querySelector('#settings-pwa-status');
    const pwaApplyButton = container.querySelector('#settings-pwa-apply-update');

    const state = {
        tenantCode: getTenantCode(),
        tenants: [],
        flags: [],
        runtime: null,
        eventCatalog: {},
        events: [],
    };

    async function loadRuntimeAndFlags() {
        const query = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
        const [tenants, runtime, flags] = await Promise.all([
            platformService.listTenants().catch(() => []),
            platformService.getRuntime(query),
            platformService.listFeatureFlags(query),
        ]);

        state.tenants = Array.isArray(tenants) ? tenants : [];
        state.runtime = runtime;
        state.flags = Array.isArray(flags?.flags) ? flags.flags : [];

        tenantSelect.innerHTML = state.tenants
            .map((tenant) => `<option value="${tenant.code}" ${tenant.code === state.tenantCode ? 'selected' : ''}>${tenant.code} · ${tenant.name}</option>`)
            .join('');
        if (!tenantSelect.innerHTML) {
            tenantSelect.innerHTML = `<option value="${state.tenantCode}">${state.tenantCode}</option>`;
        }

        container.querySelector('#settings-theme-brand').value = runtime?.theme?.brand_name || 'TAKTA';
        container.querySelector('#settings-theme-badge').value = runtime?.theme?.badge_label || 'OAC-SEO';
        container.querySelector('#settings-theme-color').value = runtime?.theme?.colors?.brand_orange || '#f97316';
        featureFlagsContainer.innerHTML = renderFeatureFlags(state.flags);
    }

    async function loadHealthDashboard() {
        const query = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}&days=10` : 'days=10';
        const latestQuery = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
        const [latest, dashboard] = await Promise.all([
            platformService.getIntegrationHealthLatest(latestQuery).catch(() => null),
            platformService.getIntegrationHealthDashboard(query).catch(() => null),
        ]);
        if (!latest) {
            showStatus(healthLatestNode, 'No fue posible obtener salud de integración.', true);
        } else {
            showStatus(
                healthLatestNode,
                `Estado: ${latest.status || 'unknown'} · orphan: ${latest.orphan_count || 0} · mismatch: ${latest.mismatch_count || 0} · warn: ${latest.warning_count || 0}`,
                latest.status === 'critical',
            );
        }
        healthHistoryNode.innerHTML = renderHealthHistory(dashboard?.history || []);
    }

    async function loadIntegrationObservability() {
        const tenantQuery = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
        const eventsQuery = state.tenantCode
            ? `tenant_code=${encodeURIComponent(state.tenantCode)}&limit=40`
            : 'limit=40';
        const [catalog, events] = await Promise.all([
            platformService.getIntegrationEventCatalog().catch(() => ({ catalog: {} })),
            platformService.listIntegrationEvents(eventsQuery).catch(() => []),
        ]);
        state.eventCatalog = catalog?.catalog || {};
        state.events = Array.isArray(events) ? events : [];
        eventsCatalogNode.innerHTML = renderEventCatalog(state.eventCatalog);
        eventsListNode.innerHTML = renderIntegrationEvents(state.events);

        return tenantQuery;
    }

    function refreshSyncStatus() {
        const status = offlineSyncService.getStatus();
        showStatus(
            syncStatusNode,
            `Online: ${status.online ? 'sí' : 'no'} · pendientes: ${status.pending} · conflictos: ${status.conflicts}`,
            status.conflicts > 0,
        );
    }

    async function refreshPwaStatus() {
        if (!('serviceWorker' in navigator)) {
            showStatus(pwaStatusNode, 'Service worker no disponible en este navegador.', true);
            pwaApplyButton?.classList.add('hidden');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.getRegistration();
            const standalone = window.matchMedia('(display-mode: standalone)').matches
                || Boolean(window.navigator.standalone);
            const waitingUpdate = Boolean(registration?.waiting);

            if (!registration) {
                showStatus(pwaStatusNode, `PWA no registrada todavía · modo ${standalone ? 'standalone' : 'browser'}.`, true);
                pwaApplyButton?.classList.add('hidden');
                return;
            }

            showStatus(
                pwaStatusNode,
                `PWA activa · update ${waitingUpdate ? 'disponible' : 'sin cambios'} · modo ${standalone ? 'standalone' : 'browser'}.`,
                false,
            );
            pwaApplyButton?.classList.toggle('hidden', !waitingUpdate);
        } catch (error) {
            showStatus(pwaStatusNode, `No fue posible verificar estado PWA: ${error.message}`, true);
            pwaApplyButton?.classList.add('hidden');
        }
    }

    await loadRuntimeAndFlags();
    await loadHealthDashboard();
    await loadIntegrationObservability();
    refreshSyncStatus();
    await refreshPwaStatus();

    const onPwaUpdateAvailable = () => {
        uiFeedback.info('Hay una nueva versión PWA disponible. Puedes aplicarla desde Configuración.');
        void refreshPwaStatus();
    };
    window.addEventListener('pwa:update-available', onPwaUpdateAvailable);
    window.addEventListener('hashchange', () => {
        window.removeEventListener('pwa:update-available', onPwaUpdateAvailable);
    }, { once: true });

    tenantSelect?.addEventListener('change', async (event) => {
        state.tenantCode = event.target.value || 'default';
        await loadRuntimeAndFlags();
        await loadHealthDashboard();
        await loadIntegrationObservability();
        refreshSyncStatus();
        await refreshPwaStatus();
    });

    container.querySelector('#settings-logout')?.addEventListener('click', () => {
        localStorage.removeItem('takta_token');
        window.location.hash = '/login';
        window.dispatchEvent(new CustomEvent('auth:logout'));
    });

    container.querySelector('#settings-clear-token')?.addEventListener('click', () => {
        localStorage.removeItem('takta_token');
        uiFeedback.info('Token local eliminado. Si refrescas, se solicitará login nuevamente.');
    });

    container.querySelector('#settings-ingest-templates')?.addEventListener('click', async () => {
        try {
            const result = await ApiClient.post('/templates/ingest', {});
            uiFeedback.success(`Plantillas actualizadas. Creadas: ${result.created} | Actualizadas: ${result.updated}`);
        } catch (error) {
            uiFeedback.error(`No fue posible cargar plantillas: ${error.message}`);
        }
    });

    container.querySelector('#settings-seed-libraries')?.addEventListener('click', async () => {
        try {
            const query = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
            const result = await platformService.seedDiagramLibraries(query);
            uiFeedback.success(`Librerías cargadas. Creadas: ${result.created} | Actualizadas: ${result.updated}`);
        } catch (error) {
            uiFeedback.error(`No fue posible sembrar librerías: ${error.message}`);
        }
    });

    container.querySelector('#settings-seed-schemas')?.addEventListener('click', async () => {
        try {
            const query = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
            const result = await platformService.seedPropertySchemas(query);
            uiFeedback.success(`Schemas cargados. Creados: ${result.created} | Actualizados: ${result.updated}`);
        } catch (error) {
            uiFeedback.error(`No fue posible sembrar schemas: ${error.message}`);
        }
    });

    const assetResultNode = container.querySelector('#settings-assets-result');
    const importInput = container.querySelector('#settings-assets-import-input');

    container.querySelector('#settings-assets-template-download')?.addEventListener('click', async () => {
        try {
            await downloadFile('/assets/xlsx/template', 'takta_assets_template.xlsx');
            showStatus(assetResultNode, 'Plantilla descargada correctamente.');
        } catch (error) {
            showStatus(assetResultNode, error.message, true);
        }
    });

    container.querySelector('#settings-assets-export-download')?.addEventListener('click', async () => {
        try {
            await downloadFile('/assets/xlsx/export', 'takta_assets_export.xlsx');
            showStatus(assetResultNode, 'Exportación descargada correctamente.');
        } catch (error) {
            showStatus(assetResultNode, error.message, true);
        }
    });

    container.querySelector('#settings-assets-import')?.addEventListener('click', () => {
        importInput?.click();
    });

    importInput?.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const payload = await uploadAssetXlsx(file);
            showStatus(assetResultNode, `Importación completada. Creados: ${payload.created} | Actualizados: ${payload.updated} | Errores: ${payload.errors_count}`);
        } catch (error) {
            showStatus(assetResultNode, error.message, true);
        } finally {
            event.target.value = '';
        }
    });

    container.querySelector('#settings-save-theme')?.addEventListener('click', async () => {
        try {
            const tenantQuery = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
            const payload = {
                brand_name: container.querySelector('#settings-theme-brand')?.value?.trim() || 'TAKTA',
                badge_label: container.querySelector('#settings-theme-badge')?.value?.trim() || 'OAC-SEO',
                colors: {
                    ...(state.runtime?.theme?.colors || {}),
                    brand_orange: container.querySelector('#settings-theme-color')?.value || '#f97316',
                },
            };
            await platformService.updateTheme(payload, tenantQuery);
            await bootstrapTenantRuntime({ tenant_id: state.tenantCode });
            showStatus(themeStatusNode, 'Branding actualizado correctamente.');
        } catch (error) {
            showStatus(themeStatusNode, `Error actualizando branding: ${error.message}`, true);
        }
    });

    container.querySelector('#settings-profile-min')?.addEventListener('click', async () => {
        try {
            const query = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
            await platformService.applyFeatureProfile('minimal', query);
            await loadRuntimeAndFlags();
            await bootstrapTenantRuntime({ tenant_id: state.tenantCode });
            showStatus(themeStatusNode, 'Perfil mínimo aplicado.');
        } catch (error) {
            showStatus(themeStatusNode, `No fue posible aplicar perfil mínimo: ${error.message}`, true);
        }
    });

    container.querySelector('#settings-profile-full')?.addEventListener('click', async () => {
        try {
            const query = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
            await platformService.applyFeatureProfile('full', query);
            await loadRuntimeAndFlags();
            await bootstrapTenantRuntime({ tenant_id: state.tenantCode });
            showStatus(themeStatusNode, 'Perfil full aplicado.');
        } catch (error) {
            showStatus(themeStatusNode, `No fue posible aplicar perfil full: ${error.message}`, true);
        }
    });

    featureFlagsContainer?.addEventListener('change', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        const featureKey = target.dataset.flagToggle;
        if (!featureKey) return;
        try {
            const query = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
            await platformService.updateFeatureFlag(featureKey, {
                is_enabled: target.checked,
                rollout: 'ga',
                notes: 'updated from settings',
            }, query);
            await bootstrapTenantRuntime({ tenant_id: state.tenantCode });
            showStatus(themeStatusNode, `Feature ${featureKey} actualizado.`);
        } catch (error) {
            target.checked = !target.checked;
            showStatus(themeStatusNode, `Error actualizando ${featureKey}: ${error.message}`, true);
        }
    });

    container.querySelector('#settings-run-health')?.addEventListener('click', async () => {
        try {
            const query = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
            await platformService.runIntegrationValidation(query);
            await loadHealthDashboard();
            uiFeedback.success('Validación ejecutada.');
        } catch (error) {
            uiFeedback.error(`Error ejecutando validación: ${error.message}`);
        }
    });

    container.querySelector('#settings-run-nightly')?.addEventListener('click', async () => {
        try {
            const query = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
            await platformService.runNightlyValidation(query);
            await loadHealthDashboard();
            uiFeedback.success('Job nocturno ejecutado.');
        } catch (error) {
            uiFeedback.error(`Error ejecutando job nocturno: ${error.message}`);
        }
    });

    container.querySelector('#settings-run-isolation')?.addEventListener('click', async () => {
        try {
            const query = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
            const result = await platformService.runIsolationCheck(query);
            showStatus(healthLatestNode, `Aislamiento: ${result.status} · mismatch: ${result.mismatch_count} · orphan: ${result.orphan_count}`, result.status !== 'pass');
        } catch (error) {
            showStatus(healthLatestNode, `Error revisando aislamiento: ${error.message}`, true);
        }
    });

    container.querySelector('#settings-sync-flush')?.addEventListener('click', async () => {
        const result = await offlineSyncService.flushQueue();
        showStatus(syncStatusNode, `Sincronizados: ${result.flushed} · conflictos: ${result.conflicts} · pendientes: ${result.remaining}`, result.conflicts > 0);
    });

    container.querySelector('#settings-sync-clear')?.addEventListener('click', () => {
        offlineSyncService.clearQueue();
        refreshSyncStatus();
    });

    container.querySelector('#settings-sync-clear-conflicts')?.addEventListener('click', () => {
        offlineSyncService.clearConflicts();
        refreshSyncStatus();
    });

    container.querySelector('#settings-pwa-check-update')?.addEventListener('click', async () => {
        if (!('serviceWorker' in navigator)) {
            uiFeedback.warning('Service worker no disponible en este navegador.');
            return;
        }
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                uiFeedback.warning('Service worker aún no registrado. Recarga la app.');
                await refreshPwaStatus();
                return;
            }
            await registration.update();
            await refreshPwaStatus();
            uiFeedback.success('Verificación de actualización completada.');
        } catch (error) {
            uiFeedback.error(`No fue posible buscar actualización PWA: ${error.message}`);
        }
    });

    container.querySelector('#settings-pwa-apply-update')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('pwa:apply-update'));
        uiFeedback.info('Aplicando actualización PWA...');
    });

    container.querySelector('#settings-events-refresh')?.addEventListener('click', async () => {
        await loadIntegrationObservability();
        uiFeedback.success('Catálogo y eventos actualizados.');
    });

    container.querySelector('#settings-events-sample')?.addEventListener('click', async () => {
        try {
            const query = state.tenantCode ? `tenant_code=${encodeURIComponent(state.tenantCode)}` : '';
            await platformService.createIntegrationEvent({
                module: 'integration',
                event_code: 'context.summary.requested',
                severity: 'info',
                status: 'ok',
                payload: {
                    source: 'settings.ui',
                    timestamp: new Date().toISOString(),
                },
                source: 'settings',
            }, query);
            await loadIntegrationObservability();
            uiFeedback.success('Evento de prueba registrado.');
        } catch (error) {
            uiFeedback.error(`No fue posible crear evento de prueba: ${error.message}`);
        }
    });

    window.addEventListener('offline-sync:status', refreshSyncStatus);

    return container;
}

export default SettingsPage;
