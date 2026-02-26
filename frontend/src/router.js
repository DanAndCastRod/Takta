/**
 * Simple Hash-based SPA Router
 */
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
        const path = this.getCurrentPath();

        // Find matching route or fallback to 404/default
        const routeHandler = this.routes[path] || this.routes['*'];

        if (routeHandler) {
            try {
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
}

export default Router;
