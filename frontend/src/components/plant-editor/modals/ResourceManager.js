import { plantLayoutService } from '../../../services/plant-layout.service.js';
import uiFeedback from '../../../services/ui-feedback.service.js';

export class ResourceManager {
    constructor(callbacks = {}) {
        this.onLoad = callbacks.onLoad;
        this.onSave = callbacks.onSave;

        this.modalEl = null;
        this.layouts = [];
        this.mode = 'load';
        this.currentJson = null;
        this.currentScreenshot = null;
        this.contextAssetId = callbacks.contextAssetId || null;
    }

    setContextAsset(assetId) {
        this.contextAssetId = assetId || null;
    }

    async open(mode, currentData = null, options = {}) {
        this.mode = mode;
        this.currentJson = currentData?.json;
        this.currentScreenshot = currentData?.screenshot;

        if (Object.prototype.hasOwnProperty.call(options, 'contextAssetId')) {
            this.setContextAsset(options.contextAssetId);
        }

        await this._fetchLayouts();
        this._render();
        document.body.appendChild(this.modalEl);

        setTimeout(() => {
            this.modalEl.querySelector('.rm-overlay')?.classList.remove('opacity-0');
            this.modalEl.querySelector('.rm-card')?.classList.remove('scale-95', 'opacity-0');
        }, 10);
    }

    close() {
        if (!this.modalEl) return;

        const overlay = this.modalEl.querySelector('.rm-overlay');
        const card = this.modalEl.querySelector('.rm-card');

        overlay?.classList.add('opacity-0');
        card?.classList.add('scale-95', 'opacity-0');

        setTimeout(() => {
            if (this.modalEl?.parentNode) {
                this.modalEl.parentNode.removeChild(this.modalEl);
            }
            this.modalEl = null;
        }, 300);
    }

    async _fetchLayouts() {
        try {
            const params = this.contextAssetId ? { plant_id: this.contextAssetId } : {};
            this.layouts = await plantLayoutService.getLayouts(params);
        } catch (error) {
            console.error(error);
            this.layouts = [];
        }
    }

    _render() {
        this.modalEl = document.createElement('div');
        this.modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center';

        const title = this.mode === 'save' ? 'Guardar Diseño' : 'Abrir Diseño';

        this.modalEl.innerHTML = `
            <div class="rm-overlay absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 opacity-0"></div>

            <div class="rm-card glass-panel w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl transform transition-all duration-300 scale-95 opacity-0 m-4">
                <div class="flex items-center justify-between p-6 border-b border-white/40">
                    <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        ${this.mode === 'save'
                ? '<svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>'
                : '<svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>'}
                        ${title}
                    </h2>
                    <button class="rm-close p-2 hover:bg-slate-100/50 rounded-full transition-colors text-slate-500" aria-label="Cerrar">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    ${this.mode === 'save' ? this._renderSaveForm() : ''}

                    <div class="mb-4 flex items-center justify-between gap-2">
                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider">Diseños guardados</h3>
                        <div class="flex items-center gap-2">
                            ${this.contextAssetId ? '<span class="text-[11px] px-2 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700">Filtro por activo</span>' : ''}
                            <span class="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">${this.layouts.length}</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${this.layouts.map((layout) => this._renderLayoutCard(layout)).join('')}
                    </div>

                    ${this.layouts.length === 0 ? `
                        <div class="flex flex-col items-center justify-center py-12 text-slate-400">
                            <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            <p>No se encontraron diseños para el filtro actual.</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        this.modalEl.querySelector('.rm-close')?.addEventListener('click', () => this.close());
        this.modalEl.querySelector('.rm-overlay')?.addEventListener('click', () => this.close());

        this.modalEl.querySelectorAll('.rm-layout-card').forEach((card) => {
            const id = card.dataset.id;

            card.addEventListener('click', (event) => {
                if (event.target.closest('.rm-delete-btn')) return;

                if (this.mode === 'save') {
                    const nameInput = this.modalEl.querySelector('#rm-layout-name');
                    const selected = this.layouts.find((layout) => String(layout.id) === String(id));
                    if (nameInput && selected?.name) {
                        nameInput.value = selected.name;
                    }
                } else {
                    this._handleLoad(id);
                }
            });

            const deleteBtn = card.querySelector('.rm-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this._handleDelete(id);
                });
            }
        });

        if (this.mode === 'save') {
            const form = this.modalEl.querySelector('#rm-save-form');
            form?.addEventListener('submit', (event) => {
                event.preventDefault();
                this._handleSave(new FormData(form));
            });
        }
    }

    _renderSaveForm() {
        return `
            <form id="rm-save-form" class="bg-white/80 p-4 rounded-xl border border-indigo-100 shadow-sm mb-8 flex gap-4 items-end">
                <div class="flex-1">
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del diseño</label>
                    <input type="text" id="rm-layout-name" name="name" required placeholder="Layout principal..."
                        class="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                </div>
                <button type="submit" class="tk-btn-primary h-10 px-6 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                    Guardar
                </button>
            </form>
        `;
    }

    _renderLayoutCard(layout) {
        const date = new Date(layout.updated_at).toLocaleDateString('es-CO');
        return `
            <div data-id="${layout.id}" class="rm-layout-card group relative bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-xl overflow-hidden transition-all cursor-pointer">
                <div class="aspect-video bg-slate-100 relative overflow-hidden">
                    ${layout.thumbnail_data
                ? `<img src="${layout.thumbnail_data}" class="w-full h-full object-cover" alt="${layout.name}">`
                : `<div class="w-full h-full flex items-center justify-center text-slate-300">
                            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>`}
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <div class="p-3">
                    <h4 class="font-bold text-slate-700 truncate">${layout.name}</h4>
                    <p class="text-xs text-slate-400 flex justify-between mt-1">
                        <span>${date}</span>
                        ${layout.is_active ? '' : '<span class="text-red-400">Archivado</span>'}
                    </p>
                </div>

                <button class="rm-delete-btn absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all shadow-sm" aria-label="Eliminar diseño">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        `;
    }

    async _handleLoad(id) {
        if (!this.onLoad) return;
        try {
            const layout = await plantLayoutService.getLayout(id);
            this.onLoad(layout);
            this.close();
        } catch {
            uiFeedback.error('Error al cargar el diseño.');
        }
    }

    async _handleSave(formData) {
        const name = String(formData.get('name') || '').trim();
        if (!name) return;

        try {
            if (this.onSave) {
                await this.onSave({
                    name,
                    description: '',
                    json: this.currentJson,
                    screenshot: this.currentScreenshot,
                    plant_id: this.contextAssetId || null,
                }, false);
            } else {
                await plantLayoutService.saveLayout({
                    name,
                    description: '',
                    json_content: this.currentJson,
                    thumbnail_data: this.currentScreenshot,
                    plant_id: this.contextAssetId || null,
                });
            }
            this.close();
            uiFeedback.success('Diseño guardado correctamente.');
        } catch {
            uiFeedback.error('Error al guardar el diseño.');
        }
    }

    async _handleDelete(id) {
        if (!confirm('¿Estás seguro de eliminar este diseño?')) return;

        try {
            await plantLayoutService.deleteLayout(id);
            const keepMode = this.mode;
            const keepData = { json: this.currentJson, screenshot: this.currentScreenshot };
            this.close();
            await this.open(keepMode, keepData, { contextAssetId: this.contextAssetId });
            uiFeedback.success('Diseño eliminado.');
        } catch {
            uiFeedback.error('Error al eliminar diseño.');
        }
    }

    destroy() {
        this.close();
        this.layouts = [];
        this.onLoad = null;
        this.onSave = null;
    }
}

