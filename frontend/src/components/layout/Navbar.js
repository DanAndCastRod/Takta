import integrationService from '../../services/integration.service.js';
import { getRuntimeBrand } from '../../services/tenant-ui.service.js';
import {
    clearModuleContext,
    getModuleContext,
    initModuleContextSync,
    setModuleContext,
    syncContextInHash,
} from '../../services/module-context.service.js';

class Navbar {
    constructor() {
        this.container = document.getElementById('app-navbar');
        this.contextOptions = null;
        this.contextSummary = null;
        this.summaryRequestId = 0;
        this.lastFocusedContextTrigger = null;

        initModuleContextSync();
        window.addEventListener('context:changed', () => {
            this.renderContextBadge();
            void this.refreshContextSummary();
        });

        window.addEventListener('sidebar:state', (event) => {
            const button = this.container?.querySelector('#toggle-sidebar-btn');
            if (!button) return;
            button.setAttribute('aria-expanded', event?.detail?.open ? 'true' : 'false');
        });

        window.addEventListener('online', () => this.renderNetworkBadge());
        window.addEventListener('offline', () => this.renderNetworkBadge());
        window.addEventListener('tenant:runtime', () => this.renderNetworkBadge());
        window.addEventListener('offline-sync:status', () => this.renderNetworkBadge());
    }

    static esc(value = '') {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    render(user) {
        if (!this.container) return;
        const brand = getRuntimeBrand();
        const brandName = Navbar.esc(brand.brandName || 'TAKTA');
        const badgeLabel = Navbar.esc(brand.badgeLabel || 'OAC-SEO');

        if (!user) {
            this.container.innerHTML = `
                <nav class="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
                    <div class="flex items-center gap-2">
                        <div class="font-bold text-xl tracking-tight text-slate-800">${brandName}</div>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange">${badgeLabel}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <a href="#/landing" class="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Landing</a>
                        <a href="#/docs" class="px-2.5 py-1.5 rounded-lg border border-brand-orange bg-brand-orange/10 text-xs font-semibold text-brand-orange hover:bg-cyan-100">Docs</a>
                        <a href="#/login" class="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800">Login</a>
                    </div>
                </nav>
            `;
            return;
        }

        this.container.innerHTML = `
            <nav class="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm" aria-label="Barra de navegación principal">
                <div class="flex items-center gap-4">
                    <button
                        type="button"
                        id="toggle-sidebar-btn"
                        class="p-1 hover:bg-slate-100 rounded-md md:hidden"
                        aria-label="Abrir menú lateral"
                        aria-controls="app-sidebar"
                        aria-expanded="false"
                    >
                        <svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                    <div class="flex items-center gap-2">
                        <div class="font-bold text-xl tracking-tight text-slate-800">${brandName}</div>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange">${badgeLabel}</span>
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <span id="network-badge" class="hidden sm:inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold border"></span>
                    <button type="button" data-context-open class="hidden md:inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                        Contexto
                    </button>
                    <div id="context-badge" class="hidden lg:flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"></div>
                    <div id="context-kpi" class="hidden xl:block text-[11px] text-slate-500"></div>
                    <button type="button" data-context-open class="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" title="Contexto" aria-label="Abrir modal de contexto">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 12h10M7 17h6"></path>
                        </svg>
                    </button>
                    <div class="flex flex-col items-end hidden sm:flex">
                        <span class="text-sm font-medium text-slate-700">${Navbar.esc(user.username)}</span>
                        <span class="text-xs text-slate-500 capitalize">${Navbar.esc(user.role || '')}</span>
                    </div>
                    <div class="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 font-bold border border-slate-200 shadow-sm" aria-hidden="true">
                        ${Navbar.esc((user.username || '?').charAt(0).toUpperCase())}
                    </div>
                    <button type="button" id="logout-btn" class="ml-2 text-sm text-slate-500 hover:text-red-500 transition-colors" title="Cerrar sesión" aria-label="Cerrar sesión">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                    </button>
                </div>
            </nav>

            <div id="context-modal" class="hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm p-4 md:p-6" aria-hidden="true">
                <div
                    id="context-modal-dialog"
                    class="mx-auto mt-8 w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="context-modal-title"
                    aria-describedby="context-modal-help"
                >
                    <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                        <div>
                            <h3 id="context-modal-title" class="text-base font-semibold text-slate-900">Contexto Global</h3>
                            <p id="context-modal-help" class="text-xs text-slate-500 mt-1">Conecta activos, SKU y estándar entre módulos.</p>
                        </div>
                        <button type="button" id="context-close" class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" aria-label="Cerrar modal de contexto">✕</button>
                    </div>
                    <div class="px-5 py-4 space-y-4">
                        <div id="context-modal-error" class="hidden rounded-lg border px-3 py-2 text-xs"></div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1" for="context-asset-select">Activo</label>
                                <select id="context-asset-select" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"></select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1" for="context-reference-select">SKU</label>
                                <select id="context-reference-select" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"></select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1" for="context-standard-select">Estándar</label>
                                <select id="context-standard-select" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"></select>
                            </div>
                        </div>
                        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p class="text-xs font-semibold text-slate-700 mb-2">Resumen de integración</p>
                            <div id="context-summary-grid" class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"></div>
                        </div>
                        <div class="rounded-xl border border-slate-200 p-3">
                            <p class="text-xs font-semibold text-slate-700 mb-2">Atajos de contexto</p>
                            <div id="context-links" class="flex flex-wrap gap-2"></div>
                        </div>
                    </div>
                    <div class="border-t border-slate-200 px-5 py-4 flex flex-wrap justify-end gap-2">
                        <button type="button" id="context-clear" class="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">Limpiar</button>
                        <button type="button" id="context-apply" class="px-4 py-2 rounded-lg bg-brand-orange text-white text-sm font-semibold hover:bg-orange-600">Aplicar</button>
                    </div>
                </div>
            </div>
        `;

        this.bindShellActions();
        this.bindContextActions();
        this.renderContextBadge();
        this.renderNetworkBadge();
        void this.refreshContextSummary();
    }

    renderNetworkBadge() {
        const badge = this.container?.querySelector('#network-badge');
        if (!badge) return;
        const online = navigator.onLine;
        const queue = JSON.parse(localStorage.getItem('takta.offline.queue.v1') || '[]');
        const conflicts = JSON.parse(localStorage.getItem('takta.offline.conflicts.v1') || '[]');
        badge.className = `hidden sm:inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold border ${online
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-amber-200 bg-amber-50 text-amber-700'}`;
        const syncSuffix = queue.length ? ` · cola ${queue.length}` : '';
        const conflictSuffix = conflicts.length ? ` · conflictos ${conflicts.length}` : '';
        badge.textContent = `${online ? 'Online' : 'Offline'}${syncSuffix}${conflictSuffix}`;
    }

    bindShellActions() {
        const logoutBtn = this.container.querySelector('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('takta_token');
                window.location.hash = '#/login';
                window.dispatchEvent(new CustomEvent('auth:logout'));
            });
        }

