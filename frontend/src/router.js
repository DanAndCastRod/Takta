/**
 * Simple Hash-based SPA Router
 */
import renderRouteContextBar from './components/layout/RouteContextBar.js';
import { canonicalizeContextHash } from './services/module-context.service.js';
import { canAccessRoute } from './services/tenant-ui.service.js';

class Router {
    constructor(routes = {}) {
        this.routes = routes;
        this.rootElement = document.getElementById('app-content');

        // Ensure root element exists
        if (!this.rootElement) {
            console.error('Router: could not find #app-content element');
        }

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
    }

    /**
     * Parse the current hash path (strips query params for matching)
     */
    getCurrentPath() {
        let hash = window.location.hash.slice(1);
        if (hash === '' || hash === '/') {
            return '/';
        }
        // Strip query params for route matching
        const qIndex = hash.indexOf('?');
        if (qIndex !== -1) {
            hash = hash.substring(0, qIndex);
        }
        return `/${hash.replace(/^\/+|\/+$/g, '')}`; // normalize path
    }

    /**
     * Map current hash to a corresponding route component
     */
    async handleRoute() {
        const canonicalHash = canonicalizeContextHash(window.location.hash || '#/');
        if (canonicalHash !== (window.location.hash || '#/')) {
            window.history.replaceState(null, '', canonicalHash);
        }

        const path = this.getCurrentPath();
        if (!canAccessRoute(path) && path !== '/login') {
            this.rootElement.innerHTML = `
                <div class="max-w-2xl mx-auto p-6 mt-8 tk-card">
                    <h2 class="text-xl font-semibold text-slate-900">Módulo deshabilitado</h2>
                    <p class="text-sm text-slate-600 mt-2">Este módulo no está habilitado para el tenant/perfil actual.</p>
                    <a href="#/" class="inline-flex mt-4 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm">Volver al dashboard</a>
                </div>
            `;
            return;
        }

        // Find matching route or fallback to 404/default
        const routeHandler = this.routes[path] || this.routes['*'];

        if (routeHandler) {
            try {
                this.rootElement.innerHTML = `
                    <div class="max-w-5xl mx-auto p-6">
                        <div class="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
                            <div class="h-4 w-40 rounded bg-slate-200 mb-3"></div>
                            <div class="h-3 w-64 rounded bg-slate-100"></div>
                        </div>
                    </div>
                `;
                // Wait for the component/page to render
                const content = await routeHandler();

                // If the handler returned an actual DOM element or HTML string
                if (content instanceof HTMLElement) {
                    this.rootElement.innerHTML = '';
                    this.rootElement.appendChild(content);
                } else if (typeof content === 'string') {
                    this.rootElement.innerHTML = content;
                } else {
                    // Handler might have manipulated DOM directly
                }
                this.decorateRoute(path);
            } catch (error) {
                console.error(`Router error rendering path '${path}':`, error);
                this.rootElement.innerHTML = `<div class="p-4 text-red-500">Error loading page.</div>`;
            }
        } else {
            console.warn(`No route matches path: ${path}`);
            this.rootElement.innerHTML = `<div class="p-4 text-gray-500">404 - Page Not Found</div>`;
        }
    }

    /**
     * Programmatically change route
     */
    navigate(path) {
        window.location.hash = path;
    }

    /**
     * Initial route handle
     */
    start() {
        this.handleRoute();
    }

    decorateRoute(path) {
        if (!this.rootElement) return;
        if (path === '/login') return;
        if (!localStorage.getItem('takta_token')) return;
        renderRouteContextBar(this.rootElement, path);
    }
}

export default Router;
