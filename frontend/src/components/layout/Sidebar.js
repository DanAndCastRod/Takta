import {
    getModuleContext,
    initModuleContextSync,
    withModuleContext,
} from '../../services/module-context.service.js';
import { canUseFeature, filterMenuByFeature, getMenuConfig } from '../../services/tenant-ui.service.js';

class Sidebar {
    constructor() {
        this.container = document.getElementById('app-sidebar');
        this.currentPath = window.location.hash || '#/';
        this.mobileOpen = false;
        this.overlay = null;
        this.mediaQuery = window.matchMedia('(min-width: 768px)');
        this.focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

        initModuleContextSync();

        window.addEventListener('hashchange', () => {
            this.currentPath = window.location.hash || '#/';
            this.updateActiveLink();
            this.closeMobile();
        });

        window.addEventListener('sidebar:toggle', () => {
            this.toggleMobile();
        });

        this.mediaQuery.addEventListener('change', (event) => {
            if (event.matches) {
                this.closeMobile();
            }
        });

        window.addEventListener('keydown', (event) => {
            if (!this.mobileOpen) return;
            if (event.key === 'Escape') {
                this.closeMobile();
                return;
            }
            if (event.key === 'Tab') {
                this.trapFocusWithinSidebar(event);
            }
        });
    }

    ensureOverlay() {
        if (this.overlay) return;
        const overlay = document.createElement('button');
        overlay.id = 'sidebar-overlay';
        overlay.type = 'button';
        overlay.className = 'hidden fixed inset-0 bg-slate-900/40 z-30 md:hidden';
        overlay.setAttribute('aria-label', 'Cerrar navegación lateral');
        overlay.addEventListener('click', () => this.closeMobile());
        document.body.appendChild(overlay);
        this.overlay = overlay;
    }

