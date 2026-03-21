import ApiClient from '../../services/api.client.js';

class AssetTree {
    constructor(container) {
        this.container = container;
        this.treeData = [];
        this.searchTerm = '';
    }

    async load() {
        try {
            this.treeData = await ApiClient.get('/assets/tree');
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
        this.container.innerHTML = '';

        // ── Search Bar ──
        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'mb-2 relative';
        searchWrapper.innerHTML = `
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input id="asset-search" type="text" placeholder="Buscar activo..."
                class="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-white
                       focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400
                       text-slate-700 placeholder-slate-400 transition-all" />
            <button id="asset-search-clear"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 hidden cursor-pointer"
                title="Limpiar búsqueda">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        this.container.appendChild(searchWrapper);

        const searchInput = searchWrapper.querySelector('#asset-search');
        const clearBtn = searchWrapper.querySelector('#asset-search-clear');

        searchInput.value = this.searchTerm;
        clearBtn.classList.toggle('hidden', !this.searchTerm);

        // Debounced search
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.searchTerm = e.target.value.trim().toLowerCase();
                clearBtn.classList.toggle('hidden', !this.searchTerm);
                this._renderTree();
            }, 200);
        });

        clearBtn.addEventListener('click', () => {
            this.searchTerm = '';
            searchInput.value = '';
            clearBtn.classList.add('hidden');
            this._renderTree();
            searchInput.focus();
        });

        // ── Tree Container ──
        const treeWrapper = document.createElement('div');
        treeWrapper.id = 'asset-tree-nodes';
        this.container.appendChild(treeWrapper);

        this._renderTree();
    }

    _renderTree() {
        const treeWrapper = this.container.querySelector('#asset-tree-nodes');
        if (!treeWrapper) return;
        treeWrapper.innerHTML = '';

        if (!this.treeData || this.treeData.length === 0) {
            treeWrapper.innerHTML = '<div class="p-4 text-sm text-slate-500 text-center">No hay activos registrados.</div>';
            return;
        }

        // If search is active, filter the tree
        const dataToRender = this.searchTerm
            ? this._filterTree(this.treeData, this.searchTerm)
            : this.treeData;

        if (this.searchTerm && dataToRender.length === 0) {
            treeWrapper.innerHTML = `
                <div class="p-4 text-center">
                    <p class="text-sm text-slate-400">No se encontraron activos para</p>
                    <p class="text-sm font-medium text-slate-500 mt-1">"${this._escapeHtml(this.searchTerm)}"</p>
                </div>`;
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'space-y-1 ml-1';

        dataToRender.forEach(node => {
            ul.appendChild(this.createNodeElement(node, 0));
        });

        treeWrapper.appendChild(ul);
    }

    /**
     * Recursively filter tree nodes: keep a node if its name matches
     * OR if any descendant matches (show path to match).
     */
    _filterTree(nodes, term) {
        const result = [];
        for (const node of nodes) {
            const nameMatches = node.name.toLowerCase().includes(term);
            const filteredChildren = node.children && node.children.length > 0
                ? this._filterTree(node.children, term)
                : [];

            if (nameMatches || filteredChildren.length > 0) {
                result.push({
                    ...node,
                    children: filteredChildren,
                    _matchesSelf: nameMatches,  // flag to highlight
                });
            }
        }
        return result;
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
                <svg class="w-3.5 h-3.5 transition-transform duration-200 ${this.searchTerm ? '' : '-rotate-90'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        // Label (with highlight if searching)
        const labelText = document.createElement('span');
        labelText.className = 'text-sm font-medium text-slate-700 select-none truncate';
        if (this.searchTerm && node._matchesSelf) {
            labelText.innerHTML = this._highlightMatch(node.name, this.searchTerm);
        } else {
            labelText.textContent = node.name;
        }

        // Asset Type badge
        const typeBadge = document.createElement('span');
        typeBadge.className = 'ml-auto text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded hidden sm:inline-block';
        typeBadge.textContent = node.type.substring(0, 3);

        div.appendChild(toggleSpan);
        div.appendChild(typeIcon);
        div.appendChild(labelText);
        div.appendChild(typeBadge);

        // Selection Handler
        div.addEventListener('click', () => {
            document.querySelectorAll('.asset-node-active').forEach(el => el.classList.remove('asset-node-active', 'bg-blue-50'));
            div.classList.add('asset-node-active', 'bg-blue-50');

            this.container.dispatchEvent(new CustomEvent('assetSelected', {
                detail: { assetId: node.id },
                bubbles: true
            }));
        });

        li.appendChild(div);

        // Render children recursively
        if (hasChildren) {
            const childUl = document.createElement('ul');
            // When searching, expand all. Otherwise default collapsed except level 0.
            const shouldExpand = this.searchTerm || level === 0;
            childUl.className = `children-container ${shouldExpand ? '' : 'hidden'} ml-[5px] border-l border-slate-200 space-y-1 relative`;

            node.children.forEach(child => {
                childUl.appendChild(this.createNodeElement(child, level + 1));
            });

            li.appendChild(childUl);

            // Toggle chevron direction
            if (shouldExpand && toggleSpan.querySelector('svg')) {
                toggleSpan.querySelector('svg').classList.remove('-rotate-90');
            }
        }

        return li;
    }

    expandAll() {
        this.container.querySelectorAll('.children-container').forEach((el) => {
            el.classList.remove('hidden');
        });
        this.container.querySelectorAll('.children-container').forEach((el) => {
            const li = el.closest('li');
            const chevron = li?.querySelector('span svg');
            if (chevron) chevron.classList.remove('-rotate-90');
        });
    }

    collapseAll() {
        this.container.querySelectorAll('.children-container').forEach((el) => {
            el.classList.add('hidden');
        });
        this.container.querySelectorAll('.children-container').forEach((el) => {
            const li = el.closest('li');
            const chevron = li?.querySelector('span svg');
            if (chevron) chevron.classList.add('-rotate-90');
        });
    }

    /**
     * Highlight matching substring with a background mark.
     */
    _highlightMatch(text, term) {
        const idx = text.toLowerCase().indexOf(term);
        if (idx === -1) return this._escapeHtml(text);
        const before = text.substring(0, idx);
        const match = text.substring(idx, idx + term.length);
        const after = text.substring(idx + term.length);
        return `${this._escapeHtml(before)}<mark class="bg-amber-200/70 text-amber-900 rounded px-0.5">${this._escapeHtml(match)}</mark>${this._escapeHtml(after)}`;
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    getIconForType(type) {
        const normalizedType = String(type || '').toLowerCase();
        const icons = {
            sede: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`,
            planta: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
            area: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>`,
            linea: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
            maquina: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>`,
        };
        return icons[normalizedType] || icons.area;
    }
}

export default AssetTree;

