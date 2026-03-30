import './style.css';
import ApiClient from './services/api.client.js';
import Router from './router.js';

// Components
import Navbar from './components/layout/Navbar.js';
import Sidebar from './components/layout/Sidebar.js';

import { initModuleContextSync } from './services/module-context.service.js';
import { installGlobalUiFeedback } from './services/ui-feedback.service.js';
import offlineSyncService from './services/offline-sync.service.js';
import { bootstrapTenantRuntime } from './services/tenant-ui.service.js';

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
    initModuleContextSync();
    offlineSyncService.init();

    this.init();
  }

  async init() {
    // 1. Check if token exists
    const token = localStorage.getItem('takta_token');

    if (!token) {
      await bootstrapTenantRuntime(null);
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
      await bootstrapTenantRuntime(this.user);

      // Render authenticated shell
      this.navbar.render(this.user);
      this.sidebar.render(this.user);
      this.sidebar.updateActiveLink(); // Force active link state
      this.warmupAuthenticatedChunks();
      this.initRouter(true);

    } catch (error) {
      console.error('Failed to validate session', error);
      localStorage.removeItem('takta_token');
      this.handleLogout(false);
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
    }
  }

  handleLogout(redirect = true) {
    this.user = null;
    void bootstrapTenantRuntime(null);
    this.navbar.render(null);
    this.sidebar.render(null);
    this.initRouter(false);
    if (redirect) {
      window.location.hash = '#/login';
    }
  }

  initRouter(isAuthenticated) {
    // Define routes based on Auth state
    let routes = {};

    if (!isAuthenticated) {
      routes = {
        '/': async () => (await import('./pages/LandingPage.js')).default({ mode: 'landing', user: null }),
        '/landing': async () => (await import('./pages/LandingPage.js')).default({ mode: 'landing', user: null }),
        '/docs': async () => (await import('./pages/DocsPage.js')).default({ user: null }),
        '/login': async () => (await import('./pages/Login.js')).default(),
        '*': () => {
          // Redirect unknown routes to landing when not authenticated.
          window.location.hash = '#/landing';
          return '';
        }
      };
    } else {
      routes = {
        '/': async () => (await import('./pages/DashboardPage.js')).default(this.user),
        '/landing': async () => (await import('./pages/LandingPage.js')).default({ mode: 'landing', user: this.user }),
        '/docs': async () => (await import('./pages/DocsPage.js')).default({ user: this.user }),
        '/assets': async () => (await import('./pages/AssetsPage.js')).default(),
        '/engineering': async () => (await import('./pages/EngineeringPage.js')).default(),
        '/timing': async () => (await import('./pages/TimingPage.js')).default(),
        '/capacity': async () => (await import('./pages/CapacityPage.js')).default(),
        '/execution': async () => (await import('./pages/ExecutionPage.js')).default(),
        '/mobile': async () => (await import('./pages/ExecutionPage.js')).default(),
        '/excellence': async () => (await import('./pages/ExcellencePage.js')).default(),
        '/editor': async () => (await import('./pages/DocumentEditorPage.js')).default(),
        '/documents': async () => (await import('./pages/DocumentsPage.js')).default(),
        '/meetings': async () => (await import('./pages/MeetingsPage.js')).default(),
        '/weight-sampling': async () => (await import('./pages/WeightSamplingPage.js')).default(),
        '/plant-editor': async () => (await import('./pages/PlantEditorPage.js')).default(),
        '/settings': async () => (await import('./pages/SettingsPage.js')).default(),
        '/login': () => {
          // Already logged in, redirect to home
          window.location.hash = '#/';
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

  warmupAuthenticatedChunks() {
    // Preload frequent routes after login to reduce first navigation latency.
    void import('./pages/AssetsPage.js');
    void import('./pages/ExecutionPage.js');
    void import('./pages/ExcellencePage.js');
    void import('./pages/SettingsPage.js');
    void import('./pages/LandingPage.js');
    void import('./pages/DocsPage.js');
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  let shouldReload = false;
  const notifyUpdateAvailable = () => {
    window.dispatchEvent(new CustomEvent('pwa:update-available'));
  };

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      if (registration.waiting) {
        notifyUpdateAvailable();
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdateAvailable();
          }
        });
      });

      window.setInterval(() => {
        registration.update().catch(() => {});
      }, 30 * 60 * 1000);
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  });

  window.addEventListener('pwa:apply-update', async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (error) {
      console.warn('Unable to apply SW update:', error);
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (shouldReload) return;
    shouldReload = true;
    window.location.reload();
  });
}

// Bootstrap application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  installGlobalUiFeedback();
  window.app = new App();
  registerServiceWorker();
});