    trapFocusWithinSidebar(event) {
        if (!this.container) return;
        const focusable = Array.from(this.container.querySelectorAll(this.focusableSelector))
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

    announceMobileState() {
        window.dispatchEvent(new CustomEvent('sidebar:state', { detail: { open: this.mobileOpen } }));
    }

    render(user) {
        if (!this.container) return;

        if (!user) {
            this.clear();
            return;
        }

        this.ensureOverlay();
        this.container.className = [
            'fixed', 'inset-y-0', 'left-0', 'z-40', 'w-72',
            'border-r', 'border-slate-200', 'bg-white',
            'flex', 'flex-col', 'transition-transform', 'duration-300',
            '-translate-x-full',
            'md:static', 'md:z-auto', 'md:w-64', 'md:translate-x-0',
        ].join(' ');

        const isDesktop = this.mediaQuery.matches;
        if (this.mobileOpen) {
            this.container.classList.remove('-translate-x-full');
            this.container.classList.add('translate-x-0');
            this.container.setAttribute('aria-hidden', 'false');
        } else {
            this.container.classList.remove('translate-x-0');
            this.container.classList.add('-translate-x-full');
            this.container.setAttribute('aria-hidden', isDesktop ? 'false' : 'true');
        }

        const groups = [
            {
                title: 'Inicio',
                items: [
                    { id: 'nav-dashboard', path: '#/', icon: 'dashboard', label: 'Dashboard', contextual: false, feature: 'core.dashboard' },
                    { id: 'nav-landing', path: '#/landing', icon: 'landing', label: 'Landing', contextual: false, feature: null },
                    { id: 'nav-docs', path: '#/docs', icon: 'book', label: 'Docs', contextual: false, feature: null },
                ],
            },
            {
                title: 'Ingeniería',
                items: [
                    { id: 'nav-assets', path: '#/assets', icon: 'tree', label: 'Árbol de activos', contextual: true, feature: 'module.assets' },
                    { id: 'nav-engineering', path: '#/engineering', icon: 'engineering', label: 'Ingeniería', contextual: true, feature: 'module.engineering' },
                    { id: 'nav-timing', path: '#/timing', icon: 'clock', label: 'Cronómetro', contextual: true, feature: 'module.timing' },
                    { id: 'nav-capacity', path: '#/capacity', icon: 'chart', label: 'Capacidad', contextual: true, feature: 'module.capacity' },
                ],
            },
            {
                title: 'Operación',
                items: [
                    { id: 'nav-execution', path: '#/execution', icon: 'play', label: 'Ejecución', contextual: true, feature: 'module.execution' },
                    { id: 'nav-mobile', path: '#/mobile', icon: 'mobile', label: 'Piso móvil', contextual: true, feature: 'module.execution.mobile' },
                ],
            },
            {
                title: 'Calidad y Mejora',
                items: [
                    { id: 'nav-weight-sampling', path: '#/weight-sampling', icon: 'scale', label: 'Muestreo de peso', contextual: true, feature: 'module.quality' },
                    { id: 'nav-excellence', path: '#/excellence', icon: 'target', label: 'Excelencia', contextual: true, feature: 'module.excellence' },
                    { id: 'nav-meetings', path: '#/meetings', icon: 'users', label: 'Actas IP', contextual: true, feature: 'module.meetings' },
                ],
            },
            {
                title: 'Documentación y Diseño',
                items: [
                    { id: 'nav-editor', path: '#/editor', icon: 'edit', label: 'Editor docs', contextual: true, feature: 'module.documents.editor' },
                    { id: 'nav-documents', path: '#/documents', icon: 'folder', label: 'Documentos', contextual: true, feature: 'module.documents' },
                    { id: 'nav-plant-editor', path: '#/plant-editor', icon: 'map', label: 'Diagram Studio', contextual: true, feature: 'module.diagram' },
                ],
            },
        ];

        const runtimeGroups = filterMenuByFeature(getMenuConfig(groups))
            .map((group) => ({
                ...group,
                items: (group.items || []).map((item) => ({
                    ...item,
                    id: item.id || `nav-${String(item.path || item.label || 'item').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
                    contextual: item.contextual !== false,
                    icon: this.resolveIcon(item),
                })),
            }));

        const showSettings = canUseFeature('module.white_label_admin');
        this.container.innerHTML = `
            <div class="p-4 border-b border-slate-100 md:hidden">
                <div class="flex items-center justify-between">
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Navegación</p>
                    <button type="button" id="close-sidebar-mobile" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Cerrar menú lateral">&times;</button>
                </div>
            </div>
            <div class="p-4 flex-1 overflow-y-auto">
                ${runtimeGroups.map((group) => `
                    <section class="mb-5 last:mb-0" aria-label="${group.title}">
                        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">${group.title}</p>
                        <nav class="space-y-1" aria-label="${group.title}">
                            ${group.items.map((item) => `
                                <a href="${item.path}" id="${item.id}" data-nav-link
                                   data-base-path="${item.path}"
                                   data-contextual="${item.contextual ? '1' : '0'}"
                                   class="nav-link group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors border
                                          ${this.isPathActive(item.path)
                ? 'bg-slate-100 text-slate-900 font-semibold shadow-sm border-slate-200/70'
                : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'}">
                                    <span class="nav-link-icon flex-shrink-0 h-8 w-8 rounded-lg border flex items-center justify-center
                                         ${this.isPathActive(item.path)
                ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/20'
                : 'bg-white text-slate-400 border-slate-200 group-hover:border-slate-300 group-hover:text-slate-600'}">
                                        ${item.icon}
                                    </span>
                                    <span class="truncate">${item.label}</span>
                                </a>
                            `).join('')}
                        </nav>
                    </section>
                `).join('')}
            </div>
            <div class="mt-auto p-4 border-t border-slate-200 ${showSettings ? '' : 'hidden'}">
                <a href="#/settings" id="nav-settings" data-nav-link
                   class="nav-link group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors border
                          ${this.isPathActive('#/settings')
                ? 'bg-slate-100 text-slate-900 font-semibold shadow-sm border-slate-200/70'
                : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'}">
                    <span class="nav-link-icon flex-shrink-0 h-8 w-8 rounded-lg border flex items-center justify-center
                         ${this.isPathActive('#/settings')
                ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/20'
                : 'bg-white text-slate-400 border-slate-200 group-hover:border-slate-300 group-hover:text-slate-600'}">
                        ${this.getIcon('settings')}
                    </span>
                    <span class="truncate">Configuración</span>
                </a>
            </div>
        `;

        this.container.querySelector('#close-sidebar-mobile')?.addEventListener('click', () => this.closeMobile());
        this.container.querySelectorAll('[data-nav-link]').forEach((link) => {
            link.addEventListener('click', (event) => {
                const contextual = link.dataset.contextual === '1';
                if (contextual) {
                    const basePath = link.dataset.basePath || link.getAttribute('href') || '#/';
                    const contextRoute = withModuleContext(basePath, getModuleContext());
                    event.preventDefault();
                    window.location.hash = contextRoute;
                }
                this.closeMobile();
            });
        });

        this.announceMobileState();
        this.updateActiveLink();
    }

    isPathActive(path) {
        const current = String(this.currentPath || '#/');
        const [currentBase, currentQuery = ''] = current.split('?');
        const [targetBase, targetQuery = ''] = String(path || '#/').split('?');

        if (targetBase === '#/') return currentBase === '#/' || currentBase === '';
        if (currentBase !== targetBase) return false;
        if (!targetQuery) return true;

        const targetParams = new URLSearchParams(targetQuery);
        const currentParams = new URLSearchParams(currentQuery);
        if (targetParams.has('tab')) {
            return targetParams.get('tab') === currentParams.get('tab');
        }
        return true;
    }

    updateActiveLink() {
        if (!this.container) return;
        this.container.querySelectorAll('.nav-link').forEach((link) => {
            const path = link.getAttribute('href');
            this.applyNavLinkState(link, this.isPathActive(path));
        });
    }

    applyNavLinkState(link, isActive) {
        const icon = link.querySelector('.nav-link-icon');
        if (isActive) {
            link.classList.add('bg-slate-100', 'text-slate-900', 'font-semibold', 'shadow-sm', 'border-slate-200/70');
            link.classList.remove('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900', 'border-transparent');
            if (icon) {
                icon.classList.add('bg-brand-orange/10', 'text-brand-orange', 'border-brand-orange/20');
                icon.classList.remove('bg-white', 'text-slate-400', 'border-slate-200', 'group-hover:border-slate-300', 'group-hover:text-slate-600');
            }
            return;
        }

        link.classList.remove('bg-slate-100', 'text-slate-900', 'font-semibold', 'shadow-sm', 'border-slate-200/70');
        link.classList.add('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900', 'border-transparent');
        if (icon) {
            icon.classList.remove('bg-brand-orange/10', 'text-brand-orange', 'border-brand-orange/20');
            icon.classList.add('bg-white', 'text-slate-400', 'border-slate-200', 'group-hover:border-slate-300', 'group-hover:text-slate-600');
        }
    }

    openMobile() {
        if (!this.container) return;
        this.mobileOpen = true;
        this.container.classList.remove('-translate-x-full');
        this.container.classList.add('translate-x-0');
        this.container.setAttribute('aria-hidden', 'false');
        if (this.overlay) this.overlay.classList.remove('hidden');
        document.documentElement.classList.add('sidebar-lock');
        document.body.classList.add('sidebar-lock');
        this.announceMobileState();

        const firstFocusable = this.container.querySelector(this.focusableSelector);
        if (firstFocusable instanceof HTMLElement) {
            firstFocusable.focus();
        }
    }

    closeMobile() {
        if (!this.container) return;
        this.mobileOpen = false;
        this.container.classList.remove('translate-x-0');
        this.container.classList.add('-translate-x-full');
        this.container.setAttribute('aria-hidden', this.mediaQuery.matches ? 'false' : 'true');
        if (this.overlay) this.overlay.classList.add('hidden');
        document.documentElement.classList.remove('sidebar-lock');
        document.body.classList.remove('sidebar-lock');
        this.announceMobileState();
    }

    toggleMobile() {
        if (window.matchMedia('(min-width: 768px)').matches) return;
        if (this.mobileOpen) this.closeMobile();
        else this.openMobile();
    }

    resolveIcon(item = {}) {
        if (item.icon) return this.getIcon(item.icon);

        const signature = `${item.id || ''} ${item.label || ''} ${item.path || ''}`.toLowerCase();
        return this.getIcon('document');
    }

    getIcon(name) {
        const icons = {
            dashboard: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
            landing: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7M5 7h.01M5 3h.01M9 3h.01"></path></svg>`,
            book: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5A4.5 4.5 0 003 9.5v9A2.5 2.5 0 005.5 21H12m0-14.747C13.168 5.477 14.754 5 16.5 5A4.5 4.5 0 0121 9.5v9a2.5 2.5 0 01-2.5 2.5H12"></path></svg>`,
            tree: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h8m-8 5h5m-5 5h8M4 7v10a2 2 0 002 2h12M4 7a2 2 0 012-2h12a2 2 0 012 2"></path></svg>`,
            engineering: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.5 6h3m-7 6h11m-9 6h7M4 4h16v16H4z"></path></svg>`,
            document: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
            edit: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>`,
            clock: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            chart: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>`,
            play: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-5.197-3.03A1 1 0 008 9.03v5.94a1 1 0 001.555.832l5.197-3.03a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            mobile: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>`,
            funnel: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18l-7 8v6l-4 2v-8L3 4z"></path></svg>`,
            briefcase: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 6V5a2 2 0 012-2h2a2 2 0 012 2v1m-9 0h12a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z"></path></svg>`,
            checklist: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 6h10M9 12h10M9 18h10"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 6l1.5 1.5L8.5 5.5M5 12l1.5 1.5L8.5 11.5M5 18l1.5 1.5L8.5 17.5"></path></svg>`,
            layers: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3l9 5-9 5-9-5 9-5z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l9 5 9-5M3 16l9 5 9-5"></path></svg>`,
            target: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2m4-2a8 8 0 11-16 0 8 8 0 0116 0z"></path></svg>`,
            users: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-1a4 4 0 00-5-3.87M17 20H7m10 0v-1c0-1.657-1.343-3-3-3H10c-1.657 0-3 1.343-3 3v1m0 0H2v-1a4 4 0 015-3.87M14 7a2 2 0 11-4 0 2 2 0 014 0zm6 2a2 2 0 11-4 0 2 2 0 014 0zM8 9a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`,
            map: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.553 2.776A1 1 0 0022 18.882V8.118a1 1 0 00-.447-.842L15 4m0 13V4m0 0L9 7"></path></svg>`,
            scale: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v2m0 0l-6 3m6-3l6 3M4 8l3 6a3 3 0 11-6 0l3-6zm16 0l3 6a3 3 0 11-6 0l3-6zM12 5v14m-4 0h8"></path></svg>`,
            folder: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"></path></svg>`,
            settings: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`,
        };
        return icons[name] || icons.document;
    }

    clear() {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.container.className = 'hidden';
        this.closeMobile();
    }
}

export default Sidebar;
