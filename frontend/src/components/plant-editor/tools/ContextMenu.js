/**
 * ContextMenu - Menú contextual (click derecho) para acciones rápidas.
 */

export class ContextMenu {
    constructor(fabricCanvas) {
        this.fabricCanvas = fabricCanvas;
        this.menuElement = null;
        this.targetObject = null;
        this.menuAbortController = null;
        this.canvasMouseDownHandler = null;
        this.canvasContextMenuHandler = null;
        this.documentClickHandler = null;
        this.windowScrollHandler = null;
        this.windowResizeHandler = null;

        this.createMenuElement();
        this.setupListeners();
    }

    createMenuElement() {
        this.menuElement = document.createElement('div');
        this.menuElement.id = 'pe-context-menu';
        this.menuElement.className = `
            fixed z-[9999] bg-white rounded-lg shadow-xl border border-slate-200
            py-1 min-w-[160px] hidden
        `;
        this.menuElement.innerHTML = `
            <button data-action="duplicate" class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                Duplicar
            </button>
            <button data-action="delete" class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Eliminar
            </button>
            <div class="border-t border-slate-100 my-1"></div>
            <button data-action="bringToFront" class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="8" x="8" y="8" rx="1"/><path d="M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2"/><path d="M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2"/></svg>
                Traer al frente
            </button>
            <button data-action="sendToBack" class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="8" x="8" y="8" rx="1"/><path d="M4 14a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2"/><path d="M14 14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2"/></svg>
                Enviar al fondo
            </button>
        `;

        document.body.appendChild(this.menuElement);

        // Event listeners for menu items
        this.menuAbortController = new AbortController();
        this.menuElement.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.executeAction(action);
                this.hide();
            }, { signal: this.menuAbortController.signal });
        });
    }

    setupListeners() {
        const canvas = this.fabricCanvas.canvas;
        if (!canvas) return;

        // Right click on object
        this.canvasMouseDownHandler = (opt) => {
            if (opt.e.button === 2 && opt.target) {
                opt.e.preventDefault();
                this.targetObject = opt.target;
                canvas.setActiveObject(opt.target);
                this.show(opt.e.clientX, opt.e.clientY);
            }
        };
        canvas.on('mouse:down', this.canvasMouseDownHandler);

        // Disable default context menu on canvas
        this.canvasContextMenuHandler = (event) => event.preventDefault();
        canvas.upperCanvasEl?.addEventListener('contextmenu', this.canvasContextMenuHandler);

        // Hide menu on click outside
        this.documentClickHandler = (event) => {
            if (this.menuElement && !this.menuElement.contains(event.target)) {
                this.hide();
            }
        };
        document.addEventListener('click', this.documentClickHandler);

        // Hide on scroll/resize
        this.windowScrollHandler = () => this.hide();
        this.windowResizeHandler = () => this.hide();
        window.addEventListener('scroll', this.windowScrollHandler);
        window.addEventListener('resize', this.windowResizeHandler);
    }

    show(x, y) {
        if (!this.menuElement) return;
        this.menuElement.style.left = `${x}px`;
        this.menuElement.style.top = `${y}px`;
        this.menuElement.classList.remove('hidden');

        // Adjust position if menu goes off-screen
        const rect = this.menuElement.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.menuElement.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.menuElement.style.top = `${y - rect.height}px`;
        }
    }

    hide() {
        if (!this.menuElement) {
            this.targetObject = null;
            return;
        }
        this.menuElement.classList.add('hidden');
        this.targetObject = null;
    }

    executeAction(action) {
        if (!this.targetObject) return;

        const canvas = this.fabricCanvas.canvas;

        switch (action) {
            case 'duplicate':
                this.duplicateObject();
                break;
            case 'delete':
                canvas.remove(this.targetObject);
                canvas.discardActiveObject();
                canvas.renderAll();
                break;
            case 'bringToFront':
                canvas.bringObjectToFront(this.targetObject);
                canvas.renderAll();
                break;
            case 'sendToBack':
                canvas.sendObjectToBack(this.targetObject);
                canvas.renderAll();
                break;
        }
    }

    async duplicateObject() {
        const canvas = this.fabricCanvas.canvas;
        const obj = this.targetObject;

        // Use Fabric's clone method
        const cloned = await obj.clone();
        cloned.set({
            left: obj.left + 20,
            top: obj.top + 20,
            evented: true
        });

        // Copy custom properties
        if (obj.layerId) cloned.layerId = obj.layerId;
        if (obj.assetId) cloned.assetId = obj.assetId;
        if (obj.zoneType) cloned.zoneType = obj.zoneType;

        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
    }

    destroy() {
        this.hide();
        const canvas = this.fabricCanvas?.canvas;
        if (canvas && this.canvasMouseDownHandler) {
            canvas.off('mouse:down', this.canvasMouseDownHandler);
        }
        if (canvas?.upperCanvasEl && this.canvasContextMenuHandler) {
            canvas.upperCanvasEl.removeEventListener('contextmenu', this.canvasContextMenuHandler);
        }
        if (this.documentClickHandler) {
            document.removeEventListener('click', this.documentClickHandler);
        }
        if (this.windowScrollHandler) {
            window.removeEventListener('scroll', this.windowScrollHandler);
        }
        if (this.windowResizeHandler) {
            window.removeEventListener('resize', this.windowResizeHandler);
        }
        this.canvasMouseDownHandler = null;
        this.canvasContextMenuHandler = null;
        this.documentClickHandler = null;
        this.windowScrollHandler = null;
        this.windowResizeHandler = null;
        if (this.menuAbortController) {
            this.menuAbortController.abort();
            this.menuAbortController = null;
        }
        if (this.menuElement?.parentNode) {
            this.menuElement.parentNode.removeChild(this.menuElement);
        }
        this.menuElement = null;
        this.targetObject = null;
    }
}

