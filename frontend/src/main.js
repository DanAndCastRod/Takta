import './style.css';
import ApiClient from './services/api.client.js';
import Router from './router.js';

// Components
import Navbar from './components/layout/Navbar.js';
import Sidebar from './components/layout/Sidebar.js';

// Pages
import LoginPage from './pages/Login.js';
import DocumentEditorPage from './pages/DocumentEditorPage.js';
import EngineeringPage from './pages/EngineeringPage.js';
import TimingPage from './pages/TimingPage.js';
import CapacityPage from './pages/CapacityPage.js';

class App {
  constructor() {
    this.user = null;
    this.navbar = new Navbar();
    this.sidebar = new Sidebar();
    this.router = null;

    // Listeners for Auth Events
    window.addEventListener('auth:logout', () => this.handleLogout());
    window.addEventListener('auth:unauthorized', () => this.handleLogout());
    window.addEventListener('auth:login_success', () => this.init());

    this.init();
  }

  async init() {
    // 1. Check if token exists
    const token = localStorage.getItem('takta_token');

    if (!token) {
      // Not authenticated, render only navbar without user
      this.navbar.render(null);
      this.sidebar.render(null);
      this.initRouter(false);
      return;
    }

    // 2. Validate token and get user info
    try {
      const userData = await ApiClient.get('/auth/me');
      this.user = userData;

      // Render authenticated shell
      this.navbar.render(this.user);
      this.sidebar.render(this.user);
      this.sidebar.updateActiveLink(); // Force active link state
      this.initRouter(true);

    } catch (error) {
      console.error('Failed to validate session', error);
      this.handleLogout(false); // remove token without infinite loops
    }
  }

  handleLogout(redirect = true) {
    this.user = null;
    this.navbar.render(null);
    this.sidebar.render(null);
    if (redirect) {
      window.location.hash = '/login';
    }
  }

  initRouter(isAuthenticated) {
    // Define routes based on Auth state
    let routes = {};

    if (!isAuthenticated) {
      routes = {
        '/login': LoginPage,
        '*': () => {
          // Redirect everything else to login if not authenticated
          window.location.hash = '/login';
          return '';
        }
      };
    } else {
      routes = {
        '/': () => `<div class="p-6">
                    <h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p class="text-slate-600 mt-2">Bienvenido, ${this.user.username}. Sistema OAC-SEO activado.</p>
                </div>`,
        '/assets': () => `<div class="p-6">
                    <h1 class="text-2xl font-bold text-slate-900">Módulo de Activos</h1>
                    <p class="text-slate-600 mt-2">Por implementar...</p>
                </div>`,
        '/engineering': EngineeringPage,
        '/timing': TimingPage,
        '/capacity': CapacityPage,
        '/editor': DocumentEditorPage,
        '/login': () => {
          // Already logged in, redirect to home
          window.location.hash = '/';
          return '';
        },
        '*': () => `<div class="p-8 text-center text-slate-500">404 - Not Found</div>`
      };
    }

    // Initialize Router
    if (this.router) {
      // Overwrite routes on existing router to prevent leaks
      this.router.routes = routes;
      this.router.handleRoute();
    } else {
      this.router = new Router(routes);
      this.router.start();
    }
  }
}

// Bootstrap application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
