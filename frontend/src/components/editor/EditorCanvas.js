/**
 * EditorCanvas.js
 * 
 * Wraps Editor.js instance with save functionality.
 * Receives initial blocks and provides a floating save button.
 */
import ApiClient from '../../services/api.client.js';
import { getEditorTools, EDITOR_I18N_ES } from '../../services/editor.config.js';

class EditorCanvas {
    /**
     * @param {HTMLElement} container - DOM element to render into
     * @param {Object} options
     * @param {string} options.templateId - UUID of the template
     * @param {string} options.templateName - Display name
     * @param {string|null} options.assetId - UUID of the asset (optional)
     * @param {string|null} options.assetName - Display name of the asset
     * @param {Array} options.initialBlocks - Editor.js blocks array
     * @param {function} options.onSaved - Callback after successful save: (document) => void
     */
    constructor(container, options = {}) {
        this.container = container;
        this.documentId = options.documentId || null;
        this.templateId = options.templateId;
        this.templateName = options.templateName || 'Documento';
        this.assetId = options.assetId || null;
        this.assetName = options.assetName || '';
        this.sourceContext = options.sourceContext || null;
        this.initialBlocks = options.initialBlocks || [];
        this.onSaved = options.onSaved || null;
        this.editor = null;
        this.isSaving = false;
        this.autosaveTimer = null;
        this.autosaveDelayMs = 2000;
        this.lastAutosaveAt = null;
    }

    render() {
        this.container.innerHTML = `
            <div class="max-w-5xl mx-auto p-6 pb-24">
                <!-- Header Bar -->
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <button id="editor-back-btn" class="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-2 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                            </svg>
                            Volver
                        </button>
                        <h1 class="text-2xl font-bold text-slate-900">${this.templateName}</h1>
                        ${this.assetName ? `<p class="text-slate-500 text-sm mt-1">Activo: <span class="font-medium text-slate-700">${this.assetName}</span></p>` : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <span id="editor-status" class="text-xs text-slate-400"></span>
                    </div>
                </div>

                <!-- Editor Container -->
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px] p-6">
                    <div id="editorjs-holder"></div>
                </div>

                <!-- Floating Save Button -->
                <div class="fixed bottom-6 right-6 z-50">
                    <button id="editor-save-btn" class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                        </svg>
                        Guardar Documento
                    </button>
                </div>
            </div>
        `;

        void this._initEditor();
        this._attachHandlers();
    }

    async _waitForHolder(maxAttempts = 120) {
        let attempts = 0;
        return new Promise((resolve) => {
            const tryResolve = () => {
                attempts += 1;
                const holder = this.container.querySelector('#editorjs-holder');
                if (holder && this.container.isConnected) {
                    resolve(holder);
                    return;
                }
                if (attempts >= maxAttempts) {
                    resolve(null);
                    return;
                }
                requestAnimationFrame(tryResolve);
            };
            tryResolve();
        });
    }

    async _initEditor() {
        const tools = getEditorTools();
        const holder = await this._waitForHolder();
        const status = this.container.querySelector('#editor-status');

        if (!holder) {
            if (status) {
                status.textContent = 'No fue posible inicializar el editor (holder no disponible).';
                status.classList.add('text-red-500');
            }
            return;
        }

        if (this.editor && typeof this.editor.destroy === 'function') {
            this.editor.destroy();
            this.editor = null;
        }

        this.editor = new window.EditorJS({
            holder: holder,
            tools: tools,
            i18n: EDITOR_I18N_ES,
            placeholder: 'Haz clic aqui para empezar a escribir tu documento...',
            data: {
                blocks: this.initialBlocks
            },
            onReady: () => {
                if (status) status.textContent = 'Editor listo';
            },
            onChange: () => {
                if (status && status.textContent === 'Editor listo') {
                    status.textContent = 'Cambios sin guardar';
                    status.classList.remove('text-red-500');
                    status.classList.add('text-amber-600');
                }
                this._scheduleAutosave();
            }
        });
    }

    _attachHandlers() {
        // Save button
        const saveBtn = this.container.querySelector('#editor-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this._handleSave());
        }

        // Back button
        const backBtn = this.container.querySelector('#editor-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (this.assetId) window.location.hash = '/assets';
                else window.location.hash = '/editor';
            });
        }
    }

    async _handleSave() {
        if (this.isSaving || !this.editor) return;

        const saveBtn = this.container.querySelector('#editor-save-btn');
        const status = this.container.querySelector('#editor-status');

        try {
            this.isSaving = true;
            saveBtn.disabled = true;
            saveBtn.innerHTML = `
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
            `;

            // Extract Editor.js data
            const editorData = await this.editor.save();

            const contentJson = JSON.stringify(editorData);
            let result = null;
            if (this.documentId) {
                result = await ApiClient.patch(`/documents/${this.documentId}`, {
                    content_json: contentJson,
                    source_context_json: this.sourceContext ? JSON.stringify(this.sourceContext) : null
                });
            } else {
                result = await ApiClient.post('/documents/', {
                    template_id: this.templateId,
                    asset_id: this.assetId || null,
                    content_json: contentJson
                });
                this.documentId = result?.id || this.documentId;
            }

            // Success feedback
            if (status) {
                status.textContent = 'Guardado exitosamente';
                status.classList.remove('text-slate-400');
                status.classList.add('text-green-600');
            }

            saveBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Guardado
            `;
            saveBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            saveBtn.classList.add('bg-green-600', 'hover:bg-green-700');

            // Reset after 2s
            setTimeout(() => {
                saveBtn.innerHTML = `
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                    </svg>
                    Guardar Documento
                `;
                saveBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                saveBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                saveBtn.disabled = false;
            }, 2000);

            if (this.onSaved) this.onSaved(result);

        } catch (error) {
            console.error('EditorCanvas: save failed', error);
            if (status) {
                status.textContent = `Error: ${error.message}`;
                status.classList.add('text-red-500');
            }
            saveBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                </svg>
                Reintentar
            `;
            saveBtn.disabled = false;
        } finally {
            this.isSaving = false;
        }
    }

    _scheduleAutosave() {
        if (this.isSaving || !this.editor) return;
        if (this.autosaveTimer) {
            clearTimeout(this.autosaveTimer);
        }
        this.autosaveTimer = setTimeout(() => {
            this._autosave().catch((error) => {
                console.warn('EditorCanvas autosave failed:', error);
            });
        }, this.autosaveDelayMs);
    }

    async _autosave() {
        if (this.isSaving || !this.editor) return;
        const status = this.container.querySelector('#editor-status');
        const data = await this.editor.save();
        const payload = {
            document_id: this.documentId || null,
            template_id: this.templateId,
            asset_id: this.assetId || null,
            content_json: JSON.stringify(data),
            source_context_json: this.sourceContext ? JSON.stringify(this.sourceContext) : null
        };
        const result = await ApiClient.post('/documents/autosave', payload);
        this.documentId = result?.id || this.documentId;
        this.lastAutosaveAt = new Date();
        if (status) {
            status.textContent = `Autosave ${this.lastAutosaveAt.toLocaleTimeString('es-CO')}`;
            status.classList.remove('text-red-500', 'text-amber-600');
            status.classList.add('text-slate-500');
        }
    }

    /**
     * Destroy the editor instance (cleanup)
     */
    destroy() {
        if (this.autosaveTimer) {
            clearTimeout(this.autosaveTimer);
            this.autosaveTimer = null;
        }
        if (this.editor && typeof this.editor.destroy === 'function') {
            this.editor.destroy();
            this.editor = null;
        }
    }
}

export default EditorCanvas;
