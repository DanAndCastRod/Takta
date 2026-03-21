function esc(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

const TOAST_STYLES = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-slate-200 bg-white text-slate-800',
};

class UIFeedbackService {
    constructor() {
        this.host = null;
        this.counter = 0;
    }

    ensureHost() {
        if (this.host) return this.host;
        const host = document.createElement('div');
        host.id = 'tk-toast-root';
        host.className = 'fixed right-3 top-3 z-[70] flex max-w-sm flex-col gap-2 md:right-5 md:top-5';
        host.setAttribute('aria-live', 'polite');
        host.setAttribute('aria-atomic', 'false');
        document.body.appendChild(host);
        this.host = host;
        return host;
    }

    push(message, options = {}) {
        const text = String(message || '').trim();
        if (!text) return;

        const host = this.ensureHost();
        const id = `tk-toast-${++this.counter}`;
        const tone = TOAST_STYLES[options.type] || TOAST_STYLES.info;
        const title = options.title || (options.type === 'error' ? 'Error' : 'Aviso');
        const timeout = Number.isFinite(options.timeout_ms) ? Number(options.timeout_ms) : 3800;

        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `rounded-lg border px-3 py-2 shadow-sm ${tone}`;
        toast.innerHTML = `
            <div class="flex items-start gap-2">
                <div class="min-w-0 flex-1">
                    <p class="text-[11px] font-semibold uppercase tracking-wide">${esc(title)}</p>
                    <p class="mt-0.5 text-sm">${esc(text)}</p>
                </div>
                <button type="button" class="h-6 w-6 rounded text-slate-500 hover:bg-black/5" aria-label="Cerrar notificacion">x</button>
            </div>
        `;
        host.appendChild(toast);

        const dismiss = () => {
            toast.remove();
        };
        toast.querySelector('button')?.addEventListener('click', dismiss);
        window.setTimeout(dismiss, Math.max(1200, timeout));
    }

    success(message, title = 'Exito') {
        this.push(message, { type: 'success', title });
    }

    error(message, title = 'Error') {
        this.push(message, { type: 'error', title, timeout_ms: 5200 });
    }

    warning(message, title = 'Atencion') {
        this.push(message, { type: 'warning', title });
    }

    info(message, title = 'Aviso') {
        this.push(message, { type: 'info', title });
    }
}

export const uiFeedback = new UIFeedbackService();

export function installGlobalUiFeedback() {
    const w = window;
    if (w.__taktaUiFeedbackInstalled) return;
    w.__taktaUiFeedbackInstalled = true;
    w.taktaFeedback = uiFeedback;
    w.taktaNotify = (message, type = 'info') => {
        uiFeedback.push(message, { type });
    };

    if (!w.__taktaNativeAlert) {
        w.__taktaNativeAlert = w.alert.bind(w);
    }
    w.alert = (message = '') => {
        uiFeedback.info(String(message || ''));
    };
}

export default uiFeedback;
