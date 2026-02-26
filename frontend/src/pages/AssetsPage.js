import AssetTree from '../components/assets/AssetTree.js';
import AssetDetail from '../components/assets/AssetDetail.js';

const AssetsPage = async () => {
    const container = document.createElement('div');
    container.className = 'flex h-full w-full';

    container.innerHTML = `
        <!-- Left Panel: Tree -->
        <div class="w-80 flex-none border-r border-slate-200 bg-white flex flex-col h-full overflow-hidden">
            <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 class="text-sm font-semibold text-slate-800 uppercase tracking-wide">Árbol de Activos</h2>
                <button class="p-1 hover:bg-slate-200 rounded text-slate-500" title="Expandir todo">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-2" id="asset-tree-container">
                <div class="flex items-center justify-center h-20 text-slate-400 text-sm">
                    <span class="animate-pulse">Cargando árbol...</span>
                </div>
            </div>
        </div>
        
        <!-- Right Panel: Detail -->
        <div class="flex-1 bg-slate-50 p-6 overflow-y-auto" id="asset-detail-container">
            <div class="flex flex-col items-center justify-center h-full text-slate-400">
                <svg class="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>
                <p class="text-lg font-medium text-slate-500">Selecciona un activo</p>
                <p class="text-sm">Navega por la jerarquía a la izquierda para ver los detalles.</p>
            </div>
        </div>
    `;

    // Initialize sub-components
    const treeContainer = container.querySelector('#asset-tree-container');
    const detailContainer = container.querySelector('#asset-detail-container');

    const assetDetail = new AssetDetail(detailContainer);
    const assetTree = new AssetTree(treeContainer);

    // Listen for custom selection event from tree
    container.addEventListener('assetSelected', (e) => {
        const assetId = e.detail.assetId;
        assetDetail.load(assetId);
    });

    // Load initial tree data
    await assetTree.load();

    return container;
};

export default AssetsPage;
