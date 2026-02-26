import ApiClient from '../../services/api.client.js';

class AssetTree {
    constructor(container) {
        this.container = container;
        this.treeData = [];
    }

    async load() {
        try {
            this.treeData = await ApiClient.get('/assets/tree/');
            this.render();
        } catch (error) {
            console.error('Failed to load asset tree', error);
            this.container.innerHTML = `
                <div class="p-3 text-sm text-red-600 bg-red-50 rounded border border-red-100">
                    Error al cargar jerarquía: ${error.message}
                </div>`;
        }
    }

    render() {
        if (!this.treeData || this.treeData.length === 0) {
            this.container.innerHTML = '<div class="p-4 text-sm text-slate-500 text-center">No hay activos registrados.</div>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'space-y-1 ml-1';

        this.treeData.forEach(node => {
            ul.appendChild(this.createNodeElement(node, 0));
        });

        this.container.innerHTML = '';
        this.container.appendChild(ul);
    }

    createNodeElement(node, level = 0) {
        const li = document.createElement('li');
        const hasChildren = node.children && node.children.length > 0;

        // Node Header
        const div = document.createElement('div');
        div.className = `flex items-center group py-1.5 px-2 rounded-md cursor-pointer transition-colors hover:bg-slate-100 ${level > 0 ? 'ml-4 border-l border-slate-200 pl-3 relative before:absolute before:w-3 before:h-px before:bg-slate-200 before:top-1/2 before:left-0 before:-translate-y-1/2' : ''}`;

        // Expansion Icon toggle
        const toggleSpan = document.createElement('span');
        toggleSpan.className = 'w-5 h-5 flex items-center justify-center mr-1 text-slate-400 font-bold';
        if (hasChildren) {
            toggleSpan.innerHTML = `
                <svg class="w-3.5 h-3.5 transition-transform duration-200 -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            `;
            toggleSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                const childrenUl = li.querySelector('ul.children-container');
                const svg = toggleSpan.querySelector('svg');
                if (childrenUl) {
                    childrenUl.classList.toggle('hidden');
                    if (childrenUl.classList.contains('hidden')) {
                        svg.classList.add('-rotate-90');
                    } else {
                        svg.classList.remove('-rotate-90');
                    }
                }
            });
        }

        // Icon based on type
        const typeIcon = document.createElement('span');
        typeIcon.className = 'w-5 h-5 flex-shrink-0 mr-2 text-blue-500';
        typeIcon.innerHTML = this.getIconForType(node.type);

        // Label
        const labelText = document.createElement('span');
        labelText.className = 'text-sm font-medium text-slate-700 select-none truncate';
        labelText.textContent = node.name;

        // Asset Type badge (hidden on very small viewports)
        const typeBadge = document.createElement('span');
        typeBadge.className = 'ml-auto text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded hidden sm:inline-block';
        typeBadge.textContent = node.type.substring(0, 3);

        div.appendChild(toggleSpan);
        div.appendChild(typeIcon);
        div.appendChild(labelText);
        div.appendChild(typeBadge);

        // Selection Handler
        div.addEventListener('click', () => {
            // Remove active style from all nodes
            document.querySelectorAll('.asset-node-active').forEach(el => el.classList.remove('asset-node-active', 'bg-blue-50'));
            div.classList.add('asset-node-active', 'bg-blue-50');

            // Dispatch custom event to parent
            this.container.dispatchEvent(new CustomEvent('assetSelected', {
                detail: { assetId: node.id },
                bubbles: true
            }));
        });

        li.appendChild(div);

        // Render children recursively
        if (hasChildren) {
            const childUl = document.createElement('ul');
            childUl.className = 'children-container hidden ml-[5px] border-l border-slate-200 space-y-1 relative'; // default to collapsed

            node.children.forEach(child => {
                childUl.appendChild(this.createNodeElement(child, level + 1));
            });

            li.appendChild(childUl);

            // Expand first level by default
            if (level === 0) {
                childUl.classList.remove('hidden');
                if (toggleSpan.querySelector('svg')) {
                    toggleSpan.querySelector('svg').classList.remove('-rotate-90');
                }
            }
        }

        return li;
    }

    getIconForType(type) {
        const icons = {
            sede: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`,
            planta: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
            area: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>`,
            linea: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
            maquina: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>`,
        };
        return icons[type] || icons['area'];
    }
}

export default AssetTree;
