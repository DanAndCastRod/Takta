/**
 * Navbar component
 */
class Navbar {
    constructor() {
        this.container = document.getElementById('app-navbar');
    }

    render(user) {
        if (!this.container) return;

        // Si no hay usuario, mostrar navbar simplificado
        if (!user) {
            this.container.innerHTML = `
            <nav class="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
                    <div class="flex items-center gap-2">
                        <div class="font-bold text-xl tracking-tight text-slate-800">TAKTA</div>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange">OAC-SEO</span>
                    </div>
                </nav>
            `;
            return;
        }

        // Usuario autenticado
        this.container.innerHTML = `
            <nav class="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
                <!-- Brand / Hamburger -->
                <div class="flex items-center gap-4">
                    <button id="toggle-sidebar-btn" class="p-1 hover:bg-slate-100 rounded-md md:hidden">
                        <svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                    <div class="flex items-center gap-2">
                        <div class="font-bold text-xl tracking-tight text-slate-800">TAKTA</div>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange">OAC-SEO</span>
                    </div>
                </div>

                <!-- User Profile & Actions -->
                <div class="flex items-center gap-4">
                    <div class="flex flex-col items-end hidden sm:flex">
                        <span class="text-sm font-medium text-slate-700">${user.username}</span>
                        <span class="text-xs text-slate-500 capitalize">${user.role}</span>
                    </div>
                    <div class="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 font-bold border border-slate-200 shadow-sm">
                        ${user.username.charAt(0).toUpperCase()}
                    </div>
                    <button id="logout-btn" class="ml-2 text-sm text-slate-500 hover:text-red-500 transition-colors" title="Cerrar sesión">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                    </button>
                </div>
            </nav>
        `;

        // Atar eventos
        const logoutBtn = this.container.querySelector('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('takta_token');
                window.location.hash = '/login';
                window.dispatchEvent(new CustomEvent('auth:logout'));
            });
        }

        const toggleSidebarBtn = this.container.querySelector('#toggle-sidebar-btn');
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', () => {
                document.getElementById('app-sidebar').classList.toggle('hidden');
                document.getElementById('app-sidebar').classList.toggle('flex');
            });
        }
    }

    clear() {
        if (this.container) this.container.innerHTML = '';
    }
}

export default Navbar;
