/**
 * ContextMenu - Menú contextual (click derecho) para acciones rápidas.
 */

export class ContextMenu {
    constructor(fabricCanvas) {
        this.fabricCanvas = fabricCanvas;
        this.menuElement = null;
        this.targetObject = null;

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
        this.menuElement.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.executeAction(action);
                this.hide();
            });
        });
    }

    setupListeners() {
        const canvas = this.fabricCanvas.canvas;

        // Right click on object
        canvas.on('mouse:down', (opt) => {
            if (opt.e.button === 2 && opt.target) {
                opt.e.preventDefault();
                this.targetObject = opt.target;
                canvas.setActiveObject(opt.target);
                this.show(opt.e.clientX, opt.e.clientY);
            }
        });

        // Disable default context menu on canvas
        canvas.upperCanvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

        // Hide menu on click outside
        document.addEventListener('click', (e) => {
            if (!this.menuElement.contains(e.target)) {
                this.hide();
            }
        });

        // Hide on scroll/resize
        window.addEventListener('scroll', () => this.hide());
        window.addEventListener('resize', () => this.hide());
    }

    show(x, y) {
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
}
