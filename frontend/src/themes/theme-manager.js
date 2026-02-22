import themeConfig from './theme-config.json';

class ThemeManager {
    constructor() {
        this.config = themeConfig;
        this.currentTheme = null;
        this.storageKey = 'takta_theme';
    }

    init() {
        // 1. Check URL param override (?theme=enterprise)
        const urlParams = new URLSearchParams(window.location.search);
        const urlTheme = urlParams.get('theme');

        // 2. Check LocalStorage
        const storedTheme = localStorage.getItem(this.storageKey);

        // 3. Auto-detect environment
        const detectedTheme = this.detectEnvironment();

        // Priority: URL > Storage > Environment > Default
        const themeToLoad = urlTheme || storedTheme || detectedTheme || this.config.default;

        console.log(`[Takta] Initializing Theme: ${themeToLoad}`);
        this.set(themeToLoad);
    }

    detectEnvironment() {
        const host = window.location.hostname;
        // Check if running on internal Bios network IPs or domains
        if (host.includes('10.252') || host.includes('grupobios.co')) {
            return 'enterprise';
        }
        return 'community';
    }

    set(themeName) {
        if (!this.config.themes[themeName]) {
            console.error(`[Takta] Theme '${themeName}' not found. Falling back to default.`);
            themeName = this.config.default;
        }

        this.currentTheme = themeName;
        localStorage.setItem(this.storageKey, themeName);

        // Update DOM
        this._applyTheme(themeName);

        // Dispatch event
        window.dispatchEvent(new CustomEvent('taktatheme:change', { detail: { theme: themeName } }));
    }

    get() {
        return this.currentTheme;
    }

    _applyTheme(themeName) {
        const themeDef = this.config.themes[themeName];

        // 1. Remove existing theme stylesheets
        document.querySelectorAll('link[data-takta-theme]').forEach(el => el.remove());

        // 2. Add Theme Classes to Body
        document.body.className = themeDef.class || '';

        // 3. Load CSS
        if (themeDef.type === 'cdn') {
            this._loadCdnTheme(themeDef);
        } else {
            this._loadLocalTheme(themeDef);
        }
    }

    _loadLocalTheme(themeDef) {
        // Tailwind main CSS is already loaded by Vite in main.js
        // We only load extra assets like glassmorphism
        if (themeDef.css) {
            themeDef.css.forEach(file => {
                // In Vite, we can import these dynamically or add link tags
                // For simplicity in Vanilla, adding link tags pointing to public or relative
                // Note: In a real Vite app, you might want to dynamic import() these
                this._injectCssLink(`/src/${file}`);
            });
        }
    }

    _loadCdnTheme(themeDef) {
        const base = themeDef.cdnBase;
        themeDef.css.forEach(file => {
            this._injectCssLink(`${base}/${file}`);
        });
    }

    _injectCssLink(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.taktaTheme = 'true'; // Marker to remove later
        document.head.appendChild(link);
    }
}

export const TaktaTheme = new ThemeManager();