        const toggleSidebarBtn = this.container.querySelector('#toggle-sidebar-btn');
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('sidebar:toggle'));
            });
        }
    }

    bindContextActions() {
        this.container.querySelectorAll('[data-context-open]').forEach((button) => {
            button.addEventListener('click', (event) => {
                this.lastFocusedContextTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
                void this.openContextModal();
            });
        });

        const modal = this.container.querySelector('#context-modal');
        const closeBtn = this.container.querySelector('#context-close');
        const applyBtn = this.container.querySelector('#context-apply');
        const clearBtn = this.container.querySelector('#context-clear');
        const assetSelect = this.container.querySelector('#context-asset-select');
        const referenceSelect = this.container.querySelector('#context-reference-select');
        const standardSelect = this.container.querySelector('#context-standard-select');

        closeBtn?.addEventListener('click', () => this.closeContextModal());
        modal?.addEventListener('click', (event) => {
            if (event.target === modal) this.closeContextModal();
        });
        applyBtn?.addEventListener('click', () => this.applyContextFromModal());
        clearBtn?.addEventListener('click', () => this.clearContext());

        assetSelect?.addEventListener('change', () => this.renderStandardOptions());
        referenceSelect?.addEventListener('change', () => this.renderStandardOptions());
        standardSelect?.addEventListener('change', () => {
            const selected = this.contextOptions?.standards?.find((row) => row.id === standardSelect.value);
            if (!selected) return;
            if (assetSelect && selected.asset_id) assetSelect.value = selected.asset_id;
            if (referenceSelect && selected.product_reference_id) referenceSelect.value = selected.product_reference_id;
            this.renderStandardOptions(selected.id);
        });

        modal?.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeContextModal();
                return;
            }
            if (event.key === 'Tab') {
                this.trapFocusInModal(event, modal);
            }
        });
    }

    trapFocusInModal(event, modal) {
        const focusable = Array.from(modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
            .filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true');
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
            return;
        }
        if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }

    async ensureContextOptions() {
        if (this.contextOptions) return this.contextOptions;
        const result = await integrationService.getContextOptions(300);
        this.contextOptions = {
            assets: Array.isArray(result?.assets) ? result.assets : [],
            references: Array.isArray(result?.references) ? result.references : [],
            standards: Array.isArray(result?.standards) ? result.standards : [],
        };
        return this.contextOptions;
    }

    showContextError(message = '', isError = false) {
        const node = this.container.querySelector('#context-modal-error');
        if (!node) return;
        if (!message) {
            node.classList.add('hidden');
            node.textContent = '';
            return;
        }
        node.className = `rounded-lg border px-3 py-2 text-xs ${isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`;
        node.textContent = message;
    }

    fillSelectOptions() {
        const options = this.contextOptions || { assets: [], references: [], standards: [] };
        const context = getModuleContext();
        const assetSelect = this.container.querySelector('#context-asset-select');
        const referenceSelect = this.container.querySelector('#context-reference-select');
        if (!assetSelect || !referenceSelect) return;

        assetSelect.innerHTML = `
            <option value="">Todos</option>
            ${options.assets.map((asset) => `<option value="${asset.id}">${Navbar.esc(asset.name)} (${Navbar.esc(asset.type || '-')})</option>`).join('')}
        `;
        referenceSelect.innerHTML = `
            <option value="">Todos</option>
            ${options.references.map((reference) => `<option value="${reference.id}">${Navbar.esc(reference.code)} - ${Navbar.esc(reference.description || '')}</option>`).join('')}
        `;

        assetSelect.value = context.asset_id || '';
        referenceSelect.value = context.product_reference_id || '';
        this.renderStandardOptions(context.process_standard_id || '');
    }

    renderStandardOptions(selectedStandardId = '') {
        const standardSelect = this.container.querySelector('#context-standard-select');
        const assetSelect = this.container.querySelector('#context-asset-select');
        const referenceSelect = this.container.querySelector('#context-reference-select');
        if (!standardSelect) return;

        const assetId = assetSelect?.value || '';
        const referenceId = referenceSelect?.value || '';
        const standards = (this.contextOptions?.standards || []).filter((standard) => {
            if (assetId && standard.asset_id !== assetId) return false;
            if (referenceId && standard.product_reference_id !== referenceId) return false;
            return true;
        });

        standardSelect.innerHTML = `
            <option value="">Todos</option>
            ${standards.map((standard) => {
                const label = `${standard.id.slice(0, 8)} · ${standard.standard_time_minutes ?? '-'} min`;
                return `<option value="${standard.id}">${Navbar.esc(label)}</option>`;
            }).join('')}
        `;

        const desiredId = selectedStandardId || getModuleContext().process_standard_id || '';
        if (desiredId && standards.some((standard) => standard.id === desiredId)) {
            standardSelect.value = desiredId;
        } else {
            standardSelect.value = '';
        }
    }

    getContextLabels(context = getModuleContext()) {
        const options = this.contextOptions || { assets: [], references: [], standards: [] };
        const asset = options.assets.find((row) => row.id === context.asset_id);
        const reference = options.references.find((row) => row.id === context.product_reference_id);
        const standard = options.standards.find((row) => row.id === context.process_standard_id);

        return {
            assetLabel: asset ? asset.name : (context.asset_id ? context.asset_id.slice(0, 8) : ''),
            referenceLabel: reference ? reference.code : (context.product_reference_id ? context.product_reference_id.slice(0, 8) : ''),
            standardLabel: standard ? standard.id.slice(0, 8) : (context.process_standard_id ? context.process_standard_id.slice(0, 8) : ''),
        };
    }

    renderContextBadge() {
        const badge = this.container?.querySelector('#context-badge');
        if (!badge) return;

        const context = getModuleContext();
        const hasContext = context.asset_id || context.product_reference_id || context.process_standard_id;
        if (!hasContext) {
            badge.classList.remove('hidden');
            badge.textContent = 'Sin contexto';
            return;
        }

        const labels = this.getContextLabels(context);
        const segments = [];
        if (labels.assetLabel) segments.push(`Activo: ${labels.assetLabel}`);
        if (labels.referenceLabel) segments.push(`SKU: ${labels.referenceLabel}`);
        if (labels.standardLabel) segments.push(`Std: ${labels.standardLabel}`);
        badge.classList.remove('hidden');
        badge.textContent = segments.join(' | ');
    }

    renderContextSummaryWidgets(summary, errorMessage = '') {
        const kpi = this.container.querySelector('#context-kpi');
        const summaryGrid = this.container.querySelector('#context-summary-grid');
        const linksBox = this.container.querySelector('#context-links');

        if (kpi) {
            if (summary?.counts) {
                kpi.textContent = `Std ${summary.counts.standards ?? 0} · Docs ${summary.counts.documents ?? 0} · Muestras ${summary.counts.weight_samples ?? 0}`;
            } else if (errorMessage) {
                kpi.textContent = 'Sin resumen';
            } else {
                kpi.textContent = 'Cargando...';
            }
        }

        if (summaryGrid) {
            const counts = summary?.counts;
            if (!counts) {
                summaryGrid.innerHTML = `<p class="col-span-full text-xs text-slate-400">${Navbar.esc(errorMessage || 'Sin datos de resumen')}</p>`;
            } else {
                const cards = [
                    ['Estándares', counts.standards],
                    ['Estudios', counts.studies],
                    ['Specs peso', counts.weight_specs],
                    ['Muestras', counts.weight_samples],
                    ['Paros', counts.downtimes],
                    ['Acciones', counts.actions],
                    ['Documentos', counts.documents],
                    ['Actas', counts.meetings],
                ];
                summaryGrid.innerHTML = cards
                    .map(([label, value]) => `
                        <div class="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                            <p class="text-[11px] text-slate-500 uppercase tracking-wide">${Navbar.esc(label)}</p>
                            <p class="text-sm font-semibold text-slate-800">${Navbar.esc(value ?? 0)}</p>
                        </div>
                    `)
                    .join('');
            }
        }

        if (linksBox) {
            const links = Array.isArray(summary?.quick_links) ? summary.quick_links : [];
            if (!links.length) {
                linksBox.innerHTML = '<p class="text-xs text-slate-400">Sin atajos disponibles.</p>';
            } else {
                linksBox.innerHTML = links
                    .map((link) => `<a href="${Navbar.esc(link.route || '#/')}" class="px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-700 hover:bg-slate-50">${Navbar.esc(link.module || 'Módulo')}</a>`)
                    .join('');
            }
        }
    }

    async refreshContextSummary() {
        if (!this.container) return;
        const context = getModuleContext();
        const requestId = ++this.summaryRequestId;

        if (!context.asset_id && !context.product_reference_id && !context.process_standard_id) {
            this.contextSummary = null;
            this.renderContextSummaryWidgets(null);
            return;
        }

        try {
            this.renderContextSummaryWidgets(null);
            const summary = await integrationService.getContextSummary(context);
            if (requestId !== this.summaryRequestId) return;
            this.contextSummary = summary;
            this.renderContextSummaryWidgets(summary);
        } catch (error) {
            if (requestId !== this.summaryRequestId) return;
            this.contextSummary = null;
            this.renderContextSummaryWidgets(null, error?.message || 'No fue posible cargar el resumen contextual.');
        }
    }

    async openContextModal() {
        const modal = this.container?.querySelector('#context-modal');
        if (!modal) return;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        this.showContextError('Cargando opciones de contexto...');

        try {
            await this.ensureContextOptions();
            this.fillSelectOptions();
            this.showContextError('');
            await this.refreshContextSummary();
            const focusTarget = this.container.querySelector('#context-asset-select');
            if (focusTarget instanceof HTMLElement) focusTarget.focus();
        } catch (error) {
            this.showContextError(error?.message || 'No fue posible cargar opciones de contexto.', true);
        }
    }

    closeContextModal() {
        const modal = this.container?.querySelector('#context-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');

        if (this.lastFocusedContextTrigger instanceof HTMLElement) {
            this.lastFocusedContextTrigger.focus();
            this.lastFocusedContextTrigger = null;
        }
    }

    applyContextFromModal() {
        const assetId = this.container?.querySelector('#context-asset-select')?.value || null;
        const referenceId = this.container?.querySelector('#context-reference-select')?.value || null;
        const standardId = this.container?.querySelector('#context-standard-select')?.value || null;

        const context = setModuleContext(
            {
                asset_id: assetId,
                product_reference_id: referenceId,
                process_standard_id: standardId,
            },
            'navbar',
        );
        syncContextInHash(context);
        this.closeContextModal();
    }

    clearContext() {
        const context = clearModuleContext('navbar');
        syncContextInHash(context);
        this.closeContextModal();
    }

    clear() {
        if (this.container) this.container.innerHTML = '';
    }
}

export default Navbar;
