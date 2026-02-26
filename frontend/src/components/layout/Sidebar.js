/**
 * Sidebar component
 */
class Sidebar {
    constructor() {
        this.container = document.getElementById('app-sidebar');
        this.currentPath = window.location.hash || '#/';

        // Listen to navigation changes to update active state
        window.addEventListener('hashchange', () => {
            this.currentPath = window.location.hash || '#/';
            this.updateActiveLink();
        });
    }

    render(user) {
        if (!this.container) return;

        if (!user) {
            this.container.innerHTML = '';
            this.container.classList.add('hidden');
            return;
        }

        this.container.classList.remove('hidden');
        this.container.classList.add('md:flex');

        const menuItems = [
            { id: 'nav-dashboard', path: '#/', icon: this.getIcon('dashboard'), label: 'Dashboard' },
            { id: 'nav-assets', path: '#/assets', icon: this.getIcon('server'), label: 'Árbol de Activos' },
            { id: 'nav-engineering', path: '#/engineering', icon: this.getIcon('document'), label: 'Ingeniería' },
            { id: 'nav-timing', path: '#/timing', icon: this.getIcon('clock'), label: 'Cronómetro' },
            { id: 'nav-capacity', path: '#/capacity', icon: this.getIcon('chart'), label: 'Capacidad' },
            { id: 'nav-editor', path: '#/editor', icon: this.getIcon('edit'), label: 'Editor Docs' }
        ];

        this.container.innerHTML = `
            <div class="p-4">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Módulos</p>
                <nav class="space-y-1">
                    ${menuItems.map(item => `
                        <a href="${item.path}" id="${item.id}" 
                           class="nav-link flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors
                                  ${this.isPathActive(item.path)
                ? 'bg-slate-100 text-slate-800 font-semibold shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}">
                            ${item.icon}
                            ${item.label}
                        </a>
                    `).join('')}
                </nav>
            </div>
            
            <div class="mt-auto p-4 border-t border-slate-200">
                <div class="flex items-center gap-3">
                    <div class="flex-shrink-0 h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-slate-900 truncate">Configuración</p>
                    </div>
                </div>
            </div>
        `;
    }

    isPathActive(path) {
        if (path === '#/') {
            return this.currentPath === '#/' || this.currentPath === '';
        }
        return this.currentPath.startsWith(path);
    }

    updateActiveLink() {
        if (!this.container) return;
        const links = this.container.querySelectorAll('.nav-link');
        links.forEach(link => {
            const path = link.getAttribute('href');
            if (this.isPathActive(path)) {
                link.classList.add('bg-slate-100', 'text-slate-800', 'font-semibold', 'shadow-sm', 'border', 'border-slate-200/50');
                link.classList.remove('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
            } else {
                link.classList.remove('bg-slate-100', 'text-slate-800', 'font-semibold', 'shadow-sm', 'border', 'border-slate-200/50');
                link.classList.add('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
            }
        });
    }

    getIcon(name) {
        const icons = {
            dashboard: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
            server: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>`,
            document: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
            edit: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>`,
            clock: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            chart: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>`
        };
        return icons[name] || '';
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.classList.add('hidden');
            this.container.classList.remove('md:flex');
        }
    }
}

export default Sidebar;
