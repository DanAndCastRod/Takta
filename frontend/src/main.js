import './style.css'
import './themes/community/glassmorphism.css';
import './themes/enterprise/bios-adapter.css';
import { TaktaTheme } from './themes/theme-manager.js';
import { TaktaLayout } from './themes/enterprise/layout-wrapper.js';
import { PlantEditor } from './components/plant-editor/PlantEditor.js';

// Estado de la navegación
let currentView = 'themes'; // 'themes' | 'editor'

// SVG Icons for navigation
const NAV_ICONS = {
  palette: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>`,
  factory: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>`
};

const renderNavigation = () => {
  return `
        <nav class="mb-4 flex gap-2 border-b border-slate-200 pb-3">
            <button id="nav-themes" class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${currentView === 'themes' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}">
                ${NAV_ICONS.palette} Theme System
            </button>
            <button id="nav-editor" class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${currentView === 'editor' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}">
                ${NAV_ICONS.factory} Plant Editor
            </button>
        </nav>
    `;
};


// Vistas
const renderThemeDemo = (container) => {
  container.innerHTML = `
        ${renderNavigation()}
        <div class="tk-card glass mb-4">
            <h1 class="text-3xl font-bold mb-2">Takta Theme System</h1>
            <div class="flex gap-2 mb-4">
                <button id="btn-community" class="tk-btn-primary">Switch to Community</button>
                <button id="btn-enterprise" class="tk-btn-primary">Switch to Enterprise</button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="tk-card">
                <h2 class="text-xl font-bold">Tarjeta Estándar</h2>
                <p>Contenido de prueba para validar estilos.</p>
            </div>
            <div class="tk-card glass">
                <h2 class="text-xl font-bold">Tarjeta Glass</h2>
                <p>Este componente debe tener efecto blur en modo Community.</p>
            </div>
        </div>
    `;
  bindNavEvents();
  document.getElementById('btn-community').addEventListener('click', () => switchTheme('community'));
  document.getElementById('btn-enterprise').addEventListener('click', () => switchTheme('enterprise'));
};

const renderEditorView = (container) => {
  container.innerHTML = `
        ${renderNavigation()}
        <div id="plant-editor-root" class="h-[80vh] w-full border border-gray-300 rounded shadow-sm bg-white"></div>
    `;
  bindNavEvents();

  // Iniciar Editor
  const editor = new PlantEditor('plant-editor-root');
  editor.render();
};

const bindNavEvents = () => {
  document.getElementById('nav-themes').addEventListener('click', () => navigate('themes'));
  document.getElementById('nav-editor').addEventListener('click', () => navigate('editor'));
};

const navigate = (view) => {
  currentView = view;
  renderCurrentView();
};

const renderCurrentView = () => {
  const themeName = TaktaTheme.get();
  if (themeName === 'enterprise') {
    TaktaLayout.renderEnterpriseStructure((container) => {
      if (currentView === 'themes') renderThemeDemo(container);
      else renderEditorView(container);
    });
  } else {
    TaktaLayout.renderCommunityStructure((container) => {
      if (currentView === 'themes') renderThemeDemo(container);
      else renderEditorView(container);
    });
  }
};

const switchTheme = (themeName) => {
  TaktaTheme.set(themeName);
  renderCurrentView();
}

// Inicialización
TaktaTheme.init();
renderCurrentView();
